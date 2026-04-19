const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 基本设置操作
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),

  // 开机自启动
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),

  // 窗口控制
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // API 配置管理（单文件内多配置）
  listApiProfiles: () => ipcRenderer.invoke('list-api-profiles'),
  switchApiProfile: (profileName) => ipcRenderer.invoke('switch-api-profile', profileName),
  createApiProfile: (name) => ipcRenderer.invoke('create-api-profile', name),
  deleteApiProfile: (name) => ipcRenderer.invoke('delete-api-profile', name),
  renameApiProfile: (oldName, newName) => ipcRenderer.invoke('rename-api-profile', oldName, newName),
  duplicateApiProfile: (sourceName, newName) => ipcRenderer.invoke('duplicate-api-profile', sourceName, newName),

  // 托盘事件监听
  onApiProfileSwitched: (callback) => {
    ipcRenderer.on('api-profile-switched', (event, profileName) => callback(profileName))
  },

  // 语言切换通知
  notifyLanguageChanged: () => {
    ipcRenderer.send('language-changed')
  },

  // 技能管理
  listSkills: () => ipcRenderer.invoke('list-skills'),
  importSkillLocal: () => ipcRenderer.invoke('import-skill-local'),
  importSkillOnline: (url, name) => ipcRenderer.invoke('import-skill-online', url, name),
  exportSkill: (name, fileName) => ipcRenderer.invoke('export-skill', name, fileName),
  deleteSkill: (name) => ipcRenderer.invoke('delete-skill', name),
})