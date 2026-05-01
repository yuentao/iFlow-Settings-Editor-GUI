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
          <div class="form-error" :class="{ 'form-error--invisible': !createNameError }">{{ createNameError ? $t(createNameError) : '' }}</div>
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
          <div class="form-error" :class="{ 'form-error--invisible': !createBaseUrlError }">{{ createBaseUrlError ? $t(createBaseUrlError) : '' }}</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('api.apiKey') }} <span class="form-required">*</span></label>
            <input type="password" class="form-input" v-model="createData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.modelName') }} <span class="form-required">*</span></label>
            <div class="model-input-wrapper">
              <input type="text" class="form-input model-input" :class="{ 'form-input--error': createModelError }" v-model="createData.modelName" :placeholder="$t('api.modelNamePlaceholder')" @focus="onModelInputFocus('create')" @input="onModelSearch('create')" />
              <button type="button" class="model-fetch-btn" :class="{ 'is-loading': createModelsLoading }" :disabled="!canFetchCreate" @click="handleFetchModels('create')" :title="$t('api.fetchModelsBtn')">
                <Loading v-if="createModelsLoading" size="14" class="spin-icon" />
                <Refresh v-else size="14" />
              </button>
            </div>
            <div class="form-error" :class="{ 'form-error--invisible': !createModelsError && !createModelError }">{{ createModelsError ? $t(createModelsError, createModelsErrorParams) : (createModelError ? $t(createModelError) : '') }}</div>
            <!-- Model dropdown (teleported to body to avoid scrollbar) -->
            <Teleport to="body">
              <div v-if="showCreateDropdown" class="model-dropdown model-dropdown--fixed" :style="{ top: createDropdownPos.top + 'px', left: createDropdownPos.left + 'px', width: createDropdownPos.width + 'px' }">
                <div v-if="filteredCreateModels.length === 0" class="model-dropdown-empty">
                  {{ $t('api.noModelsFound') }}
                </div>
                <div
                  v-for="model in filteredCreateModels"
                  :key="model.id"
                  class="model-dropdown-item"
                  :class="{ 'is-active': createData.modelName === model.id }"
                  @mousedown.prevent="selectCreateModel(model.id)"
                >
                  <span class="model-id">{{ model.id }}</span>
                  <span v-if="model.owned_by" class="model-owner">{{ model.owned_by }}</span>
                </div>
              </div>
            </Teleport>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close-create')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" :disabled="!isCreateValid" @click="handleSaveCreate">
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
          <div class="form-error" :class="{ 'form-error--invisible': !editNameError }">{{ editNameError ? $t(editNameError) : '' }}</div>
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
          <div class="form-error" :class="{ 'form-error--invisible': !editBaseUrlError }">{{ editBaseUrlError ? $t(editBaseUrlError) : '' }}</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ $t('api.apiKey') }} <span class="form-required">*</span></label>
            <input type="password" class="form-input" v-model="editData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.modelName') }} <span class="form-required">*</span></label>
            <div class="model-input-wrapper">
              <input type="text" class="form-input model-input" :class="{ 'form-input--error': editModelError }" v-model="editData.modelName" :placeholder="$t('api.modelNamePlaceholder')" @focus="onModelInputFocus('edit')" @input="onModelSearch('edit')" />
              <button type="button" class="model-fetch-btn" :class="{ 'is-loading': editModelsLoading }" :disabled="!canFetchEdit" @click="handleFetchModels('edit')" :title="$t('api.fetchModelsBtn')">
                <Loading v-if="editModelsLoading" size="14" class="spin-icon" />
                <Refresh v-else size="14" />
              </button>
            </div>
            <div class="form-error" :class="{ 'form-error--invisible': !editModelsError && !editModelError }">{{ editModelsError ? $t(editModelsError, editModelsErrorParams) : (editModelError ? $t(editModelError) : '') }}</div>
            <!-- Model dropdown (teleported to body to avoid scrollbar) -->
            <Teleport to="body">
              <div v-if="showEditDropdown" class="model-dropdown model-dropdown--fixed" :style="{ top: editDropdownPos.top + 'px', left: editDropdownPos.left + 'px', width: editDropdownPos.width + 'px' }">
                <div v-if="filteredEditModels.length === 0" class="model-dropdown-empty">
                  {{ $t('api.noModelsFound') }}
                </div>
                <div
                  v-for="model in filteredEditModels"
                  :key="model.id"
                  class="model-dropdown-item"
                  :class="{ 'is-active': editData.modelName === model.id }"
                  @mousedown.prevent="selectEditModel(model.id)"
                >
                  <span class="model-id">{{ model.id }}</span>
                  <span v-if="model.owned_by" class="model-owner">{{ model.owned_by }}</span>
                </div>
              </div>
            </Teleport>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close-edit')">{{ $t('dialog.cancel') }}</button>
        <button class="btn btn-primary" :disabled="!isEditValid" @click="handleSaveEdit">
          <Save size="14" />
          {{ $t('api.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ApiProfileDialog - API 配置编辑对话框组件
 * 支持从 OpenAI 兼容 /models 接口自动获取模型列表
 */
import { computed, ref, watch } from 'vue'
import { Key, Save, Refresh, Loading } from '@icon-park/vue-next'
import type { AuthType } from '@/shared/types'

interface ApiProfileData {
  name: string
  selectedAuthType: AuthType
  apiKey: string
  baseUrl: string
  modelName: string
}

interface ModelItem {
  id: string
  owned_by: string
}

interface Props {
  showCreate: boolean
  showEdit: boolean
  createData: ApiProfileData | null
  editData: ApiProfileData | null
  currentProfileName?: string
}

const props = withDefaults(defineProps<Props>(), {
  showCreate: false,
  showEdit: false,
  createData: null,
  editData: null,
  currentProfileName: '',
})

const emit = defineEmits<{
  'close-create': []
  'save-create': [data: ApiProfileData]
  'close-edit': []
  'save-edit': [data: ApiProfileData]
}>()

// ---- Model fetch state ----
const createModels = ref<ModelItem[]>([])
const createModelsLoading = ref(false)
const createModelsError = ref('')
const createModelsErrorParams = ref<Record<string, any>>({})
const showCreateDropdown = ref(false)

const editModels = ref<ModelItem[]>([])
const editModelsLoading = ref(false)
const editModelsError = ref('')
const editModelsErrorParams = ref<Record<string, any>>({})
const showEditDropdown = ref(false)

// Dropdown position (fixed, for Teleport)
const createDropdownPos = ref({ top: 0, left: 0, width: 0 })
const editDropdownPos = ref({ top: 0, left: 0, width: 0 })

// ---- Can fetch computed ----
const canFetchCreate = computed((): boolean => {
  const d = props.createData
  return !!(d && d.baseUrl && d.baseUrl.trim() && isUrlValid(d.baseUrl)
    && d.apiKey && d.apiKey.trim() && !createModelsLoading.value)
})

const canFetchEdit = computed((): boolean => {
  const d = props.editData
  return !!(d && d.baseUrl && d.baseUrl.trim() && isUrlValid(d.baseUrl)
    && d.apiKey && d.apiKey.trim() && !editModelsLoading.value)
})

// ---- Filtered models for dropdown ----
const filteredCreateModels = computed((): ModelItem[] => {
  const d = props.createData
  if (!d || !d.modelName) return createModels.value
  const q = d.modelName.toLowerCase()
  return createModels.value.filter(m => m.id.toLowerCase().includes(q))
})

const filteredEditModels = computed((): ModelItem[] => {
  const d = props.editData
  if (!d || !d.modelName) return editModels.value
  const q = d.modelName.toLowerCase()
  return editModels.value.filter(m => m.id.toLowerCase().includes(q))
})

// ---- Fetch models from API ----
async function handleFetchModels(mode: 'create' | 'edit'): Promise<void> {
  const data = mode === 'create' ? props.createData : props.editData
  if (!data) return

  const loadingRef = mode === 'create' ? createModelsLoading : editModelsLoading
  const errorRef = mode === 'create' ? createModelsError : editModelsError
  const errorParamsRef = mode === 'create' ? createModelsErrorParams : editModelsErrorParams
  const modelsRef = mode === 'create' ? createModels : editModels
  const dropdownRef = mode === 'create' ? showCreateDropdown : showEditDropdown

  loadingRef.value = true
  errorRef.value = ''
  errorParamsRef.value = {}
  modelsRef.value = []

  try {
    const result = await window.electronAPI.fetchModels(data.baseUrl, data.apiKey)
    if (result.success) {
      modelsRef.value = result.models
      if (result.models.length === 0) {
        errorRef.value = 'api.noModelsAvailable'
      } else {
        updateDropdownPosition(mode)
        dropdownRef.value = true
      }
    } else {
      errorRef.value = result.error || 'api.fetchModelsFailed'
      if (result.httpStatus) {
        errorParamsRef.value = { status: result.httpStatus }
      }
    }
  } catch (e: any) {
    errorRef.value = 'api.fetchModelsFailed'
  } finally {
    loadingRef.value = false
  }
}

// ---- Dropdown interactions ----
function updateDropdownPosition(mode: 'create' | 'edit'): void {
  const wrapper = document.querySelector(
    mode === 'create' ? '.dialog-overlay-top .model-input-wrapper' : '.dialog-overlay-top:last-child .model-input-wrapper'
  ) as HTMLElement | null
  const posRef = mode === 'create' ? createDropdownPos : editDropdownPos
  if (wrapper) {
    const rect = wrapper.getBoundingClientRect()
    posRef.value = { top: rect.bottom + 2, left: rect.left, width: rect.width }
  }
}

function onModelInputFocus(mode: 'create' | 'edit'): void {
  const modelsRef = mode === 'create' ? createModels : editModels
  const dropdownRef = mode === 'create' ? showCreateDropdown : showEditDropdown
  const canFetch = mode === 'create' ? canFetchCreate : canFetchEdit
  if (modelsRef.value.length > 0) {
    updateDropdownPosition(mode)
    dropdownRef.value = true
  } else if (canFetch.value) {
    handleFetchModels(mode)
  }
}

function onModelSearch(mode: 'create' | 'edit'): void {
  const modelsRef = mode === 'create' ? createModels : editModels
  const dropdownRef = mode === 'create' ? showCreateDropdown : showEditDropdown
  if (modelsRef.value.length > 0) {
    updateDropdownPosition(mode)
    dropdownRef.value = true
  }
}

function selectCreateModel(id: string): void {
  if (props.createData) {
    props.createData.modelName = id
  }
  showCreateDropdown.value = false
}

function selectEditModel(id: string): void {
  if (props.editData) {
    props.editData.modelName = id
  }
  showEditDropdown.value = false
}

// Close dropdowns when clicking outside
function handleGlobalClick(e: MouseEvent): void {
  const target = e.target as HTMLElement
  if (target.closest('.model-dropdown') || target.closest('.model-input-wrapper')) {
    return
  }
  showCreateDropdown.value = false
  showEditDropdown.value = false
}

watch(() => props.showCreate, (val) => {
  if (val) {
    document.addEventListener('mousedown', handleGlobalClick)
  } else {
    document.removeEventListener('mousedown', handleGlobalClick)
    createModels.value = []
    createModelsError.value = ''
    createModelsErrorParams.value = {}
    showCreateDropdown.value = false
  }
})

watch(() => props.showEdit, (val) => {
  if (val) {
    document.addEventListener('mousedown', handleGlobalClick)
  } else {
    document.removeEventListener('mousedown', handleGlobalClick)
    editModels.value = []
    editModelsError.value = ''
    editModelsErrorParams.value = {}
    showEditDropdown.value = false
  }
})

// Validation helper functions
const isNameValid = (name: string): boolean => {
  if (!name || !name.trim()) return false
  return /^[a-zA-Z\u4e00-\u9fff][a-zA-Z0-9\u4e00-\u9fff_.:-]*$/.test(name.trim())
}

const isUrlValid = (url: string): boolean => {
  if (!url || !url.trim()) return false
  try { new URL(url.trim()); return true } catch { return false }
}

const isModelNameValid = (name: string): boolean => {
  if (!name || !name.trim()) return false
  return /^[a-zA-Z0-9][a-zA-Z0-9_.\-:/]*$/.test(name.trim())
}

// Create form errors
const createNameError = computed((): string => {
  const d = props.createData
  if (!d || !d.name || !d.name.trim()) return ''
  if (/^\d/.test(d.name.trim())) return 'api.validation.nameNoDigitStart'
  if (!isNameValid(d.name)) return 'api.validation.nameNoSpecial'
  return ''
})

const createBaseUrlError = computed((): string => {
  const d = props.createData
  if (!d || !d.baseUrl || !d.baseUrl.trim()) return ''
  if (!isUrlValid(d.baseUrl)) return 'api.validation.urlFormat'
  return ''
})

const createModelError = computed((): string => {
  const d = props.createData
  if (!d || !d.modelName || !d.modelName.trim()) return ''
  if (!isModelNameValid(d.modelName)) return 'api.validation.modelNoSpecial'
  return ''
})

// Edit form errors
const editNameError = computed((): string => {
  const d = props.editData
  if (!d || !d.name || !d.name.trim()) return ''
  if (d.name === props.currentProfileName) return ''
  if (/^\d/.test(d.name.trim())) return 'api.validation.nameNoDigitStart'
  if (!isNameValid(d.name)) return 'api.validation.nameNoSpecial'
  return ''
})

const editBaseUrlError = computed((): string => {
  const d = props.editData
  if (!d || !d.baseUrl || !d.baseUrl.trim()) return ''
  if (!isUrlValid(d.baseUrl)) return 'api.validation.urlFormat'
  return ''
})

const editModelError = computed((): string => {
  const d = props.editData
  if (!d || !d.modelName || !d.modelName.trim()) return ''
  if (!isModelNameValid(d.modelName)) return 'api.validation.modelNoSpecial'
  return ''
})

const isCreateValid = computed((): boolean => {
  const d = props.createData
  return !!(d && d.name && d.name.trim() && isNameValid(d.name)
    && d.apiKey && d.apiKey.trim()
    && d.baseUrl && d.baseUrl.trim() && isUrlValid(d.baseUrl)
    && d.modelName && d.modelName.trim() && isModelNameValid(d.modelName))
})

const isEditValid = computed((): boolean => {
  const d = props.editData
  if (!d) return false
  const nameOk = d.name === props.currentProfileName || (d.name && d.name.trim() && isNameValid(d.name))
  return !!(nameOk
    && d.apiKey && d.apiKey.trim()
    && d.baseUrl && d.baseUrl.trim() && isUrlValid(d.baseUrl)
    && d.modelName && d.modelName.trim() && isModelNameValid(d.modelName))
})

const handleSaveCreate = (): void => {
  if (props.createData) {
    emit('save-create', props.createData)
  }
}

const handleSaveEdit = (): void => {
  if (props.editData) {
    emit('save-edit', props.editData)
  }
}
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
    position: relative;
    
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

  &.form-error--invisible {
    visibility: hidden;
  }
}

.form-input--error {
  border-color: var(--danger) !important;
}

// ---- Model input with fetch button ----
.model-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  .model-input {
    padding-right: 34px;
  }
}

.model-fetch-btn {
  position: absolute;
  right: 1px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 0 var(--radius) var(--radius) 0;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    color: var(--accent);
    background: var(--accent-light);
  }

  &:active:not(:disabled) {
    color: var(--accent-pressed);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.is-loading {
    color: var(--accent);
  }

  .iconpark-icon {
    display: flex;
  }
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// ---- Model dropdown ----
.model-dropdown {
  z-index: 9999;
  max-height: 220px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  animation: fadeInDown 0.15s ease;

  &.model-dropdown--fixed {
    position: fixed;
  }

  .dark & {
    background: var(--bg-elevated);
    border-color: var(--border);
  }
}

.model-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  transition: background 0.1s ease;
  gap: 8px;

  &:hover {
    background: var(--control-fill-hover);
  }

  &.is-active {
    background: var(--accent-light);
    color: var(--accent-text);
  }

  .model-id {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-owner {
    font-size: 10px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
}

.model-dropdown-empty {
  padding: 12px;
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}
</style>