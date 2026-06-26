<template>
  <div class="dialog-overlay dialog-overlay-top" @click.self="$emit('cancel')" @keyup.esc="$emit('cancel')" tabindex="-1" ref="overlayRef">
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
        <button class="btn" :class="danger ? 'btn-danger' : 'btn-primary'" @click="$emit('confirm')" ref="confirmButtonRef">{{ $t('dialog.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const overlayRef = ref(null)
const confirmButtonRef = ref(null)

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
  },
  danger: {
    type: Boolean,
    default: false
  }
})

defineEmits(['confirm', 'cancel'])

onMounted(() => {
  nextTick(() => {
    confirmButtonRef.value?.focus() || overlayRef.value?.focus()
  })
})
</script>

<style lang="less" scoped>
/* 样式继承自全局 global.less */
</style>