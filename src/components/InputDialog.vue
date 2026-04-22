<template>
  <div v-if="dialog.show" class="dialog-overlay dialog-overlay-top">
    <div class="dialog" @click.stop>
      <div class="dialog-title">{{ $t(dialog.title) }}</div>
      <div v-if="dialog.isConfirm" class="dialog-confirm-text">{{ $t(dialog.placeholder, { name: dialog.name }) }}</div>
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
// Windows 11 Style Input Dialog - Fluent Design
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

.dialog {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  min-width: 360px;
  max-width: 480px;
  box-shadow: var(--shadow-xl);
  animation: scaleIn 0.2s ease;
}

.dialog-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--space-md);
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.dialog-confirm-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-xl);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
</style>
