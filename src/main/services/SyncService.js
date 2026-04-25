const crypto = require('crypto')
const CryptoManager = require('../crypto/CryptoManager')

// 生产环境默认依赖（按需加载，避免测试时触发 Electron 依赖）
function _getDefaultReadSettings() {
  return require('../services/configService').readSettings
}
function _getDefaultWriteSettings() {
  return require('../services/configService').writeSettings
}
function _getDefaultLogger() {
  return require('../utils/logger').createLogger('CloudSync')
}

class SyncService {
  /**
   * @param {object} [deps] - 依赖注入（测试时使用）
   * @param {Function} [deps.readSettings] - 读取设置
   * @param {Function} [deps.writeSettings] - 写入设置
   * @param {object} [deps.logger] - 日志记录器 { info, warn, error }
   */
  constructor(deps = {}) {
    this.crypto = new CryptoManager()
    this.provider = null
    this.isSyncing = false

    // 依赖注入：测试时传入 mock，生产时按需加载真实模块
    this._readSettings = deps.readSettings || null
    this._writeSettings = deps.writeSettings || null
    this._logger = deps.logger || null

    this._deviceId = null
  }

  /** 懒加载 readSettings */
  get readSettings() {
    if (!this._readSettings) this._readSettings = _getDefaultReadSettings()
    return this._readSettings
  }

  /** 懒加载 writeSettings */
  get writeSettings() {
    if (!this._writeSettings) this._writeSettings = _getDefaultWriteSettings()
    return this._writeSettings
  }

  /** 懒加载 logger */
  get logger() {
    if (!this._logger) this._logger = _getDefaultLogger()
    return this._logger
  }

  /** 获取或创建设备 ID（懒初始化） */
  get deviceId() {
    if (this._deviceId) return this._deviceId
    this._deviceId = this._getOrCreateDeviceId()
    return this._deviceId
  }

  /** 设置云存储适配器 */
  setProvider(provider) {
    this.provider = provider
  }

  /**
   * 获取同步状态
   * @returns {object}
   */
  getStatus() {
    const settings = this.readSettings() || {}
    const cs = settings.cloudSync || {}
    return {
      enabled: cs.enabled || false,
      autoSyncEnabled: cs.autoSyncEnabled || false,
      hasPassword: !!cs.passwordHash,
      isAuthorized: !!cs.providerConfig,
      provider: cs.provider || null,
      deviceName: cs.deviceName || '',
      deviceId: this.deviceId,
      lastSyncAt: cs.lastSyncAt || null,
      lastSyncError: cs.lastSyncError || null,
      isSyncing: this.isSyncing,
    }
  }

