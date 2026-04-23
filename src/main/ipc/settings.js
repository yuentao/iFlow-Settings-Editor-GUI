/**
 * 设置 IPC 处理器
 * 处理设置相关的 IPC 通信
 */

const { ipcMain } = require('electron')
const { readSettings, writeSettings, API_FIELDS, extractApiConfig } = require('../services/configService')
const { t } = require('../utils/translations')

/**
 * 注册设置相关的 IPC 处理器
 */
function registerSettingsIpcHandlers() {
  // 加载设置
  ipcMain.handle('load-settings', async () => {
    try {
      const data = readSettings()
      if (!data) {
        return { success: false, error: t('errors.configNotFound'), data: null }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  })

  // 保存设置
  ipcMain.handle('save-settings', async (event, data) => {
    try {
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
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerSettingsIpcHandlers,
}