/**
 * API 配置 IPC 处理器
 * 处理 API 配置相关的 IPC 通信
 */

const { ipcMain, net } = require('electron')
const { readSettings, writeSettings, API_FIELDS, extractApiConfig, applyApiConfig, stampModifiedItems, markDeletedProfile } = require('../services/configService')
const { updateTrayMenu } = require('../tray')
const { handleIpcError, wrapIpcHandler, successResult, ErrorCodes } = require('../utils/errors')
const { t } = require('../utils/translations')

/**
 * 注册 API 配置相关的 IPC 处理器
 */
function registerApiProfilesIpcHandlers() {
  // 获取 API 配置列表
  ipcMain.handle('list-api-profiles', wrapIpcHandler(async () => {
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
  }, 'list-api-profiles'))

  // 切换 API 配置
  ipcMain.handle('switch-api-profile', wrapIpcHandler(async (event, profileName) => {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND }
    }
    const oldSnapshot = JSON.parse(JSON.stringify(settings))

    const profiles = settings.apiProfiles || {}
    if (!profiles[profileName]) {
      return { success: false, error: t('errors.configNotExist', { name: profileName }), code: ErrorCodes.PROFILE_NOT_FOUND }
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
    stampModifiedItems(oldSnapshot, settings)
    writeSettings(settings)

    updateTrayMenu()
    return successResult(settings)
  }, 'switch-api-profile'))

  // 创建 API 配置
  ipcMain.handle('create-api-profile', wrapIpcHandler(async (event, name) => {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND }
    }
    const oldSnapshot = JSON.parse(JSON.stringify(settings))

    if (!settings.apiProfiles) {
      settings.apiProfiles = { default: {} }
      for (const field of API_FIELDS) {
        if (settings[field] !== undefined) {
          settings.apiProfiles.default[field] = settings[field]
        }
      }
    }

    if (settings.apiProfiles[name]) {
      return { success: false, error: t('errors.configAlreadyExists', { name }), code: ErrorCodes.PROFILE_EXISTS }
    }

    // 复制当前配置到新配置
    const newConfig = {}
    for (const field of API_FIELDS) {
      if (settings[field] !== undefined) {
        newConfig[field] = settings[field]
      }
    }
    settings.apiProfiles[name] = newConfig
    // 用户先删除再重建：移除同名 tombstone，避免合并时被云端误删
    if (settings._deletedProfiles && settings._deletedProfiles[name]) {
      delete settings._deletedProfiles[name]
    }
    stampModifiedItems(oldSnapshot, settings)
    writeSettings(settings)

    updateTrayMenu()
    return successResult()
  }, 'create-api-profile'))

  // 删除 API 配置
  ipcMain.handle('delete-api-profile', wrapIpcHandler(async (event, name) => {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND }
    }
    const oldSnapshot = JSON.parse(JSON.stringify(settings))

    if (name === 'default') {
      return { success: false, error: t('errors.cannotDeleteDefault'), code: ErrorCodes.CANNOT_DELETE_DEFAULT }
    }

    const profiles = settings.apiProfiles || {}
    if (!profiles[name]) {
      return { success: false, error: t('errors.configNotExist', { name }), code: ErrorCodes.PROFILE_NOT_FOUND }
    }

    // 写入 tombstone，云同步合并时其他设备会据此物理删除
    markDeletedProfile(settings, name)
    delete profiles[name]
    settings.apiProfiles = profiles

    // 如果删除的是当前配置，切换到 default
    if (settings.currentApiProfile === name) {
      settings.currentApiProfile = 'default'
      if (profiles.default) {
        applyApiConfig(settings, profiles.default)
      }
    }

    stampModifiedItems(oldSnapshot, settings)
    writeSettings(settings)
    updateTrayMenu()
    return successResult(settings)
  }, 'delete-api-profile'))

  // 重命名 API 配置
  ipcMain.handle('rename-api-profile', wrapIpcHandler(async (event, oldName, newName) => {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND }
    }
    const oldSnapshot = JSON.parse(JSON.stringify(settings))

    if (oldName === 'default') {
      return { success: false, error: t('errors.cannotRenameDefault'), code: ErrorCodes.CANNOT_RENAME_DEFAULT }
    }

    const profiles = settings.apiProfiles || {}
    if (!profiles[oldName]) {
      return { success: false, error: t('errors.configNotExist', { name: oldName }), code: ErrorCodes.PROFILE_NOT_FOUND }
    }

    if (profiles[newName]) {
      return { success: false, error: t('errors.configAlreadyExists', { name: newName }), code: ErrorCodes.PROFILE_EXISTS }
    }

    // 重命名 = 旧名删除 + 新名新增；新名上若有旧 tombstone 应清掉，避免远端把新创建的视为已删除
    const renamed = profiles[oldName]
    if (renamed && typeof renamed === 'object') {
      delete renamed._lastModified // 让 stampModifiedItems 视为内容变化重新打戳
    }
    profiles[newName] = renamed
    delete profiles[oldName]
    markDeletedProfile(settings, oldName)
    if (settings._deletedProfiles && settings._deletedProfiles[newName]) {
      delete settings._deletedProfiles[newName]
    }
    settings.apiProfiles = profiles

    if (settings.currentApiProfile === oldName) {
      settings.currentApiProfile = newName
    }

    stampModifiedItems(oldSnapshot, settings)
    writeSettings(settings)
    updateTrayMenu()
    return successResult()
  }, 'rename-api-profile'))

  // 获取模型列表（OpenAI 兼容 /models 接口）
  ipcMain.handle('fetch-models', wrapIpcHandler(async (event, baseUrl, apiKey) => {
    if (!baseUrl || !baseUrl.trim()) {
      return { success: false, error: 'api.fetchModels.baseUrlRequired' }
    }
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'api.fetchModels.apiKeyRequired' }
    }

    let url = baseUrl.trim().replace(/\/+$/, '') + '/models'

    return new Promise((resolve) => {
      const request = net.request({
        url,
        method: 'GET',
      })

      request.setHeader('Authorization', `Bearer ${apiKey.trim()}`)

      let body = ''
      request.on('response', (response) => {
        const statusCode = response.statusCode
        if (statusCode !== 200) {
          request.destroy()
          resolve({ success: false, error: 'api.fetchModels.httpError', code: statusCode, httpStatus: statusCode })
          return
        }

        response.on('data', (chunk) => {
          body += chunk.toString()
        })

        response.on('end', () => {
          try {
            const json = JSON.parse(body)
            const models = (json.data || [])
              .filter((m) => m && m.id)
              .map((m) => ({ id: m.id, owned_by: m.owned_by || '' }))
              .sort((a, b) => a.id.localeCompare(b.id))
            resolve({ success: true, models })
          } catch (e) {
            resolve({ success: false, error: 'api.fetchModels.invalidResponse' })
          }
        })
      })

      request.on('error', (error) => {
        resolve({ success: false, error: 'api.fetchModels.networkError' })
      })

      // 10 秒超时
      setTimeout(() => {
        request.destroy()
        resolve({ success: false, error: 'api.fetchModels.timeout' })
      }, 10000)

      request.end()
    })
  }, 'fetch-models'))

  // 复制 API 配置
  ipcMain.handle('duplicate-api-profile', wrapIpcHandler(async (event, sourceName, newName) => {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND }
    }
    const oldSnapshot = JSON.parse(JSON.stringify(settings))

    const profiles = settings.apiProfiles || {}
    if (!profiles[sourceName]) {
      return { success: false, error: t('errors.configNotExist', { name: sourceName }), code: ErrorCodes.PROFILE_NOT_FOUND }
    }

    if (profiles[newName]) {
      return { success: false, error: t('errors.configAlreadyExists', { name: newName }), code: ErrorCodes.PROFILE_EXISTS }
    }

    const cloned = JSON.parse(JSON.stringify(profiles[sourceName]))
    delete cloned._lastModified // 由 stampModifiedItems 重新打时间戳
    profiles[newName] = cloned
    settings.apiProfiles = profiles
    if (settings._deletedProfiles && settings._deletedProfiles[newName]) {
      delete settings._deletedProfiles[newName]
    }
    stampModifiedItems(oldSnapshot, settings)
    writeSettings(settings)

    updateTrayMenu()
    return successResult()
  }, 'duplicate-api-profile'))
}

module.exports = {
  registerApiProfilesIpcHandlers,
}