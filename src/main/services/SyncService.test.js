/**
 * SyncService 单元测试
 *
 * 通过依赖注入 mock readSettings/writeSettings/logger，
 * 避免 Electron / electron-log 依赖。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SyncService from './SyncService'

// ─── Mock 工厂 ───────────────────────────────────

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}

function createMockProvider() {
  return {
    upload: vi.fn(),
    download: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
    isAuthorized: vi.fn(),
  }
}

/**
 * 创建带基础云同步配置的 settings 对象
 */
function createBaseSettings(overrides = {}) {
  return {
    apiProfiles: {
      default: {
        selectedAuthType: 'openai-compatible',
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.example.com',
        modelName: 'gpt-4',
        searchApiKey: 'search-key',
        cna: true,
      },
    },
    currentApiProfile: 'default',
    mcpServers: {
      'my-server': {
        command: 'npx',
        args: ['-y', 'some-package'],
        env: { API_KEY: 'env-secret' },
      },
    },
    apiProfilesOrder: ['default'],
    cloudSync: {
      enabled: true,
      autoSyncEnabled: false,
      deviceId: 'test-device-001',
      deviceName: 'TestPC',
      provider: 'webdav',
      providerConfig: { serverUrl: 'https://dav.example.com/dav/' },
      passwordHash: 'abc123',
      passwordSalt: 'c2FsdA==',
      lastSyncAt: '2026-04-25T08:00:00Z',
      lastSyncError: null,
    },
    ...overrides,
  }
}

/**
 * 创建一个远程设备配置的 JSON Buffer
 */
function createRemoteConfigBuffer(remoteData, password, cryptoMgr) {
  const encrypted = cryptoMgr.encryptSyncData(remoteData, password)
  return Buffer.from(JSON.stringify({
    version: 2,
    timestamp: new Date().toISOString(),
    deviceId: remoteData._deviceId || 'remote-device-001',
    deviceName: remoteData._deviceName || 'RemotePC',
    data: encrypted,
  }, null, 2))
}

// ─── 测试 ────────────────────────────────────────

