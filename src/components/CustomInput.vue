<template>
  <input
    :type="type"
    :value="modelValue"
    class="form-input"
    @input="onInput"
    @compositionstart="isComposing = true"
    @compositionend="onCompositionEnd"
    v-bind="$attrs"
  />
</template>

<script setup>
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
})

const emit = defineEmits(['update:modelValue'])

const isComposing = ref(false)

function onInput(e) {
  if (isComposing.value) return
  let val = e.target.value
  if (props.type === 'number') {
    const parsed = parseFloat(val)
    val = isNaN(parsed) ? val : parsed
  }
  emit('update:modelValue', val)
}

function onCompositionEnd(e) {
  isComposing.value = false
  onInput(e)
}
</script>

<style scoped>
input {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

input::-webkit-inner-spin-button,
input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input::-webkit-search-decoration,
input::-webkit-search-cancel-button,
input::-webkit-search-results-button,
input::-webkit-search-results-decoration {
  -webkit-appearance: none;
}

input::-webkit-clear-button {
  -webkit-appearance: none;
}
</style>