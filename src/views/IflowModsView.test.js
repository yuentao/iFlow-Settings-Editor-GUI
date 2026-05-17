import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import IflowModsView from './IflowModsView.vue'

describe('IflowModsView.vue', () => {
  const mockMods = [
    { id: 'mod1', name: 'Mod One', version: '1.0', type: 'replace', description: 'First mod', author: 'Author1', enabled: true, iflowVersion: '0.5.19' },
    { id: 'mod2', name: 'Mod Two', version: '2.0', type: 'append', description: 'Second mod', author: 'Author2', enabled: false, iflowVersion: '0.6.0' },
    { id: 'mod3', name: 'Mod Three', version: '0.5', type: 'prepend', description: '', author: '', enabled: true, iflowVersion: '0.5.19' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      iflowListMods: vi.fn().mockResolvedValue({ success: true, mods: mockMods }),
      iflowCheckIflowStatus: vi.fn().mockResolvedValue({ success: true, exists: true, version: '0.5.19' }),
      iflowGetIflowVersion: vi.fn().mockResolvedValue({ success: true, version: '0.5.19' }),
      iflowEnableMod: vi.fn().mockResolvedValue({ success: true }),
      iflowDeleteMod: vi.fn().mockResolvedValue({ success: true }),
    }
  })

  function createWrapper() {
    const pinia = createPinia()
    return mount(IflowModsView, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key) => key,
        },
      },
    })
  }

  async function waitForLoad() {
    // 等待 loadMods() 中的 Promise.all 完成
    await vi.dynamicImportSettled?.()
    await new Promise(resolve => setTimeout(resolve, 0))
    await vi.dynamicImportSettled?.()
  }

  it('renders title and description', async () => {
    const wrapper = createWrapper()
    await waitForLoad()
    expect(wrapper.find('.content-title').exists()).toBe(true)
    expect(wrapper.find('.content-desc').exists()).toBe(true)
  })

  it('shows status cards', async () => {
    const wrapper = createWrapper()
    await waitForLoad()
    const statusCards = wrapper.findAll('.status-card')
    expect(statusCards.length).toBeGreaterThanOrEqual(1)
  })

  it('shows enabled count in status', async () => {
    const wrapper = createWrapper()
    await waitForLoad()
    const values = wrapper.findAll('.status-card-value')
    const enabledValue = values.filter(v => v.text().includes('2'))
    expect(enabledValue.length).toBeGreaterThan(0)
  })

  it('shows import button when mods exist', async () => {
    const wrapper = createWrapper()
    await waitForLoad()
    const actions = wrapper.findAll('.page-actions')
    expect(actions.length).toBeGreaterThan(0)
  })

  it('displays mod names', async () => {
    const wrapper = createWrapper()
    await waitForLoad()
    const names = wrapper.findAll('.mod-name')
    expect(names.length).toBe(3)
    expect(names[0].text()).toBe('Mod One')
    expect(names[1].text()).toBe('Mod Two')
  })

  it('displays mod versions', async () => {
    const wrapper = createWrapper()
    await waitForLoad()
    const versions = wrapper.findAll('.mod-version')
    expect(versions[0].text()).toBe('v1.0')
    expect(versions[1].text()).toBe('v2.0')
  })

  it('shows type badges', async () => {
    const wrapper = createWrapper()
    await waitForLoad()
    const badges = wrapper.findAll('.mod-type-badge')
    expect(badges.length).toBe(3)
  })
})