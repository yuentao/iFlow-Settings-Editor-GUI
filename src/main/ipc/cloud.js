/**
 * 云同步 IPC 处理器
 * 处理云同步相关的 IPC 通信
 */

const { ipcMain, BrowserWindow, app } = require('electron')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const { wrapIpcHandler } = require('../utils/errors')
const SyncService = require('../services/SyncService')
const CryptoManager = require('../crypto/CryptoManager')
const WebDAVProvider = require('../services/cloud/WebDAVProvider')
const { readSettings, writeSettings } = require('../services/configService')
const { createLogger } = require('../utils/logger')

const logger = createLogger('CloudSync')

// ── 懒加载单例：首次访问时才实例化 SyncService 并初始化 ──
let _syncService = null
let _syncServiceInitialized = false

function getSyncService() {
  if (!_syncService) {
    _syncService = new SyncService()
    // 每次 isSyncing 翻转都广播一次最新状态
    _syncService.onSyncingChanged(() => broadcastSyncStatus())
    // Bug 7 修复：转发同步进度和冲突检测事件到渲染进程
    _syncService.onSyncProgress((progress) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.isDestroyed()) continue
        try {
          win.webContents.send('cloud-sync:sync-progress', progress)
        } catch (err) {
          logger.warn('Failed to send cloud-sync:sync-progress:', err && err.message ? err.message : err)
        }
      }
    })
    _syncService.onConflictDetected((conflictInfo) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.isDestroyed()) continue
        try {
          win.webContents.send('cloud-sync:conflict-detected', conflictInfo)
        } catch (err) {
          logger.warn('Failed to send cloud-sync:conflict-detected:', err && err.message ? err.message : err)
        }
      }
    })
  }
  if (!_syncServiceInitialized) {
    _syncServiceInitialized = true
    // 应用启动时初始化 provider（providerConfig 仍从 settings.json 读取）
    initProvider()
  }
  return _syncService
}

const cryptoMgr = new CryptoManager()

// ── 机器级加密密钥 ──────────────────────────────────────
// 首次使用时在 ~/.iflow/.enc_key 生成随机 32 字节密钥，
// 用于加密 WebDAV 等凭据，避免明文存储在 settings.json 中。
let _machineKey = null

function getMachineKeyFile() {
  // 延迟计算，避免模块加载时 app 不可用
  return path.join(app.getPath('home'), '.iflow', '.enc_key')
}

function getOrCreateMachineKey() {
  if (_machineKey) return _machineKey
  const keyFile = getMachineKeyFile()
  try {
    if (fs.existsSync(keyFile)) {
      const data = fs.readFileSync(keyFile)
      if (data.length === 32) {
        _machineKey = data
        return _machineKey
      }
      logger.warn('Machine key file has invalid length, regenerating')
    }
  } catch (err) {
    logger.warn('Failed to read machine key file, regenerating:', err.message)
  }
  // 生成新密钥
  _machineKey = crypto.randomBytes(32)
  try {
    const dir = path.dirname(keyFile)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(keyFile, _machineKey)
  } catch (err) {
    logger.error('Failed to write machine key file:', err.message)
    // 密钥仍在内存中可用，但重启后凭据需重新输入
  }
  return _machineKey
}

/**
 * 加密 WebDAV providerConfig 中的密码字段
 * 使用机器级密钥 + CryptoManager AES-256-GCM 加密
 * @param {object} config - 原始 providerConfig
 * @returns {object} 密码已加密的 providerConfig
 */
function encryptProviderConfig(config) {
  if (!config || typeof config !== 'object') return config
  const key = getOrCreateMachineKey()
  const result = { ...config }
  if (result.password && typeof result.password === 'string' && !result.password.startsWith('$enc:')) {
    try {
      result.password = cryptoMgr.encryptField(result.password, key)
    } catch (err) {
      logger.error('Failed to encrypt WebDAV password:', err.message)
    }
  }
  return result
}

/**
 * 解密 WebDAV providerConfig 中的密码字段
 * @param {object} config - 含加密密码的 providerConfig
 * @returns {object} 密码已解密的 providerConfig
 */
function decryptProviderConfig(config) {
  if (!config || typeof config !== 'object') return config
  const key = getOrCreateMachineKey()
  const result = { ...config }
  if (result.password && typeof result.password === 'string' && result.password.startsWith('$enc:')) {
    try {
      result.password = cryptoMgr.decryptField(result.password, key)
    } catch (err) {
      logger.error('Failed to decrypt WebDAV password:', err.message)
      // 解密失败保留原值，让用户重新输入凭据
    }
  }
  return result
}

