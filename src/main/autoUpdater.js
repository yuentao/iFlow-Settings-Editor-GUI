/**
 * AutoUpdater 模块 - 使用 electron-updater 实现差分更新
 *
 * 利用 electron-updater v6.8.3 的内置 blockMap 算法实现增量更新
 * 支持 .blockmap 和 .delta 文件的自动处理
 */

const { autoUpdater } = require('electron-updater')
const { app } = require('electron')
const path = require('path')
const fs = require('fs')

// 翻译函数
let t = key => key

// 精简日志：生产模式下静默，仅开发模式输出
const isDevMode = !app.isPackaged
function logInfo(...args) {
  if (isDevMode) console.log(...args)
}
function logWarn(...args) {
  if (isDevMode) console.warn(...args)
}
function logError(...args) {
  console.error(...args)
}

/**
 * 设置翻译函数
 * @param {Function} translateFn - 翻译函数 t(key, params)
 */
function setupTranslations(translateFn) {
  if (translateFn) {
    t = translateFn
  }
}

// 更新状态
let updateState = {
  status: 'idle', // idle, checking, available, downloading, downloaded, error
  info: null, // { version, releaseNotes, releaseUrl, fileSize, isDelta, blockmapSize }
  progress: 0, // 下载进度 0-100
  error: null,
  downloadPath: null,
  isBackground: false,
}

// 下载取消标记
let downloadCancelled = false

// 当前下载选项
let currentDownloadOptions = null

// 主窗口引用
let mainWindowRef = null

/**
 * 获取主窗口引用
 */
function getMainWindow() {
  if (mainWindowRef) {
    return mainWindowRef()
  }
  return null
}

/**
 * 设置主窗口引用
 * @param {Function} ref - 获取主窗口的函数
 */
function setMainWindowRef(ref) {
  mainWindowRef = ref
}

/**
 * 设置更新状态并通知渲染进程
 * @param {Object} newState - 新状态
 */
function setUpdateState(newState) {
  updateState = { ...updateState, ...newState }
  const mainWindow = getMainWindow()
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-status-changed', updateState)
  }
}

/**
 * 获取当前版本
 */
function getCurrentVersion() {
  return app.getVersion()
}

/**
 * 初始化 autoUpdater 配置
 */
