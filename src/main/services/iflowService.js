/**
 * iFlow Mod 业务逻辑服务
 * 处理 Mod 包的导入、导出、启用/禁用、版本兼容性等核心逻辑
 */

const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const crypto = require('crypto')
const diff = require('diff')

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
// Strip ANSI escape codes from terminal output (e.g. \x1b[38;5;223m)
const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

function stripAnsi(str) {
  return str.replace(ANSI_REGEX, '')
}

async function getIflowVersion() {
  return new Promise((resolve, reject) => {
    exec('iflow -v', { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to get iflow version: ${error.message}`))
        return
      }
      const raw = (stdout || stderr || '')
      const cleaned = stripAnsi(raw)
      // Version always appears in the last non-empty line
      const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l)
      let version = null
      for (let i = lines.length - 1; i >= 0; i--) {
        const match = lines[i].match(/\bv?(\d+\.\d+\.\d+)\b/)
        if (match) {
          version = match[0]
          break
        }
      }
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
  const validTypes = ['patch', 'replace', 'append', 'prepend', 'diff']
  if (!validTypes.includes(metadata.type)) {
    return { valid: false, error: t('iflow.errors.invalidModType', { type: metadata.type }) }
  }

  // 5. dependsOn 是可选字段，但如果有值必须是字符串数组
  if (metadata.dependsOn !== undefined) {
    if (!Array.isArray(metadata.dependsOn)) {
      return { valid: false, error: t('iflow.errors.invalidDependsOn') }
    }
    if (!metadata.dependsOn.every(item => typeof item === 'string')) {
      return { valid: false, error: t('iflow.errors.invalidDependsOnItems') }
    }
  }

  // 6. 检查主体文件
  const isPatchType = metadata.type === 'patch' || metadata.type === 'diff'
  const mainFile = isPatchType ? 'patch.diff' : 'code.js'
  const mainFilePath = path.join(extractDir, mainFile)
  if (!fs.existsSync(mainFilePath)) {
    // patch/diff 类型可接受 code.js 作为替代，后续自动生成 patch.diff
    if (isPatchType) {
      const altFilePath = path.join(extractDir, 'code.js')
      if (fs.existsSync(altFilePath)) {
        metadata._needsDiffGeneration = true
      } else {
        return { valid: false, error: t('iflow.errors.missingMainFile', { file: `${mainFile} 或 code.js` }) }
      }
    } else {
      return { valid: false, error: t('iflow.errors.missingMainFile', { file: mainFile }) }
    }
  }

  // 7. 如果没有 id，生成一个
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
 * 读取 iflow.js，按 enabledAt 升序应用所有启用的 Mod，然后写回
 * @param {Object[]} enabledMods - 启用的 Mod 列表（已按 enabledAt 升序排序）
 * @param {string} iflowPath - iflow.js 文件路径
 * @param {Function} onProgress - 进度回调 (current, total, modName)
 */
async function applyModsToIflowJs(enabledMods, iflowPath, onProgress = null) {
  let content = await readFileStream(iflowPath)
  const total = enabledMods.length

  for (let i = 0; i < enabledMods.length; i++) {
    const mod = enabledMods[i]

    // 报告进度
    if (onProgress) {
      onProgress(i + 1, total, mod.name)
    }

    const modDir = path.join(MODS_DIR, mod.id)
    const mainFile = mod.type === 'patch' || mod.type === 'diff' ? 'patch.diff' : 'code.js'
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
      case 'diff': {
        const codeJsPath = path.join(modDir, 'code.js')
        if (fs.existsSync(codeJsPath)) {
          // code.js 存在：使用上下文无关的行级 patch 应用，
          // 仅应用用户对原始文件的改动，不干扰其他 Mod 的变更
          const codeJsContent = fs.readFileSync(codeJsPath, 'utf-8')
          const backupPath = path.join(MODS_DIR, 'iflow.js.original')
          const originalContent = fs.existsSync(backupPath) ? fs.readFileSync(backupPath, 'utf-8') : content
          console.log('[iflowService] applyCodeJsChanges called with onProgress:', !!onProgress)
          content = await applyCodeJsChanges(originalContent, codeJsContent, content, onProgress)
        } else {
          // 无 code.js（手写 patch.diff 或旧版本导入），使用预生成补丁
          content = applyUnifiedDiff(content, modContent)
        }
        break
      }
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
 * @param {Function} onProgress - 进度回调 (current, total, modName)
 */
async function reapplyMods(stillEnabledMods, iflowPath, onProgress = null) {
  const backupPath = path.join(MODS_DIR, 'iflow.js.original')

  if (!fs.existsSync(backupPath)) {
    throw new Error(t('iflow.errors.noOriginalBackup'))
  }

  const originalContent = await readFileStream(backupPath)
  await writeFileAtomically(iflowPath, originalContent)

  if (stillEnabledMods.length > 0) {
    await applyModsToIflowJs(stillEnabledMods, iflowPath, onProgress)
  }
}

/**
 * 从 code.js 自动生成 patch.diff
 * 使用当前的 iflow.js（已包含所有已启用 Mod）作为 base，
 * 生成 unified diff。code.js 会保留以供后续启用时重新生成。
 *
 * @param {string} modId - Mod ID
 */
async function generateDiffFromCode(modId) {
  const modDir = path.join(MODS_DIR, modId)
  const codePath = path.join(modDir, 'code.js')
  const patchPath = path.join(modDir, 'patch.diff')

  if (!fs.existsSync(codePath)) return
  if (fs.existsSync(patchPath)) return  // patch.diff 已存在，优先保留

  const iflowPath = await getIflowPath()
  if (!fs.existsSync(iflowPath)) {
    throw new Error(t('iflow.errors.iflowNotFound'))
  }

  const codeContent = fs.readFileSync(codePath, 'utf-8')

  // 使用原始 iflow.js 备份作为生成 patch 的基准，
  // 这样 patch 仅包含用户实际意图的改动，不包含其他已启用 Mod 的变更
  const backupPath = path.join(MODS_DIR, 'iflow.js.original')
  if (!fs.existsSync(backupPath)) {
    // 尚无原始备份时，用当前 iflow.js 创建并作为基准
    const currentContent = await readFileStream(iflowPath)
    const patchContent = diff.createPatch('iflow.js', currentContent, codeContent)
    fs.writeFileSync(patchPath, patchContent, 'utf-8')
    return
  }

  const baseContent = await readFileStream(backupPath)
  const patchContent = diff.createPatch('iflow.js', baseContent, codeContent)

  // 写入 patch.diff，保留 code.js 供后续启用时重新生成
  fs.writeFileSync(patchPath, patchContent, 'utf-8')
}

/**
 * 合并同一行内来自不同 Mod 的字符级改动
 * 对 original→contentA 和 original→contentB 的改动做字符级 diff，
 * 如果两者的改动区域不重叠，自动合并；否则报告冲突。
 * @param {string} origLine - 原始行
 * @param {string} contentLine - content 中的行（可能已被其他 Mod 修改）
 * @param {string} modLine - 当前 Mod 修改后的行
 * @returns {{ merged: string, conflict: boolean }}
 */
function mergeLineChanges(origLine, contentLine, modLine) {
  // 如果 content 行与原始行相同，说明没有其他 Mod 改过，直接用 Mod 的版本
  if (contentLine === origLine) {
    return { merged: modLine, conflict: false }
  }
  // 如果 Mod 行与原始行相同，说明当前 Mod 没改这行，保留 content 版本
  if (modLine === origLine) {
    return { merged: contentLine, conflict: false }
  }
  // 如果 Mod 行与 content 行相同，两者改法一致，无冲突
  if (modLine === contentLine) {
    return { merged: modLine, conflict: false }
  }

  // 两者都修改了原始行且改法不同 → 尝试字符级合并
  const changesA = diff.diffChars(origLine, contentLine)
  const changesB = diff.diffChars(origLine, modLine)

  // 收集两边的改动区域（相对于原始行的字符偏移）
  const regionsA = [] // { start, end, value }
  const regionsB = []
  let pos = 0
  for (const c of changesA) {
    if (c.added) {
      regionsA.push({ start: pos, end: pos, value: c.value })
    } else if (c.removed) {
      regionsA.push({ start: pos, end: pos + c.count, value: '' })
      pos += c.count
    } else {
      pos += c.count
    }
  }
  pos = 0
  for (const c of changesB) {
    if (c.added) {
      regionsB.push({ start: pos, end: pos, value: c.value })
    } else if (c.removed) {
      regionsB.push({ start: pos, end: pos + c.count, value: '' })
      pos += c.count
    } else {
      pos += c.count
    }
  }

  // 检查改动区域是否重叠
  for (const ra of regionsA) {
    for (const rb of regionsB) {
      // 重叠条件：ra 的删除区域与 rb 的删除区域有交集
      if (ra.end > rb.start && rb.end > ra.start) {
        // 有重叠，无法自动合并
        logger.warn(`[applyCodeJsChanges] Line-level merge conflict detected, using current mod's version`)
        return { merged: modLine, conflict: true }
      }
    }
  }

  // 无重叠，可以合并：先应用 A 的改动，再在结果上应用 B 的改动
  // 简化策略：按偏移量从大到小排序，先应用靠后的改动（避免偏移量漂移）
  const allRegions = [
    ...regionsA.map(r => ({ ...r, source: 'A' })),
    ...regionsB.map(r => ({ ...r, source: 'B' })),
  ]
  // 按起始位置降序排列，先处理靠后的改动
  allRegions.sort((a, b) => b.start - a.start)

  let merged = origLine
  for (const region of allRegions) {
    if (region.value === '') {
      // 删除操作
      merged = merged.slice(0, region.start) + merged.slice(region.end)
    } else {
      // 插入操作（start === end）
      merged = merged.slice(0, region.start) + region.value + merged.slice(region.start)
    }
  }

  return { merged, conflict: false }
}

/**
 * 内部函数：应用 code.js 补丁（不通过 Worker）
 * 供 Worker 管理器在小文件时调用
 */
function applyCodeJsChangesInternal(original, codeJs, content) {
  // 统一去掉 \r，避免 \r\n vs \n 导致 diffArray 认为每行都不同
  const origLines = original.replace(/\r\n/g, '\n').replace(/\r/g, '').split('\n')
  const codeLines = codeJs.replace(/\r\n/g, '\n').replace(/\r/g, '').split('\n')
  const contentLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '').split('\n')

  const changes = diff.diffArrays(origLines, codeLines)

  const result = []
  let contentPos = 0

  for (let ci = 0; ci < changes.length; ci++) {
    const change = changes[ci]
    if (change.removed) {
      const nextChange = changes[ci + 1]
      if (nextChange && nextChange.added) {
        const removedCount = change.count
        const addedCount = nextChange.count
        const maxPair = Math.max(removedCount, addedCount)

        for (let i = 0; i < maxPair; i++) {
          const origLine = i < removedCount ? change.value[i] : ''
          const modLine = i < addedCount ? nextChange.value[i] : ''
          const contentLine = contentPos < contentLines.length ? contentLines[contentPos] : ''

          if (i < removedCount) {
            const { merged } = mergeLineChanges(origLine, contentLine, modLine)
            result.push(merged)
            contentPos++
          } else {
            result.push(modLine)
          }
        }
        ci++
      } else {
        contentPos += change.count
      }
    } else if (change.added) {
      result.push(...change.value)
    } else {
      for (let i = 0; i < change.count; i++) {
        if (contentPos < contentLines.length) {
          result.push(contentLines[contentPos])
          contentPos++
        }
      }
    }
  }

  while (contentPos < contentLines.length) {
    result.push(contentLines[contentPos])
    contentPos++
  }

  return result.join('\n')
}

