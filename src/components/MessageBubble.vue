<template>
  <div
    class="message-bubble"
    :class="[
      message.type,
      { selected: isSelected, 'selection-mode': selectionMode }
    ]"
  >
    <!-- 选择模式复选框 -->
    <div v-if="selectionMode" class="message-checkbox">
      <input
        type="checkbox"
        :checked="isSelected"
        @change="onToggleSelect"
      />
    </div>

    <!-- 用户消息：右侧布局 -->
    <template v-if="message.type === 'user'">
      <div class="bubble-wrapper user-side">
        <div class="bubble user-bubble">
          <!-- 气泡头部 -->
          <div class="bubble-meta">
            <span v-if="message.model" class="message-model">{{ message.model }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <!-- 文本内容 -->
          <div v-if="textContent" class="bubble-text" :class="{ collapsed: isCollapsed }">
            <div class="text-body" v-html="renderedText"></div>
            <button
              v-if="isTextLong"
              class="toggle-btn"
              @click="isCollapsed = !isCollapsed"
            >
              {{ isCollapsed ? t('projects.expand') : t('projects.collapse') }}
            </button>
          </div>
        </div>
        <div class="avatar user-avatar">
          <User size="14" />
        </div>
      </div>
    </template>

    <!-- 助手消息：左侧布局 -->
    <template v-else>
      <div class="bubble-wrapper assistant-side">
        <div class="avatar assistant-avatar">
          <Robot size="14" />
        </div>
        <div class="bubble assistant-bubble">
          <!-- 气泡头部 -->
          <div class="bubble-meta">
            <span class="message-role">{{ t('projects.assistant') }}</span>
            <span v-if="message.model" class="message-model">{{ message.model }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <!-- 文本内容 -->
          <div v-if="textContent" class="bubble-text" :class="{ collapsed: isCollapsed }">
            <div class="text-body" v-html="renderedText"></div>
            <button
              v-if="isTextLong"
              class="toggle-btn"
              @click="isCollapsed = !isCollapsed"
            >
              {{ isCollapsed ? t('projects.expand') : t('projects.collapse') }}
            </button>
          </div>
          <!-- 工具调用内容 -->
          <template v-if="toolUseBlocks.length > 0">
            <ToolCallBlock
              v-for="block in toolUseBlocks"
              :key="block.id"
              :type="block.type"
              :name="block.name"
              :input="block.input"
              :display="block.display"
              :status="block.status"
            />
          </template>
          <!-- Token 使用统计 -->
          <div v-if="message.usage && (message.usage.input_tokens || message.usage.output_tokens)" class="message-usage">
            <span v-if="message.usage.input_tokens">in: {{ formatTokens(message.usage.input_tokens) }}</span>
            <span v-if="message.usage.output_tokens">out: {{ formatTokens(message.usage.output_tokens) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { User, Robot } from '@icon-park/vue-next'
import ToolCallBlock from './ToolCallBlock.vue'
import type { Message } from '@/stores/projects'
import { marked } from 'marked'

const { t } = useI18n()

const props = defineProps<{
  message: Message
  selectionMode: boolean
  isSelected: boolean
}>()

const emit = defineEmits<{
  toggleSelect: [uuid: string]
}>()

const isCollapsed = ref(true)

// 提取纯文本内容
const textContent = computed(() => {
  const content = props.message.rawContent || props.message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const textParts = content
      .filter((c: any) => c.type === 'text' && c.text)
      .map((c: any) => c.text)
    return textParts.join('\n')
  }
  return props.message.content || ''
})

// 提取工具调用块
const toolUseBlocks = computed(() => {
  const content = props.message.rawContent
  if (!content || typeof content === 'string') {
    if (props.message.toolUseResult) {
      return [{
        id: 'result-' + props.message.uuid,
        type: 'tool_result' as const,
        name: props.message.toolUseResult.toolName,
        status: props.message.toolUseResult.status,
        display: extractResultDisplay(content),
      }]
    }
    return []
  }
  if (!Array.isArray(content)) return []

  const blocks: Array<{
    id: string
    type: 'tool_use' | 'tool_result'
    name: string
    input?: any
    display?: string
    status?: 'success' | 'error'
  }> = []

  for (const item of content) {
    if (item.type === 'tool_use') {
      blocks.push({
        id: item.id || `tu-${blocks.length}`,
        type: 'tool_use',
        name: item.name || '',
        input: item.input,
      })
    } else if (item.type === 'tool_result') {
      blocks.push({
        id: `tr-${blocks.length}`,
        type: 'tool_result',
        name: extractToolNameFromResult(item),
        display: extractResultDisplayFromItem(item),
        status: props.message.toolUseResult?.status,
      })
    }
  }

  return blocks
})

function extractToolNameFromResult(item: any): string {
  if (item.content?.responseParts?.functionResponse?.name) {
    return item.content.responseParts.functionResponse.name
  }
  return props.message.toolUseResult?.toolName || 'tool'
}

function extractResultDisplayFromItem(item: any): string {
  if (item.resultDisplay) return item.resultDisplay
  if (typeof item.content === 'string') return item.content
  return ''
}

function extractResultDisplay(content: any): string {
  if (typeof content === 'string') return content
  return ''
}

const isTextLong = computed(() => textContent.value.length > 200)

const renderedText = computed(() => {
  const text = textContent.value
  if (!text) return ''
  try {
    return marked.parse(text) as string
  } catch {
    return text.replace(/\n/g, '<br>')
  }
})

function onToggleSelect() {
  emit('toggleSelect', props.message.uuid)
}

function formatTime(timestamp: string): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function formatTokens(count: number): string {
  if (!count) return '0'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
  return String(count)
}
</script>

<style lang="less" scoped>
.message-bubble {
  display: flex;
  padding: 4px 12px;
  transition: background 0.15s ease;

  &.selection-mode {
    cursor: pointer;

    &:hover {
      background: var(--control-fill);
    }
  }

  &.selected {
    background: rgba(0, 103, 192, 0.08);
  }
}

.message-checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
  flex-shrink: 0;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--accent);
  }
}

