import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ApiProfileDialog from './ApiProfileDialog.vue';

describe('ApiProfileDialog.vue', () => {
  const mockCreateData = {
    name: '',
    selectedAuthType: 'openai-compatible',
    apiKey: '',
    baseUrl: '',
    modelName: ''
  };

  const mockEditData = {
    name: 'production',
    selectedAuthType: 'openai-compatible',
    apiKey: 'test-key',
    baseUrl: 'https://api.test.com',
    modelName: 'gpt-4'
  };

  describe('Create Dialog', () => {
    it('renders create dialog when showCreate is true', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.api-edit-dialog').exists()).toBe(true);
      expect(wrapper.find('.dialog-title').text()).toContain('api.createTitle');
    });

    it('does not render when showCreate is false', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.api-edit-dialog').exists()).toBe(false);
    });

    it('has config name input in create dialog', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
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

    it('has auth type select in create dialog', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const selects = wrapper.findAll('.form-select');
      expect(selects.length).toBe(1);
    });

    it('emits close-create when cancel button is clicked', async () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-secondary').trigger('click');
      expect(wrapper.emitted('close-create')).toBeTruthy();
    });

    it('emits save-create with data when save button is clicked', async () => {
      const validCreateData = {
        name: 'new-config',
        selectedAuthType: 'openai-compatible',
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        modelName: 'gpt-4'
      };
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: validCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');
      expect(wrapper.emitted('save-create')).toBeTruthy();
      expect(wrapper.emitted('save-create')[0][0].name).toBe('new-config');
    });

    it('has create and cancel buttons', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const buttons = wrapper.findAll('.btn');
      expect(buttons.length).toBe(2);
      expect(buttons[0].classes()).toContain('btn-secondary');
      expect(buttons[1].classes()).toContain('btn-primary');
    });
  });

  describe('Edit Dialog', () => {
    it('renders edit dialog when showEdit is true', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: mockEditData,
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.api-edit-dialog').exists()).toBe(true);
      expect(wrapper.find('.dialog-title').text()).toContain('api.editTitle');
    });

    it('shows config name as readonly when editing current profile', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: mockEditData,
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const nameInput = wrapper.find('.form-input');
      expect(nameInput.attributes('disabled')).toBeDefined();
    });

    it('allows editing config name when not current profile', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: { ...mockEditData, name: 'other-config' },
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const nameInput = wrapper.find('.form-input');
      expect(nameInput.attributes('disabled')).toBeUndefined();
    });

    it('has correct number of form groups in edit dialog', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: mockEditData,
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const formGroups = wrapper.findAll('.form-group');
      expect(formGroups.length).toBe(5); // name, authType, apiKey, baseUrl, modelName
    });

    it('emits close-edit when cancel button is clicked', async () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: mockEditData,
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-secondary').trigger('click');
      expect(wrapper.emitted('close-edit')).toBeTruthy();
    });

    it('emits save-edit with data when save button is clicked', async () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: mockEditData,
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');
      expect(wrapper.emitted('save-edit')).toBeTruthy();
      expect(wrapper.emitted('save-edit')[0][0].name).toBe('production');
    });

    it('has form-row for baseUrl and modelName', () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: mockEditData,
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.form-row').exists()).toBe(true);
    });
  });

  describe('Dialog Overlay', () => {
    it('closes on escape key when showCreate is true', async () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.dialog-overlay').trigger('keyup.esc');
      expect(wrapper.emitted('close-create')).toBeTruthy();
    });

    it('closes on escape key when showEdit is true', async () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: false,
          showEdit: true,
          createData: {},
          editData: mockEditData,
          currentProfileName: 'production'
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.dialog-overlay').trigger('keyup.esc');
      expect(wrapper.emitted('close-edit')).toBeTruthy();
    });

    it('does not close when clicking on dialog content', async () => {
      const wrapper = mount(ApiProfileDialog, {
        props: {
          showCreate: true,
          showEdit: false,
          createData: mockCreateData,
          editData: {}
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.api-edit-dialog').trigger('click');
      expect(wrapper.emitted('close-create')).toBeFalsy();
    });
  });
});
