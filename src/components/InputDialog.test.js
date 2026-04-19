import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import InputDialog from './InputDialog.vue';

describe('InputDialog.vue', () => {
  describe('Basic Rendering', () => {
    it('renders when dialog show is true', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Test Title',
            placeholder: 'Enter value',
            isConfirm: false
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.dialog').exists()).toBe(true);
      expect(wrapper.find('.dialog-title').text()).toBe('Test Title');
    });

    it('does not render when dialog show is false', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: false,
            title: 'Test Title'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.dialog').exists()).toBe(false);
    });

    it('has correct title', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'My Custom Title'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.dialog-title').text()).toBe('My Custom Title');
    });
  });

  describe('Input Mode', () => {
    it('shows text input when isConfirm is false', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Input Dialog',
            placeholder: 'Enter your name',
            isConfirm: false
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const input = wrapper.find('input[type="text"]');
      expect(input.exists()).toBe(true);
    });

    it('has correct placeholder', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Input Dialog',
            placeholder: 'Enter your name',
            isConfirm: false
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const input = wrapper.find('input[type="text"]');
      expect(input.attributes('placeholder')).toBe('Enter your name');
    });

    it('updates input value when typing', async () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Input Dialog',
            placeholder: 'Enter value',
            isConfirm: false
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const input = wrapper.find('input[type="text"]');
      await input.setValue('Test Value');

      const inputVm = wrapper.findComponent({ name: 'InputDialog' });
      expect(inputVm.vm.inputValue).toBe('Test Value');
    });
  });

  describe('Confirm Mode', () => {
    it('shows confirmation text when isConfirm is true', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Confirm Dialog',
            placeholder: 'Are you sure?',
            isConfirm: true
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const confirmText = wrapper.find('.dialog-confirm-text');
      expect(confirmText.exists()).toBe(true);
      expect(confirmText.text()).toBe('Are you sure?');
    });

    it('does not show input when isConfirm is true', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Confirm Dialog',
            placeholder: 'Are you sure?',
            isConfirm: true
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const input = wrapper.find('input[type="text"]');
      expect(input.exists()).toBe(false);
    });
  });

  describe('Actions', () => {
    it('has cancel and confirm buttons', () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Test Dialog'
          }
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

    it('emits cancel when cancel button is clicked', async () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Test Dialog'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-secondary').trigger('click');
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('emits confirm with input value in input mode', async () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Input Dialog',
            placeholder: 'Enter value',
            isConfirm: false
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('input[type="text"]').setValue('Test Value');
      await wrapper.find('.btn-primary').trigger('click');

      expect(wrapper.emitted('confirm')).toBeTruthy();
      expect(wrapper.emitted('confirm')[0][0]).toBe('Test Value');
    });

    it('emits confirm with true in confirm mode', async () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Confirm Dialog',
            placeholder: 'Are you sure?',
            isConfirm: true
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');

      expect(wrapper.emitted('confirm')).toBeTruthy();
      expect(wrapper.emitted('confirm')[0][0]).toBe(true);
    });

    it('emits confirm on Enter key in input mode', async () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Input Dialog',
            placeholder: 'Enter value',
            isConfirm: false
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('input[type="text"]').setValue('Enter Value');
      await wrapper.find('input[type="text"]').trigger('keyup.enter');

      expect(wrapper.emitted('confirm')).toBeTruthy();
      expect(wrapper.emitted('confirm')[0][0]).toBe('Enter Value');
    });
  });

  describe('Watch Behavior', () => {
    it('clears input value when dialog show becomes true', async () => {
      const wrapper = mount(InputDialog, {
        props: {
          dialog: {
            show: true,
            title: 'Test'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      // Initial value should be empty
      const inputVm = wrapper.findComponent({ name: 'InputDialog' });
      expect(inputVm.vm.inputValue).toBe('');
    });
  });
});