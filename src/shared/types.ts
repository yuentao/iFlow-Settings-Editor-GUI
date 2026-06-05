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

/** 带取消标记的 IPC 结果 */
export interface IpcCancelResult extends IpcResult {
  cancelled?: boolean
}

// ─── Settings ────────────────────────────────────────────

export type UiTheme = 'Light' | 'Dark' | 'System'
export type AuthType = 'openai-compatible' | 'api-key' | 'oauth'

export interface Settings {
  language?: string
  uiTheme?: UiTheme
  acrylicEnabled?: boolean
  acrylicIntensity?: number
  autoLaunch?: boolean
  startMinimized?: boolean
  bootAnimationShown?: boolean
  showMemoryUsage?: boolean
  maxSessionTurns?: number
  excludeTools?: string[]
  autoUpdate?: boolean
  currentApiProfile?: string
  apiProfiles?: Record<string, ApiProfileConfig>
  apiProfilesOrder?: string[]
  mcpServers?: Record<string, McpServerConfig>
  checkpointing?: { enabled?: boolean }
  pendingUpdate?: PendingUpdateInfo

  // 当前激活的 API 配置字段（与 apiProfiles[currentApiProfile] 同步）
  selectedAuthType?: AuthType
  apiKey?: string
  baseUrl?: string
  modelName?: string

  // CLI 行为控制
  autoAccept?: boolean
  hideBanner?: boolean
  disableAutoUpdate?: boolean
  autoConfigureMaxOldSpaceSize?: boolean
  disableTelemetry?: boolean
  tokensLimit?: number
  compressionTokenThreshold?: number
  skipNextSpeakerCheck?: boolean
  shellTimeout?: number
  approvalMode?: 'yolo' | 'plan' | 'autoEdit' | 'default'
  thinkingModeEnabled?: 'true' | 'false'
  connectivityPollInterval?: number  // API 连通性检测间隔（秒），默认 30
  modelUsageRefreshInterval?: number  // 模型使用统计刷新间隔（分钟），默认 5
  logLevel?: 'info' | 'debug' | 'silent'  // 日志级别，默认 info
  apiConfigLayout?: 'list' | 'grid'  // API 配置页面布局方式，默认 list
  customThemes?: Record<string, CustomThemeConfig>
  cloudSync?: {
    enabled?: boolean
    provider?: string
    autoSync?: boolean
    syncInterval?: number
    deviceName?: string
    tombstoneRetentionDays?: number
    [key: string]: unknown
  }
}

/** 自定义 CLI 主题配置 */
export interface CustomThemeConfig {
  name: string
  type: 'custom'
  Background?: string
  Foreground?: string
  LightBlue?: string
  AccentBlue?: string
  AccentPurple?: string
  AccentCyan?: string
  AccentGreen?: string
  AccentYellow?: string
  AccentRed?: string
  Comment?: string
  Gray?: string
}

/** apiProfiles 中每个配置的结构 */
export interface ApiProfileConfig {
  selectedAuthType?: AuthType
  apiKey?: string
  baseUrl?: string
  modelName?: string
  tokensLimit?: number
  /** 过期天数，0 或不设置表示无限 */
  expiryDays?: number
  /** 过期倒计时起始时间（ISO 字符串），仅在设置/修改 expiryDays 时写入 */
  expiryStartDate?: string
}

// ─── API Profile（列表展示用） ────────────────────────────

export interface ApiProfile {
  name: string
  isDefault?: boolean
}

// ─── MCP Server ──────────────────────────────────────────

/** mcpServers 中每个服务器的配置 */
export interface McpServerConfig {
  command: string
  description?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  disabled?: boolean
}

// ─── Skill ───────────────────────────────────────────────

export interface Skill {
  name: string
  description?: string
  folderName: string
  size: number
  path: string
  hasLicense: boolean
}

// ─── Command ─────────────────────────────────────────────

export interface Command {
  name: string
  description?: string
  category?: string
  version?: string
  author?: string
  prompt?: string
  fileName: string
}

/** 创建/更新命令时传入的数据 */
export interface CommandFormData {
  name: string
  description?: string
  category?: string
  version?: string
  author?: string
  prompt?: string
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
  titleKey?: string
  messageKey: string
  messageParams?: Record<string, string>
}

