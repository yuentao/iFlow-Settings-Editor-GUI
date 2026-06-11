/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
    // ─── 设置操作 ─────────────────────────────────────────
    loadSettings: () => Promise<import('./shared/types').IpcResult<import('./shared/types').Settings>>
    saveSettings: (data: import('./shared/types').Settings) => Promise<import('./shared/types').IpcResult>
    showMessage: (options: import('./shared/types').MessageBoxOptions) => Promise<import('./shared/types').IpcResult>
    showConfirmDialog: (options: import('./shared/types').ConfirmDialogOptions) => Promise<import('./shared/types').IpcResult<boolean>>
    showOpenDialog: (options: import('./shared/types').OpenDialogOptions) => Promise<import('./shared/types').IpcResult<{ canceled: boolean; filePaths: string[] }>>

    // ─── 确认对话框 ───────────────────────────────────────
    confirmDialogResult: (requestId: string, confirmed: boolean) => void
    onShowConfirmRequest: (callback: (request: import('./shared/types').ConfirmDialogRequest) => void) => void

    // ─── 亚克力效果 ───────────────────────────────────────
    setAcrylicEnabled: (enabled: boolean) => Promise<import('./shared/types').IpcResult>

    // ─── 开机自启动 ───────────────────────────────────────
    getAutoLaunch: () => Promise<import('./shared/types').IpcResult<boolean>>
    setAutoLaunch: (enabled: boolean) => Promise<import('./shared/types').IpcResult>

    // ─── 自动更新设置 ─────────────────────────────────────
    getAutoUpdate: () => Promise<import('./shared/types').IpcResult<boolean>>
    setAutoUpdate: (enabled: boolean) => Promise<import('./shared/types').IpcResult>

    // ─── 窗口控制 ─────────────────────────────────────────
    isMaximized: () => Promise<import('./shared/types').IpcResult<boolean>>
    minimize: () => void
    maximize: () => void
    close: () => void

    // ─── API 配置管理 ─────────────────────────────────────
    listApiProfiles: () => Promise<import('./shared/types').ListApiProfilesResult>
    switchApiProfile: (profileName: string) => Promise<import('./shared/types').SwitchApiProfileResult>
    createApiProfile: (name: string) => Promise<import('./shared/types').IpcResult>
    deleteApiProfile: (name: string) => Promise<import('./shared/types').DeleteApiProfileResult>
    renameApiProfile: (oldName: string, newName: string) => Promise<import('./shared/types').IpcResult>
    duplicateApiProfile: (sourceName: string, newName: string) => Promise<import('./shared/types').IpcResult>
    fetchModels: (baseUrl: string, apiKey: string) => Promise<import('./shared/types').IpcResult & { models?: { id: string; owned_by: string }[] }>
    pingApiProfile: (baseUrl: string) => Promise<import('./shared/types').IpcResult<{ latency: number | null; reachable: boolean }>>

    // ─── 托盘事件 ─────────────────────────────────────────
    onApiProfileSwitched: (callback: (profileName: string) => void) => void

    // ─── 语言 ─────────────────────────────────────────────
    notifyLanguageChanged: () => void
    sendTranslation: (translations: any) => void

    // ─── 技能管理 ─────────────────────────────────────────
    listSkills: () => Promise<import('./shared/types').ListSkillsResult>
    importSkillLocal: () => Promise<import('./shared/types').IpcCancelResult>
    importSkillOnline: (url: string, name: string) => Promise<import('./shared/types').IpcCancelResult>
    exportSkill: (name: string, folderName: string) => Promise<import('./shared/types').IpcCancelResult>
    deleteSkill: (name: string) => Promise<import('./shared/types').IpcResult>

    // ─── 命令管理 ─────────────────────────────────────────
    listCommands: () => Promise<import('./shared/types').ListCommandsResult>
    readCommand: (name: string) => Promise<import('./shared/types').ReadCommandResult>
    createCommand: (name: string, data: import('./shared/types').CommandFormData) => Promise<import('./shared/types').IpcResult>
    updateCommand: (name: string, data: import('./shared/types').CommandFormData) => Promise<import('./shared/types').IpcResult>
    deleteCommand: (name: string) => Promise<import('./shared/types').IpcResult>
    exportCommand: (name: string) => Promise<import('./shared/types').IpcCancelResult>
    importCommand: () => Promise<import('./shared/types').ImportCommandResult>

    // ─── 更新相关 ─────────────────────────────────────────
    checkForUpdates: () => Promise<import('./shared/types').CheckUpdateResult>
    downloadUpdate: () => Promise<import('./shared/types').IpcCancelResult>
    downloadUpdateBackground: () => Promise<import('./shared/types').IpcCancelResult>
    cancelDownload: () => Promise<import('./shared/types').IpcResult>
    installUpdate: () => Promise<import('./shared/types').IpcResult>
    getUpdateStatus: () => Promise<import('./shared/types').IpcResult<import('./shared/types').UpdateState>>
    getAppVersion: () => Promise<import('./shared/types').AppVersionResult>
    openReleasePage: () => Promise<import('./shared/types').IpcResult>
    getPendingUpdate: () => Promise<import('./shared/types').IpcResult<{ pending: import('./shared/types').PendingUpdateInfo | null }>>
    clearPendingUpdate: () => Promise<import('./shared/types').IpcResult>
    restorePendingUpdate: () => Promise<import('./shared/types').IpcResult<{ restored: boolean; pending?: import('./shared/types').PendingUpdateInfo }>>
    getUpdateHistory: () => Promise<import('./shared/types').GetUpdateHistoryResult>
    saveUpdateHistory: (history: import('./shared/types').UpdateHistoryEntry[]) => Promise<import('./shared/types').IpcResult>

    // ─── 更新事件监听 ─────────────────────────────────────
    onUpdateStatusChanged: (callback: (state: import('./shared/types').UpdateState) => void) => void
    onUpdateAvailable: (callback: (info: import('./shared/types').UpdateInfo) => void) => void
    onUpdateDownloadProgress: (callback: (progress: number) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    onUpdateBackgroundComplete: (callback: (info: { version: string; downloadPath: string }) => void) => void
    onAutoCheckUpdate: (callback: () => void) => void
    onInstallUpdate: (callback: () => void) => void

    // ─── 外部链接/路径 ────────────────────────────────────
    openExternal: (url: string) => Promise<import('./shared/types').IpcResult>
    openPath: (filePath: string) => Promise<import('./shared/types').IpcResult>

    // ─── 日志管理 ─────────────────────────────────────────
    getLogDir: () => Promise<import('./shared/types').IpcResult<{ path: string; totalSize: number; fileCount: number }>>
    clearLogs: () => Promise<import('./shared/types').IpcResult<{ clearedSize: number; clearedCount: number }>>

    // ─── 云同步 ───────────────────────────────────────────
    cloudSyncGetStatus: () => Promise<import('./shared/types').IpcResult>
    cloudSyncSetAutoSync: (enabled: boolean) => Promise<import('./shared/types').IpcResult>
    cloudSyncConfigureProvider: (provider: string, config: any, testOnly?: boolean) => Promise<import('./shared/types').IpcResult>
    cloudSyncTestConnection: () => Promise<import('./shared/types').IpcResult>
    cloudSyncRevokeAuth: () => Promise<import('./shared/types').IpcResult>
    cloudSyncSetPassword: (password: string) => Promise<import('./shared/types').IpcResult>
    cloudSyncVerifyPassword: (password: string) => Promise<import('./shared/types').IpcResult<boolean>>
    cloudSyncChangePassword: (oldPassword: string, newPassword: string) => Promise<import('./shared/types').IpcResult>
    cloudSyncHasPassword: () => Promise<import('./shared/types').IpcResult<boolean>>
    cloudSyncHasCachedPassword: () => Promise<import('./shared/types').IpcResult<boolean>>
    cloudSyncGetRememberPassword: () => Promise<import('./shared/types').IpcResult<boolean>>
    cloudSyncSetRememberPassword: (remember: boolean) => Promise<import('./shared/types').IpcResult>
    cloudSyncSyncNow: (password?: string) => Promise<import('./shared/types').IpcResult>
    cloudSyncPull: (password?: string) => Promise<import('./shared/types').IpcResult>
    cloudSyncPush: (password?: string) => Promise<import('./shared/types').IpcResult>
    cloudSyncClearCloud: () => Promise<import('./shared/types').IpcResult>
    cloudSyncGetDevices: () => Promise<import('./shared/types').IpcResult>
    cloudSyncSetDeviceName: (name: string) => Promise<import('./shared/types').IpcResult>
    cloudSyncSetTombstoneRetentionDays: (days: number) => Promise<import('./shared/types').IpcResult>
    cloudSyncRemoveDevice: (deviceId: string) => Promise<import('./shared/types').IpcResult>

    // ─── 云同步事件监听 ───────────────────────────────────
    onCloudSyncStatusChanged: (callback: (state: any) => void) => void
    onCloudSyncProgress: (callback: (progress: number) => void) => void
    onCloudSyncConflict: (callback: (info: any) => void) => void

    // ─── 项目会话管理 ─────────────────────────────────────
    listProjects: () => Promise<import('./shared/types').IpcResult>
    getProjectSessions: (projectId: string, options?: any) => Promise<import('./shared/types').IpcResult>
    getSessionMessages: (projectId: string, sessionId: string, options?: any) => Promise<import('./shared/types').IpcResult>
    deleteSession: (projectId: string, sessionId: string) => Promise<import('./shared/types').IpcResult>
    deleteProject: (projectId: string) => Promise<import('./shared/types').IpcResult>
    deleteMessages: (projectId: string, sessionId: string, messageUuids: string[]) => Promise<import('./shared/types').IpcResult>
    exportSession: (projectId: string, sessionId: string, format?: string) => Promise<import('./shared/types').IpcResult>
    searchSessions: (query: string, options?: any) => Promise<import('./shared/types').IpcResult>
    getSessionStats: (projectId: string, sessionId: string) => Promise<import('./shared/types').IpcResult>
    getAllSessionMessagesForStats: (days: number) => Promise<import('./shared/types').IpcResult>

    // ─── 文件变化监听 ─────────────────────────────────────
    onSettingsFileChanged: (callback: () => void) => void

    // ─── iFlow Mod 管理 ──────────────────────────────────
    iflowGetIflowVersion: () => Promise<import('./shared/types').IflowVersionResult>
    iflowListMods: () => Promise<import('./shared/types').ListModsResult>
    iflowGetModCompatibility: (modId: string) => Promise<import('./shared/types').ModCompatibilityResult>
    iflowEnableMod: (modId: string, enabled: boolean) => Promise<import('./shared/types').IpcResult>
    iflowDeleteMod: (modId: string) => Promise<import('./shared/types').IpcResult>
    iflowExportMod: (modId: string) => Promise<import('./shared/types').ExportModResult>
    iflowImportMod: (filePath: string) => Promise<import('./shared/types').ImportModResult>
    iflowOpenImportDialog: () => Promise<import('./shared/types').IpcResult<{ canceled: boolean; filePaths: string[] }>>
    iflowCheckIflowStatus: () => Promise<import('./shared/types').IpcResult<{ exists: boolean; path: string | null; version: string | null }>>

    // ─── 翻译 ─────────────────────────────────────────────
    getTranslation: (localeData: any) => any
  }
}
