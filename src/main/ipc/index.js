/**
 * IPC 注册中心
 * 统一注册所有 IPC 处理器
 */

const { ipcMain } = require('electron')
const { registerSettingsIpcHandlers } = require('./settings')
const { registerApiProfilesIpcHandlers } = require('./apiProfiles')
const { registerSkillsIpcHandlers } = require('./skills')
const { registerCommandsIpcHandlers } = require('./commands')
const { registerUpdatesIpcHandlers, setupTranslations: setupUpdateTranslations } = require('./updates')
const { registerDialogsIpcHandlers } = require('./dialogs')
const { registerCloudSyncIpcHandlers } = require('./cloud')

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
      writeSettings(settings)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  console.log('All IPC handlers registered')
}

module.exports = {
  registerIpcHandlers,
}