  /**
   * 推送本地配置到云端
   * @param {string} password - 同步密码
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async push(password) {
    if (!this.provider) throw new Error('SYNC_PROVIDER_REQUIRED')
    if (this.isSyncing) throw new Error('SYNC_IN_PROGRESS')

    this.isSyncing = true
    try {
      const settings = this.readSettings() || {}
      const syncData = this._extractSyncData(settings)
      const encrypted = this.crypto.encryptSyncData(syncData, password)

      const deviceName = (settings.cloudSync || {}).deviceName || ''
      const fileContent = Buffer.from(JSON.stringify({
        version: 2,
        timestamp: new Date().toISOString(),
        deviceId: this.deviceId,
        deviceName,
        fingerprint: this.crypto.fingerprint(encrypted),
        data: encrypted,
      }, null, 2))

      await this.provider.upload(`devices/config-${this.deviceId}.json`, fileContent)

      // 更新元数据
      const updated = this.readSettings() || {}
      updated.cloudSync = updated.cloudSync || {}
      updated.cloudSync.lastSyncAt = new Date().toISOString()
      updated.cloudSync.lastSyncError = null
      this.writeSettings(updated)

      this.logger.info('Push succeeded')
      return { success: true }
    } catch (error) {
      this.logger.error('Push failed:', error)
      const updated = this.readSettings() || {}
      updated.cloudSync = updated.cloudSync || {}
      updated.cloudSync.lastSyncError = error.message
      this.writeSettings(updated)
      return { success: false, error: error.message }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 从云端拉取并合并配置
   * @param {string} password - 同步密码
   * @returns {Promise<{success: boolean, error?: string, mergedFrom?: string[]}>}
   */
  async pull(password) {
    if (!this.provider) throw new Error('SYNC_PROVIDER_REQUIRED')
    if (this.isSyncing) throw new Error('SYNC_IN_PROGRESS')

    this.isSyncing = true
    try {
      const files = await this.provider.list('devices/')
      const configFiles = files.filter(
        (f) => f.name.startsWith('config-') && f.name.endsWith('.json')
      )

      // 下载并解密所有设备配置
      const remoteConfigs = []
      for (const file of configFiles) {
        const content = await this.provider.download(`devices/${file.name}`)
        let parsed
        try {
          parsed = JSON.parse(content.toString('utf8'))
        } catch {
          this.logger.warn(`Invalid JSON in ${file.name}, skipping`)
          continue
        }

        if (parsed.version !== 2) {
          this.logger.warn(`Unsupported version in ${file.name}, skipping`)
          continue
        }

        try {
          const decrypted = this.crypto.decryptSyncData(parsed.data, password)
          remoteConfigs.push({
            deviceId: parsed.deviceId,
            deviceName: parsed.deviceName || '',
            timestamp: parsed.timestamp,
            data: decrypted,
          })
        } catch (err) {
          this.logger.warn(`Decryption failed for ${file.name}: ${err.message}`)
          // 解密本机文件失败 → 密码错误
          if (file.name === `config-${this.deviceId}.json`) {
            throw new Error('SYNC_PASSWORD_INCORRECT')
          }
          // 其他设备文件解密失败（可能是旧密码），跳过
        }
      }

      // 合并
      const settings = this.readSettings() || {}
      this._mergeConfigs(settings, remoteConfigs)
      this.writeSettings(settings)

      // 更新元数据
      settings.cloudSync = settings.cloudSync || {}
      settings.cloudSync.lastSyncAt = new Date().toISOString()
      settings.cloudSync.lastSyncError = null
      this.writeSettings(settings)

      this.logger.info(`Pull succeeded, merged ${remoteConfigs.length} remote config(s)`)
      return {
        success: true,
        mergedFrom: remoteConfigs.map((c) => c.deviceName || c.deviceId),
      }
    } catch (error) {
      this.logger.error('Pull failed:', error)
      const updated = this.readSettings() || {}
      updated.cloudSync = updated.cloudSync || {}
      updated.cloudSync.lastSyncError = error.message
      this.writeSettings(updated)
      return { success: false, error: error.message }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 完整同步：先拉取合并，再推送
   * @param {string} password - 同步密码
   * @returns {Promise<{success: boolean, error?: string, mergedFrom?: string[]}>}
   */
  async sync(password) {
    const pullResult = await this.pull(password)
    if (!pullResult.success) return pullResult
    const pushResult = await this.push(password)
    return {
      success: pushResult.success,
      error: pushResult.error,
      mergedFrom: pullResult.mergedFrom,
    }
  }

  /**
   * 清空云端数据
   */
  async clearCloud() {
    if (!this.provider) throw new Error('SYNC_PROVIDER_REQUIRED')
    const files = await this.provider.list('devices/')
    for (const file of files) {
      if (file.name.startsWith('config-') && file.name.endsWith('.json')) {
        await this.provider.delete(`devices/${file.name}`)
      }
    }
    this.logger.info('Cloud data cleared')
  }

  /**
   * 获取已同步设备列表
   * @returns {Promise<Array<{deviceId: string, deviceName: string, lastModified: string, isSelf: boolean}>>}
   */
  async getDevices() {
    if (!this.provider) return []
    const files = await this.provider.list('devices/')
    const configFiles = files.filter(
      (f) => f.name.startsWith('config-') && f.name.endsWith('.json')
    )

    const devices = []
    for (const file of configFiles) {
      try {
        const content = await this.provider.download(`devices/${file.name}`)
        const parsed = JSON.parse(content.toString('utf8'))
        devices.push({
          deviceId: parsed.deviceId,
          deviceName: parsed.deviceName || '',
          lastModified: parsed.timestamp || file.lastModified,
          isSelf: parsed.deviceId === this.deviceId,
        })
      } catch {
        this.logger.warn(`Failed to read device info from ${file.name}`)
      }
    }
    return devices
  }

  /**
   * 移除指定设备的云端数据
   * @param {string} deviceId
   */
  async removeDevice(deviceId) {
    if (!this.provider) throw new Error('SYNC_PROVIDER_REQUIRED')
    await this.provider.delete(`devices/config-${deviceId}.json`)
    this.logger.info(`Removed device: ${deviceId}`)
  }

  // ─── 私有方法 ───────────────────────────────────

  /**
   * 提取需要同步的数据（不含设备偏好设置）
   * @param {object} settings
   * @returns {object}
   */
  _extractSyncData(settings) {
    return {
      apiProfiles: settings.apiProfiles || {},
      currentApiProfile: settings.currentApiProfile || 'default',
      mcpServers: settings.mcpServers || {},
      apiProfilesOrder: settings.apiProfilesOrder || [],
    }
  }

  /**
   * 增量合并策略：按 profile/server 名称合并
   * 直接修改 localSettings
   * @param {object} localSettings
   * @param {Array} remoteConfigs - [{deviceId, deviceName, timestamp, data}]
   */
  _mergeConfigs(localSettings, remoteConfigs) {
    if (remoteConfigs.length === 0) return

    // 按时间排序，最新的优先
    remoteConfigs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const local = this._extractSyncData(localSettings)

    // 合并 apiProfiles：按 profile 名称
    const mergedProfiles = { ...local.apiProfiles }
    for (const remote of remoteConfigs) {
      for (const [name, profile] of Object.entries(remote.data.apiProfiles || {})) {
        if (!mergedProfiles[name]) {
          // 本地没有 → 直接加入
          mergedProfiles[name] = profile
        } else {
          // 本地有同名 → 远端更新则覆盖
          const remoteTime = new Date(remote.timestamp).getTime()
          const localSyncTime = localSettings.cloudSync?.lastSyncAt
            ? new Date(localSettings.cloudSync.lastSyncAt).getTime()
            : 0
          if (remoteTime > localSyncTime) {
            mergedProfiles[name] = profile
          }
        }
      }
    }

    // 合并 mcpServers：按服务器名称
    const mergedServers = { ...local.mcpServers }
    for (const remote of remoteConfigs) {
      for (const [name, server] of Object.entries(remote.data.mcpServers || {})) {
        if (!mergedServers[name]) {
          mergedServers[name] = server
        } else {
          const remoteTime = new Date(remote.timestamp).getTime()
          const localSyncTime = localSettings.cloudSync?.lastSyncAt
            ? new Date(localSettings.cloudSync.lastSyncAt).getTime()
            : 0
          if (remoteTime > localSyncTime) {
            mergedServers[name] = server
          }
        }
      }
    }

    // 合并 apiProfilesOrder：去重保序
    const mergedOrder = [...(local.apiProfilesOrder || [])]
    for (const remote of remoteConfigs) {
      for (const name of remote.data.apiProfilesOrder || []) {
        if (!mergedOrder.includes(name)) {
          mergedOrder.push(name)
        }
      }
    }

    // currentApiProfile：取最新远程值
    const latestRemote = remoteConfigs[0]
    const mergedCurrent = latestRemote
      ? latestRemote.data.currentApiProfile || local.currentApiProfile
      : local.currentApiProfile

    // 应用合并结果
    localSettings.apiProfiles = mergedProfiles
    localSettings.mcpServers = mergedServers
    localSettings.apiProfilesOrder = mergedOrder
    localSettings.currentApiProfile = mergedCurrent
  }

  /**
   * 获取或创建设备 ID
   * @returns {string} UUID
   */
  _getOrCreateDeviceId() {
    const settings = this.readSettings() || {}
    if (settings.cloudSync?.deviceId) return settings.cloudSync.deviceId
    const id = crypto.randomUUID()
    const updated = this.readSettings() || {}
    updated.cloudSync = updated.cloudSync || {}
    updated.cloudSync.deviceId = id
    this.writeSettings(updated)
    return id
  }
}

module.exports = SyncService
