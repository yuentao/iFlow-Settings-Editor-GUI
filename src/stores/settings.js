/**
 * 设置 Store
 * 管理全局设置状态
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref({
    language: 'zh-CN',
    uiTheme: 'system',
    acrylicEnabled: true,
    acrylicIntensity: 50,
    autoLaunch: false,
    startMinimized: false,
    bootAnimationShown: true,
    checkpointing: { enabled: true },
    currentApiProfile: 'default',
    apiProfiles: {},
    mcpServers: [],
    autoUpdate: true,
  })
  const isLoading = ref(true)
  const isSaving = ref(false)
  const modified = ref(false)

  // Getters
  const theme = computed(() => settings.value.uiTheme || 'system')
  const language = computed(() => settings.value.language || 'zh-CN')
  const acrylicEnabled = computed(() => settings.value.acrylicEnabled ?? true)
  const acrylicIntensity = computed(() => settings.value.acrylicIntensity ?? 50)
  const currentApiProfile = computed(() => settings.value.currentApiProfile || 'default')
  const autoUpdate = computed(() => settings.value.autoUpdate ?? true)

  // Actions
  async function loadSettings() {
    isLoading.value = true
    try {
      const result = await window.electronAPI.loadSettings()
      if (result.success) {
        settings.value = { ...settings.value, ...result.data }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function saveSettings() {
    isSaving.value = true
    try {
      await window.electronAPI.saveSettings(settings.value)
      modified.value = false
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      isSaving.value = false
    }
  }

  function updateSetting(key, value) {
    settings.value[key] = value
    modified.value = true
  }

  function updateNestedSetting(path, value) {
    const keys = path.split('.')
    let target = settings.value
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {}
      }
      target = target[keys[i]]
    }
    target[keys[keys.length - 1]] = value
    modified.value = true
  }

  // Auto-save with debounce
  let saveTimer = null
  watch(settings, () => {
    if (!isLoading.value) {
      modified.value = true
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(saveSettings, 1000) // 1秒防抖
    }
  }, { deep: true })

  return {
    settings,
    isLoading,
    isSaving,
    modified,
    theme,
    language,
    acrylicEnabled,
    acrylicIntensity,
    currentApiProfile,
    autoUpdate,
    loadSettings,
    saveSettings,
    updateSetting,
    updateNestedSetting,
  }
})