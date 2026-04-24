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
          <input type="text" class="form-input" v-model="localData.description" :placeholder="$t('mcp.descriptionPlaceholder')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.command') }} <span class="form-required">*</span></label>
          <input type="text" class="form-input" v-model="localData.command" :placeholder="$t('mcp.commandPlaceholder')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.workingDir') }}</label>
          <input type="text" class="form-input" v-model="localData.cwd" :placeholder="$t('mcp.cwdPlaceholder')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.args') }}</label>
          <textarea class="form-textarea" v-model="localData.args" rows="4" :placeholder="$t('mcp.argsPlaceholder')"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('mcp.envVars') }}</label>
          <textarea class="form-textarea" v-model="localData.env" rows="3" :placeholder="$t('mcp.envVarsPlaceholder')"></textarea>
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
 */
import { ref, watch, nextTick } from 'vue'
import { Server, Save, Delete } from '@icon-park/vue-next'
import type { McpServerConfig } from '@/shared/types'

interface Props {
  show: boolean
  isEditing: boolean
  data: McpServerConfig | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  isEditing: false,
  data: null,
})

const emit = defineEmits<{
  close: []
  save: [data: McpServerConfig]
  delete: []
}>()

interface LocalServerData {
  name: string
  description: string
  command: string
  cwd: string
  args: string
  env: string
}

const overlay = ref<HTMLElement | null>(null)
const localData = ref<LocalServerData>({
  name: '',
  description: '',
  command: 'npx',
  cwd: '.',
  args: '',
  env: ''
})

watch(() => props.show, (val: boolean) => {
  if (val && props.data) {
    localData.value = { ...props.data }
    nextTick(() => overlay.value?.focus())
  }
})

watch(() => props.data, (val: McpServerConfig | null) => {
  if (val) {
    localData.value = { ...val }
  }
}, { immediate: true })

const handleSave = (): void => {
  emit('save', localData.value as McpServerConfig)
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
  width: 420px;
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
