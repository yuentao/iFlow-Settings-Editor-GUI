import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import SkillsView from './SkillsView.vue';

describe('SkillsView.vue', () => {
  const mockSkills = [
    {
      name: 'Skill One',
      description: '第一个技能',
      folderName: 'skill-one',
      size: 1024 * 50,
      path: '/path/to/skill-one',
      hasLicense: true
    },
    {
      name: 'Skill Two',
      description: '第二个技能',
      folderName: 'skill-two',
      size: 1024 * 1024 * 2.5,
      path: '/path/to/skill-two',
      hasLicense: false
    }
  ];

  beforeEach(() => {
    global.window.electronAPI = {
      listSkills: vi.fn().mockResolvedValue({ success: true, skills: mockSkills }),
      importSkillLocal: vi.fn(),
      importSkillOnline: vi.fn(),
      exportSkill: vi.fn(),
      deleteSkill: vi.fn()
    };
  });

  it('renders correctly with skills', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.content-title').exists()).toBe(true);
    expect(wrapper.find('.skill-list').exists()).toBe(true);
  });

  it('displays all skills', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const skillItems = wrapper.findAll('.skill-item');
    expect(skillItems.length).toBe(2);
  });

  it('shows empty state when no skills', async () => {
    window.electronAPI.listSkills.mockResolvedValueOnce({ success: true, skills: [] });

    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state-title').text()).toBe('skills.noSkills');
  });

  it('displays correct skill names', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const skillNames = wrapper.findAll('.skill-name');
    expect(skillNames[0].text()).toBe('Skill One');
    expect(skillNames[1].text()).toBe('Skill Two');
  });

  it('displays skill descriptions', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const skillDescs = wrapper.findAll('.skill-desc');
    expect(skillDescs[0].text()).toBe('第一个技能');
    expect(skillDescs[1].text()).toBe('第二个技能');
  });

  it('displays folder names', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const folderNames = wrapper.findAll('.skill-file');
    expect(folderNames[0].text()).toBe('skill-one');
    expect(folderNames[1].text()).toBe('skill-two');
  });

  it('formats file sizes correctly', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const sizeTexts = wrapper.findAll('.skill-size');
    expect(sizeTexts[0].text()).toBe('50.0 KB');
    expect(sizeTexts[1].text()).toBe('2.5 MB');
  });

  it('selects skill when clicked', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const skillItems = wrapper.findAll('.skill-item');
    await skillItems[0].trigger('click');

    expect(skillItems[0].classes('selected')).toBe(true);
  });

  it('calls importSkillLocal when import local button is clicked', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const importBtn = wrapper.find('.btn-primary');
    await importBtn.trigger('click');

    expect(window.electronAPI.importSkillLocal).toHaveBeenCalledOnce();
  });

  it('opens online import dialog when import online button is clicked', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const onlineBtn = wrapper.find('.btn-secondary');
    await onlineBtn.trigger('click');

    expect(wrapper.find('.dialog').exists()).toBe(true);
  });

  it('closes online import dialog', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    // Open dialog first
    await wrapper.find('.btn-secondary').trigger('click');
    // Close dialog
    await wrapper.find('.dialog .btn-secondary').trigger('click');

    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it('has two action buttons in skill item', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const skillItem = wrapper.find('.skill-item');
    const actionBtns = skillItem.findAll('.btn-icon');
    expect(actionBtns.length).toBe(2);
  });

  it('handles empty description gracefully', async () => {
    window.electronAPI.listSkills.mockResolvedValueOnce({
      success: true,
      skills: [{ name: 'NoDesc', description: '', folderName: 'nodesc', size: 100 }]
    });

    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const skillDesc = wrapper.find('.skill-desc');
    expect(skillDesc.text()).toBe('skills.noDescription');
  });

  it('handles null size gracefully', async () => {
    window.electronAPI.listSkills.mockResolvedValueOnce({
      success: true,
      skills: [{ name: 'NullSize', description: 'test', folderName: 'nullsize', size: null }]
    });

    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const sizeText = wrapper.find('.skill-size');
    expect(sizeText.text()).toBe('');
  });

  it('shows export and delete buttons on hover', async () => {
    const wrapper = mount(SkillsView, {
      global: {
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const skillItem = wrapper.find('.skill-item');
    await skillItem.trigger('mouseenter');

    const exportBtn = wrapper.find('.skill-export');
    const deleteBtn = wrapper.find('.skill-delete');
    expect(exportBtn.exists()).toBe(true);
    expect(deleteBtn.exists()).toBe(true);
  });
});
