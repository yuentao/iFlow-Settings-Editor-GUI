/**
 * 输入验证工具
 * 提供 IPC 参数验证功能
 */

/**
 * 验证字符串非空
 * @param {any} value
 * @param {string} fieldName
 * @returns {{ valid: boolean, error?: string }}
 */
function validateNonEmpty(value, fieldName) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: `${fieldName} cannot be empty` }
  }
  return { valid: true }
}

/**
 * 验证配置文件名称（只允许字母、数字、中划线和下划线）
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
function validateConfigName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name must be a string' }
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, hyphens and underscores' }
  }
  if (name.length > 64) {
    return { valid: false, error: 'Name must be less than 64 characters' }
  }
  return { valid: true }
}

/**
 * 验证 URL 格式
 * @param {string} url
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' }
  }
  try {
    new URL(url)
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * 验证对象类型
 * @param {any} obj
 * @param {string} fieldName
 * @returns {{ valid: boolean, error?: string }}
 */
function validateObject(obj, fieldName) {
  if (obj === null || obj === undefined || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, error: `${fieldName} must be an object` }
  }
  return { valid: true }
}

module.exports = {
  validateNonEmpty,
  validateConfigName,
  validateUrl,
  validateObject,
}