function initAutoUpdater() {
  // 配置日志输出：仅开发模式启用，生产模式关闭以减少开销
  autoUpdater.logger = app.isPackaged ? null : console

  // 开发模式下也启用更新检测（读取项目根目录的 dev-app-update.yml）
  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true
  }

  // 禁用 Web 安装器（使用本地 NSIS 安装包，不需要 web installer）
  autoUpdater.disableWebInstaller = true

  // 启用差分更新（blockMap 算法）
  // electron-updater 会自动查找 .blockmap 文件并计算差量
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 差分更新：electron-updater 默认启用 blockMap 差分下载
  // 控制属性为 disableDifferentialDownload（默认 false，即启用差分）
  // 无需手动设置 enableDeltaUpdates / deltaUpdateStrategy（非有效 API）
  // 不允许降级（安全考虑）
  autoUpdater.allowDowngrades = false
  // 不自动使用预发布版本
  autoUpdater.allowPrerelease = false

  if (autoUpdater.logger) {
    autoUpdater.logger.info('[AutoUpdater] Initialized with delta update support (blockMap, default enabled)')
  }

  // 监听更新事件
  autoUpdater.on('checking-for-update', () => {
    logInfo('[AutoUpdater] Checking for update...')
    setUpdateState({ status: 'checking', error: null })
  })

  autoUpdater.on('update-available', info => {
    logInfo('[AutoUpdater] Update available:', info.version)
    logInfo('[AutoUpdater] Is delta update:', !!info.blockMap)
    logInfo('[AutoUpdater] File size:', info.fileSize)

    const updateInfo = {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : info.releaseNotes ? info.releaseNotes.map(n => n.note).join('\n') : '',
      releaseUrl: info.releaseUrl,
      fileSize: info.fileSize,
      isDelta: !!info.blockMap,
      blockmapSize: info.blockMap ? info.blockMap.size : undefined,
    }

    setUpdateState({
      status: 'available',
      info: updateInfo,
      error: null,
    })

    // 同时发送 update-available 事件给渲染进程（与 onUpdateAvailable 监听器对应）
    const mainWindow = getMainWindow()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-available', updateInfo)
    }
  })

  autoUpdater.on('update-not-available', info => {
    logInfo('[AutoUpdater] Update not available:', info.version)
    setUpdateState({ status: 'idle', info: null, error: null })
  })

  autoUpdater.on('download-progress', progress => {
    const percent = Math.round(progress.percent)
    logInfo(`[AutoUpdater] Download progress: ${percent}% (${progress.transferred}/${progress.total})`)
    logInfo(`[AutoUpdater] Speed: ${Math.round(progress.bytesPerSecond / 1024)} KB/s`)
    logInfo(`[AutoUpdater] Remaining: ~${Math.round(progress.remainingTime)}s`)

    setUpdateState({ progress: percent })

    const mainWindow = getMainWindow()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-download-progress', {
        percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
        remainingTime: progress.remainingTime,
      })
    }
  })

  autoUpdater.on('update-downloaded', info => {
    // 用户已取消下载，忽略残留的完成事件
    if (downloadCancelled) return

    logInfo('[AutoUpdater] Update downloaded:', info.version)
    logInfo('[AutoUpdater] Download path:', info.filePath)

    // 保留当前 isBackground 状态，以便渲染进程正确区分前台/后台下载完成
    setUpdateState({
      status: 'downloaded',
      downloadPath: info.filePath,
      progress: 100,
      isBackground: updateState.isBackground,
    })

    const mainWindow = getMainWindow()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        filePath: info.filePath,
      })
    }
  })

  autoUpdater.on('error', error => {
    logError('[AutoUpdater] Error:', error.message)

    // 提取简化的错误消息，避免暴露 HTTP headers 等冗余信息
    let simplifiedError = error.message
    const errorMsg = error.message.toLowerCase()

    // 404 / latest.yml 缺失
    if (errorMsg.includes('cannot find latest.yml') || (errorMsg.includes('latest.yml') && errorMsg.includes('404'))) {
      simplifiedError = 'Update metadata not found (latest.yml). The release may not include auto-update artifacts.'
    }
    // 网络不可达
    else if (errorMsg.includes('enetunreach') || errorMsg.includes('econnrefused') || errorMsg.includes('network')) {
      simplifiedError = 'Network error: unable to reach update server.'
    }
    // 超时
    else if (errorMsg.includes('etimedout') || errorMsg.includes('timeout')) {
      simplifiedError = 'Update check timed out.'
    }
    // 其他错误：截取第一行（去掉 HTTP headers 堆叠）
    else if (simplifiedError.includes('Headers:')) {
      simplifiedError = simplifiedError.split('\n')[0]
    }

    // 🔥 Phase 5 风险缓解：检测差分更新相关错误并自动回滚
    const isDeltaError = errorMsg.includes('delta') || errorMsg.includes('patch') || errorMsg.includes('blockmap') || errorMsg.includes('block map') || errorMsg.includes('校验') || errorMsg.includes('checksum')

    if (isDeltaError) {
      logWarn('[AutoUpdater] Delta update failed, falling back to full update')
      logWarn('[AutoUpdater] Error details:', error.message)

      // 禁用差分下载，确保重试时走完整包
      autoUpdater.disableDifferentialDownload = true

      // 清除差分更新状态
      setUpdateState({
        status: 'idle',
        error: null,
        info: updateState.info ? { ...updateState.info, isDelta: false } : null,
      })

      // 延迟 2 秒后重新检查更新并自动下载完整包
      setTimeout(async () => {
        logInfo('[AutoUpdater] Retrying with full update...')
        try {
          const result = await autoUpdater.checkForUpdates()
          if (result && result.updateInfo) {
            // 检查到更新后自动开始下载完整包
            await autoUpdater.downloadUpdate()
          }
        } catch (retryError) {
          logError('[AutoUpdater] Retry failed:', retryError.message)
          setUpdateState({ status: 'error', error: retryError.message })
        } finally {
          // 重试完成后恢复差分下载（下次更新可继续使用差分）
          autoUpdater.disableDifferentialDownload = false
        }
      }, 2000)
    } else {
      // 非差分错误，使用简化后的错误消息
      setUpdateState({ status: 'error', error: simplifiedError })
    }
  })
}

/**
 * 检查更新
 * @returns {Promise<Object>} 检查结果
 */
