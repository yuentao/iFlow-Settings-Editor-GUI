<template>
  <div class="empty-state" :class="{ 'empty-state--embedded': embedded }">
    <div class="empty-state-illustration">
      <slot name="icon">
        <component :is="icon" v-if="icon" size="48" class="empty-state-icon" />
      </slot>
    </div>
    <h3 class="empty-state-title">{{ title }}</h3>
    <p v-if="description" class="empty-state-desc">{{ description }}</p>
    <button
      v-if="actionText"
      class="empty-state-action btn btn-primary"
      @click="$emit('action')"
    >
      <Plus v-if="showPlusIcon" size="14" />
      {{ actionText }}
    </button>
  </div>
</template>

<script setup>
import { Plus } from '@icon-park/vue-next'

defineProps({
  icon: {
    type: [Object, Function],
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  actionText: {
    type: String,
    default: '',
  },
  showPlusIcon: {
    type: Boolean,
    default: true,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['action'])
</script>

<style lang="less" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--control-fill);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border);
  animation: fadeInUp 0.3s ease;
}

.empty-state-illustration {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.empty-state-icon {
  color: var(--accent);
  opacity: 0.7;
}

.empty-state-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}

.empty-state-desc {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  max-width: 280px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.empty-state-action {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-state--embedded {
  background: transparent;
  border: none;
}
</style>
