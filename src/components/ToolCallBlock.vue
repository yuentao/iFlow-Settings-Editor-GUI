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
      <!-- todo_write 特殊渲染：任务列表 -->
      <div v-if="isTodoWrite" class="todo-list">
        <div
          v-for="todo in parsedTodos"
          :key="todo.id"
          class="todo-item"
          :class="todo.status"
        >
          <div class="todo-status-icon">
            <span v-if="todo.status === 'completed'">&#10003;</span>
            <span v-else-if="todo.status === 'in_progress'">&#9679;</span>
            <span v-else>&#9675;</span>
          </div>
          <div class="todo-content">
            <span class="todo-task">{{ todo.task }}</span>
            <div class="todo-meta">
              <span class="todo-priority" :class="todo.priority">{{ todo.priority }}</span>
              <span class="todo-id">#{{ todo.id }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 普通 tool_use：JSON 展示 -->
      <pre v-else-if="type === 'tool_use' && input" class="tool-input"><code>{{ formatJson(input) }}</code></pre>
      <!-- tool_result 展示 -->
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

// 检测是否为 todo_write 工具调用
const isTodoWrite = computed(() => {
  return props.type === 'tool_use' && props.name === 'todo_write' && props.input?.todos
})

// 解析 todo_write 的任务列表
const parsedTodos = computed(() => {
  if (!isTodoWrite.value) return []
  return (props.input.todos as Array<{
    id: string
    task: string
    status: string
    priority: string
  }>)
})

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
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

// todo_write 任务列表样式
.todo-list {
  margin: 6px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  transition: background 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
  }

  &.completed {
    opacity: 0.65;

    .todo-task {
      text-decoration: line-through;
      color: var(--text-tertiary);
    }
  }

  &.in_progress {
    border-left: 3px solid #FD7E14;
  }

  &.failed {
    border-left: 3px solid #C43131;
  }
}

.todo-status-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  margin-top: 1px;

  .completed & {
    color: #00B894;
  }

  .in_progress & {
    color: #FD7E14;
  }

  .pending & {
    color: var(--text-tertiary);
  }
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-task {
  display: block;
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.todo-priority {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;

  &.high {
    background: rgba(196, 49, 49, 0.12);
    color: #e06c75;
  }

  &.medium {
    background: rgba(253, 126, 20, 0.12);
    color: #e5c07b;
  }

  &.low {
    background: rgba(0, 184, 148, 0.12);
    color: #98c379;
  }
}

.todo-id {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: 'Cascadia Code', Consolas, monospace;
}
</style>