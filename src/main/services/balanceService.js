/**
 * Token 余额查询服务
 * 支持 BUZZ / DeepSeek / 云雾
 * 使用 Electron net.request 发起 HTTP 请求，与 fetchModels 保持一致
 */

const { net } = require('electron')

// 内置检测规则（使用 provider 名作为 baseUrl 匹配关键词）
const BUILTIN_RULES = [
  { provider: 'buzz', endpoint: '/api/usage/token/' },
  { provider: 'deepseek', endpoint: '/user/balance' },
  { provider: 'yunwu', endpoint: '' },
]

/**
 * 自动检测 Provider
 * @param {string} baseUrl
 * @param {string} forceProvider  — profile 级手动指定值
 * @param {Array<{provider:string, endpoint:string}>} [customRules] — 用户自定义规则
 * @returns {string} 匹配到的 provider 名称或 'disabled'
 */
function detectProvider(baseUrl, forceProvider, customRules) {
  if (forceProvider && forceProvider !== 'auto') {
    return forceProvider
  }

  if (!baseUrl || typeof baseUrl !== 'string') {
    return 'disabled'
  }

  const url = baseUrl.toLowerCase()

  // 1️⃣ 优先匹配用户自定义规则（用 provider 名作为关键词匹配）
  if (Array.isArray(customRules) && customRules.length > 0) {
    for (const rule of customRules) {
      if (rule.provider && url.includes(rule.provider.toLowerCase())) {
        return rule.provider
      }
    }
    // 用户自定义规则存在但不匹配 → 不再 fallback 到内置规则（用户意图明确）
    return 'disabled'
  }

  // 2️⃣ 匹配内置规则
  for (const rule of BUILTIN_RULES) {
    if (url.includes(rule.provider)) {
      return rule.provider
    }
  }

  return 'disabled'
}

/**
 * 统一入口：查询 Token 余额
 * @param {{ baseUrl: string, apiKey: string, provider: string, detectionRules?: Array<{provider:string, endpoint:string}> }} params
 * @returns {Promise<import('../../shared/types').TokenBalanceResult>}
 */
async function fetchTokenBalance({ baseUrl, apiKey, provider, detectionRules }) {
  // 参数校验
  if (!baseUrl || !baseUrl.trim()) {
    return { success: false, provider: '', error: 'api.balance.baseUrlRequired', fetchedAt: new Date().toISOString() }
  }
  if (!apiKey || !apiKey.trim()) {
    return { success: false, provider: '', error: 'api.balance.apiKeyRequired', fetchedAt: new Date().toISOString() }
  }

  // 检测 provider
  const resolvedProvider = detectProvider(baseUrl, provider, detectionRules)

  if (resolvedProvider === 'disabled') {
    return { success: false, provider: 'disabled', error: 'api.balance.notSupported', fetchedAt: new Date().toISOString() }
  }

  // 分发到具体 provider 实现
  switch (resolvedProvider) {
    case 'buzz':
      return fetchBuzzBalance(baseUrl.trim(), apiKey.trim())
    case 'deepseek':
      return fetchDeepSeekBalance(baseUrl.trim(), apiKey.trim())
    case 'yunwu':
      return fetchYunwuBalance(baseUrl.trim(), apiKey.trim())
    default:
      return { success: false, provider: resolvedProvider, error: 'api.balance.notSupported', fetchedAt: new Date().toISOString() }
  }
}

/**
 * 从 baseUrl 推导 origin（去掉路径，保留协议+主机+端口）
 * @param {string} baseUrl
 * @returns {string}
 */
function getOrigin(baseUrl) {
  try {
    const parsed = new URL(baseUrl)
    return parsed.origin
  } catch {
    return baseUrl.replace(/\/+$/, '')
  }
}

/**
 * 发送 HTTP GET 请求并解析 JSON
 * @param {string} url
 * @param {string} apiKey
 * @param {number} [timeout=10000]
 * @returns {Promise<{statusCode:number, body:object}|{success:boolean, error:string}>}
 */
function httpGetJson(url, apiKey, timeout = 10000) {
  return new Promise(resolve => {
    const request = net.request({ url, method: 'GET' })
    request.setHeader('Authorization', `Bearer ${apiKey}`)
    request.setHeader('Accept', 'application/json')

    let body = ''
    request.on('response', response => {
      const statusCode = response.statusCode
      if (statusCode !== 200) {
        request.destroy()
        resolve({ success: false, error: 'api.balance.httpError', code: statusCode, httpStatus: statusCode })
        return
      }
      response.on('data', chunk => { body += chunk.toString() })
      response.on('end', () => {
        try {
          resolve({ success: true, statusCode, body: JSON.parse(body) })
        } catch (e) {
          resolve({ success: false, error: 'api.balance.invalidResponse' })
        }
      })
    })

    request.on('error', () => {
      resolve({ success: false, error: 'api.balance.networkError' })
    })

    setTimeout(() => {
      request.destroy()
      resolve({ success: false, error: 'api.balance.timeout' })
    }, timeout)

    request.end()
  })
}

