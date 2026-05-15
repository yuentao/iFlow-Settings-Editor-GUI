/**
 * 项目会话数据服务
 * 负责读取 ~/.iflow/projects 目录下的项目会话数据
 */

const path = require('path')
const fs = require('fs')

// 延迟计算路径
let _PROJECTS_DIR = null
function getProjectsDir() {
  if (!_PROJECTS_DIR) {
    const { app } = require('electron')
    _PROJECTS_DIR = path.join(app.getPath('home'), '.iflow', 'projects')
  }
  return _PROJECTS_DIR
}

/**
 * 安全读取 JSONL 文件，逐行解析
 * @param {string} filePath - JSONL 文件路径
 * @returns {Array} 解析后的消息数组
 */
function parseJsonlFile(filePath) {
  const messages = []
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        messages.push(JSON.parse(trimmed))
      } catch (_) {
        // 跳过无法解析的行
      }
    }
  } catch (error) {
    console.error(`Failed to read JSONL file: ${filePath}`, error.message)
  }
  return messages
}

/**
 * 从消息中提取项目真实路径
 * @param {Array} messages - 消息数组
 * @returns {string} 项目路径
 */
function extractProjectPath(messages) {
  for (const msg of messages) {
    if (msg.cwd) return msg.cwd
  }
  return ''
}

/**
 * 从 cwd 路径提取项目名称
 * @param {string} cwd - 项目路径
 * @returns {string} 项目名称
 */
function extractProjectName(cwd) {
  if (!cwd) return ''
  return path.basename(cwd)
}

/**
 * 获取项目列表
 * @returns {Promise<Array>} 项目信息数组
 */
async function listProjects() {
  const projectsDir = getProjectsDir()
  if (!fs.existsSync(projectsDir)) {
    return []
  }

  const projects = []
  const entries = fs.readdirSync(projectsDir)

  for (const entry of entries) {
    const projectPath = path.join(projectsDir, entry)
    try {
      const stat = fs.statSync(projectPath)
      if (!stat.isDirectory()) continue

      // 读取该目录下所有 .jsonl 文件
      const jsonlFiles = fs.readdirSync(projectPath)
        .filter(f => f.endsWith('.jsonl'))

      if (jsonlFiles.length === 0) continue

      let totalMessages = 0
      let lastActive = null
      let firstActive = null
      let projectCwd = ''

      for (const file of jsonlFiles) {
        const filePath = path.join(projectPath, file)
        const messages = parseJsonlFile(filePath)
        totalMessages += messages.length

        if (!projectCwd && messages.length > 0) {
          projectCwd = extractProjectPath(messages)
        }

        for (const msg of messages) {
          if (msg.timestamp) {
            const ts = new Date(msg.timestamp)
            if (!lastActive || ts > lastActive) lastActive = ts
            if (!firstActive || ts < firstActive) firstActive = ts
          }
        }
      }

      projects.push({
        id: entry,
        name: extractProjectName(projectCwd) || entry,
        path: projectCwd || '',
        sessionCount: jsonlFiles.length,
        messageCount: totalMessages,
        lastActive: lastActive ? lastActive.toISOString() : null,
        firstActive: firstActive ? firstActive.toISOString() : null,
      })
    } catch (error) {
      console.error(`Failed to read project: ${entry}`, error.message)
    }
  }

  // 按最后活跃时间降序排序
  projects.sort((a, b) => {
    if (!a.lastActive) return 1
    if (!b.lastActive) return -1
    return new Date(b.lastActive) - new Date(a.lastActive)
  })

  return projects
}

/**
 * 获取项目下的会话列表
 * @param {string} projectId - 项目目录名
 * @param {Object} options - 分页和排序选项
 * @returns {Promise<Object>} 分页结果
 */
