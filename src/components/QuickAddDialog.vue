<template>
  <div v-if="show" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog" @click.stop>
      <!-- 阶段 1：粘贴输入 -->
      <template v-if="phase === 'input'">
        <div class="dialog-title-row">
          <div class="dialog-title">{{ $t('mcp.quickAddTitle') }}</div>
          <div class="quick-add-help-wrap">
            <button class="quick-add-help-btn" @click="showHelp = !showHelp" :title="$t('mcp.quickAddHelp')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2"/><text x="8" y="12" text-anchor="middle" font-size="10" font-weight="600" fill="currentColor">?</text></svg>
            </button>
            <div v-if="showHelp" class="quick-add-help-panel" @click.stop>
              <div class="quick-add-help-section">
                <div class="quick-add-help-label">JSON</div>
                <code class="quick-add-help-code">{"mcpServers":{"name":{"command":"npx","args":["-y","@pkg"]}}}</code>
              </div>
              <div class="quick-add-help-section">
                <div class="quick-add-help-label">{{ $t('mcp.quickAddHelpCmd') }}</div>
                <code class="quick-add-help-code">npx -y @modelcontextprotocol/server-filesystem /path</code>
              </div>
              <div class="quick-add-help-section">
                <div class="quick-add-help-label">URL</div>
                <code class="quick-add-help-code">https://api.example.com/sse</code>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <textarea
            ref="inputRef"
            class="form-textarea quick-add-textarea"
            v-model="inputText"
            :placeholder="$t('mcp.quickAddPlaceholder')"
            @keydown.ctrl.enter="handleParse"
            spellcheck="false"
          ></textarea>
        </div>
        <div v-if="parseError" class="quick-add-error">
          {{ errorMessage }}
        </div>
        <div class="quick-add-hint">
          {{ $t('mcp.quickAddHint') }}
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="$emit('close')">{{ $t('mcp.cancel') }}</button>
          <button class="btn btn-primary" :disabled="!inputText.trim()" @click="handleParse">
            {{ $t('mcp.quickAddParse') }}
          </button>
        </div>
      </template>

      <!-- 阶段 2：多服务器选择 -->
      <template v-if="phase === 'select'">
        <div class="dialog-title">
          {{ $t('mcp.quickAddResultTitle', { count: parsedServers.length }) }}
        </div>
        <div class="quick-add-server-list">
          <label
            v-for="(server, index) in parsedServers"
            :key="index"
            class="quick-add-server-item"
            :class="{ disabled: server._exists, selected: server._selected && !server._exists }"
          >
            <input
              type="checkbox"
              v-model="server._selected"
              :disabled="server._exists"
            />
            <div class="quick-add-server-info">
              <div class="quick-add-server-name">
                {{ server.name || $t('mcp.quickAddUnnamed') }}
                <span v-if="server._exists" class="quick-add-exists-tag">{{ $t('mcp.quickAddExistTag') }}</span>
              </div>
              <div class="quick-add-server-detail">{{ serverDetail(server.config) }}</div>
            </div>
          </label>
        </div>
        <div v-if="existingInParsed.length > 0" class="quick-add-exist-hint">
          {{ $t('mcp.quickAddExistSkip', { names: existingInParsed.join(', ') }) }}
        </div>
        <div v-if="selectableCount === 0" class="quick-add-error">
          {{ $t('mcp.quickAddAllExist') }}
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="phase = 'input'">{{ $t('mcp.quickAddBack') }}</button>
          <button class="btn btn-primary" :disabled="selectableCount === 0" @click="handleBatchAdd">
            {{ $t('mcp.quickAddSelected', { count: selectableCount }) }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseMcpInput, ensureUniqueName } from '../main/utils/mcpParser'

const props = defineProps({
  show: Boolean,
  existingNames: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'edit-server', 'add-servers'])

const inputText = ref('')
const parseError = ref('')
const phase = ref('input') // 'input' | 'select'
const parsedServers = ref([])
const inputRef = ref(null)
const showHelp = ref(false)

