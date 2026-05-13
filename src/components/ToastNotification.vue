<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="[`toast-${toast.type}`]"
        @mouseenter="pauseTimer(toast.id)"
        @mouseleave="resumeTimer(toast.id)"
      >
        <div class="toast-icon">
          <svg v-if="toast.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <svg v-else-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <svg v-else-if="toast.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <svg v-else-if="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div class="toast-body">
          <div v-if="toast.title" class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" @click="removeToast(toast.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div class="toast-progress" :style="{ animationDuration: `${toast.duration}ms` }" />
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, removeToast, pauseTimer, resumeTimer } = useToast()
</script>

<style lang="less" scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
  width: max-content;
  max-width: 420px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  min-width: 280px;
  max-width: 380px;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
  }
}

.toast-info .toast-icon {
  color: var(--info);
}

.toast-success .toast-icon {
  color: var(--success);
}

.toast-warning .toast-icon {
  color: var(--warning);
}

.toast-error .toast-icon {
  color: var(--danger);
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  line-height: 1.4;
}

.toast-message {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  word-break: break-word;
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition);
  padding: 0;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }

  &:active {
    background: var(--control-fill-pressed);
  }
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  animation: toast-countdown linear forwards;

  .toast-info & {
    background: var(--info);
  }
  .toast-success & {
    background: var(--success);
  }
  .toast-warning & {
    background: var(--warning);
  }
  .toast-error & {
    background: var(--danger);
  }
}

@keyframes toast-countdown {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

// Vue TransitionGroup animations
.toast-enter-active {
  animation: toast-in 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.toast-leave-active {
  animation: toast-out 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.toast-move {
  transition: transform 0.2s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
}
</style>
