const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
console.log('main.js loaded')
console.log('app.getPath("home"):', app.getPath('home'))

// 导入更新模块
const { setupIpcHandlers: setupUpdateIpcHandlers } = require('./updateChecker')
const { initAutoUpdater } = require('./autoUpdater')
const SETTINGS_FILE = path.join(app.getPath('home'), '.iflow', 'settings.json')
console.log('SETTINGS_FILE:', SETTINGS_FILE)
let mainWindow
let tray
const isDev = process.argv.includes('--dev')

// 检测是否后台静默启动（开机自启动时使用）
const isSilentLaunch = process.argv.includes('--hidden') || process.argv.includes('--silent')

// 自启动设置
function getAutoLaunchSettings() {
  const settings = readSettings()
  return settings?.autoLaunch ?? false
}

function setAutoLaunchEnabled(enabled) {
  const settings = readSettings() || {}
  settings.autoLaunch = enabled
  writeSettings(settings)

  // 设置 Electron 的自启动
  if (app.isReady()) {
    const loginSettings = {
      openAtLogin: enabled,
      openAsHidden: true, // 静默启动不显示窗口
    }
    // macOS 不需要指定 path，Windows 需要
    if (process.platform !== 'darwin') {
      loginSettings.path = app.getPath('exe')
      loginSettings.args = ['--hidden'] // Windows 需要显式传递启动参数
    }
    app.setLoginItemSettings(loginSettings)
  }
}

// 主进程翻译对象（从渲染进程获取）
let mainTranslations = {
  tray: {
    showWindow: '显示主窗口',
    switchApiConfig: '切换 API 配置',
    exit: '退出',
    tooltip: 'iFlow 设置编辑器',
  },
  errors: {
    configNotFound: '配置文件不存在',
    configNotExist: '配置 "{name}" 不存在',
    configAlreadyExists: '配置 "{name}" 已存在',
    cannotDeleteDefault: '不能删除默认配置',
    cannotRenameDefault: '不能重命名默认配置',
    switchFailed: '切换 API 配置失败',
    commandNotFound: '命令不存在',
    commandAlreadyExists: '命令已存在',
    commandInvalidName: '命令名只能包含字母、数字、中划线和下划线',
  },
  dialogs: {
    importSkill: '导入技能',
    exportSkill: '导出技能到',
    selectExportLocation: '选择导出位置',
  },
}

// 更新主进程翻译
function updateMainTranslations(localeData) {
  if (localeData && localeData.main) {
    mainTranslations = localeData.main
  }
}

