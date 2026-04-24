/**
 * Skills Store 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSkillsStore } from './skills'

describe('useSkillsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    global.window.electronAPI = {
      listSkills: vi.fn(),
      importSkillLocal: vi.fn(),
      importSkillOnline: vi.fn(),
      exportSkill: vi.fn(),
      deleteSkill: vi.fn()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should have empty skills on initialization', () => {
    const store = useSkillsStore()
    
    expect(store.skills).toEqual([])
    expect(store.selectedSkill).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('should load skills successfully', async () => {
    const mockSkills = [
      { name: 'skill1', folderName: 'skill1-folder', path: '/path/skill1', size: 1024, hasLicense: true },
      { name: 'skill2', folderName: 'skill2-folder', path: '/path/skill2', size: 2048, hasLicense: false }
    ]
    
    vi.mocked(global.window.electronAPI.listSkills).mockResolvedValue({
      success: true,
      skills: mockSkills
    })
    
    const store = useSkillsStore()
    const result = await store.loadSkills()
    
    expect(result.success).toBe(true)
    expect(store.skills).toEqual(mockSkills)
    expect(store.isLoading).toBe(false)
  })

  it('should handle load skills failure', async () => {
    vi.mocked(global.window.electronAPI.listSkills).mockResolvedValue({
      success: false,
      error: 'Load failed'
    })
    
    const store = useSkillsStore()
    const result = await store.loadSkills()
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Load failed')
  })

  it('should import local skill and reload', async () => {
    vi.mocked(global.window.electronAPI.importSkillLocal).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listSkills).mockResolvedValue({
      success: true,
      skills: [{ name: 'new-skill', folderName: 'new-skill', path: '/path', size: 100, hasLicense: false }]
    })
    
    const store = useSkillsStore()
    const result = await store.importLocal()
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.listSkills).toHaveBeenCalled()
  })

  it('should import online skill and reload', async () => {
    vi.mocked(global.window.electronAPI.importSkillOnline).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listSkills).mockResolvedValue({
      success: true,
      skills: []
    })
    
    const store = useSkillsStore()
    const result = await store.importOnline('https://example.com/skill.tar.gz', 'my-skill')
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.importSkillOnline).toHaveBeenCalledWith(
      'https://example.com/skill.tar.gz',
      'my-skill'
    )
  })

  it('should export skill', async () => {
    vi.mocked(global.window.electronAPI.exportSkill).mockResolvedValue({
      success: true
    })
    
    const store = useSkillsStore()
    const result = await store.exportSkill('my-skill', 'export-folder')
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.exportSkill).toHaveBeenCalledWith('my-skill', 'export-folder')
  })

  it('should delete skill and clear selection if selected', async () => {
    vi.mocked(global.window.electronAPI.deleteSkill).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listSkills).mockResolvedValue({
      success: true,
      skills: []
    })
    
    const store = useSkillsStore()
    store.selectedSkill = 'skill-to-delete'
    
    const result = await store.deleteSkill('skill-to-delete')
    
    expect(result.success).toBe(true)
    expect(store.selectedSkill).toBeNull()
  })

  it('should delete skill without clearing selection if different', async () => {
    vi.mocked(global.window.electronAPI.deleteSkill).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listSkills).mockResolvedValue({
      success: true,
      skills: []
    })
    
    const store = useSkillsStore()
    store.selectedSkill = 'other-skill'
    
    await store.deleteSkill('skill-to-delete')
    
    expect(store.selectedSkill).toBe('other-skill')
  })

  it('should select skill', () => {
    const store = useSkillsStore()
    store.selectSkill('my-skill')
    
    expect(store.selectedSkill).toBe('my-skill')
  })

  it('should clear selection with null', () => {
    const store = useSkillsStore()
    store.selectedSkill = 'some-skill'
    
    store.selectSkill(null)
    
    expect(store.selectedSkill).toBeNull()
  })
})