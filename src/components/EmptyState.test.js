import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from './EmptyState.vue';

describe('EmptyState.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with required props', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state-title').text()).toBe('No items');
  });

  it('displays description when provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
        description: 'Add some items to get started',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state-desc').exists()).toBe(true);
    expect(wrapper.find('.empty-state-desc').text()).toBe('Add some items to get started');
  });

  it('does not display description when not provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state-desc').exists()).toBe(false);
  });

  it('displays action button when actionText is provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
        actionText: 'Add Item',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state-action').exists()).toBe(true);
    expect(wrapper.find('.empty-state-action').text()).toContain('Add Item');
  });

  it('does not display action button when actionText is not provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state-action').exists()).toBe(false);
  });

  it('emits action event when button is clicked', async () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
        actionText: 'Add Item',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.find('.empty-state-action').trigger('click');
    expect(wrapper.emitted('action')).toBeTruthy();
    expect(wrapper.emitted('action').length).toBe(1);
  });

  it('shows Plus icon by default when actionText is provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
        actionText: 'Add Item',
        showPlusIcon: true,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    // Plus icon should be present
    expect(wrapper.find('.empty-state-action svg').exists()).toBe(true);
  });

  it('hides Plus icon when showPlusIcon is false', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
        actionText: 'Add Item',
        showPlusIcon: false,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state-action svg').exists()).toBe(false);
  });

  it('applies embedded class when embedded prop is true', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
        embedded: true,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state--embedded').exists()).toBe(true);
  });

  it('does not apply embedded class when embedded prop is false', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
        embedded: false,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state--embedded').exists()).toBe(false);
  });

  it('renders custom icon via slot', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No items',
      },
      slots: {
        icon: '<svg class="custom-icon"></svg>',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.custom-icon').exists()).toBe(true);
  });
});
