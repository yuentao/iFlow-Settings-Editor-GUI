<template>
  <div v-if="dialog.show" class="dialog-overlay dialog-overlay-top" @keyup.esc="handleCancel" tabindex="-1" ref="overlayRef">
    <div class="dialog" @click.stop>
      <div class="dialog-title">{{ $t(dialog.title) }}</div>
      <div v-if="dialog.isConfirm" class="dialog-confirm-text">{{ $t(dialog.placeholder, { name: dialog.name, conflict: dialog.conflict }) }}</div>
      <custom-input
        v-else
        type="text"
        v-model="inputValue"
        :placeholder="dialog.placeholder"
        @keyup.enter="$emit('confirm', dialog.isConfirm ? true : inputValue)"
        autofocus
      />
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="handleCancel">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" @click="handleConfirm">{{ $t('dialog.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * InputDialog - 输入对话框组件
 */
import CustomInput from './CustomInput.vue'
import { ref, watch, nextTick, onMounted } from 'vue'

interface DialogState {
  show: boolean
  title: string
  placeholder: string
  isConfirm: boolean
  defaultValue?: string
  name?: string
  conflict?: string
}

interface Props {
  dialog: DialogState
}

const props = withDefaults(defineProps<Props>(), {
  dialog: () => ({
    show: false,
    title: '',
    placeholder: '',
    isConfirm: false,
  }),
})

const emit = defineEmits<{
  confirm: [value: string | boolean]
  cancel: []
}>()

const inputValue = ref('')
const overlayRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (props.dialog.show) {
    inputValue.value = props.dialog.defaultValue || ''
    nextTick(() => {
      overlayRef.value?.focus()
    })
  }
})

watch(() => props.dialog.show, (show: boolean) => {
  if (show) {
    inputValue.value = props.dialog.defaultValue || ''
    nextTick(() => {
      overlayRef.value?.focus()
    })
  }
})

const handleConfirm = (): void => {
  emit('confirm', props.dialog.isConfirm ? true : inputValue.value)
}

const handleCancel = (): void => {
  emit('cancel')
}
</script>

<style lang="less" scoped>
/* 样式继承自全局 global.less */
</style>
