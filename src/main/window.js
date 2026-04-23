/**
 * 窗口管理模块
 * 负责创建和管理主窗口
 */

const { BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

// 全局窗口引用
let mainWindow = null

// 开发模式标志
const isDev = process.argv.includes('--dev')

// 后台静默启动标志
const isSilentLaunch = process.argv.includes('--hidden') || process.argv.includes('--silent')

/**
 * 获取窗口图标路径
 * @returns {string} 图标路径
 */
function getWindowIcon() {
  const isMac = process.platform === 'darwin'
  let windowIcon

  if (isMac) {
    windowIcon = path.join(__dirname, '..', '..', 'build', 'icon.icns')
    if (!fs.existsSync(windowIcon)) {
      windowIcon = path.join(__dirname, '..', '..', 'build', 'icon.ico')
    }
  } else {
    windowIcon = path.join(__dirname, '..', '..', 'build', 'icon.ico')
  }

  return windowIcon
}

/**
 * 获取 preload 脚本路径
 * @returns {string}
 */
function getPreloadPath() {
  return path.join(__dirname, '..', '..', 'preload.js')
}

/**
 * 获取入口 HTML 路径
 * @returns {string}
 */
function getEntryHtmlPath() {
  if (isDev) {
    return 'http://localhost:5173'
  } else {
    return path.join(__dirname, '..', '..', 'dist', 'index.html')
  }
}

/**
 * 创建主窗口
 * @returns {BrowserWindow}
 */
function createWindow() {
  console.log('Creating window...')

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundMaterial: process.platform === 'darwin' ? undefined : 'acrylic',
    frame: false,
    show: false,
    icon: getWindowIcon(),
    webPreferences: {
      devTools: isDev,
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  // 非开发模式下阻止开发者工具快捷键
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.ctrl && input.shift && input.key.toLowerCase() === 'i') {
        event.preventDefault()
        return false
      }
      if (input.key === 'F12') {
        event.preventDefault()
        return false
      }
    })
  }

  console.log('Loading index.html...')
  mainWindow.loadURL(getEntryHtmlPath())

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Console [' + level + ']:', message)
  })

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show')
    if (isSilentLaunch) {
      console.log('Silent launch mode - hiding window')
    } else {
      mainWindow.show()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

/**
 * 获取主窗口引用
 * @returns {BrowserWindow|null}
 */
function getMainWindow() {
  return mainWindow
}

/**
 * 窗口是否最大化
 * @returns {boolean}
 */
function isMaximized() {
  return mainWindow ? mainWindow.isMaximized() : false
}

/**
 * 窗口最小化
 */
function minimize() {
  if (mainWindow) {
    mainWindow.minimize()
  }
}

/**
 * 窗口最大化/还原
 */
function toggleMaximize() {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
}

/**
 * 关闭窗口
 * @param {boolean} isQuitting - 是否正在退出应用
 */
function close(isQuitting = false) {
  if (mainWindow) {
    if (!isQuitting) {
      mainWindow.hide()
    } else {
      mainWindow.close()
    }
  }
}

/**
 * 显示窗口并获取焦点
 */
function showAndFocus() {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
}

/**
 * 获取加载 URL
 * @returns {string}
 */
function getLoadUrl() {
  return getEntryHtmlPath()
}

/**
 * 是否为开发模式
 * @returns {boolean}
 */
function getIsDev() {
  return isDev
}

/**
 * 是否为静默启动
 * @returns {boolean}
 */
function getIsSilentLaunch() {
  return isSilentLaunch
}

// 是否正在退出应用（用于通知托盘菜单）
let isQuitting = false

/**
 * 设置是否正在退出应用
 * @param {boolean} value
 */
function setIsQuitting(value) {
  isQuitting = value
}

/**
 * 获取退出状态
 * @returns {boolean}
 */
function getIsQuitting() {
  return isQuitting
}

module.exports = {
  createWindow,
  getMainWindow,
  isMaximized,
  minimize,
  toggleMaximize,
  close,
  showAndFocus,
  getLoadUrl,
  getIsDev,
  getIsSilentLaunch,
  setIsQuitting,
  getIsQuitting,
}