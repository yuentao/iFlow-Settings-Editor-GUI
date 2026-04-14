const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('main.js loaded');
console.log('app.getPath("home"):', app.getPath('home'));

const SETTINGS_FILE = path.join(app.getPath('home'), '.iflow', 'settings.json');
console.log('SETTINGS_FILE:', SETTINGS_FILE);

let mainWindow;

const isDev = process.argv.includes('--dev');

function createWindow() {
  console.log('Creating window...');

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#f3f3f3',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  console.log('Loading index.html...');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
  console.log('index.html loading initiated');

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Console [' + level + ']:', message);
  });

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow.close());

ipcMain.handle('is-maximized', () => mainWindow.isMaximized());

// IPC Handlers
ipcMain.handle('load-settings', async () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { success: false, error: 'File not found', data: null };
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const json = JSON.parse(data);
    return { success: true, data: json };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
});

ipcMain.handle('save-settings', async (event, data) => {
  try {
    // Backup
    if (fs.existsSync(SETTINGS_FILE)) {
      const backupPath = SETTINGS_FILE + '.bak';
      fs.copyFileSync(SETTINGS_FILE, backupPath);
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-message', async (event, { type, title, message }) => {
  return dialog.showMessageBox(mainWindow, { type, title, message });
});
