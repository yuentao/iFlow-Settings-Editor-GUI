/**
 * 配置服务模块
 * 负责配置文件的读写操作
 */

const path = require('path')
const fs = require('fs')

// 导入统一常量
const { API_FIELDS } = require('../constants')

// 延迟计算配置文件路径，避免模块加载时 require('electron') 失败
// 纯函数（如 stampModifiedItems、tombstone 工具）不依赖此路径
let _SETTINGS_FILE = null
function getSettingsFile() {
  if (!_SETTINGS_FILE) {
    const { app } = require('electron')
    _SETTINGS_FILE = path.join(app.getPath('home'), '.iflow', 'settings.json')
  }
  return _SETTINGS_FILE
}

/**
 * 读取设置文件
 * @returns {Object|null} 设置数据，如果文件不存在则返回 null
 */
function readSettings() {
  const SETTINGS_FILE = getSettingsFile()
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
  const SETTINGS_FILE = getSettingsFile()
  try {
    // 先创建备份（N-6：备份失败仅 warn，不阻塞主写入）
    if (fs.existsSync(SETTINGS_FILE)) {
      const backupPath = SETTINGS_FILE + '.bak'
      try {
        fs.copyFileSync(SETTINGS_FILE, backupPath)
      } catch (backupError) {
        console.warn('Failed to create settings backup:', backupError.message)
      }
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
  return getSettingsFile()
}

/**
 * 检查配置文件是否存在
 * @returns {boolean}
 */
function settingsExists() {
  return fs.existsSync(getSettingsFile())
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
    } else if (!oldProfile._lastModified && !profile._lastModified) {
      // N-1 修复：旧数据迁移场景——条目没有 _lastModified 且内容未变，
      // 补写当前时间戳作为迁移标记，确保后续 _mergeConfigs 有时间参考，
      // 避免远端条目因 localItemTime 退化为 0 而错误覆盖本地数据。
      profile._lastModified = now
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
    } else if (!oldServer._lastModified && !server._lastModified) {
      // N-1 修复：旧数据迁移场景——同 apiProfiles 逻辑
      server._lastModified = now
    }
  }
}

// ─── Tombstone（墓碑）支持 ────────────────────────
// 用于云同步的删除合并：
//   settings._deletedProfiles = { [name]: { deletedAt: ISO } }
//   settings._deletedServers  = { [name]: { deletedAt: ISO } }
// _mergeConfigs 在合并时会对 tombstone 也合并，并物理删除被墓碑覆盖的条目。
// 默认保留 30 天，超过后由 pruneOldTombstones 清理。

const DEFAULT_TOMBSTONE_RETENTION_DAYS = 30

function _ensureTombstoneBucket(settings, key) {
  if (!settings[key] || typeof settings[key] !== 'object') {
    settings[key] = {}
  }
  return settings[key]
}

/**
 * 标记某个 apiProfile 为已删除（写入 tombstone），不会从 apiProfiles 中物理删除。
 * 通常调用方应：先调用此函数 → 再 delete settings.apiProfiles[name]。
 * @param {Object} settings
 * @param {string} name
 * @param {string} [deletedAt] - ISO 时间戳，默认 now
 */
function markDeletedProfile(settings, name, deletedAt) {
  if (!settings || !name) return
  const bucket = _ensureTombstoneBucket(settings, '_deletedProfiles')
  bucket[name] = { deletedAt: deletedAt || new Date().toISOString() }
}

/**
 * 标记某个 mcpServer 为已删除。
 * @param {Object} settings
 * @param {string} name
 * @param {string} [deletedAt]
 */
function markDeletedServer(settings, name, deletedAt) {
  if (!settings || !name) return
  const bucket = _ensureTombstoneBucket(settings, '_deletedServers')
  bucket[name] = { deletedAt: deletedAt || new Date().toISOString() }
}

/** 取 apiProfile 的删除时间戳（毫秒），不存在则返回 0。 */
function getProfileTombstoneTime(settings, name) {
  const t = settings && settings._deletedProfiles && settings._deletedProfiles[name]
  return t && t.deletedAt ? new Date(t.deletedAt).getTime() : 0
}

/** 取 mcpServer 的删除时间戳（毫秒），不存在则返回 0。 */
function getServerTombstoneTime(settings, name) {
  const t = settings && settings._deletedServers && settings._deletedServers[name]
  return t && t.deletedAt ? new Date(t.deletedAt).getTime() : 0
}

/**
 * 清理超过保留期的墓碑，避免 settings 体积无限增长。
 * @param {Object} settings
 * @param {number} [maxAgeDays] - 保留天数，默认 30
 * @returns {number} 被清理的墓碑数量
 */
function pruneOldTombstones(settings, maxAgeDays = DEFAULT_TOMBSTONE_RETENTION_DAYS) {
  if (!settings) return 0
  const cutoff = Date.now() - maxAgeDays * 86400_000
  let removed = 0
  for (const key of ['_deletedProfiles', '_deletedServers']) {
    const bucket = settings[key]
    if (!bucket || typeof bucket !== 'object') continue
    for (const [name, entry] of Object.entries(bucket)) {
      const t = entry && entry.deletedAt ? new Date(entry.deletedAt).getTime() : 0
      if (!t || t < cutoff) {
        delete bucket[name]
        removed++
      }
    }
  }
  return removed
}

module.exports = {
  get SETTINGS_FILE() { return getSettingsFile() },
  API_FIELDS,
  readSettings,
  writeSettings,
  getSettingsPath,
  settingsExists,
  getApiFields,
  extractApiConfig,
  applyApiConfig,
  stampModifiedItems,
  markDeletedProfile,
  markDeletedServer,
  getProfileTombstoneTime,
  getServerTombstoneTime,
  pruneOldTombstones,
  DEFAULT_TOMBSTONE_RETENTION_DAYS,
}