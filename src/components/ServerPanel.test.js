import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ServerPanel from './ServerPanel.vue';

describe('ServerPanel.vue', () => {
  const mockServerData = {
    name: 'Test Server',
    description: 'A test MCP server',
    command: 'npx',
    args: ['-y', 'package-name'],
    env: { DEBUG: 'true' },
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

      const nameInput = wrapper.findAll('.form-input').find(el => el.classes('field-key') === false)
      expect(nameInput).toBeTruthy()
    });

    it('has description textarea', () => {
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

      // description textarea is the first .form-textarea that's not .field-value
      const textareas = wrapper.findAll('.form-textarea')
      const descTextarea = textareas.find(el => !el.classes('field-value'))
      expect(descTextarea).toBeTruthy()
    });

    it('renders custom fields from server data', () => {
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

      // mockServerData has command, args, env => 3 custom fields
      const fieldRows = wrapper.findAll('.custom-field-row')
      expect(fieldRows.length).toBe(3)
    });

    it('has add field button', () => {
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

      expect(wrapper.find('.btn-add-field').exists()).toBe(true)
    })

    it('adds a new field when add button is clicked', async () => {
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

      const initialCount = wrapper.findAll('.custom-field-row').length
      await wrapper.find('.btn-add-field').trigger('click')
      expect(wrapper.findAll('.custom-field-row').length).toBe(initialCount + 1)
    })

    it('removes a field when remove button is clicked', async () => {
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

      const initialCount = wrapper.findAll('.custom-field-row').length
      await wrapper.findAll('.btn-remove')[0].trigger('click')
      expect(wrapper.findAll('.custom-field-row').length).toBe(initialCount - 1)
    })

    it('keeps at least one field when removing the last one', async () => {
      const singleFieldData = { name: 'test', description: 'desc', command: 'npx' }
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: singleFieldData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.findAll('.custom-field-row').length).toBe(1)
      await wrapper.find('.btn-remove').trigger('click')
      expect(wrapper.findAll('.custom-field-row').length).toBe(1)
    })
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

      await wrapper.find('.btn-secondary:not(.btn-add-field)').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits save with correct data when save button is clicked', async () => {
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
      const savedData = wrapper.emitted('save')[0][0];
      expect(savedData.name).toBe('Test Server');
      expect(savedData.description).toBe('A test MCP server');
      expect(savedData.command).toBe('npx');
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

      const nameInput = wrapper.findAll('.form-input').find(el => !el.classes('field-key'));
      expect(nameInput.element.value).toBe('New Server Name');
    });

    it('saves modified name', async () => {
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

      const nameInput = wrapper.findAll('.form-input').find(el => !el.classes('field-key'));
      await nameInput.setValue('Modified Name');

      await wrapper.find('.btn-primary').trigger('click');

      const savedData = wrapper.emitted('save')[0][0];
      expect(savedData.name).toBe('Modified Name');
    });

    it('parses JSON array values on save', async () => {
      const dataWithArgs = {
        name: 'test',
        description: 'desc',
        command: 'npx',
        args: ['--flag', 'value'],
      }
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: dataWithArgs
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');

      const savedData = wrapper.emitted('save')[0][0];
      expect(savedData.command).toBe('npx');
      expect(savedData.args).toEqual(['--flag', 'value']);
    });

    it('keeps string values as strings on save', async () => {
      const simpleData = {
        name: 'test',
        description: 'desc',
        command: 'npx',
      }
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: simpleData
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');

      const savedData = wrapper.emitted('save')[0][0];
      expect(savedData.command).toBe('npx');
    });

    it('hides internal fields starting with _ from UI', async () => {
      const dataWithInternal = {
        name: 'fetch',
        description: 'Fetch service',
        command: 'npx',
        _lastModified: '2026-04-29T14:33:34.289Z',
      }
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: dataWithInternal
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      // Only "command" should appear as a custom field, NOT "_lastModified"
      const fieldRows = wrapper.findAll('.custom-field-row')
      expect(fieldRows.length).toBe(1)
      const keyInput = fieldRows[0].find('.field-key')
      expect(keyInput.element.value).toBe('command')
    })

    it('preserves internal fields on save', async () => {
      const dataWithInternal = {
        name: 'fetch',
        description: 'Fetch service',
        command: 'npx',
        _lastModified: '2026-04-29T14:33:34.289Z',
      }
      const wrapper = mount(ServerPanel, {
        props: {
          show: true,
          isEditing: false,
          data: dataWithInternal
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');

      const savedData = wrapper.emitted('save')[0][0];
      expect(savedData._lastModified).toBe('2026-04-29T14:33:34.289Z')
      expect(savedData.command).toBe('npx')
    })
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
