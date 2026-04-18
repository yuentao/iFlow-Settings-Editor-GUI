const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
console.log('main.js loaded')
console.log('app.getPath("home"):', app.getPath('home'))
const SETTINGS_FILE = path.join(app.getPath('home'), '.iflow', 'settings.json')
console.log('SETTINGS_FILE:', SETTINGS_FILE)
let mainWindow
let tray
const isDev = process.argv.includes('--dev')

// 主进程翻译
const trayTranslations = {
  'zh-CN': {
    showWindow: '显示主窗口',
    switchApiConfig: '切换 API 配置',
    exit: '退出',
    tooltip: 'iFlow 设置编辑器'
  },
  'en-US': {
    showWindow: 'Show Window',
    switchApiConfig: 'Switch API Config',
    exit: 'Exit',
    tooltip: 'iFlow Settings Editor'
  },
  'ja-JP': {
    showWindow: 'メインウィンドウを表示',
    switchApiConfig: 'API 設定切替',
    exit: '終了',
    tooltip: 'iFlow 設定エディタ'
  }
}

function getTrayTranslation() {
  const settings = readSettings()
  const lang = settings?.language || 'zh-CN'
  return trayTranslations[lang] || trayTranslations['zh-CN']
}

// 错误消息翻译
const errorTranslations = {
  'zh-CN': {
    configNotFound: '配置文件不存在',
    configNotExist: '配置 "{name}" 不存在',
    configAlreadyExists: '配置 "{name}" 已存在',
    cannotDeleteDefault: '不能删除默认配置',
    cannotRenameDefault: '不能重命名默认配置',
    switchFailed: '切换API配置失败'
  },
  'en-US': {
    configNotFound: 'Configuration file not found',
    configNotExist: 'Configuration "{name}" does not exist',
    configAlreadyExists: 'Configuration "{name}" already exists',
    cannotDeleteDefault: 'Cannot delete default configuration',
    cannotRenameDefault: 'Cannot rename default configuration',
    switchFailed: 'Failed to switch API configuration'
  },
  'ja-JP': {
    configNotFound: '設定ファイルが存在しません',
    configNotExist: 'プロファイル "{name}" が存在しません',
    configAlreadyExists: 'プロファイル "{name}" が既に存在します',
    cannotDeleteDefault: 'デフォルトプロファイルは削除できません',
    cannotRenameDefault: 'デフォルトプロファイルは名前変更できません',
    switchFailed: 'API 設定の切替に失敗しました'
  }
}

function getErrorTranslation() {
  const settings = readSettings()
  const lang = settings?.language || 'zh-CN'
  return errorTranslations[lang] || errorTranslations['zh-CN']
}

// 创建系统托盘
function createTray() {
  // 获取图标路径 - 打包后需要从 extraResources 获取
  let iconPath
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'icon', 'icon.ico')
  } else {
    iconPath = path.join(__dirname, 'build', 'icon.ico')
  }
  
  let trayIcon
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
  } else {
    // 创建一个简单的图标
    trayIcon = nativeImage.createEmpty()
  }
  // 调整图标大小以适应托盘
  trayIcon = trayIcon.resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)
  tray.setToolTip(getTrayTranslation().tooltip)

  updateTrayMenu()

  // 双击托盘显示主窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// 更新托盘菜单
