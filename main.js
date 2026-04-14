const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

console.log('main.js loaded')
console.log('app.getPath(\"home\"):', app.getPath('home'))

const DEFAULT_SETTINGS_FILE = path.join(app.getPath('home'), '.iflow', 'settings.json')
const CONFIG_DIR = path.join(app.getPath('home'), '.iflow', 'configs')
console.log('DEFAULT_SETTINGS_FILE:', DEFAULT_SETTINGS_FILE)
console.log('CONFIG_DIR:', CONFIG_DIR)

let currentSettingsFile = DEFAULT_SETTINGS_FILE
let mainWindow

const isDev = process.argv.includes('--dev')

function createWindow() {
  console.log('Creating window...')

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#f3f3f3',
    frame: false,
    show: false,
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
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
ipcMain.on('window-close', () => mainWindow.close())

ipcMain.handle('is-maximized', () => mainWindow.isMaximized())

// Get current config file path
ipcMain.handle('get-current-config', () => {
  return { filePath: currentSettingsFile, fileName: path.basename(currentSettingsFile) }
})

// List all config files
ipcMain.handle('list-configs', async () => {
  try {
    const configs = []
    // Always include default settings
    if (fs.existsSync(DEFAULT_SETTINGS_FILE)) {
      const stats = fs.statSync(DEFAULT_SETTINGS_FILE)
      configs.push({
        name: '默认配置',
        filePath: DEFAULT_SETTINGS_FILE,
        modified: stats.mtime
      })
    }
    // Add configs from CONFIG_DIR
    if (fs.existsSync(CONFIG_DIR)) {
      const files = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const filePath = path.join(CONFIG_DIR, file)
        const stats = fs.statSync(filePath)
        configs.push({
          name: file.replace('.json', ''),
          filePath: filePath,
          modified: stats.mtime
        })
      }
    } else {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    return { success: true, configs: configs }
  } catch (error) {
    return { success: false, error: error.message, configs: [] }
  }
})

// Create new config
ipcMain.handle('create-config', async (event, name) => {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    const fileName = name + '.json'
    const filePath = path.join(CONFIG_DIR, fileName)
    if (fs.existsSync(filePath)) {
      return { success: false, error: '配置文件已存在' }
    }
    let data = {}
    if (fs.existsSync(currentSettingsFile)) {
      const content = fs.readFileSync(currentSettingsFile, 'utf-8')
      data = JSON.parse(content)
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, filePath: filePath }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Delete config
ipcMain.handle('delete-config', async (event, filePath) => {
  try {
    if (filePath === DEFAULT_SETTINGS_FILE) {
      return { success: false, error: '不能删除默认配置' }
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Switch to config
ipcMain.handle('switch-config', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '配置文件不存在' }
    }
    currentSettingsFile = filePath
    return { success: true, filePath: currentSettingsFile }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// IPC Handlers
ipcMain.handle('load-settings', async () => {
  try {
    if (!fs.existsSync(currentSettingsFile)) {
      return { success: false, error: 'File not found', data: null }
    }
    const data = fs.readFileSync(currentSettingsFile, 'utf-8')
    const json = JSON.parse(data)
    return { success: true, data: json }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
})

ipcMain.handle('save-settings', async (event, data) => {
  try {
    if (fs.existsSync(currentSettingsFile)) {
      const backupPath = currentSettingsFile + '.bak'
      fs.copyFileSync(currentSettingsFile, backupPath)
    }
    fs.writeFileSync(currentSettingsFile, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('show-message', async (event, { type, title, message }) => {
  return dialog.showMessageBox(mainWindow, { type, title, message })
})
