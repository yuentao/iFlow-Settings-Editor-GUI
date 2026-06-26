<template>
  <div class="sessions-section">
    <div class="sessions-header">
      <span class="sessions-label">{{ $t('projects.sessionCount', { count: sessions.length }) }}</span>
    </div>
    <GenericList :items="sessions" item-key="id" :loading="loading" skeleton-type="list" :skeleton-count="3">
      <template #item-icon>
        <Communication size="20" />
      </template>

      <template #item-info="{ item: session }">
        <div class="session-title" @click="$emit('openSession', session)">
          <span class="session-id">{{ session.firstUserMessage || $t('projects.newSession') }}</span>
          <span v-if="session.gitBranch" class="git-branch">
            <GeneralBranch size="10" />
            {{ session.gitBranch }}
          </span>
        </div>
        <div class="session-meta">
          <span class="meta-item">
            {{ $t('projects.messageCount', { count: session.messageCount }) }}
          </span>
          <span class="meta-item">
            {{ formatDateTime(session.lastMessageAt) }}
          </span>
          <span v-if="session.totalInputTokens || session.totalOutputTokens" class="meta-item token-info"> Token: {{ formatTokenCount(session.totalInputTokens + session.totalOutputTokens) }} </span>
        </div>
      </template>

      <template #item-actions="{ item: session }">
        <button class="action-btn" :title="$t('projects.export')" :aria-label="$t('projects.export')" @click.stop="$emit('exportSession', session)">
          <Export size="14" />
        </button>
        <button class="action-btn danger" :title="$t('projects.delete')" :aria-label="$t('projects.delete')" @click.stop="$emit('deleteSession', session)">
          <Delete size="14" />
        </button>
      </template>
    </GenericList>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more">
      <button class="load-more-btn" @click="$emit('loadMore')" :disabled="loadingMore">
        {{ loadingMore ? $t('projects.loading') : $t('projects.loadMore') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import GenericList from '@/components/GenericList.vue'
import { Communication, GeneralBranch, Export, Delete } from '@icon-park/vue-next'
import type { SessionSummary } from '@/stores/projects'

defineProps<{
  sessions: SessionSummary[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
}>()

defineEmits<{
  openSession: [session: SessionSummary]
  exportSession: [session: SessionSummary]
  deleteSession: [session: SessionSummary]
  loadMore: []
}>()

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

function formatTokenCount(count: number): string {
  if (!count) return '0'
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
  return String(count)
}
</script>

<style lang="less" scoped>
.sessions-section {
  padding: 0 16px;
}

.sessions-header {
  padding: 6px 16px;
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.session-title {
  cursor: pointer;
  min-width: 0;

  .session-id {
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  &:hover .session-id {
    color: var(--accent);
  }
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

.session-meta {
  display: flex;
  gap: 10px;
  margin-top: 3px;

  .meta-item {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .token-info {
    color: var(--accent);
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }

  &.danger:hover {
    background: rgba(196, 49, 49, 0.1);
    color: var(--danger, #c43131);
  }
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 16px;

  .load-more-btn {
    padding: 6px 16px;
    border: 1px solid var(--border-light);
    background: var(--control-fill);
    color: var(--text-secondary);
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: var(--control-fill-hover);
      color: var(--text-primary);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
