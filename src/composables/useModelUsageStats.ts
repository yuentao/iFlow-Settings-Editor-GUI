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

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  // Worker 实例，随 composable 创建而初始化
  let worker: Worker | null = null
  let pendingResolve: ((value: ModelUsageTrendResponse) => void) | null = null
  let pendingReject: ((reason: Error) => void) | null = null

  function initWorker() {
    if (worker) return
    worker = new Worker(
      new URL('@/workers/modelStatsWorker.js', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'SUCCESS') {
        pendingResolve?.(e.data.payload)
      } else {
        pendingReject?.(new Error(e.data.payload?.message || 'Worker 处理失败'))
      }
      pendingResolve = null
      pendingReject = null
    }

    worker.onerror = (e: ErrorEvent) => {
      pendingReject?.(new Error(e.message))
      pendingResolve = null
      pendingReject = null
    }
  }

  function processWithWorker(messages: RawMessage[], days: number): Promise<ModelUsageTrendResponse> {
    return new Promise((resolve, reject) => {
      initWorker()
      pendingResolve = resolve
      pendingReject = reject
      worker!.postMessage({ type: 'AGGREGATE', payload: { messages, days } })
    })
  }

  async function fetchStats(options: { days?: number } = {}): Promise<void> {
    const days = options.days || 7
    loading.value = true
    error.value = null

    try {
      const result = await window.electronAPI.getAllSessionMessagesForStats(days)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stats data')
      }

      const rawMessages: RawMessage[] = result.messages || []
      stats.value = await processWithWorker(rawMessages, days)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      loading.value = false
    }
  }

  function startAutoRefresh(days: number = 7, intervalMinutes: number = 5) {
    stopAutoRefresh()
    const ms = Math.max(60000, intervalMinutes * 60000)
    refreshTimer = setInterval(() => {
      fetchStats({ days })
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
    fetchStats,
    startAutoRefresh,
    stopAutoRefresh,
  }
}