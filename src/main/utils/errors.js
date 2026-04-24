/**
 * 统一错误处理工具
 * 为主进程 IPC 提供一致的错误返回格式
 */

const { AppError, ErrorCodes, getStatusCodeForError } = require('../../shared/errors')
const { logger } = require('./logger')
const { t } = require('./translations')

// 错误码到翻译键的映射
const ERROR_CODE_TRANSLATIONS = {
  [ErrorCodes.CONFIG_NOT_FOUND]: 'errors.configNotFound',
  [ErrorCodes.CONFIG_READ_ERROR]: 'errors.configReadError',
  [ErrorCodes.CONFIG_WRITE_ERROR]: 'errors.configWriteError',
  [ErrorCodes.CONFIG_ALREADY_EXISTS]: 'errors.configAlreadyExists',
  [ErrorCodes.FILE_NOT_FOUND]: 'errors.fileNotFound',
  [ErrorCodes.PERMISSION_DENIED]: 'errors.permissionDenied',
  [ErrorCodes.UNKNOWN_ERROR]: 'errors.unknown',
}

/**
 * 根据错误码获取翻译后的错误消息
 * @param {string} code - 错误码
 * @param {string} fallbackMessage - 回退消息
 * @param {Object} params - 翻译参数
 * @returns {string} 翻译后的错误消息
 */
function getTranslatedErrorMessage(code, fallbackMessage, params = {}) {
  const translationKey = ERROR_CODE_TRANSLATIONS[code]
  if (translationKey) {
    const translated = t(translationKey, params)
    // 如果翻译返回的是键（未找到翻译），使用回退消息
    if (translated !== translationKey) {
      return translated
    }
  }
  return fallbackMessage
}

/**
 * 处理 IPC 错误并返回标准化结果
 * @param {unknown} error - 错误对象
 * @param {string} [context] - 错误上下文（模块/操作名称）
 * @returns {object} IPC 返回结果
 */
function handleIpcError(error, context) {
  // 已经是 AppError 实例
  if (error instanceof AppError) {
    logger.error(`[${context || 'IPC'}] ${error.code}: ${error.message}`)
    const translatedMessage = getTranslatedErrorMessage(error.code, error.message)
    return {
      success: false,
      error: translatedMessage,
      code: error.code,
    }
  }

  // 标准 Error 实例
  if (error instanceof Error) {
    logger.error(`[${context || 'IPC'}] ${error.message}`, error.stack)

    // 根据错误消息推断错误码
    const code = inferErrorCode(error.message, context)
    const translatedMessage = getTranslatedErrorMessage(code, error.message)

    return {
      success: false,
      error: translatedMessage,
      code: code,
    }
  }

  // 未知错误 - 使用翻译后的消息
  logger.error(`[${context || 'IPC'}] Unknown error:`, error)
  const unknownErrorMessage = t('errors.unknown')

  return {
    success: false,
    error: unknownErrorMessage,
    code: ErrorCodes.UNKNOWN_ERROR,
  }
}

/**
 * 根据错误消息推断错误码
 * @param {string} message - 错误消息
 * @param {string} [context] - 上下文
 * @returns {string} 错误码
 */
function inferErrorCode(message, context) {
  const lowerMessage = message.toLowerCase()

  // 配置相关
  if (lowerMessage.includes('config') || lowerMessage.includes('settings')) {
    if (lowerMessage.includes('not found') || lowerMessage.includes('不存在')) {
      return ErrorCodes.CONFIG_NOT_FOUND
    }
    if (lowerMessage.includes('read')) {
      return ErrorCodes.CONFIG_READ_ERROR
    }
    if (lowerMessage.includes('write')) {
      return ErrorCodes.CONFIG_WRITE_ERROR
    }
  }

  // 文件相关
  if (lowerMessage.includes('enoent') || lowerMessage.includes('not exist')) {
    return ErrorCodes.FILE_NOT_FOUND
  }
  if (lowerMessage.includes('eacces') || lowerMessage.includes('permission')) {
    return ErrorCodes.PERMISSION_DENIED
  }

  // 默认返回未知错误
  return ErrorCodes.UNKNOWN_ERROR
}

/**
 * 创建应用错误
 * @param {string} message - 错误消息
 * @param {string} code - 错误码
 * @returns {AppError} 应用错误实例
 */
function createError(message, code) {
  const statusCode = getStatusCodeForError(code)
  return new AppError(message, code, statusCode)
}

/**
 * 抛出应用错误（用于在 async 函数中中断执行）
 * @param {string} message - 错误消息
 * @param {string} code - 错误码
 * @throws {AppError}
 */
function throwError(message, code) {
  throw createError(message, code)
}

/**
 * 包装 async 函数，自动捕获错误并返回 IPC 结果
 * @param {Function} fn - 异步函数
 * @param {string} [context] - 上下文名称
 * @returns {Function} 包装后的函数
 */
function wrapIpcHandler(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleIpcError(error, context)
    }
  }
}

/**
 * 创建带错误码的成功结果
 * @param {any} [data] - 返回数据
 * @param {string} [code] - 成功码（可选）
 * @returns {object} IPC 返回结果
 */
function successResult(data, code) {
  const result = { success: true }
  if (data !== undefined) {
    result.data = data
  }
  if (code) {
    result.code = code
  }
  return result
}

/**
 * 创建失败结果
 * @param {string} error - 错误消息
 * @param {string} [code] - 错误码
 * @returns {object} IPC 返回结果
 */
function errorResult(error, code) {
  const result = {
    success: false,
    error: error,
  }
  if (code) {
    result.code = code
  }
  return result
}

module.exports = {
  handleIpcError,
  createError,
  throwError,
  wrapIpcHandler,
  successResult,
  errorResult,
  ErrorCodes,
  AppError,
}
