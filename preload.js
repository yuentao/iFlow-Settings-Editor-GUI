const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 基本设置操作
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),

  // 确认对话框结果回调
  confirmDialogResult: (requestId, confirmed) => ipcRenderer.send('confirm-dialog-result', { requestId, confirmed }),

  // 监听主进程的确认对话框请求
  onShowConfirmRequest: (callback) => {
    ipcRenderer.on('show-confirm-request', (event, request) => callback(request))
  },

  // 开机自启动
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),

  // 自动更新设置
  getAutoUpdate: () => ipcRenderer.invoke('get-auto-update'),
  setAutoUpdate: (enabled) => ipcRenderer.invoke('set-auto-update', enabled),

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

  // 更新相关 API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openReleasePage: () => ipcRenderer.invoke('open-release-page'),

  // 更新事件监听
  onUpdateStatusChanged: (callback) => {
    ipcRenderer.on('update-status-changed', (event, state) => callback(state))
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info))
  },
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event) => callback())
  },
  onAutoCheckUpdate: (callback) => {
    ipcRenderer.on('auto-check-update', (event) => callback())
  },
  onInstallUpdate: (callback) => {
    ipcRenderer.on('install-update', (event) => callback())
  },

  // 移除更新事件监听
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-status-changed')
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('update-download-progress')
    ipcRenderer.removeAllListeners('update-downloaded')
    ipcRenderer.removeAllListeners('auto-check-update')
    ipcRenderer.removeAllListeners('install-update')
  },

  // 获取翻译文本（供主进程使用）
  getTranslation: (localeData) => {
    return localeData
  },

  // 发送翻译数据给主进程
  sendTranslation: (translations) => {
    ipcRenderer.send('set-main-translations', translations)
  },
})