/**
 * 应用 code.js 补丁（使用 Worker 处理大文件）
 * @param {string} original - 原始内容
 * @param {string} codeJs - Mod 的 code.js 内容
 * @param {string} content - 当前 iflow.js 内容
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 应用后的内容
 */
async function applyCodeJsChanges(original, codeJs, content, onProgress = null) {
  console.log('[iflowService] applyCodeJsChanges called, sizes - original:', original.length, 'codeJs:', codeJs.length)
  // 小文件直接使用主线程处理
  if (original.length < 1024 * 1024 && codeJs.length < 1024 * 1024) {
    console.log('[iflowService] Small file, using internal (no progress)')
    return applyCodeJsChangesInternal(original, codeJs, content)
  }

  // 大文件使用 Worker 处理
  console.log('[iflowService] Large file, using Worker')
  try {
    const { applyCodeJsChanges } = require('../workers/modWorkerManager')
    return await applyCodeJsChanges(original, codeJs, content, onProgress)
  } catch (workerError) {
    logger.warn(`Worker failed, falling back to main thread: ${workerError.message}`)
    return applyCodeJsChangesInternal(original, codeJs, content)
  }
}

/**
 * 对内容应用 unified diff 补丁
 * 使用 diff 库的 applyPatch，已处理尾随换行符兼容性
 */
