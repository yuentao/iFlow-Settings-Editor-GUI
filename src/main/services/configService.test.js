/**
 * configService 单元测试
 *
 * 重点覆盖 stampModifiedItems 的所有分支（含 N-1 修复场景），
 * 以及 tombstone 工具函数。
 *
 * configService.js 已重构为延迟加载 electron（仅 readSettings/writeSettings 需要），
 * 纯函数（stampModifiedItems、tombstone 工具）可在无 electron 环境下直接测试。
 */
import { describe, it, expect } from 'vitest'
import {
  stampModifiedItems,
  markDeletedProfile,
  markDeletedServer,
  getProfileTombstoneTime,
  getServerTombstoneTime,
  pruneOldTombstones,
} from './configService'

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

    it('should set _lastModified on new server', () => {
      const oldSettings = { mcpServers: {} }
      const newSettings = {
        mcpServers: {
          'my-server': { command: 'npx', args: ['x'] },
        },
      }

      stampModifiedItems(oldSettings, newSettings)

      expect(newSettings.mcpServers['my-server']._lastModified).toBeDefined()
    })

    it('should update _lastModified when profile content changes', () => {
      const oldSettings = {
        apiProfiles: {
          default: { apiKey: 'old-key', _lastModified: '2026-04-25T08:00:00Z' },
        },
      }
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'new-key' },
        },
      }

      stampModifiedItems(oldSettings, newSettings)

      expect(newSettings.apiProfiles.default._lastModified).toBeDefined()
      expect(newSettings.apiProfiles.default._lastModified).not.toBe('2026-04-25T08:00:00Z')
    })

    it('should keep original _lastModified when profile content is unchanged', () => {
      const oldSettings = {
        apiProfiles: {
          default: { apiKey: 'same-key', _lastModified: '2026-04-25T08:00:00Z' },
        },
      }
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'same-key' },
        },
      }

      stampModifiedItems(oldSettings, newSettings)

      expect(newSettings.apiProfiles.default._lastModified).toBe('2026-04-25T08:00:00Z')
    })

    it('should inherit old _lastModified when profile content unchanged but newSettings lacks _lastModified', () => {
      const oldSettings = {
        apiProfiles: {
          default: { apiKey: 'same-key', _lastModified: '2026-04-25T08:00:00Z' },
        },
      }
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'same-key' },
        },
      }

      stampModifiedItems(oldSettings, newSettings)

      expect(newSettings.apiProfiles.default._lastModified).toBe('2026-04-25T08:00:00Z')
    })

    it('N-1: should backfill _lastModified for old profile entry without timestamp when content unchanged', () => {
      const oldSettings = {
        apiProfiles: {
          default: { apiKey: 'old-key' },
        },
      }
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'old-key' },
        },
      }

      stampModifiedItems(oldSettings, newSettings)

      expect(newSettings.apiProfiles.default._lastModified).toBeDefined()
    })

    it('N-1: should backfill _lastModified for old server entry without timestamp when content unchanged', () => {
      const oldSettings = {
        mcpServers: {
          'my-server': { command: 'npx', args: ['x'] },
        },
      }
      const newSettings = {
        mcpServers: {
          'my-server': { command: 'npx', args: ['x'] },
        },
      }

      stampModifiedItems(oldSettings, newSettings)

      expect(newSettings.mcpServers['my-server']._lastModified).toBeDefined()
    })

    it('should handle null oldSettings gracefully', () => {
      const newSettings = {
        apiProfiles: {
          default: { apiKey: 'key' },
        },
      }

      stampModifiedItems(null, newSettings)

      expect(newSettings.apiProfiles.default._lastModified).toBeDefined()
    })

    it('should handle undefined newSettings gracefully', () => {
      expect(() => stampModifiedItems({}, undefined)).not.toThrow()
      expect(() => stampModifiedItems({}, null)).not.toThrow()
    })

    it('should handle empty apiProfiles and mcpServers', () => {
      const oldSettings = { apiProfiles: {}, mcpServers: {} }
      const newSettings = { apiProfiles: {}, mcpServers: {} }

      expect(() => stampModifiedItems(oldSettings, newSettings)).not.toThrow()
    })

    it('should skip non-object profile entries', () => {
      const oldSettings = { apiProfiles: {} }
      const newSettings = {
        apiProfiles: {
          bad: null,
          alsoBad: 42,
        },
      }

      expect(() => stampModifiedItems(oldSettings, newSettings)).not.toThrow()
    })
  })

  describe('tombstone utilities', () => {
    describe('markDeletedProfile', () => {
      it('should create _deletedProfiles bucket and mark profile', () => {
        const settings = {}
        markDeletedProfile(settings, 'staging')

        expect(settings._deletedProfiles).toBeDefined()
        expect(settings._deletedProfiles.staging.deletedAt).toBeDefined()
      })

      it('should use custom deletedAt if provided', () => {
        const settings = {}
        markDeletedProfile(settings, 'staging', '2026-04-26T12:00:00Z')

        expect(settings._deletedProfiles.staging.deletedAt).toBe('2026-04-26T12:00:00Z')
      })

      it('should handle null/empty args gracefully', () => {
        expect(() => markDeletedProfile(null, 'staging')).not.toThrow()
        expect(() => markDeletedProfile({}, '')).not.toThrow()
      })
    })

    describe('markDeletedServer', () => {
      it('should create _deletedServers bucket and mark server', () => {
        const settings = {}
        markDeletedServer(settings, 'my-server')

        expect(settings._deletedServers).toBeDefined()
        expect(settings._deletedServers['my-server'].deletedAt).toBeDefined()
      })
    })

    describe('getProfileTombstoneTime', () => {
      it('should return 0 when no tombstone exists', () => {
        expect(getProfileTombstoneTime({}, 'staging')).toBe(0)
        expect(getProfileTombstoneTime(null, 'staging')).toBe(0)
      })

      it('should return timestamp in ms when tombstone exists', () => {
        const settings = {
          _deletedProfiles: {
            staging: { deletedAt: '2026-04-26T12:00:00Z' },
          },
        }
        const t = getProfileTombstoneTime(settings, 'staging')
        expect(t).toBe(new Date('2026-04-26T12:00:00Z').getTime())
      })
    })

    describe('getServerTombstoneTime', () => {
      it('should return 0 when no tombstone exists', () => {
        expect(getServerTombstoneTime({}, 'my-server')).toBe(0)
      })

      it('should return timestamp in ms when tombstone exists', () => {
        const settings = {
          _deletedServers: {
            'my-server': { deletedAt: '2026-04-26T12:00:00Z' },
          },
        }
        const t = getServerTombstoneTime(settings, 'my-server')
        expect(t).toBe(new Date('2026-04-26T12:00:00Z').getTime())
      })
    })

    describe('pruneOldTombstones', () => {
      it('should remove tombstones older than retention period', () => {
        const settings = {
          _deletedProfiles: {
            old: { deletedAt: '2020-01-01T00:00:00Z' },
          },
          _deletedServers: {
            'old-server': { deletedAt: '2020-01-01T00:00:00Z' },
          },
        }

        const removed = pruneOldTombstones(settings, 1)

        expect(removed).toBe(2)
        expect(settings._deletedProfiles.old).toBeUndefined()
        expect(settings._deletedServers['old-server']).toBeUndefined()
      })

      it('should keep tombstones within retention period', () => {
        const recent = new Date().toISOString()
        const settings = {
          _deletedProfiles: {
            recent: { deletedAt: recent },
          },
        }

        const removed = pruneOldTombstones(settings, 30)

        expect(removed).toBe(0)
        expect(settings._deletedProfiles.recent).toBeDefined()
      })

      it('should return 0 for null settings', () => {
        expect(pruneOldTombstones(null)).toBe(0)
      })

      it('should use default retention of 30 days', () => {
        const settings = {
          _deletedProfiles: {
            old: { deletedAt: '2020-01-01T00:00:00Z' },
          },
        }

        pruneOldTombstones(settings)

        expect(settings._deletedProfiles.old).toBeUndefined()
      })
    })
  })
})
