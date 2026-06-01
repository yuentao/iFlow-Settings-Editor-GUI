<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="[`toast-${toast.type}`]" @mouseenter="pauseTimer(toast.id)" @mouseleave="resumeTimer(toast.id)">
        <div class="toast-body">
          <div v-if="toast.title" class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, pauseTimer, resumeTimer } = useToast()
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
  gap: 10px;
  pointer-events: none;
  width: max-content;
  max-width: 440px;
}

.toast {
  pointer-events: auto;
  max-width: 440px;
  max-height: 200px;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  opacity: 0.95;
}

.toast-body {
  padding: 14px;
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

// ── Vue TransitionGroup animations ────────────────────────
.toast-enter-active {
  animation: toast-in var(--duration-slow) var(--ease-emphasized);
}

.toast-leave-active {
  animation: toast-out var(--duration-normal) var(--ease-in);
}

.toast-move {
  transition: transform var(--duration-slow) var(--ease-in-out);
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateY(100%);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(100%);
  }
}
</style>
