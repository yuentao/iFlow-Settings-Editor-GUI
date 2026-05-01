<template>
  <div v-if="show" class="side-panel-overlay" @keyup.esc="$emit('close')" tabindex="-1" ref="overlay">
    <div class="side-panel" @click.stop>
      <div class="side-panel-header">
        <div class="side-panel-title">
          <Server size="18" />
          {{ isEditing ? $t('mcp.editServer') : $t('mcp.addServer') }}
        </div>
        <button class="side-panel-close" @click="$emit('close')">
          <svg viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>

      <div class="side-panel-body">
        <!-- 服务器名称 -->
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.serverName') }} <span class="form-required">*</span></label>
          <input
            type="text"
            class="form-input"
            :class="{ 'form-input-error': errors.name }"
            v-model="localData.name"
            :placeholder="$t('mcp.serverNamePlaceholder')"
          />
          <div v-if="errors.name" class="form-error">{{ errors.name }}</div>
        </div>

        <!-- 描述 -->
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.descriptionLabel') }}</label>
          <textarea class="form-textarea" v-model="localData.description" rows="2" :placeholder="$t('mcp.descriptionPlaceholder')"></textarea>
        </div>

        <!-- 传输类型 -->
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.transportType') }}</label>
          <div class="transport-type-group">
            <label
              v-for="t in transportTypes"
              :key="t.value"
              class="transport-type-option"
              :class="{ active: localData.transportType === t.value }"
            >
              <input type="radio" :value="t.value" v-model="localData.transportType" />
              <span class="transport-type-label">{{ t.label }}</span>
            </label>
          </div>
        </div>

        <div class="section-divider">
          <span>{{ $t('mcp.runConfig') }}</span>
        </div>

        <!-- stdio 模式: command -->
        <template v-if="localData.transportType === 'stdio'">
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.command') }} <span class="form-required">*</span></label>
            <div class="input-with-action">
              <input
                type="text"
                class="form-input"
                :class="{ 'form-input-error': errors.command }"
                v-model="localData.command"
                :placeholder="$t('mcp.commandPlaceholder')"
              />
              <button class="btn btn-secondary btn-browse" @click="browseCommand">
                {{ $t('mcp.browse') }}
              </button>
            </div>
            <div v-if="errors.command" class="form-error">{{ errors.command }}</div>
          </div>

          <!-- args 数组编辑器 -->
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.args') }}</label>
            <div class="array-editor">
              <div v-for="(arg, index) in localData.args" :key="index" class="array-editor-row">
                <input
                  type="text"
                  class="form-input array-editor-input"
                  v-model="localData.args[index]"
                  :placeholder="$t('mcp.argPlaceholder')"
                />
                <button class="btn-icon btn-remove" @click="removeArg(index)" :title="$t('mcp.removeField')">
                  <svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" /><line x1="10" y1="0" x2="0" y2="10" /></svg>
                </button>
              </div>
              <button class="btn btn-secondary btn-add-item" @click="addArg">
                <Add size="14" />
                {{ $t('mcp.addArg') }}
              </button>
            </div>
          </div>
        </template>

        <!-- sse / streamable-http 模式: url -->
        <template v-if="localData.transportType !== 'stdio'">
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.url') }} <span class="form-required">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'form-input-error': errors.url }"
              v-model="localData.url"
              :placeholder="$t('mcp.urlPlaceholder')"
            />
            <div v-if="errors.url" class="form-error">{{ errors.url }}</div>
          </div>

          <!-- headers 键值对编辑器 -->
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.headers') }}</label>
            <div class="kv-editor">
              <div v-for="(entry, index) in localData.headers" :key="index" class="kv-editor-row">
                <input
                  type="text"
                  class="form-input kv-editor-key"
                  v-model="entry.key"
                  :placeholder="$t('mcp.headerKeyPlaceholder')"
                />
                <input
                  type="text"
                  class="form-input kv-editor-value"
                  v-model="entry.value"
                  :placeholder="$t('mcp.headerValuePlaceholder')"
                />
                <button class="btn-icon btn-remove" @click="removeHeader(index)" :title="$t('mcp.removeField')">
                  <svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" /><line x1="10" y1="0" x2="0" y2="10" /></svg>
                </button>
              </div>
              <button class="btn btn-secondary btn-add-item" @click="addHeader">
                <Add size="14" />
                {{ $t('mcp.addHeader') }}
              </button>
            </div>
          </div>
        </template>

        <!-- env 键值对编辑器 (所有模式) -->
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.env') }}</label>
          <div class="kv-editor">
            <div
              v-for="(entry, index) in localData.envEntries"
              :key="index"
              class="kv-editor-row"
              :class="{ 'kv-editor-row-error': isEnvKeyDuplicate(index) }"
            >
              <input
                type="text"
                class="form-input kv-editor-key"
                :class="{ 'form-input-error': isEnvKeyDuplicate(index) }"
                v-model="entry.key"
                :placeholder="$t('mcp.envKeyPlaceholder')"
              />
              <input
                type="text"
                class="form-input kv-editor-value"
                v-model="entry.value"
                :placeholder="$t('mcp.envValuePlaceholder')"
              />
              <button class="btn-icon btn-remove" @click="removeEnv(index)" :title="$t('mcp.removeField')">
                <svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" /><line x1="10" y1="0" x2="0" y2="10" /></svg>
              </button>
            </div>
            <div v-if="hasEnvKeyDuplicate" class="form-error">{{ $t('mcp.envKeyDuplicate') }}</div>
            <button class="btn btn-secondary btn-add-item" @click="addEnv">
              <Add size="14" />
              {{ $t('mcp.addEnv') }}
            </button>
          </div>
        </div>

        <!-- 高级配置折叠区 -->
        <div class="advanced-config">
          <div class="advanced-config-header" @click="advancedExpanded = !advancedExpanded">
            <svg class="chevron" :class="{ expanded: advancedExpanded }" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 4l4 4-4 4" />
            </svg>
            {{ $t('mcp.advancedConfig') }}
            <span v-if="customFieldCount > 0" class="advanced-badge">{{ customFieldCount }}</span>
          </div>
          <div v-if="advancedExpanded" class="advanced-config-body">
            <div class="custom-fields">
              <div v-for="(field, index) in localData.fields" :key="index" class="custom-field-row">
                <input
                  type="text"
                  class="form-input field-key"
                  v-model="field.key"
                  :placeholder="$t('mcp.fieldKeyPlaceholder')"
                />
                <textarea
                  class="form-textarea field-value"
                  v-model="field.value"
                  rows="1"
                  :placeholder="$t('mcp.fieldValuePlaceholder')"
                  @input="autoResize($event)"
                ></textarea>
                <button class="btn-icon btn-remove" @click="removeField(index)" :title="$t('mcp.removeField')">
                  <svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" /><line x1="10" y1="0" x2="0" y2="10" /></svg>
                </button>
              </div>
              <button class="btn btn-secondary btn-add-field" @click="addField">
                <Add size="14" />
                {{ $t('mcp.addField') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="side-panel-footer">
        <button v-if="isEditing" class="btn btn-danger" @click="$emit('delete')">
          <Delete size="14" />
          {{ $t('mcp.delete') }}
        </button>
        <div class="side-panel-footer-right">
          <button class="btn btn-secondary" @click="$emit('close')">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="handleSave">
            <Save size="14" />
            {{ isEditing ? $t('mcp.saveChanges') : $t('mcp.addServer') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Server, Save, Delete, Add } from '@icon-park/vue-next'

interface KvEntry {
  key: string
  value: string
}

interface CustomField {
  key: string
  value: string
}

interface LocalServerData {
  name: string
  description: string
  transportType: 'stdio' | 'sse' | 'streamable-http'
  // stdio
  command: string
  args: string[]
  // sse / streamable-http
  url: string
  headers: KvEntry[]
  // common
  envEntries: KvEntry[]
  // advanced
  fields: CustomField[]
  // internal
  _internalFields: Record<string, any>
}

interface Props {
  show: boolean
  isEditing: boolean
  data: Record<string, any> | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  isEditing: false,
  data: null,
})

const emit = defineEmits<{
  close: []
  save: [data: Record<string, any>]
  delete: []
}>()

const { t } = useI18n()
const overlay = ref<HTMLElement | null>(null)
const advancedExpanded = ref(false)

const transportTypes = [
  { value: 'stdio', label: 'stdio' },
  { value: 'sse', label: 'sse' },
  { value: 'streamable-http', label: 'streamable-http' },
]

const localData = ref<LocalServerData>(createDefault())

const errors = ref<Record<string, string>>({})

function createDefault(): LocalServerData {
  return {
    name: '',
    description: '',
    transportType: 'stdio',
    command: '',
    args: [''],
    url: '',
    headers: [],
    envEntries: [],
    fields: [{ key: '', value: '' }],
    _internalFields: {},
  }
}

/** 检测已有配置的传输类型 */
function detectTransportType(config: Record<string, any>): 'stdio' | 'sse' | 'streamable-http' {
  if (config.transportType === 'streamable-http') return 'streamable-http'
  if (config.url && !config.command) return 'sse'
  return 'stdio'
}

/** 将服务器配置对象转为 LocalServerData */
function serverConfigToLocal(config: Record<string, any>): LocalServerData {
  const name = config.name || ''
  const description = config.description || ''
  const transportType = detectTransportType(config)

  // 结构化字段
  const command = config.command || ''
  const args = Array.isArray(config.args)
    ? (config.args as string[]).map(String)
    : config.args !== undefined ? [String(config.args)] : ['']
  const url = config.url || ''

  // headers
  const headers: KvEntry[] = []
  if (config.headers && typeof config.headers === 'object' && !Array.isArray(config.headers)) {
    for (const [key, val] of Object.entries(config.headers)) {
      headers.push({ key, value: String(val) })
    }
  }

  // env
  const envEntries: KvEntry[] = []
  if (config.env && typeof config.env === 'object' && !Array.isArray(config.env)) {
    for (const [key, val] of Object.entries(config.env)) {
      envEntries.push({ key, value: String(val) })
    }
  }

  // 结构化字段名集合（不含 name/description/内部字段）
  const structuredKeys = new Set([
    'name', 'description', 'command', 'args', 'env', 'url', 'headers', 'transportType',
  ])

  // 其余自定义字段
  const fields: CustomField[] = []
  const internalFields: Record<string, any> = {}
  for (const [key, val] of Object.entries(config)) {
    if (key === 'name' || key === 'description') continue
    if (structuredKeys.has(key)) continue
    if (key.startsWith('_')) {
      internalFields[key] = val
    } else {
      fields.push({
        key,
        value: typeof val === 'string' ? val : JSON.stringify(val, null, 2),
      })
    }
  }
  if (fields.length === 0) {
    fields.push({ key: '', value: '' })
  }

  return {
    name,
    description,
    transportType,
    command,
    args: args.length > 0 ? args : [''],
    url,
    headers,
    envEntries,
    fields,
    _internalFields: internalFields,
  }
}

/** 将 LocalServerData 转为服务器配置对象（不含 name） */
function localToServerConfig(local: LocalServerData): Record<string, any> {
  const config: Record<string, any> = {}

  if (local.description.trim()) {
    config.description = local.description.trim()
  }

  if (local.transportType === 'stdio') {
    config.command = local.command.trim()
    const filteredArgs = local.args.map(a => a.trim()).filter(a => a !== '')
    if (filteredArgs.length > 0) {
      config.args = filteredArgs
    }
  } else {
    config.url = local.url.trim()
    if (local.transportType === 'streamable-http') {
      config.transportType = 'streamable-http'
    }
    // headers
    const headersObj: Record<string, string> = {}
    for (const entry of local.headers) {
      const key = entry.key.trim()
      if (key) headersObj[key] = entry.value
    }
    if (Object.keys(headersObj).length > 0) {
      config.headers = headersObj
    }
  }

  // env（所有模式）
  const envObj: Record<string, string> = {}
  for (const entry of local.envEntries) {
    const key = entry.key.trim()
    if (key) envObj[key] = entry.value
  }
  if (Object.keys(envObj).length > 0) {
    config.env = envObj
  }

  // 高级配置（自由键值对）
  for (const field of local.fields) {
    const key = field.key.trim()
    if (!key) continue
    const val = field.value.trim()
    try {
      config[key] = JSON.parse(val)
    } catch {
      config[key] = val
    }
  }

  // 合并内部字段
  Object.assign(config, local._internalFields)

  return config
}

// --- watchers ---

watch(() => props.show, (val: boolean) => {
  if (val && props.data) {
    localData.value = serverConfigToLocal(props.data)
    errors.value = {}
    advancedExpanded.value = false
    nextTick(() => overlay.value?.focus())
  }
})

watch(() => props.data, (val: Record<string, any> | null) => {
  if (val) {
    localData.value = serverConfigToLocal(val)
  }
}, { immediate: true })

// --- args ---

const addArg = () => {
  localData.value.args.push('')
}

const removeArg = (index: number) => {
  localData.value.args.splice(index, 1)
  if (localData.value.args.length === 0) {
    localData.value.args.push('')
  }
}

// --- env ---

const addEnv = () => {
  localData.value.envEntries.push({ key: '', value: '' })
}

const removeEnv = (index: number) => {
  localData.value.envEntries.splice(index, 1)
}

const hasEnvKeyDuplicate = computed(() => {
  const keys = localData.value.envEntries.map(e => e.key.trim()).filter(k => k !== '')
  return new Set(keys).size !== keys.length
})

const isEnvKeyDuplicate = (index: number) => {
  const key = localData.value.envEntries[index]?.key?.trim()
  if (!key) return false
  return localData.value.envEntries.filter(e => e.key.trim() === key).length > 1
}

// --- headers ---

const addHeader = () => {
  localData.value.headers.push({ key: '', value: '' })
}

const removeHeader = (index: number) => {
  localData.value.headers.splice(index, 1)
}

// --- custom fields ---

const addField = () => {
  localData.value.fields.push({ key: '', value: '' })
}

const removeField = (index: number) => {
  localData.value.fields.splice(index, 1)
  if (localData.value.fields.length === 0) {
    localData.value.fields.push({ key: '', value: '' })
  }
}

const customFieldCount = computed(() => {
  return localData.value.fields.filter(f => f.key.trim() !== '').length
})

const autoResize = (event: Event) => {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// --- browse command ---

const browseCommand = async () => {
  try {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openFile'],
      title: t('mcp.command'),
    })
    if (!result.canceled && result.filePaths.length > 0) {
      localData.value.command = result.filePaths[0]
    }
  } catch {
    // 对话框取消或不可用
  }
}

// --- validation ---

function validate(): boolean {
  errors.value = {}
  const name = localData.value.name.trim()

  if (!name) {
    errors.value.name = t('mcp.inputServerName')
  } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    errors.value.name = t('mcp.serverNameInvalid')
  }

  if (localData.value.transportType === 'stdio') {
    if (!localData.value.command.trim()) {
      errors.value.command = t('mcp.commandRequired')
    }
  } else {
    if (!localData.value.url.trim()) {
      errors.value.url = t('mcp.urlRequired')
    } else {
      try {
        new URL(localData.value.url.trim())
      } catch {
        errors.value.url = t('mcp.urlInvalid')
      }
    }
  }

  return Object.keys(errors.value).length === 0
}

