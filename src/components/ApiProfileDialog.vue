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
          <input type="text" class="form-input" v-model="createData.name" :placeholder="$t('api.configNamePlaceholder')" />
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
          <label class="form-label">{{ $t('api.apiKey') }}</label>
          <input type="password" class="form-input" v-model="createData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('api.baseUrl') }}</label>
            <input type="text" class="form-input" v-model="createData.baseUrl" :placeholder="$t('api.baseUrlPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.modelName') }}</label>
            <input type="text" class="form-input" v-model="createData.modelName" :placeholder="$t('api.modelNamePlaceholder')" />
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close-create')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" @click="$emit('save-create', createData)">
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
          <label class="form-label">{{ $t('api.authType') }}</label>
          <select class="form-select" v-model="editData.selectedAuthType">
            <option value="iflow">{{ $t('api.auth.iflow') }}</option>
            <option value="api">{{ $t('api.auth.api') }}</option>
            <option value="openai-compatible">{{ $t('api.auth.openaiCompatible') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('api.apiKey') }}</label>
          <input type="password" class="form-input" v-model="editData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('api.baseUrl') }}</label>
            <input type="text" class="form-input" v-model="editData.baseUrl" :placeholder="$t('api.baseUrlPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.modelName') }}</label>
            <input type="text" class="form-input" v-model="editData.modelName" :placeholder="$t('api.modelNamePlaceholder')" />
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close-edit')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" @click="$emit('save-edit', editData)">
          <Save size="14" />
          {{ $t('api.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Key, Save } from '@icon-park/vue-next'

defineProps({
  showCreate: Boolean,
  showEdit: Boolean,
  createData: Object,
  editData: Object
})

defineEmits([
  'close-create', 'save-create',
  'close-edit', 'save-edit'
])
</script>

<style lang="less" scoped>
// Windows 11 Style API Edit Dialog - Fluent Design
.api-edit-dialog {
  min-width: 480px;
  max-width: 520px;
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
</style>