function applyUnifiedDiff(content, diffText) {
  // 给末尾无换行的内容加一个换行，避免 diff 库因尾随换行缺失而拒绝应用
  const hasTrailingNewline = content.endsWith('\n')
  const source = hasTrailingNewline ? content : content + '\n'
  const result = diff.applyPatch(source, diffText)
  if (result === false) {
    throw new Error('diff.applyPatch: Patch application returned false (context mismatch)')
  }
  // 若原始内容尾部无换行，移除补丁结果尾部新加的换行，保持行为一致
  return hasTrailingNewline ? result : result.replace(/\n$/, '')
}

/**
 * 检测同一行内两个 Mod 的改动区域是否真正重叠
 * 通过字符级 diff 判断：如果两个 Mod 修改了同一行的不同位置，则不冲突；
 * 只有修改了同一位置（删除区域有交集）才算真正冲突。
 * @param {string} origLine - 原始行内容
 * @param {string} modALine - Mod A 修改后的行
 * @param {string} modBLine - Mod B 修改后的行
 * @returns {boolean} true 表示存在真正的行内冲突
 */
function hasOverlappingChanges(origLine, modALine, modBLine) {
  // 如果任一 Mod 没改这行，无冲突
  if (modALine === origLine || modBLine === origLine) return false
  // 如果两者改法相同，无冲突
  if (modALine === modBLine) return false

  // 收集两边的删除区域
  const regionsA = []
  const regionsB = []
  let pos = 0
  for (const c of diff.diffChars(origLine, modALine)) {
    if (c.removed) {
      regionsA.push({ start: pos, end: pos + c.count })
      pos += c.count
    } else if (!c.added) {
      pos += c.count
    }
  }
  pos = 0
  for (const c of diff.diffChars(origLine, modBLine)) {
    if (c.removed) {
      regionsB.push({ start: pos, end: pos + c.count })
      pos += c.count
    } else if (!c.added) {
      pos += c.count
    }
  }

  // 检查删除区域是否有交集
  for (const ra of regionsA) {
    for (const rb of regionsB) {
      if (ra.end > rb.start && rb.end > ra.start) {
        return true // 有重叠 → 真正冲突
      }
    }
  }
  return false // 删除区域不重叠 → 可以自动合并
}

