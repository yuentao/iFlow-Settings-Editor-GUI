<template>
  <div v-if="show" class="dialog-overlay">
    <div class="dialog command-editor-dialog" @click.stop>
      <div class="dialog-title">
        {{ command ? $t('commands.editor.editTitle') : $t('commands.editor.createTitle') }}
      </div>

      <div class="dialog-body">
        <!-- Command Name -->
        <div class="form-group" v-if="command">
          <label class="form-label">{{ $t('commands.editor.name') }}</label>
          <input type="text" class="form-input" :value="command.name" disabled />
        </div>
        <div class="form-group" v-else>
          <label class="form-label">{{ $t('commands.editor.name') }} *</label>
          <input
            type="text"
            class="form-input"
            v-model="formData.name"
            :placeholder="$t('commands.editor.namePlaceholder')"
            @keyup.enter="save"
          />
          <div class="form-hint">{{ $t('commands.editor.nameHint') }}</div>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label class="form-label">{{ $t('commands.editor.description') }} *</label>
          <input
            type="text"
            class="form-input"
            v-model="formData.description"
            :placeholder="$t('commands.editor.descriptionPlaceholder')"
            @keyup.enter="save"
          />
        </div>

        <!-- Category -->
        <div class="form-group">
          <label class="form-label">{{ $t('commands.editor.category') }}</label>
          <select class="form-select" v-model="formData.category">
            <option value="utility">{{ $t('commands.category.utility') }}</option>
            <option value="documentation">{{ $t('commands.category.documentation') }}</option>
            <option value="other">{{ $t('commands.category.other') }}</option>
          </select>
        </div>

        <!-- Version -->
        <div class="form-group">
          <label class="form-label">{{ $t('commands.editor.version') }}</label>
          <input
            type="text"
            class="form-input"
            v-model="formData.version"
            placeholder="1"
            style="width: 100px"
          />
        </div>

        <!-- Author -->
        <div class="form-group">
          <label class="form-label">{{ $t('commands.editor.author') }}</label>
          <input
            type="text"
            class="form-input"
            v-model="formData.author"
            :placeholder="$t('commands.editor.authorPlaceholder')"
          />
        </div>

        <!-- Prompt -->
        <div class="form-group">
          <label class="form-label">{{ $t('commands.editor.prompt') }} *</label>
          <textarea
            class="form-textarea"
            v-model="formData.prompt"
            :placeholder="$t('commands.editor.promptPlaceholder')"
            rows="8"
          ></textarea>
          <div class="form-hint">{{ $t('commands.editor.promptHint') }}</div>
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close')">{{ $t('commands.editor.cancel') }}</button>
        <button class="btn btn-primary" @click="save" :disabled="!isValid">{{ $t('commands.editor.save') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  command: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

const formData = ref({
  name: '',
  description: '',
  category: 'utility',
  version: '1',
  author: '',
  prompt: ''
})

const isValid = computed(() => {
  const base = formData.value.description && formData.value.prompt
  if (props.command) {
    return base
  }
  return base && formData.value.name && /^[a-zA-Z0-9_-]+$/.test(formData.value.name)
})

watch(() => props.show, (show) => {
  if (show) {
    if (props.command) {
      formData.value = {
        name: props.command.name || '',
        description: props.command.description || '',
        category: props.command.category || 'utility',
        version: props.command.version || '1',
        author: props.command.author === '{{__anonymous__}}' ? '' : (props.command.author || ''),
        prompt: props.command.prompt || ''
      }
    } else {
      formData.value = {
        name: '',
        description: '',
        category: 'utility',
        version: '1',
        author: '',
        prompt: ''
      }
    }
  }
})

const save = () => {
  if (!isValid.value) return
  emit('save', { ...formData.value })
}
</script>

<style lang="less" scoped>
.command-editor-dialog {
  width: 560px;
  max-width: 90vw;
}

.dialog-body {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--accent);
  }

  &:disabled {
    background: var(--control-fill);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: var(--font-mono);
  line-height: 1.5;
}

.form-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
</style>
