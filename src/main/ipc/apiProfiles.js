/**
 * API 配置 IPC 处理器
 * 处理 API 配置相关的 IPC 通信
 */

const { ipcMain } = require('electron')
const { readSettings, writeSettings, API_FIELDS, extractApiConfig, applyApiConfig } = require('../services/configService')
const { updateTrayMenu } = require('../tray')
const { t } = require('../utils/translations')

/**
 * 注册 API 配置相关的 IPC 处理器
 */
function registerApiProfilesIpcHandlers() {
  // 获取 API 配置列表
  ipcMain.handle('list-api-profiles', async () => {
    try {
      const settings = readSettings()
      if (!settings) {
        return {
          success: true,
          profiles: [{ name: 'default', isDefault: true }],
          currentProfile: 'default'
        }
      }

      const profiles = settings.apiProfiles || {}
      if (Object.keys(profiles).length === 0) {
        profiles.default = {}
      }

      const profileList = Object.keys(profiles).map(name => ({
        name,
        isDefault: name === 'default',
      }))

      return {
        success: true,
        profiles: profileList,
        currentProfile: settings.currentApiProfile || 'default',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        profiles: [{ name: 'default', isDefault: true }],
        currentProfile: 'default'
      }
    }
  })

  // 切换 API 配置
  ipcMain.handle('switch-api-profile', async (event, profileName) => {
    try {
      const settings = readSettings()
      if (!settings) {
        return { success: false, error: t('errors.configNotFound') }
      }

      const profiles = settings.apiProfiles || {}
      if (!profiles[profileName]) {
        return { success: false, error: t('errors.configNotExist', { name: profileName }) }
      }

      const currentProfile = settings.currentApiProfile || 'default'

      // 保存当前配置
      if (profiles[currentProfile]) {
        profiles[currentProfile] = extractApiConfig(settings)
      }

      // 加载新配置
      const newConfig = profiles[profileName]
      applyApiConfig(settings, newConfig)
      settings.currentApiProfile = profileName
      settings.apiProfiles = profiles
      writeSettings(settings)

      updateTrayMenu()
      return { success: true, data: settings }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 创建 API 配置
  ipcMain.handle('create-api-profile', async (event, name) => {
    try {
      const settings = readSettings()
      if (!settings) {
        return { success: false, error: t('errors.configNotFound') }
      }

      if (!settings.apiProfiles) {
        settings.apiProfiles = { default: {} }
        for (const field of API_FIELDS) {
          if (settings[field] !== undefined) {
            settings.apiProfiles.default[field] = settings[field]
          }
        }
      }

      if (settings.apiProfiles[name]) {
        return { success: false, error: t('errors.configAlreadyExists', { name }) }
      }

      // 复制当前配置到新配置
      const newConfig = {}
      for (const field of API_FIELDS) {
        if (settings[field] !== undefined) {
          newConfig[field] = settings[field]
        }
      }
      settings.apiProfiles[name] = newConfig
      writeSettings(settings)

      updateTrayMenu()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 删除 API 配置
  ipcMain.handle('delete-api-profile', async (event, name) => {
    try {
      const settings = readSettings()
      if (!settings) {
        return { success: false, error: t('errors.configNotFound') }
      }

      if (name === 'default') {
        return { success: false, error: t('errors.cannotDeleteDefault') }
      }

      const profiles = settings.apiProfiles || {}
      if (!profiles[name]) {
        return { success: false, error: t('errors.configNotExist', { name }) }
      }

      delete profiles[name]
      settings.apiProfiles = profiles

      // 如果删除的是当前配置，切换到 default
      if (settings.currentApiProfile === name) {
        settings.currentApiProfile = 'default'
        if (profiles.default) {
          applyApiConfig(settings, profiles.default)
        }
      }

      writeSettings(settings)
      updateTrayMenu()
      return { success: true, data: settings }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 重命名 API 配置
  ipcMain.handle('rename-api-profile', async (event, oldName, newName) => {
    try {
      const settings = readSettings()
      if (!settings) {
        return { success: false, error: t('errors.configNotFound') }
      }

      if (oldName === 'default') {
        return { success: false, error: t('errors.cannotRenameDefault') }
      }

      const profiles = settings.apiProfiles || {}
      if (!profiles[oldName]) {
        return { success: false, error: t('errors.configNotExist', { name: oldName }) }
      }

      if (profiles[newName]) {
        return { success: false, error: t('errors.configAlreadyExists', { name: newName }) }
      }

      profiles[newName] = profiles[oldName]
      delete profiles[oldName]
      settings.apiProfiles = profiles

      if (settings.currentApiProfile === oldName) {
        settings.currentApiProfile = newName
      }

      writeSettings(settings)
      updateTrayMenu()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 复制 API 配置
  ipcMain.handle('duplicate-api-profile', async (event, sourceName, newName) => {
    try {
      const settings = readSettings()
      if (!settings) {
        return { success: false, error: t('errors.configNotFound') }
      }

      const profiles = settings.apiProfiles || {}
      if (!profiles[sourceName]) {
        return { success: false, error: t('errors.configNotExist', { name: sourceName }) }
      }

      if (profiles[newName]) {
        return { success: false, error: t('errors.configAlreadyExists', { name: newName }) }
      }

      profiles[newName] = JSON.parse(JSON.stringify(profiles[sourceName]))
      settings.apiProfiles = profiles
      writeSettings(settings)

      updateTrayMenu()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerApiProfilesIpcHandlers,
}