/**
 * 内部函数：检测 Mod 冲突（不通过 Worker）
 * 供 Worker 管理器在小文件时调用
 * @param {string} original - 原始 iflow.js 内容
 * @param {Array<{modId: string, modName: string, content: string}>} modsCode - Mod 代码列表
 * @returns {Array} 冲突列表
 */
function detectConflictsInternal(original, modsCode) {
  const normalize = s => s.replace(/\r\n/g, '\n').replace(/\r/g, '')
  const originalLines = normalize(original).split('\n')

  const modChanges = []
  for (const modCode of modsCode) {
    const code = normalize(modCode.content).split('\n')
    const changedLines = []
    const maxLen = Math.max(originalLines.length, code.length)

    for (let i = 0; i < maxLen; i++) {
      if ((originalLines[i] || '') !== (code[i] || '')) {
        changedLines.push({
          lineNum: i + 1,
          content: code[i] || '',
        })
      }
    }
    modChanges.push({ modId: modCode.modId, modName: modCode.modName, changedLines })
  }

  const conflicts = []
  for (let i = 0; i < modChanges.length; i++) {
    for (let j = i + 1; j < modChanges.length; j++) {
      const a = modChanges[i]
      const b = modChanges[j]
      const lineMapA = new Map(a.changedLines.map(cl => [cl.lineNum, cl.content]))
      const conflictingLines = []

      for (const clB of b.changedLines) {
        const clAContent = lineMapA.get(clB.lineNum)
        if (clAContent !== undefined) {
          const origLine = originalLines[clB.lineNum - 1] || ''
          if (hasOverlappingChanges(origLine, clAContent, clB.content)) {
            conflictingLines.push(clB.lineNum)
          }
        }
      }

      if (conflictingLines.length > 0) {
        conflicts.push({
          modA: { id: a.modId, name: a.modName },
          modB: { id: b.modId, name: b.modName },
          lines: conflictingLines,
        })
      }
    }
  }

  return conflicts
}

