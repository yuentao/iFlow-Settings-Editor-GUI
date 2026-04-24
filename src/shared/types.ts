/**
 * iFlow Settings Editor - 共享类型定义
 * 主进程和渲染进程共用
 */

// ─── IPC 通用 ────────────────────────────────────────────

export interface IpcResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ─── Settings ────────────────────────────────────────────

export interface Settings {
  language?: string
  uiTheme?: 'light' | 'dark' | 'system'
  acrylicEnabled?: boolean
  acrylicIntensity?: number
  autoLaunch?: boolean
  startMinimized?: boolean
  bootAnimationShown?: boolean
  autoUpdate?: boolean
  currentApiProfile?: string
  apiProfiles?: Record<string, ApiProfileSettings>
  mcpServers?: McpServer[]
  commands?: Command[]
  checkpointing?: { enabled?: boolean }
}

export interface ApiProfileSettings {
  selectedAuthType?: string
  apiKey?: string
  baseUrl?: string
  modelName?: string
  searchApiKey?: string
  cna?: boolean
}

// ─── API Profile ─────────────────────────────────────────

export interface ApiProfile {
  name: string
  isDefault?: boolean
  selectedAuthType?: string
  apiKey?: string
  baseUrl?: string
  modelName?: string
  searchApiKey?: string
  cna?: boolean
}

// ─── MCP Server ──────────────────────────────────────────

export interface McpServer {
  name: string
  description?: string
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  disabled?: boolean
}

// ─── Command ─────────────────────────────────────────────

export interface Command {
  name: string
  description?: string
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
}

// ─── Skill ───────────────────────────────────────────────

export interface Skill {
  name: string
  description?: string
  path?: string
}

// ─── Dialogs ─────────────────────────────────────────────

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning'
  title?: string
  message: string
  detail?: string
  buttons?: string[]
}

export interface ConfirmDialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
}

export interface ConfirmDialogRequest {
  requestId: string
  title: string
  message: string
  confirmText: string
  cancelText: string
  type: string
}

// ─── Update ──────────────────────────────────────────────

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'
  progress?: number
  error?: string
  info?: UpdateInfo
}

export interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
  downloadUrl?: string
}

export interface DownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}
