/**
 * CLI 行为控制默认值常量
 * 在 settings 初始化、profile 切换、profile 删除等多处复用
 * 集中管理避免默认值散落导致不一致
 */

export const CLI_DEFAULTS = {
  autoAccept: false,
  hideBanner: false,
  disableAutoUpdate: false,
  autoConfigureMaxOldSpaceSize: undefined,
  disableTelemetry: false,
  tokensLimit: 128000,
  compressionTokenThreshold: 0.8,
  skipNextSpeakerCheck: true,
  shellTimeout: 120000,
  approvalMode: 'autoEdit',
  thinkingModeEnabled: 'true',
  logLevel: 'info',
  apiConfigLayout: 'list',
  zoomFactor: 1.0,
} as const

/** 将 CLI_DEFAULTS 中 undefined 的字段补充到目标对象（非覆盖） */
export function applyDefaults<T extends Record<string, unknown>>(data: T): T {
  for (const [key, defaultValue] of Object.entries(CLI_DEFAULTS)) {
    if ((data as Record<string, unknown>)[key] === undefined) {
      ;(data as Record<string, unknown>)[key] = defaultValue
    }
  }
  return data
}