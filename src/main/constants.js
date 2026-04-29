/**
 * 主进程常量定义
 * 统一管理共享常量和默认值
 */

// API 配置相关字段
const API_FIELDS = Object.freeze([
  'selectedAuthType',
  'apiKey',
  'baseUrl',
  'modelName',
])

// API 配置默认值
const PROFILE_DEFAULTS = Object.freeze({
  selectedAuthType: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  modelName: '',
})

module.exports = {
  API_FIELDS,
  PROFILE_DEFAULTS
}