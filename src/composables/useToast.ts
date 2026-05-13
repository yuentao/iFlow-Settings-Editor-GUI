/**
 * 全局 Toast 通知 Composable
 * 提供轻量级的消息提示，自动消失，不打断用户操作
 */
import { ref } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: number
  type: ToastType
  title?: string
  message: string
  duration: number
}

const toasts = ref<ToastItem[]>([])
let nextId = 0

// 存储 toast 的定时器，用于暂停/恢复
const timers = new Map<number, { remaining: number; startedAt: number; handle: ReturnType<typeof setTimeout> }>()

function clearTimer(id: number) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer.handle)
    timers.delete(id)
  }
}

function startTimer(id: number, duration: number) {
  const handle = setTimeout(() => {
    removeToast(id)
  }, duration)
  timers.set(id, { remaining: duration, startedAt: Date.now(), handle })
}

export function useToast() {
  /**
   * 显示 Toast 通知
   * @param options 配置项
   * @param options.type 类型：info | success | warning | error
   * @param options.message 消息内容
   * @param options.title 可选标题
   * @param options.duration 自动关闭时间（毫秒），默认 3000，error 默认 5000
   * @returns toast id，可用于手动关闭
   */
  function show(options: {
    type?: ToastType
    message: string
    title?: string
    duration?: number
  }): number {
    const type = options.type || 'info'
    const id = nextId++
    const duration = options.duration ?? (type === 'error' ? 5000 : 3000)

    const toast: ToastItem = { id, type, title: options.title, message, duration }

    // 最多同时显示 5 条
    if (toasts.value.length >= 5) {
      const oldest = toasts.value[0]
      clearTimer(oldest.id)
      toasts.value.shift()
    }

    toasts.value.push(toast)
    startTimer(id, duration)
    return id
  }

  function removeToast(id: number) {
    clearTimer(id)
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  function pauseTimer(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer.handle)
      const elapsed = Date.now() - timer.startedAt
      timer.remaining = Math.max(0, timer.remaining - elapsed)
    }
  }

  function resumeTimer(id: number) {
    const timer = timers.get(id)
    if (timer && timer.remaining > 0) {
      timer.startedAt = Date.now()
      timer.handle = setTimeout(() => {
        removeToast(id)
      }, timer.remaining)
    }
  }

  function clearAll() {
    for (const timer of timers.values()) {
      clearTimeout(timer.handle)
    }
    timers.clear()
    toasts.value = []
  }

  // 便捷方法
  function info(message: string, title?: string) {
    return show({ type: 'info', message, title })
  }

  function success(message: string, title?: string) {
    return show({ type: 'success', message, title })
  }

  function warning(message: string, title?: string) {
    return show({ type: 'warning', message, title })
  }

  function error(message: string, title?: string) {
    return show({ type: 'error', message, title })
  }

  return {
    toasts,
    show,
    removeToast,
    pauseTimer,
    resumeTimer,
    clearAll,
    info,
    success,
    warning,
    error,
  }
}
