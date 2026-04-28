/**
 * 设置 IPC 处理器
 * 处理设置相关的 IPC 通信
 */

const { ipcMain } = require('electron')
const { readSettings, writeSettings, API_FIELDS, extractApiConfig, stampModifiedItems } = require('../services/configService')
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
    // 读取磁盘上的最新设置，用于合并
    const existing = readSettings() || {}
    const merged = { ...existing, ...data }

    // cloudSync 和 autoUpdate 由主进程通过专用 IPC 管理，
    // 渲染进程的 data 中可能包含过时的快照，始终以磁盘值为准
    if (existing.cloudSync) {
      merged.cloudSync = existing.cloudSync
    }
    if (existing.autoUpdate !== undefined) {
      merged.autoUpdate = existing.autoUpdate
    }

    // 保存时同步更新 apiProfiles 中的当前配置
    const currentProfile = merged.currentApiProfile || 'default'
    if (!merged.apiProfiles) {
      merged.apiProfiles = {}
    }

    const currentConfig = {}
    for (const field of API_FIELDS) {
      if (merged[field] !== undefined) {
        currentConfig[field] = merged[field]
      }
    }
    merged.apiProfiles[currentProfile] = currentConfig

    // 为内容变化的 apiProfiles/mcpServers 条目打上 _lastModified 时间戳
    // 这是云同步增量合并策略能正确工作的前提
    stampModifiedItems(existing, merged)

    writeSettings(merged)

    // 通知云同步服务：设置已保存，可能需要自动同步
    const { syncService } = require('./cloud')
    syncService.onSettingsSaved()

    return successResult()
  }, 'save-settings'))
}

module.exports = {
  registerSettingsIpcHandlers,
}