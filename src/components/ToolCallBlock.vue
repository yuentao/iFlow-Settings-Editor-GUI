<template>
  <div class="tool-call-block" :class="[type]">
    <div class="tool-header" @click="toggleExpand">
      <div class="tool-icon">
        <span v-if="type === 'tool_use'">🔧</span>
        <span v-else>✅</span>
      </div>
      <div class="tool-label">
        <span v-if="type === 'tool_use'" class="tool-name">{{ name }}</span>
        <span v-else class="tool-name">{{ name }}</span>
        <span v-if="type === 'tool_result' && status" class="tool-status" :class="status">
          {{ status }}
        </span>
      </div>
      <div class="tool-toggle">
        <Right size="12" :class="{ rotated: isExpanded }" />
      </div>
    </div>
    <div v-if="isExpanded" class="tool-content">
      <pre v-if="type === 'tool_use' && input" class="tool-input"><code>{{ formatJson(input) }}</code></pre>
      <div v-if="type === 'tool_result' && display" class="tool-result-display" v-html="parsedDisplay"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Right } from '@icon-park/vue-next'

const props = defineProps<{
  type: 'tool_use' | 'tool_result'
  name: string
  input?: any
  display?: string
  status?: 'success' | 'error'
}>()

const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function formatJson(data: any): string {
  if (!data) return ''
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// ANSI 颜色码解析
const ansiColorMap: Record<string, string> = {
  '30': '#000000', '31': '#e06c75', '32': '#98c379', '33': '#e5c07b',
  '34': '#61afef', '35': '#c678dd', '36': '#56b6c2', '37': '#abb2bf',
  '1': 'font-weight:bold', '1;33': 'color:#e5c07b;font-weight:bold',
  '1;32': 'color:#98c379;font-weight:bold', '1;31': 'color:#e06c75;font-weight:bold',
  '1;34': 'color:#61afef;font-weight:bold', '1;36': 'color:#56b6c2;font-weight:bold',
}

const parsedDisplay = computed(() => {
  if (!props.display) return ''
  let text = props.display
  // 解析 ANSI 转义序列
  text = text.replace(/\x1b\[(\d+(?:;\d+)*)m/g, (_match, codes: string) => {
    const style = ansiColorMap[codes]
    if (!style) return '</span>'
    if (style.startsWith('color:')) {
      return `<span style="${style}">`
    }
    if (style.startsWith('font-weight')) {
      return `<span style="${style}">`
    }
    return `<span style="color:${style}">`
  })
  // 转义 HTML 特殊字符（保留我们插入的 span）
  // 简单处理：只转义原始文本中的 < > &，不转义我们插入的标签
  text = text.replace(/&(?!(?:span|\/span|style)[^>]*>)/g, '&amp;')
  // 换行处理
  text = text.replace(/\n/g, '<br>')
  return text
})
</script>

<style lang="less" scoped>
.tool-call-block {
  margin: 6px 0;
  border-radius: var(--radius);
  overflow: hidden;
  font-size: 12px;

  &.tool_use {
    border-left: 3px solid #FD7E14;
    background: rgba(253, 126, 20, 0.05);
  }

  &.tool_result {
    border-left: 3px solid #00B894;
    background: rgba(0, 184, 148, 0.05);
  }
}

.tool-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  gap: 8px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.05);
  }
}

.tool-icon {
  flex-shrink: 0;
  font-size: 12px;
}

.tool-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tool-name {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

.tool-status {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;

  &.success {
    background: rgba(0, 184, 148, 0.15);
    color: #00B894;
  }

  &.error {
    background: rgba(196, 49, 49, 0.15);
    color: #C43131;
  }
}

.tool-toggle {
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;

  .rotated {
    transform: rotate(90deg);
  }
}

.tool-content {
  padding: 0 10px 8px;
  border-top: 1px solid var(--border-light);
}

.tool-input {
  margin: 6px 0 0;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-size: 11px;
  line-height: 1.5;

  code {
    font-family: 'Cascadia Code', Consolas, monospace;
    color: var(--text-primary);
  }
}

.tool-result-display {
  margin: 6px 0 0;
  padding: 8px;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}
</style>