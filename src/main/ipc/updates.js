/**
 * 更新相关 IPC 处理器
 * 使用 electron-updater 实现差分更新
 */

const { ipcMain, app, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { createLogger } = require('../utils/logger')
const logger = createLogger('UpdateIPC')

// 导入 autoUpdater 模块
const autoUpdater = require('../autoUpdater')

// 翻译函数
let t = key => key

/**
 * 设置翻译函数
 * @param {Function} translateFn
 */
function setupTranslations(translateFn) {
  if (translateFn) {
    t = translateFn
    autoUpdater.setupTranslations(translateFn)
  }
}

/**
 * 持久化待安装更新信息到 settings.json
 * @param {Object} pendingInfo - { version, downloadPath, downloadName }
 */
async function savePendingUpdate(pendingInfo) {
  try {
    const { readSettings, writeSettings } = require('../services/configService')
    const settings = readSettings() || {}
    settings.pendingUpdate = pendingInfo
    await writeSettings(settings)
  } catch (e) {
    logger.error('Failed to save pending update:', e)
  }
}

/**
 * 清除持久化的待安装更新信息
 */
async function clearPendingUpdate() {
  try {
    const { readSettings, writeSettings } = require('../services/configService')
    const settings = readSettings() || {}
    delete settings.pendingUpdate
    await writeSettings(settings)
  } catch (e) {
    logger.error('Failed to clear pending update:', e)
  }
}

/**
 * 读取持久化的待安装更新信息
 * @returns {Object|null}
 */
function readPendingUpdate() {
  try {
    const { readSettings } = require('../services/configService')
    const settings = readSettings()
    return settings?.pendingUpdate || null
  } catch (e) {
    return null
  }
}

/**
 * 获取主窗口引用
 */
function getMainWindowRef() {
  const { getMainWindow } = require('../window')
  return getMainWindow()
}

/**
 * 注册更新相关的 IPC 处理器
 */
function registerUpdatesIpcHandlers() {
  // 检查更新
  ipcMain.handle('check-for-updates', async () => {
    logger.info('check-for-updates invoked')
    try {
      const result = await autoUpdater.checkForUpdates()
      return result
    } catch (error) {
      logger.error('check-for-updates error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  })

  // 下载更新（前台）
  ipcMain.handle('download-update', async () => {
    logger.info('download-update invoked')
    try {
      const result = await autoUpdater.downloadUpdate()
      
      if (result.success && result.downloadPath) {
        // 持久化待安装更新信息
        const state = autoUpdater.getUpdateState()
        await savePendingUpdate({
          version: state.info?.version,
          downloadPath: result.downloadPath,
          downloadName: path.basename(result.downloadPath),
        })
      }
      
      return result
    } catch (error) {
      logger.error('download-update error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  })

  // 后台下载更新（静默模式）
  ipcMain.handle('download-update-background', async () => {
    logger.info('download-update-background invoked')
    try {
      const result = await autoUpdater.downloadUpdateBackground()
      
      if (result.success && result.downloadPath) {
        // 持久化待安装更新信息
        const state = autoUpdater.getUpdateState()
        await savePendingUpdate({
          version: state.info?.version,
          downloadPath: result.downloadPath,
          downloadName: path.basename(result.downloadPath),
        })

        // 发送后台下载完成事件
        const mainWindow = getMainWindowRef()
        if (mainWindow) {
          mainWindow.webContents.send('update-background-complete', {
            version: state.info?.version,
            downloadPath: result.downloadPath,
          })
        }
      }
      
      return result
    } catch (error) {
      logger.error('download-update-background error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  })

  // 取消下载
  ipcMain.handle('cancel-download', async () => {
    logger.info('cancel-download invoked')
    try {
      return await autoUpdater.cancelDownload()
    } catch (error) {
      logger.error('cancel-download error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  })

  // 安装更新
  ipcMain.handle('install-update', async () => {
    logger.info('install-update invoked')
    try {
      // 清除持久化的待安装更新
      await clearPendingUpdate()
      
      return await autoUpdater.installUpdate()
    } catch (error) {
      logger.error('install-update error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  })

  // 获取更新状态
  ipcMain.handle('get-update-status', () => {
    return autoUpdater.getUpdateState()
  })

  // 获取当前版本
  ipcMain.handle('get-app-version', () => {
    return autoUpdater.getAppVersion()
  })

  // 打开 release 页面
  ipcMain.handle('open-release-page', async () => {
    try {
      const state = autoUpdater.getUpdateState()
      if (state.info?.releaseUrl) {
        await shell.openExternal(state.info.releaseUrl)
        return { success: true }
      }
      return { success: false, error: t('update.error.noReleaseUrl') }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 获取待安装更新信息
  ipcMain.handle('get-pending-update', async () => {
    const pending = readPendingUpdate()
    if (!pending) {
      return { success: true, pending: null }
    }
    // 检查下载文件是否还存在
    if (pending.downloadPath && !fs.existsSync(pending.downloadPath)) {
      await clearPendingUpdate()
      return { success: true, pending: null }
    }
    return { success: true, pending }
  })

  // 清除待安装更新
  ipcMain.handle('clear-pending-update', async () => {
    await clearPendingUpdate()
    return { success: true }
  })

  // 恢复待安装更新状态（启动时调用）
  ipcMain.handle('restore-pending-update', async () => {
    const pending = readPendingUpdate()
    if (!pending) {
      return { success: true, restored: false }
    }
    
    // 检查下载文件是否还存在
    if (pending.downloadPath && !fs.existsSync(pending.downloadPath)) {
      await clearPendingUpdate()
      return { success: true, restored: false }
    }
    
    // 恢复更新状态
    const mainWindow = getMainWindowRef()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-status-changed', {
        status: 'downloaded',
        info: {
          version: pending.version,
          downloadName: pending.downloadName || 'update.exe',
        },
        progress: 100,
        error: null,
        downloadPath: pending.downloadPath,
        isBackground: false,
      })
    }
    
    return { success: true, restored: true, pending }
  })

  // 获取更新历史
  ipcMain.handle('get-update-history', async () => {
    try {
      const { readSettings } = require('../services/configService')
      const settings = readSettings()
      const history = settings?.updateHistory || []
      return { success: true, history }
    } catch (error) {
      return { success: false, error: error.message, history: [] }
    }
  })

  // 保存更新历史
  ipcMain.handle('save-update-history', async (event, history) => {
    try {
      const { readSettings, writeSettings } = require('../services/configService')
      const settings = readSettings() || {}
      settings.updateHistory = history
      await writeSettings(settings)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerUpdatesIpcHandlers,
  setupTranslations,
}