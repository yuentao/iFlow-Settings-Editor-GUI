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
    const handler = (event, request) => callback(request)
    ipcRenderer.on('show-confirm-request', handler)
    return () => ipcRenderer.removeListener('show-confirm-request', handler)
  },

  // 平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // 亚克力效果开关
  setAcrylicEnabled: (enabled) => ipcRenderer.invoke('set-acrylic-enabled', enabled),

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
  pingApiProfile: (baseUrl) => ipcRenderer.invoke('ping-api-profile', baseUrl),

  // 托盘事件监听
  onApiProfileSwitched: (callback) => {
    const handler = (event, profileName) => callback(profileName)
    ipcRenderer.on('api-profile-switched', handler)
    return () => ipcRenderer.removeListener('api-profile-switched', handler)
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
    const handler = (event, state) => callback(state)
    ipcRenderer.on('update-status-changed', handler)
    return () => ipcRenderer.removeListener('update-status-changed', handler)
  },
  onUpdateAvailable: (callback) => {
    const handler = (event, info) => callback(info)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onUpdateDownloadProgress: (callback) => {
    const handler = (event, progress) => callback(progress)
    ipcRenderer.on('update-download-progress', handler)
    return () => ipcRenderer.removeListener('update-download-progress', handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (event) => callback()
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },
  onUpdateBackgroundComplete: (callback) => {
    const handler = (event, info) => callback(info)
    ipcRenderer.on('update-background-complete', handler)
    return () => ipcRenderer.removeListener('update-background-complete', handler)
  },
  onAutoCheckUpdate: (callback) => {
    const handler = (event) => callback()
    ipcRenderer.on('auto-check-update', handler)
    return () => ipcRenderer.removeListener('auto-check-update', handler)
  },
  onInstallUpdate: (callback) => {
    const handler = (event) => callback()
    ipcRenderer.on('install-update', handler)
    return () => ipcRenderer.removeListener('install-update', handler)
  },

  // 待安装更新相关 API
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  clearPendingUpdate: () => ipcRenderer.invoke('clear-pending-update'),
  restorePendingUpdate: () => ipcRenderer.invoke('restore-pending-update'),

  // 更新历史相关 API
  getUpdateHistory: () => ipcRenderer.invoke('get-update-history'),
  saveUpdateHistory: (history) => ipcRenderer.invoke('save-update-history', history),

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
  cloudSyncSetAutoSync: (enabled, interval) => ipcRenderer.invoke('cloud-sync:set-auto-sync', enabled, interval),
  cloudSyncConfigureProvider: (provider, config, testOnly) => ipcRenderer.invoke('cloud-sync:configure-provider', provider, config, testOnly),
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
  cloudSyncSetTombstoneRetentionDays: (days) => ipcRenderer.invoke('cloud-sync:set-tombstone-retention-days', days),
  cloudSyncSetSyncInterval: (minutes) => ipcRenderer.invoke('cloud-sync:set-sync-interval', minutes),
  cloudSyncRemoveDevice: (deviceId) => ipcRenderer.invoke('cloud-sync:remove-device', deviceId),

  // 外部链接
      openExternal: (url) => ipcRenderer.invoke('open-external', url),
      openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),

  // 日志管理
  getLogDir: () => ipcRenderer.invoke('get-log-dir'),
      clearLogs: () => ipcRenderer.invoke('clear-logs'),
      getLogLevel: () => ipcRenderer.invoke('get-log-level'),
      setLogLevel: (level) => ipcRenderer.invoke('set-log-level', level),  // 项目会话管理
  listProjects: () => ipcRenderer.invoke('projects:list'),
  getProjectSessions: (projectId, options) => ipcRenderer.invoke('projects:sessions:list', projectId, options),
  getSessionMessages: (projectId, sessionId, options) => ipcRenderer.invoke('projects:sessions:messages', projectId, sessionId, options),
  deleteSession: (projectId, sessionId) => ipcRenderer.invoke('projects:sessions:delete', projectId, sessionId),
  deleteProject: (projectId) => ipcRenderer.invoke('projects:delete', projectId),
  deleteMessages: (projectId, sessionId, messageUuids) => ipcRenderer.invoke('projects:messages:delete', projectId, sessionId, messageUuids),
  exportSession: (projectId, sessionId, format) => ipcRenderer.invoke('projects:sessions:export', projectId, sessionId, format),
  searchSessions: (query, options) => ipcRenderer.invoke('projects:search', query, options),
  getSessionStats: (projectId, sessionId) => ipcRenderer.invoke('projects:sessions:stats', projectId, sessionId),
  getAllSessionMessagesForStats: (days) => ipcRenderer.invoke('projects:messages:for-stats', days),

  // iFlow Mod 管理
  iflowGetIflowVersion: () => ipcRenderer.invoke('iflow:get-version'),
  iflowListMods: () => ipcRenderer.invoke('iflow:list-mods'),
  iflowGetModCompatibility: (modId) => ipcRenderer.invoke('iflow:get-mod-compatibility', modId),
  iflowEnableMod: (modId, enabled) => ipcRenderer.invoke('iflow:enable-mod', modId, enabled),
  iflowDeleteMod: (modId) => ipcRenderer.invoke('iflow:delete-mod', modId),
  iflowExportMod: (modId) => ipcRenderer.invoke('iflow:export-mod', modId),
  iflowImportMod: (filePath) => ipcRenderer.invoke('iflow:import-mod', filePath),
  iflowOpenImportDialog: () => ipcRenderer.invoke('iflow:open-import-dialog'),
  iflowCheckIflowStatus: () => ipcRenderer.invoke('iflow:check-iflow-status'),

  // iFlow Mod 进度事件监听
  onIflowApplyProgress: (callback) => {
    const handler = (_event, progress) => callback(progress)
    ipcRenderer.on('iflow:apply-progress', handler)
    return () => ipcRenderer.removeListener('iflow:apply-progress', handler)
  },
  onIflowDetectConflictsProgress: (callback) => {
    const handler = (_event, progress) => callback(progress)
    ipcRenderer.on('iflow:detect-conflicts-progress', handler)
    return () => ipcRenderer.removeListener('iflow:detect-conflicts-progress', handler)
  },

  // 文件变化监听（外部修改 settings.json）
  onSettingsFileChanged: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('settings-file-changed', handler)
    return () => ipcRenderer.removeListener('settings-file-changed', handler)
  },

  // 云同步事件监听
  onCloudSyncStatusChanged: (callback) => {
    const handler = (_event, state) => callback(state)
    ipcRenderer.on('cloud-sync:status-changed', handler)
    return () => ipcRenderer.removeListener('cloud-sync:status-changed', handler)
  },
  onCloudSyncProgress: (callback) => {
    const handler = (_event, progress) => callback(progress)
    ipcRenderer.on('cloud-sync:sync-progress', handler)
    return () => ipcRenderer.removeListener('cloud-sync:sync-progress', handler)
  },
  onCloudSyncConflict: (callback) => {
    const handler = (_event, info) => callback(info)
    ipcRenderer.on('cloud-sync:conflict-detected', handler)
    return () => ipcRenderer.removeListener('cloud-sync:conflict-detected', handler)
  },
})