/**
 * Settings Store 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Mock window.electronAPI
    global.window.electronAPI = {
      loadSettings: vi.fn(),
      saveSettings: vi.fn()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should have default settings on initialization', () => {
    const store = useSettingsStore()
    
    expect(store.settings.language).toBe('zh-CN')
    expect(store.settings.uiTheme).toBe('system')
    expect(store.settings.acrylicEnabled).toBe(true)
    expect(store.settings.acrylicIntensity).toBe(50)
    expect(store.settings.autoLaunch).toBe(false)
  })

  it('should load settings successfully', async () => {
    const mockSettings = {
      language: 'en-US',
      uiTheme: 'dark',
      acrylicEnabled: false
    }
    
    vi.mocked(global.window.electronAPI.loadSettings).mockResolvedValue({
      success: true,
      data: mockSettings
    })
    
    const store = useSettingsStore()
    await store.loadSettings()
    
    expect(store.settings.language).toBe('en-US')
    expect(store.settings.uiTheme).toBe('dark')
    expect(store.settings.acrylicEnabled).toBe(false)
    expect(store.isLoading).toBe(false)
  })

  it('should handle load settings failure', async () => {
    vi.mocked(global.window.electronAPI.loadSettings).mockResolvedValue({
      success: false,
      error: 'Failed to load'
    })
    
    const store = useSettingsStore()
    await store.loadSettings()
    
    expect(store.isLoading).toBe(false)
  })

  it('should save settings successfully', async () => {
    vi.mocked(global.window.electronAPI.saveSettings).mockResolvedValue({
      success: true
    })
    
    const store = useSettingsStore()
    store.settings.language = 'ja-JP'
    await store.saveSettings()
    
    expect(global.window.electronAPI.saveSettings).toHaveBeenCalled()
    expect(store.modified).toBe(false)
    expect(store.lastSaved).toBeInstanceOf(Date)
  })

  it('should update setting and mark as modified', async () => {
    vi.mocked(global.window.electronAPI.saveSettings).mockResolvedValue({
      success: true
    })
    
    const store = useSettingsStore()
    store.updateSetting('language', 'en-US')
    
    expect(store.settings.language).toBe('en-US')
    expect(store.modified).toBe(true)
  })

  it('should update nested setting', () => {
    const store = useSettingsStore()
    store.updateNestedSetting('checkpointing.enabled', false)
    
    expect(store.settings.checkpointing?.enabled).toBe(false)
  })

  it('should compute theme correctly', () => {
    const store = useSettingsStore()
    store.settings.uiTheme = 'dark'
    
    expect(store.theme).toBe('dark')
  })

  it('should compute language correctly', () => {
    const store = useSettingsStore()
    store.settings.language = 'ja-JP'
    
    expect(store.language).toBe('ja-JP')
  })

  it('should compute acrylicEnabled correctly', () => {
    const store = useSettingsStore()
    store.settings.acrylicEnabled = false
    
    expect(store.acrylicEnabled).toBe(false)
  })

  it('should compute currentApiProfile correctly', () => {
    const store = useSettingsStore()
    store.settings.currentApiProfile = 'production'
    
    expect(store.currentApiProfile).toBe('production')
  })
})