/**
 * L-10：把最新同步状态广播到所有渲染窗口
 * 渲染端通过 onCloudSyncStatusChanged 订阅，确保 isSyncing 等字段
 * 始终以主进程 SyncService 为单一来源，消除两端 desync。
 */
function broadcastSyncStatus() {
  const syncService = getSyncService()
  const status = { success: true, ...getSyncService().getStatus() }
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    try {
      win.webContents.send('cloud-sync:status-changed', status)
    } catch (err) {
      logger.warn('Failed to broadcast cloud-sync:status-changed:', err && err.message ? err.message : err)
    }
  }
}

/**
 * 根据设置中的 provider 配置初始化云存储适配器
 */
function initProvider() {
  const settings = readSettings() || {}
  const cs = settings.cloudSync || {}
  if (!cs.provider || !cs.providerConfig) {
    getSyncService().setProvider(null)
    return
  }

  if (cs.provider === 'webdav') {
    try {
      // P0-03：解密 providerConfig 中的密码后再创建 provider
      const decryptedConfig = decryptProviderConfig(cs.providerConfig)
      const provider = new WebDAVProvider(decryptedConfig)
      getSyncService().setProvider(provider)
    } catch (err) {
      logger.error('Failed to init WebDAV provider', err)
      getSyncService().setProvider(null)
    }
  }
  // OneDrive / Dropbox 适配器在此扩展
}

/**
 * 读取「记住同步密码」开关（settings.cloudSync.rememberSyncPassword）
 * 默认 false（M-1：用户必须显式启用）
 */
function readRememberPassword() {
  const settings = readSettings() || {}
  return settings.cloudSync?.rememberSyncPassword === true
}

/**
 * 根据「记住同步密码」开关代理 cachePassword 调用，统一持久化策略
 */
function cachePasswordWithSettings(password) {
  getSyncService().cachePassword(password, { persist: readRememberPassword() })
}

/**
 * 注册云同步 IPC 处理器
 */
