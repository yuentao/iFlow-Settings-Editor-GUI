/**
 * WebDAVProvider 单元测试
 *
 * 通过 mock http/https 模块来测试，不依赖真实 WebDAV 服务。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import https from 'https'
import http from 'http'
import WebDAVProvider from './WebDAVProvider'

// ─── Mock 工具 ───────────────────────────────────

/**
 * 创建一个 mock 的 http.IncomingMessage
 * @param {number} statusCode
 * @param {string|Buffer} body
 * @returns {object}
 */
function createMockResponse(statusCode, body = '') {
  const chunks = typeof body === 'string' ? [Buffer.from(body)] : [body]
  return {
    statusCode,
    on: vi.fn((event, handler) => {
      if (event === 'data') {
        chunks.forEach((c) => handler(c))
      } else if (event === 'end') {
        handler()
      }
    }),
  }
}

/**
 * 创建一个 mock 的 http.ClientRequest
 * @param {object} mockRes - mock response
 * @returns {object}
 */
function createMockRequest(mockRes) {
  const req = {
    on: vi.fn((event, handler) => {
      if (event === 'error') {
        // 存储错误处理器，测试中可手动调用
        req._errorHandler = handler
      }
    }),
    write: vi.fn(),
    end: vi.fn(() => {
      // end 被调用后立即触发 response 回调
      if (req._responseCallback) {
        process.nextTick(() => req._responseCallback(mockRes))
      }
    }),
    setTimeout: vi.fn(),
    destroy: vi.fn(),
    _responseCallback: null,
    _errorHandler: null,
  }
  return req
}

// ─── 测试 ────────────────────────────────────────

