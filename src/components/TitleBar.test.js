import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TitleBar from './TitleBar.vue';

describe('TitleBar.vue', () => {
  beforeEach(() => {
    // Mock window.electronAPI
    global.window.electronAPI = {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mount(TitleBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.titlebar').exists()).toBe(true);
    expect(wrapper.find('.titlebar-title').exists()).toBe(true);
    expect(wrapper.find('.titlebar-controls').exists()).toBe(true);
  });

  it('displays app title', () => {
    const wrapper = mount(TitleBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.titlebar-title').text()).toBe('app.title');
  });

  it('has two window control buttons', () => {
    const wrapper = mount(TitleBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const buttons = wrapper.findAll('.titlebar-btn');
    expect(buttons.length).toBe(2);
  });

  it('calls minimize when minimize button is clicked', async () => {
    const wrapper = mount(TitleBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const minimizeButton = wrapper.findAll('.titlebar-btn')[0];
    await minimizeButton.trigger('click');

    expect(window.electronAPI.minimize).toHaveBeenCalledOnce();
  });


  it('calls close when close button is clicked', async () => {
    const wrapper = mount(TitleBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const closeButton = wrapper.findAll('.titlebar-btn')[1];
    await closeButton.trigger('click');

    expect(window.electronAPI.close).toHaveBeenCalledOnce();
  });

  it('has close button with close class', () => {
    const wrapper = mount(TitleBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const closeButton = wrapper.findAll('.titlebar-btn')[1];
    expect(closeButton.classes()).toContain('close');
  });

  it('applies translation to button tooltips', () => {
    const wrapper = mount(TitleBar, {
      global: {
        mocks: {
          $t: (key) => `translated-${key}`,
        },
      },
    });

    const buttons = wrapper.findAll('.titlebar-btn');
    expect(buttons[0].attributes('title')).toBe('translated-window.minimize');
    expect(buttons[1].attributes('title')).toBe('translated-window.close');
  });
});
