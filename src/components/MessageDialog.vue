<template>
  <div v-if="dialog.show" class="dialog-overlay dialog-overlay-top">
    <div class="dialog message-dialog" @click.stop>
      <div class="message-dialog-icon" :class="'message-dialog-icon-' + dialog.type">
        <svg v-if="dialog.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <svg v-else-if="dialog.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <svg v-else-if="dialog.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <svg v-else-if="dialog.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <div class="message-dialog-title">{{ dialog.title }}</div>
      <div class="message-dialog-message">{{ dialog.message }}</div>
      <div class="dialog-actions">
        <button class="btn btn-primary" @click="$emit('close')">{{ $t('dialog.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  dialog: {
    type: Object,
    default: () => ({ show: false, type: 'info', title: '', message: '' })
  }
})

defineEmits(['close'])
</script>

<style lang="less" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.message-dialog {
  position: relative;
  text-align: center;
  padding: 32px 24px;
  z-index: 1400;
}
.message-dialog-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.message-dialog-icon svg {
  width: 24px;
  height: 24px;
}
.message-dialog-icon-info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent);
}
.message-dialog-icon-success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}
.message-dialog-icon-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.message-dialog-icon-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}
.message-dialog-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.message-dialog-message {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.message-dialog .dialog-actions {
  justify-content: center;
  margin-top: 24px;
}
</style>
