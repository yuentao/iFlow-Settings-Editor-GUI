/**
 * 配置服务模块
 * 负责配置文件的读写操作
 */

const { app } = require('electron')
const path = require('path')
const fs = require('fs')

// 导入统一常量
const { API_FIELDS } = require('../constants')

// 配置文件路径
const SETTINGS_FILE = path.join(app.getPath('home'), '.iflow', 'settings.json')

/**
 * 读取设置文件
 * @returns {Object|null} 设置数据，如果文件不存在则返回 null
 */
function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return null
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to read settings:', error)
    return null
  }
}

/**
 * 写入设置文件（带备份）
 * @param {Object} data - 要写入的数据
 */
function writeSettings(data) {
  try {
    // 先创建备份
    if (fs.existsSync(SETTINGS_FILE)) {
      const backupPath = SETTINGS_FILE + '.bak'
      fs.copyFileSync(SETTINGS_FILE, backupPath)
    }

    // 确保目录存在
    const dir = path.dirname(SETTINGS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // 写入新配置
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to write settings:', error)
    throw error
  }
}

/**
 * 获取配置文件路径
 * @returns {string} 配置文件路径
 */
function getSettingsPath() {
  return SETTINGS_FILE
}

/**
 * 检查配置文件是否存在
 * @returns {boolean}
 */
function settingsExists() {
  return fs.existsSync(SETTINGS_FILE)
}

/**
 * 获取 API 配置字段列表
 * @returns {string[]}
 */
function getApiFields() {
  return [...API_FIELDS]
}

/**
 * 从当前设置中提取 API 配置
 * @param {Object} settings - 设置对象
 * @returns {Object} API 配置对象
 */
function extractApiConfig(settings) {
  const config = {}
  for (const field of API_FIELDS) {
    if (settings[field] !== undefined) {
      config[field] = settings[field]
    }
  }
  return config
}

/**
 * 将 API 配置应用到设置对象
 * @param {Object} settings - 设置对象
 * @param {Object} apiConfig - API 配置对象
 */
function applyApiConfig(settings, apiConfig) {
  for (const field of API_FIELDS) {
    if (apiConfig[field] !== undefined) {
      settings[field] = apiConfig[field]
    }
  }
}

/** 内部：忽略元数据字段后比较两个条目内容是否相等 */
function _isItemContentEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  const cleanA = JSON.stringify(_omitMeta(a))
  const cleanB = JSON.stringify(_omitMeta(b))
  return cleanA === cleanB
}

function _omitMeta(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_lastModified') continue
    result[k] = v
  }
  return result
}

/**
 * 对比新旧 settings 中的 apiProfiles 与 mcpServers，
 * 对内容变化或新增的条目写入 _lastModified=now；未变化的条目保留原时间戳。
 *
 * 这是云同步合并策略（per-item _lastModified 比较）能正确工作的前提：
 * - 不再把 stampModifiedItems 误以为可放在 SyncService 中（那样无法反映本地修改）；
 * - 必须在每次 settings 落盘前调用。
 *
 * @param {Object|null} oldSettings - 旧设置（来自磁盘）
 * @param {Object} newSettings - 即将写入的新设置（直接修改）
 */
function stampModifiedItems(oldSettings, newSettings) {
  if (!newSettings || typeof newSettings !== 'object') return
  const now = new Date().toISOString()

  const oldProfiles = (oldSettings && oldSettings.apiProfiles) || {}
  const newProfiles = newSettings.apiProfiles || {}
  for (const [name, profile] of Object.entries(newProfiles)) {
    if (!profile || typeof profile !== 'object') continue
    const oldProfile = oldProfiles[name]
    if (!oldProfile) {
      profile._lastModified = now
    } else if (!_isItemContentEqual(oldProfile, profile)) {
      profile._lastModified = now
    } else if (oldProfile._lastModified && !profile._lastModified) {
      profile._lastModified = oldProfile._lastModified
    }
  }

  const oldServers = (oldSettings && oldSettings.mcpServers) || {}
  const newServers = newSettings.mcpServers || {}
  for (const [name, server] of Object.entries(newServers)) {
    if (!server || typeof server !== 'object') continue
    const oldServer = oldServers[name]
    if (!oldServer) {
      server._lastModified = now
    } else if (!_isItemContentEqual(oldServer, server)) {
      server._lastModified = now
    } else if (oldServer._lastModified && !server._lastModified) {
      server._lastModified = oldServer._lastModified
    }
  }
}

module.exports = {
  SETTINGS_FILE,
  API_FIELDS,
  readSettings,
  writeSettings,
  getSettingsPath,
  settingsExists,
  getApiFields,
  extractApiConfig,
  applyApiConfig,
  stampModifiedItems,
}