import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GenericList from './GenericList.vue'

describe('GenericList.vue', () => {
  const mockItems = [
    { name: 'item1', category: 'a' },
    { name: 'item2', category: 'b' },
    { name: 'item3', category: 'a' },
  ]

  it('renders items list', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    expect(wrapper.find('.generic-list').exists()).toBe(true)
    const items = wrapper.findAll('.generic-item')
    expect(items.length).toBe(3)
  })

  it('shows skeleton loader when loading', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: [],
        loading: true,
        itemKey: 'name',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    expect(wrapper.find('.generic-list').exists()).toBe(false)
  })

  it('shows empty state when no items', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: [],
        itemKey: 'name',
        emptyTitle: 'No items',
        emptyDescription: 'Add some items',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    expect(wrapper.find('.generic-list').exists()).toBe(false)
  })

  it('renders category filter when categories provided', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
        categories: [
          { value: 'all', label: 'All', count: 3 },
          { value: 'a', label: 'Category A', count: 2 },
        ],
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    expect(wrapper.find('.category-filter').exists()).toBe(true)
    const buttons = wrapper.findAll('.category-btn')
    expect(buttons.length).toBe(2)
  })

  it('highlights active category', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
        selectedCategory: 'a',
        categories: [
          { value: 'all', label: 'All', count: 3 },
          { value: 'a', label: 'Category A', count: 2 },
        ],
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    const buttons = wrapper.findAll('.category-btn')
    expect(buttons[1].classes()).toContain('active')
  })

  it('emits update:selectedCategory on category click', async () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
        categories: [
          { value: 'all', label: 'All', count: 3 },
          { value: 'a', label: 'Category A', count: 2 },
        ],
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    await wrapper.findAll('.category-btn')[1].trigger('click')
    expect(wrapper.emitted('update:selectedCategory')).toBeTruthy()
    expect(wrapper.emitted('update:selectedCategory')[0][0]).toBe('a')
  })

  it('renders item-icon slot', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
      },
      slots: {
        'item-icon': '<div class="custom-icon">Icon</div>',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    expect(wrapper.find('.custom-icon').exists()).toBe(true)
  })

  it('renders item-info slot', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
      },
      slots: {
        'item-info': '<div class="custom-info">Info</div>',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    expect(wrapper.find('.custom-info').exists()).toBe(true)
  })

  it('renders item-actions slot', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
      },
      slots: {
        'item-actions': '<button class="action-btn">Action</button>',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    expect(wrapper.find('.action-btn').exists()).toBe(true)
  })

  it('applies highlight class via highlightFn', () => {
    const wrapper = mount(GenericList, {
      props: {
        items: mockItems,
        itemKey: 'name',
        highlightFn: (item) => ({ highlighted: item.name === 'item2' }),
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    const items = wrapper.findAll('.generic-item')
    expect(items[0].classes('highlighted')).toBe(false)
    expect(items[1].classes('highlighted')).toBe(true)
    expect(items[2].classes('highlighted')).toBe(false)
  })

  it('emits action event from empty state', async () => {
    const wrapper = mount(GenericList, {
      props: {
        items: [],
        itemKey: 'name',
        emptyActionText: 'Add',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    })

    await wrapper.find('.empty-state-action').trigger('click')
    expect(wrapper.emitted('action')).toBeTruthy()
  })
})