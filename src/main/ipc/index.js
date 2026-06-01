/**
 * IPC 注册中心
 * 统一注册所有 IPC 处理器
 */

const { ipcMain, shell } = require('electron')
const { registerSettingsIpcHandlers } = require('./settings')
const { registerApiProfilesIpcHandlers } = require('./apiProfiles')
const { registerSkillsIpcHandlers } = require('./skills')
const { registerCommandsIpcHandlers } = require('./commands')
const { registerUpdatesIpcHandlers, setupTranslations: setupUpdateTranslations } = require('./updates')
const { registerDialogsIpcHandlers } = require('./dialogs')
const { registerCloudSyncIpcHandlers } = require('./cloud')
const { registerIflowIpcHandlers } = require('./iflow')
const { registerProjectsIpcHandlers } = require('./projects')
const { createLogger } = require('../utils/logger')
const logger = createLogger('IPC')

/**
 * 注册所有 IPC 处理器
 * @param {Function} getMainWindow - 获取主窗口的函数
 * @param {Function} t - 翻译函数
 */
function registerIpcHandlers(getMainWindow, t) {
  // 设置翻译函数
  setupUpdateTranslations(t)

  // 注册各模块的 IPC 处理器
  registerSettingsIpcHandlers()
  registerApiProfilesIpcHandlers()
  registerSkillsIpcHandlers()
  registerCommandsIpcHandlers()
  registerUpdatesIpcHandlers()
  registerDialogsIpcHandlers()
  registerCloudSyncIpcHandlers()
  registerIflowIpcHandlers()
  registerProjectsIpcHandlers()

  // 窗口控制
  ipcMain.on('window-minimize', () => {
    const { minimize } = require('../window')
    minimize()
  })

  ipcMain.on('window-maximize', () => {
    const { toggleMaximize } = require('../window')
    toggleMaximize()
  })

  ipcMain.on('window-close', () => {
    const { app } = require('electron')
    const { close } = require('../window')
    close(app.isQuitting)
  })

  ipcMain.handle('is-maximized', () => {
    const { isMaximized } = require('../window')
    return isMaximized()
  })

  // 语言切换监听
  ipcMain.on('language-changed', () => {
    const { updateTrayMenu } = require('../tray')
    updateTrayMenu()
  })

  // 翻译数据接收
  ipcMain.on('set-main-translations', (event, translations) => {
    const { updateTranslations } = require('../utils/translations')
    const { updateTrayMenu } = require('../tray')
    updateTranslations(translations)
    updateTrayMenu()
  })

  // 开机自启动
  const { getAutoLaunch, setAutoLaunch } = require('../services/autoLaunchService')
  ipcMain.handle('get-auto-launch', getAutoLaunch)
  ipcMain.handle('set-auto-launch', (event, enabled) => setAutoLaunch(enabled))

  // 自动更新设置
  const { readSettings, writeSettings } = require('../services/configService')

  ipcMain.handle('get-auto-update', async () => {
    try {
      const settings = readSettings()
      const autoUpdate = settings?.autoUpdate !== undefined ? settings.autoUpdate : true
      return { success: true, enabled: autoUpdate }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('set-auto-update', async (event, enabled) => {
    try {
      const settings = readSettings() || {}
      settings.autoUpdate = enabled
      await writeSettings(settings)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 外部链接：在系统浏览器中打开（仅允许 http/https 协议）
  ipcMain.handle('open-external', async (event, url) => {
    try {
      if (typeof url !== 'string' || !(/^https?:\/\//i.test(url))) {
        return { success: false, error: 'Only http:// and https:// URLs are allowed' }
      }
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 本地路径：在系统文件管理器中打开目录
  ipcMain.handle('open-path', async (event, filePath) => {
    try {
      if (typeof filePath !== 'string') {
        return { success: false, error: 'Invalid path' }
      }
      await shell.openPath(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 日志管理
  ipcMain.handle('get-log-dir', async () => {
    try {
      const path = require('path')
      const fs = require('fs')
      const { log } = require('../utils/logger')
      const logDir = path.dirname(log.transports.file.getFile().path)
      let totalSize = 0
      let fileCount = 0
      try {
        const files = fs.readdirSync(logDir)
        for (const file of files) {
          try {
            const stat = fs.statSync(path.join(logDir, file))
            if (stat.isFile()) {
              totalSize += stat.size
              fileCount++
            }
          } catch (_) {}
        }
      } catch (_) {}
      return { success: true, path: logDir, totalSize, fileCount }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('clear-logs', async () => {
    try {
      const path = require('path')
      const fs = require('fs')
      const { log } = require('../utils/logger')
      const logDir = path.dirname(log.transports.file.getFile().path)
      const currentLogFile = log.transports.file.getFile().path
      let clearedSize = 0
      let clearedCount = 0
      try {
        const files = fs.readdirSync(logDir)
        for (const file of files) {
          const filePath = path.join(logDir, file)
          try {
            const stat = fs.statSync(filePath)
            if (stat.isFile() && filePath !== currentLogFile) {
              clearedSize += stat.size
              clearedCount++
              fs.unlinkSync(filePath)
            }
          } catch (_) {}
        }
        // 裁剪当前日志文件（清空内容但保留文件）
        try {
          fs.writeFileSync(currentLogFile, '')
          clearedSize += fs.statSync(currentLogFile).size
        } catch (_) {}
      } catch (_) {}
      logger.info(`Logs cleared: ${clearedCount} files, ${clearedSize} bytes freed`)
      return { success: true, clearedSize, clearedCount }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 日志级别管理
  ipcMain.handle('get-log-level', async () => {
    try {
      const settings = readSettings()
      const level = settings?.logLevel || 'info'
      return { success: true, level }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('set-log-level', async (event, level) => {
    try {
      const validLevels = ['info', 'debug', 'silent']
      if (!validLevels.includes(level)) {
        return { success: false, error: `Invalid log level: ${level}` }
      }
      // 保存到 settings.json
      const settings = readSettings() || {}
      settings.logLevel = level
      await writeSettings(settings)
      // 实时更新 electron-log 的 transport level
      const { log } = require('../utils/logger')
      if (level === 'silent') {
        log.transports.file.level = false
        log.transports.console.level = false
      } else {
        log.transports.file.level = level
        log.transports.console.level = level
      }
      logger.info(`Log level changed to: ${level}`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  logger.info('All IPC handlers registered')
}

module.exports = {
  registerIpcHandlers,
}