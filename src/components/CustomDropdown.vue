<template>
  <div class="custom-dropdown" ref="dropdownRef">
    <div
      class="dropdown-trigger"
      :class="{ open: isOpen, disabled: disabled, mono: mono }"
      @click="toggleDropdown"
    >
      <span class="dropdown-value" :class="{ placeholder: !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <svg
        class="dropdown-arrow"
        :class="{ open: isOpen }"
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
      >
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <Transition name="dropdown">
      <div v-if="isOpen && !disabled" class="dropdown-menu">
        <div
          v-for="opt in options"
          :key="opt.value"
          class="dropdown-option"
          :class="{ selected: modelValue === opt.value, mono: mono, disabled: opt.disabled }"
          @click="selectOption(opt)"
        >
          {{ opt.label }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  mono: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const dropdownRef = ref(null)

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt ? opt.label : null
})

function toggleDropdown() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

function selectOption(opt) {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  isOpen.value = false
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped>
.custom-dropdown {
  position: relative;
  width: 100%;
}

.dropdown-trigger {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  background: var(--control-fill);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  box-sizing: border-box;
  transition: border-color var(--transition), background var(--transition);
  line-height: normal;
  user-select: none;
}

.dropdown-trigger:hover {
  border-color: var(--border-strong);
  background: var(--control-fill);
}

.dropdown-trigger.open {
  background: var(--bg-tertiary);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.dropdown-trigger.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-trigger.mono,
.dropdown-option.mono {
  font-family: var(--font-mono);
}

.dropdown-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-value.placeholder {
  color: var(--text-tertiary);
  opacity: 0.7;
}

.dropdown-arrow {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform 0.15s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-option {
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.1s ease;
  user-select: none;
}

.dropdown-option:hover {
  background: var(--control-fill);
}

.dropdown-option.selected {
  color: var(--accent);
  background: var(--accent-glow);
}

.dropdown-option.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>