async function checkForUpdates() {
  try {
    // 如果正在下载中，返回当前状态
    if (updateState.status === 'downloading') {
      return {
        success: true,
        hasUpdate: true,
        version: updateState.info?.version,
      }
    }

    // 重置上次的错误状态，允许重新检查
    if (updateState.status === 'error') {
      setUpdateState({ status: 'idle', error: null })
    }

    // 执行更新检查
    const result = await autoUpdater.checkForUpdates()

    if (!result || !result.updateInfo) {
      return {
        success: true,
        hasUpdate: false,
        version: getCurrentVersion(),
      }
    }

    const info = result.updateInfo
    const hasUpdate = info.version !== getCurrentVersion()

    return {
      success: true,
      hasUpdate,
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : info.releaseNotes ? info.releaseNotes.map(n => n.note).join('\n') : '',
      releaseUrl: info.releaseUrl,
      fileSize: info.fileSize,
      isDelta: !!info.blockMap,
    }
  } catch (error) {
    logError('[AutoUpdater] Check failed:', error.message)
    // event 处理器已通过 on('error') 设置了 error 状态，避免重复发送
    if (updateState.status !== 'error') {
      setUpdateState({ status: 'error', error: error.message })
    }
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * 下载更新
 * @param {Object} options - 下载选项
 * @returns {Promise<Object>} 下载结果
 */
async function downloadUpdate(options = {}) {
  try {
    if (updateState.status === 'downloaded') {
      return { success: true, downloadPath: updateState.downloadPath }
    }

    setUpdateState({ status: 'downloading', progress: 0, isBackground: !!options.background })
    downloadCancelled = false
    currentDownloadOptions = { cancelled: false }

    // electron-updater 的 downloadUpdate() 返回 string[]（下载文件路径数组）
    // update-downloaded 事件已正确设置了 downloaded 状态和 downloadPath
    const downloadPaths = await autoUpdater.downloadUpdate()

    // 下载完成：update-downloaded 事件已触发，状态已被更新
    if (updateState.status === 'downloaded' && updateState.downloadPath) {
      return { success: true, downloadPath: updateState.downloadPath }
    }

    // 兜底：如果事件未触发但返回了路径，手动设置状态
    if (downloadPaths && downloadPaths.length > 0) {
      const downloadPath = downloadPaths[0]
      setUpdateState({
        status: 'downloaded',
        downloadPath,
        progress: 100,
        isBackground: updateState.isBackground,
      })
      return { success: true, downloadPath }
    }

    throw new Error(t('update.error.downloadFailed'))
  } catch (error) {
    if (error.message === 'Cancelled' || currentDownloadOptions?.cancelled) {
      setUpdateState({ status: 'idle', error: null, isBackground: false })
      return { success: false, cancelled: true }
    }

    logError('[AutoUpdater] Download failed:', error.message)
    setUpdateState({ status: 'error', error: error.message, isBackground: false })
    return { success: false, error: error.message }
  }
}

/**
 * 后台下载更新
 * @returns {Promise<Object>} 下载结果
 */
async function downloadUpdateBackground() {
  return downloadUpdate({ background: true })
}

/**
 * 取消下载
 * @returns {Promise<Object>} 取消结果
 */
async function cancelDownload() {
  try {
    // 标记取消
    downloadCancelled = true
    if (currentDownloadOptions) {
      currentDownloadOptions.cancelled = true
    }

    // 取消 electron-updater 的下载
    if (autoUpdater) {
      autoUpdater.cancelDownload()
    }

    setUpdateState({ status: 'idle', isBackground: false })
    return { success: true }
  } catch (error) {
    logError('[AutoUpdater] Cancel failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 安装更新
 * @returns {Promise<Object>} 安装结果
 */
async function installUpdate() {
  try {
    if (!updateState.downloadPath) {
      throw new Error(t('update.error.noDownloadedUpdate'))
    }

    // 使用 autoUpdater 安装更新
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  } catch (error) {
    logError('[AutoUpdater] Install failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 获取更新状态
 * @returns {Object} 当前更新状态
 */
function getUpdateState() {
  return { success: true, ...updateState }
}

/**
 * 获取当前应用版本
 * @returns {Object} 版本信息
 */
function getAppVersion() {
  return { success: true, version: getCurrentVersion() }
}

/**
 * 清理临时文件
 */
function cleanupTempFiles() {
  try {
    const userDataPath = app.getPath('userData')
    const tempDir = path.join(userDataPath, 'temp-updates')

    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir)
      for (const file of files) {
        const filePath = path.join(tempDir, file)
        try {
          const stat = fs.statSync(filePath)
          // 删除 7 天前的文件
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          if (stat.mtimeMs < sevenDaysAgo) {
            fs.unlinkSync(filePath)
          }
        } catch (e) {
          // 忽略
        }
      }
    }
  } catch (e) {
    // 忽略
  }
}

/**
 * 获取版本信息（供外部调用）
 */
function getVersionInfo() {
  return {
    current: getCurrentVersion(),
  }
}

module.exports = {
  setupTranslations,
  setMainWindowRef,
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  downloadUpdateBackground,
  cancelDownload,
  installUpdate,
  getUpdateState,
  getAppVersion,
  getVersionInfo,
  cleanupTempFiles,
  // 导出 autoUpdater 以便 IPC 直接访问事件
  autoUpdater,
}
