import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import UpdateProgress from './UpdateProgress.vue';

describe('UpdateProgress.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when show is true', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.dialog-overlay').exists()).toBe(true);
    expect(wrapper.find('.update-progress').exists()).toBe(true);
  });

  it('does not render when show is false', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: false,
        status: 'downloading',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.update-progress').exists()).toBe(false);
  });

  it('displays downloading status with spinning icon', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        progress: 50,
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.progress-icon .spinning').exists()).toBe(true);
    expect(wrapper.find('.progress-title').text()).toBe('update.downloading');
  });

  it('displays downloaded status with check icon', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloaded',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.progress-icon svg').exists()).toBe(true);
    expect(wrapper.find('.progress-title').text()).toBe('update.readyToInstall');
  });

  it('displays progress bar with correct width', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        progress: 75,
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.progress-bar').exists()).toBe(true);
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 75%');
  });

  it('displays progress percentage', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        progress: 42.5,
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.progress-percentage').text()).toBe('43%');
  });

  it('displays version info', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.version-info .value').text()).toBe('1.1.0');
  });

  it('displays speed when provided during download', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        progress: 50,
        version: '1.1.0',
        speed: '2.5 MB/s',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.progress-speed').text()).toBe('2.5 MB/s');
  });

  it('displays download complete message when status is downloaded', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloaded',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.download-complete-message').exists()).toBe(true);
  });

  it('shows cancel button during downloading', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const buttons = wrapper.findAll('.progress-actions .btn');
    expect(buttons.length).toBe(1);
    expect(buttons[0].text()).toBe('update.cancel');
  });

  it('shows install and later buttons when downloaded', () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloaded',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const buttons = wrapper.findAll('.progress-actions .btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].text()).toBe('update.installNow');
    expect(buttons[1].text()).toBe('update.later');
  });

  it('emits cancel event when cancel button is clicked', async () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloading',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.find('.progress-actions .btn').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('emits install event when install button is clicked', async () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloaded',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.findAll('.progress-actions .btn')[0].trigger('click');
    expect(wrapper.emitted('install')).toBeTruthy();
  });

  it('emits later event when later button is clicked', async () => {
    const wrapper = mount(UpdateProgress, {
      props: {
        show: true,
        status: 'downloaded',
        version: '1.1.0',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.findAll('.progress-actions .btn')[1].trigger('click');
    expect(wrapper.emitted('later')).toBeTruthy();
  });
});