describe('SyncService', () => {
  let mockReadSettings
  let mockWriteSettings
  let mockLogger
  let mockProvider
  let mockSafeStorage
  let service

  beforeEach(() => {
    mockReadSettings = vi.fn(() => createBaseSettings())
    mockWriteSettings = vi.fn()
    mockLogger = createMockLogger()
    mockProvider = createMockProvider()
    mockSafeStorage = {
      isEncryptionAvailable: vi.fn(() => true),
      encryptString: vi.fn((str) => Buffer.from(`ENC(${str})`)),
      decryptString: vi.fn((buf) => buf.toString().replace(/^ENC\(/, '').replace(/\)$/, '')),
    }

    service = new SyncService({
      readSettings: mockReadSettings,
      writeSettings: mockWriteSettings,
      logger: mockLogger,
      safeStorage: mockSafeStorage,
    })
    service.setProvider(mockProvider)
  })

  describe('constructor / dependency injection', () => {
    it('should use injected readSettings', () => {
      service.readSettings()
      expect(mockReadSettings).toHaveBeenCalled()
    })

    it('should use injected writeSettings', () => {
      service.writeSettings({})
      expect(mockWriteSettings).toHaveBeenCalled()
    })

    it('should use injected logger', () => {
      service.logger.info('test')
      expect(mockLogger.info).toHaveBeenCalledWith('test')
    })
  })

  describe('deviceId', () => {
    it('should return existing deviceId from settings', () => {
      expect(service.deviceId).toBe('test-device-001')
    })

    it('should create and persist a new deviceId if none exists', () => {
      mockReadSettings.mockReturnValue({ cloudSync: {} })
      const svc = new SyncService({
        readSettings: mockReadSettings,
        writeSettings: mockWriteSettings,
        logger: mockLogger,
      })

      const id = svc.deviceId
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
      // writeSettings 应该被调用来保存新 deviceId
      expect(mockWriteSettings).toHaveBeenCalled()
      const writeArg = mockWriteSettings.mock.calls[0][0]
      expect(writeArg.cloudSync.deviceId).toBe(id)
    })

    it('should cache deviceId after first access', () => {
      const id1 = service.deviceId
      const id2 = service.deviceId
      expect(id1).toBe(id2)
    })
  })

  describe('getStatus', () => {
    it('should return correct sync status', () => {
      const status = service.getStatus()
      // enabled 和 autoSyncEnabled 由渲染进程通过 localStorage 管理，不从此处返回
      expect(status.hasPassword).toBe(true)
      expect(status.isAuthorized).toBe(true)
      expect(status.provider).toBe('webdav')
      expect(status.deviceName).toBe('TestPC')
      expect(status.deviceId).toBe('test-device-001')
      expect(status.lastSyncAt).toBe('2026-04-25T08:00:00Z')
      expect(status.lastSyncError).toBeNull()
      expect(status.isSyncing).toBe(false)
    })

    it('should handle missing cloudSync section', () => {
      mockReadSettings.mockReturnValue({})
      const status = service.getStatus()
      // enabled 和 autoSyncEnabled 由渲染进程通过 localStorage 管理，不从此处返回
      expect(status.hasPassword).toBe(false)
      expect(status.isAuthorized).toBe(false)
      expect(status.provider).toBeNull()
    })
  })

  describe('setProvider', () => {
    it('should set the provider', () => {
      const newProvider = createMockProvider()
      service.setProvider(newProvider)
      expect(service.provider).toBe(newProvider)
    })

    it('should allow setting provider to null', () => {
      service.setProvider(null)
      expect(service.provider).toBeNull()
    })
  })

  describe('_extractSyncData', () => {
    it('should extract only sync-relevant fields', () => {
      const settings = createBaseSettings({ language: 'zh-CN', uiTheme: 'dark' })
      const data = service._extractSyncData(settings)

      expect(data.apiProfiles).toEqual(settings.apiProfiles)
      expect(data.currentApiProfile).toBe('default')
      expect(data.mcpServers).toEqual(settings.mcpServers)
      expect(data.apiProfilesOrder).toEqual(['default'])
      // 不应包含设备偏好
      expect(data.language).toBeUndefined()
      expect(data.uiTheme).toBeUndefined()
    })

    it('should handle missing fields with defaults', () => {
      const data = service._extractSyncData({})
      expect(data.apiProfiles).toEqual({})
      expect(data.currentApiProfile).toBe('default')
      expect(data.mcpServers).toEqual({})
      expect(data.apiProfilesOrder).toEqual([])
    })
  })

  describe('_mergeConfigs', () => {
    it('should add new apiProfiles from remote', () => {
      const local = createBaseSettings()
      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {
            production: { apiKey: 'sk-prod', baseUrl: 'https://prod.com' },
          },
          mcpServers: {},
          apiProfilesOrder: ['production'],
          currentApiProfile: 'production',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfiles.production).toBeDefined()
      expect(local.apiProfiles.production.apiKey).toBe('sk-prod')
      // 原有 profile 保留
      expect(local.apiProfiles.default).toBeDefined()
    })

    it('should add new mcpServers from remote', () => {
      const local = createBaseSettings()
      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {},
          mcpServers: {
            'new-server': { command: 'node', args: ['server.js'] },
          },
          apiProfilesOrder: [],
          currentApiProfile: 'default',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.mcpServers['new-server']).toBeDefined()
      expect(local.mcpServers['my-server']).toBeDefined()
    })

    it('should overwrite same-name profile when remote is newer', () => {
      const local = createBaseSettings()
      // local profile 的 _lastModified 是 T1
      local.apiProfiles.default._lastModified = '2026-04-25T08:00:00Z'

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {
            // remote profile 的 _lastModified 是 T2 (比 T1 新)
            default: { apiKey: 'sk-updated', baseUrl: 'https://updated.com', _lastModified: '2026-04-25T09:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: [],
          currentApiProfile: 'default',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfiles.default.apiKey).toBe('sk-updated')
    })

    it('should NOT overwrite same-name profile when remote is older', () => {
      const local = createBaseSettings()
      // local profile 的 _lastModified 是 T3 (12:00)，表示在 lastSyncAt 之后被修改过
      local.apiProfiles.default._lastModified = '2026-04-25T12:00:00Z'
      local.cloudSync.lastSyncAt = '2026-04-25T08:00:00Z'

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {
            // remote profile 的 _lastModified 是 T2 (10:00)，比 local 的 T3 早
            default: { apiKey: 'sk-old', baseUrl: 'https://old.com', _lastModified: '2026-04-25T10:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: [],
          currentApiProfile: 'default',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfiles.default.apiKey).toBe('sk-test-key') // 保留本地
    })

    it('should merge apiProfilesOrder by deduplication', () => {
      const local = createBaseSettings()
      local.apiProfilesOrder = ['default', 'staging']

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {},
          mcpServers: {},
          apiProfilesOrder: ['default', 'production'],
          currentApiProfile: 'default',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfilesOrder).toEqual(['default', 'staging', 'production'])
    })

    it('should take currentApiProfile from latest remote', () => {
      const local = createBaseSettings()

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {},
          mcpServers: {},
          apiProfilesOrder: [],
          currentApiProfile: 'production',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.currentApiProfile).toBe('production')
    })

    it('should handle multiple remote configs (sorted by timestamp desc)', () => {
      const local = createBaseSettings()
      local.cloudSync.lastSyncAt = '2026-04-25T08:00:00Z'

      const remoteConfigs = [
        {
          deviceId: 'remote-old',
          deviceName: 'OldPC',
          timestamp: '2026-04-25T09:00:00Z',
          data: {
            apiProfiles: { old: { apiKey: 'old-key' } },
            mcpServers: {},
            apiProfilesOrder: ['old'],
            currentApiProfile: 'old',
          },
        },
        {
          deviceId: 'remote-new',
          deviceName: 'NewPC',
          timestamp: '2026-04-25T11:00:00Z',
          data: {
            apiProfiles: { new: { apiKey: 'new-key' } },
            mcpServers: {},
            apiProfilesOrder: ['new'],
            currentApiProfile: 'new',
          },
        },
      ]

      service._mergeConfigs(local, remoteConfigs)
      // 两个远程 profile 都应该被加入
      expect(local.apiProfiles.old).toBeDefined()
      expect(local.apiProfiles.new).toBeDefined()
      // currentApiProfile 应取最新的远程值
      expect(local.currentApiProfile).toBe('new')
    })

    it('should not modify localSettings when no remote configs', () => {
      const local = createBaseSettings()
      const originalDefault = local.apiProfiles.default
      service._mergeConfigs(local, [])
      expect(local.apiProfiles.default).toBe(originalDefault)
    })

    it('should sync top-level API fields after merge', () => {
      const local = createBaseSettings()
      // local profile 的 _lastModified 未设置（默认为 0）
      local.cloudSync.lastSyncAt = '2026-04-25T08:00:00Z'
      // 顶层字段是旧值
      local.apiKey = 'sk-old-key'
      local.baseUrl = 'https://old.com'
      local.modelName = 'old-model'

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {
            default: { apiKey: 'sk-merged-key', baseUrl: 'https://merged.com', modelName: 'merged-model', _lastModified: '2026-04-25T09:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: [],
          currentApiProfile: 'default',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)

      // 顶层 API 字段应该与 apiProfiles.default 的合并数据一致
      expect(local.apiKey).toBe('sk-merged-key')
      expect(local.baseUrl).toBe('https://merged.com')
      expect(local.modelName).toBe('merged-model')
    })

    it('should merge mcpServers with overwrite-when-newer strategy', () => {
      const local = createBaseSettings()
      // local server 的 _lastModified 未设置（默认为 0）
      local.cloudSync.lastSyncAt = '2026-04-25T08:00:00Z'

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-25T10:00:00Z',
        data: {
          apiProfiles: {},
          mcpServers: {
            'my-server': { command: 'updated-cmd', args: ['updated-arg'], _lastModified: '2026-04-25T09:00:00Z' },
          },
          apiProfilesOrder: [],
          currentApiProfile: 'default',
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.mcpServers['my-server'].command).toBe('updated-cmd')
    })

    // ─── Tombstone 删除合并 ─────────────────────
    it('local tombstone should remove a profile that exists on remote', () => {
      const local = createBaseSettings()
      local.apiProfiles = { default: local.apiProfiles.default }
      local._deletedProfiles = {
        staging: { deletedAt: '2026-04-26T12:00:00Z' },
      }

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-26T13:00:00Z',
        data: {
          apiProfiles: {
            default: { apiKey: 'sk-test-key', _lastModified: '2026-04-25T09:00:00Z' },
            // staging 在远端存在，但 _lastModified 早于本地 tombstone → 应被删除
            staging: { apiKey: 'sk-staging', _lastModified: '2026-04-25T10:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: ['default', 'staging'],
          currentApiProfile: 'default',
          _deletedProfiles: {},
          _deletedServers: {},
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfiles.staging).toBeUndefined()
      expect(local.apiProfiles.default).toBeDefined()
      expect(local._deletedProfiles.staging).toBeDefined()
      expect(local.apiProfilesOrder).not.toContain('staging')
    })

    it('remote tombstone should remove a local profile when local has no newer modification', () => {
      const local = createBaseSettings()
      local.apiProfiles = {
        default: local.apiProfiles.default,
        staging: { apiKey: 'sk-staging-old', _lastModified: '2026-04-25T08:00:00Z' },
      }

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-26T13:00:00Z',
        data: {
          apiProfiles: {
            default: { apiKey: 'sk-test-key', _lastModified: '2026-04-25T09:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: ['default'],
          currentApiProfile: 'default',
          _deletedProfiles: {
            staging: { deletedAt: '2026-04-26T12:00:00Z' },
          },
          _deletedServers: {},
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfiles.staging).toBeUndefined()
      expect(local._deletedProfiles.staging.deletedAt).toBe('2026-04-26T12:00:00Z')
    })

    it('local edit newer than remote tombstone should win (resurrects profile)', () => {
      const local = createBaseSettings()
      local.apiProfiles = {
        default: local.apiProfiles.default,
        // 本地修改时间晚于远端 tombstone
        staging: { apiKey: 'sk-staging-new', _lastModified: '2026-04-26T15:00:00Z' },
      }

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-26T13:00:00Z',
        data: {
          apiProfiles: {
            default: { apiKey: 'sk-test-key', _lastModified: '2026-04-25T09:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: ['default'],
          currentApiProfile: 'default',
          _deletedProfiles: {
            staging: { deletedAt: '2026-04-26T12:00:00Z' },
          },
          _deletedServers: {},
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfiles.staging).toBeDefined()
      expect(local.apiProfiles.staging.apiKey).toBe('sk-staging-new')
    })

    it('should keep newer tombstone deletedAt across both sides', () => {
      const local = createBaseSettings()
      local._deletedProfiles = {
        staging: { deletedAt: '2026-04-26T12:00:00Z' },
      }

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-26T13:00:00Z',
        data: {
          apiProfiles: {
            default: { apiKey: 'sk-test-key', _lastModified: '2026-04-25T09:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: [],
          currentApiProfile: 'default',
          _deletedProfiles: {
            staging: { deletedAt: '2026-04-26T15:00:00Z' }, // 更新
          },
          _deletedServers: {},
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local._deletedProfiles.staging.deletedAt).toBe('2026-04-26T15:00:00Z')
    })

    it('should apply tombstone to mcpServers as well', () => {
      const local = createBaseSettings()
      local.mcpServers = {
        'my-server': { command: 'npx', args: ['x'], _lastModified: '2026-04-25T08:00:00Z' },
      }

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-26T13:00:00Z',
        data: {
          apiProfiles: {},
          mcpServers: {},
          apiProfilesOrder: [],
          currentApiProfile: 'default',
          _deletedProfiles: {},
          _deletedServers: {
            'my-server': { deletedAt: '2026-04-26T12:00:00Z' },
          },
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.mcpServers['my-server']).toBeUndefined()
      expect(local._deletedServers['my-server']).toBeDefined()
    })

    it('should fall back currentApiProfile to default if it was tombstoned', () => {
      const local = createBaseSettings()
      local.apiProfiles = {
        default: local.apiProfiles.default,
        staging: { apiKey: 'sk-staging', _lastModified: '2026-04-25T08:00:00Z' },
      }
      local.currentApiProfile = 'staging'

      const remoteConfigs = [{
        deviceId: 'remote-1',
        deviceName: 'RemotePC',
        timestamp: '2026-04-26T13:00:00Z',
        data: {
          apiProfiles: {
            default: { apiKey: 'sk-test-key', _lastModified: '2026-04-25T09:00:00Z' },
          },
          mcpServers: {},
          apiProfilesOrder: ['default'],
          currentApiProfile: 'staging',
          _deletedProfiles: {
            staging: { deletedAt: '2026-04-26T12:00:00Z' },
          },
          _deletedServers: {},
        },
      }]

      service._mergeConfigs(local, remoteConfigs)
      expect(local.apiProfiles.staging).toBeUndefined()
      expect(local.currentApiProfile).toBe('default')
    })
  })

  describe('push', () => {
    it('should throw if no provider', async () => {
      service.setProvider(null)
      await expect(service.push('pass')).rejects.toThrow('SYNC_PROVIDER_REQUIRED')
    })

    it('should throw if already syncing', async () => {
      service.isSyncing = true
      await expect(service.push('pass')).rejects.toThrow('SYNC_IN_PROGRESS')
    })

    it('should upload encrypted config and update lastSyncAt', async () => {
      mockProvider.upload.mockResolvedValue(undefined)

      const result = await service.push('my-password')
      expect(result.success).toBe(true)
      expect(mockProvider.upload).toHaveBeenCalledTimes(1)

      // 验证上传的路径
      const uploadPath = mockProvider.upload.mock.calls[0][0]
      expect(uploadPath).toBe('devices/config-test-device-001.json')

      // 验证上传的内容是有效 JSON
      const uploadBuffer = mockProvider.upload.mock.calls[0][1]
      const parsed = JSON.parse(uploadBuffer.toString('utf8'))
      expect(parsed.version).toBe(2)
      expect(parsed.deviceId).toBe('test-device-001')
      expect(parsed.data).toBeDefined()
      expect(parsed.data._salt).toBeDefined()

      // 验证 lastSyncAt 被更新
      expect(mockWriteSettings).toHaveBeenCalled()
    })

    it('should set isSyncing during push and reset after', async () => {
      mockProvider.upload.mockImplementation(async () => {
        expect(service.isSyncing).toBe(true)
      })
      await service.push('pass')
      expect(service.isSyncing).toBe(false)
    })

    it('should reset isSyncing even on error', async () => {
      mockProvider.upload.mockRejectedValue(new Error('network error'))
      await service.push('pass')
      expect(service.isSyncing).toBe(false)
    })

    it('should update lastSyncError on failure', async () => {
      mockProvider.upload.mockRejectedValue(new Error('network error'))

      const result = await service.push('pass')
      expect(result.success).toBe(false)
      expect(result.error).toBe('network error')

      // 验证 writeSettings 被调用保存了错误
      const lastWrite = mockWriteSettings.mock.calls[mockWriteSettings.mock.calls.length - 1][0]
      expect(lastWrite.cloudSync.lastSyncError).toBe('network error')
    })
  })

  describe('pull', () => {
    it('should throw if no provider', async () => {
      service.setProvider(null)
      await expect(service.pull('pass')).rejects.toThrow('SYNC_PROVIDER_REQUIRED')
    })

    it('should merge remote configs and update settings', async () => {
      const password = 'sync-password'
      const remoteData = {
        apiProfiles: {
          production: { apiKey: 'sk-prod-key', baseUrl: 'https://prod.com' },
        },
        mcpServers: {},
        apiProfilesOrder: ['production'],
        currentApiProfile: 'production',
      }

      // 创建加密的远程配置
      const { default: CryptoManager } = await import('../crypto/CryptoManager')
      const crypto = new CryptoManager()
      const buffer = createRemoteConfigBuffer(remoteData, password, crypto)

      mockProvider.list.mockResolvedValue([
        { name: 'config-remote-device-001.json', path: '/devices/config-remote-device-001.json', lastModified: '2026-04-25T10:00:00Z', size: 1024 },
      ])
      mockProvider.download.mockResolvedValue(buffer)

      const result = await service.pull(password)
      expect(result.success).toBe(true)
      expect(result.mergedFrom).toContain('RemotePC')

      // 验证 writeSettings 被调用来保存合并结果
      expect(mockWriteSettings).toHaveBeenCalled()
    })

    it('should return success with empty merge when no remote files', async () => {
      mockProvider.list.mockResolvedValue([])

      const result = await service.pull('pass')
      expect(result.success).toBe(true)
      expect(result.mergedFrom).toEqual([])
    })

    it('should throw SYNC_PASSWORD_INCORRECT when own device file fails to decrypt', async () => {
      // 用一个密码加密，然后用另一个密码解密
      const { default: CryptoManager } = await import('../crypto/CryptoManager')
      const crypto = new CryptoManager()
      const realPassword = 'real-password'
      const remoteData = {
        apiProfiles: { default: { apiKey: 'sk-secret' } },
        mcpServers: {},
        apiProfilesOrder: [],
        currentApiProfile: 'default',
      }
      const encrypted = crypto.encryptSyncData(remoteData, realPassword)

      const buffer = Buffer.from(JSON.stringify({
        version: 2,
        timestamp: new Date().toISOString(),
        deviceId: 'test-device-001', // 与 service.deviceId 一致
        deviceName: 'TestPC',
        data: encrypted,
      }))

      mockProvider.list.mockResolvedValue([
        { name: 'config-test-device-001.json', path: '/devices/config-test-device-001.json', lastModified: '2026-04-25T10:00:00Z', size: 100 },
      ])
      mockProvider.download.mockResolvedValue(buffer)

      const result = await service.pull('wrong-password')
      expect(result.success).toBe(false)
      expect(result.error).toBe('SYNC_PASSWORD_INCORRECT')
    })

    it('should throw SYNC_PASSWORD_LIKELY_INCORRECT when all remote files fail to decrypt (no own device file)', async () => {
      // 远端只有非本机设备的文件且都用错误密码无法解密
      // 即使本机从未推送过（own device 文件不存在），也应明确告知"密码可能错误"
      const { default: CryptoManager } = await import('../crypto/CryptoManager')
      const crypto = new CryptoManager()
      const realPassword = 'real-password'
      const remoteData = {
        apiProfiles: { default: { apiKey: 'sk-secret' } },
        mcpServers: {},
        apiProfilesOrder: [],
        currentApiProfile: 'default',
      }
      const encrypted = crypto.encryptSyncData(remoteData, realPassword)

      const buffer = Buffer.from(JSON.stringify({
        version: 2,
        timestamp: new Date().toISOString(),
        deviceId: 'other-device', // 非 own device
        deviceName: 'OtherPC',
        data: encrypted,
      }))

      mockProvider.list.mockResolvedValue([
        { name: 'config-other-device.json', path: '/devices/config-other-device.json', lastModified: '2026-04-25T10:00:00Z', size: 100 },
      ])
      mockProvider.download.mockResolvedValue(buffer)

      const result = await service.pull('any-password')
      expect(result.success).toBe(false)
      expect(result.error).toBe('SYNC_PASSWORD_LIKELY_INCORRECT')
      // 解密失败应有 warn 日志
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should still succeed when some remote files fail to decrypt but at least one succeeds', async () => {
      // 混合场景：远端 2 个文件，1 个能解密，1 个不能
      // 应跳过解密失败的，正常合并解密成功的
      const { default: CryptoManager } = await import('../crypto/CryptoManager')
      const crypto = new CryptoManager()
      const goodPassword = 'good-password'
      const wrongPassword = 'wrong-password'

      const goodData = {
        apiProfiles: { production: { apiKey: 'sk-good' } },
        mcpServers: {},
        apiProfilesOrder: ['production'],
        currentApiProfile: 'production',
      }
      const goodBuffer = createRemoteConfigBuffer(
        { ...goodData, _deviceId: 'good-device', _deviceName: 'GoodPC' },
        goodPassword,
        crypto
      )

      const badData = {
        apiProfiles: { other: { apiKey: 'sk-bad' } },
        mcpServers: {},
        apiProfilesOrder: ['other'],
        currentApiProfile: 'other',
      }
      const badEncrypted = crypto.encryptSyncData(badData, wrongPassword)
      const badBuffer = Buffer.from(JSON.stringify({
        version: 2,
        timestamp: new Date().toISOString(),
        deviceId: 'bad-device',
        deviceName: 'BadPC',
        data: badEncrypted,
      }))

      mockProvider.list.mockResolvedValue([
        { name: 'config-good-device.json', path: '/devices/config-good-device.json', lastModified: '2026-04-25T10:00:00Z', size: 100 },
        { name: 'config-bad-device.json', path: '/devices/config-bad-device.json', lastModified: '2026-04-25T10:00:00Z', size: 100 },
      ])
      mockProvider.download.mockImplementation((path) => {
        if (path.includes('good-device')) return Promise.resolve(goodBuffer)
        return Promise.resolve(badBuffer)
      })

      const result = await service.pull(goodPassword)
      expect(result.success).toBe(true)
      // 仅成功解密的设备出现在 mergedFrom 中
      expect(result.mergedFrom).toEqual(['GoodPC'])
      // 解密失败的文件应该有 warn 日志
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should skip files with invalid JSON', async () => {
      mockProvider.list.mockResolvedValue([
        { name: 'config-bad.json', path: '/devices/config-bad.json', lastModified: '2026-04-25T10:00:00Z', size: 10 },
      ])
      mockProvider.download.mockResolvedValue(Buffer.from('not-json'))

      const result = await service.pull('pass')
      expect(result.success).toBe(true)
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should skip files with wrong version', async () => {
      const buffer = Buffer.from(JSON.stringify({
        version: 1,
        timestamp: new Date().toISOString(),
        deviceId: 'old-device',
        data: {},
      }))

      mockProvider.list.mockResolvedValue([
        { name: 'config-old.json', path: '/devices/config-old.json', lastModified: '2026-04-25T10:00:00Z', size: 100 },
      ])
      mockProvider.download.mockResolvedValue(buffer)

      const result = await service.pull('pass')
      expect(result.success).toBe(true)
    })

    it('should handle network errors gracefully', async () => {
      mockProvider.list.mockRejectedValue(new Error('WEBDAV_ERROR_503'))

      const result = await service.pull('pass')
      expect(result.success).toBe(false)
      expect(result.error).toBe('WEBDAV_ERROR_503')
    })
  })

  describe('sync', () => {
    it('should pull then push', async () => {
      mockProvider.list.mockResolvedValue([])
      mockProvider.upload.mockResolvedValue(undefined)

      const result = await service.sync('pass')
      expect(result.success).toBe(true)
      expect(mockProvider.list).toHaveBeenCalled()
      expect(mockProvider.upload).toHaveBeenCalled()
    })

    it('should not push if pull fails', async () => {
      mockProvider.list.mockRejectedValue(new Error('network error'))

      const result = await service.sync('pass')
      expect(result.success).toBe(false)
      expect(mockProvider.upload).not.toHaveBeenCalled()
    })

    it('should include mergedFrom from pull in result', async () => {
      mockProvider.list.mockResolvedValue([])
      mockProvider.upload.mockResolvedValue(undefined)

      const result = await service.sync('pass')
      expect(result.mergedFrom).toEqual([])
    })
  })

  describe('clearCloud', () => {
    it('should throw if no provider', async () => {
      service.setProvider(null)
      await expect(service.clearCloud()).rejects.toThrow('SYNC_PROVIDER_REQUIRED')
    })

    it('should delete all config files from cloud', async () => {
      mockProvider.list.mockResolvedValue([
        { name: 'config-device-1.json', path: '/devices/config-device-1.json', lastModified: '', size: 0 },
        { name: 'config-device-2.json', path: '/devices/config-device-2.json', lastModified: '', size: 0 },
        { name: 'other-file.txt', path: '/devices/other-file.txt', lastModified: '', size: 0 },
      ])
      mockProvider.delete.mockResolvedValue(undefined)

      await service.clearCloud()

      // 只删除 config-*.json 文件
      expect(mockProvider.delete).toHaveBeenCalledTimes(2)
      expect(mockProvider.delete).toHaveBeenCalledWith('devices/config-device-1.json')
      expect(mockProvider.delete).toHaveBeenCalledWith('devices/config-device-2.json')
    })
  })

  describe('getDevices', () => {
    it('should return empty array if no provider', async () => {
      service.setProvider(null)
      const devices = await service.getDevices()
      expect(devices).toEqual([])
    })

    it('should parse device info from cloud files', async () => {
      mockProvider.list.mockResolvedValue([
        { name: 'config-test-device-001.json', path: '/devices/config-test-device-001.json', lastModified: '2026-04-25T10:00:00Z', size: 100 },
        { name: 'config-remote-002.json', path: '/devices/config-remote-002.json', lastModified: '2026-04-25T09:00:00Z', size: 200 },
      ])
      mockProvider.download.mockImplementation(async (path) => {
        if (path.includes('test-device-001')) {
          return Buffer.from(JSON.stringify({
            version: 2, deviceId: 'test-device-001', deviceName: 'TestPC',
          }))
        }
        return Buffer.from(JSON.stringify({
          version: 2, deviceId: 'remote-002', deviceName: 'RemotePC',
        }))
      })

      const devices = await service.getDevices()
      expect(devices).toHaveLength(2)
      expect(devices[0].isSelf).toBe(true)
      expect(devices[0].deviceName).toBe('TestPC')
      expect(devices[1].isSelf).toBe(false)
      expect(devices[1].deviceName).toBe('RemotePC')
    })

    it('should skip files that fail to parse', async () => {
      mockProvider.list.mockResolvedValue([
        { name: 'config-bad.json', path: '/devices/config-bad.json', lastModified: '', size: 0 },
      ])
      mockProvider.download.mockResolvedValue(Buffer.from('invalid'))

      const devices = await service.getDevices()
      expect(devices).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should only include config-*.json files', async () => {
      mockProvider.list.mockResolvedValue([
        { name: 'other-file.txt', path: '/devices/other-file.txt', lastModified: '', size: 0 },
      ])

      const devices = await service.getDevices()
      expect(devices).toEqual([])
    })
  })

  describe('removeDevice', () => {
    it('should throw if no provider', async () => {
      service.setProvider(null)
      await expect(service.removeDevice('id')).rejects.toThrow('SYNC_PROVIDER_REQUIRED')
    })

    it('should delete the device config file', async () => {
      mockProvider.delete.mockResolvedValue(undefined)
      await service.removeDevice('remote-002')
      expect(mockProvider.delete).toHaveBeenCalledWith('devices/config-remote-002.json')
    })
  })

  describe('auto-sync', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      service.stopAutoSync()
    })

    describe('cachePassword / clearCachedPassword', () => {
      it('should cache and retrieve password', () => {
        service.cachePassword('my-secret', { persist: false })
        expect(service._cachedPassword).toBe('my-secret')
      })

      it('should clear cached password', () => {
        service.cachePassword('my-secret', { persist: false })
        service.clearCachedPassword()
        expect(service._cachedPassword).toBeNull()
      })

      it('should persist encrypted password when persist option is true', () => {
        service.cachePassword('my-secret', { persist: true })
        expect(service._cachedPassword).toBe('my-secret')
        // 验证 writeSettings 被调用来持久化加密密码
        const lastWrite = mockWriteSettings.mock.calls[mockWriteSettings.mock.calls.length - 1][0]
        expect(lastWrite.cloudSync.autoSyncEncryptedPassword).toBeDefined()
      })

      it('should not persist password when persist option is false', () => {
        const beforeCount = mockWriteSettings.mock.calls.length
        service.cachePassword('my-secret', { persist: false })
        // cachePassword 不应额外调用 writeSettings
        expect(mockWriteSettings.mock.calls.length).toBe(beforeCount)
      })

      it('should NOT persist password by default (M-1: secure default)', () => {
        const beforeCount = mockWriteSettings.mock.calls.length
        // 不传 options，使用默认值
        service.cachePassword('my-secret')
        expect(service._cachedPassword).toBe('my-secret')
        // 默认不持久化：writeSettings 不应被额外调用
        expect(mockWriteSettings.mock.calls.length).toBe(beforeCount)
      })

      it('should clear persisted password on clearCachedPassword', () => {
        service.cachePassword('my-secret', { persist: true })
        // 让 mockReadSettings 返回包含加密密码的设置
        const persistedSettings = mockWriteSettings.mock.calls[mockWriteSettings.mock.calls.length - 1][0]
        mockReadSettings.mockReturnValue(persistedSettings)
        service.clearCachedPassword()
        expect(service._cachedPassword).toBeNull()
        // 验证持久化密码被清除
        const lastWrite = mockWriteSettings.mock.calls[mockWriteSettings.mock.calls.length - 1][0]
        expect(lastWrite.cloudSync.autoSyncEncryptedPassword).toBeUndefined()
      })
    })

    describe('restorePersistedPassword', () => {
      it('should restore password from persistent storage', () => {
        // 先持久化一个密码
        service.cachePassword('restored-pass', { persist: true })
        // 获取持久化后的设置
        const lastWrite = mockWriteSettings.mock.calls[mockWriteSettings.mock.calls.length - 1][0]
        // 让 mockReadSettings 返回包含加密密码的设置
        mockReadSettings.mockReturnValue(lastWrite)
        // 清除内存缓存
        service._cachedPassword = null
        // 恢复
        service.restorePersistedPassword()
        expect(service._cachedPassword).toBe('restored-pass')
      })

      it('should not overwrite existing cached password', () => {
        service._cachedPassword = 'existing'
        service.restorePersistedPassword()
        expect(service._cachedPassword).toBe('existing')
      })

      it('should handle missing persisted password gracefully', () => {
        service._cachedPassword = null
        service.restorePersistedPassword()
        expect(service._cachedPassword).toBeNull()
      })
    })

    describe('startAutoSync / stopAutoSync', () => {
      it('should start the auto-sync timer', () => {
        service.startAutoSync({ interval: 60000 })
        expect(service._autoSyncTimer).not.toBeNull()
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Auto-sync started'))
      })

      it('should stop the auto-sync timer', () => {
        service.startAutoSync({ interval: 60000 })
        service.stopAutoSync()
        expect(service._autoSyncTimer).toBeNull()
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Auto-sync stopped'))
      })

      it('should restart timer if startAutoSync called again', () => {
        service.startAutoSync({ interval: 60000 })
        const firstTimer = service._autoSyncTimer
        service.startAutoSync({ interval: 120000 })
        expect(service._autoSyncTimer).not.toBe(firstTimer)
      })

      it('should be safe to call stopAutoSync when no timer is running', () => {
        expect(() => service.stopAutoSync()).not.toThrow()
      })
    })

    describe('_doAutoSync', () => {
      it('should skip if no cached password', async () => {
        service.clearCachedPassword()
        await service._doAutoSync()
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('no cached password'))
      })

      it('should skip if syncing is in progress', async () => {
        service.cachePassword('pass')
        service.isSyncing = true
        await service._doAutoSync()
        expect(mockProvider.list).not.toHaveBeenCalled()
        service.isSyncing = false
      })

      it('should skip if no provider', async () => {
        service.cachePassword('pass')
        service.setProvider(null)
        await service._doAutoSync()
        // Should not throw, just return
        service.setProvider(mockProvider)
      })

      it('should call sync when conditions are met', async () => {
        service.cachePassword('pass')
        mockProvider.list.mockResolvedValue([])
        mockProvider.upload.mockResolvedValue(undefined)

        await service._doAutoSync()
        expect(mockProvider.list).toHaveBeenCalled()
        expect(mockProvider.upload).toHaveBeenCalled()
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Auto-sync triggered'))
      })

      it('should handle sync errors gracefully', async () => {
        service.cachePassword('pass')
        mockProvider.list.mockRejectedValue(new Error('network error'))

        await service._doAutoSync()
        expect(mockLogger.warn).toHaveBeenCalledWith('Auto-sync failed:', 'network error')
      })
    })

    describe('onSettingsSaved', () => {
      it('should not trigger when autoSync is disabled', () => {
        const settings = createBaseSettings()
        settings.cloudSync.autoSyncEnabled = false
        mockReadSettings.mockReturnValue(settings)

        service.onSettingsSaved()
        expect(service._settingsSaveDebounceTimer).toBeNull()
      })

      it('should not trigger when cloudSync is not enabled', () => {
        const settings = createBaseSettings()
        settings.cloudSync.enabled = false
        mockReadSettings.mockReturnValue(settings)

        service.onSettingsSaved()
        expect(service._settingsSaveDebounceTimer).toBeNull()
      })

      it('should not trigger when syncing is in progress', () => {
        const settings = createBaseSettings()
        settings.cloudSync.autoSyncEnabled = true
        mockReadSettings.mockReturnValue(settings)
        service.isSyncing = true

        service.onSettingsSaved()
        expect(service._settingsSaveDebounceTimer).toBeNull()
        service.isSyncing = false
      })

      it('should set debounce timer when conditions are met', () => {
        const settings = createBaseSettings()
        settings.cloudSync.autoSyncEnabled = true
        mockReadSettings.mockReturnValue(settings)
        service.cachePassword('pass')

        service.onSettingsSaved()
        expect(service._settingsSaveDebounceTimer).not.toBeNull()
      })

      it('should debounce multiple calls', () => {
        const settings = createBaseSettings()
        settings.cloudSync.autoSyncEnabled = true
        mockReadSettings.mockReturnValue(settings)
        service.cachePassword('pass')

        service.onSettingsSaved()
        const firstTimer = service._settingsSaveDebounceTimer
        service.onSettingsSaved()
        // Timer was reset (new timeout created)
        // The first timer was cleared, a new one was set
        expect(service._settingsSaveDebounceTimer).not.toBeNull()
      })

      it('should trigger _doAutoSync after debounce delay', async () => {
        const settings = createBaseSettings()
        settings.cloudSync.autoSyncEnabled = true
        mockReadSettings.mockReturnValue(settings)
        service.cachePassword('pass')
        mockProvider.list.mockResolvedValue([])
        mockProvider.upload.mockResolvedValue(undefined)

        service.onSettingsSaved()
        vi.advanceTimersByTime(3000)
        // Allow the async _doAutoSync to complete
        await vi.runAllTimersAsync()

        expect(mockProvider.list).toHaveBeenCalled()
      })
    })
  })
})
