/**
 * 日志工具
 * 提供统一的日志接口，使用 electron-log
 */

const log = require('electron-log')

// 配置日志格式
log.transports.file.level = 'debug'
log.transports.console.level = 'debug'
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}'

// 设置日志文件大小（5MB）
log.transports.file.maxSize = 5 * 1024 * 1024

/**
 * 格式化错误对象
 * @param {Error} error - 错误对象
 * @returns {string} 格式化后的错误字符串
 */
function formatError(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  return `${error.message}${error.stack ? '\n' + error.stack : ''}`
}

/**
 * 创建带模块前缀的日志记录器
 * @param {string} moduleName - 模块名称
 * @returns {object} 日志记录器对象
 */
function createLogger(moduleName) {
  const prefix = `[${moduleName}]`

  return {
    /**
     * 调试信息
     * @param {string} message - 日志消息
     * @param {...any} args - 其他参数
     */
    debug(message, ...args) {
      log.debug(`${prefix} ${message}`, ...args)
    },

    /**
     * 一般信息
     * @param {string} message - 日志消息
     * @param {...any} args - 其他参数
     */
    info(message, ...args) {
      log.info(`${prefix} ${message}`, ...args)
    },

    /**
     * 警告信息
     * @param {string} message - 日志消息
     * @param {...any} args - 其他参数
     */
    warn(message, ...args) {
      log.warn(`${prefix} ${message}`, ...args)
    },

    /**
     * 错误信息
     * @param {string} message - 日志消息
     * @param {Error|string} [error] - 错误对象或字符串
     */
    error(message, error) {
      log.error(`${prefix} ${message}`, formatError(error))
    },

    /**
     * 严重错误信息
     * @param {string} message - 日志消息
     * @param {Error|string} [error] - 错误对象或字符串
     */
    fatal(message, error) {
      log.fatal(`${prefix} ${message}`, formatError(error))
    }
  }
}

// 默认日志记录器（用于通用日志）
const logger = createLogger('App')

module.exports = {
  log,
  logger,
  createLogger
}