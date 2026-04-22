/**
 * GitHub Release 自动更新检查器
 * 使用 GitHub Releases API 检查更新并下载
 */

const { app, ipcMain, shell } = require('electron')
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

// 翻译函数（由主进程注入）
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

// GitHub 仓库信息 - 从 package.json 获取
function getRepoInfo() {
  try {
    const packageJson = require('./package.json')
    const repoUrl = packageJson.repository?.url || ''
    // 解析 git@github.com:owner/repo.git 或 https://github.com/owner/repo
    const match = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w.-]+?)(?:\.git)?$/i)
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/i, '') }
    }
  } catch (e) {
    console.error('Failed to get repo info:', e)
  }
  return { owner: 'pandorastudio', repo: 'iFlow-Settings-Editor-GUI' }
}

// 读取当前版本
function getCurrentVersion() {
  try {
    const packageJson = require('./package.json')
    return packageJson.version || '1.0.0'
  } catch (e) {
    return '1.0.0'
  }
}

// 版本比较：返回 1 如果 a > b，-1 如果 a < b，0 如果相等
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

// HTTP/HTTPS 请求封装
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
      // 处理重定向
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

// 获取最新的 release 信息
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

  try {
    const response = await httpRequest(url, { headers })
    return JSON.parse(response.toString('utf-8'))
  } catch (error) {
    console.error('Failed to fetch latest release:', error)
    throw error
  }
}

// 获取适当的下载文件
function getDownloadAsset(release) {
  if (!release.assets || release.assets.length === 0) {
    return null
  }

  const platform = process.platform
  const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : 'x64'

  // 优先查找 NSIS 安装包（适用于 Windows）
  if (platform === 'win32') {
    // 查找 .exe 安装包
    for (const asset of release.assets) {
      if (asset.name.endsWith('.exe') && !asset.name.includes('portable')) {
        return asset
      }
    }
    // 回退到 portable
    for (const asset of release.assets) {
      if (asset.name.includes('portable') && asset.name.endsWith('.exe')) {
        return asset
      }
    }
  }

  // 查找通用文件
  for (const asset of release.assets) {
    if (asset.name.includes(platform) || asset.name.includes(arch) || asset.name.includes('setup')) {
      return asset
    }
  }

  // 回退到第一个资产
  return release.assets[0]
}

// 下载文件到临时目录
async function downloadFile(url, destPath, onProgress, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const req = protocol.get(url, res => {
      // 处理重定向
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
        // 检查是否已取消
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

    // 保存 req 以便取消
    options._req = req
  })
}

// 取消下载标记
let downloadCancelled = false

// 更新检查状态
let updateState = {
  status: 'idle', // idle, checking, available, downloading, downloaded, error
  info: null, // release 信息
  progress: 0, // 下载进度 0-100
  error: null,
  downloadPath: null,
  isBackground: false, // 是否后台下载
}

// 设置更新状态并通知渲染进程
function setUpdateState(newState, mainWindow) {
  updateState = { ...updateState, ...newState }
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-status-changed', updateState)
  }
}

