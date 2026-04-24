/**
 * UI Store - TypeScript 版本
 * 管理 UI 状态：当前分区、对话框、主题等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ─── Dialog Types ────────────────────────────────────────

export interface InputDialogOptions {
  title: string
  placeholder?: string
  callback?: (result: string) => void
  isConfirm?: boolean
  defaultValue?: string
  name?: string
}

export interface MessageDialogOptions {
  type?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  message: string
  messageParams?: Record<string, string>
}

export interface ServerPanelData {
  name: string
  description: string
  command: string
  cwd: string
  args: string
  env: string
}

export interface ApiProfileFormData {
  name: string
  selectedAuthType: string
  apiKey: string
  baseUrl: string
  modelName: string
}

// ─── Store ────────────────────────────────────────────────

export const useUiStore = defineStore('ui', () => {
  // State
  const currentSection = ref<string>('dashboard')
  const systemTheme = ref<'Light' | 'Dark'>('Light')

  // Input Dialog
  const inputDialog = ref<{
    show: boolean
    title: string
    placeholder: string
    callback: ((result: string) => void) | null
    isConfirm: boolean
    defaultValue: string
    name: string
  }>({
    show: false,
    title: '',
    placeholder: '',
    callback: null,
    isConfirm: false,
    defaultValue: '',
    name: '',
  })

  // Message Dialog
  const messageDialog = ref<{
    show: boolean
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    message: string
    messageParams: Record<string, string>
  }>({
    show: false,
    type: 'info',
    title: '',
    message: '',
    messageParams: {},
  })

  // Confirm Dialog
  const pendingConfirmRequest = ref<unknown>(null)
  const pendingConfirmResolve = ref<((value: boolean) => void) | null>(null)

  // Server Panel
  const serverPanel = ref<{
    show: boolean
    isEditing: boolean
    data: ServerPanelData
  }>({
    show: false,
    isEditing: false,
    data: {
      name: '',
      description: '',
      command: 'npx',
      cwd: '.',
      args: '',
      env: '',
    },
  })

  // API Edit Dialog
  const apiEditDialog = ref<{
    show: boolean
    profileName: string
    data: ApiProfileFormData
  }>({
    show: false,
    profileName: '',
    data: {
      name: '',
      selectedAuthType: 'openai-compatible',
      apiKey: '',
      baseUrl: '',
      modelName: '',
    },
  })

  // API Create Dialog
  const apiCreateDialog = ref<{
    show: boolean
    data: ApiProfileFormData
  }>({
    show: false,
    data: {
      name: '',
      selectedAuthType: 'openai-compatible',
      apiKey: '',
      baseUrl: '',
      modelName: '',
    },
  })

  // Getters
  const themeClass = computed<string>(() => {
    return systemTheme.value === 'Dark' ? 'dark' : ''
  })

  // Actions
  function showSection(section: string): void {
    currentSection.value = section
  }

  function showInputDialog(options: InputDialogOptions): void {
    inputDialog.value = {
      show: true,
      title: options.title,
      placeholder: options.placeholder || '',
      callback: options.callback || null,
      isConfirm: options.isConfirm || false,
      defaultValue: options.defaultValue || '',
      name: options.name || '',
    }
  }

  function closeInputDialog(result: string): void {
    if (inputDialog.value.callback) {
      inputDialog.value.callback(result)
    }
    inputDialog.value.show = false
    inputDialog.value.isConfirm = false
    inputDialog.value.defaultValue = ''
  }

  function showMessage(options: MessageDialogOptions): Promise<void> {
    messageDialog.value = {
      show: true,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message,
      messageParams: options.messageParams || {},
    }
    return new Promise<void>(resolve => {
      // 消息对话框关闭后调用 resolve
      const checkClose = setInterval(() => {
        if (!messageDialog.value.show) {
          clearInterval(checkClose)
          resolve()
        }
      }, 100)
    })
  }

  function closeMessageDialog(): void {
    messageDialog.value.show = false
  }

  function openServerPanel(isEditing: boolean, data?: ServerPanelData): void {
    serverPanel.value = {
      show: true,
      isEditing,
      data: data || {
        name: '',
        description: '',
        command: 'npx',
        cwd: '.',
        args: '',
        env: '',
      },
    }
  }

  function closeServerPanel(): void {
    serverPanel.value.show = false
  }

  function openApiEditDialog(profileName: string, data?: Partial<ApiProfileFormData>): void {
    apiEditDialog.value = {
      show: true,
      profileName,
      data: {
        name: profileName,
        selectedAuthType: data?.selectedAuthType || 'openai-compatible',
        apiKey: data?.apiKey || '',
        baseUrl: data?.baseUrl || '',
        modelName: data?.modelName || '',
      },
    }
  }

  function closeApiEditDialog(): void {
    apiEditDialog.value.show = false
  }

  function openApiCreateDialog(): void {
    apiCreateDialog.value = {
      show: true,
      data: {
        name: '',
        selectedAuthType: 'openai-compatible',
        apiKey: '',
        baseUrl: '',
        modelName: '',
      },
    }
  }

  function closeApiCreateDialog(): void {
    apiCreateDialog.value.show = false
  }

  function updateSystemTheme(isDark: boolean): void {
    systemTheme.value = isDark ? 'Dark' : 'Light'
  }

  return {
    // State
    currentSection,
    systemTheme,
    inputDialog,
    messageDialog,
    pendingConfirmRequest,
    pendingConfirmResolve,
    serverPanel,
    apiEditDialog,
    apiCreateDialog,
    // Getters
    themeClass,
    // Actions
    showSection,
    showInputDialog,
    closeInputDialog,
    showMessage,
    closeMessageDialog,
    openServerPanel,
    closeServerPanel,
    openApiEditDialog,
    closeApiEditDialog,
    openApiCreateDialog,
    closeApiCreateDialog,
    updateSystemTheme,
  }
})