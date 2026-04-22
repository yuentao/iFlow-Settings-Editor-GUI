import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import GeneralSettings from './GeneralSettings.vue';

describe('GeneralSettings.vue', () => {
  // Stub img elements to avoid icon.png loading issues in tests
  const imgStub = {
    template: '<img />',
    props: ['src', 'alt']
  }

  const mockSettings = {
    language: 'zh-CN',
    uiTheme: 'Light',
    bootAnimationShown: true,
    checkpointing: { enabled: true },
    acrylicIntensity: 50,
  };

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
});