// 获取翻译的辅助函数
function t(key, params = {}) {
  const keys = key.split('.')
  let value = mainTranslations
  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) break
  }
  if (typeof value === 'string') {
    // 替换参数
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{${paramKey}}`, paramValue)
    }
    return value
  }
  return key // 默认返回 key
}

// 创建系统托盘
function createTray() {
  // 获取图标路径 - 根据平台选择不同格式
  // macOS 使用 .icns，Windows 使用 .ico
  let iconPath
  const isMac = process.platform === 'darwin'

  if (app.isPackaged) {
    const iconDir = path.join(process.resourcesPath, 'icon')
    if (isMac) {
      iconPath = path.join(iconDir, 'icon.icns')
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(iconDir, 'icon.ico') // 回退到 ico
      }
    } else {
      iconPath = path.join(iconDir, 'icon.ico')
    }
  } else {
    if (isMac) {
      iconPath = path.join(__dirname, 'build', 'icon.icns')
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(__dirname, 'build', 'icon.ico')
      }
    } else {
      iconPath = path.join(__dirname, 'build', 'icon.ico')
    }
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
  tray.setToolTip(t('tray.tooltip'))

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
  const profileList = Object.keys(profiles).length > 0 ? Object.keys(profiles) : ['default']

  const profileMenuItems = profileList.map(name => ({
    label: name + (name === currentProfile ? ' ✓' : ''),
    type: 'radio',
    checked: name === currentProfile,
    click: () => switchApiProfileFromTray(name),
  }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t('tray.showWindow'),
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: t('tray.switchApiConfig'),
      submenu: profileMenuItems,
    },
    { type: 'separator' },
    {
      label: t('tray.exit'),
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
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

  // 根据平台选择图标
  const isMac = process.platform === 'darwin'
  let windowIcon
  if (isMac) {
    windowIcon = path.join(__dirname, 'build', 'icon.icns')
    if (!fs.existsSync(windowIcon)) {
      windowIcon = path.join(__dirname, 'build', 'icon.ico')
    }
  } else {
    windowIcon = path.join(__dirname, 'build', 'icon.ico')
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundMaterial: isMac ? undefined : 'acrylic', // 仅 Windows 支持 acrylic 效果
    frame: false,
    show: false,
    icon: windowIcon,
    webPreferences: {
      devTools: isDev, // 只在开发模式启用 devTools
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  // 非开发模式下阻止开发者工具快捷键
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // 阻止 Ctrl+Shift+I (DevTools) 和 F12 (DevTools)
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
    // 如果是后台静默启动，不显示窗口，只创建托盘
    if (isSilentLaunch) {
      console.log('Silent launch mode - hiding window')
      createTray()
    } else {
      mainWindow.show()
      createTray()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
app.whenReady().then(() => {
  // 初始化自启动设置
  const autoLaunchEnabled = getAutoLaunchSettings()
  if (autoLaunchEnabled) {
    const loginSettings = {
      openAtLogin: true,
      openAsHidden: true,
    }
    if (process.platform !== 'darwin') {
      loginSettings.path = app.getPath('exe')
      loginSettings.args = ['--hidden'] // Windows 需要显式传递启动参数
    }
    app.setLoginItemSettings(loginSettings)
  }

  // 设置更新 IPC 处理器
  setupUpdateIpcHandlers(() => mainWindow, (key, params) => t(key, params))

  // 初始化自动更新器
  initAutoUpdater(() => mainWindow, {
    autoCheck: true,
    checkInterval: 60 * 60 * 1000, // 1小时检查一次
  })

  createWindow()
})
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
// 监听语言切换以更新托盘菜单和翻译
ipcMain.on('language-changed', () => {
  updateTrayMenu()
})

// 接收翻译数据（渲染进程初始化时发送）
ipcMain.on('set-main-translations', (event, translations) => {
  updateMainTranslations(translations)
  updateTrayMenu()
})

// 待处理的确认对话框回调
const pendingConfirmDialogs = new Map()

// 共享函数：在主进程内部显示确认对话框并等待结果
function callConfirmDialog(titleKey, messageKey, messageParams) {
  return new Promise(resolve => {
    const requestId = `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    pendingConfirmDialogs.set(requestId, resolve)
    mainWindow.webContents.send('show-confirm-request', { requestId, titleKey, messageKey, messageParams })
  })
}

// 确认对话框结果回调
ipcMain.on('confirm-dialog-result', (event, { requestId, confirmed }) => {
  pendingConfirmDialogs.get(requestId)?.(confirmed)
  pendingConfirmDialogs.delete(requestId)
})

