/**
 * 设置 IPC 处理器
 * 处理设置相关的 IPC 通信
 */

const { ipcMain } = require('electron')
const { readSettings, writeSettings, API_FIELDS, extractApiConfig, stampModifiedItems, markDeletedProfile, markDeletedServer } = require('../services/configService')
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

    // 检测显式删除：仅当渲染端 payload 显式带了 apiProfiles / mcpServers 才比对
    // （避免只更新顶层字段时把磁盘上的整张表误判为删除）
    if (data && Object.prototype.hasOwnProperty.call(data, 'apiProfiles')) {
      const oldProfiles = (existing && existing.apiProfiles) || {}
      const newProfiles = merged.apiProfiles || {}
      for (const name of Object.keys(oldProfiles)) {
        if (!(name in newProfiles)) {
          markDeletedProfile(merged, name)
        }
      }
      // 重新出现的条目：清理旧 tombstone
      if (merged._deletedProfiles) {
        for (const name of Object.keys(newProfiles)) {
          if (merged._deletedProfiles[name]) delete merged._deletedProfiles[name]
        }
      }
    }
    if (data && Object.prototype.hasOwnProperty.call(data, 'mcpServers')) {
      const oldServers = (existing && existing.mcpServers) || {}
      const newServers = merged.mcpServers || {}
      for (const name of Object.keys(oldServers)) {
        if (!(name in newServers)) {
          markDeletedServer(merged, name)
        }
      }
      if (merged._deletedServers) {
        for (const name of Object.keys(newServers)) {
          if (merged._deletedServers[name]) delete merged._deletedServers[name]
        }
      }
    }

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