export interface ConfirmDialogRequest {
  requestId: string
  titleKey: string
  messageKey: string
  messageParams?: Record<string, string>
}

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
  properties?: string[]
}

// ─── Update ──────────────────────────────────────────────

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

export interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseUrl?: string
  downloadUrl?: string | null
  downloadName?: string
  size?: number
  isDelta?: boolean       // 是否为差分更新
  deltaSize?: number      // 差分更新大小
  fullSize?: number       // 完整包大小
  blockMap?: string       // blockMap 文件内容（用于差分更新验证）
}

export interface UpdateState {
  status: UpdateStatus
  info?: UpdateInfo | null
  progress?: number
  error?: string | null
  downloadPath?: string | null
  isBackground?: boolean
  bytesPerSecond?: number // 下载速度
  transferred?: number    // 已传输字节数
  total?: number          // 总字节数
}

/** 持久化的待安装更新信息（保存在 settings.json 中） */
export interface PendingUpdateInfo {
  version: string
  downloadPath: string
  downloadName?: string
  isDelta?: boolean
}

/** 更新历史记录条目 */
export interface UpdateHistoryEntry {
  version: string
  timestamp: number
  type: 'full' | 'delta' | 'failed'
  size?: number
  duration?: number  // 下载耗时（毫秒）
  error?: string
}

export interface CheckUpdateResult extends IpcResult {
  hasUpdate?: boolean
  version?: string
  releaseNotes?: string
  releaseUrl?: string
  downloadUrl?: string | null
  isDelta?: boolean
  deltaSize?: number
  fullSize?: number
}

export interface DownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

/** 更新检查结果（包含差分更新信息） */
export interface CheckForUpdatesResult extends IpcResult {
  hasUpdate?: boolean
  version?: string
  releaseNotes?: string
  releaseUrl?: string
  downloadUrl?: string | null
  isDelta?: boolean
  deltaSize?: number
  fullSize?: number
}

/** 下载更新结果 */
export interface DownloadUpdateResult extends IpcResult {
  downloadPath?: string
  isDelta?: boolean
  downloadedSize?: number
}

/** 获取更新历史结果 */
export interface GetUpdateHistoryResult extends IpcResult {
  history?: UpdateHistoryEntry[]
}

// ─── API Profile IPC 专用结果 ────────────────────────────

export interface ListApiProfilesResult extends IpcResult {
  profiles?: ApiProfile[]
  currentProfile?: string
}

export interface SwitchApiProfileResult extends IpcResult<Settings> {}

export interface DeleteApiProfileResult extends IpcResult<Settings> {}

// ─── Skills IPC 专用结果 ─────────────────────────────────

export interface ListSkillsResult extends IpcResult {
  skills?: Skill[]
}

// ─── Commands IPC 专用结果 ───────────────────────────────

export interface ListCommandsResult extends IpcResult {
  commands?: Command[]
}

export interface ReadCommandResult extends IpcResult {
  command?: Command
}

export interface ImportCommandResult extends IpcResult {
  imported?: string[]
}

// ─── App Version ─────────────────────────────────────────

export interface AppVersionResult extends IpcResult {
  version?: string
}

// ─── iFlow Mod ──────────────────────────────────────────

export type IflowModType = 'patch' | 'replace' | 'append' | 'prepend'

export interface IflowMod {
  id: string
  name: string
  version: string
  type: IflowModType
  description: string
  author: string
  category: string
  enabled: boolean
  enabledAt: number | null
  installedAt: number
  iflowVersion?: string
  iflowVersionConstraint?: string
  icon?: string
  tags?: string[]
  homepage?: string
  repository?: string
  license?: string
  lastModified?: number
  dependsOn?: string[]  // 依赖的其他 MOD ID
}

export interface ModsMetadata {
  version: number
  timestamp: number
  mods: IflowMod[]
}

export interface IflowVersionResult extends IpcResult {
  version?: string
}

export interface ListModsResult extends IpcResult {
  mods?: IflowMod[]
}

export interface ImportModResult extends IpcResult {
  imported?: number
  failed?: number
  errors?: string[]
  modIds?: string[]
}

export interface ExportModResult extends IpcResult {
  filePath?: string
}

export interface ModCompatibilityResult extends IpcResult {
  compatible?: boolean
  currentVersion?: string
  modVersion?: string
  constraint?: string
  reason?: string
}