async function getProjectSessions(projectId, options = {}) {
  const projectsDir = getProjectsDir()
  const projectPath = path.join(projectsDir, projectId)

  // 防止路径遍历
  if (!projectPath.startsWith(projectsDir + path.sep) && projectPath !== projectsDir) {
    return { data: [], total: 0, hasMore: false }
  }

  if (!fs.existsSync(projectPath)) {
    return { data: [], total: 0, hasMore: false }
  }

  const jsonlFiles = fs.readdirSync(projectPath)
    .filter(f => f.endsWith('.jsonl'))

  const sessions = []

  for (const file of jsonlFiles) {
    const filePath = path.join(projectPath, file)
    const messages = parseJsonlFile(filePath)

    let userCount = 0
    let assistantCount = 0
    let createdAt = null
    let lastMessageAt = null
    let gitBranch = ''
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let toolCallCount = 0
    let toolCallSuccess = 0
    let firstUserMessage = ''

    for (const msg of messages) {
      if (msg.type === 'user') userCount++
      else if (msg.type === 'assistant') assistantCount++

      // 提取第一条用户消息的文本
      if (!firstUserMessage && msg.type === 'user') {
        firstUserMessage = extractTextContent(msg.message?.content)
      }

      if (msg.message?.usage) {
        totalInputTokens += msg.message.usage.input_tokens || 0
        totalOutputTokens += msg.message.usage.output_tokens || 0
      }

      if (msg.toolUseResult) {
        toolCallCount++
        if (msg.toolUseResult.status === 'success') toolCallSuccess++
      }

      if (msg.gitBranch && !gitBranch) gitBranch = msg.gitBranch

      if (msg.timestamp) {
        const ts = new Date(msg.timestamp)
        if (!createdAt || ts < createdAt) createdAt = ts
        if (!lastMessageAt || ts > lastMessageAt) lastMessageAt = ts
      }
    }

    // 从文件名提取 sessionId（去掉 .jsonl 后缀）
    const sessionId = file.replace(/\.jsonl$/, '')

    sessions.push({
      id: sessionId,
      fileName: file,
      messageCount: messages.length,
      userMessageCount: userCount,
      assistantMessageCount: assistantCount,
      createdAt: createdAt ? createdAt.toISOString() : null,
      lastMessageAt: lastMessageAt ? lastMessageAt.toISOString() : null,
      gitBranch,
      firstUserMessage,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      toolCallCount,
      toolCallSuccess,
    })
  }

  // 排序
  const sortBy = options.sortBy || 'lastActive'
  const sortOrder = options.sortOrder || 'desc'

  sessions.sort((a, b) => {
    let valA, valB
    if (sortBy === 'lastActive') {
      valA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      valB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    } else if (sortBy === 'createdAt') {
      valA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      valB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    } else if (sortBy === 'messageCount') {
      valA = a.messageCount
      valB = b.messageCount
    } else {
      valA = 0
      valB = 0
    }
    return sortOrder === 'desc' ? valB - valA : valA - valB
  })

  // 分页
  const offset = options.offset || 0
  const limit = options.limit || 50
  const paginated = sessions.slice(offset, offset + limit)

  return {
    data: paginated,
    total: sessions.length,
    hasMore: offset + limit < sessions.length,
  }
}

/**
 * 获取会话消息
 * @param {string} projectId - 项目目录名
 * @param {string} sessionId - 会话 ID（文件名去掉 .jsonl）
 * @param {Object} options - 分页和筛选选项
 * @returns {Promise<Object>} 分页结果
 */
