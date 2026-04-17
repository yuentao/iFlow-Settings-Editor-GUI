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
          <button class="btn btn-primary" @click="$emit('save', localData)">
            <Save size="14" />
            {{ isEditing ? $t('mcp.saveChanges') : $t('mcp.addServer') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Server, Save, Delete } from '@icon-park/vue-next'

const props = defineProps({
  show: Boolean,
  isEditing: Boolean,
  data: Object
})

const emit = defineEmits(['close', 'save', 'delete'])

const overlay = ref(null)
const localData = ref({
  name: '',
  description: '',
  command: 'npx',
  cwd: '.',
  args: '',
  env: ''
})

watch(() => props.show, (val) => {
  if (val && props.data) {
    localData.value = { ...props.data }
    nextTick(() => overlay.value?.focus())
  }
})

watch(() => props.data, (val) => {
  if (val) {
    localData.value = { ...val }
  }
}, { immediate: true })
</script>

<style lang="less" scoped>
.side-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}
.side-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 420px;
  max-width: 100%;
  background: var(--bg-secondary);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.side-panel-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.side-panel-title .iconpark-icon {
  color: var(--accent);
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
  border-radius: var(--radius);
  transition: all 0.2s ease;
}
.side-panel-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.side-panel-close svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
}
.side-panel-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.side-panel-body .form-group {
  margin-bottom: 20px;
}
.side-panel-body .form-group:last-child {
  margin-bottom: 0;
}
.form-required {
  color: var(--danger);
  font-weight: 500;
}
.side-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.side-panel-footer-right {
  display: flex;
  gap: 10px;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
