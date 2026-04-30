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
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.serverName') }} <span class="form-required">*</span></label>
          <input type="text" class="form-input" v-model="localData.name" :placeholder="$t('mcp.serverNamePlaceholder')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.descriptionLabel') }}</label>
          <textarea class="form-textarea" v-model="localData.description" rows="3" :placeholder="$t('mcp.descriptionPlaceholder')"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">{{ $t('mcp.customFields') }}</label>
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
/**
 * ServerPanel - MCP 服务器编辑面板组件
 *
 * 结构：
 * - 键名 (name): 文本框 — 对应 settings.json 中的 mcpServers 键名
 * - 描述 (description): 文本域 — 固定字段
 * - 自定义字段: 动态键值对 — 其余所有属性（command, args, env 等）均可自由编辑
 *   值在 UI 中以文本形式输入，保存时尝试 JSON 解析（数组/对象/数字/布尔），
 *   解析失败则作为普通字符串存储
 */
import { ref, watch, nextTick } from 'vue'
import { Server, Save, Delete, Add } from '@icon-park/vue-next'

interface CustomField {
  key: string
  value: string
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

interface LocalServerData {
  name: string
  description: string
  fields: CustomField[]
  /** 以 _ 开头的内部字段（如 _lastModified），不在 UI 中展示，保存时原样写回 */
  _internalFields: Record<string, any>
}

const overlay = ref<HTMLElement | null>(null)
const localData = ref<LocalServerData>({
  name: '',
  description: '',
  fields: [{ key: '', value: '' }],
  _internalFields: {},
})

/** 将服务器配置对象转为 LocalServerData（description 单独提取，_ 开头的内部字段隐藏，其余转键值对） */
function serverConfigToLocal(config: Record<string, any>): LocalServerData {
  const { name, description, ...rest } = config
  const fields: CustomField[] = []
  const internalFields: Record<string, any> = {}
  for (const [key, val] of Object.entries(rest)) {
    if (key.startsWith('_')) {
      internalFields[key] = val
    } else {
      fields.push({
        key,
        value: typeof val === 'string' ? val : JSON.stringify(val, null, 2),
      })
    }
  }
  // 至少保留一条空字段
  if (fields.length === 0) {
    fields.push({ key: '', value: '' })
  }
  return {
    name: config.name || '',
    description: description || '',
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
  for (const field of local.fields) {
    const key = field.key.trim()
    if (!key) continue
    const val = field.value.trim()
    // 尝试 JSON 解析，失败则当作字符串
    try {
      config[key] = JSON.parse(val)
    } catch {
      config[key] = val
    }
  }
  // 合并内部字段（_lastModified 等）
  Object.assign(config, local._internalFields)
  return config
}

watch(() => props.show, (val: boolean) => {
  if (val && props.data) {
    localData.value = serverConfigToLocal(props.data)
    nextTick(() => overlay.value?.focus())
  }
})

watch(() => props.data, (val: Record<string, any> | null) => {
  if (val) {
    localData.value = serverConfigToLocal(val)
  }
}, { immediate: true })

const addField = () => {
  localData.value.fields.push({ key: '', value: '' })
}

const removeField = (index: number) => {
  localData.value.fields.splice(index, 1)
  // 至少保留一条空字段
  if (localData.value.fields.length === 0) {
    localData.value.fields.push({ key: '', value: '' })
  }
}

const autoResize = (event: Event) => {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

const handleSave = (): void => {
  const config = localToServerConfig(localData.value)
  config.name = localData.value.name
  emit('save', config)
}
</script>

<style lang="less" scoped>
// Windows 11 Style Side Panel - Fluent Design
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
  width: 480px;
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

// Custom key-value field editor
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
  margin-top: 2px;
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

.btn-add-field {
  align-self: flex-start;
  font-size: 12px;
  padding: 4px 12px;
  gap: 4px;
  display: flex;
  align-items: center;
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