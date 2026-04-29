const { stampModifiedItems } = require('./configService')

describe('configService', () => {
  describe('stampModifiedItems', () => {
    it('should set _lastModified on new profile', () => {
      const oldSettings = { apiProfiles: {} }
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'new-key' },
        },
      }
      stampModifiedItems(oldSettings, newSettings)
      expect(newSettings.apiProfiles.default._lastModified).toBeDefined()
    })

    it('should preserve _lastModified from old profile when new profile lacks it', () => {
      const oldSettings = {
        apiProfiles: {
          default: { apiKey: 'old-key', _lastModified: '2026-01-01T00:00:00Z' },
        },
      }
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'new-key' },
        },
      }
      stampModifiedItems(oldSettings, newSettings)
      expect(newSettings.apiProfiles.default._lastModified).toBe('2026-01-01T00:00:00Z')
    })

    it('should set _lastModified on new server', () => {
      const oldSettings = { mcpServers: {} }
      const newSettings = {
        mcpServers: {
          'srv-1': { command: 'node' },
        },
      }
      stampModifiedItems(oldSettings, newSettings)
      expect(newSettings.mcpServers['srv-1']._lastModified).toBeDefined()
    })

    it('should preserve _lastModified from old server when new server lacks it', () => {
      const oldSettings = {
        mcpServers: {
          'srv-1': { command: 'old-cmd', _lastModified: '2026-01-01T00:00:00Z' },
        },
      }
      const newSettings = {
        mcpServers: {
          'srv-1': { command: 'new-cmd' },
        },
      }
      stampModifiedItems(oldSettings, newSettings)
      expect(newSettings.mcpServers['srv-1']._lastModified).toBe('2026-01-01T00:00:00Z')
    })

    it('N-1: should assign current timestamp when both old and new lack _lastModified (migration case)', () => {
      const oldSettings = {
        apiProfiles: {
          default: { apiKey: 'old-key' }, // 无 _lastModified
        },
      }
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'old-key' }, // 无 _lastModified，内容未变
        },
      }
      stampModifiedItems(oldSettings, newSettings)
      expect(newSettings.apiProfiles.default._lastModified).toBeDefined()
      // 时间戳应为当前时间（ISO 字符串）
      expect(typeof newSettings.apiProfiles.default._lastModified).toBe('string')
      expect(newSettings.apiProfiles.default._lastModified.length).toBeGreaterThan(0)
    })

    it('N-1: should assign current timestamp for servers when both lack _lastModified', () => {
      const oldSettings = {
        mcpServers: {
          'srv-1': { command: 'old-cmd' }, // 无 _lastModified
        },
      }
      const newSettings = {
        mcpServers: {
          'srv-1': { command: 'old-cmd' }, // 无 _lastModified，内容未变
        },
      }
      stampModifiedItems(oldSettings, newSettings)
      expect(newSettings.mcpServers['srv-1']._lastModified).toBeDefined()
      expect(typeof newSettings.mcpServers['srv-1']._lastModified).toBe('string')
    })
  })
})
