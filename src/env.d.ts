/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
    // 设置操作
    loadSettings: () => Promise<import('./shared/types').IpcResult<import('./shared/types').Settings>>
    saveSettings: (data: import('./shared/types').Settings) => Promise<import('./shared/types').IpcResult>
    showMessage: (options: import('./shared/types').MessageBoxOptions) => Promise<import('./shared/types').IpcResult>
    showConfirmDialog: (options: import('./shared/types').ConfirmDialogOptions) => Promise<import('./shared/types').IpcResult>

    // 确认对话框
    confirmDialogResult: (requestId: string, confirmed: boolean) => void
    onShowConfirmRequest: (callback: (request: import('./shared/types').ConfirmDialogRequest) => void) => void

    // 开机自启动
    getAutoLaunch: () => Promise<import('./shared/types').IpcResult<boolean>>
    setAutoLaunch: (enabled: boolean) => Promise<import('./shared/types').IpcResult>

    // 自动更新设置
    getAutoUpdate: () => Promise<import('./shared/types').IpcResult<boolean>>
    setAutoUpdate: (enabled: boolean) => Promise<import('./shared/types').IpcResult>

    // 窗口控制
    isMaximized: () => Promise<import('./shared/types').IpcResult<boolean>>
    minimize: () => void
    maximize: () => void
    close: () => void

    // API 配置管理
    listApiProfiles: () => Promise<import('./shared/types').IpcResult & { profiles?: import('./shared/types').ApiProfile[]; currentProfile?: string }>
    switchApiProfile: (profileName: string) => Promise<import('./shared/types').IpcResult>
    createApiProfile: (name: string) => Promise<import('./shared/types').IpcResult>
    deleteApiProfile: (name: string) => Promise<import('./shared/types').IpcResult>
    renameApiProfile: (oldName: string, newName: string) => Promise<import('./shared/types').IpcResult>
    duplicateApiProfile: (sourceName: string, newName: string) => Promise<import('./shared/types').IpcResult>

    // 托盘事件
    onApiProfileSwitched: (callback: (profileName: string) => void) => void

    // 语言
    notifyLanguageChanged: () => void

    // 技能管理
    listSkills: () => Promise<import('./shared/types').IpcResult & { skills?: import('./shared/types').Skill[] }>
    importSkillLocal: () => Promise<import('./shared/types').IpcResult>
    importSkillOnline: (url: string, name: string) => Promise<import('./shared/types').IpcResult>
    exportSkill: (name: string, fileName: string) => Promise<import('./shared/types').IpcResult>
    deleteSkill: (name: string) => Promise<import('./shared/types').IpcResult>

    // 命令管理
    listCommands: () => Promise<import('./shared/types').IpcResult & { commands?: import('./shared/types').Command[] }>
    readCommand: (name: string) => Promise<import('./shared/types').IpcResult<import('./shared/types').Command>>
    createCommand: (name: string, data: import('./shared/types').Command) => Promise<import('./shared/types').IpcResult>
    updateCommand: (name: string, data: import('./shared/types').Command) => Promise<import('./shared/types').IpcResult>
    deleteCommand: (name: string) => Promise<import('./shared/types').IpcResult>
    exportCommand: (name: string) => Promise<import('./shared/types').IpcResult>
    importCommand: () => Promise<import('./shared/types').IpcResult>

    // 更新相关
    checkForUpdates: () => Promise<import('./shared/types').IpcResult>
    downloadUpdate: () => Promise<import('./shared/types').IpcResult>
    downloadUpdateBackground: () => Promise<import('./shared/types').IpcResult>
    cancelDownload: () => Promise<import('./shared/types').IpcResult>
    installUpdate: () => Promise<import('./shared/types').IpcResult>
    getUpdateStatus: () => Promise<import('./shared/types').IpcResult<import('./shared/types').UpdateState>>
    getAppVersion: () => Promise<import('./shared/types').IpcResult<string>>
    openReleasePage: () => Promise<import('./shared/types').IpcResult>

    // 更新事件监听
    onUpdateStatusChanged: (callback: (state: import('./shared/types').UpdateState) => void) => void
    onUpdateAvailable: (callback: (info: import('./shared/types').UpdateInfo) => void) => void
    onUpdateDownloadProgress: (callback: (progress: import('./shared/types').DownloadProgress) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    onUpdateBackgroundComplete: (callback: (info: import('./shared/types').UpdateInfo) => void) => void
    removeUpdateListener: (channel: string, callback: (...args: any[]) => void) => void
    onAutoCheckUpdate: (callback: () => void) => void
    onInstallUpdate: (callback: () => void) => void
    removeAllUpdateListeners: () => void

    // 翻译
    getTranslation: (localeData: any) => any
    sendTranslation: (translations: any) => void
  }
}
