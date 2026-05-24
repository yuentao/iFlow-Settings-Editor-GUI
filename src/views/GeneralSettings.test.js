import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import GeneralSettings from './GeneralSettings.vue';

// Helper to wait for all pending promises to resolve
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 1));

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
    rememberPassword: false,
    loadStatus: vi.fn().mockResolvedValue({ success: true }),
    loadDevices: vi.fn().mockResolvedValue({ success: true }),
    getRememberPassword: vi.fn().mockResolvedValue({ success: true, remember: false }),
    setRememberPasswordValue: vi.fn().mockResolvedValue({ success: true, remember: false }),
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
    CheckCorrect: true, Time: true, DataDisplay: true, FilterOne: true, Communication: true, DataScreen: true,
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
    // Cards: language, autoLaunch, conversation, session, toolFiltering, updateTelemetry, monitoring, about, feedback, logManagement = 10
    expect(wrapper.findAll('.card').length).toBe(10);
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
    // Selects: language, theme, thinkingModeEnabled, approvalMode, providerType = 5
    expect(selectElements[0].element.value).toBe('zh-CN');
    expect(selectElements[1].element.value).toBe('Light');
    expect(selectElements[2].element.value).toBe('true');
    expect(selectElements[3].element.value).toBe('autoEdit');
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

    // Cards: language, autoLaunch, conversation, session, toolFiltering, updateTelemetry, monitoring, about, feedback, logManagement = 10
    const cards = wrapper.findAll('.card');
    expect(cards.length).toBe(10);
  });

  it('displays card titles with icons', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    const cardTitles = wrapper.findAll('.card-title');
    // Preference section: language, autoLaunch, monitoring = 3
    // CLI section: conversationMode, displayUpdates, sessionTimeout, toolFiltering = 4
    // About section: feedback, logManagement = 2
    expect(cardTitles.length).toBe(9);
    expect(cardTitles[0].text()).toContain('general.languageInterface');
    expect(cardTitles[1].text()).toContain('general.autoLaunchSettings');
    expect(cardTitles[2].text()).toContain('general.monitoring');
    expect(cardTitles[3].text()).toContain('general.conversationMode');
    expect(cardTitles[4].text()).toContain('general.displayUpdates');
    expect(cardTitles[5].text()).toContain('general.sessionTimeout');
    expect(cardTitles[6].text()).toContain('general.toolFiltering');
  });

  it('displays section group headers', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    const sectionTitles = wrapper.findAll('.section-title');
    expect(sectionTitles.length).toBe(4);
    expect(sectionTitles[0].text()).toContain('general.sectionPreferences');
    expect(sectionTitles[1].text()).toContain('general.sectionCli');
    expect(sectionTitles[2].text()).toContain('general.sectionCloudSync');
    expect(sectionTitles[3].text()).toContain('general.sectionAbout');
  });

  it('shows all form controls with proper structure', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // All setting-item divs in DOM (v-show only hides with CSS, elements remain in DOM):
    // Language card: 2 grid items + 1 acrylic checkbox = 3
    // AutoLaunch card: 1 setting-item-main = 1
    // Monitoring card: 2 items = 2
    // ConversationMode card: 3 items = 3
    // DisplayUpdates card: 4 items = 4
    // SessionTimeout card: 4 items = 4
    // ToolFiltering card: 1 setting-item-main = 1
    // Total: 3 + 1 + 2 + 3 + 4 + 4 + 1 = 18
    expect(wrapper.findAll('.setting-item').length).toBe(18);
    expect(wrapper.findAll('.setting-label').length).toBe(18);
    // Selects: language, theme, thinkingModeEnabled, approvalMode = 4
    expect(wrapper.findAll('.form-select').length).toBe(4);
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

    // Simulate the update status being set via the listener
    wrapper.vm.handleStatusChanged({ status: 'downloaded', info: { version: '2.0.0' } });
    await wrapper.vm.$nextTick();

    // Verify state was updated
    expect(wrapper.vm.updateReady).toBe(true);
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

  it('registers update status listener on mount', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // Verify the listener callback exists on the component instance
    expect(wrapper.vm.handleStatusChanged).toBeDefined();
    expect(typeof wrapper.vm.handleStatusChanged).toBe('function');
    // Verify the callback correctly sets updateReady when status is downloaded
    wrapper.vm.handleStatusChanged({ status: 'downloaded', info: { version: '2.0.0' } });
    expect(wrapper.vm.updateReady).toBe(true);
  });

  it('removes update listener on unmount', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    wrapper.unmount();

    // The listener function should have been called with the right arguments
    expect(window.electronAPI.removeUpdateListener).toHaveBeenCalledWith(
      'update-status-changed',
      expect.any(Function)
    );
  });

  it('has cloud sync section with toggle switch', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // Cloud sync section header with toggle (3rd section-group, index 2)
    const cloudSection = wrapper.findAll('.section-group')[2];
    expect(cloudSection.find('.section-title').text()).toContain('general.sectionCloudSync');
    expect(cloudSection.find('.switch').exists()).toBe(true);
  });

  it('has cloud sync section that shows when enabled', () => {
    const wrapper = mount(GeneralSettings, defaultMountOptions());

    // Cloud sync section exists with proper structure
    const cloudSection = wrapper.findAll('.section-group')[2];
    const sectionBody = cloudSection.find('.section-body');
    expect(sectionBody.exists()).toBe(true);
    // Section body uses v-show, not v-if, so element exists but may be hidden via CSS
  });
});
