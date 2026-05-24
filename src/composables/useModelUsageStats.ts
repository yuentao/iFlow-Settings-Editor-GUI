import { ref, onUnmounted } from 'vue'

export interface DailyModelStats {
  date: string
  models: Array<{
    modelName: string
    callCount: number
  }>
}

export interface ModelUsageTrendResponse {
  timeRange: {
    start: string
    end: string
  }
  data: DailyModelStats[]
  summary: {
    totalCalls: number
    modelCount: number
    mostUsedModel: string
    peakDate: string
  }
}

interface RawMessage {
  timestamp: string
  message: {
    model: string
  }
}

export function useModelUsageStats() {
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const stats = ref<ModelUsageTrendResponse | null>(null)
  const refreshing = ref(false)

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // Worker 实例，随 composable 创建而初始化
  let worker: Worker | null = null

  function initWorker() {
    if (worker) return
    try {
      worker = new Worker(
        new URL('@/workers/modelStatsWorker.js', import.meta.url),
        { type: 'module' }
      )
    } catch (e) {
      console.error('Worker 初始化失败:', e)
      worker = null
    }
  }

  function processWithWorker(messages: RawMessage[], days: number): Promise<ModelUsageTrendResponse> {
    return new Promise((resolve, reject) => {
      initWorker()
      if (!worker) {
        reject(new Error('Worker 初始化失败'))
        return
      }

      const timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error('Worker 处理超时，数据量可能过大'))
      }, 30000)

      const cleanup = () => {
        clearTimeout(timeoutId)
        if (worker) {
          worker.onmessage = null
          worker.onerror = null
        }
      }

      const handleMessage = (e: MessageEvent) => {
        cleanup()
        if (e.data.type === 'SUCCESS') {
          resolve(e.data.payload)
        } else {
          reject(new Error(e.data.payload?.message || 'Worker 处理失败'))
        }
      }

      const handleError = (e: ErrorEvent) => {
        cleanup()
        reject(new Error(e.message))
      }

      worker.onmessage = handleMessage
      worker.onerror = handleError
      worker.postMessage({ type: 'AGGREGATE', payload: { messages, days } })
    })
  }

  async function fetchStats(options: { days?: number; silent?: boolean; force?: boolean } = {}): Promise<void> {
    if (refreshing.value && !options.force) {
      return
    }
    const days = options.days || 7
    refreshing.value = true
    if (!options.silent) loading.value = true
    error.value = null

    try {
      const result = await window.electronAPI.getAllSessionMessagesForStats(days)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stats data')
      }

      const rawMessages: RawMessage[] = (result as any).messages || result.data || []
      stats.value = await processWithWorker(rawMessages, days)
    } catch (e) {
      if (!options.silent) error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      refreshing.value = false
      if (!options.silent) loading.value = false
    }
  }

  function startAutoRefresh(days: number = 7, intervalMinutes: number = 5) {
    stopAutoRefresh()
    const ms = Math.max(60000, intervalMinutes * 60000)
    refreshTimer = setInterval(() => {
      fetchStats({ days, silent: true })
    }, ms)
  }

  function stopAutoRefresh() {
    if (refreshTimer !== null) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  onUnmounted(() => {
    stopAutoRefresh()
    if (worker) {
      worker.terminate()
      worker = null
    }
  })

  return {
    loading,
    error,
    stats,
    refreshing,
    fetchStats,
    startAutoRefresh,
    stopAutoRefresh,
  }
}