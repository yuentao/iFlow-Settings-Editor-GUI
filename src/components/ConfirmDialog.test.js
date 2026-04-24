import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmDialog from './ConfirmDialog.vue';

describe('ConfirmDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.dialog-overlay').exists()).toBe(true);
    expect(wrapper.find('.message-dialog').exists()).toBe(true);
  });

  it('displays warning icon', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.message-dialog-icon-warning').exists()).toBe(true);
    expect(wrapper.find('.message-dialog-icon-warning svg').exists()).toBe(true);
  });

  it('displays title from titleKey prop', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        titleKey: 'messages.warning',
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    expect(wrapper.find('.message-dialog-title').text()).toBe('messages.warning');
  });

  it('displays message from messageKey prop with translation', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => `translated-${key}`,
        },
      },
    });

    expect(wrapper.find('.message-dialog-message').text()).toBe('translated-messages.confirmDelete');
  });

  it('displays message with params when messageParams provided', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
        messageParams: { name: 'test-item' },
      },
      global: {
        mocks: {
          $t: (key, params) => params ? `${key}:${params.name}` : key,
        },
      },
    });

    expect(wrapper.find('.message-dialog-message').text()).toContain('test-item');
  });

  it('has cancel and confirm buttons', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    const buttons = wrapper.findAll('.dialog-actions .btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].text()).toBe('dialog.cancel');
    expect(buttons[1].text()).toBe('dialog.confirm');
  });

  it('emits cancel event when cancel button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.findAll('.dialog-actions .btn')[0].trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('emits confirm event when confirm button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.findAll('.dialog-actions .btn')[1].trigger('click');
    expect(wrapper.emitted('confirm')).toBeTruthy();
  });

  it('closes when clicking overlay', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.find('.dialog-overlay').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('does not close when clicking dialog itself', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        messageKey: 'messages.confirmDelete',
      },
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await wrapper.find('.message-dialog').trigger('click');
    // Should NOT emit cancel when clicking the dialog (not the overlay)
    expect(wrapper.emitted('cancel')).toBeFalsy();
  });
});