async function getSessionMessages(projectId, sessionId, options = {}) {
  const projectsDir = getProjectsDir()
  const projectPath = path.join(projectsDir, projectId)
  const filePath = path.join(projectPath, sessionId + '.jsonl')

  // 防止路径遍历
  if (!projectPath.startsWith(projectsDir + path.sep) && projectPath !== projectsDir) {
    return { data: [], total: 0, hasMore: false }
  }

  if (!fs.existsSync(filePath)) {
    return { data: [], total: 0, hasMore: false }
  }

  let messages = parseJsonlFile(filePath)

  // 过滤侧链消息（默认不显示内部侧链）
  messages = messages.filter(m => !m.isSidechain || m.userType === 'external')

  // 按类型筛选
  const filterType = options.filterType || 'all'
  if (filterType !== 'all') {
    messages = messages.filter(m => m.type === filterType)
  }

  // 映射为前端需要的格式
  const mapped = messages.map(m => ({
    uuid: m.uuid || '',
    parentUuid: m.parentUuid || null,
    sessionId: m.sessionId || '',
    timestamp: m.timestamp || '',
    type: m.type || 'user',
    isSidechain: !!m.isSidechain,
    userType: m.userType || '',
    role: m.message?.role || '',
    content: extractTextContent(m.message?.content),
    rawContent: m.message?.content || null,
    messageId: m.message?.id || '',
    messageType: m.message?.type || '',
    model: m.message?.model || '',
    stopReason: m.message?.stop_reason || null,
    stopSequence: m.message?.stop_sequence || null,
    usage: m.message?.usage || null,
    toolUseResult: m.toolUseResult || null,
    cwd: m.cwd || '',
    gitBranch: m.gitBranch || '',
  }))

  // 分页
  const offset = options.offset || 0
  const limit = options.limit || 100
  const paginated = mapped.slice(offset, offset + limit)

  return {
    data: paginated,
    total: mapped.length,
    hasMore: offset + limit < mapped.length,
  }
}

/**
 * 从消息内容中提取纯文本
 * @param {*} content - 消息内容（字符串或数组）
 * @returns {string} 纯文本
 */
function extractTextContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const textParts = []
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        textParts.push(item.text)
      }
    }
    return textParts.join('\n')
  }
  return ''
}

/**
 * 删除会话文件
 * @param {string} projectId - 项目目录名
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<boolean>}
 */
async function deleteSession(projectId, sessionId) {
  const projectsDir = getProjectsDir()
  const projectPath = path.join(projectsDir, projectId)
  const filePath = path.join(projectPath, sessionId + '.jsonl')

  if (!projectPath.startsWith(projectsDir + path.sep) && projectPath !== projectsDir) {
    return false
  }

  if (!fs.existsSync(filePath)) {
    return false
  }

  fs.unlinkSync(filePath)
  return true
}

/**
 * 删除会话中的指定消息
 * @param {string} projectId - 项目目录名
 * @param {string} sessionId - 会话 ID
 * @param {string[]} messageUuids - 要删除的消息 UUID 数组
 * @returns {Promise<boolean>}
 */
async function deleteMessages(projectId, sessionId, messageUuids) {
  const projectsDir = getProjectsDir()
  const projectPath = path.join(projectsDir, projectId)
  const filePath = path.join(projectPath, sessionId + '.jsonl')

  if (!projectPath.startsWith(projectsDir + path.sep) && projectPath !== projectsDir) {
    return false
  }

  if (!fs.existsSync(filePath)) {
    return false
  }

  const uuidSet = new Set(messageUuids)
  const messages = parseJsonlFile(filePath)
  const remaining = messages.filter(m => !uuidSet.has(m.uuid))

  // 使用临时文件 + 原子替换保证写入原子性
  const tempPath = filePath + '.tmp.' + Date.now()
  const lines = remaining.map(m => JSON.stringify(m)).join('\n') + '\n'
  fs.writeFileSync(tempPath, lines, 'utf-8')

  // 验证临时文件完整性
  try {
    const tempContent = fs.readFileSync(tempPath, 'utf-8')
    const parsedLines = tempContent.split('\n').filter(l => l.trim())
    if (parsedLines.length !== remaining.length) {
      fs.unlinkSync(tempPath)
      throw new Error('写入验证失败：行数不匹配')
    }
  } catch (verifyError) {
    // 清理临时文件后重新抛出
    try { fs.unlinkSync(tempPath) } catch (_) {}
    throw verifyError
  }

  // 原子替换
  fs.renameSync(tempPath, filePath)
  return true
}

