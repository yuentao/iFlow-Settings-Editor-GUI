<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('mcp.title') }}</h1>
      <p class="content-desc">{{ $t('mcp.description') }}</p>
    </div>
    <div class="form-group">
      <div class="page-actions">
        <button class="btn btn-primary" @click="$emit('add-server')">
          <Add size="14" />
          {{ $t('mcp.addServerBtn') }}
        </button>
        <button class="btn btn-secondary" @click="$emit('quick-add')">
          <Lightning size="14" />
          {{ $t('mcp.quickAddBtn') }}
        </button>
    </div>
    <div class="server-list">
        <template v-if="serverCount > 0">
          <div
            v-for="(config, name) in servers"
            :key="name"
            class="server-item"
          >
            <div class="server-info">
              <div class="server-name">{{ name }}</div>
              <div class="server-desc">{{ config.description || $t('mcp.noDescription') }}</div>
            </div>
            <div class="server-actions">
              <button class="action-btn" @click.stop="$emit('edit-server', name)" :title="$t('mcp.edit')">
                <Edit size="14" />
              </button>
              <button class="action-btn action-btn-danger" @click.stop="$emit('delete-server', name)" :title="$t('mcp.delete')">
                <Delete size="14" />
              </button>
            </div>
          </div>
        </template>
        <EmptyState
          v-else
          :icon="Server"
          :title="$t('mcp.noServers')"
          :description="$t('mcp.addFirstServer')"
          :actionText="$t('mcp.addServerBtn')"
          embedded
          @action="$emit('add-server')"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { Server, Add, Lightning, Delete, Edit } from '@icon-park/vue-next'
import EmptyState from '@/components/EmptyState.vue'

defineProps({
  servers: {
    type: Object,
    default: () => ({})
  },
  serverCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['add-server', 'quick-add', 'edit-server', 'delete-server'])
</script>

<style lang="less" scoped>
.page-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

// Windows 11 Style Server List - Fluent Design
.server-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

.server-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.15s ease;
  animation: fadeIn 0.3s ease backwards;
  
  &:nth-child(1) { animation-delay: 0.02s; }
  &:nth-child(2) { animation-delay: 0.04s; }
  &:nth-child(3) { animation-delay: 0.06s; }
  &:nth-child(4) { animation-delay: 0.08s; }
  &:nth-child(5) { animation-delay: 0.1s; }
  &:nth-child(6) { animation-delay: 0.12s; }
  &:nth-child(7) { animation-delay: 0.14s; }
  &:nth-child(8) { animation-delay: 0.16s; }
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: var(--control-fill);
  }
}

.server-info {
  flex: 1;
  min-width: 0;
}

.server-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.server-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;

  .server-item:hover & {
    opacity: 1;
  }
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.1s ease;

  &:hover {
    background: var(--control-fill);
    color: var(--text-primary);
  }

  &.action-btn-danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
