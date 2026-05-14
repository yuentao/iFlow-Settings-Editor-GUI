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
/* 样式继承自全局 global.less */
</style>