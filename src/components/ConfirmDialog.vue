<template>
  <div class="dialog-overlay dialog-overlay-top" @click.self="$emit('cancel')">
    <div class="dialog message-dialog" @click.stop>
      <div class="message-dialog-icon message-dialog-icon-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div class="message-dialog-title">{{ $t(titleKey) }}</div>
      <div class="message-dialog-message">{{ $t(messageKey, messageParams) }}</div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('cancel')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" @click="$emit('confirm')">{{ $t('dialog.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  titleKey: {
    type: String,
    default: 'messages.warning'
  },
  messageKey: {
    type: String,
    default: ''
  },
  messageParams: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['confirm', 'cancel'])
</script>

<style lang="less" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
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
  padding: var(--space-2xl) var(--space-xl);
  animation: scaleIn 0.2s ease;
}

.message-dialog-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-md);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
  }
}

.message-dialog-icon-warning {
  background: var(--warning-bg);
  color: var(--warning);
}

.message-dialog-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--space-xs);
  color: var(--text-primary);
}

.message-dialog-message {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
  margin-top: var(--space-xl);

  .btn {
    min-width: 100px;
  }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
</style>