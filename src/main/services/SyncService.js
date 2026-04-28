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
function _getDefaultSafeStorage() {
  const { safeStorage } = require('electron')
  return safeStorage
}

class SyncService {
  /**
   * @param {object} [deps] - 依赖注入（测试时使用）
   * @param {Function} [deps.readSettings] - 读取设置
   * @param {Function} [deps.writeSettings] - 写入设置
   * @param {object} [deps.logger] - 日志记录器 { info, warn, error }
   * @param {object} [deps.safeStorage] - Electron safeStorage（加解密持久化密码）
   */
  constructor(deps = {}) {
    this.crypto = new CryptoManager()
    this.provider = null
    // L-4：isSyncing 仍作为「状态快照」对外暴露，但真正的互斥由
    // _currentSyncPromise 单一来源保证；任意时刻最多只有一个同步任务在跑。
    this.isSyncing = false
    this._currentSyncPromise = null

    // L-10：订阅 isSyncing 变化，IPC 层据此推送 cloud-sync:status-changed
    // 让渲染端不再依赖各处轮询 / 自行 set isSyncing，消除 desync。
    this._syncingChangedListeners = []

    // 依赖注入：测试时传入 mock，生产时按需加载真实模块
    this._readSettings = deps.readSettings || null
    this._writeSettings = deps.writeSettings || null
    this._logger = deps.logger || null
    this._safeStorage = deps.safeStorage || null

    this._deviceId = null

    // 自动同步相关
    this._autoSyncTimer = null
    this._autoSyncInterval = 5 * 60 * 1000 // 默认 5 分钟
    this._cachedPassword = null // 缓存同步密码（仅内存）
    this._settingsSaveDebounceTimer = null
    this._settingsSaveDebounceDelay = 3000 // 设置保存后 3 秒触发自动推送
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

  /** 懒加载 safeStorage */
  get safeStorage() {
    if (!this._safeStorage) this._safeStorage = _getDefaultSafeStorage()
    return this._safeStorage
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
   * L-4：以 promise 为单一来源的并发锁
   *
   * 任意时刻只允许一个同步任务在跑：若 `_currentSyncPromise` 已存在，
   * 立刻抛出 `SYNC_IN_PROGRESS`（与原 `isSyncing` 检查的对外契约保持一致），
   * 调用方可决定是否等待 / 重试 / 提示用户。
   *
   * 与单纯置位 `this.isSyncing = true` 相比，本实现保证：
   *   1. 同步进入闭包之前先建立锁，避免 `await this.provider.list(...)`
   *      让出后的极小窗口内被另一个调用抢入；
   *   2. `isSyncing` 与 `_currentSyncPromise` 的设置/释放在 try/finally
   *      中成对出现，不会因异常路径漏置 false。
   *
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async _runExclusive(fn) {
    if (this._currentSyncPromise) {
      throw new Error('SYNC_IN_PROGRESS')
    }
    this.isSyncing = true
    this._emitSyncingChanged(true)
    const promise = (async () => {
      try {
        return await fn()
      } finally {
        this.isSyncing = false
        this._currentSyncPromise = null
        this._emitSyncingChanged(false)
      }
    })()
    this._currentSyncPromise = promise
    return promise
  }

  /**
   * L-10：注册 isSyncing 变化监听器
   * @param {(isSyncing: boolean) => void} callback
   * @returns {() => void} 取消订阅函数
   */
  onSyncingChanged(callback) {
    if (typeof callback !== 'function') return () => {}
    this._syncingChangedListeners.push(callback)
    return () => {
      const idx = this._syncingChangedListeners.indexOf(callback)
      if (idx >= 0) this._syncingChangedListeners.splice(idx, 1)
    }
  }

  /** L-10：触发 isSyncing 监听器，单个监听器异常不影响其他 */
  _emitSyncingChanged(isSyncing) {
    for (const cb of this._syncingChangedListeners) {
      try {
        cb(isSyncing)
      } catch (err) {
        this.logger.warn('syncing-changed listener threw:', err && err.message ? err.message : err)
      }
    }
  }

  /**
   * 缓存同步密码（用于自动同步）
   * 默认仅缓存到内存。仅当显式 `options.persist === true` 时才会用 safeStorage
   * 加密后持久化到设置文件（用于自动同步在重启后恢复）。
   *
   * 安全考虑（M-1）：默认不持久化是为了：
   *   1. Linux 下 safeStorage 行为依赖桌面环境，可能 fallback 到弱加密；
   *   2. 持久化文件被备份/泄漏后，攻击者只要拿到当前用户登录态即可解密；
   *   3. 用户对"密码是否被持久化"应有显式控制权（UI 开关 rememberSyncPassword）。
   *
   * @param {string} password
   * @param {object} [options]
   * @param {boolean} [options.persist=false] - 是否持久化加密密码
   */
  cachePassword(password, options = {}) {
    this._cachedPassword = password
    // 默认不持久化；调用方需根据用户设置（如 rememberSyncPassword）显式传 persist:true
    const shouldPersist = options.persist === true
    if (shouldPersist && password) {
      this._persistEncryptedPassword(password)
    }
  }

  /** 清除缓存的密码，同时清除持久化的加密密码 */
  clearCachedPassword() {
    this._cachedPassword = null
    this._clearPersistedPassword()
  }

  /**
   * 是否当前有内存缓存的同步密码（L-9：替代外部读取 _cachedPassword）
   * @returns {boolean}
   */
  hasCachedPassword() {
    return !!this._cachedPassword
  }

  /**
   * 将当前内存缓存的密码持久化到加密存储（L-9：替代外部读取 _cachedPassword 后回调 cachePassword）
   * 仅当存在缓存时才执行；否则静默返回 false。
   * @returns {boolean} 是否触发了持久化
   */
  persistCachedPassword() {
    if (!this._cachedPassword) return false
    this._persistEncryptedPassword(this._cachedPassword)
    return true
  }

  /**
   * 清除磁盘上持久化的加密密码（保留内存缓存）
   * L-9：暴露公共方法，避免外部访问下划线开头的私有清理函数。
   */
  clearPersistedPassword() {
    this._clearPersistedPassword()
  }

  /**
   * 将密码加密后持久化到设置文件
   * 使用 Electron safeStorage（操作系统级加密，Windows DPAPI / macOS Keychain）
   * @param {string} password
   */
  _persistEncryptedPassword(password) {
    try {
      if (!this.safeStorage.isEncryptionAvailable()) {
        this.logger.warn('safeStorage encryption not available, cannot persist password')
        return
      }
      const encrypted = this.safeStorage.encryptString(password)
      const settings = this.readSettings() || {}
      settings.cloudSync = settings.cloudSync || {}
      settings.cloudSync.autoSyncEncryptedPassword = encrypted.toString('base64')
      this.writeSettings(settings)
      this.logger.info('Auto-sync password persisted (encrypted)')
    } catch (err) {
      this.logger.error('Failed to persist auto-sync password:', err)
    }
  }

  /** 清除设置文件中持久化的加密密码 */
  _clearPersistedPassword() {
    try {
      const settings = this.readSettings() || {}
      if (settings.cloudSync?.autoSyncEncryptedPassword) {
        delete settings.cloudSync.autoSyncEncryptedPassword
        this.writeSettings(settings)
      }
    } catch (err) {
      this.logger.error('Failed to clear persisted password:', err)
    }
  }

  /**
   * 从设置文件恢复持久化的密码到内存缓存
   * 应用启动时调用，确保自动同步重启后仍能工作
   *
   * M-6：解密失败时仅打 warn，不再静默删除持久化数据。
   * 系统重装、用户切换、safeStorage 主密钥变化等场景下解密失败属正常，
   * 但持久化字段仍可能在原系统/原用户下有效，删除是不可逆操作；
   * 改为保留字段，由用户重新输入密码后通过 cachePassword({persist:true})
   * 自然覆写，或通过显式 set-remember-password(false) 主动清除。
   */
  restorePersistedPassword() {
    if (this._cachedPassword) return // 已有内存缓存
    try {
      const settings = this.readSettings() || {}
      const encryptedB64 = settings.cloudSync?.autoSyncEncryptedPassword
      if (!encryptedB64) return
      if (!this.safeStorage.isEncryptionAvailable()) {
        this.logger.warn('safeStorage not available, cannot restore persisted password')
        return
      }
      const encrypted = Buffer.from(encryptedB64, 'base64')
      this._cachedPassword = this.safeStorage.decryptString(encrypted)
      this.logger.info('Auto-sync password restored from persistent storage')
    } catch (err) {
      // M-6：仅 warn，不删除持久化字段
      this.logger.warn(
        'Failed to decrypt persisted sync password (left intact, will require manual re-entry):',
        err && err.message ? err.message : err
      )
    }
  }

  /**
   * 启动自动同步定时器
   * @param {object} [options]
   * @param {number} [options.interval] - 同步间隔（毫秒），默认 5 分钟
   */
  startAutoSync(options = {}) {
    this.stopAutoSync()
    if (options.interval) this._autoSyncInterval = options.interval

    // 尝试恢复持久化的密码
    if (!this._cachedPassword) {
      this.restorePersistedPassword()
    }

    this._autoSyncTimer = setInterval(() => {
      this._doAutoSync()
    }, this._autoSyncInterval)

    // 启动后立即触发一次同步
    this._doAutoSync()

    this.logger.info(`Auto-sync started (interval: ${this._autoSyncInterval / 1000}s)`)
  }

  /** 停止自动同步定时器 */
  stopAutoSync() {
    if (this._autoSyncTimer) {
      clearInterval(this._autoSyncTimer)
      this._autoSyncTimer = null
      this.logger.info('Auto-sync stopped')
    }
  }

  /**
   * 设置保存后触发自动同步（防抖）
   * auto-sync 状态由渲染进程通过 localStorage 管理，主进程只负责在设置保存时触发同步
   */
  onSettingsSaved() {
    // 不再检查 cs.enabled/cs.autoSyncEnabled（这些值已不在 settings.json 中）
    // _doAutoSync() 已检查 provider 和 password，确保已配置才会同步
    if (!this.provider || !this._cachedPassword) {
      return
    }

    if (this.isSyncing) return

    // 防抖：3 秒内多次保存只触发一次
    if (this._settingsSaveDebounceTimer) {
      clearTimeout(this._settingsSaveDebounceTimer)
    }
    this._settingsSaveDebounceTimer = setTimeout(() => {
      this._settingsSaveDebounceTimer = null
      this._doAutoSync()
    }, this._settingsSaveDebounceDelay)
  }

  /**
   * 执行自动同步（内部方法）
   * 需要缓存的密码才能执行
   */
  async _doAutoSync() {
    if (this.isSyncing || !this.provider) return

    if (!this._cachedPassword) {
      this.logger.warn('Auto-sync skipped: no cached password')
      return
    }

    this.logger.info('Auto-sync triggered')
    try {
      const result = await this.sync(this._cachedPassword)
      if (result.success) {
        this.logger.info('Auto-sync succeeded')
      } else {
        this.logger.warn('Auto-sync failed:', result.error)
      }
    } catch (error) {
      this.logger.error('Auto-sync error:', error)
    }
  }

  /**
   * 获取同步状态
   * @returns {object}
   */
  getStatus() {
    const settings = this.readSettings() || {}
    const cs = settings.cloudSync || {}
    return {
      // enabled 和 autoSyncEnabled 已移除，由渲染进程通过 localStorage 管理
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

    return this._runExclusive(async () => {
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
      }
    })
  }

  /**
   * 从云端拉取并合并配置
   * @param {string} password - 同步密码
   * @returns {Promise<{success: boolean, error?: string, mergedFrom?: string[]}>}
   */
  async pull(password) {
    if (!this.provider) throw new Error('SYNC_PROVIDER_REQUIRED')

    return this._runExclusive(async () => {
      try {
        const files = await this.provider.list('devices/')
        const configFiles = files.filter(
          (f) => f.name.startsWith('config-') && f.name.endsWith('.json')
        )

        // 下载并解密所有设备配置
        const remoteConfigs = []
        let decryptFailures = 0
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
            decryptFailures += 1
            // 解密本机文件失败 → 密码确定错误（最强信号）
            if (file.name === `config-${this.deviceId}.json`) {
              throw new Error('SYNC_PASSWORD_INCORRECT')
            }
            // 其他设备文件解密失败暂不抛错，留待后续统一判定
          }
        }

        // 远端确有 config 文件但全部解密失败：
        // - 用户可能从未在本机推送过 → 没有本机文件命中上面的强判定
        // - 但所有其他设备文件都解不开几乎必然是密码错（旧密码场景极少全部命中）
        // 抛出 SYNC_PASSWORD_LIKELY_INCORRECT，让 UI 明确提示"密码可能错误"
        if (remoteConfigs.length === 0 && decryptFailures > 0) {
          throw new Error('SYNC_PASSWORD_LIKELY_INCORRECT')
        }

        // 合并
        const settings = this.readSettings() || {}
        this._mergeConfigs(settings, remoteConfigs)

        // 更新元数据并一次性落盘（H-4：合并原本相邻的两次 writeSettings）
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
      }
    })
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
      // pull 成功时合并已完成，mergedFrom 反映实际合并的设备数
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
    // 不再在这里为 item 添加 _lastModified，避免影响合并比较
    return {
      apiProfiles: settings.apiProfiles || {},
      currentApiProfile: settings.currentApiProfile || 'default',
      mcpServers: settings.mcpServers || {},
      apiProfilesOrder: settings.apiProfilesOrder || [],
      // tombstone 一并上传，让其他设备据此物理删除已删条目
      _deletedProfiles: settings._deletedProfiles || {},
      _deletedServers: settings._deletedServers || {},
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

    // 用于比较的本地时间参考：如果 item 没有 _lastModified，使用 lastSyncAt（上次已知同步时间）
    const lastSyncAt = localSettings.cloudSync?.lastSyncAt
      ? new Date(localSettings.cloudSync.lastSyncAt).getTime()
      : 0

    // ─── 合并 tombstone（取每个 name 的最新 deletedAt） ──
    const mergedDeletedProfiles = { ...(local._deletedProfiles || {}) }
    const mergedDeletedServers = { ...(local._deletedServers || {}) }
    const _mergeTombstoneBucket = (target, incoming) => {
      if (!incoming || typeof incoming !== 'object') return
      for (const [name, entry] of Object.entries(incoming)) {
        if (!entry || !entry.deletedAt) continue
        const t = new Date(entry.deletedAt).getTime()
        if (Number.isNaN(t)) continue
        const existing = target[name]
        const existingT = existing && existing.deletedAt ? new Date(existing.deletedAt).getTime() : 0
        if (t > existingT) target[name] = { deletedAt: entry.deletedAt }
      }
    }
    for (const remote of remoteConfigs) {
      _mergeTombstoneBucket(mergedDeletedProfiles, remote.data._deletedProfiles)
      _mergeTombstoneBucket(mergedDeletedServers, remote.data._deletedServers)
    }

    const _profileTombT = (name) => {
      const t = mergedDeletedProfiles[name]
      return t && t.deletedAt ? new Date(t.deletedAt).getTime() : 0
    }
    const _serverTombT = (name) => {
      const t = mergedDeletedServers[name]
      return t && t.deletedAt ? new Date(t.deletedAt).getTime() : 0
    }

    // 合并 apiProfiles：按 profile 名称，比较 per-item _lastModified
    const mergedProfiles = { ...local.apiProfiles }
    for (const remote of remoteConfigs) {
      for (const [name, profile] of Object.entries(remote.data.apiProfiles || {})) {
        const remoteItemTime = profile._lastModified
          ? new Date(profile._lastModified).getTime()
          : 0
        // 远端条目若被 tombstone 覆盖（删除晚于其修改时间），跳过该条目
        if (_profileTombT(name) >= remoteItemTime && _profileTombT(name) > 0) {
          continue
        }
        if (!mergedProfiles[name]) {
          // 本地没有 → 直接加入
          mergedProfiles[name] = profile
        } else {
          // 本地时间：使用 item 的 _lastModified，如果没有则用 lastSyncAt
          const localItemTime = mergedProfiles[name]._lastModified
            ? new Date(mergedProfiles[name]._lastModified).getTime()
            : lastSyncAt
          if (remoteItemTime > localItemTime) {
            mergedProfiles[name] = profile
          }
        }
      }
    }
    // 应用 tombstone：本地条目若 _lastModified <= deletedAt 则物理删除
    for (const name of Object.keys(mergedProfiles)) {
      const tombT = _profileTombT(name)
      if (tombT === 0) continue
      const itemT = mergedProfiles[name]._lastModified
        ? new Date(mergedProfiles[name]._lastModified).getTime()
        : 0
      if (itemT <= tombT) delete mergedProfiles[name]
    }

    // 合并 mcpServers：按服务器名称，比较 per-item _lastModified
    const mergedServers = { ...local.mcpServers }
    for (const remote of remoteConfigs) {
      for (const [name, server] of Object.entries(remote.data.mcpServers || {})) {
        const remoteItemTime = server._lastModified
          ? new Date(server._lastModified).getTime()
          : 0
        if (_serverTombT(name) >= remoteItemTime && _serverTombT(name) > 0) {
          continue
        }
        if (!mergedServers[name]) {
          mergedServers[name] = server
        } else {
          const localItemTime = mergedServers[name]._lastModified
            ? new Date(mergedServers[name]._lastModified).getTime()
            : lastSyncAt
          if (remoteItemTime > localItemTime) {
            mergedServers[name] = server
          }
        }
      }
    }
    for (const name of Object.keys(mergedServers)) {
      const tombT = _serverTombT(name)
      if (tombT === 0) continue
      const itemT = mergedServers[name]._lastModified
        ? new Date(mergedServers[name]._lastModified).getTime()
        : 0
      if (itemT <= tombT) delete mergedServers[name]
    }

    // 合并 apiProfilesOrder：去重保序，并剔除已被 tombstone 显式删除的条目
    const mergedOrder = []
    const _seenOrder = new Set()
    const _pushOrder = (name) => {
      if (_seenOrder.has(name)) return
      if (_profileTombT(name) > 0) return // 被 tombstone 显式删除
      _seenOrder.add(name)
      mergedOrder.push(name)
    }
    for (const name of (local.apiProfilesOrder || [])) _pushOrder(name)
    for (const remote of remoteConfigs) {
      for (const name of (remote.data.apiProfilesOrder || [])) _pushOrder(name)
    }

    // currentApiProfile：取最新远程值；若被 tombstone 显式删除则回退到 default 或任一存活 profile
    const latestRemote = remoteConfigs[0]
    let mergedCurrent = latestRemote
      ? latestRemote.data.currentApiProfile || local.currentApiProfile
      : local.currentApiProfile
    if (mergedCurrent && _profileTombT(mergedCurrent) > 0) {
      if ('default' in mergedProfiles) {
        mergedCurrent = 'default'
      } else {
        const survivors = Object.keys(mergedProfiles)
        mergedCurrent = survivors[0] || 'default'
      }
    }

    // 应用合并结果
    localSettings.apiProfiles = mergedProfiles
    localSettings.mcpServers = mergedServers
    localSettings.apiProfilesOrder = mergedOrder
    localSettings.currentApiProfile = mergedCurrent
    localSettings._deletedProfiles = mergedDeletedProfiles
    localSettings._deletedServers = mergedDeletedServers

    // 清理超过保留期的墓碑，避免无限增长
    try {
      const { pruneOldTombstones } = require('../services/configService')
      pruneOldTombstones(localSettings)
    } catch (_) {
      // 测试环境可能未注入 configService，忽略
    }

    // 同步顶层 API 字段：确保当前配置的顶层快捷字段与 apiProfiles 中一致
    // 否则 switch-api-profile 的 extractApiConfig 会用旧的顶层字段覆盖已合并的数据
    const currentProfile = mergedProfiles[mergedCurrent]
    if (currentProfile) {
      const API_FIELDS = require('../constants').API_FIELDS
      for (const field of API_FIELDS) {
        if (currentProfile[field] !== undefined) {
          localSettings[field] = currentProfile[field]
        }
      }
    }
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
