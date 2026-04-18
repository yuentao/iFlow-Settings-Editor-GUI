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
    </div>
    <div class="server-list">
        <template v-if="serverCount > 0">
          <div
            v-for="(config, name) in servers"
            :key="name"
            class="server-item"
            :class="{ selected: selectedServer === name }"
            @click="$emit('select-server', name)"
          >
            <div class="server-info">
              <div class="server-name">{{ name }}</div>
              <div class="server-desc">{{ config.description || $t('mcp.noDescription') }}</div>
            </div>
            <div class="server-status"></div>
          </div>
        </template>
        <div v-else class="empty-state">
          <Server size="48" class="empty-state-icon" />
          <div class="empty-state-title">{{ $t('mcp.noServers') }}</div>
          <div class="empty-state-desc">{{ $t('mcp.addFirstServer') }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Server, Add } from '@icon-park/vue-next'

defineProps({
  servers: {
    type: Object,
    default: () => ({})
  },
  selectedServer: {
    type: String,
    default: null
  },
  serverCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['add-server', 'select-server'])
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
    transform: translateX(2px);
  }
  
  &.selected {
    background: var(--accent-light);
    border-left: 2px solid var(--accent);
    padding-left: 12px;
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

.server-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
}

.empty-state-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.4;
  color: var(--text-tertiary);
}

.empty-state-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.empty-state-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
