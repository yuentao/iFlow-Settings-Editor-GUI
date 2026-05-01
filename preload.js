const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 基本设置操作
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

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
  fetchModels: (baseUrl, apiKey) => ipcRenderer.invoke('fetch-models', baseUrl, apiKey),

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

  // Commands 管理
  listCommands: () => ipcRenderer.invoke('list-commands'),
  readCommand: (name) => ipcRenderer.invoke('read-command', name),
  createCommand: (name, data) => ipcRenderer.invoke('create-command', name, data),
  updateCommand: (name, data) => ipcRenderer.invoke('update-command', name, data),
  deleteCommand: (name) => ipcRenderer.invoke('delete-command', name),
  exportCommand: (name) => ipcRenderer.invoke('export-command', name),
  importCommand: () => ipcRenderer.invoke('import-command'),

  // 更新相关 API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  downloadUpdateBackground: () => ipcRenderer.invoke('download-update-background'),
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
  onUpdateBackgroundComplete: (callback) => {
    ipcRenderer.on('update-background-complete', (event, info) => callback(info))
  },
  removeUpdateListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },
  onAutoCheckUpdate: (callback) => {
    ipcRenderer.on('auto-check-update', (event) => callback())
  },
  onInstallUpdate: (callback) => {
    ipcRenderer.on('install-update', (event) => callback())
  },

  // 待安装更新相关 API
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  clearPendingUpdate: () => ipcRenderer.invoke('clear-pending-update'),
  restorePendingUpdate: () => ipcRenderer.invoke('restore-pending-update'),

  // 移除更新事件监听
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-status-changed')
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('update-download-progress')
    ipcRenderer.removeAllListeners('update-downloaded')
    ipcRenderer.removeAllListeners('update-background-complete')
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

  // 云同步
  cloudSyncGetStatus: () => ipcRenderer.invoke('cloud-sync:get-status'),
  cloudSyncSetAutoSync: (enabled) => ipcRenderer.invoke('cloud-sync:set-auto-sync', enabled),
  cloudSyncConfigureProvider: (provider, config) => ipcRenderer.invoke('cloud-sync:configure-provider', provider, config),
  cloudSyncTestConnection: () => ipcRenderer.invoke('cloud-sync:test-connection'),
  cloudSyncRevokeAuth: () => ipcRenderer.invoke('cloud-sync:revoke-auth'),
  cloudSyncSetPassword: (password) => ipcRenderer.invoke('cloud-sync:set-password', password),
  cloudSyncVerifyPassword: (password) => ipcRenderer.invoke('cloud-sync:verify-password', password),
  cloudSyncChangePassword: (oldPassword, newPassword) => ipcRenderer.invoke('cloud-sync:change-password', oldPassword, newPassword),
  cloudSyncHasPassword: () => ipcRenderer.invoke('cloud-sync:has-password'),
  cloudSyncHasCachedPassword: () => ipcRenderer.invoke('cloud-sync:has-cached-password'),
  cloudSyncGetRememberPassword: () => ipcRenderer.invoke('cloud-sync:get-remember-password'),
  cloudSyncSetRememberPassword: (remember) => ipcRenderer.invoke('cloud-sync:set-remember-password', remember),
  cloudSyncSyncNow: (password) => ipcRenderer.invoke('cloud-sync:sync-now', password),
  cloudSyncPull: (password) => ipcRenderer.invoke('cloud-sync:pull', password),
  cloudSyncPush: (password) => ipcRenderer.invoke('cloud-sync:push', password),
  cloudSyncClearCloud: () => ipcRenderer.invoke('cloud-sync:clear-cloud'),
  cloudSyncGetDevices: () => ipcRenderer.invoke('cloud-sync:get-devices'),
  cloudSyncSetDeviceName: (name) => ipcRenderer.invoke('cloud-sync:set-device-name', name),
  cloudSyncRemoveDevice: (deviceId) => ipcRenderer.invoke('cloud-sync:remove-device', deviceId),

  // 云同步事件监听
  onCloudSyncStatusChanged: (callback) => {
    ipcRenderer.on('cloud-sync:status-changed', (_event, state) => callback(state))
  },
  onCloudSyncProgress: (callback) => {
    ipcRenderer.on('cloud-sync:sync-progress', (_event, progress) => callback(progress))
  },
  onCloudSyncConflict: (callback) => {
    ipcRenderer.on('cloud-sync:conflict-detected', (_event, info) => callback(info))
  },
})