/**
 * BUZZ 余额查询
 * 接口: /api/usage/token/ (GET)
 * 返回示例:
 * {
 *   "quota": { "soft_limit_usd": "2000.000", "hard_limit_usd": "2000.000", ... },
 *   "used": { "token_used": "...", "usd": "0.14" },
 *   "api_key_usable": true,
 *   "total_usage": { "usd": "18.25", "token_used": "9123564" }
 * }
 * @param {string} baseUrl
 * @param {string} apiKey
 * @returns {Promise<TokenBalanceResult>}
 */
async function fetchBuzzBalance(baseUrl, apiKey) {
  const origin = getOrigin(baseUrl)

  // BUZZ apiKey 可能不带 sk- 前缀，自动补全
  const normalizedKey = apiKey.startsWith('sk-') ? apiKey : `sk-${apiKey}`

  const result = await httpGetJson(`${origin}/api/usage/token/`, normalizedKey)

  if (!result.success) {
    return { ...result, provider: 'buzz', fetchedAt: new Date().toISOString() }
  }

  const { quota, used, api_key_usable, total_usage } = result.body

  const softLimit = parseFloat(quota?.soft_limit_usd || '0')
  const usedUsd = parseFloat(used?.usd || total_usage?.usd || '0')
  const remaining = Math.max(0, softLimit - usedUsd)
  const isUnlimited = softLimit >= 999999

  return {
    success: true,
    provider: 'buzz',
    status: isUnlimited ? 'unlimited' : (remaining > 0 ? 'ok' : 'expired'),
    total: isUnlimited ? undefined : softLimit,
    used: usedUsd,
    remaining: isUnlimited ? undefined : remaining,
    currency: 'USD',
    unit: '$',
    isAvailable: !!api_key_usable,
    unlimitedQuota: isUnlimited,
    fetchedAt: new Date().toISOString(),
    raw: result.body,
  }
}

/**
 * DeepSeek 余额查询
 * 接口: /user/balance (GET)
 * 返回示例:
 * {
 *   "is_available": true,
 *   "balance_infos": [
 *     { "total_balance": "110.48", "total_balance_currency": "CNY" }
 *   ],
 *   "balance": "110.48",
 *   "currency": "CNY"
 * }
 * @param {string} baseUrl
 * @param {string} apiKey
 * @returns {Promise<TokenBalanceResult>}
 */
async function fetchDeepSeekBalance(baseUrl, apiKey) {
  const origin = getOrigin(baseUrl)
  const result = await httpGetJson(`${origin}/user/balance`, apiKey)

  if (!result.success) {
    return { ...result, provider: 'deepseek', fetchedAt: new Date().toISOString() }
  }

  const body = result.body
  const isAvailable = body.is_available !== false
  let total = 0
  let currency = 'CNY'

  // 优先从 balance_infos 数组读取
  if (Array.isArray(body.balance_infos) && body.balance_infos.length > 0) {
    total = parseFloat(body.balance_infos[0].total_balance || '0')
    currency = body.balance_infos[0].total_balance_currency || 'CNY'
  } else if (body.balance !== undefined) {
    total = parseFloat(body.balance)
    currency = body.currency || 'CNY'
  }

  return {
    success: true,
    provider: 'deepseek',
    status: isAvailable && total > 0 ? 'ok' : (isAvailable ? 'ok' : 'expired'),
    total,
    remaining: total,
    currency,
    unit: currency === 'CNY' ? '¥' : '$',
    isAvailable,
    fetchedAt: new Date().toISOString(),
    raw: result.body,
  }
}

/**
 * 云雾余额查询 — 占位，等待 API 文档确认
 * @param {string} baseUrl
 * @param {string} apiKey
 * @returns {Promise<TokenBalanceResult>}
 */
async function fetchYunwuBalance(baseUrl, apiKey) {
  return {
    success: false,
    provider: 'yunwu',
    error: 'api.balance.notSupported',
    fetchedAt: new Date().toISOString(),
  }
}

module.exports = {
  detectProvider,
  fetchTokenBalance,
  fetchBuzzBalance,
  fetchDeepSeekBalance,
  fetchYunwuBalance,
}