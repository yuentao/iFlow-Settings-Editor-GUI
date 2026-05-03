/**
 * MCP 服务器配置快速解析器
 *
 * 支持的输入格式：
 * 1. JSON 服务器配置（单服务器、带名称包裹、mcpServers 完整格式）
 * 2. 命令行（npx / uvx / node / python 等）
 * 3. URL（SSE / Streamable-HTTP 地址）
 */

/**
 * @typedef {Object} ParsedServer
 * @property {string} name - 服务器名称
 * @property {Record<string, any>} config - 服务器配置
 */

/**
 * @typedef {Object} ParseResult
 * @property {boolean} success - 是否解析成功
 * @property {ParsedServer[]} servers - 解析出的服务器列表
 * @property {string} [error] - 错误信息
 */

/**
 * 主解析入口：自动识别输入格式并解析
 * @param {string} input - 用户粘贴的文本
 * @returns {ParseResult}
 */
export function parseMcpInput(input) {
  const trimmed = (input || '').trim()
  if (!trimmed) {
    return { success: false, servers: [], error: 'INPUT_EMPTY' }
  }

  // 1. 尝试 JSON 解析
  // 检测是否看起来像 JSON（以 { 或 [ 开头）
  const looksLikeJson = /^[{[]/.test(trimmed)
  try {
    const json = JSON.parse(trimmed)
    return parseJsonConfig(json)
  } catch {
    if (looksLikeJson) {
      return { success: false, servers: [], error: 'JSON_INVALID' }
    }
    // 非 JSON，继续尝试其他格式
  }

  // 2. 尝试命令行解析（npx / uvx / node / python 等）
  if (/^(npx|uvx|node|python3?|bun|deno)\s/.test(trimmed)) {
    return parseCommandLine(trimmed)
  }

  // 3. 尝试 URL 解析
  if (/^https?:\/\//.test(trimmed)) {
    return parseUrl(trimmed)
  }

  return { success: false, servers: [], error: 'UNRECOGNIZED_FORMAT' }
}

/**
 * 解析 JSON 配置
 * @param {any} json
 * @returns {ParseResult}
 */
export function parseJsonConfig(json) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return { success: false, servers: [], error: 'NOT_MCP_CONFIG' }
  }

  // 情况 A: { "mcpServers": { "name": { ... } } }
  if (json.mcpServers && typeof json.mcpServers === 'object' && !Array.isArray(json.mcpServers)) {
    const servers = []
    for (const [name, config] of Object.entries(json.mcpServers)) {
      if (config && typeof config === 'object' && !Array.isArray(config)) {
        servers.push({ name, config: { ...config } })
      }
    }
    if (servers.length === 0) {
      return { success: false, servers: [], error: 'NOT_MCP_CONFIG' }
    }
    return { success: true, servers }
  }

  // 情况 B: { "server-name": { command: "...", ... } } — 外层 key 的 value 是对象且包含 command 或 url
  const entries = Object.entries(json)
  const isNameWrapped = entries.length > 0 && entries.every(([, val]) =>
    val !== null && typeof val === 'object' && !Array.isArray(val) &&
    (val.command || val.url)
  )
  if (isNameWrapped) {
    const servers = entries.map(([name, config]) => ({
      name,
      config: { ...config },
    }))
    return { success: true, servers }
  }

  // 情况 C: 直接是服务器配置对象 { command: "...", args: [...] }
  if (json.command || json.url) {
    return { success: true, servers: [{ name: '', config: { ...json } }] }
  }

  return { success: false, servers: [], error: 'NOT_MCP_CONFIG' }
}

/**
 * 解析命令行
 * @param {string} cmd
 * @returns {ParseResult}
 */
export function parseCommandLine(cmd) {
  const parts = splitCommandLine(cmd)
  if (parts.length === 0) {
    return { success: false, servers: [], error: 'CMD_INVALID' }
  }

  const command = parts[0]
  const args = parts.slice(1)

  // 从包名推导服务器名称
  // npx -y @scope/pkg → scope-pkg
  // npx -y pkg → pkg
  let packageName = ''
  const yIndex = args.indexOf('-y')
  if (yIndex !== -1 && args[yIndex + 1]) {
    packageName = args[yIndex + 1]
  } else {
    // 取第一个非 flag 参数
    packageName = args.find(a => !a.startsWith('-')) || ''
  }

  if (!packageName) {
    packageName = command
  }

  const name = sanitizeName(packageName)

  return {
    success: true,
    servers: [{
      name,
      config: { command, args },
    }],
  }
}

/**
 * 解析 URL
 * @param {string} url
 * @returns {ParseResult}
 */
export function parseUrl(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { success: false, servers: [], error: 'URL_INVALID' }
  }

  // 从 hostname 推导名称
  const name = sanitizeName(parsed.hostname)

  // 判断传输类型：URL 中包含 /mcp 路径倾向 streamable-http
  const transportType = parsed.pathname.includes('/mcp') ? 'streamable-http' : 'sse'

  return {
    success: true,
    servers: [{
      name,
      config: { url, transportType },
    }],
  }
}

/**
 * 简易命令行分割（处理双引号和单引号）
 * @param {string} input
 * @returns {string[]}
 */
export function splitCommandLine(input) {
  const result = []
  let current = ''
  let inQuote = null

  for (const ch of input) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (/\s/.test(ch)) {
      if (current) {
        result.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current) result.push(current)
  return result
}

/**
 * 将字符串转为合法的服务器名称
 * @param {string} input
 * @returns {string}
 */
export function sanitizeName(input) {
  return input
    .replace(/^@/, '')
    .replace(/[/.]/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    || 'unnamed-server'
}

/**
 * 为重复名称生成唯一后缀
 * @param {string} name - 原始名称
 * @param {string[]} existingNames - 已有名称列表
 * @returns {string} - 唯一名称
 */
export function ensureUniqueName(name, existingNames) {
  if (!existingNames.includes(name)) return name
  let i = 2
  while (existingNames.includes(`${name}-${i}`)) i++
  return `${name}-${i}`
}
