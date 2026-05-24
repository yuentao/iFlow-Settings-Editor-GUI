<template>
  <div class="session-detail">
    <!-- 空值保护 -->
    <template v-if="!project || !session">
      <div class="detail-header">
        <div class="header-left">
          <button class="back-btn" @click="goBack">
            <Left size="16" />
            <span>{{ $t('projects.backToList') }}</span>
          </button>
        </div>
      </div>
      <EmptyState
        :title="$t('projects.sessionNotFound')"
        :icon="Folder"
      />
    </template>

    <template v-else>
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

    <!-- 项目信息 + 消息统计 -->
    <div v-if="project" class="project-info-bar">
      <span class="project-name-row">
        <Folder size="12" />
        <span>{{ project.name }}</span>
      </span>
      <span class="stat-separator"></span>
      <span v-if="stats" class="stats-row">
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
      </span>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container" ref="messagesContainer">
      <!-- 加载中 -->
      <div v-if="isLoadingMessages && messages.length === 0" class="loading-state">
        <SkeletonLoader type="list" :count="5" />
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages-list">
        <!-- 顶部滚动提示（有更早消息时提示向上滚动） -->
        <Transition name="hint-fade">
          <div v-if="showScrollHint" class="scroll-hint scroll-hint-top" key="scroll-hint">
            <ArrowUp size="14" />
            <span>{{ $t('projects.scrollForMore') }}</span>
            <ArrowUp size="14" />
          </div>
        </Transition>
        <MessageBubble
          v-for="msg in visibleMessages"
          :key="msg.uuid"
          :message="msg"
          :selection-mode="isSelectionMode"
          :is-selected="selectedMessageUuids.has(msg.uuid)"
          @toggle-select="toggleMessageSelect"
        />
      </div>

      <!-- 滚动加载更多（触顶自动触发） -->
      <div v-if="isLoadingMessages && messages.length > 0" class="load-more-scroll">
        <span>{{ $t('projects.loading') }}</span>
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-if="!isLoadingMessages && messages.length === 0"
        :title="$t('projects.noMessages')"
        :icon="Message"
      />

      <!-- 前往顶部按钮 -->
      <button
        v-if="showBackToTop"
        class="back-to-top"
        @click="scrollToTop"
        :title="$t('projects.backToTop')">
        <ArrowUp size="16" />
      </button>

      <!-- 手动刷新按钮 -->
      <button
        class="manual-refresh-btn"
        :class="{ 'is-refreshing': isRefreshing }"
        @click="handleManualRefresh"
        :title="$t('projects.refresh')">
        <Refresh size="16" />
      </button>
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
  </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
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
  FullSelection, Close, Message, ArrowUp, Refresh,
} from '@icon-park/vue-next'

const { t } = useI18n()
const store = useProjectsStore()
const toast = useToast()

const props = defineProps<{
  project: Project | null
  session: SessionSummary | null
}>()

const emit = defineEmits<{
  back: []
}>()

const messagesContainer = ref<HTMLElement | null>(null)
const showBackToTop = ref(false)
const showScrollHint = ref(false)
const _hideHintOnScroll = ref(false) // 用户首次滚动后永久隐藏提示
const currentTopOffset = ref(0) // 当前加载批次在消息文件中的起始偏移

const SCROLL_MORE_THRESHOLD = 150 // 距离底部多少 px 触发加载更多
const BACK_TO_TOP_THRESHOLD = 400 // 向下滚动多少 px 显示返回顶部按钮

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
    // 非用户消息（助手/系统）始终显示
    if (msg.role !== 'user') return true
    // 用户消息：仅当 content 为字符串类型且有文本内容时才显示
    const content = msg.rawContent || msg.content
    if (typeof content === 'string') return content.trim().length > 0
    // content 为数组/对象/null 时，不是用户文本消息，过滤掉
    return false
  })
)
const stats = computed(() => store.currentStats)
const isLoadingMessages = computed(() => store.isLoadingMessages)
const isSelectionMode = computed(() => store.isSelectionMode)
const selectedMessageUuids = computed(() => store.selectedMessageUuids)
const selectedCount = computed(() => selectedMessageUuids.value.size)

const sessionTitle = computed(() => {
  return props.session?.firstUserMessage || t('projects.newSession')
})

function goBack() {
  store.resetMessages()
  emit('back')
}

async function loadMoreMessages() {
  if (currentTopOffset.value <= 0 || !props.project || !props.session) return
  const newOffset = Math.max(0, currentTopOffset.value - 50)
  const result = await window.electronAPI.getSessionMessages(
    props.project.id,
    props.session.id,
    { offset: newOffset, limit: 50 },
  )
  if (result.success) {
    const el = messagesContainer.value
    const prevScrollHeight = el?.scrollHeight || 0

    // 将更早的消息 prepend 到列表开头
    store.messages = [...(result.data || []), ...store.messages]
    store.messagesHasMore = newOffset > 0
    currentTopOffset.value = newOffset

    await nextTick()
    // 恢复滚动位置：新内容插入后 scrollHeight 增加，补偿差额
    if (el) {
      el.scrollTop = el.scrollHeight - prevScrollHeight
    }
  }
}

