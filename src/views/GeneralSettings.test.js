import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import GeneralSettings from './GeneralSettings.vue';

// Helper to wait for all pending promises to resolve
const flushPromises = () => new Promise(setImmediate);

describe('GeneralSettings.vue', () => {
  // Stub img elements to avoid icon.png loading issues in tests
  const imgStub = true;

  const mockSettings = {
    language: 'zh-CN',
    uiTheme: 'Light',
    bootAnimationShown: true,
    checkpointing: { enabled: true },
    acrylicIntensity: 50,
  };

  beforeEach(() => {
    // Mock window.electronAPI
    global.window.electronAPI = {
      getAutoLaunch: vi.fn().mockResolvedValue({ success: true, enabled: false }),
      setAutoLaunch: vi.fn().mockResolvedValue({}),
      getAppVersion: vi.fn().mockResolvedValue({ version: '1.0.0' }),
      getAutoUpdate: vi.fn().mockResolvedValue({ success: true, enabled: true }),
      getUpdateStatus: vi.fn().mockResolvedValue({ success: true, status: 'idle' }),
      onUpdateStatusChanged: vi.fn(),
      onUpdateDownloadProgress: vi.fn(),
      onUpdateBackgroundComplete: vi.fn(),
      removeUpdateListener: vi.fn(),
      installUpdate: vi.fn().mockResolvedValue({}),
      checkForUpdates: vi.fn().mockResolvedValue({ success: true, hasUpdate: false }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with props', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.content-title').exists()).toBe(true);
    expect(wrapper.findAll('.card').length).toBe(4);
  });

  it('displays language options correctly', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    const languageOptions = wrapper.findAll('.form-select')[0].findAll('option');
    expect(languageOptions.length).toBe(3);
    expect(languageOptions[0].attributes('value')).toBe('zh-CN');
    expect(languageOptions[1].attributes('value')).toBe('en-US');
    expect(languageOptions[2].attributes('value')).toBe('ja-JP');
  });

  it('displays theme options correctly', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    const themeOptions = wrapper.findAll('.form-select')[1].findAll('option');
    expect(themeOptions.length).toBe(3);
    expect(themeOptions[0].attributes('value')).toBe('Light');
    expect(themeOptions[1].attributes('value')).toBe('Dark');
    expect(themeOptions[2].attributes('value')).toBe('System');
  });

  it('reflects current settings in form controls', async () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    await nextTick();
    const selectElements = wrapper.findAll('.form-select');
    expect(selectElements[0].element.value).toBe('zh-CN');
    expect(selectElements[1].element.value).toBe('Light');
    expect(selectElements[2].element.value).toBe('true');
    expect(selectElements[3].element.value).toBe('true');
  });

  it('applies translation correctly', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => `translated-${key}`,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    expect(wrapper.find('.content-title').text()).toBe('translated-general.title');
    expect(wrapper.find('.content-desc').text()).toBe('translated-general.description');
  });

  it('has three cards for settings sections', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    const cards = wrapper.findAll('.card');
    expect(cards.length).toBe(4);
  });

  it('displays card titles with icons', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    const cardTitles = wrapper.findAll('.card-title');
    expect(cardTitles.length).toBe(4);
    expect(cardTitles[0].text()).toContain('general.languageInterface');
    expect(cardTitles[1].text()).toContain('general.autoLaunchSettings');
    expect(cardTitles[2].text()).toContain('general.otherSettings');
    expect(cardTitles[3].text()).toContain('update.menu.about');
  });

  it('shows all form controls with proper structure', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    expect(wrapper.findAll('.setting-item').length).toBe(6);
    expect(wrapper.findAll('.setting-label').length).toBe(6);
    expect(wrapper.findAll('.form-select').length).toBe(4);
    expect(wrapper.find('.switch').exists()).toBe(true);
  });

  it('does not show install button when updateReady is false', async () => {
    // Mock getUpdateStatus to return idle (no update ready)
    window.electronAPI.getUpdateStatus.mockResolvedValueOnce({
      success: true,
      status: 'idle'
    });

    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    await nextTick();
    await nextTick(); // Wait for onMounted async operations

    const installButton = wrapper.find('.btn-primary');
    expect(installButton.exists()).toBe(false);
  });

  it('shows install button when updateReady is true', async () => {
    // Mock getUpdateStatus to return downloaded state
    window.electronAPI.getUpdateStatus.mockResolvedValueOnce({
      success: true,
      status: 'downloaded',
      info: { version: '2.0.0' }
    });

    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const installButton = wrapper.find('.btn-primary');
    expect(installButton.exists()).toBe(true);
    expect(installButton.text()).toBe('update.installNow');
  });

  it('calls installUpdate when install button is clicked', async () => {
    // Mock getUpdateStatus to return downloaded state
    window.electronAPI.getUpdateStatus.mockResolvedValueOnce({
      success: true,
      status: 'downloaded',
      info: { version: '2.0.0' }
    });

    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const installButton = wrapper.find('.btn-primary');
    await installButton.trigger('click');

    expect(window.electronAPI.installUpdate).toHaveBeenCalledOnce();
  });

  it('shows error message when installUpdate fails', async () => {
    // Mock getUpdateStatus to return downloaded state
    window.electronAPI.getUpdateStatus.mockResolvedValueOnce({
      success: true,
      status: 'downloaded',
      info: { version: '2.0.0' }
    });

    // Mock installUpdate to throw an error
    window.electronAPI.installUpdate.mockRejectedValueOnce(new Error('Install failed'));

    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const installButton = wrapper.find('.btn-primary');
    await installButton.trigger('click');

    expect(window.electronAPI.installUpdate).toHaveBeenCalledOnce();
    // The error is caught and a message dialog is shown
    expect(wrapper.vm.messageDialog.show).toBe(true);
    expect(wrapper.vm.messageDialog.type).toBe('error');
    expect(wrapper.vm.messageDialog.message).toBe('update.installFailed');
  });

  it('registers update status listener on mount', async () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(window.electronAPI.onUpdateStatusChanged).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('removes update listener on unmount', async () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          img: imgStub
        }
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    wrapper.unmount();

    expect(window.electronAPI.removeUpdateListener).toHaveBeenCalledWith(
      'update-status-changed',
      expect.any(Function)
    );
  });
});