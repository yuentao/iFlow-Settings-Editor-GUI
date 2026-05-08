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
  // 配置日志输出
  autoUpdater.logger = console
  
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
    console.log('[AutoUpdater] Checking for update...')
    setUpdateState({ status: 'checking', error: null })
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version)
    console.log('[AutoUpdater] Is delta update:', !!info.blockMap)
    console.log('[AutoUpdater] File size:', info.fileSize)
    
    setUpdateState({
      status: 'available',
      info: {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : 
          (info.releaseNotes ? info.releaseNotes.map(n => n.note).join('\n') : ''),
        releaseUrl: info.releaseUrl,
        fileSize: info.fileSize,
        isDelta: !!info.blockMap,
        blockmapSize: info.blockMap ? info.blockMap.size : undefined,
      },
      error: null,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available:', info.version)
    setUpdateState({ status: 'idle', info: null, error: null })
  })

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent)
    console.log(`[AutoUpdater] Download progress: ${percent}% (${progress.transferred}/${progress.total})`)
    console.log(`[AutoUpdater] Speed: ${Math.round(progress.bytesPerSecond / 1024)} KB/s`)
    console.log(`[AutoUpdater] Remaining: ~${Math.round(progress.remainingTime)}s`)
    
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

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)
    console.log('[AutoUpdater] Download path:', info.filePath)
    
    setUpdateState({
      status: 'downloaded',
      downloadPath: info.filePath,
      progress: 100,
      isBackground: false,
    })

    const mainWindow = getMainWindow()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        filePath: info.filePath,
      })
    }
  })

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Error:', error.message)
    
    // 🔥 Phase 5 风险缓解：检测差分更新相关错误并自动回滚
    const errorMsg = error.message.toLowerCase()
    const isDeltaError = errorMsg.includes('delta') ||
                         errorMsg.includes('patch') ||
                         errorMsg.includes('blockmap') ||
                         errorMsg.includes('block map') ||
                         errorMsg.includes('校验') ||
                         errorMsg.includes('checksum')
    
    if (isDeltaError) {
      console.warn('[AutoUpdater] Delta update failed, falling back to full update')
      console.warn('[AutoUpdater] Error details:', error.message)
      
      // 禁用差分下载，确保重试时走完整包
      autoUpdater.disableDifferentialDownload = true
      
      // 清除差分更新状态
      setUpdateState({ 
        status: 'idle', 
        error: null,
        info: updateState.info ? { ...updateState.info, isDelta: false } : null
      })
      
      // 延迟 2 秒后重新检查更新（触发完整包下载）
      setTimeout(async () => {
        console.info('[AutoUpdater] Retrying with full update...')
        try {
          await autoUpdater.checkForUpdates()
        } catch (retryError) {
          console.error('[AutoUpdater] Retry failed:', retryError.message)
          setUpdateState({ status: 'error', error: retryError.message })
        } finally {
          // 重试完成后恢复差分下载（下次更新可继续使用差分）
          autoUpdater.disableDifferentialDownload = false
        }
      }, 2000)
    } else {
      // 非差分错误，正常处理
      setUpdateState({ status: 'error', error: error.message })
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
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : 
        (info.releaseNotes ? info.releaseNotes.map(n => n.note).join('\n') : ''),
      releaseUrl: info.releaseUrl,
      fileSize: info.fileSize,
      isDelta: !!info.blockMap,
    }
  } catch (error) {
    console.error('[AutoUpdater] Check failed:', error.message)
    setUpdateState({ status: 'error', error: error.message })
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

    const result = await autoUpdater.downloadUpdate()
    
    if (result && result.filePath) {
      setUpdateState({
        status: 'downloaded',
        downloadPath: result.filePath,
        progress: 100,
        isBackground: false,
      })
      return { success: true, downloadPath: result.filePath }
    }

    throw new Error(t('update.error.downloadFailed'))
  } catch (error) {
    if (error.message === 'Cancelled' || currentDownloadOptions?.cancelled) {
      setUpdateState({ status: 'idle', error: null, isBackground: false })
      return { success: false, cancelled: true }
    }
    
    console.error('[AutoUpdater] Download failed:', error.message)
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
    console.error('[AutoUpdater] Cancel failed:', error.message)
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
    console.error('[AutoUpdater] Install failed:', error.message)
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
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
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