import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import GeneralSettings from './GeneralSettings.vue';

describe('GeneralSettings.vue', () => {
  const mockSettings = {
    language: 'zh-CN',
    theme: 'Xcode',
    bootAnimationShown: true,
    checkpointing: { enabled: true },
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
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.content-title').exists()).toBe(true);
    expect(wrapper.findAll('.card').length).toBe(2);
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
      },
    });

    const themeOptions = wrapper.findAll('.form-select')[1].findAll('option');
    expect(themeOptions.length).toBe(4);
    expect(themeOptions[0].attributes('value')).toBe('Xcode');
    expect(themeOptions[1].attributes('value')).toBe('Dark');
    expect(themeOptions[2].attributes('value')).toBe('Light');
    expect(themeOptions[3].attributes('value')).toBe('Solarized Dark');
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
      },
    });

    await nextTick();
    const selectElements = wrapper.findAll('.form-select');
    expect(selectElements[0].element.value).toBe('zh-CN');
    expect(selectElements[1].element.value).toBe('Xcode');
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
      },
    });

    expect(wrapper.find('.content-title').text()).toBe('translated-general.title');
    expect(wrapper.find('.content-desc').text()).toBe('translated-general.description');
  });

  it('has two cards for settings sections', () => {
    const wrapper = mount(GeneralSettings, {
      props: {
        settings: mockSettings,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const cards = wrapper.findAll('.card');
    expect(cards.length).toBe(2);
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
      },
    });

    const cardTitles = wrapper.findAll('.card-title');
    expect(cardTitles.length).toBe(2);
    expect(cardTitles[0].text()).toContain('general.languageInterface');
    expect(cardTitles[1].text()).toContain('general.otherSettings');
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
      },
    });

    expect(wrapper.findAll('.form-row').length).toBe(2);
    expect(wrapper.findAll('.form-group').length).toBe(4);
    expect(wrapper.findAll('.form-label').length).toBe(4);
    expect(wrapper.findAll('.form-select').length).toBe(4);
  });
});
