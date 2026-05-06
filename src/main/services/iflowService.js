/**
 * iFlow Mod 业务逻辑服务
 * 处理 Mod 包的导入、导出、启用/禁用、版本兼容性等核心逻辑
 */

const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const { crypto } = require('crypto')

const { t } = require('../utils/translations')
const { logger } = require('../utils/logger')

// 路径常量
const IFLOW_BASE_DIR = path.join(app.getPath('home'), '.iflow')
const MODS_DIR = path.join(IFLOW_BASE_DIR, 'mods', 'iflow')
const MODS_JSON_PATH = path.join(MODS_DIR, 'mods.json')

/**
 * 防止路径遍历攻击
 */
function isPathSafe(baseDir, userInput) {
  const resolved = path.resolve(baseDir, userInput)
  return resolved.startsWith(baseDir + path.sep) || resolved === baseDir
}

/**
 * 确保 Mod 目录结构存在
 */
function ensureModsDir() {
  if (!fs.existsSync(MODS_DIR)) {
    fs.mkdirSync(MODS_DIR, { recursive: true })
  }
}

/**
 * 生成 UUID v4
 */
function generateId() {
  return crypto.randomUUID()
}

/**
 * 读取 mods.json 元数据
 * @returns {Object} { version, timestamp, mods }
 */
function readModsMetadata() {
  ensureModsDir()

  if (!fs.existsSync(MODS_JSON_PATH)) {
    return { version: 1, timestamp: Date.now(), mods: [] }
  }

  try {
    const content = fs.readFileSync(MODS_JSON_PATH, 'utf-8')
    const data = JSON.parse(content)
    // 规范化：确保 mods 是数组
    if (data.mods && !Array.isArray(data.mods)) {
      // 兼容旧格式：mods 为对象时转为数组
      data.mods = Object.values(data.mods)
    }
    return data
  } catch (error) {
    logger.error('Failed to read mods.json:', error)
    // 备份损坏文件
    const bakPath = MODS_JSON_PATH + '.bak'
    if (fs.existsSync(MODS_JSON_PATH)) {
      fs.copyFileSync(MODS_JSON_PATH, bakPath)
    }
    return { version: 1, timestamp: Date.now(), mods: [] }
  }
}

/**
 * 原子写入 mods.json
 */
function writeModsMetadata(metadata) {
  ensureModsDir()
  metadata.timestamp = Date.now()

  const tmpPath = MODS_JSON_PATH + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(metadata, null, 2), 'utf-8')
  fs.renameSync(tmpPath, MODS_JSON_PATH)
}

/**
 * 获取 npm 全局路径
 * @returns {Promise<string>} npm prefix 路径
 */
