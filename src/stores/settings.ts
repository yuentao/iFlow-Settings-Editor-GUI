/**
 * 设置 Store - TypeScript 版本
 * 管理全局设置状态，包含防抖保存功能
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Settings, UiTheme } from '@/shared/types'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<Settings>({
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
    // CLI 行为控制 - 新字段默认值
    autoAccept: false,
    hideBanner: false,
    disableAutoUpdate: false,
    autoConfigureMaxOldSpaceSize: undefined,
    disableTelemetry: false,
    tokensLimit: 128000,
    compressionTokenThreshold: 0.8,
    skipNextSpeakerCheck: true,
    shellTimeout: 120000,
    approvalMode: 'autoEdit',
    thinkingModeEnabled: 'true',
  })

  const isLoading = ref(true)
  const isSaving = ref(false)
  const modified = ref(false)
  const lastSaved = ref<Date | null>(null)

  // Getters
  const theme = computed<UiTheme>(() => (settings.value.uiTheme as UiTheme) || 'system')
  const language = computed<string>(() => settings.value.language || 'zh-CN')
  const acrylicEnabled = computed<boolean>(() => settings.value.acrylicEnabled ?? true)
  const acrylicIntensity = computed<number>(() => settings.value.acrylicIntensity ?? 50)
  const currentApiProfile = computed<string>(() => settings.value.currentApiProfile || 'default')
  const autoUpdate = computed<boolean>(() => settings.value.autoUpdate ?? true)

  // Actions
  async function loadSettings(): Promise<void> {
    isLoading.value = true
    try {
      const result = await window.electronAPI.loadSettings()
      if (result.success && result.data) {
        settings.value = { ...settings.value, ...result.data }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function saveSettings(): Promise<void> {
    isSaving.value = true
    try {
      const result = await window.electronAPI.saveSettings(settings.value)
      if (result.success) {
        modified.value = false
        lastSaved.value = new Date()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      isSaving.value = false
    }
  }

  // 防抖保存函数，延迟 1 秒
  const debouncedSave = useDebounceFn(saveSettings, 1000)

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    settings.value[key] = value
    modified.value = true
    if (!isLoading.value) {
      debouncedSave()
    }
  }

  function updateNestedSetting(path: string, value: unknown): void {
    const keys = path.split('.')
    let target: Record<string, unknown> = settings.value as unknown as Record<string, unknown>
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {}
      }
      target = target[keys[i]] as Record<string, unknown>
    }
    target[keys[keys.length - 1]] = value
    modified.value = true
    if (!isLoading.value) {
      debouncedSave()
    }
  }

  // 监听 settings 变化，自动防抖保存
  watch(settings, () => {
    if (!isLoading.value) {
      modified.value = true
      debouncedSave()
    }
  }, { deep: true })

  return {
    settings,
    isLoading,
    isSaving,
    modified,
    lastSaved,
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