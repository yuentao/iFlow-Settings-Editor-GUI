import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ServerPanel from './ServerPanel.vue';

describe('ServerPanel.vue', () => {
  const mockServerData = {
    name: 'Test Server',
    description: 'A test MCP server',
    command: 'npx',
    cwd: '/project',
    args: '--flag value',
    env: 'DEBUG=true'
  };

  describe('Basic Rendering', () => {
    it('renders when show is true', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.side-panel').exists()).toBe(true);
    });

    it('does not render when show is false', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: false,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.side-panel').exists()).toBe(false);
    });

    it('shows add server title when isEditing is false', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.side-panel-title').text()).toContain('mcp.addServer');
    });

    it('shows edit server title when isEditing is true', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: true,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.side-panel-title').text()).toContain('mcp.editServer');
    });
  });

  describe('Form Fields', () => {
    it('has server name input', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const inputs = wrapper.findAll('.form-input');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('has description input', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const inputs = wrapper.findAll('.form-input');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it('has command input', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const inputs = wrapper.findAll('.form-input');
      expect(inputs.length).toBeGreaterThanOrEqual(3);
    });

    it('has working directory input', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const inputs = wrapper.findAll('.form-input');
      expect(inputs.length).toBeGreaterThanOrEqual(4);
    });

    it('has args textarea', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const textareas = wrapper.findAll('.form-textarea');
      expect(textareas.length).toBe(2); // args and env
    });

    it('has env vars textarea', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const textareas = wrapper.findAll('.form-textarea');
      expect(textareas.length).toBe(2);
    });

    it('displays correct default values', async () => {
      const defaultData = {
        name: '',
        description: '',
        command: 'npx',
        cwd: '.',
        args: '',
        env: ''
      };

      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: defaultData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const commandInput = wrapper.findAll('.form-input')[2];
      expect(commandInput.element.value).toBe('npx');
    });
  });

  describe('Actions', () => {
    it('has cancel and save buttons', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const buttons = wrapper.findAll('.btn');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('emits close when cancel button is clicked', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-secondary').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits save with localData when save button is clicked', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')[0][0]).toEqual(mockServerData);
    });

    it('shows delete button only when editing', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: true,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const deleteBtn = wrapper.find('.btn-danger');
      expect(deleteBtn.exists()).toBe(true);
    });

    it('does not show delete button when not editing', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const deleteBtn = wrapper.find('.btn-danger');
      expect(deleteBtn.exists()).toBe(false);
    });

    it('emits delete when delete button is clicked', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: true,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-danger').trigger('click');
      expect(wrapper.emitted('delete')).toBeTruthy();
    });

    it('save button has correct label for add mode', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const saveBtn = wrapper.find('.btn-primary');
      expect(saveBtn.text()).toContain('mcp.addServer');
    });

    it('save button has correct label for edit mode', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: true,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const saveBtn = wrapper.find('.btn-primary');
      expect(saveBtn.text()).toContain('mcp.saveChanges');
    });
  });

  describe('Panel Structure', () => {
    it('has side panel header', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.side-panel-header').exists()).toBe(true);
    });

    it('has side panel body', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.side-panel-body').exists()).toBe(true);
    });

    it('has side panel footer', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.side-panel-footer').exists()).toBe(true);
    });

    it('has close button', () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const closeBtn = wrapper.find('.side-panel-close');
      expect(closeBtn.exists()).toBe(true);
    });

    it('emits close when close button is clicked', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.side-panel-close').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('Data Binding', () => {
    it('updates localData when props data changes', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const newData = { ...mockServerData, name: 'New Server Name' };
      await wrapper.setProps({ data: newData });

      const nameInput = wrapper.findAll('.form-input')[0];
      expect(nameInput.element.value).toBe('New Server Name');
    });

    it('saves modified data', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const nameInput = wrapper.findAll('.form-input')[0];
      await nameInput.setValue('Modified Name');

      await wrapper.find('.btn-primary').trigger('click');

      const savedData = wrapper.emitted('save')[0][0];
      expect(savedData.name).toBe('Modified Name');
    });
  });

  describe('Escape Key', () => {
    it('emits close on escape key', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.trigger('keyup.esc');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('does not close when clicking on panel content', async () => {
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: mockServerData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.side-panel-body').trigger('click');
      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });
});