function registerCloudSyncIpcHandlers() {
  // ====== 同步状态 ======

  ipcMain.handle('cloud-sync:get-status', wrapIpcHandler(async () => {
    const status = getSyncService().getStatus()
    return { success: true, ...status }
  }, 'cloud-sync:get-status'))

  ipcMain.handle('cloud-sync:set-auto-sync', wrapIpcHandler(async (_event, enabled, interval) => {
    // autoSyncEnabled 由渲染进程通过 localStorage 持久化
    if (!enabled) {
      getSyncService().stopAutoSync()
      getSyncService().clearCachedPassword()
    } else {
      // Bug 1 修复：从 settings 读取 syncInterval，或使用调用方传入的 interval
      const syncInterval = interval || (readSettings() || {}).cloudSync?.syncInterval
      const options = {}
      if (syncInterval) options.interval = syncInterval
      // Bug 2 修复：检查 startAutoSync 返回值
      const result = getSyncService().startAutoSync(options)
      if (result && !result.success) return result
    }
    return { success: true }
  }, 'cloud-sync:set-auto-sync'))

  // ====== 云服务配置 ======

  ipcMain.handle('cloud-sync:configure-provider', wrapIpcHandler(async (_event, provider, config, testOnly) => {
    if (testOnly) {
      // 仅测试模式：不保存配置，直接用临时 provider 测试连接
      const providerInstance = provider === 'webdav' ? new WebDAVProvider(config) : null
      if (!providerInstance) return { success: false, error: 'PROVIDER_TYPE_NOT_SUPPORTED' }
      try {
        const authorized = await providerInstance.isAuthorized()
        return { success: true, authorized }
      } catch (err) {
        return { success: false, error: err.message || String(err) }
      }
    }
    // 正常模式：保存配置并初始化
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.provider = provider
    // P0-03：加密 providerConfig 中的密码后再持久化
    settings.cloudSync.providerConfig = encryptProviderConfig(config)
    await writeSettings(settings)
    initProvider()
    return { success: true }
  }, 'cloud-sync:configure-provider'))

  ipcMain.handle('cloud-sync:test-connection', wrapIpcHandler(async () => {
    if (!getSyncService().provider) {
      return { success: false, error: 'SYNC_PROVIDER_REQUIRED' }
    }
    const authorized = await getSyncService().provider.isAuthorized()
    return { success: true, authorized }
  }, 'cloud-sync:test-connection'))

  ipcMain.handle('cloud-sync:revoke-auth', wrapIpcHandler(async () => {
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    delete settings.cloudSync.providerConfig
    await writeSettings(settings)
    getSyncService().setProvider(null)
    getSyncService().clearCachedPassword()
    // 不再调用 autoSyncManager.refresh()，自动同步状态由渲染进程通过 localStorage 管理
    return { success: true }
  }, 'cloud-sync:revoke-auth'))

  // ====== 同步密码 ======

  ipcMain.handle('cloud-sync:set-password', wrapIpcHandler(async (_event, password) => {
    if (!password || password.length < 8) {
      return { success: false, error: 'SYNC_PASSWORD_TOO_SHORT' }
    }
    const salt = crypto.randomBytes(16)
    const key = cryptoMgr.deriveKey(password, salt)
    const hash = cryptoMgr.hashKey(key)

    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.passwordHash = hash
    settings.cloudSync.passwordSalt = salt.toString('base64')
    await writeSettings(settings)

    // 缓存密码（持久化与否由 rememberSyncPassword 开关决定，M-1）
    cachePasswordWithSettings(password)
    return { success: true }
  }, 'cloud-sync:set-password'))

  ipcMain.handle('cloud-sync:verify-password', wrapIpcHandler(async (_event, password) => {
    const settings = readSettings() || {}
    const cs = settings.cloudSync || {}
    if (!cs.passwordHash || !cs.passwordSalt) {
      return { success: true, valid: false }
    }

    const salt = Buffer.from(cs.passwordSalt, 'base64')
    const key = cryptoMgr.deriveKey(password, salt)
    const hash = cryptoMgr.hashKey(key)
    const valid = cryptoMgr.verifyHash(hash, cs.passwordHash)

    // 验证成功仅缓存密码；不更新 lastSyncAt（仅验证不等于完成同步，
    // 错误地推进时间线会让后续 pull 的兜底比较把远端实际更新当成"旧"，造成数据丢失）
    if (valid) {
      cachePasswordWithSettings(password)
    }
    return { success: true, valid }
  }, 'cloud-sync:verify-password'))

  ipcMain.handle('cloud-sync:change-password', wrapIpcHandler(async (_event, oldPassword, newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'SYNC_PASSWORD_TOO_SHORT' }
    }

    const settings = readSettings() || {}
    const cs = settings.cloudSync || {}
    if (!cs.passwordHash || !cs.passwordSalt) {
      return { success: false, error: 'SYNC_PASSWORD_NOT_SET' }
    }

    // 验证旧密码
    const salt = Buffer.from(cs.passwordSalt, 'base64')
    const key = cryptoMgr.deriveKey(oldPassword, salt)
    const hash = cryptoMgr.hashKey(key)
    if (!cryptoMgr.verifyHash(hash, cs.passwordHash)) {
      return { success: false, error: 'SYNC_PASSWORD_INCORRECT' }
    }

    // 设置新密码
    const newSalt = crypto.randomBytes(16)
    const newKey = cryptoMgr.deriveKey(newPassword, newSalt)
    const newHash = cryptoMgr.hashKey(newKey)
    settings.cloudSync.passwordHash = newHash
    settings.cloudSync.passwordSalt = newSalt.toString('base64')
    await writeSettings(settings)

    // 缓存新密码（持久化与否由 rememberSyncPassword 开关决定，M-1）
    cachePasswordWithSettings(newPassword)

    // 主动用新密码重新推送本机配置：
    // - 旧文件由旧密码加密，新密码解不开 → 后续 pull 会抛 SYNC_PASSWORD_INCORRECT
    // - 在此立刻覆写本机 config-{deviceId}.json，保证本机文件与新密码匹配
    // - 其他设备的文件仍由旧密码加密，需要在那些设备上分别用新密码重新 push
    let repushed = false
    let repushError = null
    if (getSyncService().provider) {
      try {
        const pushResult = await getSyncService().push(newPassword)
        repushed = !!pushResult?.success
        if (!pushResult?.success) {
          repushError = pushResult?.error || null
        }
      } catch (err) {
        repushError = err?.message || String(err)
      }
    }

    // needRepush 表示「其他设备仍需用新密码重新 push」
    return { success: true, needRepush: true, repushed, repushError }
  }, 'cloud-sync:change-password'))

  ipcMain.handle('cloud-sync:has-password', wrapIpcHandler(async () => {
    const settings = readSettings() || {}
    return { success: true, hasPassword: !!settings.cloudSync?.passwordHash }
  }, 'cloud-sync:has-password'))

  ipcMain.handle('cloud-sync:has-cached-password', wrapIpcHandler(async () => {
    return { success: true, hasCachedPassword: getSyncService().hasCachedPassword() }
  }, 'cloud-sync:has-cached-password'))

  // M-1: 用户对密码持久化的显式控制
  ipcMain.handle('cloud-sync:get-remember-password', wrapIpcHandler(async () => {
    return { success: true, remember: readRememberPassword() }
  }, 'cloud-sync:get-remember-password'))

  ipcMain.handle('cloud-sync:set-remember-password', wrapIpcHandler(async (_event, remember) => {
    const enabled = remember === true
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.rememberSyncPassword = enabled
    await writeSettings(settings)

    if (enabled) {
      // 用户明确启用：若当前内存中有密码则立即持久化
      getSyncService().persistCachedPassword()
    } else {
      // 用户关闭：清理任何已持久化的加密密码（内存缓存保留至会话结束）
      getSyncService().clearPersistedPassword()
    }
    return { success: true, remember: enabled }
  }, 'cloud-sync:set-remember-password'))

  // ====== 同步操作 ======

  ipcMain.handle('cloud-sync:sync-now', wrapIpcHandler(async (_event, password) => {
    // 缓存密码供自动同步使用（持久化与否由 rememberSyncPassword 开关决定，M-1）
    if (password) cachePasswordWithSettings(password)
    return getSyncService().sync(password)
  }, 'cloud-sync:sync-now'))

  ipcMain.handle('cloud-sync:pull', wrapIpcHandler(async (_event, password) => {
    return getSyncService().pull(password)
  }, 'cloud-sync:pull'))

  ipcMain.handle('cloud-sync:push', wrapIpcHandler(async (_event, password) => {
    return getSyncService().push(password)
  }, 'cloud-sync:push'))

  ipcMain.handle('cloud-sync:clear-cloud', wrapIpcHandler(async () => {
    await getSyncService().clearCloud()
    getSyncService().clearCachedPassword()

    // H-5: 同步清理本地密码哈希/盐与持久化的加密密码
    // 否则用户清空云端后用其他设备重新设置密码，本地仍持有旧 hash → verify-password 会误判
    let cleared = false
    const settings = readSettings() || {}
    if (settings.cloudSync) {
      if (settings.cloudSync.passwordHash || settings.cloudSync.passwordSalt) {
        delete settings.cloudSync.passwordHash
        delete settings.cloudSync.passwordSalt
        cleared = true
      }
      if (settings.cloudSync.autoSyncEncryptedPassword) {
        delete settings.cloudSync.autoSyncEncryptedPassword
        cleared = true
      }
      if (cleared) await writeSettings(settings)
    }

    return { success: true, cleared }
  }, 'cloud-sync:clear-cloud'))

  // ====== 设备管理 ======

  ipcMain.handle('cloud-sync:get-devices', wrapIpcHandler(async () => {
    const devices = await getSyncService().getDevices()
    return { success: true, devices }
  }, 'cloud-sync:get-devices'))

  ipcMain.handle('cloud-sync:set-device-name', wrapIpcHandler(async (_event, name) => {
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.deviceName = name
    await writeSettings(settings)
    return { success: true }
  }, 'cloud-sync:set-device-name'))

  ipcMain.handle('cloud-sync:set-tombstone-retention-days', wrapIpcHandler(async (_event, days) => {
    const clamped = Math.max(1, Math.min(365, Number(days) || 30))
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.tombstoneRetentionDays = clamped
    await writeSettings(settings)
    return { success: true, tombstoneRetentionDays: clamped }
  }, 'cloud-sync:set-tombstone-retention-days'))

  ipcMain.handle('cloud-sync:set-sync-interval', wrapIpcHandler(async (_event, minutes) => {
    const clamped = Math.max(1, Math.min(1440, Number(minutes) || 5))
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.syncInterval = clamped
    await writeSettings(settings)
    // 如果自动同步正在运行，重启定时器以应用新间隔
    const syncService = getSyncService()
    if (syncService._autoSyncEnabled) {
      syncService.startAutoSync({ interval: clamped * 60 * 1000 })
    }
    return { success: true, syncInterval: clamped }
  }, 'cloud-sync:set-sync-interval'))

  ipcMain.handle('cloud-sync:remove-device', wrapIpcHandler(async (_event, deviceId) => {
    await getSyncService().removeDevice(deviceId)
    return { success: true }
  }, 'cloud-sync:remove-device'))

  logger.info('Cloud sync IPC handlers registered')
}

module.exports = {
  registerCloudSyncIpcHandlers,
  get syncService() { return getSyncService() },
  initProvider,
}
