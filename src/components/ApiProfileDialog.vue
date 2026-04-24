<template>
  <!-- API Create Dialog -->
  <div v-if="showCreate" class="dialog-overlay dialog-overlay-top" @keyup.esc="$emit('close-create')" tabindex="-1">
    <div class="dialog api-edit-dialog" @click.stop>
      <div class="dialog-header">
        <div class="dialog-title">
          <Key size="18" />
          {{ $t('api.createTitle') }}
        </div>
        <button class="side-panel-close" @click="$emit('close-create')">
          <svg viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label class="form-label">{{ $t('api.configName') }} <span class="form-required">*</span></label>
          <input type="text" class="form-input" :class="{ 'form-input--error': createNameError }" v-model="createData.name" :placeholder="$t('api.configNamePlaceholder')" />
          <div v-if="createNameError" class="form-error">{{ $t(createNameError) }}</div>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('api.authType') }}</label>
          <select class="form-select" v-model="createData.selectedAuthType">
            <option value="iflow">{{ $t('api.auth.iflow') }}</option>
            <option value="api">{{ $t('api.auth.api') }}</option>
            <option value="openai-compatible">{{ $t('api.auth.openaiCompatible') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('api.baseUrl') }} <span class="form-required">*</span></label>
          <input type="text" class="form-input" :class="{ 'form-input--error': createBaseUrlError }" v-model="createData.baseUrl" :placeholder="$t('api.baseUrlPlaceholder')" />
          <div v-if="createBaseUrlError" class="form-error">{{ $t(createBaseUrlError) }}</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('api.apiKey') }} <span class="form-required">*</span></label>
            <input type="password" class="form-input" v-model="createData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.modelName') }} <span class="form-required">*</span></label>
            <input type="text" class="form-input" :class="{ 'form-input--error': createModelError }" v-model="createData.modelName" :placeholder="$t('api.modelNamePlaceholder')" />
            <div v-if="createModelError" class="form-error">{{ $t(createModelError) }}</div>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close-create')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" :disabled="!isCreateValid" @click="$emit('save-create', createData)">
          <Save size="14" />
          {{ $t('api.create') }}
        </button>
      </div>
    </div>
  </div>

  <!-- API Edit Dialog -->
  <div v-if="showEdit" class="dialog-overlay dialog-overlay-top" @keyup.esc="$emit('close-edit')" tabindex="-1">
    <div class="dialog api-edit-dialog" @click.stop>
      <div class="dialog-header">
        <div class="dialog-title">
          <Key size="18" />
          {{ $t('api.editTitle') }}
        </div>
        <button class="side-panel-close" @click="$emit('close-edit')">
          <svg viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label class="form-label">{{ $t('api.configName') }} <span class="form-required">*</span></label>
          <input type="text" class="form-input" :class="{ 'form-input--error': editNameError }" v-model="editData.name" :disabled="editData.name === currentProfileName" />
          <div v-if="editNameError" class="form-error">{{ $t(editNameError) }}</div>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('api.authType') }}</label>
          <select class="form-select" v-model="editData.selectedAuthType">
            <option value="iflow">{{ $t('api.auth.iflow') }}</option>
            <option value="api">{{ $t('api.auth.api') }}</option>
            <option value="openai-compatible">{{ $t('api.auth.openaiCompatible') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('api.baseUrl') }} <span class="form-required">*</span></label>
          <input type="text" class="form-input" :class="{ 'form-input--error': editBaseUrlError }" v-model="editData.baseUrl" :placeholder="$t('api.baseUrlPlaceholder')" />
          <div v-if="editBaseUrlError" class="form-error">{{ $t(editBaseUrlError) }}</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('api.apiKey') }} <span class="form-required">*</span></label>
            <input type="password" class="form-input" v-model="editData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.modelName') }} <span class="form-required">*</span></label>
            <input type="text" class="form-input" :class="{ 'form-input--error': editModelError }" v-model="editData.modelName" :placeholder="$t('api.modelNamePlaceholder')" />
            <div v-if="editModelError" class="form-error">{{ $t(editModelError) }}</div>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close-edit')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" :disabled="!isEditValid" @click="$emit('save-edit', editData)">
          <Save size="14" />
          {{ $t('api.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Key, Save } from '@icon-park/vue-next'

const props = defineProps({
  showCreate: Boolean,
  showEdit: Boolean,
  createData: Object,
  editData: Object,
  currentProfileName: String
})

defineEmits([
  'close-create', 'save-create',
  'close-edit', 'save-edit'
])

// Validation rules
const isNameValid = name => {
  if (!name || !name.trim()) return false
  return /^[a-zA-Z\u4e00-\u9fff][a-zA-Z0-9\u4e00-\u9fff_-]*$/.test(name.trim())
}

const isUrlValid = url => {
  if (!url || !url.trim()) return false
  try { new URL(url.trim()); return true } catch { return false }
}

const isModelNameValid = name => {
  if (!name || !name.trim()) return false
  return /^[a-zA-Z0-9][a-zA-Z0-9_.\-:/]*$/.test(name.trim())
}

// Create form errors
const createNameError = computed(() => {
  const d = props.createData
  if (!d || !d.name || !d.name.trim()) return ''
  if (/^\d/.test(d.name.trim())) return 'api.validation.nameNoDigitStart'
  if (!isNameValid(d.name)) return 'api.validation.nameNoSpecial'
  return ''
})

const createBaseUrlError = computed(() => {
  const d = props.createData
  if (!d || !d.baseUrl || !d.baseUrl.trim()) return ''
  if (!isUrlValid(d.baseUrl)) return 'api.validation.urlFormat'
  return ''
})

const createModelError = computed(() => {
  const d = props.createData
  if (!d || !d.modelName || !d.modelName.trim()) return ''
  if (!isModelNameValid(d.modelName)) return 'api.validation.modelNoSpecial'
  return ''
})

// Edit form errors
const editNameError = computed(() => {
  const d = props.editData
  if (!d || !d.name || !d.name.trim()) return ''
  if (d.name === props.currentProfileName) return ''
  if (/^\d/.test(d.name.trim())) return 'api.validation.nameNoDigitStart'
  if (!isNameValid(d.name)) return 'api.validation.nameNoSpecial'
  return ''
})

const editBaseUrlError = computed(() => {
  const d = props.editData
  if (!d || !d.baseUrl || !d.baseUrl.trim()) return ''
  if (!isUrlValid(d.baseUrl)) return 'api.validation.urlFormat'
  return ''
})

const editModelError = computed(() => {
  const d = props.editData
  if (!d || !d.modelName || !d.modelName.trim()) return ''
  if (!isModelNameValid(d.modelName)) return 'api.validation.modelNoSpecial'
  return ''
})

const isCreateValid = computed(() => {
  const d = props.createData
  return d && d.name && d.name.trim() && isNameValid(d.name)
    && d.apiKey && d.apiKey.trim()
    && d.baseUrl && d.baseUrl.trim() && isUrlValid(d.baseUrl)
    && d.modelName && d.modelName.trim() && isModelNameValid(d.modelName)
})

const isEditValid = computed(() => {
  const d = props.editData
  if (!d) return false
  const nameOk = d.name === props.currentProfileName || (d.name && d.name.trim() && isNameValid(d.name))
  return nameOk
    && d.apiKey && d.apiKey.trim()
    && d.baseUrl && d.baseUrl.trim() && isUrlValid(d.baseUrl)
    && d.modelName && d.modelName.trim() && isModelNameValid(d.modelName)
})
</script>

<style lang="less" scoped>
// Windows 11 Style API Edit Dialog - Fluent Design
.api-edit-dialog {
  width: 520px;
  padding: 0;
  overflow: hidden;
  border-radius: var(--radius-xl);
}

.api-edit-dialog .dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--border-light);
  background: var(--control-fill);
}

.api-edit-dialog .dialog-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  margin-bottom: 0;
  
  .iconpark-icon {
    color: var(--accent);
  }
}

.api-edit-dialog .dialog-body {
  padding: var(--space-xl);
  max-height: 60vh;
  overflow-y: auto;
  
  .form-group {
    margin-bottom: var(--space-lg);
    min-width: 0;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.api-edit-dialog .dialog-actions {
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid var(--border-light);
  background: var(--control-fill);
  margin-top: 0;
}

.form-error {
  font-size: 11px;
  color: var(--danger);
  margin-top: 4px;
  word-break: break-all;
}

.form-input--error {
  border-color: var(--danger) !important;
}
</style>
