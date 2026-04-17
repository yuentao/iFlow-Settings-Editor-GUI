<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('mcp.title') }}</h1>
      <p class="content-desc">{{ $t('mcp.description') }}</p>
    </div>
    <div class="form-group">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <label class="form-label" style="margin: 0">{{ $t('mcp.serverList') }}</label>
        <button class="btn btn-primary" @click="$emit('add-server')" style="padding: 6px 12px; font-size: 12px">
          <Add size="12" />
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
.server-list {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-secondary);
}
.server-item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.3s ease backwards;
}
.server-item:nth-child(1) { animation-delay: 0.02s; }
.server-item:nth-child(2) { animation-delay: 0.04s; }
.server-item:nth-child(3) { animation-delay: 0.06s; }
.server-item:nth-child(4) { animation-delay: 0.08s; }
.server-item:nth-child(5) { animation-delay: 0.1s; }
.server-item:nth-child(6) { animation-delay: 0.12s; }
.server-item:nth-child(7) { animation-delay: 0.14s; }
.server-item:nth-child(8) { animation-delay: 0.16s; }
.server-item:last-child { border-bottom: none; }
.server-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(4px);
}
.server-item.selected {
  background: var(--accent-light);
  border-left: 3px solid var(--accent);
  padding-left: 15px;
}
.server-info {
  flex: 1;
  min-width: 0;
}
.server-name {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.server-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.server-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
  animation: pulse 2s ease-in-out infinite;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
}
.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
  color: var(--text-tertiary);
}
.empty-state-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-secondary);
}
.empty-state-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 20px;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
