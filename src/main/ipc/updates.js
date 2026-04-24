/**
 * 更新相关 IPC 处理器
 * 处理更新检查、下载、安装相关的 IPC 通信
 */

const { ipcMain, app, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const { URL } = require('url')

// 动态导入 electron-updater
let autoUpdater
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch (e) {
  console.error('Failed to load electron-updater:', e)
}

// 翻译函数
let t = (key) => key

/**
 * 设置翻译函数
 * @param {Function} translateFn
 */
function setupTranslations(translateFn) {
  if (translateFn) {
    t = translateFn
  }
}

// 下载取消标记
let downloadCancelled = false

// 当前下载选项
let currentDownloadOptions = null

// 更新检查状态
let updateState = {
  status: 'idle',
  info: null,
  progress: 0,
  error: null,
  downloadPath: null,
  isBackground: false,
}

/**
 * 获取 GitHub 仓库信息
 */
function getRepoInfo() {
  try {
    const packageJson = require('../../../package.json')
    const repoUrl = packageJson.repository?.url || ''
    const match = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w.-]+?)(?:\.git)?$/i)
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/i, '') }
    }
  } catch (e) {
    console.error('Failed to get repo info:', e)
  }
  return { owner: 'pandorastudio', repo: 'iFlow-Settings-Editor-GUI' }
}

/**
 * 获取当前版本
 */
function getCurrentVersion() {
  try {
    const packageJson = require('../../../package.json')
    return packageJson.version || '1.0.0'
  } catch (e) {
    return '1.0.0'
  }
}

/**
 * 比较版本号
 */
function compareVersions(a, b) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number)
  const partsA = parse(a)
  const partsB = parse(b)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const pA = partsA[i] || 0
    const pB = partsB[i] || 0
    if (pA > pB) return 1
    if (pA < pB) return -1
  }
  return 0
}

/**
 * HTTP/HTTPS 请求
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }

    const req = protocol.request(reqOptions, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url)
        httpRequest(redirectUrl.toString(), options).then(resolve).catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        reject(new Error(t('update.error.downloadFailed', { code: res.statusCode })))
        return
      }

      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })

    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error(t('update.error.requestTimeout')))
    })

    req.end()
  })
}

/**
 * 获取最新的 release 信息
 */