// --- save ---

const handleSave = (): void => {
  if (!validate()) return
  if (hasEnvKeyDuplicate.value) return
  const config = localToServerConfig(localData.value)
  config.name = localData.value.name
  emit('save', config)
}
</script>

<style lang="less" scoped>
.side-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(4px);
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

.side-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 520px;
  max-width: 100%;
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  animation: slideInFromRight 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--border-light);
  background: var(--control-fill);
}

.side-panel-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);

  .iconpark-icon {
    color: var(--accent);
  }
}

.side-panel-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition);

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }

  svg {
    width: 12px;
    height: 12px;
    stroke: currentColor;
    stroke-width: 1.5;
    fill: none;
  }
}

.side-panel-body {
  flex: 1;
  padding: var(--space-xl);
  overflow-y: auto;

  .form-group {
    margin-bottom: var(--space-lg);

    &:last-child {
      margin-bottom: 0;
    }
  }
}

// Form validation
.form-input-error {
  border-color: var(--danger) !important;

  &:focus {
    border-color: var(--danger) !important;
    box-shadow: 0 0 0 1px var(--danger) !important;
  }
}

.form-error {
  font-size: 11px;
  color: var(--danger);
  margin-top: 4px;
}

// Transport type selector
.transport-type-group {
  display: flex;
  gap: 8px;
}

