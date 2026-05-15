/**
 * 项目会话 IPC 处理器
 * 处理项目会话管理相关的 IPC 通信
 */

const { ipcMain, dialog, app } = require('electron')
const fs = require('fs')
const path = require('path')
const { wrapIpcHandler } = require('../utils/errors')
const {
  listProjects,
  getProjectSessions,
  getSessionMessages,
  deleteSession,
  deleteProject,
  deleteMessages,
  exportSession,
  searchSessions,
  getSessionStats,
  getAllSessionMessagesForStats,
} = require('../services/projectService')

/**
 * 注册项目会话相关的 IPC 处理器
 */
function registerProjectsIpcHandlers() {
  // 获取项目列表
  ipcMain.handle('projects:list', wrapIpcHandler(async () => {
    const projects = await listProjects()
    return { success: true, projects }
  }, 'projects:list'))

  // 获取项目下的会话列表
  ipcMain.handle('projects:sessions:list', wrapIpcHandler(async (event, projectId, options) => {
    const result = await getProjectSessions(projectId, options || {})
    return { success: true, ...result }
  }, 'projects:sessions:list'))

  // 获取会话消息
  ipcMain.handle('projects:sessions:messages', wrapIpcHandler(async (event, projectId, sessionId, options) => {
    const result = await getSessionMessages(projectId, sessionId, options || {})
    return { success: true, ...result }
  }, 'projects:sessions:messages'))

  // 删除会话
  ipcMain.handle('projects:sessions:delete', wrapIpcHandler(async (event, projectId, sessionId) => {
    const result = await deleteSession(projectId, sessionId)
    return { success: result }
  }, 'projects:sessions:delete'))

  // 删除整个项目
  ipcMain.handle('projects:delete', wrapIpcHandler(async (event, projectId) => {
    const result = await deleteProject(projectId)
    return { success: result }
  }, 'projects:delete'))

  // 删除消息
  ipcMain.handle('projects:messages:delete', wrapIpcHandler(async (event, projectId, sessionId, messageUuids) => {
    const result = await deleteMessages(projectId, sessionId, messageUuids || [])
    return { success: result }
  }, 'projects:messages:delete'))

  // 导出会话
  ipcMain.handle('projects:sessions:export', wrapIpcHandler(async (event, projectId, sessionId, format) => {
    const content = await exportSession(projectId, sessionId, format || 'markdown')

    // 弹出保存对话框
    const { getMainWindow } = require('../window')
    const mainWindow = getMainWindow()
    const ext = format === 'json' ? 'json' : 'md'
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出会话',
      defaultPath: `${sessionId}.${ext}`,
      filters: [
        { name: format === 'json' ? 'JSON Files' : 'Markdown Files', extensions: [ext] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled) {
      return { success: false, cancelled: true }
    }

    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  }, 'projects:sessions:export'))

  // 搜索会话
  ipcMain.handle('projects:search', wrapIpcHandler(async (event, query, options) => {
    const results = await searchSessions(query, options || {})
    return { success: true, results }
  }, 'projects:search'))

  // 获取会话统计
  ipcMain.handle('projects:sessions:stats', wrapIpcHandler(async (event, projectId, sessionId) => {
    const stats = await getSessionStats(projectId, sessionId)
    return { success: true, stats }
  }, 'projects:sessions:stats'))

  // 获取所有会话中用于模型统计的消息数据
  ipcMain.handle('projects:messages:for-stats', wrapIpcHandler(async (event, days) => {
    const messages = await getAllSessionMessagesForStats(days || 7)
    return { success: true, messages }
  }, 'projects:messages:for-stats'))
}

module.exports = {
  registerProjectsIpcHandlers,
}
