import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ServerPanel from './ServerPanel.vue';

describe('ServerPanel.vue', () => {
  const mockServerData = {
    name: 'TestServer',
    description: 'A test MCP server',
    command: 'npx',
    args: ['-y', 'package-name'],
    env: { DEBUG: 'true' },
    customField1: 'val1',
    customField2: 'val2',
    customField3: 'val3',
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

      // 重构后 wrapper 始终渲染，通过 .visible 类控制显隐
      expect(wrapper.find('.side-panel-wrapper').classes('visible')).toBe(false);
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

    it('renders custom fields from server data', async () => {
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

      // 展开高级配置区域（custom fields 在 v-if="advancedExpanded" 内）
      await wrapper.find('.advanced-config-header').trigger('click')
      // mockServerData has customField1, customField2, customField3 => 3 custom fields
      const fieldRows = wrapper.findAll('.custom-field-row')
      expect(fieldRows.length).toBe(3)
    });

    it('has add field button', async () => {
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

      // 展开高级配置区域
      await wrapper.find('.advanced-config-header').trigger('click')
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

      // 展开高级配置区域
      await wrapper.find('.advanced-config-header').trigger('click')
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

      // 展开高级配置区域
      await wrapper.find('.advanced-config-header').trigger('click')
      const initialCount = wrapper.findAll('.custom-field-row').length
      // 精确点击 custom field 区域内的 remove 按钮（避免误点 args/headers/env 的 remove）
      await wrapper.find('.custom-field-row .btn-remove').trigger('click')
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

      // 展开高级配置区域
      await wrapper.find('.advanced-config-header').trigger('click')
      expect(wrapper.findAll('.custom-field-row').length).toBe(1)
      // 精确点击 custom field 区域内的 remove 按钮
      await wrapper.find('.custom-field-row .btn-remove').trigger('click')
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

      // Footer 的 cancel 按钮是最后一个 .btn-secondary（前面有 .btn-browse, .btn-add-item, .btn-add-field 等）
      const secondaryBtns = wrapper.findAll('.btn-secondary');
      await secondaryBtns[secondaryBtns.length - 1].trigger('click');
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
      expect(savedData.name).toBe('TestServer');
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
      await nameInput.setValue('ModifiedName');

      await wrapper.find('.btn-primary').trigger('click');

      const savedData = wrapper.emitted('save')[0][0];
      expect(savedData.name).toBe('ModifiedName');
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

      // ServerPanel 重构后 command/args/env 已是独立的结构化字段，不再出现在 custom-field-row 中
      // 此测试核心目标：验证 _ 开头的内部字段不暴露到 UI
      const fieldRows = wrapper.findAll('.custom-field-row')
      // 无真正的自定义字段时会默认填充 1 个空字段，确保 _lastModified 没作为 key 出现
      const keys = fieldRows.map(row => row.find('.field-key').element.value)
      expect(keys).not.toContain('_lastModified')
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

      // ServerPanel 的 esc 监听器绑定在 .side-panel-overlay 元素上（带 tabindex），需直接触发
      await wrapper.find('.side-panel-overlay').trigger('keyup.esc');
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
