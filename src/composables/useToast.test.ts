import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 重置模块级状态
    const { clearAll } = useToast()
    clearAll()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show a toast and return an id', () => {
    const { show, toasts } = useToast()
    const id = show({ message: 'Hello' })
    expect(id).toBeTypeOf('number')
    expect(toasts.value.length).toBe(1)
    expect(toasts.value[0].message).toBe('Hello')
    expect(toasts.value[0].type).toBe('info')
  })

  it('should set default duration based on type', () => {
    const { show, toasts } = useToast()
    show({ type: 'error', message: 'Error' })
    expect(toasts.value[0].duration).toBe(5000)

    show({ type: 'success', message: 'OK' })
    expect(toasts.value[1].duration).toBe(3000)
  })

  it('should respect custom duration', () => {
    const { show, toasts } = useToast()
    show({ message: 'Custom', duration: 10000 })
    expect(toasts.value[0].duration).toBe(10000)
  })

  it('should auto-remove toast after duration', () => {
    const { show, toasts } = useToast()
    show({ message: 'Auto remove', duration: 3000 })
    expect(toasts.value.length).toBe(1)
    vi.advanceTimersByTime(3000)
    expect(toasts.value.length).toBe(0)
  })

  it('should remove toast by id', () => {
    const { show, removeToast, toasts } = useToast()
    const id = show({ message: 'Remove me' })
    expect(toasts.value.length).toBe(1)
    removeToast(id)
    expect(toasts.value.length).toBe(0)
  })

  it('should limit to 5 toasts max', () => {
    const { show, toasts } = useToast()
    for (let i = 0; i < 6; i++) {
      show({ message: `Toast ${i}` })
    }
    expect(toasts.value.length).toBe(5)
    expect(toasts.value[0].message).toBe('Toast 1')
  })

  it('should clear all toasts', () => {
    const { show, clearAll, toasts } = useToast()
    show({ message: 'A' })
    show({ message: 'B' })
    show({ message: 'C' })
    expect(toasts.value.length).toBe(3)
    clearAll()
    expect(toasts.value.length).toBe(0)
  })

  it('should pause and resume timer', () => {
    const { show, pauseTimer, resumeTimer, toasts } = useToast()
    const id = show({ message: 'Pause test', duration: 3000 })

    // Advance halfway
    vi.advanceTimersByTime(1500)
    pauseTimer(id)

    // Advance past original end time — should NOT be removed
    vi.advanceTimersByTime(2000)
    expect(toasts.value.length).toBe(1)

    // Resume — should now remove after remaining time
    resumeTimer(id)
    vi.advanceTimersByTime(1500)
    expect(toasts.value.length).toBe(0)
  })

  it('should provide convenience methods', () => {
    const { info, success, warning, error, toasts } = useToast()

    info('Info message')
    expect(toasts.value[0].type).toBe('info')

    success('Success message')
    expect(toasts.value[1].type).toBe('success')

    warning('Warning message')
    expect(toasts.value[2].type).toBe('warning')

    error('Error message')
    expect(toasts.value[3].type).toBe('error')
  })

  it('should support optional title', () => {
    const { show, toasts } = useToast()
    show({ message: 'With title', title: 'Title' })
    expect(toasts.value[0].title).toBe('Title')
    expect(toasts.value[0].message).toBe('With title')
  })
})