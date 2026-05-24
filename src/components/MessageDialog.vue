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
      <div class="message-dialog-title">{{ $t(dialog.title) }}</div>
      <div class="message-dialog-message">{{ $t(dialog.message, dialog.messageParams || {}) }}</div>
      <div class="dialog-actions">
        <button class="btn btn-primary" @click="handleConfirm">{{ $t('dialog.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * MessageDialog - 消息对话框组件
 */
interface DialogState {
  show: boolean
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  messageParams?: Record<string, unknown>
}

interface Props {
  dialog: DialogState
}

withDefaults(defineProps<Props>(), {
  dialog: () => ({
    show: false,
    type: 'info',
    title: '',
    message: '',
  }),
})

const emit = defineEmits<{
  close: []
}>()

const handleConfirm = (): void => {
  emit('close')
}
</script>

<style lang="less" scoped>
/* 样式继承自全局 global.less */
</style>
