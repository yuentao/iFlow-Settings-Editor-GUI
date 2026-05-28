<template>
  <Teleport to="body">
    <Transition name="applying">
      <div v-if="visible" class="applying-overlay">
        <div class="applying-dialog">
          <div class="applying-spinner"></div>
          <div class="applying-text">{{ text }}</div>
          <div v-if="progress && progress.total > 0" class="applying-progress">
            <div class="applying-progress-bar">
              <div class="applying-progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <div class="applying-progress-text">
              {{ progress.current }} / {{ progress.total }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  text: {
    type: String,
    default: '',
  },
  progress: {
    type: Object,
    default: null,
  },
})

const progressPercent = computed(() => {
  if (!props.progress || props.progress.total === 0) return 0
  return Math.round((props.progress.current / props.progress.total) * 100)
})
</script>

<style lang="less" scoped>
.applying-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.applying-dialog {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-xl);
}

.applying-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.applying-text {
  font-size: 14px;
  color: var(--text-primary);
  text-align: center;
  max-width: 280px;
}

.applying-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.applying-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.applying-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.applying-progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

// Transition
.applying-enter-active {
  animation: overlay-in 0.2s ease;

  .applying-dialog {
    animation: dialog-in 0.2s cubic-bezier(0.15, 0.85, 0.35, 1);
  }
}

.applying-leave-active {
  animation: overlay-out 0.15s ease;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes overlay-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>