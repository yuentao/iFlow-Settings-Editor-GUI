/**
 * UI Store
 * 管理 UI 状态：当前分区、对话框、主题等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // State
  const currentSection = ref('dashboard')
  const systemTheme = ref('Light')

  // Input Dialog
  const inputDialog = ref({
    show: false,
    title: '',
    placeholder: '',
    callback: null,
    isConfirm: false,
    defaultValue: '',
    name: '',
  })

  // Message Dialog
  const messageDialog = ref({
    show: false,
    type: 'info',
    title: '',
    message: '',
    messageParams: {},
  })

  // Confirm Dialog
  const pendingConfirmRequest = ref(null)
  const pendingConfirmResolve = ref(null)

  // Server Panel
  const serverPanel = ref({
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
  const apiEditDialog = ref({
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
  const apiCreateDialog = ref({
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
  const themeClass = computed(() => {
    return systemTheme.value === 'Dark' ? 'dark' : ''
  })

  // Actions
  function showSection(section) {
    currentSection.value = section
  }

  function showInputDialog({ title, placeholder, callback, isConfirm, defaultValue, name }) {
    inputDialog.value = {
      show: true,
      title,
      placeholder,
      callback,
      isConfirm: isConfirm || false,
      defaultValue: defaultValue || '',
      name: name || '',
    }
  }

  function closeInputDialog(result) {
    if (inputDialog.value.callback) {
      inputDialog.value.callback(result)
    }
    inputDialog.value.show = false
    inputDialog.value.isConfirm = false
    inputDialog.value.defaultValue = ''
  }

  function showMessage({ type = 'info', title, message, messageParams }) {
    messageDialog.value = {
      show: true,
      type,
      title,
      message,
      messageParams: messageParams || {},
    }
    return new Promise(resolve => {
      // 消息对话框关闭后调用 resolve
      const checkClose = setInterval(() => {
        if (!messageDialog.value.show) {
          clearInterval(checkClose)
          resolve()
        }
      }, 100)
    })
  }

  function closeMessageDialog() {
    messageDialog.value.show = false
  }

  function openServerPanel(isEditing, data) {
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

  function closeServerPanel() {
    serverPanel.value.show = false
  }

  function openApiEditDialog(profileName, data) {
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

  function closeApiEditDialog() {
    apiEditDialog.value.show = false
  }

  function openApiCreateDialog() {
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

  function closeApiCreateDialog() {
    apiCreateDialog.value.show = false
  }

  function updateSystemTheme(isDark) {
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