/**
 * 导出会话
 * @param {string} projectId - 项目目录名
 * @param {string} sessionId - 会话 ID
 * @param {string} format - 导出格式 ('markdown' | 'json')
 * @returns {Promise<string>} 导出的内容
 */
async function exportSession(projectId, sessionId, format) {
  const projectsDir = getProjectsDir()
  const projectPath = path.join(projectsDir, projectId)
  const filePath = path.join(projectPath, sessionId + '.jsonl')

  if (!projectPath.startsWith(projectsDir + path.sep) && projectPath !== projectsDir) {
    throw new Error('Invalid project path')
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Session file not found')
  }

  const messages = parseJsonlFile(filePath)

  if (format === 'json') {
    return JSON.stringify(messages, null, 2)
  }

  // Markdown 格式
  let md = `# 会话导出\n\n`
  md += `- 会话 ID: ${sessionId}\n`
  md += `- 项目: ${extractProjectPath(messages) || projectId}\n`
  if (messages.length > 0 && messages[0].gitBranch) {
    md += `- Git 分支: ${messages[0].gitBranch}\n`
  }
  md += `- 消息数: ${messages.length}\n\n---\n\n`

  for (const msg of messages) {
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN') : ''
    const role = msg.type === 'user' ? '**用户**' : '**助手**'
    const text = extractTextContent(msg.message?.content)

    md += `### ${role} - ${time}\n\n`
    if (text) {
      md += `${text}\n\n`
    }
    // 工具调用
    if (Array.isArray(msg.message?.content)) {
      for (const item of msg.message.content) {
        if (item.type === 'tool_use') {
          md += `> 🔧 工具: \`${item.name}\`\n> \n> \`\`\`json\n> ${JSON.stringify(item.input, null, 2).split('\n').join('\n> ')}\n> \`\`\`\n\n`
        }
        if (item.type === 'tool_result' && item.resultDisplay) {
          md += `> ✅ 结果:\n> \`\`\`\n> ${item.resultDisplay.split('\n').join('\n> ')}\n> \`\`\`\n\n`
        }
      }
    }
    md += '---\n\n'
  }

  return md
}

/**
 * 搜索会话
 * @param {string} query - 搜索关键词
 * @param {Object} options - 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
async function searchSessions(query, options = {}) {
  const projectsDir = getProjectsDir()
  if (!fs.existsSync(projectsDir)) return []

  const results = []
  const lowerQuery = query.toLowerCase()
  const projectDirs = fs.readdirSync(projectsDir)

  for (const dir of projectDirs) {
    if (options.projectId && dir !== options.projectId) continue

    const projectPath = path.join(projectsDir, dir)
    if (!fs.statSync(projectPath).isDirectory()) continue

    const jsonlFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'))

    for (const file of jsonlFiles) {
      const filePath = path.join(projectPath, file)
      const messages = parseJsonlFile(filePath)
      const sessionId = file.replace(/\.jsonl$/, '')

      let projectCwd = extractProjectPath(messages)

      // 日期过滤
      for (const msg of messages) {
        if (options.dateFrom && msg.timestamp && new Date(msg.timestamp) < new Date(options.dateFrom)) continue
        if (options.dateTo && msg.timestamp && new Date(msg.timestamp) > new Date(options.dateTo)) continue

        const text = extractTextContent(msg.message?.content)
        if (text.toLowerCase().includes(lowerQuery)) {
          results.push({
            project: {
              id: dir,
              name: extractProjectName(projectCwd) || dir,
              path: projectCwd || '',
            },
            session: {
              id: sessionId,
              fileName: file,
              createdAt: messages[0]?.timestamp || null,
              lastMessageAt: messages[messages.length - 1]?.timestamp || null,
              messageCount: messages.length,
            },
            matchedMessage: {
              uuid: msg.uuid,
              type: msg.type,
              content: text.slice(0, 200),
              timestamp: msg.timestamp,
            },
          })

          if (results.length >= (options.limit || 50)) {
            return results
          }
        }
      }
    }
  }

  return results
}

/**
 * 获取会话统计
 * @param {string} projectId
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
async function getSessionStats(projectId, sessionId) {
  const projectsDir = getProjectsDir()
  const projectPath = path.join(projectsDir, projectId)
  const filePath = path.join(projectPath, sessionId + '.jsonl')

  if (!projectPath.startsWith(projectsDir + path.sep) && projectPath !== projectsDir) {
    return null
  }

  if (!fs.existsSync(filePath)) {
    return null
  }

  const messages = parseJsonlFile(filePath)

  let userMessages = 0
  let assistantMessages = 0
  let toolCalls = 0
  let toolCallSuccess = 0
  let toolCallFailed = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const msg of messages) {
    if (msg.type === 'user') userMessages++
    else if (msg.type === 'assistant') assistantMessages++

    if (msg.toolUseResult) {
      toolCalls++
      if (msg.toolUseResult.status === 'success') toolCallSuccess++
      else toolCallFailed++
    }

    if (msg.message?.usage) {
      totalInputTokens += msg.message.usage.input_tokens || 0
      totalOutputTokens += msg.message.usage.output_tokens || 0
    }
  }

  return {
    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    toolCalls,
    toolCallSuccess,
    toolCallFailed,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
  }
}

/**
 * 删除整个项目（包括其下所有会话）
 * @param {string} projectId - 项目目录名
 * @returns {Promise<boolean>}
 */
