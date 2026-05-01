/**
 * 对话框 IPC 处理器
 * 处理对话框相关的 IPC 通信
 */

const { ipcMain, dialog } = require('electron')

// 待处理的确认对话框回调
const pendingConfirmDialogs = new Map()

/**
 * 获取主窗口引用
 */
function getMainWindowRef() {
  const { getMainWindow } = require('../window')
  return getMainWindow()
}

/**
 * 共享函数：在主进程内部显示确认对话框并等待结果
 * @param {string} titleKey
 * @param {string} messageKey
 * @param {string} messageParams
 * @returns {Promise<boolean>}
 */
function callConfirmDialog(titleKey, messageKey, messageParams) {
  return new Promise(resolve => {
    const requestId = `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    pendingConfirmDialogs.set(requestId, resolve)

    const mainWindow = getMainWindowRef()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('show-confirm-request', { requestId, titleKey, messageKey, messageParams })
    } else {
      resolve(false)
    }
  })
}

/**
 * 注册对话框相关的 IPC 处理器
 */
function registerDialogsIpcHandlers() {
  // 确认对话框结果回调
  ipcMain.on('confirm-dialog-result', (event, { requestId, confirmed }) => {
    const resolver = pendingConfirmDialogs.get(requestId)
    if (resolver) {
      resolver(confirmed)
      pendingConfirmDialogs.delete(requestId)
    }
  })

  // 文件选择对话框
  ipcMain.handle('show-open-dialog', async (event, options) => {
    const mainWindow = getMainWindowRef()
    return dialog.showOpenDialog(mainWindow, options)
  })

  // 显示消息对话框
  ipcMain.handle('show-message', async (event, { type, titleKey, messageKey, messageParams }) => {
    return { type, titleKey, messageKey, messageParams }
  })

  // 显示确认对话框
  ipcMain.handle('show-confirm-dialog', async (event, { titleKey, messageKey, messageParams }) => {
    return callConfirmDialog(titleKey, messageKey, messageParams)
  })
}

/**
 * 清理所有待处理的确认对话框
 */
function clearPendingDialogs() {
  for (const [requestId, resolve] of pendingConfirmDialogs) {
    resolve(false)
  }
  pendingConfirmDialogs.clear()
}

module.exports = {
  registerDialogsIpcHandlers,
  callConfirmDialog,
  clearPendingDialogs,
}