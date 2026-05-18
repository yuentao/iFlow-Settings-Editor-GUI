import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Dashboard from './Dashboard.vue'

describe('Dashboard.vue', () => {
  const mockSettings = {
    apiProfiles: {
      default: { modelName: 'gpt-4', baseUrl: 'https://api.openai.com' },
      production: { modelName: 'gpt-4-turbo' },
    },
    modelUsageRefreshInterval: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      getAllSessionMessagesForStats: vi.fn().mockResolvedValue({ success: true, messages: [] }),
    }
  })

  function createWrapper(overrides = {}) {
    const pinia = createPinia()
    return mount(Dashboard, {
      props: {
        settings: mockSettings,
        currentApiProfile: 'default',
        serverCount: 0,
        skillCount: 0,
        commandCount: 0,
        modCount: 0,
        ...overrides,
      },
      global: {
        plugins: [pinia],
        mocks: {
          $t: (key) => key,
        },
      },
    })
  }

  it('renders with required props', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('displays current API profile name', () => {
    const wrapper = createWrapper({ currentApiProfile: 'default' })
    const values = wrapper.findAll('.stat-value')
    const apiValue = values.filter(v => v.text().includes('default'))
    expect(apiValue.length).toBeGreaterThan(0)
  })

  it('displays server count', () => {
    const wrapper = createWrapper({ serverCount: 7 })
    const values = wrapper.findAll('.stat-value')
    const serverValue = values.filter(v => v.text() === '7')
    expect(serverValue.length).toBeGreaterThan(0)
  })

  it('emits navigate event on card click', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.stat-card').trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
  })

  it('shows model name subtext when available', () => {
    const wrapper = createWrapper({ currentApiProfile: 'default' })
    const subs = wrapper.findAll('.stat-sub')
    const modelSub = subs.filter(s => s.text().includes('gpt-4'))
    expect(modelSub.length).toBeGreaterThan(0)
  })

  it('shows no servers subtext when count is zero', () => {
    const wrapper = createWrapper({ serverCount: 0 })
    const subs = wrapper.findAll('.stat-sub-empty')
    expect(subs.length).toBeGreaterThan(0)
  })

  it('displays profile count badge', () => {
    const wrapper = createWrapper()
    const badges = wrapper.findAll('.stat-badge')
    expect(badges.length).toBeGreaterThan(0)
    expect(badges[0].text()).toContain('2')
  })
})