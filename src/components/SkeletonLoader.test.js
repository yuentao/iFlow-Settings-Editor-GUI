import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SkeletonLoader from './SkeletonLoader.vue';

describe('SkeletonLoader.vue', () => {
  describe('card type', () => {
    it('renders card skeleton by default', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'card',
        },
      });

      expect(wrapper.find('.skeleton-card-grid').exists()).toBe(true);
      expect(wrapper.find('.skeleton-card').exists()).toBe(true);
    });

    it('renders correct number of card items based on count prop', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'card',
          count: 3,
        },
      });

      expect(wrapper.findAll('.skeleton-card').length).toBe(3);
    });

    it('renders with correct number of columns', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'card',
          columns: 3,
        },
      });

      expect(wrapper.find('.skeleton-card-grid').attributes('style')).toContain('grid-template-columns');
    });

    it('card skeleton has circle and lines', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'card',
        },
      });

      expect(wrapper.find('.skeleton-circle').exists()).toBe(true);
      expect(wrapper.find('.skeleton-lines').exists()).toBe(true);
      expect(wrapper.find('.skeleton-line-label').exists()).toBe(true);
      expect(wrapper.find('.skeleton-line-value').exists()).toBe(true);
    });
  });

  describe('list type', () => {
    it('renders list skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'list',
        },
      });

      expect(wrapper.find('.skeleton-list').exists()).toBe(true);
      expect(wrapper.find('.skeleton-list-item').exists()).toBe(true);
    });

    it('renders correct number of list items', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'list',
          count: 5,
        },
      });

      expect(wrapper.findAll('.skeleton-list-item').length).toBe(5);
    });

    it('list items have small circle', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'list',
        },
      });

      expect(wrapper.find('.skeleton-circle-sm').exists()).toBe(true);
    });
  });

  describe('profile type', () => {
    it('renders profile skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'profile',
        },
      });

      expect(wrapper.find('.skeleton-list').exists()).toBe(true);
      expect(wrapper.find('.skeleton-avatar').exists()).toBe(true);
      expect(wrapper.find('.skeleton-badge').exists()).toBe(true);
    });

    it('renders correct number of profile items', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'profile',
          count: 2,
        },
      });

      expect(wrapper.findAll('.skeleton-list-item').length).toBe(2);
    });
  });

  describe('form type', () => {
    it('renders form skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'form',
        },
      });

      expect(wrapper.find('.skeleton-form').exists()).toBe(true);
      expect(wrapper.find('.skeleton-form-group').exists()).toBe(true);
    });

    it('renders correct number of form groups', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'form',
          count: 4,
        },
      });

      expect(wrapper.findAll('.skeleton-form-group').length).toBe(4);
    });

    it('form has skeleton input', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'form',
        },
      });

      expect(wrapper.find('.skeleton-input').exists()).toBe(true);
    });
  });

  describe('command type', () => {
    it('renders command skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'command',
        },
      });

      expect(wrapper.find('.skeleton-list').exists()).toBe(true);
      expect(wrapper.find('.skeleton-list-item').exists()).toBe(true);
    });

    it('renders correct number of command items', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'command',
          count: 6,
        },
      });

      expect(wrapper.findAll('.skeleton-list-item').length).toBe(6);
    });

    it('command skeleton has meta line', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'command',
        },
      });

      expect(wrapper.find('.skeleton-line-meta').exists()).toBe(true);
    });
  });

  describe('default behavior', () => {
    it('defaults to card type', () => {
      const wrapper = mount(SkeletonLoader);

      expect(wrapper.find('.skeleton-card-grid').exists()).toBe(true);
    });

    it('defaults count to 4', () => {
      const wrapper = mount(SkeletonLoader);

      expect(wrapper.findAll('.skeleton-card').length).toBe(4);
    });

    it('defaults columns to 2', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          type: 'card',
        },
      });

      expect(wrapper.vm.columns).toBe(2);
    });
  });
});
