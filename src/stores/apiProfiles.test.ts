/**
 * API Profiles Store 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useApiProfilesStore } from './apiProfiles'

describe('useApiProfilesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    global.window.electronAPI = {
      listApiProfiles: vi.fn(),
      switchApiProfile: vi.fn(),
      createApiProfile: vi.fn(),
      deleteApiProfile: vi.fn(),
      renameApiProfile: vi.fn(),
      duplicateApiProfile: vi.fn()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should have empty profiles on initialization', () => {
    const store = useApiProfilesStore()
    
    expect(store.profiles).toEqual([])
    expect(store.currentProfileName).toBe('default')
    expect(store.isLoading).toBe(false)
  })

  it('should load profiles successfully', async () => {
    const mockProfiles = [
      { name: 'default', isDefault: true },
      { name: 'production' }
    ]
    
    vi.mocked(global.window.electronAPI.listApiProfiles).mockResolvedValue({
      success: true,
      profiles: mockProfiles,
      currentProfile: 'production'
    })
    
    const store = useApiProfilesStore()
    const result = await store.loadProfiles()
    
    expect(result.success).toBe(true)
    expect(store.profiles).toEqual(mockProfiles)
    expect(store.currentProfileName).toBe('production')
    expect(store.isLoading).toBe(false)
  })

  it('should handle load profiles failure', async () => {
    vi.mocked(global.window.electronAPI.listApiProfiles).mockResolvedValue({
      success: false,
      error: 'Load failed'
    })
    
    const store = useApiProfilesStore()
    const result = await store.loadProfiles()
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Load failed')
  })

  it('should create default profile when no profiles exist', async () => {
    vi.mocked(global.window.electronAPI.listApiProfiles).mockResolvedValue({
      success: true,
      profiles: [],
      currentProfile: ''
    })
    
    const store = useApiProfilesStore()
    await store.loadProfiles()
    
    expect(store.profiles).toHaveLength(1)
    expect(store.profiles[0].name).toBe('default')
    expect(store.profiles[0].isDefault).toBe(true)
  })

  it('should switch profile successfully', async () => {
    vi.mocked(global.window.electronAPI.switchApiProfile).mockResolvedValue({
      success: true
    })
    
    const store = useApiProfilesStore()
    store.currentProfileName = 'default'
    
    const result = await store.switchProfile('production')
    
    expect(result.success).toBe(true)
    expect(store.currentProfileName).toBe('production')
  })

  it('should not switch if already on target profile', async () => {
    const store = useApiProfilesStore()
    store.currentProfileName = 'production'
    
    const result = await store.switchProfile('production')
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.switchApiProfile).not.toHaveBeenCalled()
  })

  it('should create profile', async () => {
    vi.mocked(global.window.electronAPI.createApiProfile).mockResolvedValue({
      success: true
    })
    
    const store = useApiProfilesStore()
    const result = await store.createProfile('new-profile')
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.createApiProfile).toHaveBeenCalledWith('new-profile', undefined)
  })

  it('should not delete default profile', async () => {
    const store = useApiProfilesStore()
    const result = await store.deleteProfile('default')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Cannot delete default profile')
  })

  it('should delete non-default profile', async () => {
    vi.mocked(global.window.electronAPI.deleteApiProfile).mockResolvedValue({
      success: true
    })
    
    const store = useApiProfilesStore()
    const result = await store.deleteProfile('production')
    
    expect(result.success).toBe(true)
  })

  it('should rename profile', async () => {
    vi.mocked(global.window.electronAPI.renameApiProfile).mockResolvedValue({
      success: true
    })
    
    const store = useApiProfilesStore()
    const result = await store.renameProfile('old-name', 'new-name')
    
    expect(result.success).toBe(true)
  })

  it('should duplicate profile', async () => {
    vi.mocked(global.window.electronAPI.duplicateApiProfile).mockResolvedValue({
      success: true
    })
    
    const store = useApiProfilesStore()
    const result = await store.duplicateProfile('source', 'duplicate')
    
    expect(result.success).toBe(true)
  })

  it('should compute currentProfile correctly', async () => {
    const mockProfiles = [
      { name: 'default' },
      { name: 'production' }
    ]
    
    vi.mocked(global.window.electronAPI.listApiProfiles).mockResolvedValue({
      success: true,
      profiles: mockProfiles,
      currentProfile: 'production'
    })
    
    const store = useApiProfilesStore()
    await store.loadProfiles()
    
    expect(store.currentProfile?.name).toBe('production')
  })

  it('should compute profileNames correctly', async () => {
    vi.mocked(global.window.electronAPI.listApiProfiles).mockResolvedValue({
      success: true,
      profiles: [
        { name: 'default' },
        { name: 'production' }
      ],
      currentProfile: 'default'
    })
    
    const store = useApiProfilesStore()
    await store.loadProfiles()
    
    expect(store.profileNames).toEqual(['default', 'production'])
  })
})