/**
 * 检测已启用 Mod 之间的冲突（使用 Worker 处理大文件）
 * @param {Object[]} enabledMods - 已启用的 Mod 列表
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} 冲突列表
 */
async function detectConflicts(enabledMods, onProgress = null) {
  console.log('[iflowService] detectConflicts called, enabledMods:', enabledMods?.length, 'onProgress:', !!onProgress)
  const backupPath = path.join(MODS_DIR, 'iflow.js.original')
  if (!fs.existsSync(backupPath)) {
    console.log('[iflowService] No backup file, returning empty')
    return []
  }

  const original = fs.readFileSync(backupPath, 'utf-8')
  console.log('[iflowService] Original size:', original.length, 'bytes')

  // 收集 Mod 代码
  const modsCode = []
  for (const mod of enabledMods) {
    const codeJsPath = path.join(MODS_DIR, mod.id, 'code.js')
    if (!fs.existsSync(codeJsPath)) continue
    try {
      const content = fs.readFileSync(codeJsPath, 'utf-8')
      console.log('[iflowService] Mod:', mod.id, 'code.js size:', content.length, 'bytes')
      modsCode.push({
        modId: mod.id,
        modName: mod.name,
        content,
      })
    } catch {
      // 无法读取的 Mod 跳过
    }
  }

  // 小文件直接使用主线程处理
  const isSmallFile = original.length < 1024 * 1024 && modsCode.every(m => m.content.length < 1024 * 1024)
  console.log('[iflowService] isSmallFile:', isSmallFile, 'original:', original.length, 'mod sizes:', modsCode.map(m => m.content.length))
  if (isSmallFile) {
    console.log('[iflowService] Using internal (no progress)')
    return detectConflictsInternal(original, modsCode)
  }

  // 大文件使用 Worker 处理
  console.log('[iflowService] Using Worker')
  try {
    const { detectConflicts } = require('../workers/modWorkerManager')
    return await detectConflicts(original, modsCode, onProgress)
  } catch (workerError) {
    logger.warn(`Worker failed, falling back to main thread: ${workerError.message}`)
    return detectConflictsInternal(original, modsCode)
  }
}

/**
 * 解析 includeMap 中的路径标记为实际路径
 * "core" → iflow.js 所在目录 (bundle/)
 * "~/.iflow" → ~/.iflow/ 目录
 * 其他值 → 原样返回（视为相对 ~/.iflow 的子路径）
 * @param {string} token - includeMap 中的目标路径标记
 * @param {string} iflowPath - iflow.js 文件路径（用于解析 "core"）
 * @returns {Promise<string>} 解析后的绝对路径
 */
async function resolveIncludeMapPath(token, iflowPath) {
  if (token === 'core') {
    // iflow.js 所在目录（即 bundle/ 目录）
    if (iflowPath && fs.existsSync(iflowPath)) {
      return path.dirname(iflowPath)
    }
    // 如果 iflowPath 不可用，尝试获取
    try {
      const resolvedPath = await getIflowPath()
      return path.dirname(resolvedPath)
    } catch {
      throw new Error(t('iflow.errors.iflowPathNotFound'))
    }
  }
  if (token === '~/.iflow') {
    return IFLOW_BASE_DIR
  }
  // 其他值视为相对 ~/.iflow 的子路径
  return path.join(IFLOW_BASE_DIR, token)
}