describe('WebDAVProvider', () => {
  let provider
  let mockReq
  let mockRes

  beforeEach(() => {
    provider = new WebDAVProvider({
      serverUrl: 'https://dav.example.com/dav/',
      username: 'testuser',
      password: 'testpassword',
      baseDir: '/iFlow-Settings/',
    })
  })

  describe('constructor', () => {
    it('should trim trailing slashes from serverUrl', () => {
      const p = new WebDAVProvider({
        serverUrl: 'https://dav.example.com/dav///',
        username: 'u',
        password: 'p',
      })
      expect(p.serverUrl).toBe('https://dav.example.com/dav')
    })

    it('should use default baseDir if not provided', () => {
      const p = new WebDAVProvider({
        serverUrl: 'https://dav.example.com/dav/',
        username: 'u',
        password: 'p',
      })
      expect(p.baseDir).toBe('/iFlow-Settings/')
    })

    it('should use default timeout if not provided', () => {
      expect(provider.timeout).toBe(30000)
    })

    it('should accept custom timeout', () => {
      const p = new WebDAVProvider({
        serverUrl: 'https://dav.example.com/dav/',
        username: 'u',
        password: 'p',
        timeout: 5000,
      })
      expect(p.timeout).toBe(5000)
    })
  })

  describe('_buildUrl', () => {
    it('should build correct URL with baseDir', () => {
      expect(provider._buildUrl('devices/config.json')).toBe(
        'https://dav.example.com/dav/iFlow-Settings/devices/config.json'
      )
    })

    it('should handle empty relative path', () => {
      expect(provider._buildUrl('')).toBe(
        'https://dav.example.com/dav/iFlow-Settings/'
      )
    })
  })

  describe('_extractDirPath', () => {
    it('should extract directory from file path', () => {
      expect(provider._extractDirPath('devices/config-abc.json')).toBe('devices')
    })

    it('should return empty string for filename without directory', () => {
      expect(provider._extractDirPath('config.json')).toBe('')
    })

    it('should handle nested directory', () => {
      expect(provider._extractDirPath('a/b/c/file.json')).toBe('a/b/c')
    })
  })

  describe('_parsePropfindResponse', () => {
    it('should parse a typical PROPFIND response', () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/iFlow-Settings/devices/</d:href>
    <d:propstat><d:prop><d:getlastmodified>Mon, 25 Apr 2026 10:00:00 GMT</d:getlastmodified></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/iFlow-Settings/devices/config-abc123.json</d:href>
    <d:propstat><d:prop>
      <d:getlastmodified>Mon, 25 Apr 2026 10:30:00 GMT</d:getlastmodified>
      <d:getcontentlength>1024</d:getcontentlength>
    </d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/iFlow-Settings/devices/config-def456.json</d:href>
    <d:propstat><d:prop>
      <d:getlastmodified>Mon, 25 Apr 2026 09:00:00 GMT</d:getlastmodified>
      <d:getcontentlength>2048</d:getcontentlength>
    </d:prop></d:propstat>
  </d:response>
</d:multistatus>`

      const files = provider._parsePropfindResponse(xml)
      expect(files).toHaveLength(2)
      expect(files[0].name).toBe('config-abc123.json')
      expect(files[0].size).toBe(1024)
      expect(files[1].name).toBe('config-def456.json')
      expect(files[1].size).toBe(2048)
    })

    it('should handle URL-encoded hrefs', () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/iFlow-Settings/devices/</d:href>
  </d:response>
  <d:response>
    <d:href>/iFlow-Settings/devices/config-%E4%B8%AD%E6%96%87.json</d:href>
    <d:propstat><d:prop>
      <d:getlastmodified>Mon, 25 Apr 2026 10:00:00 GMT</d:getlastmodified>
      <d:getcontentlength>512</d:getcontentlength>
    </d:prop></d:propstat>
  </d:response>
</d:multistatus>`

      const files = provider._parsePropfindResponse(xml)
      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('config-中文.json')
    })

    it('should return empty array when only directory entry exists', () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/iFlow-Settings/devices/</d:href>
    <d:propstat><d:prop><d:getlastmodified>Mon, 25 Apr 2026 10:00:00 GMT</d:getlastmodified></d:prop></d:propstat>
  </d:response>
</d:multistatus>`

      const files = provider._parsePropfindResponse(xml)
      expect(files).toHaveLength(0)
    })

    it('should handle missing getlastmodified and getcontentlength', () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/dir/</d:href>
  </d:response>
  <d:response>
    <d:href>/dir/file.txt</d:href>
  </d:response>
</d:multistatus>`

      const files = provider._parsePropfindResponse(xml)
      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('file.txt')
      expect(files[0].size).toBe(0)
      // lastModified 应该有值（回退到当前时间）
      expect(files[0].lastModified).toBeTruthy()
    })
  })

  describe('upload / download / delete / list / isAuthorized', () => {
    let requestSpy

    beforeEach(() => {
      // 拦截 https.request
      requestSpy = vi.spyOn(https, 'request')
    })

    afterEach(() => {
      requestSpy.mockRestore()
    })

    // 辅助：设置 mock，让下一次 https.request 返回指定响应
    function setupMockRequest(statusCode, body = '') {
      mockRes = createMockResponse(statusCode, body)
      mockReq = createMockRequest(mockRes)
      requestSpy.mockImplementation((url, options, callback) => {
        mockReq._responseCallback = callback
        return mockReq
      })
    }

    it('upload should send PUT request with correct URL and body', async () => {
      // 先 mock _ensureDir 的 PROPFIND 成功
      const propfindRes = createMockResponse(207, '<xml/>')
      const putRes = createMockResponse(204, '')
      let callIndex = 0
      requestSpy.mockImplementation((url, options, callback) => {
        callIndex++
        if (options.method === 'PROPFIND') {
          process.nextTick(() => callback(propfindRes))
          const r = createMockRequest(propfindRes)
          r.end = vi.fn()
          return r
        }
        // PUT
        const r = createMockRequest(putRes)
        r._responseCallback = callback
        return r
      })

      const content = Buffer.from('{"test": true}')
      const result = await provider.upload('devices/config-abc.json', content)
      expect(result).toBeInstanceOf(Buffer)

      // 验证 PUT 请求的 URL
      const putCall = requestSpy.mock.calls.find(
        (c) => c[1] && c[1].method === 'PUT'
      )
      expect(putCall[0]).toContain('/iFlow-Settings/devices/config-abc.json')
    })

    it('upload should retry with DELETE on 409 (file already exists)', async () => {
      // PROPFIND 目录存在，PUT 返回 409（文件已存在），DELETE 成功，再 PUT 成功
      const propfindRes = createMockResponse(207, '<xml/>')
      const putConflictRes = createMockResponse(409, '')
      const deleteRes = createMockResponse(204, '')
      const putSuccessRes = createMockResponse(201, '')
      const methods = []

      requestSpy.mockImplementation((url, options, callback) => {
        methods.push(options.method)
        if (options.method === 'PROPFIND') {
          process.nextTick(() => callback(propfindRes))
          const r = createMockRequest(propfindRes)
          r.end = vi.fn()
          return r
        }
        if (options.method === 'PUT') {
          // 第一次 PUT 返回 409，第二次返回 201
          if (methods.filter(m => m === 'PUT').length === 1) {
            process.nextTick(() => callback(putConflictRes))
          } else {
            process.nextTick(() => callback(putSuccessRes))
          }
          const r = createMockRequest(putConflictRes)
          r._responseCallback = callback
          return r
        }
        if (options.method === 'DELETE') {
          process.nextTick(() => callback(deleteRes))
          const r = createMockRequest(deleteRes)
          r._responseCallback = callback
          return r
        }
        const r = createMockRequest(createMockResponse(500, ''))
        r._responseCallback = callback
        return r
      })

      const content = Buffer.from('{"test": true}')
      const result = await provider.upload('devices/config-abc.json', content)
      expect(result).toBeInstanceOf(Buffer)
      // PUT 应该被调用两次（第一次 409，第二次成功）
      expect(methods.filter(m => m === 'PUT')).toHaveLength(2)
      // DELETE 应该被调用一次
      expect(methods.filter(m => m === 'DELETE')).toHaveLength(1)
    })

    it('download should send GET request and return buffer', async () => {
      const responseBody = Buffer.from('file-content')
      setupMockRequest(200, responseBody)

      const result = await provider.download('devices/config-abc.json')
      expect(result.toString()).toBe('file-content')

      expect(requestSpy).toHaveBeenCalledTimes(1)
      const call = requestSpy.mock.calls[0]
      expect(call[1].method).toBe('GET')
      expect(call[0]).toContain('/iFlow-Settings/devices/config-abc.json')
    })

    it('delete should send DELETE request', async () => {
      setupMockRequest(204, '')

      await provider.delete('devices/config-abc.json')

      expect(requestSpy).toHaveBeenCalledTimes(1)
      const call = requestSpy.mock.calls[0]
      expect(call[1].method).toBe('DELETE')
    })

    it('list should send PROPFIND with Depth: 1 and parse response', async () => {
      const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/iFlow-Settings/devices/</d:href>
    <d:propstat><d:prop><d:getlastmodified>Mon, 25 Apr 2026 10:00:00 GMT</d:getlastmodified></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/iFlow-Settings/devices/config-abc.json</d:href>
    <d:propstat><d:prop>
      <d:getlastmodified>Mon, 25 Apr 2026 10:30:00 GMT</d:getlastmodified>
      <d:getcontentlength>1024</d:getcontentlength>
    </d:prop></d:propstat>
  </d:response>
</d:multistatus>`
      setupMockRequest(207, xmlBody)

      const files = await provider.list('devices/')
      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('config-abc.json')

      const call = requestSpy.mock.calls[0]
      expect(call[1].method).toBe('PROPFIND')
      expect(call[1].headers.Depth).toBe('1')
    })

    it('list should return empty array on 409 (directory not found)', async () => {
      // 某些 WebDAV 服务器在目录不存在时返回 409 Conflict 而非 404
      setupMockRequest(409, '')

      const files = await provider.list('devices/')
      expect(files).toHaveLength(0)
    })

    it('isAuthorized should return true for 207 response', async () => {
      setupMockRequest(207, '<xml/>')

      const result = await provider.isAuthorized()
      expect(result).toBe(true)
    })

    it('isAuthorized should return false for 401 response', async () => {
      setupMockRequest(401, '')

      const result = await provider.isAuthorized()
      expect(result).toBe(false)
    })

    it('isAuthorized should return false on network error', async () => {
      requestSpy.mockImplementation(() => {
        const r = createMockRequest(null)
        r.end = vi.fn(() => {
          process.nextTick(() => r._errorHandler(new Error('network error')))
        })
        return r
      })

      const result = await provider.isAuthorized()
      expect(result).toBe(false)
    })
  })

  describe('authorize', () => {
    let requestSpy

    beforeEach(() => {
      requestSpy = vi.spyOn(https, 'request')
    })

    afterEach(() => {
      requestSpy.mockRestore()
    })

    it('should return accessToken on successful auth', async () => {
      mockRes = createMockResponse(207, '<xml/>')
      requestSpy.mockImplementation((url, options, callback) => {
        process.nextTick(() => callback(mockRes))
        const r = createMockRequest(mockRes)
        r.end = vi.fn()
        return r
      })

      const result = await provider.authorize()
      expect(result.accessToken).toBeDefined()
      // accessToken 是 base64 编码的 username:password
      const decoded = Buffer.from(result.accessToken, 'base64').toString()
      expect(decoded).toBe('testuser:testpassword')
    })

    it('should throw WEBDAV_AUTH_FAILED on failed auth', async () => {
      mockRes = createMockResponse(401, '')
      requestSpy.mockImplementation((url, options, callback) => {
        process.nextTick(() => callback(mockRes))
        const r = createMockRequest(mockRes)
        r.end = vi.fn()
        return r
      })

      await expect(provider.authorize()).rejects.toThrow('WEBDAV_AUTH_FAILED')
    })
  })

  describe('_ensureDir', () => {
    let requestSpy

    beforeEach(() => {
      requestSpy = vi.spyOn(https, 'request')
    })

    afterEach(() => {
      requestSpy.mockRestore()
    })

    it('should create directory with MKCOL if PROPFIND returns 404', async () => {
      const notFoundRes = createMockResponse(404, '')
      const mkcolRes = createMockResponse(201, '')
      let callCount = 0

      requestSpy.mockImplementation((url, options, callback) => {
        callCount++
        if (options.method === 'PROPFIND') {
          process.nextTick(() => callback(notFoundRes))
          const r = createMockRequest(notFoundRes)
          r.end = vi.fn()
          return r
        }
        if (options.method === 'MKCOL') {
          process.nextTick(() => callback(mkcolRes))
          const r = createMockRequest(mkcolRes)
          r.end = vi.fn()
          return r
        }
        // fallback
        const r = createMockRequest(createMockResponse(500, ''))
        r._responseCallback = callback
        return r
      })

      await provider._ensureDir('devices')
      // 应该先 PROPFIND，再 MKCOL
      expect(callCount).toBe(2)
    })

    it('should create directory with MKCOL if PROPFIND returns 409 (conflict)', async () => {
      // 某些 WebDAV 服务器在目录不存在时返回 409 Conflict 而非 404
      const conflictRes = createMockResponse(409, '')
      const mkcolRes = createMockResponse(201, '')
      let callCount = 0

      requestSpy.mockImplementation((url, options, callback) => {
        callCount++
        if (options.method === 'PROPFIND') {
          process.nextTick(() => callback(conflictRes))
          const r = createMockRequest(conflictRes)
          r.end = vi.fn()
          return r
        }
        if (options.method === 'MKCOL') {
          process.nextTick(() => callback(mkcolRes))
          const r = createMockRequest(mkcolRes)
          r.end = vi.fn()
          return r
        }
        // fallback
        const r = createMockRequest(createMockResponse(500, ''))
        r._responseCallback = callback
        return r
      })

      await provider._ensureDir('devices')
      // 应该先 PROPFIND，再 MKCOL
      expect(callCount).toBe(2)
    })

    it('should not create directory if PROPFIND succeeds', async () => {
      const okRes = createMockResponse(207, '<xml/>')
      let methods = []

      requestSpy.mockImplementation((url, options, callback) => {
        methods.push(options.method)
        process.nextTick(() => callback(okRes))
        const r = createMockRequest(okRes)
        r.end = vi.fn()
        return r
      })

      await provider._ensureDir('devices')
      expect(methods).toEqual(['PROPFIND'])
    })

    it('should create nested directories one by one', async () => {
      const notFoundRes = createMockResponse(404, '')
      const mkcolRes = createMockResponse(201, '')
      let methods = []

      requestSpy.mockImplementation((url, options, callback) => {
        methods.push(options.method)
        if (options.method === 'PROPFIND') {
          process.nextTick(() => callback(notFoundRes))
          const r = createMockRequest(notFoundRes)
          r.end = vi.fn()
          return r
        }
        if (options.method === 'MKCOL') {
          process.nextTick(() => callback(mkcolRes))
          const r = createMockRequest(mkcolRes)
          r.end = vi.fn()
          return r
        }
        const r = createMockRequest(createMockResponse(500, ''))
        r._responseCallback = callback
        return r
      })

      await provider._ensureDir('a/b/c')
      // a/ → PROPFIND + MKCOL, a/b/ → PROPFIND + MKCOL, a/b/c/ → PROPFIND + MKCOL
      expect(methods).toEqual([
        'PROPFIND', 'MKCOL',
        'PROPFIND', 'MKCOL',
        'PROPFIND', 'MKCOL',
      ])
    })

    it('should handle MKCOL returning 409 (directory already exists)', async () => {
      // PROPFIND 返回 404 → 尝试 MKCOL，但 MKCOL 返回 409（目录已存在/并发）
      // 应该视为成功，不抛出异常
      const notFoundRes = createMockResponse(404, '')
      const conflictRes = createMockResponse(409, '')
      let methods = []

      requestSpy.mockImplementation((url, options, callback) => {
        methods.push(options.method)
        if (options.method === 'PROPFIND') {
          process.nextTick(() => callback(notFoundRes))
          const r = createMockRequest(notFoundRes)
          r.end = vi.fn()
          return r
        }
        if (options.method === 'MKCOL') {
          process.nextTick(() => callback(conflictRes))
          const r = createMockRequest(conflictRes)
          r.end = vi.fn()
          return r
        }
        const r = createMockRequest(createMockResponse(500, ''))
        r._responseCallback = callback
        return r
      })

      // 不应该抛出异常（MKCOL 返回 409 后会重试一次，仍然 409 但被忽略）
      await expect(provider._ensureDir('devices')).resolves.toBeUndefined()
      expect(methods).toEqual(['PROPFIND', 'MKCOL', 'MKCOL'])
    })
  })

  describe('error handling', () => {
    let requestSpy

    beforeEach(() => {
      requestSpy = vi.spyOn(https, 'request')
    })

    afterEach(() => {
      requestSpy.mockRestore()
    })

    it('should throw WEBDAV_AUTH_FAILED on 401', async () => {
      setupMockRequest(401, '')
      await expect(provider.download('test.txt')).rejects.toThrow('WEBDAV_AUTH_FAILED')
    })

    it('should throw WEBDAV_NOT_FOUND on 404', async () => {
      setupMockRequest(404, '')
      await expect(provider.download('test.txt')).rejects.toThrow('WEBDAV_NOT_FOUND')
    })

    it('should throw WEBDAV_ERROR_XXX on other HTTP errors', async () => {
      setupMockRequest(500, '')
      await expect(provider.download('test.txt')).rejects.toThrow('WEBDAV_ERROR_500')
    })

    it('should throw on network error', async () => {
      requestSpy.mockImplementation(() => {
        const r = createMockRequest(null)
        r.end = vi.fn(() => {
          process.nextTick(() => r._errorHandler(new Error('ECONNREFUSED')))
        })
        return r
      })

      await expect(provider.download('test.txt')).rejects.toThrow('ECONNREFUSED')
    })

    it('should throw WEBDAV_TIMEOUT when request times out', async () => {
      requestSpy.mockImplementation(() => {
        const r = {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(),
          setTimeout: vi.fn((ms, handler) => {
            process.nextTick(handler)
          }),
          destroy: vi.fn((err) => {
            // destroy 触发 error 事件
            process.nextTick(() => r._errorHandler(err || new Error('WEBDAV_TIMEOUT')))
          }),
          _errorHandler: null,
        }
        r.on.mockImplementation((event, handler) => {
          if (event === 'error') r._errorHandler = handler
        })
        return r
      })

      await expect(provider.download('test.txt')).rejects.toThrow('WEBDAV_TIMEOUT')
    })

    function setupMockRequest(statusCode, body = '') {
      mockRes = createMockResponse(statusCode, body)
      mockReq = createMockRequest(mockRes)
      requestSpy.mockImplementation((url, options, callback) => {
        mockReq._responseCallback = callback
        return mockReq
      })
    }
  })

  describe('http vs https', () => {
    let httpsSpy
    let httpSpy

    beforeEach(() => {
      httpsSpy = vi.spyOn(https, 'request')
      httpSpy = vi.spyOn(http, 'request')
    })

    afterEach(() => {
      httpsSpy.mockRestore()
      httpSpy.mockRestore()
    })

    it('should use https for https:// URLs', async () => {
      const okRes = createMockResponse(200, 'ok')
      httpsSpy.mockImplementation((url, options, callback) => {
        process.nextTick(() => callback(okRes))
        const r = createMockRequest(okRes)
        r.end = vi.fn()
        return r
      })

      await provider.download('test.txt')
      expect(httpsSpy).toHaveBeenCalled()
      expect(httpSpy).not.toHaveBeenCalled()
    })

    it('should use http for http:// URLs', async () => {
      const httpProvider = new WebDAVProvider({
        serverUrl: 'http://nas.local:5005/webdav/',
        username: 'u',
        password: 'p',
      })

      const okRes = createMockResponse(200, 'ok')
      httpSpy.mockImplementation((url, options, callback) => {
        process.nextTick(() => callback(okRes))
        const r = createMockRequest(okRes)
        r.end = vi.fn()
        return r
      })

      await httpProvider.download('test.txt')
      expect(httpSpy).toHaveBeenCalled()
      expect(httpsSpy).not.toHaveBeenCalled()
    })
  })

  describe('revoke / dispose / refreshToken', () => {
    it('revoke should not throw', async () => {
      await expect(provider.revoke()).resolves.toBeUndefined()
    })

    it('dispose should not throw', () => {
      expect(() => provider.dispose()).not.toThrow()
    })

    it('refreshToken should call authorize', async () => {
      const authorizeSpy = vi.spyOn(provider, 'authorize').mockResolvedValue({ accessToken: 'x' })
      const result = await provider.refreshToken()
      expect(authorizeSpy).toHaveBeenCalled()
      expect(result.accessToken).toBe('x')
      authorizeSpy.mockRestore()
    })
  })
})
