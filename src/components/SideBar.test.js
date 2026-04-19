import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SideBar from './SideBar.vue';

describe('SideBar.vue', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(SideBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.sidebar').exists()).toBe(true);
  });

  it('has four nav items', () => {
    const wrapper = mount(SideBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const navItems = wrapper.findAll('.nav-item');
    expect(navItems.length).toBe(4);
  });

  it('has two sections', () => {
    const wrapper = mount(SideBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const sections = wrapper.findAll('.sidebar-section');
    expect(sections.length).toBe(2);
  });

  it('highlights active section correctly', () => {
    const wrapper = mount(SideBar, {
      props: {
        currentSection: 'api',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const navItems = wrapper.findAll('.nav-item');
    expect(navItems[0].classes('active')).toBe(false);
    expect(navItems[1].classes('active')).toBe(true);
    expect(navItems[2].classes('active')).toBe(false);
  });

  it('emits navigate event when nav item is clicked', async () => {
    const wrapper = mount(SideBar, {
      props: {
        currentSection: 'general',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const navItems = wrapper.findAll('.nav-item');
    await navItems[1].trigger('click');

    expect(wrapper.emitted('navigate')).toBeTruthy();
    expect(wrapper.emitted('navigate')[0][0]).toBe('api');
  });

  it('displays server count badge correctly', () => {
    const wrapper = mount(SideBar, {
      props: {
        currentSection: 'general',
        serverCount: 5
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const badges = wrapper.findAll('.nav-item-badge');
    expect(badges.length).toBe(2); // MCP and Skills both show badges
    expect(badges[0].text()).toBe('5');
  });

  it('displays zero server count', () => {
    const wrapper = mount(SideBar, {
      props: {
        currentSection: 'general',
        serverCount: 0
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const badges = wrapper.findAll('.nav-item-badge');
    expect(badges.length).toBe(2); // MCP and Skills both show badges
    expect(badges[0].text()).toBe('0');
  });

  it('applies translation to section titles', () => {
    const wrapper = mount(SideBar, {
      global: {
        mocks: {
          $t: (key) => `translated-${key}`,
        },
      },
    });

    const sectionTitles = wrapper.findAll('.sidebar-title');
    expect(sectionTitles[0].text()).toBe('translated-sidebar.general');
    expect(sectionTitles[1].text()).toBe('translated-sidebar.advanced');
  });

  it('applies translation to nav item texts', () => {
    const wrapper = mount(SideBar, {
      global: {
        mocks: {
          $t: (key) => `translated-${key}`,
        },
      },
    });

    const navItems = wrapper.findAll('.nav-item-text');
    expect(navItems[0].text()).toBe('translated-sidebar.basicSettings');
    expect(navItems[1].text()).toBe('translated-sidebar.apiConfig');
    expect(navItems[2].text()).toBe('translated-sidebar.mcpServers');
  });

  it('handles null currentSection', () => {
    const wrapper = mount(SideBar, {
      props: {
        currentSection: null,
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const navItems = wrapper.findAll('.nav-item');
    expect(navItems[0].classes('active')).toBe(false);
    expect(navItems[1].classes('active')).toBe(false);
    expect(navItems[2].classes('active')).toBe(false);
  });
});
