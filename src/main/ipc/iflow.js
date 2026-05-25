/**
 * iFlow Mod 管理 IPC 处理器
 * 处理 Mod 的导入、导出、启用/禁用、删除、版本兼容性等操作
 */

const { ipcMain, dialog, app } = require('electron')
const path = require('path')
const fs = require('fs')

const { t } = require('../utils/translations')
const { logger } = require('../utils/logger')
const { wrapIpcHandler, successResult, errorResult, ErrorCodes } = require('../utils/errors')
const {
  isPathSafe,
  ensureModsDir,
  readModsMetadata,
  writeModsMetadata,
  getIflowVersion,
  getIflowPath,
  checkIflowExists,
  checkVersionCompatibility,
  validateModPackage,
  sanitizeFileName,
  applyModsToIflowJs,
  reapplyMods,
  generateDiffFromCode,
  detectConflicts,
  deployIncludeFiles,
  removeIncludeFiles,
  MODS_DIR,
  IFLOW_BASE_DIR,
} = require('../services/iflowService')

/**
 * 注册 iFlow Mod 管理 IPC 处理器
 */
function registerIflowIpcHandlers() {
  // ── 获取 iflow.js 版本号 ────────────────────────────────
  ipcMain.handle('iflow:get-version', wrapIpcHandler(async () => {
    try {
      const version = await getIflowVersion()
      return { success: true, version }
    } catch (error) {
      // iflow 命令不可用时，返回空版本（不阻断操作）
      return { success: true, version: null, error: error.message }
    }
  }, 'iflow:get-version'))

  // ── 获取已安装 Mod 列表 ─────────────────────────────────
  ipcMain.handle('iflow:list-mods', wrapIpcHandler(async () => {
    const metadata = readModsMetadata()
    // 按 installedAt 升序排序
    const mods = metadata.mods.sort((a, b) => a.installedAt - b.installedAt)
    return { success: true, mods }
  }, 'iflow:list-mods'))

  // ── 获取 Mod 版本兼容性 ──────────────────────────────────
  ipcMain.handle('iflow:get-mod-compatibility', wrapIpcHandler(async (event, modId) => {
    const metadata = readModsMetadata()
    const mod = metadata.mods.find(m => m.id === modId)

    if (!mod) {
      return errorResult(t('iflow.errors.modNotFound', { id: modId }), ErrorCodes.FILE_NOT_FOUND)
    }

    let currentVersion = null
    try {
      currentVersion = await getIflowVersion()
    } catch {
      // 无法获取版本号时，默认兼容
      return {
        success: true,
        compatible: true,
        currentVersion: null,
        modVersion: mod.iflowVersion || null,
        constraint: mod.iflowVersionConstraint || null,
        reason: t('iflow.compatibility.versionUnavailable'),
      }
    }

    const result = checkVersionCompatibility(mod, currentVersion)
    return {
      success: true,
      compatible: result.compatible,
      currentVersion,
      modVersion: mod.iflowVersion || null,
      constraint: mod.iflowVersionConstraint || null,
      reason: result.reason || null,
    }
  }, 'iflow:get-mod-compatibility'))

  // ── 启用/禁用 Mod ────────────────────────────────────────
  ipcMain.handle('iflow:enable-mod', wrapIpcHandler(async (event, modId, enabled) => {
    const metadata = readModsMetadata()
    const modIndex = metadata.mods.findIndex(m => m.id === modId)

    if (modIndex === -1) {
      return errorResult(t('iflow.errors.modNotFound', { id: modId }), ErrorCodes.FILE_NOT_FOUND)
    }

    const mod = metadata.mods[modIndex]

    // 如果 mods.json 中没有 includeMap，尝试从 mod 目录的 mod.json 读取
    if (!mod.includeMap) {
      const modJsonPath = path.join(MODS_DIR, modId, 'mod.json')
      if (fs.existsSync(modJsonPath)) {
        try {
          const modJson = JSON.parse(fs.readFileSync(modJsonPath, 'utf-8'))
          if (modJson.includeMap) {
            mod.includeMap = modJson.includeMap
            // 同步回写到 mods.json
            metadata.mods[modIndex].includeMap = modJson.includeMap
          }
          // 同步 include 字段
          if (modJson.include && !mod.include) {
            mod.include = modJson.include
            metadata.mods[modIndex].include = modJson.include
          }
        } catch (e) {
          logger.warn(`Failed to read mod.json for includeMap: ${e.message}`)
        }
      }
    }

    // 如果已经是目标状态，直接返回
    if (mod.enabled === enabled) {
      return successResult()
    }

    // 启用前检查版本兼容性
    if (enabled) {
      let currentVersion = null
      try {
        currentVersion = await getIflowVersion()
      } catch {
        // 无法获取版本号，允许启用（降级策略）
      }

      if (currentVersion) {
        const compat = checkVersionCompatibility(mod, currentVersion)
        if (!compat.compatible) {
          return errorResult(compat.reason, 'IFLOW_VERSION_INCOMPATIBLE')
        }
      }

      // 检查依赖是否已安装
      if (mod.dependsOn && mod.dependsOn.length > 0) {
        const missingDeps = mod.dependsOn.filter(depId => {
          return !metadata.mods.find(m => m.id === depId)
        })

        if (missingDeps.length > 0) {
          return errorResult(
            t('iflow.errors.missingDependencies', { deps: missingDeps.join(', ') }),
            'IFLOW_MISSING_DEPENDENCIES'
          )
        }
      }
    }

    // 获取 iflow.js 路径
    let iflowPath
    try {
      iflowPath = await getIflowPath()
    } catch (error) {
      return errorResult(t('iflow.errors.iflowPathNotFound'), ErrorCodes.FILE_NOT_FOUND)
    }

    if (!fs.existsSync(iflowPath)) {
      return errorResult(t('iflow.errors.iflowNotFound'), ErrorCodes.FILE_NOT_FOUND)
    }

    // 确保原始备份存在
    const backupPath = path.join(MODS_DIR, 'iflow.js.original')
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(iflowPath, backupPath)
    }

    // 更新 Mod 启用状态
    metadata.mods[modIndex].enabled = enabled
    metadata.mods[modIndex].lastModified = Date.now()

    // 获取仍然启用的 Mod 列表（按 installedAt 升序）
    const enabledMods = metadata.mods
      .filter(m => m.enabled)
      .sort((a, b) => a.installedAt - b.installedAt)

    // 启用时检测冲突（异步，支持大文件）
    if (enabled) {
      const progressCallback = (current, total, modName) => {
        const sender = event.sender
        if (!sender.isDestroyed()) {
          sender.send('iflow:detect-conflicts-progress', { current, total, modName })
        }
      }

      const conflicts = await detectConflicts(enabledMods, progressCallback)
      if (conflicts.length > 0) {
        // 构建冲突描述
        const conflictLines = []
        let nameA = '', nameB = ''
        for (const c of conflicts) {
          nameA = c.modA.name || c.modA.id
          nameB = c.modB.name || c.modB.id
          conflictLines.push(...c.lines)
        }
        conflictLines.sort((a, b) => a - b)

        const conflictDetail = conflictLines.slice(0, 5).join(', ') + (conflictLines.length > 5 ? `... (共${conflictLines.length}行)` : '')

        const { callConfirmDialog } = require('./dialogs')
        const confirmed = await callConfirmDialog(
          'iflow.conflictDetection.title',
          'iflow.conflictDetection.message',
          { modA: nameA, modB: nameB, count: conflictLines.length, lines: conflictDetail }
        )

        if (!confirmed) {
          // 用户取消，回滚状态
          metadata.mods[modIndex].enabled = false
          metadata.mods[modIndex].lastModified = Date.now()
          writeModsMetadata(metadata)
          return { success: false, cancelled: true, conflicts: true }
        }
      }
    }

    // 部署/移除 includeMap 额外文件（必须在 reapplyMods 之前，
    // 因为 includeMap 文件可能被 iflow.js 引用）
    let deployedFiles = []
    try {
      if (enabled && mod.includeMap) {
        deployedFiles = await deployIncludeFiles(mod.id, mod.includeMap, iflowPath)
      } else if (!enabled && mod.includeMap) {
        await removeIncludeFiles(mod.id, mod.includeMap, iflowPath)
      }
    } catch (includeError) {
      // includeMap 部署失败，回滚状态
      metadata.mods[modIndex].enabled = !enabled
      metadata.mods[modIndex].lastModified = Date.now()
      writeModsMetadata(metadata)
      return errorResult(
        t('iflow.errors.includeMapDeployFailed', { error: includeError.message }),
        'IFLOW_INCLUDE_MAP_ERROR'
      )
    }

    try {
      // 进度回调：向渲染进程发送进度事件
      const progressCallback = (current, total, modName) => {
        console.log('[IPC] Apply progress:', current, total, modName)
        const sender = event.sender
        if (!sender.isDestroyed()) {
          sender.send('iflow:apply-progress', { current, total, modName })
        }
      }

      // 重新应用所有启用的 Mod
      await reapplyMods(enabledMods, iflowPath, progressCallback)
    } catch (applyError) {
      // 应用失败，回滚 includeMap 部署的文件
      if (deployedFiles.length > 0 && mod.includeMap) {
        try {
          await removeIncludeFiles(mod.id, mod.includeMap, iflowPath)
        } catch (rollbackErr) {
          logger.warn(`Failed to rollback includeMap for mod ${mod.id}:`, rollbackErr)
        }
      }
      // 回滚状态
      metadata.mods[modIndex].enabled = !enabled
      metadata.mods[modIndex].lastModified = Date.now()
      writeModsMetadata(metadata)
      return errorResult(applyError.message, 'IFLOW_APPLY_ERROR')
    }

    writeModsMetadata(metadata)
    return successResult()
  }, 'iflow:enable-mod'))

  // ── 删除 Mod ──────────────────────────────────────────────
  ipcMain.handle('iflow:delete-mod', wrapIpcHandler(async (event, modId) => {
    const metadata = readModsMetadata()
    const modIndex = metadata.mods.findIndex(m => m.id === modId)

    if (modIndex === -1) {
      return errorResult(t('iflow.errors.modNotFound', { id: modId }), ErrorCodes.FILE_NOT_FOUND)
    }

    const mod = metadata.mods[modIndex]

    // 检查是否有其他 MOD 依赖此 MOD
    const dependentMods = metadata.mods.filter(m =>
      m.dependsOn && m.dependsOn.includes(modId) && m.id !== modId
    )

    if (dependentMods.length > 0) {
      const depNames = dependentMods.map(m => m.name).join(', ')
      return errorResult(
        t('iflow.errors.cannotDeleteDependent', { mods: depNames }),
        'IFLOW_DEPENDENT_MODS_EXIST'
      )
    }

    // 如果 Mod 已启用，先禁用
    if (mod.enabled) {
      let iflowPath
      try {
        iflowPath = await getIflowPath()
      } catch {
        // 路径获取失败，仍然允许删除 Mod 文件
      }

      if (iflowPath && fs.existsSync(iflowPath)) {
        const backupPath = path.join(MODS_DIR, 'iflow.js.original')
        if (fs.existsSync(backupPath)) {
          // 从 iflow.js 中移除此 Mod
          metadata.mods[modIndex].enabled = false

          const enabledMods = metadata.mods
            .filter(m => m.enabled)
            .sort((a, b) => a.installedAt - b.installedAt)

          try {
            await reapplyMods(enabledMods, iflowPath)
          } catch {
            // 重新应用失败，继续删除操作
          }
        }
      }
    }

    // 清理 includeMap 部署的额外文件
    if (mod.includeMap) {
      try {
        let iflowPath
        try { iflowPath = await getIflowPath() } catch { /* ignore */ }
        await removeIncludeFiles(modId, mod.includeMap, iflowPath)
      } catch (err) {
        logger.warn(`Failed to cleanup includeMap files for mod ${modId}:`, err)
      }
    }

    // 删除 Mod 文件目录
    const modDir = path.join(MODS_DIR, modId)
    if (fs.existsSync(modDir)) {
      fs.rmSync(modDir, { recursive: true, force: true })
    }

    // 从元数据中移除
    metadata.mods.splice(modIndex, 1)
    writeModsMetadata(metadata)

    return successResult()
  }, 'iflow:delete-mod'))

  // ── 导出 Mod ──────────────────────────────────────────────
  ipcMain.handle('iflow:export-mod', wrapIpcHandler(async (event, modId) => {
    const metadata = readModsMetadata()
    const mod = metadata.mods.find(m => m.id === modId)

    if (!mod) {
      return errorResult(t('iflow.errors.modNotFound', { id: modId }), ErrorCodes.FILE_NOT_FOUND)
    }

    // 防止路径遍历
    if (!isPathSafe(MODS_DIR, modId)) {
      return errorResult(t('iflow.errors.invalidModId'), ErrorCodes.PERMISSION_DENIED)
    }

    const modDir = path.join(MODS_DIR, modId)
    if (!fs.existsSync(modDir)) {
      return errorResult(t('iflow.errors.modDirNotFound'), ErrorCodes.FILE_NOT_FOUND)
    }

    // 生成默认文件名
    const defaultFileName = `${sanitizeFileName(mod.name)}-v${mod.version}.iflow-mod`

    // 弹出"另存为"对话框
    const { getMainWindow } = require('../window')
    const mainWindow = getMainWindow()

    const result = await dialog.showSaveDialog(mainWindow, {
      title: t('iflow.exportDialog.title'),
      defaultPath: defaultFileName,
      filters: [
        { name: 'iFlow Mod', extensions: ['iflow-mod'] },
        { name: 'ZIP', extensions: ['zip'] },
      ],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true }
    }

    // 创建 ZIP 压缩包
    const admzip = require('adm-zip')
    const zip = new admzip()

    // 添加 Mod 目录中的所有文件
    const addDirToZip = (dirPath, zipPath) => {
      const entries = fs.readdirSync(dirPath)
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          addDirToZip(fullPath, zipPath ? `${zipPath}/${entry}` : entry)
        } else {
          const content = fs.readFileSync(fullPath)
          zip.addFile(zipPath ? `${zipPath}/${entry}` : entry, content)
        }
      }
    }

    addDirToZip(modDir, '')
    zip.writeZip(result.filePath)

    return { success: true, filePath: result.filePath }
  }, 'iflow:export-mod'))

  // ── 导入 Mod ──────────────────────────────────────────────
  ipcMain.handle('iflow:import-mod', wrapIpcHandler(async (event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return errorResult(t('iflow.errors.fileNotFound'), ErrorCodes.FILE_NOT_FOUND)
    }

    // 解压到临时目录
    const tmpDir = path.join(app.getPath('temp'), `iflow-mod-import-${Date.now()}`)
    ensureModsDir()

    try {
      const admzip = require('adm-zip')
      const zip = new admzip(filePath)
      zip.extractAllTo(tmpDir, true)

      // 确定验证目录：如果根目录没有 mod.json，检查是否解压到了子目录中
      let modDir = tmpDir
      const rootEntries = fs.readdirSync(tmpDir)
      if (!fs.existsSync(path.join(tmpDir, 'mod.json')) && rootEntries.length === 1) {
        const subPath = path.join(tmpDir, rootEntries[0])
        if (fs.statSync(subPath).isDirectory() && fs.existsSync(path.join(subPath, 'mod.json'))) {
          modDir = subPath
        }
      }

      // 验证 Mod 包结构
      const validation = validateModPackage(modDir)
      if (!validation.valid) {
        return errorResult(validation.error, 'IFLOW_IMPORT_INVALID')
      }

      const metadata = validation.metadata

      // 检查 ID 冲突
      const modsMetadata = readModsMetadata()
      const existingIndex = modsMetadata.mods.findIndex(m => m.id === metadata.id)

      if (existingIndex !== -1) {
        const { callConfirmDialog } = require('./dialogs')
        const confirmed = await callConfirmDialog(
          'messages.warning',
          'iflow.importExport.overwriteConfirm',
          { name: metadata.name }
        )
        if (!confirmed) {
          return { success: false, cancelled: true }
        }

        // 删除旧 Mod 文件
        const oldModDir = path.join(MODS_DIR, metadata.id)
        if (fs.existsSync(oldModDir)) {
          fs.rmSync(oldModDir, { recursive: true, force: true })
        }

        // 从元数据中移除
        modsMetadata.mods.splice(existingIndex, 1)
      }

      // 移动文件到 Mod 目录
      const destDir = path.join(MODS_DIR, metadata.id)
      fs.mkdirSync(destDir, { recursive: true })

      const entries = fs.readdirSync(modDir)
      for (const entry of entries) {
        const srcPath = path.join(modDir, entry)
        const destPath = path.join(destDir, entry)
        const stat = fs.statSync(srcPath)
        if (stat.isDirectory()) {
          fs.cpSync(srcPath, destPath, { recursive: true })
        } else {
          fs.copyFileSync(srcPath, destPath)
        }
      }

      // 如果导入的是 patch/diff 类型但只提供了 code.js，自动生成 patch.diff
      if (metadata._needsDiffGeneration) {
        try {
          await generateDiffFromCode(metadata.id)
        } catch (genError) {
          // 生成 diff 失败，清理并返回错误
          if (fs.existsSync(destDir)) {
            fs.rmSync(destDir, { recursive: true, force: true })
          }
          return errorResult(
            t('iflow.importExport.diffGenerationError', { error: genError.message }),
            'IFLOW_IMPORT_ERROR'
          )
        }
      }

      // 添加到 mods.json
      const modRecord = {
        id: metadata.id,
        name: metadata.name,
        version: metadata.version,
        type: metadata.type,
        description: metadata.description || '',
        author: metadata.author || '',
        category: metadata.category || 'Other',
        iflowVersion: metadata.iflowVersion || undefined,
        iflowVersionConstraint: metadata.iflowVersionConstraint || '0.5.19+',
        icon: metadata.icon || undefined,
        tags: metadata.tags || [],
        homepage: metadata.homepage || undefined,
        repository: metadata.repository || undefined,
        license: metadata.license || undefined,
        include: metadata.include || undefined,
        includeMap: metadata.includeMap || undefined,
        dependsOn: metadata.dependsOn || undefined,
        enabled: false,
        installedAt: Date.now(),
        lastModified: Date.now(),
        _autoGenPatch: metadata._needsDiffGeneration || false,
      }

      modsMetadata.mods.push(modRecord)
      writeModsMetadata(modsMetadata)

      return {
        success: true,
        imported: 1,
        failed: 0,
        errors: [],
        modIds: [metadata.id],
      }
    } catch (error) {
      return errorResult(
        t('iflow.importExport.importError', { error: error.message }),
        'IFLOW_IMPORT_ERROR'
      )
    } finally {
      // 清理临时目录
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    }
  }, 'iflow:import-mod'))

  // ── 打开导入文件选择对话框 ────────────────────────────────
  ipcMain.handle('iflow:open-import-dialog', wrapIpcHandler(async () => {
    const { getMainWindow } = require('../window')
    const mainWindow = getMainWindow()

    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('iflow.importExport.importTitle'),
      filters: [
        { name: 'iFlow Mod', extensions: ['iflow-mod', 'zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    return { success: true, filePath: result.filePaths[0] }
  }, 'iflow:open-import-dialog'))

  // ── 检查 iflow.js 文件状态 ────────────────────────────────
  ipcMain.handle('iflow:check-iflow-status', wrapIpcHandler(async () => {
    try {
      const status = await checkIflowExists()
      let version = null
      if (status.exists) {
        try {
          version = await getIflowVersion()
        } catch {
          // 版本获取失败不影响状态检查
        }
      }
      return {
        success: true,
        exists: status.exists,
        path: status.path,
        version,
        iflowDir: IFLOW_BASE_DIR,
      }
    } catch (error) {
      return { success: true, exists: false, path: '', version: null }
    }
  }, 'iflow:check-iflow-status'))
}

module.exports = {
  registerIflowIpcHandlers,
}
