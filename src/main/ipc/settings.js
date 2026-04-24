/**
 * 设置 IPC 处理器
 * 处理设置相关的 IPC 通信
 */

const { ipcMain } = require('electron')
const { readSettings, writeSettings, API_FIELDS, extractApiConfig } = require('../services/configService')
const { handleIpcError, wrapIpcHandler, successResult, ErrorCodes } = require('../utils/errors')
const { t } = require('../utils/translations')

/**
 * 注册设置相关的 IPC 处理器
 */
function registerSettingsIpcHandlers() {
  // 加载设置
  ipcMain.handle('load-settings', wrapIpcHandler(async () => {
    const data = readSettings()
    if (!data) {
      return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND, data: null }
    }
    return successResult(data)
  }, 'load-settings'))

  // 保存设置
  ipcMain.handle('save-settings', wrapIpcHandler(async (event, data) => {
    // 保存时同步更新 apiProfiles 中的当前配置
    const currentProfile = data.currentApiProfile || 'default'
    if (!data.apiProfiles) {
      data.apiProfiles = {}
    }

    const currentConfig = {}
    for (const field of API_FIELDS) {
      if (data[field] !== undefined) {
        currentConfig[field] = data[field]
      }
    }
    data.apiProfiles[currentProfile] = currentConfig

    writeSettings(data)
    return successResult()
  }, 'save-settings'))
}

module.exports = {
  registerSettingsIpcHandlers,
}