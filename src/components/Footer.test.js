import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Footer from './Footer.vue';

describe('Footer.vue', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(Footer, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.footer').exists()).toBe(true);
    expect(wrapper.find('.footer-status').exists()).toBe(true);
  });

  it('displays current profile correctly', () => {
    const wrapper = mount(Footer, {
      props: {
        currentProfile: 'dev',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const statusText = wrapper.find('.footer-status').text();
    expect(statusText).toContain('dev');
  });

  it('displays default profile when no prop provided', () => {
    const wrapper = mount(Footer, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const statusText = wrapper.find('.footer-status').text();
    expect(statusText).toContain('default');
  });

  it('displays status dot', () => {
    const wrapper = mount(Footer, {
      props: {
        currentProfile: 'production',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.footer-status-dot').exists()).toBe(true);
  });

  it('applies translation correctly', () => {
    const wrapper = mount(Footer, {
      props: {
        currentProfile: 'test-profile',
      },
      global: {
        mocks: {
          $t: (key) => `translated-${key}`,
        },
      },
    });

    const statusText = wrapper.find('.footer-status').text();
    expect(statusText).toContain('translated-api.currentConfig');
    expect(statusText).toContain('test-profile');
  });
});