async function getNpmPrefix() {
  return new Promise((resolve, reject) => {
    exec('npm config get prefix', { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to get npm prefix: ${error.message}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

/**
 * 获取 iflow.js 文件路径
 * @returns {Promise<string>} iflow.js 完整路径
 */
async function getIflowPath() {
  const prefix = await getNpmPrefix()
  return path.join(prefix, 'node_modules', '@iflow-ai', 'iflow-cli', 'bundle', 'iflow.js')
}

/**
 * 检查 iflow.js 是否存在
 * @returns {Promise<{ exists: boolean, path: string }>}
 */
async function checkIflowExists() {
  try {
    const iflowPath = await getIflowPath()
    return { exists: fs.existsSync(iflowPath), path: iflowPath }
  } catch {
    return { exists: false, path: '' }
  }
}

/**
 * 获取 iflow.js 版本号
 * @returns {Promise<string>}
 */
async function getIflowVersion() {
  return new Promise((resolve, reject) => {
    exec('iflow -v', { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to get iflow version: ${error.message}`))
        return
      }
      const version = (stdout || stderr || '').trim()
      if (!version) {
        reject(new Error('iflow version is empty'))
        return
      }
      resolve(version)
    })
  })
}

/**
 * 比较两个语义化版本号
 * @param {string} a - 版本 a (如 "0.5.19")
 * @param {string} b - 版本 b (如 "0.6.0")
 * @returns {number} -1 (a<b), 0 (a===b), 1 (a>b)
 */
function compareVersions(a, b) {
  const partsA = a.replace(/^v/, '').split('.').map(Number)
  const partsB = b.replace(/^v/, '').split('.').map(Number)
  const len = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA < numB) return -1
    if (numA > numB) return 1
  }
  return 0
}

/**
 * 检查 Mod 版本兼容性
 * @param {Object} mod - Mod 对象
 * @param {string} currentVersion - 当前 iflow.js 版本
 * @returns {{ compatible: boolean, reason?: string }}
 */
function checkVersionCompatibility(mod, currentVersion) {
  if (!mod.iflowVersion || !mod.iflowVersionConstraint) {
    // 未声明版本要求，默认兼容
    return { compatible: true }
  }

  const constraint = mod.iflowVersionConstraint
  const required = mod.iflowVersion

  if (constraint === '*') {
    return { compatible: true }
  }

  if (constraint.endsWith('+')) {
    // >= required
    const baseVersion = constraint.slice(0, -1)
    if (compareVersions(currentVersion, baseVersion) >= 0) {
      return { compatible: true }
    }
    return {
      compatible: false,
      reason: t('iflow.compatibility.tooOld', { required: baseVersion, current: currentVersion }),
    }
  }

  if (constraint.endsWith('-')) {
    // <= required
    const baseVersion = constraint.slice(0, -1)
    if (compareVersions(currentVersion, baseVersion) <= 0) {
      return { compatible: true }
    }
    return {
      compatible: false,
      reason: t('iflow.compatibility.tooNew', { required: baseVersion, current: currentVersion }),
    }
  }

  // 精确版本匹配
  if (compareVersions(currentVersion, constraint) === 0) {
    return { compatible: true }
  }
  return {
    compatible: false,
    reason: t('iflow.compatibility.exactRequired', { required: constraint, current: currentVersion }),
  }
}

/**
 * 验证 Mod 包结构
 * @param {string} extractDir - 解压后的目录
 * @returns {{ valid: boolean, error?: string, metadata?: Object }}
 */
function validateModPackage(extractDir) {
  // 1. 检查 mod.json
  const modJsonPath = path.join(extractDir, 'mod.json')
  if (!fs.existsSync(modJsonPath)) {
    return { valid: false, error: t('iflow.errors.missingModJson') }
  }

  // 2. 解析 mod.json
  let metadata
  try {
    const content = fs.readFileSync(modJsonPath, 'utf-8')
    metadata = JSON.parse(content)
  } catch {
    return { valid: false, error: t('iflow.errors.invalidModJson') }
  }

  // 3. 检查必需字段
  const requiredFields = ['name', 'type', 'version']
  for (const field of requiredFields) {
    if (!metadata[field]) {
      return { valid: false, error: t('iflow.errors.missingRequiredField', { field }) }
    }
  }

  // 4. 检查 type 有效性
  const validTypes = ['patch', 'replace', 'append', 'prepend']
  if (!validTypes.includes(metadata.type)) {
    return { valid: false, error: t('iflow.errors.invalidModType', { type: metadata.type }) }
  }

  // 5. 检查主体文件
  const mainFile = metadata.type === 'patch' ? 'patch.diff' : 'code.js'
  const mainFilePath = path.join(extractDir, mainFile)
  if (!fs.existsSync(mainFilePath)) {
    return { valid: false, error: t('iflow.errors.missingMainFile', { file: mainFile }) }
  }

  // 6. 如果没有 id，生成一个
  if (!metadata.id) {
    metadata.id = generateId()
  }

  return { valid: true, metadata }
}

/**
 * 清理文件名（移除特殊字符）
 * @param {string} name
 * @returns {string}
 */
function sanitizeFileName(name) {
  return name
    .replace(/[/\\?*:|"<>]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)
}

/**
 * 流式读取文件
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function readFileStream(filePath) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(chunks.join('')))
    stream.on('error', reject)
  })
}

/**
 * 原子写入文件（流式）
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<void>}
 */
async function writeFileAtomically(filePath, content) {
  const tmpPath = filePath + '.tmp'
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(tmpPath, { encoding: 'utf-8' })
    writeStream.write(content)
    writeStream.end()
    writeStream.on('finish', () => {
      fs.rename(tmpPath, filePath, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    writeStream.on('error', reject)
  })
}

/**
 * 应用 Mod 到 iflow.js
 * 读取 iflow.js，按 installedAt 升序应用所有启用的 Mod，然后写回
 * @param {Object[]} enabledMods - 启用的 Mod 列表（已按 installedAt 升序排序）
 * @param {string} iflowPath - iflow.js 文件路径
 */
async function applyModsToIflowJs(enabledMods, iflowPath) {
  let content = await readFileStream(iflowPath)

  for (const mod of enabledMods) {
    const modDir = path.join(MODS_DIR, mod.id)
    const mainFile = mod.type === 'patch' ? 'patch.diff' : 'code.js'
    const mainFilePath = path.join(modDir, mainFile)

    if (!fs.existsSync(mainFilePath)) {
      throw new Error(t('iflow.errors.missingMainFile', { file: mainFile, mod: mod.name }))
    }

    const modContent = fs.readFileSync(mainFilePath, 'utf-8')

    switch (mod.type) {
      case 'replace':
        content = modContent
        break
      case 'append':
        content += '\n' + modContent
        break
      case 'prepend':
        content = modContent + '\n' + content
        break
      case 'patch':
        // Phase 1 不实现 patch 类型
        throw new Error(t('iflow.errors.patchNotSupported'))
      default:
        throw new Error(t('iflow.errors.invalidModType', { type: mod.type }))
    }
  }

  await writeFileAtomically(iflowPath, content)
}

/**
 * 从 iflow.js 中移除所有 Mod 并恢复原始内容
 * 此操作通过重新应用所有仍启用的 Mod 来实现
 * @param {Object[]} stillEnabledMods - 仍然启用的 Mod 列表
 * @param {string} iflowPath - iflow.js 文件路径
 */
async function reapplyMods(stillEnabledMods, iflowPath) {
  // 需要 iflow.js 的原始备份来重新计算
  // 简化策略：禁用 Mod 时，先备份当前 iflow.js，再重新应用所有启用的 Mod
  // 这里需要读取原始 iflow.js 内容
  // 由于我们无法轻易"撤销"已应用的 Mod，采用完整重新应用策略
  // 这要求我们保持 iflow.js 的原始备份

  const backupPath = path.join(MODS_DIR, 'iflow.js.original')

  // 如果没有原始备份，创建一个
  if (!fs.existsSync(backupPath)) {
    // 第一次启用 Mod 前，应该已经创建了备份
    // 如果没有备份，说明 iflow.js 可能已被修改，无法恢复
    throw new Error(t('iflow.errors.noOriginalBackup'))
  }

  // 从原始备份恢复
  const originalContent = await readFileStream(backupPath)
  await writeFileAtomically(iflowPath, originalContent)

  // 重新应用仍启用的 Mod
  if (stillEnabledMods.length > 0) {
    await applyModsToIflowJs(stillEnabledMods, iflowPath)
  }
}

module.exports = {
  isPathSafe,
  ensureModsDir,
  generateId,
  readModsMetadata,
  writeModsMetadata,
  getNpmPrefix,
  getIflowPath,
  checkIflowExists,
  getIflowVersion,
  compareVersions,
  checkVersionCompatibility,
  validateModPackage,
  sanitizeFileName,
  readFileStream,
  writeFileAtomically,
  applyModsToIflowJs,
  reapplyMods,
  MODS_DIR,
  MODS_JSON_PATH,
}
