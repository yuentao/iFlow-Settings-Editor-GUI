<template>
  <div v-if="dialog.show" class="dialog-overlay dialog-overlay-top">
    <div class="dialog" @click.stop>
      <div class="dialog-title">{{ dialog.title }}</div>
      <div v-if="dialog.isConfirm" class="dialog-confirm-text">{{ dialog.placeholder }}</div>
      <input
        v-else
        type="text"
        class="form-input"
        v-model="inputValue"
        :placeholder="dialog.placeholder"
        @keyup.enter="$emit('confirm', dialog.isConfirm ? true : inputValue)"
        autofocus
      />
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('cancel')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" @click="$emit('confirm', dialog.isConfirm ? true : inputValue)">{{ $t('dialog.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  dialog: {
    type: Object,
    default: () => ({ show: false, title: '', placeholder: '', isConfirm: false })
  }
})

defineEmits(['confirm', 'cancel'])

const inputValue = ref('')

watch(() => props.dialog.show, (show) => {
  if (show) {
    inputValue.value = props.dialog.defaultValue || ''
  }
})
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
.dialog {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 360px;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}
.dialog-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 18px;
  letter-spacing: -0.01em;
}
.dialog-confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