function updateTrayMenu() {
  const settings = readSettings()
  const profiles = settings?.apiProfiles || {}
  const currentProfile = settings?.currentApiProfile || 'default'
  const profileList = Object.keys(profiles).length > 0
    ? Object.keys(profiles)
    : ['default']

  const profileMenuItems = profileList.map(name => ({
    label: name + (name === currentProfile ? ' ✓' : ''),
    type: 'radio',
    checked: name === currentProfile,
    click: () => switchApiProfileFromTray(name)
  }))

  const t = getTrayTranslation()
  const contextMenu = Menu.buildFromTemplate([
    {
      label: t.showWindow,
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: t.switchApiConfig,
      submenu: profileMenuItems
    },
    { type: 'separator' },
    {
      label: t.exit,
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

// 从托盘切换 API 配置
function switchApiProfileFromTray(profileName) {
  try {
    const settings = readSettings()
    if (!settings) return

    const profiles = settings.apiProfiles || {}
    if (!profiles[profileName]) return

    // 保存当前配置到 apiProfiles
    const currentProfile = settings.currentApiProfile || 'default'
    if (profiles[currentProfile]) {
      const currentConfig = {}
      for (const field of API_FIELDS) {
        if (settings[field] !== undefined) {
          currentConfig[field] = settings[field]
        }
      }
      profiles[currentProfile] = currentConfig
    }

    // 从 apiProfiles 加载新配置到主字段
    const newConfig = profiles[profileName]
    for (const field of API_FIELDS) {
      if (newConfig[field] !== undefined) {
        settings[field] = newConfig[field]
      }
    }
    settings.currentApiProfile = profileName
    settings.apiProfiles = profiles
    writeSettings(settings)

    updateTrayMenu()
    // 通知渲染进程刷新
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('api-profile-switched', profileName)
    }
  } catch (error) {
    console.error('切换API配置失败:', error)
  }
}

function createWindow() {
  console.log('Creating window...')
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundMaterial: 'acrylic', // on Windows 11
    frame: false,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })
  console.log('Loading index.html...')
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
  console.log('index.html loading initiated')
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Console [' + level + ']:', message)
  })
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show')
    mainWindow.show()
    createTray()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && app.isQuitting) {
    app.quit()
  }
})
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
// Window controls
ipcMain.on('window-minimize', () => mainWindow.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})
ipcMain.on('window-close', () => {
  if (!app.isQuitting) {
    mainWindow.hide()
  } else {
    mainWindow.close()
  }
})
ipcMain.handle('is-maximized', () => mainWindow.isMaximized())
// 监听语言切换以更新托盘菜单
ipcMain.on('language-changed', () => {
  updateTrayMenu()
})
// API 配置相关的字段
const API_FIELDS = ['selectedAuthType', 'apiKey', 'baseUrl', 'modelName', 'searchApiKey', 'cna']
// 读取设置文件
function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return null
  }
  const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
  return JSON.parse(data)
}
// 写入设置文件
function writeSettings(data) {
  if (fs.existsSync(SETTINGS_FILE)) {
    const backupPath = SETTINGS_FILE + '.bak'
    fs.copyFileSync(SETTINGS_FILE, backupPath)
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}
// 获取 API 配置列表
ipcMain.handle('list-api-profiles', async () => {
  try {
    const settings = readSettings()
    if (!settings) {
      return { success: true, profiles: [{ name: 'default', isDefault: true }], currentProfile: 'default' }
    }
    const profiles = settings.apiProfiles || {}
    // 确保至少有 default 配置
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
    return { success: false, error: error.message, profiles: [{ name: 'default', isDefault: true }], currentProfile: 'default' }
  }
})
// 切换 API 配置
ipcMain.handle('switch-api-profile', async (event, profileName) => {
  try {
    const settings = readSettings()
    const t = getErrorTranslation()
    if (!settings) {
      return { success: false, error: t.configNotFound }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[profileName]) {
      return { success: false, error: t.configNotExist.replace('{name}', profileName) }
    }
    // 保存当前配置到 apiProfiles（如果当前配置存在）
    const currentProfile = settings.currentApiProfile || 'default'
    if (profiles[currentProfile]) {
      const currentConfig = {}
      for (const field of API_FIELDS) {
        if (settings[field] !== undefined) {
          currentConfig[field] = settings[field]
        }
      }
      profiles[currentProfile] = currentConfig
    }
    // 从 apiProfiles 加载新配置到主字段
    const newConfig = profiles[profileName]
    for (const field of API_FIELDS) {
      if (newConfig[field] !== undefined) {
        settings[field] = newConfig[field]
      }
    }
    settings.currentApiProfile = profileName
    settings.apiProfiles = profiles
    writeSettings(settings)
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 创建新的 API 配置
ipcMain.handle('create-api-profile', async (event, name) => {
  try {
    const settings = readSettings()
    const t = getErrorTranslation()
    if (!settings) {
      return { success: false, error: t.configNotFound }
    }
    if (!settings.apiProfiles) {
      settings.apiProfiles = { default: {} }
      // 初始化 default 配置
      for (const field of API_FIELDS) {
        if (settings[field] !== undefined) {
          settings.apiProfiles.default[field] = settings[field]
        }
      }
    }
    if (settings.apiProfiles[name]) {
      return { success: false, error: t.configAlreadyExists.replace('{name}', name) }
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
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 删除 API 配置
ipcMain.handle('delete-api-profile', async (event, name) => {
  try {
    const settings = readSettings()
    const t = getErrorTranslation()
    if (!settings) {
      return { success: false, error: t.configNotFound }
    }
    if (name === 'default') {
      return { success: false, error: t.cannotDeleteDefault }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[name]) {
      return { success: false, error: t.configNotExist.replace('{name}', name) }
    }
    delete profiles[name]
    settings.apiProfiles = profiles
    // 如果删除的是当前配置，切换到 default
    if (settings.currentApiProfile === name) {
      settings.currentApiProfile = 'default'
      if (profiles.default) {
        for (const field of API_FIELDS) {
          if (profiles.default[field] !== undefined) {
            settings[field] = profiles.default[field]
          }
        }
      }
    }
    writeSettings(settings)
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 重命名 API 配置
ipcMain.handle('rename-api-profile', async (event, oldName, newName) => {
  try {
    const settings = readSettings()
    const t = getErrorTranslation()
    if (!settings) {
      return { success: false, error: t.configNotFound }
    }
    if (oldName === 'default') {
      return { success: false, error: t.cannotRenameDefault }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[oldName]) {
      return { success: false, error: t.configNotExist.replace('{name}', oldName) }
    }
    if (profiles[newName]) {
      return { success: false, error: t.configAlreadyExists.replace('{name}', newName) }
    }
    profiles[newName] = profiles[oldName]
    delete profiles[oldName]
    settings.apiProfiles = profiles
    if (settings.currentApiProfile === oldName) {
      settings.currentApiProfile = newName
    }
    writeSettings(settings)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 复制 API 配置
ipcMain.handle('duplicate-api-profile', async (event, sourceName, newName) => {
  try {
    const settings = readSettings()
    const t = getErrorTranslation()
    if (!settings) {
      return { success: false, error: t.configNotFound }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[sourceName]) {
      return { success: false, error: t.configNotExist.replace('{name}', sourceName) }
    }
    if (profiles[newName]) {
      return { success: false, error: t.configAlreadyExists.replace('{name}', newName) }
    }
    // 深拷贝配置
    profiles[newName] = JSON.parse(JSON.stringify(profiles[sourceName]))
    settings.apiProfiles = profiles
    writeSettings(settings)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// IPC Handlers
ipcMain.handle('load-settings', async () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { success: false, error: 'File not found', data: null }
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    const json = JSON.parse(data)
    return { success: true, data: json }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
})
ipcMain.handle('save-settings', async (event, data) => {
  try {
    // 保存时同步更新 apiProfiles 中的当前配置
    const currentProfile = data.currentApiProfile || 'default'
    if (!data.apiProfiles) {
      data.apiProfiles = {}
    }
    // 更新当前配置到 apiProfiles
    const currentConfig = {}
    for (const field of API_FIELDS) {
      if (data[field] !== undefined) {
        currentConfig[field] = data[field]
      }
    }
    data.apiProfiles[currentProfile] = currentConfig
    writeSettings(data)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
ipcMain.handle('show-message', async (event, { type, title, message }) => {
  return dialog.showMessageBox(mainWindow, { type, title, message })
})
