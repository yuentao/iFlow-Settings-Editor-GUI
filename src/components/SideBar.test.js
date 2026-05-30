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

  it('has nine nav items', () => {
    const wrapper = mount(SideBar, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const navItems = wrapper.findAll('.nav-item');
    expect(navItems.length).toBe(9);
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
    // Order: Dashboard(0), API Config(1), General Settings(2), MCP(3), Skills(4), Commands(5)
    expect(navItems[0].classes('active')).toBe(false); // Dashboard
    expect(navItems[1].classes('active')).toBe(true);  // API Config
    expect(navItems[2].classes('active')).toBe(false);  // General Settings
    expect(navItems[3].classes('active')).toBe(false); // MCP
  });

  it('emits navigate event when nav item is clicked', async () => {
    const wrapper = mount(SideBar, {
      props: {
        currentSection: 'dashboard',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const navItems = wrapper.findAll('.nav-item');
    // Order: Dashboard(0), API Config(1), Basic Settings(2), MCP(3), Skills(4), Commands(5), CloudSync(6)
    await navItems[2].trigger('click'); // Click Basic Settings

    expect(wrapper.emitted('navigate')).toBeTruthy();
    expect(wrapper.emitted('navigate')[0][0]).toBe('general');
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
    // Order: Dashboard(0), API Config(1), General Settings(2), Projects(3), MCP(4), iFlow Mod(5), Skills(6), Commands(7), Docs(8)
    expect(navItems[0].text()).toBe('translated-sidebar.dashboard');
    expect(navItems[1].text()).toBe('translated-sidebar.apiConfig');
    expect(navItems[2].text()).toBe('translated-sidebar.generalSettings');
    expect(navItems[3].text()).toBe('translated-sidebar.projects');
    expect(navItems[4].text()).toBe('translated-sidebar.mcpServers');
    expect(navItems[5].text()).toBe('translated-sidebar.iflowMod');
    expect(navItems[6].text()).toBe('translated-sidebar.skills');
    expect(navItems[7].text()).toBe('translated-sidebar.commands');
    expect(navItems[8].text()).toBe('translated-sidebar.docs');
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
    expect(navItems[3].classes('active')).toBe(false);
  });
});
