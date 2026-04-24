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

    // ─── 确认对话框 ───────────────────────────────────────
    confirmDialogResult: (requestId: string, confirmed: boolean) => void
    onShowConfirmRequest: (callback: (request: import('./shared/types').ConfirmDialogRequest) => void) => void

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

    // ─── 托盘事件 ─────────────────────────────────────────
    onApiProfileSwitched: (callback: (profileName: string) => void) => void

    // ─── 语言 ─────────────────────────────────────────────
    notifyLanguageChanged: () => void

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

    // ─── 更新事件监听 ─────────────────────────────────────
    onUpdateStatusChanged: (callback: (state: import('./shared/types').UpdateState) => void) => void
    onUpdateAvailable: (callback: (info: import('./shared/types').UpdateInfo) => void) => void
    onUpdateDownloadProgress: (callback: (progress: number) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    onUpdateBackgroundComplete: (callback: (info: { version: string; downloadPath: string }) => void) => void
    removeUpdateListener: (channel: string, callback: (...args: any[]) => void) => void
    onAutoCheckUpdate: (callback: () => void) => void
    onInstallUpdate: (callback: () => void) => void
    removeAllUpdateListeners: () => void

    // ─── 待安装更新 ───────────────────────────────────────
    getPendingUpdate: () => Promise<import('./shared/types').IpcResult<{ pending: import('./shared/types').PendingUpdateInfo | null }>>
    clearPendingUpdate: () => Promise<import('./shared/types').IpcResult>
    restorePendingUpdate: () => Promise<import('./shared/types').IpcResult<{ restored: boolean; pending?: import('./shared/types').PendingUpdateInfo }>>

    // ─── 翻译 ─────────────────────────────────────────────
    getTranslation: (localeData: any) => any
    sendTranslation: (translations: any) => void
  }
}