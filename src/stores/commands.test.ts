/**
 * Commands Store 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCommandsStore } from './commands'

describe('useCommandsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    global.window.electronAPI = {
      listCommands: vi.fn(),
      importCommandLocal: vi.fn(),
      importCommandOnline: vi.fn(),
      exportCommand: vi.fn(),
      deleteCommand: vi.fn()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should have empty commands on initialization', () => {
    const store = useCommandsStore()
    
    expect(store.commands).toEqual([])
    expect(store.selectedCommand).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('should load commands successfully', async () => {
    const mockCommands = [
      { name: 'cmd1', fileName: 'cmd1.md' },
      { name: 'cmd2', fileName: 'cmd2.md' }
    ]
    
    vi.mocked(global.window.electronAPI.listCommands).mockResolvedValue({
      success: true,
      commands: mockCommands
    })
    
    const store = useCommandsStore()
    const result = await store.loadCommands()
    
    expect(result.success).toBe(true)
    expect(store.commands).toEqual(mockCommands)
    expect(store.isLoading).toBe(false)
  })

  it('should handle load commands failure', async () => {
    vi.mocked(global.window.electronAPI.listCommands).mockResolvedValue({
      success: false,
      error: 'Load failed'
    })
    
    const store = useCommandsStore()
    const result = await store.loadCommands()
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Load failed')
  })

  it('should import local command and reload', async () => {
    vi.mocked(global.window.electronAPI.importCommandLocal).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listCommands).mockResolvedValue({
      success: true,
      commands: [{ name: 'new-cmd', fileName: 'new-cmd.md' }]
    })
    
    const store = useCommandsStore()
    const result = await store.importLocal()
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.listCommands).toHaveBeenCalled()
  })

  it('should import online command and reload', async () => {
    vi.mocked(global.window.electronAPI.importCommandOnline).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listCommands).mockResolvedValue({
      success: true,
      commands: []
    })
    
    const store = useCommandsStore()
    const result = await store.importOnline('https://example.com/cmd.tar.gz', 'my-cmd')
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.importCommandOnline).toHaveBeenCalledWith(
      'https://example.com/cmd.tar.gz',
      'my-cmd'
    )
  })

  it('should export command', async () => {
    vi.mocked(global.window.electronAPI.exportCommand).mockResolvedValue({
      success: true
    })
    
    const store = useCommandsStore()
    const result = await store.exportCommand('my-cmd', 'export-folder')
    
    expect(result.success).toBe(true)
    expect(global.window.electronAPI.exportCommand).toHaveBeenCalledWith('my-cmd', 'export-folder')
  })

  it('should delete command and clear selection if selected', async () => {
    vi.mocked(global.window.electronAPI.deleteCommand).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listCommands).mockResolvedValue({
      success: true,
      commands: []
    })
    
    const store = useCommandsStore()
    store.selectedCommand = 'cmd-to-delete'
    
    const result = await store.deleteCommand('cmd-to-delete')
    
    expect(result.success).toBe(true)
    expect(store.selectedCommand).toBeNull()
  })

  it('should delete command without clearing selection if different', async () => {
    vi.mocked(global.window.electronAPI.deleteCommand).mockResolvedValue({
      success: true
    })
    vi.mocked(global.window.electronAPI.listCommands).mockResolvedValue({
      success: true,
      commands: []
    })
    
    const store = useCommandsStore()
    store.selectedCommand = 'other-cmd'
    
    await store.deleteCommand('cmd-to-delete')
    
    expect(store.selectedCommand).toBe('other-cmd')
  })

  it('should select command', () => {
    const store = useCommandsStore()
    store.selectCommand('my-cmd')
    
    expect(store.selectedCommand).toBe('my-cmd')
  })

  it('should clear selection with null', () => {
    const store = useCommandsStore()
    store.selectedCommand = 'some-cmd'
    
    store.selectCommand(null)
    
    expect(store.selectedCommand).toBeNull()
  })
})