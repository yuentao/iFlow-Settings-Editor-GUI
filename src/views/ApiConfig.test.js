import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ApiConfig from './ApiConfig.vue';

describe('ApiConfig.vue', () => {
  const mockSettings = {
    apiProfiles: {
      'default': {
        baseUrl: 'https://api.default.com',
        selectedAuthType: 'openai-compatible',
        apiKey: '',
        modelName: '',
      },
      'dev': {
        baseUrl: 'https://api.dev.com',
        selectedAuthType: 'openai-compatible',
        apiKey: 'dev-key',
        modelName: 'gpt-4',
      },
      'prod': {
        baseUrl: 'https://api.prod.com',
        selectedAuthType: 'openai-compatible',
        apiKey: 'prod-key',
        modelName: 'gpt-4',
      }
    },
    currentApiProfile: 'default'
  };

  const mockProfiles = [
    { name: 'default' },
    { name: 'dev' },
    { name: 'prod' }
  ];

  it('renders correctly with props', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.content-title').exists()).toBe(true);
    expect(wrapper.find('.card').exists()).toBe(true);
    expect(wrapper.find('.profile-list').exists()).toBe(true);
  });

  it('displays all profiles', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileItems = wrapper.findAll('.profile-item');
    expect(profileItems.length).toBe(3);
  });

  it('highlights current profile', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'dev',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileItems = wrapper.findAll('.profile-item');
    expect(profileItems[0].classes('active')).toBe(false);
    expect(profileItems[1].classes('active')).toBe(true);
    expect(profileItems[2].classes('active')).toBe(false);
  });

  it('shows status badge only for current profile', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const statusBadges = wrapper.findAll('.status-badge');
    expect(statusBadges.length).toBe(1);
    expect(wrapper.findAll('.profile-item')[0].find('.status-badge').exists()).toBe(true);
    expect(wrapper.findAll('.profile-item')[1].find('.status-badge').exists()).toBe(false);
  });

  it('emits create-profile event when create button is clicked', async () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.find('.btn-primary').trigger('click');
    expect(wrapper.emitted('create-profile')).toBeTruthy();
  });

  it('emits select-profile event when profile is clicked', async () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileItems = wrapper.findAll('.profile-item');
    await profileItems[1].trigger('click');

    expect(wrapper.emitted('select-profile')).toBeTruthy();
    expect(wrapper.emitted('select-profile')[0][0]).toBe('dev');
  });

  it('emits edit-profile event when edit button is clicked', async () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const editButtons = wrapper.findAll('.action-btn');
    await editButtons[0].trigger('click');

    expect(wrapper.emitted('edit-profile')).toBeTruthy();
    expect(wrapper.emitted('edit-profile')[0][0]).toBe('default');
  });

  it('emits duplicate-profile event when duplicate button is clicked', async () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const duplicateButtons = wrapper.findAll('.action-btn');
    await duplicateButtons[1].trigger('click');

    expect(wrapper.emitted('duplicate-profile')).toBeTruthy();
    expect(wrapper.emitted('duplicate-profile')[0][0]).toBe('default');
  });

  it('shows delete button only for non-default profiles', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileItems = wrapper.findAll('.profile-item');
    const deleteButtons = wrapper.findAll('.action-btn-danger');

    expect(deleteButtons.length).toBe(2);
    expect(profileItems[0].find('.action-btn-danger').exists()).toBe(false);
    expect(profileItems[1].find('.action-btn-danger').exists()).toBe(true);
    expect(profileItems[2].find('.action-btn-danger').exists()).toBe(true);
  });

  it('emits delete-profile event when delete button is clicked', async () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const deleteButtons = wrapper.findAll('.action-btn-danger');
    await deleteButtons[0].trigger('click');

    expect(wrapper.emitted('delete-profile')).toBeTruthy();
    expect(wrapper.emitted('delete-profile')[0][0]).toBe('dev');
  });

  it('displays correct profile names', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileNames = wrapper.findAll('.profile-name');
    expect(profileNames[0].text()).toBe('default');
    expect(profileNames[1].text()).toBe('dev');
    expect(profileNames[2].text()).toBe('prod');
  });

  it('displays correct profile URLs', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileUrls = wrapper.findAll('.profile-url');
    expect(profileUrls[0].text()).toBe('https://api.default.com');
    expect(profileUrls[1].text()).toBe('https://api.dev.com');
    expect(profileUrls[2].text()).toBe('https://api.prod.com');
  });

  it('displays correct profile initials', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const iconTexts = wrapper.findAll('.profile-icon-text');
    expect(iconTexts[0].text()).toBe('D');
    expect(iconTexts[1].text()).toBe('D');
    expect(iconTexts[2].text()).toBe('P');
  });

  it('handles empty profiles array', () => {
    const wrapper = mount(ApiConfig, {
      props: {
        profiles: [],
        currentProfile: 'default',
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileItems = wrapper.findAll('.profile-item');
    expect(profileItems.length).toBe(0);
  });

  it('handles missing apiProfiles in settings', () => {
    const settingsWithoutProfiles = { currentApiProfile: 'default' };

    const wrapper = mount(ApiConfig, {
      props: {
        profiles: mockProfiles,
        currentProfile: 'default',
        settings: settingsWithoutProfiles,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const profileUrls = wrapper.findAll('.profile-url');
    expect(profileUrls[0].text()).toBe('');
    expect(profileUrls[1].text()).toBe('');
    expect(profileUrls[2].text()).toBe('');
  });
});