/**
 * 部署 includeMap 中指定的额外文件到目标目录
 * 在 Mod 启用时调用
 * @param {string} modId - Mod ID
 * @param {Object} includeMap - 文件名 → 目标路径标记的映射
 * @param {string} iflowPath - iflow.js 文件路径
 * @returns {Promise<Array<{file: string, target: string}>>} 已部署的文件列表
 */
async function deployIncludeFiles(modId, includeMap, iflowPath) {
  if (!includeMap || typeof includeMap !== 'object') {
    logger.warn(`deployIncludeFiles: includeMap is empty or not an object for mod ${modId}`, includeMap)
    return []
  }

  const modDir = path.join(MODS_DIR, modId)
  if (!fs.existsSync(modDir)) {
    throw new Error(`Mod directory not found: ${modDir}`)
  }

  const deployed = []

  for (const [fileName, targetToken] of Object.entries(includeMap)) {
    const srcPath = path.join(modDir, fileName)
    if (!fs.existsSync(srcPath)) {
      throw new Error(t('iflow.errors.includeMapFileNotFound', { file: fileName }))
    }

    const targetDir = await resolveIncludeMapPath(targetToken, iflowPath)
    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const destPath = path.join(targetDir, fileName)

    // 如果目标文件已存在且有用户修改，先同步回 mod 目录保存
    if (fs.existsSync(destPath)) {
      const destContent = fs.readFileSync(destPath)
      const srcContent = fs.readFileSync(srcPath)
      if (!destContent.equals(srcContent)) {
        // 用户修改了目标文件 → 同步回 mod 目录持久化
        fs.copyFileSync(destPath, srcPath)
        logger.info(`includeMap user modifications synced to mod before deploy: ${destPath} -> ${srcPath}`)
      }
    }

    fs.copyFileSync(srcPath, destPath)
    logger.info(`includeMap deployed: ${srcPath} -> ${destPath}`)
    deployed.push({ file: fileName, target: destPath })
  }

  return deployed
}

/**
 * 移除 includeMap 中部署的额外文件，恢复备份
 * 在 Mod 禁用或删除时调用
 * @param {string} modId - Mod ID
 * @param {Object} includeMap - 文件名 → 目标路径标记的映射
 * @param {string} iflowPath - iflow.js 文件路径
 * @returns {Promise<void>}
 */
async function removeIncludeFiles(modId, includeMap, iflowPath) {
  if (!includeMap || typeof includeMap !== 'object') {
    return
  }

  const modDir = path.join(MODS_DIR, modId)

  for (const [fileName, targetToken] of Object.entries(includeMap)) {
    const targetDir = await resolveIncludeMapPath(targetToken, iflowPath)
    const destPath = path.join(targetDir, fileName)

    if (!fs.existsSync(destPath)) continue

    // 检查用户是否修改了目标文件，如果有则同步回 mod 目录保存
    const srcPath = path.join(modDir, fileName)
    if (fs.existsSync(srcPath)) {
      const destContent = fs.readFileSync(destPath)
      const srcContent = fs.readFileSync(srcPath)
      if (!destContent.equals(srcContent)) {
        fs.copyFileSync(destPath, srcPath)
        logger.info(`includeMap user modifications synced to mod: ${destPath} -> ${srcPath}`)
      }
    }

    // 删除目标文件（下次启用时从 mod 目录重新部署）
    fs.unlinkSync(destPath)
    logger.info(`includeMap removed: ${destPath}`)

    // 清理可能残留的旧版 .iflow-mod-bak 文件
    const bakPath = destPath + '.iflow-mod-bak'
    if (fs.existsSync(bakPath)) {
      fs.unlinkSync(bakPath)
      logger.info(`includeMap cleaned up legacy backup: ${bakPath}`)
    }
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
  generateDiffFromCode,
  applyUnifiedDiff,
  applyCodeJsChangesInternal,
  detectConflicts,
  detectConflictsInternal,
  resolveIncludeMapPath,
  deployIncludeFiles,
  removeIncludeFiles,
  MODS_DIR,
  MODS_JSON_PATH,
  IFLOW_BASE_DIR,
}