watch(() => props.show, (val) => {
  if (val) {
    inputText.value = ''
    parseError.value = ''
    phase.value = 'input'
    parsedServers.value = []
    showHelp.value = false
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

const selectableCount = computed(() =>
  parsedServers.value.filter(s => s._selected && !s._exists).length
)

const existingInParsed = computed(() =>
  parsedServers.value.filter(s => s._exists).map(s => s.name)
)

const { t } = useI18n()

const errorCodeMap = {
  INPUT_EMPTY: 'quickAddErrorEmpty',
  UNRECOGNIZED_FORMAT: 'quickAddErrorUnrecognized',
  JSON_INVALID: 'quickAddErrorJson',
  NOT_MCP_CONFIG: 'quickAddErrorNotMcpConfig',
  CMD_INVALID: 'quickAddErrorCmdInvalid',
  URL_INVALID: 'quickAddErrorUrlInvalid',
}

const errorMessage = computed(() => {
  const i18nKey = errorCodeMap[parseError.value]
  return i18nKey ? t(`mcp.${i18nKey}`) : t('mcp.quickAddErrorUnrecognized')
})

const serverDetail = (config) => {
  if (config.url) return `URL: ${config.url}`
  if (config.command) {
    const parts = [config.command]
    if (config.args?.length) parts.push(...config.args)
    return parts.join(' ')
  }
  return ''
}

const handleParse = () => {
  parseError.value = ''
  const result = parseMcpInput(inputText.value)

  if (!result.success) {
    parseError.value = result.error
    return
  }

  // 单服务器 → 直接打开 ServerPanel 编辑
  if (result.servers.length === 1) {
    const server = result.servers[0]
    const name = server.name
      ? ensureUniqueName(server.name, props.existingNames)
      : ''
    emit('edit-server', { name, ...server.config })
    emit('close')
    return
  }

  // 多服务器 → 进入选择阶段
  parsedServers.value = result.servers.map(s => ({
    ...s,
    _selected: true,
    _exists: props.existingNames.includes(s.name),
  }))
  phase.value = 'select'
}

const handleBatchAdd = () => {
  const servers = parsedServers.value
    .filter(s => s._selected && !s._exists)
    .map(s => {
      const name = ensureUniqueName(s.name, props.existingNames)
      return { name, config: s.config }
    })
  if (servers.length > 0) {
    emit('add-servers', servers)
  }
  emit('close')
}
</script>

<style lang="less" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  animation: fadeIn 0.15s ease;
}

.dialog {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: 24px;
  min-width: 420px;
  max-width: 560px;
  width: 100%;
  box-shadow: var(--shadow-xl);
  animation: scaleIn 0.2s ease;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.dialog-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.quick-add-help-wrap {
  position: relative;
}

.quick-add-help-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--control-fill);
  border-radius: var(--radius);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-secondary);
  }
}

.quick-add-help-panel {
  position: absolute;
  top: 34px;
  right: 0;
  width: 360px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  box-shadow: var(--shadow-lg);
  z-index: 1400;
  animation: fadeIn 0.15s ease;
}

.quick-add-help-section {
  & + & {
    margin-top: 10px;
  }
}

.quick-add-help-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.quick-add-help-code {
  display: block;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  background: var(--control-fill);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  word-break: break-all;
  user-select: all;
}

.quick-add-textarea {
  width: 100%;
  min-height: 160px;
  max-height: 320px;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  tab-size: 2;
}

.quick-add-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 8px;
  line-height: 1.5;
}

.quick-add-error {
  font-size: 12px;
  color: var(--danger);
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: var(--radius-sm);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.quick-add-server-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.quick-add-server-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover:not(.disabled) {
    background: var(--control-fill);
  }

  &.selected {
    background: var(--accent-light);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type="checkbox"] {
    margin-top: 2px;
    accent-color: var(--accent);
  }
}

.quick-add-server-info {
  flex: 1;
  min-width: 0;
}

.quick-add-server-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.quick-add-exists-tag {
  font-size: 10px;
  font-weight: 400;
  color: var(--warning);
  background: rgba(245, 158, 11, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
}

.quick-add-server-detail {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Cascadia Code', 'Consolas', monospace;
}

.quick-add-exist-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
</style>
