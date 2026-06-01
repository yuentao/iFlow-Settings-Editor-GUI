<template>
  <label class="toggle-switch" :class="{ 'toggle-switch-sm': small }" @click.stop>
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @click="onClick"
      @change="onChange"
      v-bind="$attrs" />
    <span class="toggle-slider"></span>
  </label>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    checked?: boolean
    disabled?: boolean
    small?: boolean
    /** Controlled mode: prevents native checkbox toggle so the parent fully
     *  controls the state. Use when the parent needs async validation
     *  (e.g. password dialog) before committing the change. */
    controlled?: boolean
  }>(),
  {
    modelValue: undefined,
    checked: undefined,
    disabled: false,
    small: false,
    controlled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [event: Event]
}>()

const onClick = (e: Event) => {
  if (props.controlled) {
    // Prevent native checkbox toggle — the parent decides the state
    e.preventDefault()
    emit('update:modelValue', !props.modelValue)
    emit('change', e)
  }
  // In uncontrolled (v-model) mode, let the native checkbox toggle freely.
  // The @change event will fire after the toggle completes.
}

const onChange = (e: Event) => {
  if (props.controlled) return // Already handled in onClick
  const checked = (e.target as HTMLInputElement).checked
  emit('update:modelValue', checked)
  emit('change', e)
}
</script>

<style scoped lang="less">
// ============================================
// ToggleSwitch — Windows 11 Fluent 2 ToggleSwitch
// Track: pill shape, Off=neutral border, On=accent fill
// Thumb: 12px circle with 1.5px stroke, slides with cubic-bezier
// ============================================
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;

    &:focus-visible + .toggle-slider {
      outline: 2px solid var(--text-primary);
      outline-offset: 1px;
    }
  }
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--bg-elevated);
  border: 1.5px solid var(--border-strong);
  border-radius: 10px;
  transition:
    background-color var(--duration-slow) var(--ease-emphasized),
    border-color var(--duration-slow) var(--ease-emphasized);

  &:before {
    position: absolute;
    content: '';
    height: 12px;
    width: 12px;
    left: 3px;
    top: 50%;
    transform: translateY(-50%);
    background-color: var(--border-strong);
    border: 1.5px solid var(--bg-elevated);
    border-radius: 50%;
    transition:
      transform var(--duration-slow) var(--ease-emphasized),
      background-color var(--duration-slow) var(--ease-emphasized),
      border-color var(--duration-slow) var(--ease-emphasized);
  }

  &:hover {
    background-color: var(--bg-elevated);
    border-color: var(--text-tertiary);

    &:before {
      background-color: var(--text-tertiary);
    }
  }
}

input:checked + .toggle-slider {
  background-color: var(--accent);
  border-color: var(--accent);

  &:before {
    transform: translateX(20px) translateY(-50%);
    background-color: #ffffff;
    border-color: var(--accent);
  }

  &:hover {
    background-color: var(--accent-hover);
    border-color: var(--accent-hover);
  }
}

input:disabled + .toggle-slider {
  cursor: not-allowed;
  opacity: 0.45;
}

// Small variant
.toggle-switch-sm {
  width: 32px;
  height: 16px;

  .toggle-slider {
    border-radius: 8px;

    &:before {
      height: 8px;
      width: 8px;
      border-width: 1.5px;
    }
  }

  input:checked + .toggle-slider:before {
    transform: translateX(16px) translateY(-50%);
  }
}

// Dark mode adjustments
:global(.dark) .toggle-slider {
  background-color: var(--bg-tertiary);
  border-color: var(--border);

  &:before {
    background-color: var(--text-tertiary);
  }

  &:hover {
    border-color: var(--text-secondary);

    &:before {
      background-color: var(--text-secondary);
    }
  }
}

:global(.dark) input:checked + .toggle-slider {
  background-color: var(--accent);
  border-color: var(--accent);

  &:before {
    background-color: var(--bg-primary);
    border-color: var(--accent);
  }

  &:hover {
    background-color: var(--accent-hover);
    border-color: var(--accent-hover);
  }
}
</style>