async function fetchLatestRelease(githubToken = null) {
  const { owner, repo } = getRepoInfo()
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'iFlow-Settings-Editor',
  }

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`
  }

  const response = await httpRequest(url, { headers })
  return JSON.parse(response.toString('utf-8'))
}

/**
 * 获取适当的下载文件
 */
function getDownloadAsset(release) {
  if (!release.assets || release.assets.length === 0) {
    return null
  }

  const platform = process.platform

  if (platform === 'win32') {
    for (const asset of release.assets) {
      if (asset.name.endsWith('.exe') && !asset.name.includes('portable')) {
        return asset
      }
    }
    for (const asset of release.assets) {
      if (asset.name.includes('portable') && asset.name.endsWith('.exe')) {
        return asset
      }
    }
  }

  for (const asset of release.assets) {
    if (asset.name.includes(platform) || asset.name.includes('setup')) {
      return asset
    }
  }

  return release.assets[0]
}

/**
 * 下载文件
 */
async function downloadFile(url, destPath, onProgress, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const req = protocol.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url)
        downloadFile(redirectUrl.toString(), destPath, onProgress, options).then(resolve).catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        reject(new Error(t('update.error.downloadFailed', { code: res.statusCode })))
        return
      }

      const totalSize = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0
      const chunks = []

      res.on('data', chunk => {
        if (options.cancelled) {
          reject(new Error('Download cancelled'))
          return
        }
        chunks.push(chunk)
        downloaded += chunk.length
        if (onProgress && totalSize > 0) {
          onProgress(downloaded, totalSize)
        }
      })

      res.on('end', () => {
        if (options.cancelled) {
          reject(new Error('Download cancelled'))
          return
        }
        try {
          fs.writeFileSync(destPath, Buffer.concat(chunks))
          resolve()
        } catch (error) {
          reject(error)
        }
      })

      res.on('error', err => {
        if (!options.cancelled) {
          reject(err)
        }
      })
    })

    req.on('error', err => {
      if (!options.cancelled) {
        reject(err)
      }
    })

    req.setTimeout(30000, () => {
      req.destroy()
      if (!options.cancelled) {
        reject(new Error(t('update.error.downloadTimeout')))
      }
    })

    options._req = req
  })
}

/**
 * 获取主窗口引用
 */
function getMainWindowRef() {
  const { getMainWindow } = require('../window')
  return getMainWindow()
}

/**
 * 设置更新状态并通知渲染进程
 */
function setUpdateState(newState) {
  updateState = { ...updateState, ...newState }
  const mainWindow = getMainWindowRef()
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-status-changed', updateState)
  }
}

/**
 * 注册更新相关的 IPC 处理器
 */
function registerUpdatesIpcHandlers() {
  // 检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      setUpdateState({ status: 'checking', error: null })
      const latest = await fetchLatestRelease()
      const currentVersion = getCurrentVersion()
      const latestVersion = latest.tag_name?.replace(/^v/, '') || '0.0.0'

      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

      if (hasUpdate) {
        if (updateState.status === 'downloading') {
          return { success: true, hasUpdate: true, version: latestVersion }
        }

        const downloadAsset = getDownloadAsset(latest)
        const alreadyDownloaded = updateState.status === 'downloaded' && updateState.info?.version === latestVersion

        setUpdateState({
          status: alreadyDownloaded ? 'downloaded' : 'available',
          info: {
            version: latestVersion,
            releaseNotes: latest.body || '',
            releaseUrl: latest.html_url || '',
            downloadUrl: downloadAsset?.browser_download_url || null,
            downloadName: downloadAsset?.name || 'update.exe',
            size: downloadAsset?.size || 0,
          },
          ...(alreadyDownloaded && { downloadPath: updateState.downloadPath }),
        })

        return {
          success: true,
          hasUpdate: true,
          version: latestVersion,
          releaseNotes: latest.body || '',
          releaseUrl: latest.html_url || '',
          downloadUrl: downloadAsset?.browser_download_url || null,
        }
      } else {
        setUpdateState({ status: 'idle', info: null })
        return {
          success: true,
          hasUpdate: false,
          version: latestVersion,
        }
      }
    } catch (error) {
      setUpdateState({ status: 'error', error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }
  })

  // 下载更新
  ipcMain.handle('download-update', async () => {
    try {
      if (!updateState.info?.downloadUrl) {
        throw new Error(t('update.error.noDownloadUrl'))
      }

      setUpdateState({ status: 'downloading', progress: 0 })
      downloadCancelled = false

      const tmpDir = app.getPath('temp')
      const destPath = path.join(tmpDir, updateState.info.downloadName)

      currentDownloadOptions = { cancelled: false }

      await downloadFile(updateState.info.downloadUrl, destPath, (downloaded, total) => {
        const progress = Math.round((downloaded / total) * 100)
        setUpdateState({ progress })
        const mainWindow = getMainWindowRef()
        if (mainWindow) {
          mainWindow.webContents.send('update-download-progress', progress)
        }
      }, currentDownloadOptions)

      setUpdateState({
        status: 'downloaded',
        downloadPath: destPath,
        progress: 100,
      })

      return { success: true, downloadPath: destPath }
    } catch (error) {
      if (error.message === 'Download cancelled') {
        setUpdateState({ status: 'idle', error: null })
        return { success: false, cancelled: true }
      }
      setUpdateState({ status: 'error', error: error.message })
      return { success: false, error: error.message }
    }
  })

  // 后台下载更新
  ipcMain.handle('download-update-background', async () => {
    try {
      if (!updateState.info?.downloadUrl) {
        throw new Error(t('update.error.noDownloadUrl'))
      }

      setUpdateState({ status: 'downloading', progress: 0, isBackground: true })
      downloadCancelled = false

      const tmpDir = app.getPath('temp')
      const destPath = path.join(tmpDir, updateState.info.downloadName)

      currentDownloadOptions = { cancelled: false }

      await downloadFile(updateState.info.downloadUrl, destPath, (downloaded, total) => {
        const progress = Math.round((downloaded / total) * 100)
        setUpdateState({ progress })
        const mainWindow = getMainWindowRef()
        if (mainWindow) {
          mainWindow.webContents.send('update-download-progress', progress)
        }
      }, currentDownloadOptions)

      setUpdateState({
        status: 'downloaded',
        downloadPath: destPath,
        progress: 100,
        isBackground: false,
      })

      const mainWindow = getMainWindowRef()
      if (mainWindow) {
        mainWindow.webContents.send('update-background-complete', {
          version: updateState.info.version,
          downloadPath: destPath,
        })
      }

      return { success: true, downloadPath: destPath }
    } catch (error) {
      if (error.message === 'Download cancelled') {
        setUpdateState({ status: 'idle', error: null, isBackground: false })
        return { success: false, cancelled: true }
      }
      setUpdateState({ status: 'error', error: error.message, isBackground: false })
      return { success: false, error: error.message }
    }
  })

  // 取消下载
  ipcMain.handle('cancel-download', async () => {
    if (currentDownloadOptions) {
      currentDownloadOptions.cancelled = true
      if (currentDownloadOptions._req) {
        currentDownloadOptions._req.destroy()
      }
    }
    downloadCancelled = true
    setUpdateState({ status: 'idle', isBackground: false })
    return { success: true }
  })

  // 安装更新
  ipcMain.handle('install-update', async () => {
    try {
      if (!updateState.downloadPath) {
        throw new Error(t('update.error.noDownloadedUpdate'))
      }

      shell.openPath(updateState.downloadPath)
      app.exit(0)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 获取更新状态
  ipcMain.handle('get-update-status', () => {
    return { success: true, ...updateState }
  })

  // 获取当前版本
  ipcMain.handle('get-app-version', () => {
    return { success: true, version: getCurrentVersion() }
  })

  // 打开 release 页面
  ipcMain.handle('open-release-page', async () => {
    if (updateState.info?.releaseUrl) {
      await shell.openExternal(updateState.info.releaseUrl)
      return { success: true }
    }
    return { success: false, error: t('update.error.noReleaseUrl') }
  })
}

module.exports = {
  registerUpdatesIpcHandlers,
  setupTranslations,
  getUpdateState: () => updateState,
}