// 气泡布局
.bubble-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 85%;
  width: 100%;
}

.user-side {
  margin-left: auto;
  flex-direction: row;
  justify-content: flex-end;
}

.assistant-side {
  margin-right: auto;
  flex-direction: row;
  justify-content: flex-start;
}

// 头像
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.user-avatar {
  background: rgba(0, 103, 192, 0.12);
  color: var(--accent);
}

.assistant-avatar {
  background: rgba(0, 103, 192, 0.12);
  color: var(--accent);
}

// 气泡
.bubble {
  border-radius: var(--radius-lg);
  padding: 8px 12px;
  min-width: 0;
}

.user-bubble {
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);

  .bubble-meta {
    color: rgba(255, 255, 255, 0.7);
  }

  .message-time {
    color: rgba(255, 255, 255, 0.6);
  }

  .message-model {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.8);
  }

  .bubble-text {
    color: #fff;

    .text-body {
      :deep(*) { color: #fff; }
      :deep(pre) { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
      :deep(code) { background: rgba(255,255,255,0.15); }
      :deep(blockquote) { border-left-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.8); }
      :deep(a) { color: rgba(255,255,255,0.9); text-decoration: underline; }
      :deep(hr) { border-top-color: rgba(255,255,255,0.2); }
      :deep(th),
      :deep(td) { border-color: rgba(255,255,255,0.2); }
      :deep(th) { background: rgba(255,255,255,0.1); }
    }
  }

  .toggle-btn {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
  }
}

.assistant-bubble {
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-bottom-left-radius: 4px;
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

// 气泡内元素
.bubble-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 11px;
}

.message-role {
  font-weight: 500;
  color: var(--text-secondary);
}

.message-model {
  font-size: 10px;
  color: var(--text-tertiary);
  background: var(--control-fill);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'Cascadia Code', Consolas, monospace;
}

.message-time {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-left: auto;
}

.bubble-text {
  font-size: 13px;
  line-height: 1.6;

  &.collapsed .text-body {
    max-height: 120px;
    overflow: hidden;
    position: relative;
  }

  .text-body {
    word-break: break-word;
    line-height: 1.6;

    // 段落间距
    :deep(p) {
      margin: 6px 0;
      &:first-child { margin-top: 0; }
      &:last-child { margin-bottom: 0; }
    }

    // 代码块 (<pre><code class="language-xxx">)
    :deep(pre) {
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      margin: 8px 8px 0;
      overflow-x: auto;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
    }

    :deep(pre code) {
      font-family: 'Cascadia Code', Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      background: transparent;
      padding: 0;
    }

    // 行内代码
    :deep(code) {
      font-family: 'Cascadia Code', Consolas, monospace;
      font-size: 12px;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--control-fill);
    }

    // 列表
    :deep(ul),
    :deep(ol) {
      padding-left: 20px;
      margin: 6px 0;
    }
    :deep(li) {
      margin: 3px 0;
    }

    // 标题（气泡内缩小字号）
    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4) {
      margin: 10px 0 4px;
      font-weight: 600;
      line-height: 1.4;
    }
    :deep(h1) { font-size: 16px; }
    :deep(h2) { font-size: 15px; }
    :deep(h3) { font-size: 14px; }
    :deep(h4) { font-size: 13px; }

    // 引用
    :deep(blockquote) {
      border-left: 3px solid var(--border-light);
      margin: 8px 0;
      padding: 4px 10px;
      color: var(--text-tertiary);
    }

    // 链接
    :deep(a) {
      color: var(--accent);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    // 粗体/斜体
    :deep(strong) { font-weight: 600; }
    :deep(em) { font-style: italic; }

    // 分隔线
    :deep(hr) {
      border: none;
      border-top: 1px solid var(--border-light);
      margin: 12px 0;
    }

    // 表格
    :deep(table) {
      border-collapse: collapse;
      width: 100%;
      margin: 8px 0;
      font-size: 12px;
    }
    :deep(th),
    :deep(td) {
      border: 1px solid var(--border-light);
      padding: 4px 8px;
      text-align: left;
    }
    :deep(th) {
      background: var(--control-fill);
      font-weight: 600;
    }
  }
}

.toggle-btn {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  border: 1px solid var(--border-light);
  background: var(--control-fill);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }
}

.message-usage {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: 'Cascadia Code', Consolas, monospace;
}
</style>