// 开机自启动
ipcMain.handle('get-auto-launch', async () => {
  try {
    return { success: true, enabled: getAutoLaunchSettings() }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-auto-launch', async (event, enabled) => {
  try {
    setAutoLaunchEnabled(enabled)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-auto-update', async () => {
  try {
    const settings = readSettings()
    const autoUpdate = settings?.autoUpdate !== undefined ? settings.autoUpdate : true
    return { success: true, enabled: autoUpdate }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-auto-update', async (event, enabled) => {
  try {
    const settings = readSettings() || {}
    settings.autoUpdate = enabled
    writeSettings(settings)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
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
    if (!settings) {
      return { success: false, error: t('errors.configNotFound') }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[profileName]) {
      return { success: false, error: t('errors.configNotExist', { name: profileName }) }
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
    // 更新托盘菜单
    updateTrayMenu()
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 创建新的 API 配置
ipcMain.handle('create-api-profile', async (event, name) => {
  try {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound') }
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
      return { success: false, error: t('errors.configAlreadyExists', { name }) }
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
    // 更新托盘菜单
    updateTrayMenu()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 删除 API 配置
ipcMain.handle('delete-api-profile', async (event, name) => {
  try {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound') }
    }
    if (name === 'default') {
      return { success: false, error: t('errors.cannotDeleteDefault') }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[name]) {
      return { success: false, error: t('errors.configNotExist', { name }) }
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
    // 更新托盘菜单
    updateTrayMenu()
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 重命名 API 配置
ipcMain.handle('rename-api-profile', async (event, oldName, newName) => {
  try {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound') }
    }
    if (oldName === 'default') {
      return { success: false, error: t('errors.cannotRenameDefault') }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[oldName]) {
      return { success: false, error: t('errors.configNotExist', { name: oldName }) }
    }
    if (profiles[newName]) {
      return { success: false, error: t('errors.configAlreadyExists', { name: newName }) }
    }
    profiles[newName] = profiles[oldName]
    delete profiles[oldName]
    settings.apiProfiles = profiles
    if (settings.currentApiProfile === oldName) {
      settings.currentApiProfile = newName
    }
    writeSettings(settings)
    // 更新托盘菜单
    updateTrayMenu()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// 复制 API 配置
ipcMain.handle('duplicate-api-profile', async (event, sourceName, newName) => {
  try {
    const settings = readSettings()
    if (!settings) {
      return { success: false, error: t('errors.configNotFound') }
    }
    const profiles = settings.apiProfiles || {}
    if (!profiles[sourceName]) {
      return { success: false, error: t('errors.configNotExist', { name: sourceName }) }
    }
    if (profiles[newName]) {
      return { success: false, error: t('errors.configAlreadyExists', { name: newName }) }
    }
    // 深拷贝配置
    profiles[newName] = JSON.parse(JSON.stringify(profiles[sourceName]))
    settings.apiProfiles = profiles
    writeSettings(settings)
    // 更新托盘菜单
    updateTrayMenu()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
// IPC Handlers
ipcMain.handle('load-settings', async () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { success: false, error: t('errors.configNotFound'), data: null }
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
ipcMain.handle('show-message', async (event, { type, titleKey, messageKey, messageParams }) => {
  // 返回给渲染进程显示 Vue 对话框
  return { type, titleKey, messageKey, messageParams }
})

ipcMain.handle('show-confirm-dialog', async (event, { titleKey, messageKey, messageParams }) => {
  // 通过渲染进程显示确认对话框并等待结果
  return callConfirmDialog(titleKey, messageKey, messageParams)
})

// 技能文件夹路径
const SKILLS_FOLDER = path.join(app.getPath('home'), '.iflow', 'skills')

// 确保技能文件夹存在
function ensureSkillsFolder() {
  if (!fs.existsSync(SKILLS_FOLDER)) {
    fs.mkdirSync(SKILLS_FOLDER, { recursive: true })
  }
}

// 获取技能列表
ipcMain.handle('list-skills', async () => {
  try {
    ensureSkillsFolder()
    const files = fs.readdirSync(SKILLS_FOLDER)
    const skills = []

    for (const file of files) {
      const skillPath = path.join(SKILLS_FOLDER, file)
      const stat = fs.statSync(skillPath)

      // 技能是文件夹格式，包含 SKILL.md 文件
      if (stat.isDirectory()) {
        const skillMdPath = path.join(skillPath, 'SKILL.md')
        const licensePath = path.join(skillPath, 'LICENSE.txt')

        let description = ''
        let name = file

        if (fs.existsSync(skillMdPath)) {
          try {
            const content = fs.readFileSync(skillMdPath, 'utf-8')
            // 解析 YAML front matter
            const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
            if (frontMatterMatch) {
              const frontMatter = frontMatterMatch[1]
              const nameMatch = frontMatter.match(/name:\s*(.+)/)
              const descMatch = frontMatter.match(/description:\s*(.+)/)
              if (nameMatch) name = nameMatch[1].trim()
              if (descMatch) description = descMatch[1].trim()
            }
          } catch (e) {
            console.error('Failed to parse SKILL.md:', e)
          }
        }

        // 计算文件夹总大小
        const calcFolderSize = dirPath => {
          let size = 0
          const items = fs.readdirSync(dirPath)
          for (const item of items) {
            const itemPath = path.join(dirPath, item)
            const itemStat = fs.statSync(itemPath)
            if (itemStat.isFile()) {
              size += itemStat.size
            }
          }
          return size
        }

        skills.push({
          name,
          description,
          folderName: file,
          size: calcFolderSize(skillPath),
          path: skillPath,
          hasLicense: fs.existsSync(licensePath),
        })
      }
    }

    return { success: true, skills }
  } catch (error) {
    return { success: false, error: error.message, skills: [] }
  }
})

// 本地导入技能
ipcMain.handle('import-skill-local', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialogs.importSkill'),
      filters: [
        { name: t('dialogs.skillArchive'), extensions: ['zip'] },
        { name: t('dialogs.allFiles'), extensions: ['*'] },
      ],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    const sourcePath = result.filePaths[0]
    const fileName = path.basename(sourcePath)
    const tmpDir = path.join(app.getPath('temp'), `skill-import-${Date.now()}`)

    ensureSkillsFolder()

    try {
      // 创建临时解压目录
      fs.mkdirSync(tmpDir, { recursive: true })

      // 解压压缩包
      const admzip = require('adm-zip')
      const zip = new admzip(sourcePath)
      zip.extractAllTo(tmpDir, true)

      // 检查 SKILL.md 是否直接在解压目录中（不嵌套在文件夹中）
      const directSkillMdPath = path.join(tmpDir, 'SKILL.md')
      let skillFolder = null
      let skillName = ''

      if (fs.existsSync(directSkillMdPath)) {
        // SKILL.md 直接在解压目录中
        skillFolder = tmpDir
        const content = fs.readFileSync(directSkillMdPath, 'utf-8')
        const nameMatch = content.match(/^---\n([\s\S]*?)\n---/)
        if (nameMatch) {
          const frontMatter = nameMatch[1]
          const nMatch = frontMatter.match(/name:\s*(.+)/)
          if (nMatch) skillName = nMatch[1].trim()
        }
        // 如果没有解析到名称，使用 ZIP 文件名（去掉扩展名）
        if (!skillName) {
          skillName = path.basename(sourcePath, '.zip')
        }
      } else {
        // 递归查找包含 SKILL.md 的文件夹
        const findSkillFolder = (dirPath, depth = 0) => {
          if (depth > 3) return null // 防止无限递归

          const entries = fs.readdirSync(dirPath)
          for (const entry of entries) {
            const entryPath = path.join(dirPath, entry)
            const stat = fs.statSync(entryPath)

            if (stat.isDirectory()) {
              const skillMdPath = path.join(entryPath, 'SKILL.md')
              if (fs.existsSync(skillMdPath)) {
                return entryPath
              }
              // 递归检查子文件夹
              const found = findSkillFolder(entryPath, depth + 1)
              if (found) return found
            }
          }
          return null
        }

        skillFolder = findSkillFolder(tmpDir)

        if (skillFolder) {
          const skillMdPath = path.join(skillFolder, 'SKILL.md')
          const content = fs.readFileSync(skillMdPath, 'utf-8')
          const nameMatch = content.match(/^---\n([\s\S]*?)\n---/)
          if (nameMatch) {
            const frontMatter = nameMatch[1]
            const nMatch = frontMatter.match(/name:\s*(.+)/)
            if (nMatch) skillName = nMatch[1].trim()
          }
          // 如果没有解析到名称，使用文件夹名称
          if (!skillName) {
            skillName = path.basename(skillFolder)
          }
        }
      }

      if (!skillFolder) {
        // 调试信息：列出解压后的所有文件
        const listAllFiles = (dirPath, files = [], baseDepth = 0) => {
          try {
            const entries = fs.readdirSync(dirPath)
            for (const entry of entries) {
              const entryPath = path.join(dirPath, entry)
              const stat = fs.statSync(entryPath)
              if (stat.isDirectory()) {
                listAllFiles(entryPath, files, baseDepth + 1)
              } else {
                files.push(`${'  '.repeat(baseDepth)}${entry}`)
              }
            }
          } catch (e) {}
          return files
        }
        const allFiles = listAllFiles(tmpDir)
        console.error('解压后文件列表:', allFiles.join('\n'))
        return { success: false, error: t('messages.skillArchiveInvalid', { content: allFiles.slice(0, 20).join('\n') }) }
      }

      const destPath = path.join(SKILLS_FOLDER, skillName)

      // 如果技能已存在，询问是否覆盖
      if (fs.existsSync(destPath)) {
        const confirmed = await callConfirmDialog('messages.warning', 'messages.overwriteConfirm', { name: skillName })

        if (!confirmed) {
          return { success: false, cancelled: true }
        }

        fs.rmSync(destPath, { recursive: true })
      }

      // 复制技能文件夹
      fs.cpSync(skillFolder, destPath, { recursive: true })
      return { success: true, message: t('messages.skillImportSuccess', { name: skillName }) }
    } finally {
      // 清理临时目录
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 在线导入技能
ipcMain.handle('import-skill-online', async (event, url, name) => {
  try {
    ensureSkillsFolder()

    const https = require('https')
    const http = require('http')
    const { URL } = require('url')

    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const destPath = path.join(SKILLS_FOLDER, name)

    // 检查是否已存在
    if (fs.existsSync(destPath)) {
      const confirmed = await callConfirmDialog('messages.warning', 'messages.overwriteConfirm', { name })

      if (!confirmed) {
        return { success: false, cancelled: true }
      }

      // 删除旧文件夹
      fs.rmSync(destPath, { recursive: true })
    }

    // 创建目标文件夹
    fs.mkdirSync(destPath, { recursive: true })

    return new Promise(resolve => {
      protocol
        .get(url, response => {
          // 处理重定向
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectUrl = new URL(response.headers.location, url)
            protocol
              .get(redirectUrl.toString(), redirectResponse => {
                handleDownload(redirectResponse, destPath, name).then(resolve)
              })
              .on('error', err => {
                resolve({ success: false, error: err.message })
              })
            return
          }

          if (response.statusCode !== 200) {
            resolve({ success: false, error: t('messages.downloadFailed', { code: response.statusCode }) })
            return
          }

          handleDownload(response, destPath, name).then(resolve)
        })
        .on('error', err => {
          resolve({ success: false, error: err.message })
        })
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 处理下载内容
function handleDownload(response, destPath, name) {
  return new Promise(resolve => {
    // 检测是否为 GitHub 仓库的 tarball/zipball
    const contentDisposition = response.headers['content-disposition']
    const contentType = response.headers['content-type'] || ''

    if (contentType.includes('application/zip') || contentType.includes('application/x-tar') || (contentDisposition && contentDisposition.includes('attachment'))) {
      // 下载为压缩包
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        try {
          const content = Buffer.concat(chunks)
          const tmpPath = path.join(app.getPath('temp'), `skill-${Date.now()}`)

          if (contentType.includes('zip') || (contentDisposition && contentDisposition.includes('.zip'))) {
            // ZIP 文件
            const admzip = require('adm-zip')
            fs.writeFileSync(tmpPath + '.zip', content)
            const zip = new admzip(tmpPath + '.zip')
            // 解压并提取第一个文件夹
            zip.extractAllTo(tmpPath, true)
            const entries = fs.readdirSync(tmpPath)
            const firstEntry = entries.find(e => fs.statSync(path.join(tmpPath, e)).isDirectory())
            if (firstEntry) {
              const extractedPath = path.join(tmpPath, firstEntry)
              const skillFiles = fs.readdirSync(extractedPath)
              for (const file of skillFiles) {
                fs.cpSync(path.join(extractedPath, file), path.join(destPath, file))
              }
            }
            fs.rmSync(tmpPath, { recursive: true, force: true })
            if (fs.existsSync(tmpPath + '.zip')) fs.unlinkSync(tmpPath + '.zip')
          } else {
            // TAR 文件
            fs.writeFileSync(tmpPath, content)
            // 使用 tar 解压 (需要系统有 tar 命令)
            const { execSync } = require('child_process')
            try {
              execSync(`tar -xf "${tmpPath}" -C "${tmpPath}-dir"`, { stdio: 'pipe' })
              const entries = fs.readdirSync(tmpPath + '-dir')
              const firstEntry = entries.find(e => fs.statSync(path.join(tmpPath + '-dir', e)).isDirectory())
              if (firstEntry) {
                const extractedPath = path.join(tmpPath + '-dir', firstEntry)
                const skillFiles = fs.readdirSync(extractedPath)
                for (const file of skillFiles) {
                  fs.cpSync(path.join(extractedPath, file), path.join(destPath, file))
                }
              }
              fs.rmSync(tmpPath, { recursive: true, force: true })
              if (fs.existsSync(tmpPath + '-dir')) fs.rmSync(tmpPath + '-dir', { recursive: true, force: true })
            } catch (e) {
              // 如果没有 tar 命令，尝试直接复制
              fs.cpSync(tmpPath, destPath, { recursive: true })
              fs.rmSync(tmpPath, { recursive: true, force: true })
            }
          }

          resolve({ success: true, message: t('messages.skillOnlineImportSuccess', { name }) })
        } catch (writeError) {
          resolve({ success: false, error: writeError.message })
        }
      })
    } else {
      // 直接下载文件内容
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        try {
          const content = Buffer.concat(chunks)
          // 假设下载的是 SKILL.md 内容
          const skillMdPath = path.join(destPath, 'SKILL.md')
          fs.writeFileSync(skillMdPath, content)
          resolve({ success: true, message: t('messages.skillOnlineImportSuccess', { name }) })
        } catch (writeError) {
          resolve({ success: false, error: writeError.message })
        }
      })
    }
  })
}

// 导出技能
ipcMain.handle('export-skill', async (event, name, folderName) => {
  try {
    const skillPath = path.join(SKILLS_FOLDER, folderName)

    if (!fs.existsSync(skillPath)) {
      return { success: false, error: 'messages.skillNotFound', name }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialogs.exportSkill'),
      buttonLabel: t('dialogs.selectExportLocation'),
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    const destPath = path.join(result.filePaths[0], folderName)

    // 如果目标已存在，删除
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true })
    }

    // 复制整个文件夹
    fs.cpSync(skillPath, destPath, { recursive: true })
    return { success: true, message: 'messages.skillExportSuccess', name }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 删除技能
ipcMain.handle('delete-skill', async (event, name) => {
  console.log('delete-skill called with:', name)
  try {
    const skillPath = path.join(SKILLS_FOLDER, name)
    console.log('Deleting skill at:', skillPath)
    console.log('Path exists:', fs.existsSync(skillPath))

    if (!fs.existsSync(skillPath)) {
      return { success: false, error: 'messages.skillNotFound', name }
    }

    fs.rmSync(skillPath, { recursive: true })
    console.log('Skill deleted successfully')
    return { success: true, message: 'messages.skillDeleteSuccess', name }
  } catch (error) {
    console.error('Delete skill error:', error)
    return { success: false, error: error.message }
  }
})

// Commands 管理
const COMMANDS_FOLDER = path.join(app.getPath('home'), '.iflow', 'commands')

// 确保 commands 文件夹存在
function ensureCommandsFolder() {
  if (!fs.existsSync(COMMANDS_FOLDER)) {
    fs.mkdirSync(COMMANDS_FOLDER, { recursive: true })
  }
}

// 解析 TOML 命令文件
function parseCommandFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, '.toml')

  // 解析 metadata 注释
  const metadata = {
    command: fileName,
    description: '',
    category: 'utility',
    version: '1',
    author: '',
  }

  const commentPatterns = {
    command: /# Command:\s*(.+)/,
    description: /# Description:\s*(.+)/,
    category: /# Category:\s*(.+)/,
    version: /# Version:\s*(.+)/,
    author: /# Author:\s*(.+)/,
  }

  for (const [key, pattern] of Object.entries(commentPatterns)) {
    const match = content.match(pattern)
    if (match) {
      metadata[key] = match[1].trim()
    }
  }

  // 解析 TOML 键值
  let tomlData = {}
  try {
    const toml = require('@iarna/toml')
    tomlData = toml.parse(content)
  } catch (e) {
    console.error('Failed to parse TOML:', e)
  }

  return {
    name: fileName,
    description: tomlData.description || metadata.description || '',
    category: metadata.category || 'utility',
    version: metadata.version || '1',
    author: metadata.author || '',
    prompt: tomlData.prompt || '',
    fileName,
  }
}

// 生成 TOML 命令文件内容
function generateCommandContent(data) {
  let content = `# Command: ${data.name}\n`
  content += `# Description: ${data.description}\n`
  content += `# Category: ${data.category || 'utility'}\n`
  content += `# Version: ${data.version || '1'}\n`
  content += `# Author: ${data.author || ''}\n`
  content += `description = ${JSON.stringify(data.description || '')}\n`
  content += `prompt = """\n${data.prompt || ''}\n"""\n`
  return content
}

// 列出所有命令
ipcMain.handle('list-commands', async () => {
  try {
    ensureCommandsFolder()
    const files = fs.readdirSync(COMMANDS_FOLDER)
    const commands = []
    for (const file of files) {
      if (!file.endsWith('.toml')) continue
      try {
        const filePath = path.join(COMMANDS_FOLDER, file)
        const stat = fs.statSync(filePath)
        if (!stat.isFile()) continue
        const cmd = parseCommandFile(filePath)
        commands.push(cmd)
      } catch (e) {
        console.error(`Failed to parse command file ${file}:`, e)
      }
    }
    return { success: true, commands }
  } catch (error) {
    return { success: false, error: error.message, commands: [] }
  }
})

// 读取单个命令
ipcMain.handle('read-command', async (event, name) => {
  try {
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound') }
    }
    const cmd = parseCommandFile(filePath)
    return { success: true, command: cmd }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 创建新命令
ipcMain.handle('create-command', async (event, name, data) => {
  try {
    // 验证名称：只允许字母、数字、中划线、下划线
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return { success: false, error: t('errors.commandInvalidName') }
    }
    ensureCommandsFolder()
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandAlreadyExists') }
    }
    const content = generateCommandContent({ name, ...data })
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 更新命令
ipcMain.handle('update-command', async (event, name, data) => {
  try {
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound') }
    }
    const content = generateCommandContent({ name, ...data })
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 删除命令
ipcMain.handle('delete-command', async (event, name) => {
  try {
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound') }
    }
    fs.unlinkSync(filePath)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 导出命令
ipcMain.handle('export-command', async (event, name) => {
  try {
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound') }
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialogs.exportCommand', { defaultValue: 'Export Command' }),
      buttonLabel: t('dialogs.selectExportLocation'),
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }
    const destPath = path.join(result.filePaths[0], `${name}.toml`)
    fs.copyFileSync(filePath, destPath)
    return { success: true, message: 'messages.commandExported', name }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 导入命令（从本地 .toml 文件）
ipcMain.handle('import-command', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialogs.importCommand', { defaultValue: 'Import Command' }),
      filters: [
        { name: 'TOML Files', extensions: ['toml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }
    ensureCommandsFolder()
    const imported = []
    for (const sourcePath of result.filePaths) {
      try {
        const cmd = parseCommandFile(sourcePath)
        const destPath = path.join(COMMANDS_FOLDER, `${cmd.name}.toml`)
        if (fs.existsSync(destPath)) {
          const confirmed = await callConfirmDialog('messages.warning', 'messages.overwriteCommandConfirm', { name: cmd.name })
          if (!confirmed) continue
        }
        fs.copyFileSync(sourcePath, destPath)
        imported.push(cmd.name)
      } catch (e) {
        console.error(`Failed to import command from ${sourcePath}:`, e)
      }
    }
    return { success: true, imported }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
