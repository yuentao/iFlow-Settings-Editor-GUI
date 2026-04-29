/**
 * CryptoManager 单元测试
 */
import { describe, it, expect } from 'vitest'
import CryptoManager from './CryptoManager'

describe('CryptoManager', () => {
  const mgr = new CryptoManager()

  describe('deriveKey', () => {
    it('should derive a 32-byte key from password and salt', () => {
      const salt = Buffer.alloc(mgr.saltLength, 1)
      const key = mgr.deriveKey('test-password', salt)
      expect(key).toBeInstanceOf(Buffer)
      expect(key.length).toBe(32)
    })

    it('should produce the same key for same password and salt', () => {
      const salt = Buffer.alloc(mgr.saltLength, 2)
      const key1 = mgr.deriveKey('my-password', salt)
      const key2 = mgr.deriveKey('my-password', salt)
      expect(key1.equals(key2)).toBe(true)
    })

    it('should produce different keys for different passwords', () => {
      const salt = Buffer.alloc(mgr.saltLength, 3)
      const key1 = mgr.deriveKey('password-a', salt)
      const key2 = mgr.deriveKey('password-b', salt)
      expect(key1.equals(key2)).toBe(false)
    })

    it('should produce different keys for different salts', () => {
      const salt1 = Buffer.alloc(mgr.saltLength, 4)
      const salt2 = Buffer.alloc(mgr.saltLength, 5)
      const key1 = mgr.deriveKey('same-password', salt1)
      const key2 = mgr.deriveKey('same-password', salt2)
      expect(key1.equals(key2)).toBe(false)
    })
  })

  describe('encryptField / decryptField', () => {
    it('should encrypt and decrypt a string field', () => {
      const salt = Buffer.alloc(mgr.saltLength, 10)
      const key = mgr.deriveKey('test-pass', salt)
      const plaintext = 'sk-abc123secretkey'

      const encrypted = mgr.encryptField(plaintext, key)
      expect(encrypted).toMatch(/^\$enc:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/)

      const decrypted = mgr.decryptField(encrypted, key)
      expect(decrypted).toBe(plaintext)
    })

    it('should return non-$enc strings unchanged on decrypt', () => {
      const salt = Buffer.alloc(mgr.saltLength, 11)
      const key = mgr.deriveKey('test-pass', salt)
      const plain = 'not-encrypted'
      expect(mgr.decryptField(plain, key)).toBe('not-encrypted')
    })

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const salt = Buffer.alloc(mgr.saltLength, 12)
      const key = mgr.deriveKey('test-pass', salt)
      const plaintext = 'same-value'

      const enc1 = mgr.encryptField(plaintext, key)
      const enc2 = mgr.encryptField(plaintext, key)
      // 不同 IV 应产生不同密文
      expect(enc1).not.toBe(enc2)
      // 但都应能正确解密
      expect(mgr.decryptField(enc1, key)).toBe(plaintext)
      expect(mgr.decryptField(enc2, key)).toBe(plaintext)
    })

    it('should fail to decrypt with wrong key', () => {
      const salt = Buffer.alloc(mgr.saltLength, 13)
      const key1 = mgr.deriveKey('correct-password', salt)
      const key2 = mgr.deriveKey('wrong-password', salt)

      const encrypted = mgr.encryptField('secret', key1)
      expect(() => mgr.decryptField(encrypted, key2)).toThrow()
    })

    it('should handle empty string', () => {
      const salt = Buffer.alloc(mgr.saltLength, 14)
      const key = mgr.deriveKey('test-pass', salt)
      const encrypted = mgr.encryptField('', key)
      const decrypted = mgr.decryptField(encrypted, key)
      expect(decrypted).toBe('')
    })

    it('should handle unicode characters', () => {
      const salt = Buffer.alloc(mgr.saltLength, 15)
      const key = mgr.deriveKey('test-pass', salt)
      const plaintext = '中文密钥🔑日本語'
      const encrypted = mgr.encryptField(plaintext, key)
      const decrypted = mgr.decryptField(encrypted, key)
      expect(decrypted).toBe(plaintext)
    })
  })

  describe('encryptSyncData / decryptSyncData', () => {
    const sampleData = {
      apiProfiles: {
        default: {
          selectedAuthType: 'openai-compatible',
          apiKey: 'sk-secret-key-123',
          baseUrl: 'https://api.example.com',
          modelName: 'gpt-4',
        },
        production: {
          selectedAuthType: 'anthropic',
          apiKey: 'sk-prod-key-789',
          baseUrl: 'https://api.anthropic.com',
          modelName: 'claude-3',
        },
      },
      currentApiProfile: 'default',
      mcpServers: {
        'my-server': {
          command: 'npx',
          args: ['-y', 'some-package'],
          description: 'My MCP Server',
          env: {
            API_KEY: 'env-secret-key',
            OTHER_VAR: 'other-value',
          },
        },
      },
      apiProfilesOrder: ['default', 'production'],
    }

    it('should encrypt sensitive fields and leave non-sensitive fields plain', () => {
      const encrypted = mgr.encryptSyncData(sampleData, 'my-password')

      // 敏感字段应被加密
      expect(encrypted.apiProfiles.default.apiKey).toMatch(/^\$enc:/)
      expect(encrypted.apiProfiles.production.apiKey).toMatch(/^\$enc:/)
      expect(encrypted.mcpServers['my-server'].env.API_KEY).toMatch(/^\$enc:/)

      // 非敏感字段应保持明文
      expect(encrypted.apiProfiles.default.baseUrl).toBe('https://api.example.com')
      expect(encrypted.apiProfiles.default.modelName).toBe('gpt-4')
      expect(encrypted.apiProfiles.default.selectedAuthType).toBe('openai-compatible')
      expect(encrypted.mcpServers['my-server'].command).toBe('npx')
      expect(encrypted.mcpServers['my-server'].description).toBe('My MCP Server')
      expect(encrypted.currentApiProfile).toBe('default')
      expect(encrypted.apiProfilesOrder).toEqual(['default', 'production'])
    })

    it('should include _salt in encrypted data', () => {
      const encrypted = mgr.encryptSyncData(sampleData, 'my-password')
      expect(encrypted._salt).toBeDefined()
      expect(typeof encrypted._salt).toBe('string')
      // 应该是有效的 Base64
      expect(() => Buffer.from(encrypted._salt, 'base64')).not.toThrow()
    })

    it('should round-trip encrypt then decrypt', () => {
      const encrypted = mgr.encryptSyncData(sampleData, 'my-password')
      const decrypted = mgr.decryptSyncData(encrypted, 'my-password')

      expect(decrypted.apiProfiles).toEqual(sampleData.apiProfiles)
      expect(decrypted.currentApiProfile).toBe(sampleData.currentApiProfile)
      expect(decrypted.mcpServers).toEqual(sampleData.mcpServers)
      expect(decrypted.apiProfilesOrder).toEqual(sampleData.apiProfilesOrder)
    })

    it('should not include _salt in decrypted data', () => {
      const encrypted = mgr.encryptSyncData(sampleData, 'my-password')
      const decrypted = mgr.decryptSyncData(encrypted, 'my-password')
      expect(decrypted._salt).toBeUndefined()
    })

    it('should fail to decrypt with wrong password', () => {
      const encrypted = mgr.encryptSyncData(sampleData, 'correct-password')
      expect(() => mgr.decryptSyncData(encrypted, 'wrong-password')).toThrow()
    })

    it('should produce different encrypted outputs each time (random salt + IV)', () => {
      const enc1 = mgr.encryptSyncData(sampleData, 'same-password')
      const enc2 = mgr.encryptSyncData(sampleData, 'same-password')
      // salt 不同，密文应该不同
      expect(enc1._salt).not.toBe(enc2._salt)
      expect(enc1.apiProfiles.default.apiKey).not.toBe(enc2.apiProfiles.default.apiKey)
    })

    it('should handle empty env object', () => {
      const data = {
        mcpServers: {
          server1: { command: 'node', args: [], env: {} },
        },
      }
      const encrypted = mgr.encryptSyncData(data, 'pass')
      const decrypted = mgr.decryptSyncData(encrypted, 'pass')
      expect(decrypted.mcpServers.server1.env).toEqual({})
    })

    it('should handle data without sensitive fields', () => {
      const data = {
        apiProfiles: {
          minimal: { baseUrl: 'https://example.com', modelName: 'test' },
        },
      }
      const encrypted = mgr.encryptSyncData(data, 'pass')
      const decrypted = mgr.decryptSyncData(encrypted, 'pass')
      expect(decrypted).toEqual(data)
    })

    it('should handle null and undefined values gracefully', () => {
      const data = {
        apiProfiles: {
          p1: { apiKey: null },
        },
      }
      const encrypted = mgr.encryptSyncData(data, 'pass')
      const decrypted = mgr.decryptSyncData(encrypted, 'pass')
      expect(decrypted.apiProfiles.p1.apiKey).toBeNull()
    })
  })

  describe('hashKey', () => {
    it('should return a 64-char hex string for a 32-byte key', () => {
      const salt = Buffer.alloc(mgr.saltLength, 20)
      const key = mgr.deriveKey('password', salt)
      const hash = mgr.hashKey(key)
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should produce the same hash for the same key', () => {
      const salt = Buffer.alloc(mgr.saltLength, 21)
      const key = mgr.deriveKey('password', salt)
      expect(mgr.hashKey(key)).toBe(mgr.hashKey(key))
    })

    it('should produce different hashes for different keys', () => {
      const salt1 = Buffer.alloc(mgr.saltLength, 22)
      const salt2 = Buffer.alloc(mgr.saltLength, 23)
      const key1 = mgr.deriveKey('password', salt1)
      const key2 = mgr.deriveKey('password', salt2)
      expect(mgr.hashKey(key1)).not.toBe(mgr.hashKey(key2))
    })
  })

  describe('fingerprint', () => {
    it('should return a 64-char hex string', () => {
      const data = { apiProfiles: {}, mcpServers: {} }
      const fp = mgr.fingerprint(data)
      expect(fp).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should produce the same fingerprint for the same data', () => {
      const data = { apiProfiles: { a: 1 }, mcpServers: {} }
      expect(mgr.fingerprint(data)).toBe(mgr.fingerprint(data))
    })

    it('should produce different fingerprints for different data', () => {
      const data1 = { apiProfiles: { a: 1 }, mcpServers: {} }
      const data2 = { apiProfiles: { a: 2 }, mcpServers: {} }
      expect(mgr.fingerprint(data1)).not.toBe(mgr.fingerprint(data2))
    })

    it('should exclude _salt from fingerprint', () => {
      const data1 = { apiProfiles: { a: 1 }, _salt: 'salt1' }
      const data2 = { apiProfiles: { a: 1 }, _salt: 'salt2' }
      expect(mgr.fingerprint(data1)).toBe(mgr.fingerprint(data2))
    })
  })
})
