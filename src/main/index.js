/**
 * iFlow Settings Editor - Main Process Entry Point
 * 模块化的主进程入口文件
 */

const { app, BrowserWindow, Menu, nativeImage } = require('electron')
const path = require('path')

// 导入各模块
const { createWindow, getMainWindow, isMaximized, minimize, toggleMaximize, close, setIsQuitting } = require('./window')
const { createTray, destroyTray, updateTrayMenu } = require('./tray')
const { registerIpcHandlers } = require('./ipc')
const { initAutoLaunch } = require('./services/autoLaunchService')
const { readSettings } = require('./services/configService')
const { t, defaultTranslations, updateTranslations } = require('./utils/translations')

// 是否是开发模式
const isDev = process.argv.includes('--dev')

// 是否是静默启动（隐藏窗口）
const isSilentLaunch = process.argv.includes('--hidden') || process.argv.includes('--silent')

// 静默启动时不显示窗口
let startHidden = false

// 主窗口引用
let mainWindowRef = null

/**
 * 创建主窗口
 */
function createMainWindow() {
  const win = createWindow()
  mainWindowRef = win

  // 隐藏时也创建窗口，但不显示
  if (isSilentLaunch || startHidden) {
    win.hide()
  }

  // 加载初始页面
  if (isDev) {
    win.loadURL('http://localhost:5173')
    // 开发模式打开开发者工具
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  // 窗口准备好后显示（如果不是静默启动）
  win.once('ready-to-show', () => {
    if (!isSilentLaunch && !startHidden) {
      win.show()
    }
  })

  return win
}

/**
 * 初始化应用
 */
async function initializeApp() {
  console.log('Initializing iFlow Settings Editor...')

  // 设置应用路径
  app.setAppUserModelId('com.pandorastudio.iflow-settings-editor')

  // 单实例锁
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    console.log('Another instance is running, quitting...')
    app.quit()
    return
  }

  // 监听第二个实例
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected, focusing main window...')
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 创建主窗口
  const mainWindow = createMainWindow()

  // 初始化系统托盘（先设置翻译函数）
  const { setTranslator } = require('./tray')
  setTranslator(t)
  createTray()

  // 注册 IPC 处理器
  registerIpcHandlers(getMainWindow, t)

  // 初始化开机自启动
  initAutoLaunch()

  // 检查更新设置
  try {
    const settings = readSettings()
    if (settings?.autoUpdate !== false) {
      // 延迟检查更新，等待窗口加载完成
      setTimeout(() => {
        checkForUpdates()
      }, 5000)
    }
  } catch (e) {
    console.error('Failed to read settings for auto-update check:', e)
  }

  console.log('App initialization complete')
}

/**
 * 检查更新
 */
function checkForUpdates() {
  try {
    const { ipcMain } = require('electron')
    // 通知渲染进程检查更新
    const mainWindow = getMainWindow()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('check-for-updates')
    }
  } catch (e) {
    console.error('Failed to check for updates:', e)
  }
}

/**
 * 应用准备就绪
 */
app.whenReady().then(() => {
  console.log('App ready event fired')

  // 检查是否是静默启动参数
  if (process.argv.includes('--hidden') || process.argv.includes('--silent')) {
    startHidden = true
  }

  // 初始化应用
  initializeApp()

  // macOS 系统专用
  app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标且没有其他窗口时，通常会重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    } else {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.show()
      }
    }
  })
})

/**
 * 所有窗口关闭时
 * 在 macOS 上，应用通常会在所有窗口关闭后继续在菜单栏中运行
 * 除了 macOS 外，在 Windows/Linux 上，退出所有窗口通常意味着完全退出应用
 */
app.on('window-all-closed', () => {
  // 在 macOS 上不退出应用，因为那是典型的菜单栏应用行为
  // 但如果用户使用了 Cmd+Q 或明确退出，我们也尊重这个行为
  if (process.platform !== 'darwin') {
    // 不在 Windows/Linux 上自动退出，保持在托盘运行
    // app.quit() - 注释掉以支持托盘运行
  }
})

/**
 * 应用即将退出
 */
app.on('before-quit', () => {
  console.log('App is about to quit...')
  setIsQuitting(true)
})

/**
 * 应用确实要退出
 */
app.on('will-quit', () => {
  console.log('App will quit, cleaning up...')
  // 销毁托盘
  destroyTray()
})

/**
 * 导出公共接口供外部使用
 */
module.exports = {
  getMainWindow,
  initializeApp,
}