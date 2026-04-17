<template>
  <aside class="sidebar">
    <div class="sidebar-section">
      <div class="sidebar-title">{{ $t('sidebar.general') }}</div>
      <div class="nav-item" :class="{ active: currentSection === 'general' }" @click="$emit('navigate', 'general')">
        <Config size="16" />
        <span class="nav-item-text">{{ $t('sidebar.basicSettings') }}</span>
      </div>
      <div class="nav-item" :class="{ active: currentSection === 'api' }" @click="$emit('navigate', 'api')">
        <Key size="16" />
        <span class="nav-item-text">{{ $t('sidebar.apiConfig') }}</span>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-title">{{ $t('sidebar.advanced') }}</div>
      <div class="nav-item" :class="{ active: currentSection === 'mcp' }" @click="$emit('navigate', 'mcp')">
        <Server size="16" />
        <span class="nav-item-text">{{ $t('sidebar.mcpServers') }}</span>
        <span class="nav-item-badge">{{ serverCount }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { Config, Key, Server } from '@icon-park/vue-next'

defineProps({
  currentSection: {
    type: String,
    default: 'general',
  },
  serverCount: {
    type: Number,
    default: 0,
  },
})

defineEmits(['navigate'])
</script>

<style lang="less" scoped>
.sidebar {
  width: 240px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex-shrink: 0;
  overflow-y: auto;
}
.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  padding: 0 14px;
  margin-bottom: 8px;
}
.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  gap: 5px;
}
.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.nav-item.active {
  background: var(--accent-light);
  color: var(--accent);
}
.nav-item-badge {
  margin-left: auto;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
</style>
