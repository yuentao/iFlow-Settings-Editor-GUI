import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import UpdateNotification from './UpdateNotification.vue';

describe('UpdateNotification.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when show is true', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.dialog-overlay').exists()).toBe(true);
    expect(wrapper.find('.update-notification').exists()).toBe(true);
  });

  it('does not render when show is false', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: false,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.update-notification').exists()).toBe(false);
  });

  it('displays current and latest version', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.version-value.current').text()).toBe('1.0.0');
    expect(wrapper.find('.version-value.new').text()).toBe('1.1.0');
  });

  it('displays update icon', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.update-icon svg').exists()).toBe(true);
  });

  it('displays release notes when provided', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        releaseNotes: '## Bug fixes\n- Fixed issue #1\n- Fixed issue #2',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.update-notes').exists()).toBe(true);
    expect(wrapper.find('.notes-content').exists()).toBe(true);
  });

  it('does not display release notes section when not provided', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        releaseNotes: '',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.update-notes').exists()).toBe(false);
  });

  it('formats markdown release notes', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        releaseNotes: '# Release Notes\n\nThis is a test',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const notesContent = wrapper.find('.notes-content');
    expect(notesContent.html()).toContain('<h1>');
  });

  it('has three action buttons', () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const buttons = wrapper.findAll('.update-actions .btn');
    expect(buttons.length).toBe(3);
  });

  it('emits update event when update now button is clicked', async () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.findAll('.update-actions .btn')[2].trigger('click');
    expect(wrapper.emitted('update')).toBeTruthy();
  });

  it('emits later and close events when later button is clicked', async () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.findAll('.update-actions .btn')[0].trigger('click');
    expect(wrapper.emitted('later')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits background and close events when background button is clicked', async () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.findAll('.update-actions .btn')[1].trigger('click');
    expect(wrapper.emitted('background')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not emit when clicking overlay', async () => {
    const wrapper = mount(UpdateNotification, {
      props: {
        show: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.find('.dialog-overlay').trigger('click');
    // Should not emit update/later/background when just clicking overlay
    expect(wrapper.emitted('update')).toBeFalsy();
  });
});