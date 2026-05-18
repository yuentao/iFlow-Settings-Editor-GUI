import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastNotification from './ToastNotification.vue'
import { useToast } from '@/composables/useToast'

describe('ToastNotification.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置 toast 状态
    const { clearAll } = useToast()
    clearAll()
  })

  afterEach(() => {
    // 清理 Teleport 渲染到 body 的内容
    document.body.querySelectorAll('.toast-container').forEach(el => el.remove())
    document.body.querySelectorAll('.toast').forEach(el => el.remove())
  })

  it('should render toasts from composable', async () => {
    const { show } = useToast()
    show({ message: 'Test toast' })

    mount(ToastNotification, {
      global: {
        mocks: {
          $t: (key) => key,
        },
        attachTo: document.body,
      },
    })

    await vi.dynamicImportSettled?.()
    expect(document.body.querySelector('.toast')).toBeTruthy()
    expect(document.body.querySelector('.toast-message')?.textContent).toBe('Test toast')
  })

  it('should render multiple toasts', async () => {
    const { show } = useToast()
    show({ message: 'First' })
    show({ message: 'Second' })

    mount(ToastNotification, {
      global: {
        mocks: {
          $t: (key) => key,
        },
        attachTo: document.body,
      },
    })

    await vi.dynamicImportSettled?.()
    const messages = document.body.querySelectorAll('.toast-message')
    expect(messages.length).toBe(2)
    expect(messages[0].textContent).toBe('First')
    expect(messages[1].textContent).toBe('Second')
  })

  it('should display title when provided', async () => {
    const { show } = useToast()
    show({ message: 'Message', title: 'Title' })

    mount(ToastNotification, {
      global: {
        mocks: {
          $t: (key) => key,
        },
        attachTo: document.body,
      },
    })

    await vi.dynamicImportSettled?.()
    expect(document.body.querySelector('.toast-title')).toBeTruthy()
    expect(document.body.querySelector('.toast-title')?.textContent).toBe('Title')
  })

  it('should not display title when not provided', async () => {
    const { show } = useToast()
    show({ message: 'No title' })

    mount(ToastNotification, {
      global: {
        mocks: {
          $t: (key) => key,
        },
        attachTo: document.body,
      },
    })

    await vi.dynamicImportSettled?.()
    expect(document.body.querySelector('.toast-title')).toBeNull()
  })

  it('should apply correct CSS class for each type', async () => {
    const { show } = useToast()
    show({ type: 'success', message: 'OK' })
    show({ type: 'error', message: 'Error' })

    mount(ToastNotification, {
      global: {
        mocks: {
          $t: (key) => key,
        },
        attachTo: document.body,
      },
    })

    await vi.dynamicImportSettled?.()
    const toasts = document.body.querySelectorAll('.toast')
    expect(toasts[0].classList.contains('toast-success')).toBe(true)
    expect(toasts[1].classList.contains('toast-error')).toBe(true)
  })

  it('should render empty container when no toasts', () => {
    mount(ToastNotification, {
      global: {
        mocks: {
          $t: (key) => key,
        },
        attachTo: document.body,
      },
    })

    expect(document.body.querySelector('.toast-container')).toBeTruthy()
    expect(document.body.querySelectorAll('.toast').length).toBe(0)
  })
})