// IPC 处理器
function setupIpcHandlers(mainWindowRef, translateFn) {
  // 设置翻译函数
  setupTranslations(translateFn)

  // 检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      setUpdateState({ status: 'checking', error: null }, mainWindowRef())
      const latest = await fetchLatestRelease()
      const currentVersion = getCurrentVersion()
      const latestVersion = latest.tag_name?.replace(/^v/, '') || '0.0.0'

      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

      if (hasUpdate) {
        // 如果正在下载中（前台或后台），保持当前状态不变
        if (updateState.status === 'downloading') {
          return { success: true, hasUpdate: true, version: latestVersion }
        }

        const downloadAsset = getDownloadAsset(latest)
        // 如果已经下载了相同版本，保留下载状态
        const alreadyDownloaded = updateState.status === 'downloaded' && updateState.info?.version === latestVersion
        setUpdateState(
          {
            status: alreadyDownloaded ? 'downloaded' : 'available',
            info: {
              version: latestVersion,
              releaseNotes: latest.body || '',
              releaseUrl: latest.html_url || '',
              downloadUrl: downloadAsset?.browser_download_url || null,
              downloadName: downloadAsset?.name || 'update.exe',
              size: downloadAsset?.size || 0,
            },
            // 如果之前已下载，保留下载路径
            ...(alreadyDownloaded && { downloadPath: updateState.downloadPath }),
          },
          mainWindowRef(),
        )
        return {
          success: true,
          hasUpdate: true,
          version: latestVersion,
          releaseNotes: latest.body || '',
          releaseUrl: latest.html_url || '',
          downloadUrl: downloadAsset?.browser_download_url || null,
        }
      } else {
        setUpdateState({ status: 'idle', info: null }, mainWindowRef())
        return {
          success: true,
          hasUpdate: false,
          version: latestVersion,
        }
      }
    } catch (error) {
      setUpdateState({ status: 'error', error: error.message }, mainWindowRef())
      return {
        success: false,
        error: error.message,
      }
    }
  })

  // 下载更新
  let currentDownloadOptions = null

  ipcMain.handle('download-update', async () => {
    try {
      if (!updateState.info?.downloadUrl) {
        throw new Error(t('update.error.noDownloadUrl'))
      }

      setUpdateState({ status: 'downloading', progress: 0 }, mainWindowRef())
      downloadCancelled = false

      const tmpDir = app.getPath('temp')
      const destPath = path.join(tmpDir, updateState.info.downloadName)

      currentDownloadOptions = { cancelled: false }

      await downloadFile(updateState.info.downloadUrl, destPath, (downloaded, total) => {
        const progress = Math.round((downloaded / total) * 100)
        setUpdateState({ progress }, mainWindowRef())
        mainWindowRef().webContents.send('update-download-progress', progress)
      }, currentDownloadOptions)

      setUpdateState(
        {
          status: 'downloaded',
          downloadPath: destPath,
          progress: 100,
        },
        mainWindowRef(),
      )

      return { success: true, downloadPath: destPath }
    } catch (error) {
      if (error.message === 'Download cancelled') {
        setUpdateState({ status: 'idle', error: null }, mainWindowRef())
        return { success: false, cancelled: true }
      }
      setUpdateState({ status: 'error', error: error.message }, mainWindowRef())
      return { success: false, error: error.message }
    }
  })

  // 后台下载更新（静默模式，不弹进度窗）
  ipcMain.handle('download-update-background', async () => {
    try {
      if (!updateState.info?.downloadUrl) {
        throw new Error(t('update.error.noDownloadUrl'))
      }

      // 标记为后台下载
      setUpdateState({ status: 'downloading', progress: 0, isBackground: true }, mainWindowRef())
      downloadCancelled = false

      const tmpDir = app.getPath('temp')
      const destPath = path.join(tmpDir, updateState.info.downloadName)

      currentDownloadOptions = { cancelled: false }

      // 后台下载也发送进度事件，渲染进程可选择显示
      await downloadFile(updateState.info.downloadUrl, destPath, (downloaded, total) => {
        const progress = Math.round((downloaded / total) * 100)
        setUpdateState({ progress }, mainWindowRef())
        mainWindowRef().webContents.send('update-download-progress', progress)
      }, currentDownloadOptions)

      setUpdateState(
        {
          status: 'downloaded',
          downloadPath: destPath,
          progress: 100,
          isBackground: false, // 下载完成，清除后台标记
        },
        mainWindowRef(),
      )

      // 发送后台下载完成事件（可用于系统通知）
      mainWindowRef().webContents.send('update-background-complete', {
        version: updateState.info.version,
        downloadPath: destPath,
      })

      return { success: true, downloadPath: destPath }
    } catch (error) {
      if (error.message === 'Download cancelled') {
        setUpdateState({ status: 'idle', error: null, isBackground: false }, mainWindowRef())
        return { success: false, cancelled: true }
      }
      setUpdateState({ status: 'error', error: error.message, isBackground: false }, mainWindowRef())
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
    setUpdateState({ status: 'idle', isBackground: false }, mainWindowRef())
    return { success: true }
  })

  // 安装更新
  ipcMain.handle('install-update', async () => {
    try {
      if (!updateState.downloadPath) {
        throw new Error(t('update.error.noDownloadedUpdate'))
      }

      // 使用 shell 执行安装程序
      shell.openPath(updateState.downloadPath)

      // 退出应用以安装更新
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

// 获取版本信息（供外部调用）
function getVersionInfo() {
  return {
    current: getCurrentVersion(),
    repo: getRepoInfo(),
  }
}

// 清理临时文件
function cleanupTempFiles() {
  try {
    const tmpDir = app.getPath('temp')
    const files = fs.readdirSync(tmpDir)
    for (const file of files) {
      if (file.startsWith('iFlow-Update') || file.includes('update-setup')) {
        const filePath = path.join(tmpDir, file)
        try {
          fs.unlinkSync(filePath)
        } catch (e) {
          // 忽略删除失败
        }
      }
    }
  } catch (e) {
    // 忽略
  }
}

module.exports = {
  setupIpcHandlers,
  getVersionInfo,
  getUpdateState: () => updateState,
  cleanupTempFiles,
}
