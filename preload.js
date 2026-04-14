const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getCurrentConfig: () => ipcRenderer.invoke('get-current-config'),
  listConfigs: () => ipcRenderer.invoke('list-configs'),
  createConfig: (name) => ipcRenderer.invoke('create-config', name),
  deleteConfig: (filePath) => ipcRenderer.invoke('delete-config', filePath),
  switchConfig: (filePath) => ipcRenderer.invoke('switch-config', filePath)
})

