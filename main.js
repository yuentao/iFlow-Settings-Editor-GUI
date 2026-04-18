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
    tooltip: 'iFlow 设置编辑器',
  },
  'en-US': {
    showWindow: 'Show Window',
    switchApiConfig: 'Switch API Config',
    exit: 'Exit',
    tooltip: 'iFlow Settings Editor',
  },
  'ja-JP': {
    showWindow: 'メインウィンドウを表示',
    switchApiConfig: 'API 設定切替',
    exit: '終了',
    tooltip: 'iFlow 設定エディタ',
  },
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
    switchFailed: '切换API配置失败',
  },
  'en-US': {
    configNotFound: 'Configuration file not found',
    configNotExist: 'Configuration "{name}" does not exist',
    configAlreadyExists: 'Configuration "{name}" already exists',
    cannotDeleteDefault: 'Cannot delete default configuration',
    cannotRenameDefault: 'Cannot rename default configuration',
    switchFailed: 'Failed to switch API configuration',
  },
  'ja-JP': {
    configNotFound: '設定ファイルが存在しません',
    configNotExist: 'プロファイル "{name}" が存在しません',
    configAlreadyExists: 'プロファイル "{name}" が既に存在します',
    cannotDeleteDefault: 'デフォルトプロファイルは削除できません',
    cannotRenameDefault: 'デフォルトプロファイルは名前変更できません',
    switchFailed: 'API 設定の切替に失敗しました',
  },
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
  const profileList = Object.keys(profiles).length > 0 ? Object.keys(profiles) : ['default']

  const profileMenuItems = profileList.map(name => ({
    label: name + (name === currentProfile ? ' ✓' : ''),
    type: 'radio',
    checked: name === currentProfile,
    click: () => switchApiProfileFromTray(name),
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
      },
    },
    { type: 'separator' },
    {
      label: t.switchApiConfig,
      submenu: profileMenuItems,
    },
    { type: 'separator' },
    {
      label: t.exit,
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
      title: '导入技能',
      filters: [
        { name: '技能压缩包', extensions: ['zip'] },
        { name: '所有文件', extensions: ['*'] },
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
        return { success: false, error: `压缩包中未找到有效的技能文件夹（缺少 SKILL.md）\n解压内容:\n${allFiles.slice(0, 20).join('\n')}` }
      }

      const destPath = path.join(SKILLS_FOLDER, skillName)

      // 如果技能已存在，询问是否覆盖
      if (fs.existsSync(destPath)) {
        const overwrite = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: '技能已存在',
          message: `技能 "${skillName}" 已存在，是否覆盖？`,
          buttons: ['覆盖', '取消'],
          defaultId: 1,
        })

        if (overwrite.response === 1) {
          return { success: false, cancelled: true }
        }

        fs.rmSync(destPath, { recursive: true })
      }

      // 复制技能文件夹
      fs.cpSync(skillFolder, destPath, { recursive: true })
      return { success: true, message: `技能 "${skillName}" 导入成功` }
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
      const overwrite = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: '技能已存在',
        message: `技能 "${name}" 已存在，是否覆盖？`,
        buttons: ['覆盖', '取消'],
        defaultId: 1,
      })

      if (overwrite.response === 1) {
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
            resolve({ success: false, error: `下载失败: HTTP ${response.statusCode}` })
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

          resolve({ success: true, message: `技能 "${name}" 在线导入成功` })
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
          resolve({ success: true, message: `技能 "${name}" 在线导入成功` })
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
      return { success: false, error: `技能 "${name}" 不存在` }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导出技能到',
      buttonLabel: '选择导出位置',
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
    return { success: true, message: `技能 "${name}" 导出成功` }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 删除技能
ipcMain.handle('delete-skill', async (event, name) => {
  try {
    const skillPath = path.join(SKILLS_FOLDER, name)

    if (!fs.existsSync(skillPath)) {
      return { success: false, error: `技能 "${name}" 不存在` }
    }

    const confirmed = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '确认删除',
      message: `确定要删除技能 "${name}" 吗？`,
      buttons: ['删除', '取消'],
      defaultId: 1,
    })

    if (confirmed.response === 1) {
      return { success: false, cancelled: true }
    }

    fs.rmSync(skillPath, { recursive: true })
    return { success: true, message: `技能 "${name}" 已删除` }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
