<template>
  <div class="session-detail">
    <!-- 顶部导航栏 -->
    <div class="detail-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <Left size="16" />
          <span>{{ $t('projects.backToList') }}</span>
        </button>
      </div>
      <div class="header-center">
        <span class="session-title">{{ sessionTitle }}</span>
        <span v-if="session?.gitBranch" class="git-branch">
          <GeneralBranch size="10" />
          {{ session.gitBranch }}
        </span>
      </div>
      <div class="header-right">
        <template v-if="!isSelectionMode">
          <button class="icon-action-btn" :title="$t('projects.multiSelect')" @click="enterSelectionMode">
            <FullSelection size="16" />
          </button>
          <button class="icon-action-btn" :title="$t('projects.export')" @click="handleExport">
            <Export size="16" />
          </button>
          <button class="icon-action-btn danger" :title="$t('projects.delete')" @click="handleDeleteSession">
            <Delete size="16" />
          </button>
        </template>
        <template v-else>
          <span class="select-count">{{ $t('projects.selectedCount', { count: selectedCount }) }}</span>
          <button class="icon-action-btn" :title="$t('projects.selectAll')" @click="handleSelectAll">
            <FullSelection size="16" />
          </button>
          <button class="icon-action-btn danger" :disabled="selectedCount === 0" :title="$t('projects.delete')" @click="handleDeleteMessages">
            <Delete size="16" />
          </button>
          <button class="icon-action-btn" :title="$t('projects.cancelSelect')" @click="exitSelectionMode">
            <Close size="16" />
          </button>
        </template>
      </div>
    </div>

    <!-- 项目信息 -->
    <div v-if="project" class="project-info-bar">
      <Folder size="12" />
      <span>{{ project.name }}</span>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container" ref="messagesContainer">
      <!-- 加载更多 -->
      <div v-if="messagesHasMore" class="load-more-top">
        <button class="load-more-btn" @click="loadMoreMessages" :disabled="isLoadingMessages">
          {{ isLoadingMessages ? $t('projects.loading') : $t('projects.loadMore') }}
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="isLoadingMessages && messages.length === 0" class="loading-state">
        <SkeletonLoader type="list" :count="5" />
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages-list">
        <MessageBubble
          v-for="msg in visibleMessages"
          :key="msg.uuid"
          :message="msg"
          :selection-mode="isSelectionMode"
          :is-selected="selectedMessageUuids.has(msg.uuid)"
          @toggle-select="toggleMessageSelect"
        />
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-if="!isLoadingMessages && messages.length === 0"
        :title="$t('projects.noMessages')"
        :icon="Message"
      />
    </div>

    <!-- 底部统计栏 -->
    <div v-if="stats" class="stats-bar">
      <span class="stat-item">{{ $t('projects.totalMessages') }}: {{ stats.totalMessages }}</span>
      <span class="stat-divider">|</span>
      <span class="stat-item">{{ $t('projects.user') }}: {{ stats.userMessages }}</span>
      <span class="stat-divider">|</span>
      <span class="stat-item">{{ $t('projects.assistant') }}: {{ stats.assistantMessages }}</span>
      <span class="stat-divider">|</span>
      <span class="stat-item">{{ $t('projects.toolCalls') }}: {{ stats.toolCalls }}</span>
      <span v-if="stats.toolCalls > 0" class="stat-item success-rate">
        ({{ (stats.toolCallSuccess / stats.toolCalls * 100).toFixed(0) }}%)
      </span>
      <span class="stat-divider">|</span>
      <span class="stat-item">Token: {{ formatTokenCount(stats.totalTokens) }}</span>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="confirmState.show"
      :title-key="confirmState.titleKey"
      :message-key="confirmState.messageKey"
      :message-params="confirmState.messageParams"
      :danger="confirmState.danger"
      @confirm="handleConfirm"
      @cancel="closeConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectsStore } from '@/stores/projects'
import type { Project, SessionSummary } from '@/stores/projects'
import { useToast } from '@/composables/useToast'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import MessageBubble from '@/components/MessageBubble.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import {
  Left, Folder, GeneralBranch, Export, Delete,
  FullSelection, Close, Message,
} from '@icon-park/vue-next'

const { t } = useI18n()
const store = useProjectsStore()
const toast = useToast()

const props = defineProps<{
  project: Project
  session: SessionSummary
}>()

const emit = defineEmits<{
  back: []
}>()

const messagesContainer = ref<HTMLElement | null>(null)

const confirmState = ref<{
  show: boolean
  titleKey: string
  messageKey: string
  messageParams: Record<string, unknown>
  danger: boolean
  onConfirm: () => void
}>({
  show: false,
  titleKey: 'messages.warning',
  messageKey: '',
  messageParams: {},
  danger: false,
  onConfirm: () => {},
})

