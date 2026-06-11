/**
 * 窗口管理模块
 * 负责创建和管理主窗口
 */

const { BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const { createLogger } = require('./utils/logger')
const logger = createLogger('Window')

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
 * 获取是否启用亚克力效果
 * @returns {boolean}
 */
function isAcrylicEnabled() {
  try {
    const { readSettings } = require('./services/configService')
    const settings = readSettings()
    // macOS 不支持 acrylic，仅 Windows 生效；默认启用
    return process.platform === 'win32' && (settings?.acrylicEnabled !== false)
  } catch {
    return process.platform === 'win32'
  }
}

/**
 * 创建主窗口
 * @returns {BrowserWindow}
 */
function createWindow() {
  logger.info('Creating window...')

  // 根据设置决定是否启用亚克力效果
  const useAcrylic = isAcrylicEnabled()

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundMaterial: useAcrylic ? 'acrylic' : undefined,
    frame: false,
    show: false,
    icon: getWindowIcon(),
    webPreferences: {
      devTools: isDev,
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
    // 禁用双击标题栏最大化
    maximizable: false,
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

  logger.info('Loading index.html...')
  mainWindow.loadURL(getEntryHtmlPath())

  // 阻止渲染进程中的链接点击导致页面导航（防止跳转到仪表盘等问题）
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // 开发模式：允许 Vite HMR (localhost)
    if (url.startsWith('http://localhost')) return
    // 生产模式：允许应用自身的 file:// 入口
    if (url.startsWith('file://') && url.endsWith('index.html')) return
    // 阻止所有其他导航
    event.preventDefault()
  })

  // 在新窗口中打开外部链接（使用系统浏览器）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('Failed to load:', new Error(`${errorCode} ${errorDescription}`))
  })

  // 仅开发模式转发渲染进程控制台日志，生产模式跳过以降低开销
  if (isDev) {
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log('Console [' + level + ']:', message)
    })
  }

  mainWindow.once('ready-to-show', () => {
    logger.info('Window ready to show')
    if (isSilentLaunch) {
      logger.info('Silent launch mode - hiding window')
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
/**
 * 切换最大化/还原
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
 * 获取退出状态
 * @returns {boolean}
 */
function getIsQuitting() {
  return isQuitting
}

/**
 * 运行时切换亚克力效果（无需重建窗口）
 * 仅 Windows 平台生效
 * @param {boolean} enabled
 */
function setAcrylicEnabled(enabled) {
  if (process.platform !== 'win32' || !mainWindow) return
  try {
    // Electron 28+ 支持通过 setBackgroundMaterial 动态切换
    if (typeof mainWindow.setBackgroundMaterial === 'function') {
      mainWindow.setBackgroundMaterial(enabled ? 'acrylic' : 'none')
    }
  } catch (e) {
    logger.warn('Failed to set background material:', e.message)
  }
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
  setAcrylicEnabled,
}