const crypto = require('crypto')

const SENSITIVE_KEYS = new Set(['apiKey'])
const ENC_PREFIX = '$enc:'

class CryptoManager {
  constructor() {
    this.saltLength = 16    // 128 位
    this.ivLength = 12      // GCM 推荐 96 位
    this.keyLength = 32     // 256 位
    this.iterations = 600000 // OWASP 2023 推荐的 PBKDF2-SHA256 最小迭代次数
  }

  /**
   * 从密码派生 AES 密钥
   * @param {string} password - 用户密码
   * @param {Buffer} salt - 随机盐
   * @returns {Buffer} 256 位 AES 密钥
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, 'sha256')
  }

  /**
   * 加密单个字段值
   * @param {string} plaintext - 明文
   * @param {Buffer} key - AES 密钥
   * @returns {string} `$enc:ciphertext:iv:authTag` 格式
   */
  encryptField(plaintext, key) {
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    return `${ENC_PREFIX}${encrypted.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}`
  }

  /**
   * 解密 `$enc:...` 格式的字段
   * @param {string} encString - 加密字符串
   * @param {Buffer} key - AES 密钥
   * @returns {string} 明文
   */
  decryptField(encString, key) {
    if (!encString.startsWith(ENC_PREFIX)) return encString
    const parts = encString.slice(ENC_PREFIX.length).split(':')
    const ciphertext = Buffer.from(parts[0], 'base64')
    const iv = Buffer.from(parts[1], 'base64')
    const authTag = Buffer.from(parts[2], 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  }

  /**
   * 加密整个同步数据（字段级）
   * @param {object} data - 同步数据
   * @param {string} password - 同步密码
   * @returns {object} 加密后的数据（含 _salt）
   */
  encryptSyncData(data, password) {
    const salt = crypto.randomBytes(this.saltLength)
    const key = this.deriveKey(password, salt)
    const encrypted = this._encryptFields(data, key)
    encrypted._salt = salt.toString('base64')
    return encrypted
  }

  /**
   * 解密同步数据
   * @param {object} data - 含 _salt 的加密数据
   * @param {string} password - 同步密码
   * @returns {object} 解密后的数据
   */
  decryptSyncData(data, password) {
    const salt = Buffer.from(data._salt, 'base64')
    const key = this.deriveKey(password, salt)
    return this._decryptFields(data, key)
  }

  /**
   * 递归加密敏感字段
   * @param {*} obj - 数据对象
   * @param {Buffer} key - AES 密钥
   * @returns {*} 加密后的数据
   */
  _encryptFields(obj, key) {
    if (Array.isArray(obj)) return obj.map(item => this._encryptFields(item, key))
    if (obj && typeof obj === 'object') {
      const result = {}
      for (const [k, v] of Object.entries(obj)) {
        if (k === '_salt') continue
        if (k === 'env' && v && typeof v === 'object') {
          result[k] = {}
          for (const [ek, ev] of Object.entries(v)) {
            result[k][ek] = this.encryptField(String(ev), key)
          }
        } else if (SENSITIVE_KEYS.has(k) && typeof v === 'string') {
          result[k] = this.encryptField(v, key)
        } else if (v && typeof v === 'object') {
          result[k] = this._encryptFields(v, key)
        } else {
          result[k] = v
        }
      }
      return result
    }
    return obj
  }

  /**
   * 递归解密 $enc: 字段
   * @param {*} obj - 加密数据对象
   * @param {Buffer} key - AES 密钥
   * @returns {*} 解密后的数据
   */
  _decryptFields(obj, key) {
    if (Array.isArray(obj)) return obj.map(item => this._decryptFields(item, key))
    if (obj && typeof obj === 'object') {
      const result = {}
      for (const [k, v] of Object.entries(obj)) {
        if (k === '_salt') continue
        if (k === 'env' && v && typeof v === 'object') {
          result[k] = {}
          for (const [ek, ev] of Object.entries(v)) {
            result[k][ek] = typeof ev === 'string' && ev.startsWith(ENC_PREFIX)
              ? this.decryptField(ev, key)
              : ev
          }
        } else if (typeof v === 'string' && v.startsWith(ENC_PREFIX)) {
          result[k] = this.decryptField(v, key)
        } else if (v && typeof v === 'object') {
          result[k] = this._decryptFields(v, key)
        } else {
          result[k] = v
        }
      }
      return result
    }
    return obj
  }

  /**
   * 生成密钥验证哈希（用于密码验证）
   * @param {Buffer} key - 派生密钥
   * @returns {string} SHA-256 十六进制哈希
   */
  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  /**
   * 常量时间比较哈希值（N-4：防止 timing attack）
   * @param {string} a - 哈希值 A（hex）
   * @param {string} b - 哈希值 B（hex）
   * @returns {boolean}
   */
  verifyHash(a, b) {
    const bufA = Buffer.from(a, 'hex')
    const bufB = Buffer.from(b, 'hex')
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  }

  /**
   * 递归排序对象键（保证序列化结果一致）
   * @param {*} obj - 数据
   * @returns {*} 键排序后的数据
   */
  _sortKeys(obj) {
    if (Array.isArray(obj)) return obj.map(item => this._sortKeys(item))
    if (obj && typeof obj === 'object') {
      const sorted = {}
      for (const key of Object.keys(obj).sort()) {
        sorted[key] = this._sortKeys(obj[key])
      }
      return sorted
    }
    return obj
  }

  /**
   * 计算数据指纹（用于变更检测，不含 _salt）
   * @param {object} data - 数据对象
   * @returns {string} SHA-256 十六进制指纹
   */
  fingerprint(data) {
    const clone = { ...data }
    delete clone._salt
    const str = JSON.stringify(this._sortKeys(clone))
    return crypto.createHash('sha256').update(str).digest('hex')
  }
}

module.exports = CryptoManager
