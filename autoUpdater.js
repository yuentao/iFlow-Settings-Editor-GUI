/**
 * 自动更新模块
 * 定时检查更新、事件通知
 */

const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

// 自动更新检查间隔（毫秒）- 默认 1 小时
const DEFAULT_CHECK_INTERVAL = 60 * 60 * 1000

// 更新状态
const UPDATE_STATES = {
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  ERROR: 'error',
}

let checkInterval = null
let mainWindowRef = null

/**
 * 初始化自动更新模块
 * @param {Function} getMainWindow - 获取主窗口引用的函数
 * @param {Object} options - 配置选项
 */
function initAutoUpdater(getMainWindow, options = {}) {
  mainWindowRef = getMainWindow

  const interval = options.checkInterval || DEFAULT_CHECK_INTERVAL
  const autoCheck = options.autoCheck !== false // 默认开启自动检查

  if (autoCheck && app.isPackaged) {
    // 仅在打包后的应用中自动检查更新
    startAutoCheck(interval)
  }

  // 应用退出时清理
  app.on('will-quit', () => {
    stopAutoCheck()
  })
}

/**
 * 开始自动检查更新
 * @param {number} interval - 检查间隔（毫秒）
 */
function startAutoCheck(interval = DEFAULT_CHECK_INTERVAL) {
  // 立即执行一次检查
  checkForUpdates()

  // 设置定时器
  checkInterval = setInterval(() => {
    checkForUpdates()
  }, interval)
}

/**
 * 停止自动检查更新
 */
function stopAutoCheck() {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}

/**
 * 执行更新检查
 */
async function checkForUpdates() {
  const mainWindow = mainWindowRef?.()
  if (!mainWindow) return

  try {
    // 发送检查更新请求到 updateChecker
    mainWindow.webContents.send('auto-check-update')
  } catch (error) {
    console.error('Auto check update failed:', error)
  }
}

/**
 * 通知渲染进程更新状态变化
 * @param {Object} state - 更新状态
 */
function notifyUpdateState(state) {
  const mainWindow = mainWindowRef?.()
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-status-changed', state)
  }
}

/**
 * 显示更新通知
 * @param {Object} updateInfo - 更新信息
 */
function showUpdateNotification(updateInfo) {
  const mainWindow = mainWindowRef?.()
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-available', updateInfo)
  }
}

/**
 * 设置更新下载进度
 * @param {number} progress - 下载进度 0-100
 */
function setDownloadProgress(progress) {
  const mainWindow = mainWindowRef?.()
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-download-progress', progress)
  }
}

/**
 * 更新下载完成
 */
function notifyDownloaded() {
  const mainWindow = mainWindowRef?.()
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-downloaded')
  }
}

/**
 * 更新安装
 */
async function installUpdate() {
  const mainWindow = mainWindowRef?.()
  if (mainWindow) {
    mainWindow.webContents.send('install-update')
  }
}

/**
 * 获取下次检查时间
 */
function getNextCheckTime() {
  if (!checkInterval) return null
  // 估算下次检查时间（不精确但足够）
  return new Date(Date.now() + DEFAULT_CHECK_INTERVAL)
}

/**
 * 检查是否正在检查更新
 */
function isChecking() {
  return checkInterval !== null
}

module.exports = {
  initAutoUpdater,
  startAutoCheck,
  stopAutoCheck,
  checkForUpdates,
  notifyUpdateState,
  showUpdateNotification,
  setDownloadProgress,
  notifyDownloaded,
  installUpdate,
  getNextCheckTime,
  isChecking,
  UPDATE_STATES,
}