// 向上滚动触顶自动加载更多
function handleScroll() {
  const el = messagesContainer.value
  if (!el) return

  // 显示/隐藏返回顶部按钮
  showBackToTop.value = el.scrollTop > BACK_TO_TOP_THRESHOLD

  // 用户首次滚动时隐藏提示
  if (!_hideHintOnScroll.value && el.scrollTop > 0) {
    _hideHintOnScroll.value = true
    showScrollHint.value = false
  }

  // 向上滚动到接近顶部时加载更早的消息
  if (el.scrollTop < SCROLL_MORE_THRESHOLD && !isLoadingMessages.value && store.messagesHasMore) {
    loadMoreMessages()
  }
}

function scrollToTop() {
  messagesContainer.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

const isRefreshing = ref(false)

async function handleManualRefresh() {
  if (isRefreshing.value || !props.project || !props.session) return
  isRefreshing.value = true
  try {
    store.resetMessages()
    currentTopOffset.value = 0
    const countResult = await window.electronAPI.getSessionMessages(
      props.project.id,
      props.session.id,
      { limit: 1 },
    )
    const total = countResult?.success ? ((countResult as any)?.total || 0) : 0
    const startOffset = Math.max(0, total - 50)
    currentTopOffset.value = startOffset

    await Promise.all([
      store.loadMessages(props.project.id, props.session.id, { offset: startOffset, limit: 50 }),
      store.loadSessionStats(props.project.id, props.session.id),
    ])

    if (startOffset > 0) {
      store.messagesHasMore = true
    }

    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  } catch (e) {
    console.error('Failed to refresh session:', e)
  } finally {
    isRefreshing.value = false
  }
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
      const result = await store.deleteMessagesAction(props.project!.id, props.session!.id, uuids)
      if (result.success) {
        toast.success(t('projects.deleteMessageSuccess'))
      } else {
        toast.error(t('projects.deleteFailed') + ': ' + (result.error || ''))
      }
    },
  }
}

async function handleExport() {
  const result = await store.exportSessionAction(props.project!.id, props.session!.id, 'markdown')
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
      const result = await store.deleteSessionAction(props.project!.id, props.session!.id)
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

onMounted(async () => {
  if (!props.project || !props.session) return
  store.resetMessages()
  currentTopOffset.value = 0

  // 先获取总消息数，计算从末尾加载的偏移量
  const countResult = await window.electronAPI.getSessionMessages(
    props.project!.id,
    props.session!.id,
    { limit: 1 },
  )
  const total = countResult?.success ? ((countResult as any)?.total || 0) : 0
  const startOffset = Math.max(0, total - 50)
  currentTopOffset.value = startOffset

  await Promise.all([
    store.loadMessages(props.project!.id, props.session!.id, {
      offset: startOffset,
      limit: 50,
    }),
    store.loadSessionStats(props.project!.id, props.session!.id),
  ])

  // 如果还有更早的消息，手动设置 hasMore
  if (startOffset > 0) {
    store.messagesHasMore = true
  }

  // 滚动到底部（等待布局稳定）
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(resolve))
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    messagesContainer.value.addEventListener('scroll', handleScroll)
    if (store.messagesHasMore) {
      showScrollHint.value = true
    }
  }
})

onUnmounted(() => {
  store.resetMessages()
  messagesContainer.value?.removeEventListener('scroll', handleScroll)
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
  gap: 8px;
  padding: 5px 20px;
  font-size: 11px;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
  flex-shrink: 0;
  overflow-x: auto;
}

.project-name-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  color: var(--text-secondary);
}

.stat-separator {
  display: inline-block;
  width: 1px;
  height: 12px;
  background: var(--border-light);
  flex-shrink: 0;
}

.stats-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;

  .stat-divider {
    color: var(--border-light);
    margin: 0 2px;
  }

  .success-rate {
    color: #00B894;
  }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.load-more-scroll {
  display: flex;
  justify-content: center;
  padding: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
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

// ── 滚动提示 ──────────────────────────────
.scroll-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-tertiary);
  animation: hint-bounce 2s 1.5s ease-in-out infinite;
}

.scroll-hint-top {
  margin: 0 auto 8px;
}

@keyframes hint-bounce {
  0%, 100% { opacity: 0.5; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

// hint-fade 退出动画
.hint-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

// ── 返回顶部悬浮按钮 ──────────────────────────────
.back-to-top {
  position: sticky;
  bottom: 20px;
  float: right;
  margin-right: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

// ── 手动刷新悬浮按钮 ──────────────────────────────
.manual-refresh-btn {
  position: sticky;
  bottom: 20px;
  float: right;
  margin-right: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &.is-refreshing {
    pointer-events: none;
    opacity: 0.6;

    :deep(svg) {
      animation: spin 0.8s linear infinite;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
