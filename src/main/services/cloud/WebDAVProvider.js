const https = require('https')
const http = require('http')

const DEFAULT_TIMEOUT = 30000 // 30 秒
const DEFAULT_BASE_DIR = '/iFlow-Settings/'

class WebDAVProvider {
  /**
   * @param {object} config
   * @param {string} config.serverUrl - WebDAV 服务器地址，如 https://dav.jianguoyun.com/dav/
   * @param {string} config.username
   * @param {string} config.password - 应用专用密码
   * @param {string} [config.baseDir] - 远程基础目录，默认 /iFlow-Settings/
   * @param {number} [config.timeout] - 请求超时（毫秒），默认 30000
   */
  constructor(config) {
    this.serverUrl = config.serverUrl.replace(/\/+$/, '')
    this.username = config.username
    this.password = config.password
    this.baseDir = config.baseDir || DEFAULT_BASE_DIR
    this.timeout = config.timeout || DEFAULT_TIMEOUT
  }

  /**
   * 上传文件（覆盖）
   * @param {string} remotePath - 相对于 baseDir 的路径
   * @param {Buffer} content - 文件内容
   */
  async upload(remotePath, content) {
    // 确保远程目录存在
    const dirPath = this._extractDirPath(remotePath)
    if (dirPath) {
      await this._ensureDir(dirPath)
    }

    const url = this._buildUrl(remotePath)
    console.log(`[WebDAVProvider] upload: ${url}`)

    // 最多重试 3 次：PUT 409 时尝试 DELETE 再重试
    const maxRetries = 3
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[WebDAVProvider] upload: PUT attempt ${attempt}`)
      try {
        return await this._request('PUT', url, content)
      } catch (error) {
        console.log(`[WebDAVProvider] upload: PUT attempt ${attempt} failed: ${error.message}`)
        if (error.message !== 'WEBDAV_ERROR_409' || attempt === maxRetries) {
          throw error
        }
        // PUT 返回 409：某些服务器在文件已存在时返回冲突而不支持覆盖
        // 尝试先删除再重试
        console.log(`[WebDAVProvider] upload: trying DELETE`)
        try {
          await this._request('DELETE', url)
        } catch {
          // 删除失败（可能不存在），忽略
        }
        // 重试 PUT
      }
    }
  }

  /**
   * 下载文件
   * @param {string} remotePath - 相对于 baseDir 的路径
   * @returns {Promise<Buffer>}
   */
  async download(remotePath) {
    const url = this._buildUrl(remotePath)
    return this._request('GET', url)
  }

  /**
   * 列出目录下文件
   * @param {string} remoteDir - 相对于 baseDir 的目录路径
   * @returns {Promise<Array<{name: string, path: string, lastModified: string, size: number}>>}
   */
  async list(remoteDir) {
    const url = this._buildUrl(remoteDir)
    const body = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:getlastmodified/><d:getcontentlength/></d:prop>
</d:propfind>`
    try {
      const response = await this._request('PROPFIND', url, Buffer.from(body), {
        Depth: '1',
      })
      return this._parsePropfindResponse(response.toString('utf8'))
    } catch (error) {
      // 409 Conflict：某些 WebDAV 服务器在目录不存在时返回 409 而非 404
      // 此时应返回空数组（目录不存在 = 没有文件）
      if (error.message === 'WEBDAV_ERROR_409') {
        return []
      }
      throw error
    }
  }

  /**
   * 删除文件
   * @param {string} remotePath - 相对于 baseDir 的路径
   */
  async delete(remotePath) {
    const url = this._buildUrl(remotePath)
    return this._request('DELETE', url)
  }