async function deleteProject(projectId) {
  const projectsDir = getProjectsDir()
  const projectPath = path.join(projectsDir, projectId)

  // 防止路径遍历
  if (!projectPath.startsWith(projectsDir + path.sep) && projectPath !== projectsDir) {
    return false
  }

  if (!fs.existsSync(projectPath)) {
    return false
  }

  const stat = fs.statSync(projectPath)
  if (!stat.isDirectory()) {
    return false
  }

  fs.rmSync(projectPath, { recursive: true, force: true })
  return true
}

/**
 * 获取所有会话中用于模型统计的消息数据（异步，不阻塞主进程）
 * 只返回必要字段，减少数据传输量
 * @param {number} days - 查询最近几天的数据，默认 7
 * @returns {Promise<Array>} 精简后的消息数组
 */
async function getAllSessionMessagesForStats(days = 7) {
  const projectsDir = getProjectsDir()
  try {
    await fs.promises.access(projectsDir)
  } catch {
    return []
  }

  const messages = []
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  let projectDirs
  try {
    projectDirs = await fs.promises.readdir(projectsDir)
  } catch {
    return []
  }

  for (const dir of projectDirs) {
    const projectPath = path.join(projectsDir, dir)
    try {
      const stat = await fs.promises.stat(projectPath)
      if (!stat.isDirectory()) continue

      const files = await fs.promises.readdir(projectPath)
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))

      for (const file of jsonlFiles) {
        const filePath = path.join(projectPath, file)
        const content = await fs.promises.readFile(filePath, 'utf-8')
        const lines = content.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const msg = JSON.parse(trimmed)
            if (!msg.timestamp) continue
            const msgDate = new Date(msg.timestamp)
            if (msgDate >= cutoffDate && msg.message?.model) {
              messages.push({
                timestamp: msg.timestamp,
                message: {
                  model: msg.message.model,
                  usage: msg.message.usage ? {
                    input_tokens: msg.message.usage.input_tokens || 0,
                    output_tokens: msg.message.usage.output_tokens || 0,
                  } : null,
                },
              })
            }
          } catch (_) {
            // 跳过无法解析的行
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read project for stats: ${dir}`, error.message)
    }
  }

  return messages
}

module.exports = {
  listProjects,
  getProjectSessions,
  getSessionMessages,
  deleteSession,
  deleteProject,
  deleteMessages,
  exportSession,
  searchSessions,
  getSessionStats,
  getAllSessionMessagesForStats,
}
