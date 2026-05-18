import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import CommandsView from './CommandsView.vue'

describe('CommandsView.vue', () => {
  const mockCommands = [
    { name: 'cmd1', description: 'First command', category: 'utility', version: '1.0', author: 'user1' },
    { name: 'cmd2', description: 'Second command', category: 'documentation', version: '2.0', author: '{{__anonymous__}}' },
    { name: 'cmd3', description: '', category: 'other', version: '1.5', author: 'user3' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      listCommands: vi.fn().mockResolvedValue({ success: true, commands: mockCommands }),
      createCommand: vi.fn().mockResolvedValue({ success: true }),
      updateCommand: vi.fn().mockResolvedValue({ success: true }),
      exportCommand: vi.fn().mockResolvedValue({ success: true }),
      deleteCommand: vi.fn().mockResolvedValue({ success: true }),
    }
  })

  function createWrapper() {
    const pinia = createPinia()
    return mount(CommandsView, {
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key) => key,
        },
      },
    })
  }

  it('renders title and description', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.content-title').exists()).toBe(true)
    expect(wrapper.find('.content-desc').exists()).toBe(true)
  })

  it('loads commands on mount', async () => {
    createWrapper()
    await vi.dynamicImportSettled?.()
    expect(window.electronAPI.listCommands).toHaveBeenCalledTimes(1)
  })

  it('renders action buttons', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const buttons = wrapper.findAll('.btn-primary')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('displays command names', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const names = wrapper.findAll('.command-name')
    expect(names.length).toBe(3)
    expect(names[0].text()).toBe('cmd1')
    expect(names[1].text()).toBe('cmd2')
  })

  it('displays anonymous author correctly', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const authors = wrapper.findAll('.command-author')
    expect(authors[0].text()).toBe('user1')
    expect(authors[1].text()).toBe('commands.anonymous')
  })

  it('shows no description fallback', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const descs = wrapper.findAll('.command-desc')
    expect(descs[2].text()).toBe('commands.noDescription')
  })
})