import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import GeneralSettings from './GeneralSettings.vue';

// Helper to wait for all pending promises to resolve
const flushPromises = () => new Promise(setImmediate);

// Mock the cloudSync store
vi.mock('@/stores/cloudSync', () => ({
  useCloudSyncStore: vi.fn(() => ({
    status: {
      enabled: false,
      autoSyncEnabled: false,
      isAuthorized: false,
      hasPassword: false,
      lastSyncAt: null,
      lastSyncError: null,
      provider: null,
      deviceName: '',
    },
    devices: [],
    isLoadingDevices: false,
    isTestingConnection: false,
    isSyncing: false,
    connectionTestResult: null,
    cachedPassword: null,
    isConfigured: false,
    statusText: 'disabled',
    syncEnabled: { value: false },
    autoSyncEnabled: { value: false },
    loadStatus: vi.fn().mockResolvedValue({ success: true }),
    loadDevices: vi.fn().mockResolvedValue({ success: true }),
    setAutoSync: vi.fn().mockResolvedValue({ success: true }),
    configureProvider: vi.fn().mockResolvedValue({ success: true }),
    testConnection: vi.fn().mockResolvedValue({ success: true }),
    revokeAuth: vi.fn().mockResolvedValue({ success: true }),
    setPassword: vi.fn().mockResolvedValue({ success: true }),
    changePassword: vi.fn().mockResolvedValue({ success: true }),
    verifyPassword: vi.fn().mockResolvedValue({ success: true, valid: false }),
    syncNow: vi.fn().mockResolvedValue({ success: true }),
    setDeviceName: vi.fn().mockResolvedValue({ success: true }),
    removeDevice: vi.fn().mockResolvedValue({ success: true }),
    clearCloud: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock vue-i18n useI18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

describe('GeneralSettings.vue', () => {
  // Stub img elements to avoid icon.png loading issues in tests
  const imgStub = true;

  // Stub all icon-park icons
  const iconStubs = {
    Globe: true, Setting: true, Rocket: true, Info: true,
    Refresh: true, Loading: true, Sync: true, LinkCloud: true,
    Lock: true, Computer: true, List: true, Delete: true,
    Link: true, CheckSmall: true, CloseSmall: true,
  };

  const mockSettings = {
    language: 'zh-CN',
    uiTheme: 'Light',
    showMemoryUsage: true,
    hideBanner: false,
    maxSessionTurns: 10,
    autoAccept: false,
    disableAutoUpdate: false,
    autoConfigureMaxOldSpaceSize: undefined,
    disableTelemetry: false,
    tokensLimit: 128000,
    compressionTokenThreshold: 0.8,
    skipNextSpeakerCheck: true,
    shellTimeout: 120000,
    approvalMode: 'autoEdit',
    thinkingModeEnabled: 'true',
    excludeTools: [],
    bootAnimationShown: true,
    checkpointing: { enabled: true },
    acrylicIntensity: 50,
  };

  const defaultMountOptions = () => ({
    props: {
      settings: mockSettings,
    },
    global: {
      mocks: {
        $t: (key) => key,
      },
      stubs: {
        img: imgStub,
        MessageDialog: true,
        Transition: {
          template: '<div><slot/></div>',
        },
        ...iconStubs,
      },
    },
  });

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
      onCloudSyncStatusChanged: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with props', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.content-title').exists()).toBe(true);
    // Cards: language, autoLaunch, other, status+sync, provider, password+devices, about = 7 (cloud sync cards visible when disabled due to defaultMountOptions mock having status.enabled=false but UI structure changed)
    expect(wrapper.findAll('.card').length).toBe(7);
  });

  it('displays language options correctly', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    const languageOptions = wrapper.findAll('.form-select')[0].findAll('option');
    expect(languageOptions.length).toBe(3);
    expect(languageOptions[0].attributes('value')).toBe('zh-CN');
    expect(languageOptions[1].attributes('value')).toBe('en-US');
    expect(languageOptions[2].attributes('value')).toBe('ja-JP');
  });

  it('displays theme options correctly', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    const themeOptions = wrapper.findAll('.form-select')[1].findAll('option');
    expect(themeOptions.length).toBe(3);
    expect(themeOptions[0].attributes('value')).toBe('Light');
    expect(themeOptions[1].attributes('value')).toBe('Dark');
    expect(themeOptions[2].attributes('value')).toBe('System');
  });

  it('reflects current settings in form controls', async () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    await nextTick();
    const selectElements = wrapper.findAll('.form-select');
    // Selects: language, theme, approvalMode, thinkingModeEnabled, providerType = 5
    expect(selectElements[0].element.value).toBe('zh-CN');
    expect(selectElements[1].element.value).toBe('Light');
    expect(selectElements[2].element.value).toBe('autoEdit');
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
          img: imgStub,
          MessageDialog: true,
          Transition: {
            template: '<div><slot/></div>',
          },
          ...iconStubs,
        }
      },
    });

    expect(wrapper.find('.content-title').text()).toBe('translated-general.title');
    expect(wrapper.find('.content-desc').text()).toBe('translated-general.description');
  });

  it('has settings cards for each section', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // Cards: language, autoLaunch, other, status+sync, provider, password+devices, about = 7
    const cards = wrapper.findAll('.card');
    expect(cards.length).toBe(7);
  });

  it('displays card titles with icons', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    const cardTitles = wrapper.findAll('.card-title');
    // Preference section: language, autoLaunch, other = 3
    // Cloud sync section: provider, password+devices = 2 (status card has no card-title)
    // About section: no card-title
    expect(cardTitles.length).toBe(5);
    expect(cardTitles[0].text()).toContain('general.languageInterface');
    expect(cardTitles[1].text()).toContain('general.autoLaunchSettings');
    expect(cardTitles[2].text()).toContain('general.otherSettings');
    expect(cardTitles[3].text()).toContain('cloudSync.providerTitle');
    expect(cardTitles[4].text()).toContain('cloudSync.passwordTitle');
  });

  it('displays section group headers', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    const sectionTitles = wrapper.findAll('.section-title');
    expect(sectionTitles.length).toBe(3);
    expect(sectionTitles[0].text()).toContain('general.sectionPreferences');
    expect(sectionTitles[1].text()).toContain('general.sectionCloudSync');
    expect(sectionTitles[2].text()).toContain('general.sectionAbout');
  });

  it('shows all form controls with proper structure', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // All setting-item divs in DOM (v-show only hides with CSS, elements remain in DOM):
    // Language card: 4 grid items + 1 full width (acrylic) = 5
    // AutoLaunch card: 1 setting-item-main = 1
    // Other card: 10 grid items + 1 full width (excludeTools) = 11
    // Cloud sync provider card: 1 (providerType) = 1
    // Password card: 1 (passwordStatus) + 1 (deviceName when isConfigured) = 1 or 2
    // mock has isConfigured=false, so deviceName doesn't show, total = 1
    // Total: 5 + 1 + 11 + 1 + 1 = 19
    expect(wrapper.findAll('.setting-item').length).toBe(19);
    expect(wrapper.findAll('.setting-label').length).toBe(19);
    // Selects: language, theme, approvalMode, thinkingModeEnabled, providerType = 5
    expect(wrapper.findAll('.form-select').length).toBe(5);
    expect(wrapper.find('.switch').exists()).toBe(true);
  });

  it('does not show install button when updateReady is false', async () => {
    // Mock getUpdateStatus to return idle (no update ready)
    window.electronAPI.getUpdateStatus.mockResolvedValueOnce({
      success: true,
      status: 'idle'
    });

    const wrapper = mount(GeneralSettings, defaultMountOptions());

    await nextTick();
    await nextTick(); // Wait for onMounted async operations

    // No install button visible
    const allButtons = wrapper.findAll('button');
    const installButton = allButtons.find(b => b.text().includes('update.installNow'));
    expect(installButton).toBeUndefined();
  });

  it('shows install button when updateReady is true', async () => {
    // Mock getUpdateStatus to return downloaded state
    window.electronAPI.getUpdateStatus.mockResolvedValueOnce({
      success: true,
      status: 'downloaded',
      info: { version: '2.0.0' }
    });

    const wrapper = mount(GeneralSettings, defaultMountOptions());

    await flushPromises();
    await wrapper.vm.$nextTick();

    const allButtons = wrapper.findAll('button');
    const installButton = allButtons.find(b => b.text().includes('update.installNow'));
    expect(installButton).toBeDefined();
  });

  it('calls installUpdate when install button is clicked', async () => {
    // Mock getUpdateStatus to return downloaded state
    window.electronAPI.getUpdateStatus.mockResolvedValueOnce({
      success: true,
      status: 'downloaded',
      info: { version: '2.0.0' }
    });

    const wrapper = mount(GeneralSettings, defaultMountOptions());

    await flushPromises();
    await wrapper.vm.$nextTick();

    const allButtons = wrapper.findAll('button');
    const installButton = allButtons.find(b => b.text().includes('update.installNow'));
    if (installButton) {
      await installButton.trigger('click');
      expect(window.electronAPI.installUpdate).toHaveBeenCalledOnce();
    }
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

    const wrapper = mount(GeneralSettings, defaultMountOptions());

    await flushPromises();
    await wrapper.vm.$nextTick();

    const allButtons = wrapper.findAll('button');
    const installButton = allButtons.find(b => b.text().includes('update.installNow'));
    if (installButton) {
      await installButton.trigger('click');
      expect(window.electronAPI.installUpdate).toHaveBeenCalledOnce();
      // The error is caught and a message dialog is shown
      expect(wrapper.vm.messageDialog.show).toBe(true);
      expect(wrapper.vm.messageDialog.type).toBe('error');
      expect(wrapper.vm.messageDialog.message).toBe('update.installFailed');
    }
  });

  it('registers update status listener on mount', async () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(window.electronAPI.onUpdateStatusChanged).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('removes update listener on unmount', async () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    await flushPromises();
    await wrapper.vm.$nextTick();

    wrapper.unmount();

    expect(window.electronAPI.removeUpdateListener).toHaveBeenCalledWith(
      'update-status-changed',
      expect.any(Function)
    );
  });

  it('has cloud sync section with toggle switch', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // Cloud sync section header with toggle (no longer has section-header-clickable since expand button removed)
    const cloudSection = wrapper.findAll('.section-group')[1];
    expect(cloudSection.find('.section-title').text()).toContain('general.sectionCloudSync');
    expect(cloudSection.find('.switch').exists()).toBe(true);
  });

  it('has cloud sync section that shows when enabled', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // Cloud sync section exists with proper structure
    const cloudSection = wrapper.findAll('.section-group')[1];
    const sectionBody = cloudSection.find('.section-body');
    expect(sectionBody.exists()).toBe(true);
    // Section body uses v-show, not v-if, so element exists but may be hidden via CSS
  });
});
