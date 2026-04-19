import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageDialog from './MessageDialog.vue';

describe('MessageDialog.vue', () => {
  describe('Basic Rendering', () => {
    it('renders when dialog show is true', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info Title',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.message-dialog').exists()).toBe(true);
    });

    it('does not render when dialog show is false', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: false,
            type: 'info',
            title: 'Info Title',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.message-dialog').exists()).toBe(false);
    });

    it('displays correct title', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Custom Title',
            message: 'Custom message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.message-dialog-title').text()).toBe('Custom Title');
    });

    it('displays correct message', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info Title',
            message: 'This is the message content'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      expect(wrapper.find('.message-dialog-message').text()).toBe('This is the message content');
    });
  });

  describe('Dialog Types', () => {
    it('shows info icon when type is info', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const iconContainer = wrapper.find('.message-dialog-icon');
      expect(iconContainer.classes()).toContain('message-dialog-icon-info');
    });

    it('shows success icon when type is success', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'success',
            title: 'Success',
            message: 'Success message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const iconContainer = wrapper.find('.message-dialog-icon');
      expect(iconContainer.classes()).toContain('message-dialog-icon-success');
    });

    it('shows warning icon when type is warning', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'warning',
            title: 'Warning',
            message: 'Warning message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const iconContainer = wrapper.find('.message-dialog-icon');
      expect(iconContainer.classes()).toContain('message-dialog-icon-warning');
    });

    it('shows error icon when type is error', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'error',
            title: 'Error',
            message: 'Error message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const iconContainer = wrapper.find('.message-dialog-icon');
      expect(iconContainer.classes()).toContain('message-dialog-icon-error');
    });
  });

  describe('Icon SVG', () => {
    it('renders info icon SVG correctly', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const svg = wrapper.find('.message-dialog-icon svg');
      expect(svg.exists()).toBe(true);
      expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    });

    it('renders success icon SVG with checkmark', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'success',
            title: 'Success',
            message: 'Success message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const paths = wrapper.findAll('.message-dialog-icon svg path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('renders warning icon SVG with triangle', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'warning',
            title: 'Warning',
            message: 'Warning message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const svg = wrapper.find('.message-dialog-icon svg');
      expect(svg.exists()).toBe(true);
    });

    it('renders error icon SVG with X', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'error',
            title: 'Error',
            message: 'Error message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const lines = wrapper.findAll('.message-dialog-icon svg line');
      expect(lines.length).toBe(2);
    });
  });

  describe('Actions', () => {
    it('has a confirm button', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const buttons = wrapper.findAll('.btn');
      expect(buttons.length).toBe(1);
      expect(buttons[0].classes()).toContain('btn-primary');
    });

    it('emits close when confirm button is clicked', async () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      await wrapper.find('.btn-primary').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('button text uses $t translation', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const button = wrapper.find('.btn-primary');
      expect(button.text()).toBe('dialog.confirm');
    });
  });

  describe('Dialog Structure', () => {
    it('has centered actions', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const actions = wrapper.find('.dialog-actions');
      expect(actions.exists()).toBe(true);
    });

    it('dialog has centered text alignment class', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const dialog = wrapper.find('.message-dialog');
      expect(dialog.exists()).toBe(true);
      expect(dialog.classes()).toContain('message-dialog');
    });

    it('icon container has correct size', () => {
      const wrapper = mount(MessageDialog, {
        props: {
          dialog: {
            show: true,
            type: 'info',
            title: 'Info',
            message: 'Info message'
          }
        },
        global: {
          mocks: {
            $t: (key) => key,
          },
        },
      });

      const icon = wrapper.find('.message-dialog-icon');
      expect(icon.exists()).toBe(true);
    });
  });
});