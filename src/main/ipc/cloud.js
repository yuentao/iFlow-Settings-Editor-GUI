/**
 * 云同步 IPC 处理器
 * 处理云同步相关的 IPC 通信
 */

const { ipcMain, BrowserWindow } = require('electron')
const crypto = require('crypto')
const { wrapIpcHandler } = require('../utils/errors')
const SyncService = require('../services/SyncService')
const CryptoManager = require('../crypto/CryptoManager')
const WebDAVProvider = require('../services/cloud/WebDAVProvider')
const { readSettings, writeSettings } = require('../services/configService')
const { createLogger } = require('../utils/logger')

const logger = createLogger('CloudSync')
const syncService = new SyncService()
const cryptoMgr = new CryptoManager()

/**
 * L-10：把最新同步状态广播到所有渲染窗口
 * 渲染端通过 onCloudSyncStatusChanged 订阅，确保 isSyncing 等字段
 * 始终以主进程 SyncService 为单一来源，消除两端 desync。
 */
function broadcastSyncStatus() {
  const status = { success: true, ...syncService.getStatus() }
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    try {
      win.webContents.send('cloud-sync:status-changed', status)
    } catch (err) {
      logger.warn('Failed to broadcast cloud-sync:status-changed:', err && err.message ? err.message : err)
    }
  }
}

// L-10：每次 isSyncing 翻转都广播一次最新状态
syncService.onSyncingChanged(() => broadcastSyncStatus())

/**
 * 根据设置中的 provider 配置初始化云存储适配器
 */
function initProvider() {
  const settings = readSettings() || {}
  const cs = settings.cloudSync || {}
  if (!cs.provider || !cs.providerConfig) {
    syncService.setProvider(null)
    return
  }

  if (cs.provider === 'webdav') {
    try {
      const provider = new WebDAVProvider(cs.providerConfig)
      syncService.setProvider(provider)
    } catch (err) {
      logger.error('Failed to init WebDAV provider', err)
      syncService.setProvider(null)
    }
  }
  // OneDrive / Dropbox 适配器在此扩展
}

// 应用启动时初始化 provider（providerConfig 仍从 settings.json 读取）
initProvider()

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
  syncService.cachePassword(password, { persist: readRememberPassword() })
}

/**
 * 注册云同步 IPC 处理器
 */
function registerCloudSyncIpcHandlers() {
  // ====== 同步状态 ======

  ipcMain.handle('cloud-sync:get-status', wrapIpcHandler(async () => {
    return { success: true, ...syncService.getStatus() }
  }, 'cloud-sync:get-status'))

  ipcMain.handle('cloud-sync:set-auto-sync', wrapIpcHandler(async (_event, enabled) => {
    // autoSyncEnabled 由渲染进程通过 localStorage 持久化
    if (!enabled) {
      syncService.stopAutoSync()
      syncService.clearCachedPassword()
    } else {
      syncService.startAutoSync()
    }
    return { success: true }
  }, 'cloud-sync:set-auto-sync'))

  // ====== 云服务配置 ======

  ipcMain.handle('cloud-sync:configure-provider', wrapIpcHandler(async (_event, provider, config) => {
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.provider = provider
    settings.cloudSync.providerConfig = config
    writeSettings(settings)
    initProvider()
    // 不再调用 autoSyncManager.refresh()，自动同步状态由渲染进程通过 localStorage 管理
    return { success: true }
  }, 'cloud-sync:configure-provider'))

  ipcMain.handle('cloud-sync:test-connection', wrapIpcHandler(async () => {
    if (!syncService.provider) {
      return { success: false, error: 'SYNC_PROVIDER_REQUIRED' }
    }
    const authorized = await syncService.provider.isAuthorized()
    return { success: true, authorized }
  }, 'cloud-sync:test-connection'))

  ipcMain.handle('cloud-sync:revoke-auth', wrapIpcHandler(async () => {
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    delete settings.cloudSync.providerConfig
    writeSettings(settings)
    syncService.setProvider(null)
    syncService.clearCachedPassword()
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
    writeSettings(settings)

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
    writeSettings(settings)

    // 缓存新密码（持久化与否由 rememberSyncPassword 开关决定，M-1）
    cachePasswordWithSettings(newPassword)

    // 主动用新密码重新推送本机配置：
    // - 旧文件由旧密码加密，新密码解不开 → 后续 pull 会抛 SYNC_PASSWORD_INCORRECT
    // - 在此立刻覆写本机 config-{deviceId}.json，保证本机文件与新密码匹配
    // - 其他设备的文件仍由旧密码加密，需要在那些设备上分别用新密码重新 push
    let repushed = false
    let repushError = null
    if (syncService.provider) {
      try {
        const pushResult = await syncService.push(newPassword)
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
    return { success: true, hasCachedPassword: syncService.hasCachedPassword() }
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
    writeSettings(settings)

    if (enabled) {
      // 用户明确启用：若当前内存中有密码则立即持久化
      syncService.persistCachedPassword()
    } else {
      // 用户关闭：清理任何已持久化的加密密码（内存缓存保留至会话结束）
      syncService.clearPersistedPassword()
    }
    return { success: true, remember: enabled }
  }, 'cloud-sync:set-remember-password'))

  // ====== 同步操作 ======

  ipcMain.handle('cloud-sync:sync-now', wrapIpcHandler(async (_event, password) => {
    // 缓存密码供自动同步使用（持久化与否由 rememberSyncPassword 开关决定，M-1）
    if (password) cachePasswordWithSettings(password)
    return syncService.sync(password)
  }, 'cloud-sync:sync-now'))

  ipcMain.handle('cloud-sync:pull', wrapIpcHandler(async (_event, password) => {
    return syncService.pull(password)
  }, 'cloud-sync:pull'))

  ipcMain.handle('cloud-sync:push', wrapIpcHandler(async (_event, password) => {
    return syncService.push(password)
  }, 'cloud-sync:push'))

  ipcMain.handle('cloud-sync:clear-cloud', wrapIpcHandler(async () => {
    await syncService.clearCloud()
    syncService.clearCachedPassword()

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
      if (cleared) writeSettings(settings)
    }

    return { success: true, cleared }
  }, 'cloud-sync:clear-cloud'))

  // ====== 设备管理 ======

  ipcMain.handle('cloud-sync:get-devices', wrapIpcHandler(async () => {
    const devices = await syncService.getDevices()
    return { success: true, devices }
  }, 'cloud-sync:get-devices'))

  ipcMain.handle('cloud-sync:set-device-name', wrapIpcHandler(async (_event, name) => {
    const settings = readSettings() || {}
    settings.cloudSync = settings.cloudSync || {}
    settings.cloudSync.deviceName = name
    writeSettings(settings)
    return { success: true }
  }, 'cloud-sync:set-device-name'))

  ipcMain.handle('cloud-sync:remove-device', wrapIpcHandler(async (_event, deviceId) => {
    await syncService.removeDevice(deviceId)
    return { success: true }
  }, 'cloud-sync:remove-device'))

  logger.info('Cloud sync IPC handlers registered')
}

module.exports = {
  registerCloudSyncIpcHandlers,
  syncService,
  initProvider,
}
