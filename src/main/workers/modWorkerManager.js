/**
 * iFlow Mod 处理 Worker 管理器
 * 封装 Worker 线程的使用，提供统一的 API
 */

const { Worker } = require('worker_threads')
const path = require('path')
const { app } = require('electron')

// Worker 文件路径（从 src/main/workers/ 到 src/workers/）
const WORKER_PATH = path.join(__dirname, '..', '..', 'workers', 'modProcessingWorker.js')

/**
 * 创建并运行 Worker
 * @param {string} taskType - 任务类型
 * @param {Object} data - 传递给 Worker 的数据
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<Object>} Worker 返回的结果
 */
function runWorker(taskType, data, onProgress = null) {
  return new Promise((resolve, reject) => {
    console.log('[WorkerManager] Creating worker, path:', WORKER_PATH)
    const worker = new Worker(WORKER_PATH, {
      workerData: null,
    })
    console.log('[WorkerManager] Worker created, adding listeners')

    // Worker 启动事件
    worker.once('online', () => {
      console.log('[WorkerManager] Worker is online')
    })

    // 生成唯一 ID 用于追踪
    const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2)

    // 设置超时（默认 5 分钟，大文件需要更长时间）
    const timeout = data.timeout || 300000
    const timeoutId = setTimeout(() => {
      worker.terminate()
      reject(new Error(`Worker task timeout after ${timeout}ms`))
    }, timeout)

    // 标记结果是否已处理（避免重复处理 PROGRESS 之后的 SUCCESS）
    let resultProcessed = false

    // 消息处理 - 统一处理所有消息
    worker.on('message', (message) => {
      console.log('[WorkerManager] Received message:', message.type, message.id === taskId)

      // 处理进度消息
      if (onProgress && message.type === 'PROGRESS' && message.id === taskId) {
        const wp = message.progress
        console.log('[WorkerManager] Progress:', wp)
        // 转换 Worker 进度格式
        const mainProgress = {
          current: wp.progress || 0,
          total: 100,
          modName: wp.phase || '处理中',
        }
        console.log('[WorkerManager] Sending progress:', mainProgress)
        onProgress(mainProgress)
        return
      }

      // 处理结果消息（只处理一次）
      if (!resultProcessed && message.id === taskId) {
        resultProcessed = true
        clearTimeout(timeoutId)
        if (message.type === 'SUCCESS') {
          console.log('[WorkerManager] Task completed successfully')
          resolve(message.result)
        } else if (message.type === 'ERROR') {
          console.log('[WorkerManager] Task error:', message.error)
          reject(new Error(message.error))
        } else {
          reject(new Error(`Unknown worker message type: ${message.type}`))
        }
      }
    })

    // 错误处理
    worker.once('error', (error) => {
      console.log('[WorkerManager] Worker error:', error.message)
      clearTimeout(timeoutId)
      reject(error)
    })

    // 退出处理
    worker.once('exit', (code) => {
      console.log('[WorkerManager] Worker exit with code:', code)
      clearTimeout(timeoutId)
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`))
      }
    })

    // 发送任务
    worker.postMessage({ type: taskType, id: taskId, data })
  })
}

/**
 * 在 Worker 中检测 Mod 冲突
 * @param {string} original - 原始 iflow.js 内容
 * @param {Array<{modId: string, modName: string, content: string}>} modsCode - Mod 代码列表
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} 冲突列表
 */
async function detectConflicts(original, modsCode, onProgress = null) {
  console.log('[WorkerManager] detectConflicts called, original size:', original?.length, 'mods:', modsCode?.length)
  if (!original || !modsCode || modsCode.length === 0) {
    return []
  }

  // 小文件直接使用主线程处理（避免 Worker 开销）
  const isSmallFile = original.length < 1024 * 1024 && modsCode.every(m => m.content.length < 1024 * 1024)
  console.log('[WorkerManager] isSmallFile:', isSmallFile)
  if (isSmallFile) {
    return require('../services/iflowService').detectConflictsInternal(original, modsCode)
  }

  // 大文件使用 Worker 处理
  console.log('[WorkerManager] Calling runWorker for detectConflicts')
  const result = await runWorker(
    'detectConflicts',
    { original, modsCode },
    onProgress
  )
  console.log('[WorkerManager] runWorker completed')
  return result.conflicts
}

/**
 * 在 Worker 中应用 code.js 补丁
 * @param {string} original - 原始内容
 * @param {string} codeJs - Mod 的 code.js 内容
 * @param {string} content - 当前 iflow.js 内容
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 应用后的内容
 */
async function applyCodeJsChanges(original, codeJs, content, onProgress = null) {
  console.log('[WorkerManager] applyCodeJsChanges called, sizes - original:', original?.length, 'codeJs:', codeJs?.length, 'onProgress:', !!onProgress)
  // 小文件直接使用主线程处理
  const isSmallFile = original.length < 1024 * 1024 && codeJs.length < 1024 * 1024
  console.log('[WorkerManager] isSmallFile:', isSmallFile)
  if (isSmallFile) {
    return require('../services/iflowService').applyCodeJsChangesInternal(original, codeJs, content)
  }

  console.log('[WorkerManager] Calling runWorker for applyCodeJsChanges')
  const result = await runWorker(
    'applyCodeJsChanges',
    { original, codeJs, content },
    onProgress
  )
  console.log('[WorkerManager] runWorker completed')
  return result.applied
}

/**
 * 在 Worker 中应用 unified diff 补丁
 * @param {string} content - 当前内容
 * @param {string} diffText - diff 补丁文本
 * @returns {Promise<string>} 应用后的内容
 */
async function applyUnifiedDiff(content, diffText) {
  const result = await runWorker('applyUnifiedDiff', { content, diffText })
  return result.applied
}

/**
 * 在 Worker 中生成 diff 补丁
 * @param {string} original - 原始内容
 * @param {string} code - 修改后的内容
 * @returns {Promise<string>} diff 补丁
 */
async function generateDiff(original, code) {
  const result = await runWorker('generateDiff', { original, code })
  return result.patch
}

module.exports = {
  detectConflicts,
  applyCodeJsChanges,
  applyUnifiedDiff,
  generateDiff,
  runWorker,
}