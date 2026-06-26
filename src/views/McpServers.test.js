import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import McpServers from './McpServers.vue';

describe('McpServers.vue', () => {
  const mockServers = {
    'server1': {
      description: '第一个服务器',
      command: 'node server.js',
      args: ['--port', '3000'],
      env: {}
    },
    'server2': {
      description: '第二个服务器',
      command: 'python server.py',
      args: [],
      env: { 'PYTHONPATH': '/path/to/python' }
    },
    'server3': {
      command: 'java -jar server.jar',
      args: [],
      env: {}
    }
  };

  it('renders correctly with props', () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: mockServers,
        serverCount: 3
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.content-title').exists()).toBe(true);
    expect(wrapper.find('.generic-list').exists()).toBe(true);
  });

  it('displays all servers', () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: mockServers,
        serverCount: 3
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const serverItems = wrapper.findAll('.generic-item');
    expect(serverItems.length).toBe(3);
  });

  it('shows empty state when no servers', () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: {},
        serverCount: 0
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state-title').exists()).toBe(true);
    expect(wrapper.find('.empty-state-desc').exists()).toBe(true);
    expect(wrapper.findAll('.generic-item').length).toBe(0);
  });

  it('emits add-server event when add button is clicked', async () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: mockServers,
        serverCount: 3
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.find('.btn-primary').trigger('click');
    expect(wrapper.emitted('add-server')).toBeTruthy();
  });

  it('displays correct server names', () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: mockServers,
        serverCount: 3
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const serverNames = wrapper.findAll('.server-name');
    expect(serverNames[0].text()).toBe('server1');
    expect(serverNames[1].text()).toBe('server2');
    expect(serverNames[2].text()).toBe('server3');
  });

  it('displays correct server descriptions', () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: mockServers,
        serverCount: 3
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const serverDescs = wrapper.findAll('.server-desc');
    expect(serverDescs[0].text()).toBe('第一个服务器');
    expect(serverDescs[1].text()).toBe('第二个服务器');
    expect(serverDescs[2].text()).toBe('mcp.noDescription');
  });

  it('handles zero serverCount with empty servers object', () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: {},
        serverCount: 0
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.findAll('.generic-item').length).toBe(0);
  });

  it('displays empty state title correctly', () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: {},
        serverCount: 0
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.empty-state-title').text()).toBe('mcp.noServers');
    expect(wrapper.find('.empty-state-desc').text()).toBe('mcp.addFirstServer');
  });

  it('emits edit-server event when edit action is clicked', async () => {
    const wrapper = mount(McpServers, {
      props: {
        servers: mockServers,
        serverCount: 3
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    // server1 的 edit 按钮（每个 item 有 3 个 action-btn：share, edit, delete）
    const actionBtns = wrapper.findAll('.generic-item')[0].findAll('.action-btn');
    await actionBtns[1].trigger('click');
    expect(wrapper.emitted('edit-server')).toBeTruthy();
    expect(wrapper.emitted('edit-server')[0][0]).toBe('server1');
  });
});