.transport-type-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--bg-primary);

  input[type="radio"] {
    display: none;
  }

  &:hover {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  &.active {
    border-color: var(--accent);
    background: var(--accent-light);
    box-shadow: 0 0 0 1px var(--accent);
  }
}

.transport-type-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'Cascadia Code', Consolas, monospace;
}

// Section divider
.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--space-lg);

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  span {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
}

// Command input with browse button
.input-with-action {
  display: flex;
  gap: 6px;

  .form-input {
    flex: 1;
  }
}

.btn-browse {
  flex-shrink: 0;
  font-size: 12px;
  padding: 6px 12px;
}

// Array editor (args)
.array-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.array-editor-row {
  display: flex;
  align-items: center;
  gap: 6px;
  animation: fadeIn 0.15s ease;
}

.array-editor-input {
  flex: 1;
  font-size: 12px;
  padding: 6px 8px;
  font-family: 'Cascadia Code', Consolas, monospace;
}

// Key-value editor (env, headers)
.kv-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kv-editor-row {
  display: flex;
  align-items: center;
  gap: 6px;
  animation: fadeIn 0.15s ease;

  &.kv-editor-row-error {
    // 错误行边框由 form-input-error 处理
  }
}

.kv-editor-key {
  flex: 0 0 140px;
  font-size: 12px;
  padding: 6px 8px;
  font-family: 'Cascadia Code', Consolas, monospace;
}

