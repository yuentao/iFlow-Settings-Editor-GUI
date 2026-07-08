/**
 * 开机自启服务模块
 * 负责管理开机自启动设置
 */

const { app } = require('electron')
const { readSettings, writeSettings } = require('./configService')

/**
 * 获取当前开机自启动设置
 * @returns {boolean}
 */
function getAutoLaunchSettings() {
  const settings = readSettings()
  return settings?.autoLaunch ?? false
}

/**
 * 设置开机自启动
 * @param {boolean} enabled - 是否启用
 */
async function setAutoLaunchEnabled(enabled) {
  // 便携模式下不允许设置开机自启
  if (process.env.PORTABLE_EXECUTABLE_DIR) return

  const settings = readSettings() || {}
  settings.autoLaunch = enabled
  await writeSettings(settings)

  // 设置 Electron 的自启动
  if (app.isReady()) {
    const loginSettings = {
      openAtLogin: enabled,
      openAsHidden: true,
      args: ['--hidden'],
    }
    if (process.platform !== 'darwin') {
      loginSettings.path = app.getPath('exe')
    }
    app.setLoginItemSettings(loginSettings)
  }
}

/**
 * 初始化开机自启动设置（应用启动时调用）
 */
function initAutoLaunch() {
  // 便携模式下不设置开机自启（exe 路径不固定，且可能位于受保护目录）
  if (process.env.PORTABLE_EXECUTABLE_DIR) return

  const autoLaunchEnabled = getAutoLaunchSettings()
  if (autoLaunchEnabled) {
    const loginSettings = {
      openAtLogin: true,
      openAsHidden: true,
      args: ['--hidden'],
    }
    if (process.platform !== 'darwin') {
      loginSettings.path = app.getPath('exe')
    }
    app.setLoginItemSettings(loginSettings)
  }
}

/**
 * 获取开机自启动状态
 * @returns {Object} { success: boolean, enabled: boolean }
 */
async function getAutoLaunch() {
  try {
    return { success: true, enabled: getAutoLaunchSettings() }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 设置开机自启动状态
 * @param {boolean} enabled
 * @returns {Object} { success: boolean }
 */
async function setAutoLaunch(enabled) {
  try {
    await setAutoLaunchEnabled(enabled)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

module.exports = {
  getAutoLaunchSettings,
  setAutoLaunchEnabled,
  initAutoLaunch,
  getAutoLaunch,
  setAutoLaunch,
}