// Store 引用
const messages = computed(() => store.messages)
const visibleMessages = computed(() =>
  messages.value.filter(msg => {
    if (msg.type !== 'user') return true
    // 判断用户消息是否有文本内容
    const content = msg.rawContent || msg.content
    if (typeof content === 'string') return content.trim().length > 0
    if (Array.isArray(content)) {
      return content.some((c: any) => c.type === 'text' && c.text?.trim())
    }
    return !!msg.content?.trim()
  })
)
const stats = computed(() => store.currentStats)
const isLoadingMessages = computed(() => store.isLoadingMessages)
const messagesHasMore = computed(() => store.messagesHasMore)
const isSelectionMode = computed(() => store.isSelectionMode)
const selectedMessageUuids = computed(() => store.selectedMessageUuids)
const selectedCount = computed(() => selectedMessageUuids.value.size)

const sessionTitle = computed(() => {
  return props.session?.firstUserMessage
    ? truncateText(props.session.firstUserMessage, 50)
    : truncateId(props.session?.id || '')
})

function truncateText(text: string, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function truncateId(id: string): string {
  if (!id) return ''
  const match = id.match(/session-([a-f0-9-]+)/)
  if (match) {
    const parts = match[1].split('-')
    return parts[0] || id.slice(0, 8)
  }
  return id.slice(0, 8)
}

function goBack() {
  store.resetMessages()
  emit('back')
}

async function loadMoreMessages() {
  await store.loadMessages(props.project.id, props.session.id, {
    offset: store.messages.length,
    limit: 50,
  })
}

function enterSelectionMode() {
  store.enterSelectionMode()
}

function exitSelectionMode() {
  store.exitSelectionMode()
}

function toggleMessageSelect(uuid: string) {
  store.toggleMessageSelect(uuid)
}

function handleSelectAll() {
  if (selectedMessageUuids.value.size === visibleMessages.value.length) {
    store.clearSelection()
  } else {
    store.selectAllMessages()
  }
}

async function handleDeleteMessages() {
  const uuids = Array.from(selectedMessageUuids.value)
  if (uuids.length === 0) return

  confirmState.value = {
    show: true,
    titleKey: 'messages.warning',
    messageKey: 'projects.deleteMessageConfirm',
    messageParams: { count: uuids.length },
    danger: true,
    onConfirm: async () => {
      const result = await store.deleteMessagesAction(props.project.id, props.session.id, uuids)
      if (result.success) {
        toast.success(t('projects.deleteMessageSuccess'))
      } else {
        toast.error(t('projects.deleteFailed') + ': ' + (result.error || ''))
      }
    },
  }
}

async function handleExport() {
  const result = await store.exportSessionAction(props.project.id, props.session.id, 'markdown')
  if (result.success) {
    toast.success(t('projects.exportSuccess'))
  } else if (!result.cancelled) {
    toast.error(t('projects.exportFailed') + ': ' + (result.error || ''))
  }
}

async function handleDeleteSession() {
  confirmState.value = {
    show: true,
    titleKey: 'messages.warning',
    messageKey: 'projects.deleteConfirm',
    messageParams: {},
    danger: true,
    onConfirm: async () => {
      const result = await store.deleteSessionAction(props.project.id, props.session.id)
      if (result.success) {
        toast.success(t('projects.deleteSuccess'))
        goBack()
      } else {
        toast.error(t('projects.deleteFailed') + ': ' + (result.error || ''))
      }
    },
  }
}

function handleConfirm() {
  const callback = confirmState.value.onConfirm
  confirmState.value.show = false
  callback()
}

function closeConfirm() {
  confirmState.value.show = false
}

function formatTokenCount(count: number): string {
  if (!count) return '0'
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
  return String(count)
}

onMounted(async () => {
  store.resetMessages()
  await Promise.all([
    store.loadMessages(props.project.id, props.session.id, { limit: 50 }),
    store.loadSessionStats(props.project.id, props.session.id),
  ])
  // 滚动到底部
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

onUnmounted(() => {
  store.resetMessages()
})
</script>

<style lang="less" scoped>
.session-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-light);
  gap: 12px;
  flex-shrink: 0;
}

.header-left {
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  background: var(--control-fill);
  color: var(--text-secondary);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.git-branch {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--text-tertiary);
  background: var(--control-fill);
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.select-count {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  padding: 0 8px;
}

.icon-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &.danger:hover:not(:disabled) {
    background: rgba(196, 49, 49, 0.1);
    color: var(--danger, #C43131);
  }
}

.project-info-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 20px;
  font-size: 11px;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.load-more-top {
  display: flex;
  justify-content: center;
  padding: 8px;

  .load-more-btn {
    padding: 4px 14px;
    border: 1px solid var(--border-light);
    background: var(--control-fill);
    color: var(--text-secondary);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 12px;

    &:hover:not(:disabled) {
      background: var(--control-fill-hover);
    }

    &:disabled {
      opacity: 0.5;
    }
  }
}

.loading-state {
  padding: 0 20px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.stats-bar {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  gap: 4px;
  overflow-x: auto;

  .stat-item {
    white-space: nowrap;
  }

  .stat-divider {
    color: var(--border-light);
    margin: 0 4px;
  }

  .success-rate {
    color: #00B894;
  }
}
</style>
