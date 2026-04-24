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
}