/**
 * iFlow Settings Editor - 统一错误处理
 * 主进程和渲染进程共用
 */

/**
 * 应用错误类
 * 用于抛出带有错误码的标准化错误
 */
class AppError extends Error {
  /**
   * @param {string} message - 错误消息（用户可读）
   * @param {string} code - 错误码
   * @param {number} [statusCode=500] - HTTP 状态码（用于 IPC 返回）
   */
  constructor(message, code, statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 错误码定义
 * 用于统一错误识别和处理
 */
const ErrorCodes = Object.freeze({
  // 配置相关错误 (1000-1099)
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_READ_ERROR: 'CONFIG_READ_ERROR',
  CONFIG_WRITE_ERROR: 'CONFIG_WRITE_ERROR',
  CONFIG_NOT_EXIST: 'CONFIG_NOT_EXIST',
  CONFIG_ALREADY_EXISTS: 'CONFIG_ALREADY_EXISTS',
  CONFIG_INVALID: 'CONFIG_INVALID',

  // API 配置相关错误 (1100-1199)
  API_PROFILE_NOT_FOUND: 'API_PROFILE_NOT_FOUND',
  API_PROFILE_EXISTS: 'API_PROFILE_EXISTS',
  API_PROFILE_INVALID: 'API_PROFILE_INVALID',
  CANNOT_DELETE_DEFAULT_PROFILE: 'CANNOT_DELETE_DEFAULT_PROFILE',
  CANNOT_RENAME_DEFAULT_PROFILE: 'CANNOT_RENAME_DEFAULT_PROFILE',
  API_PROFILE_SWITCH_FAILED: 'API_PROFILE_SWITCH_FAILED',

  // MCP 服务器相关错误 (1200-1299)
  MCP_SERVER_NOT_FOUND: 'MCP_SERVER_NOT_FOUND',
  MCP_SERVER_EXISTS: 'MCP_SERVER_EXISTS',
  MCP_SERVER_INVALID: 'MCP_SERVER_INVALID',
  MCP_COMMAND_INVALID: 'MCP_COMMAND_INVALID',
  MCP_ENV_INVALID: 'MCP_ENV_INVALID',

  // 技能相关错误 (1300-1399)
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  SKILL_IMPORT_ERROR: 'SKILL_IMPORT_ERROR',
  SKILL_EXPORT_ERROR: 'SKILL_EXPORT_ERROR',
  SKILL_INVALID: 'SKILL_INVALID',
  SKILL_ARCHIVE_INVALID: 'SKILL_ARCHIVE_INVALID',
  SKILL_DOWNLOAD_FAILED: 'SKILL_DOWNLOAD_FAILED',
  SKILL_ALREADY_EXISTS: 'SKILL_ALREADY_EXISTS',

  // 命令相关错误 (1400-1499)
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  COMMAND_EXISTS: 'COMMAND_EXISTS',
  COMMAND_INVALID: 'COMMAND_INVALID',
  COMMAND_NAME_INVALID: 'COMMAND_NAME_INVALID',
  COMMAND_IMPORT_ERROR: 'COMMAND_IMPORT_ERROR',
  COMMAND_EXPORT_ERROR: 'COMMAND_EXPORT_ERROR',

  // 文件操作相关错误 (1500-1599)
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  FILE_DELETE_ERROR: 'FILE_DELETE_ERROR',
  FOLDER_CREATE_ERROR: 'FOLDER_CREATE_ERROR',

  // 更新相关错误 (1600-1699)
  UPDATE_CHECK_FAILED: 'UPDATE_CHECK_FAILED',
  UPDATE_DOWNLOAD_FAILED: 'UPDATE_DOWNLOAD_FAILED',
  UPDATE_INSTALL_FAILED: 'UPDATE_INSTALL_FAILED',
  UPDATE_NO_AVAILABLE: 'UPDATE_NO_AVAILABLE',

  // 系统相关错误 (1700-1799)
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',

  // 验证相关错误 (1800-1899)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INPUT_TOO_LONG: 'INPUT_TOO_LONG',
  INPUT_INVALID_FORMAT: 'INPUT_INVALID_FORMAT',
})

/**
 * 获取错误码对应的 HTTP 状态码
 * @param {string} code - 错误码
 * @returns {number} HTTP 状态码
 */
function getStatusCodeForError(code) {
  // 4xx 客户端错误
  if (code.startsWith('CONFIG_') || code.startsWith('API_') ||
      code.startsWith('MCP_') || code.startsWith('SKILL_') ||
      code.startsWith('COMMAND_') || code.startsWith('FILE_') ||
      code.startsWith('VALIDATION_')) {
    return 400
  }

  // 404 资源不存在
  if (code.endsWith('_NOT_FOUND')) {
    return 404
  }

  // 403 权限问题
  if (code === 'PERMISSION_DENIED') {
    return 403
  }

  // 409 资源冲突
  if (code.endsWith('_EXISTS') || code === 'COMMAND_ALREADY_EXISTS') {
    return 409
  }

  // 5xx 服务器错误
  if (code.endsWith('_ERROR') || code === 'UNKNOWN_ERROR') {
    return 500
  }

  return 500
}

module.exports = {
  AppError,
  ErrorCodes,
  getStatusCodeForError,
}