.kv-editor-value {
  flex: 1;
  font-size: 12px;
  padding: 6px 8px;
  font-family: 'Cascadia Code', Consolas, monospace;
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: all var(--transition);

  svg {
    width: 10px;
    height: 10px;
    stroke: currentColor;
    stroke-width: 1.5;
    fill: none;
  }

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }
}

.btn-remove:hover {
  color: var(--danger);
  background: rgba(220, 38, 38, 0.08);
}

.btn-add-item,
.btn-add-field {
  align-self: flex-start;
  font-size: 12px;
  padding: 4px 12px;
  gap: 4px;
  display: flex;
  align-items: center;
}

// Advanced config
.advanced-config {
  margin-top: var(--space-lg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.advanced-config-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: background 0.15s ease;
  user-select: none;

  &:hover {
    background: var(--control-fill);
  }

  .chevron {
    width: 14px;
    height: 14px;
    color: var(--text-tertiary);
    transition: transform 0.2s ease;

    &.expanded {
      transform: rotate(90deg);
    }
  }

  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.advanced-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent);
  color: white;
  font-size: 10px;
  font-weight: 600;
}

.advanced-config-body {
  padding: 12px 14px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
}

// Custom key-value field editor (advanced)
.custom-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-field-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  animation: fadeIn 0.15s ease;

  .field-key {
    flex: 0 0 120px;
    font-size: 12px;
    padding: 6px 8px;
  }

  .field-value {
    flex: 1;
    font-size: 12px;
    padding: 6px 8px;
    min-height: 32px;
    max-height: 200px;
    resize: vertical;
    font-family: 'Cascadia Code', Consolas, monospace;
  }
}

.side-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid var(--border-light);
  background: var(--control-fill);
}

.side-panel-footer-right {
  display: flex;
  gap: var(--space-sm);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInFromRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>