  /**
   * 获取授权状态
   * @returns {Promise<boolean>}
   */
  async isAuthorized() {
    try {
      await this._request('PROPFIND', this._buildUrl(''), Buffer.from(''), {
        Depth: '0',
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * 验证凭据是否有效
   * @returns {Promise<{accessToken: string}>}
   */
  async authorize() {
    const valid = await this.isAuthorized()
    if (!valid) throw new Error('WEBDAV_AUTH_FAILED')
    return {
      accessToken: Buffer.from(`${this.username}:${this.password}`).toString('base64'),
    }
  }

  /**
   * 刷新 token（WebDAV 无需刷新，重新验证即可）
   */
  async refreshToken() {
    return this.authorize()
  }

  /**
   * 撤销授权（WebDAV 无需撤销，清除本地凭据即可）
   */
  async revoke() {
    // no-op
  }

  /** 释放资源 */
  dispose() {
    // no-op
  }

  // ─── 私有方法 ───────────────────────────────────

  /**
   * 构建完整 URL
   * @param {string} relativePath
   * @returns {string}
   */
  _buildUrl(relativePath) {
    return `${this.serverUrl}${this.baseDir}${relativePath}`
  }

  /**
   * 从相对路径提取目录部分
   * devices/config-xxx.json → devices
   * @param {string} relativePath
   * @returns {string}
   */
  _extractDirPath(relativePath) {
    const idx = relativePath.lastIndexOf('/')
    return idx > 0 ? relativePath.substring(0, idx) : ''
  }

  /**
   * 确保远程目录存在（逐级 MKCOL）
   * @param {string} dirPath - 相对于 baseDir 的目录路径，如 "devices"
   */
  async _ensureDir(dirPath) {
    // 先确保 baseDir 本身存在
    try {
      const baseUrl = this._buildUrl('')
      console.log(`[WebDAVProvider] _ensureDir: ensuring base ${baseUrl}`)
      await this._request('MKCOL', baseUrl)
      console.log(`[WebDAVProvider] _ensureDir: base directory created`)
    } catch (error) {
      if (error.message !== 'WEBDAV_ERROR_409') {
        console.log(`[WebDAVProvider] _ensureDir: base MKCOL error: ${error.message}`)
      }
      // 409 = 已存在，忽略
    }

    const parts = dirPath.split('/').filter(Boolean)
    let currentDir = ''
    for (const part of parts) {
      currentDir += part + '/'
      const url = this._buildUrl(currentDir)
      console.log(`[WebDAVProvider] _ensureDir: creating ${url}`)
      try {
        await this._request('MKCOL', url)
        console.log(`[WebDAVProvider] _ensureDir: MKCOL ${url} succeeded`)
      } catch (mkcolError) {
        if (mkcolError.message === 'WEBDAV_ERROR_409') {
          console.log(`[WebDAVProvider] _ensureDir: MKCOL ${url} got 409, checking if exists...`)
          // 409 = 已存在或父目录不存在，先检查一下
          try {
            await this._request('PROPFIND', url, Buffer.from(''), { Depth: '0' })
            console.log(`[WebDAVProvider] _ensureDir: ${url} exists after all`)
          } catch {
            // PROPFIND 失败，父目录可能不存在，尝试递归创建
            const parentParts = currentDir.split('/').filter(Boolean).slice(0, -1)
            if (parentParts.length > 0) {
              const parentPath = parentParts.join('/')
              console.log(`[WebDAVProvider] _ensureDir: parent ${parentPath} missing, creating recursively`)
              await this._ensureDir(parentPath)
              // 父目录创建成功后，重试当前目录
              try {
                await this._request('MKCOL', url)
                console.log(`[WebDAVProvider] _ensureDir: MKCOL ${url} succeeded on retry`)
              } catch (retryMkcolError) {
                if (retryMkcolError.message !== 'WEBDAV_ERROR_409') {
                  throw retryMkcolError
                }
                // 再次 409，忽略
              }
            }
          }
        } else {
          throw mkcolError
        }
      }
    }
  }

  /**
   * 发送 HTTP 请求
   * @param {string} method
   * @param {string} url
   * @param {Buffer} [body]
   * @param {object} [extraHeaders]
   * @returns {Promise<Buffer>}
   */
  _request(method, url, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const mod = parsedUrl.protocol === 'https:' ? https : http
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64')

      const headers = {
        Authorization: `Basic ${auth}`,
        ...extraHeaders,
      }

      if (body && body.length > 0) {
        headers['Content-Type'] = method === 'PROPFIND'
          ? 'application/xml'
          : 'application/octet-stream'
        headers['Content-Length'] = body.length
      } else if (method === 'PROPFIND') {
        // PROPFIND 空 body 也需要 Content-Length
        headers['Content-Length'] = 0
      }

      const req = mod.request(url, { method, headers }, (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(buf)
          } else if (res.statusCode === 401) {
            reject(new Error('WEBDAV_AUTH_FAILED'))
          } else if (res.statusCode === 404) {
            reject(new Error('WEBDAV_NOT_FOUND'))
          } else if (res.statusCode === 405) {
            reject(new Error('WEBDAV_METHOD_NOT_ALLOWED'))
          } else {
            // 调试日志：记录哪个请求返回了错误
            console.error(`[WebDAVProvider] ${method} ${url} -> ${res.statusCode}`)
            reject(new Error(`WEBDAV_ERROR_${res.statusCode}`))
          }
        })
      })

      req.on('error', reject)

      req.setTimeout(this.timeout, () => {
        req.destroy(new Error('WEBDAV_TIMEOUT'))
      })

      if (body && body.length > 0) req.write(body)
      req.end()
    })
  }

  /**
   * 解析 PROPFIND XML 响应
   * @param {string} xml
   * @returns {Array<{name: string, path: string, lastModified: string, size: number}>}
   */
  _parsePropfindResponse(xml) {
    const files = []
    const hrefRegex = /<d:href>([^<]+)<\/d:href>/g
    const lmRegex = /<d:getlastmodified>([^<]+)<\/d:getlastmodified>/g
    const sizeRegex = /<d:getcontentlength>([^<]+)<\/d:getcontentlength>/g

    const hrefs = [...xml.matchAll(hrefRegex)].map((m) => m[1])
    const lms = [...xml.matchAll(lmRegex)].map((m) => m[1])
    const sizes = [...xml.matchAll(sizeRegex)].map((m) => parseInt(m[1], 10))

    // 跳过第一个（目录自身）
    for (let i = 1; i < hrefs.length; i++) {
      const name = decodeURIComponent(hrefs[i]).split('/').filter(Boolean).pop()
      if (!name) continue
      files.push({
        name,
        path: hrefs[i],
        lastModified: lms[i - 1] || new Date().toISOString(),
        size: sizes[i - 1] || 0,
      })
    }
    return files
  }
}

module.exports = WebDAVProvider
