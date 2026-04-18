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
      <div class="nav-item" :class="{ active: currentSection === 'skills' }" @click="$emit('navigate', 'skills')">
        <Star size="16" />
        <span class="nav-item-text">{{ $t('sidebar.skills') }}</span>
        <span class="nav-item-badge">{{ skillCount }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { Config, Key, Server, Star } from '@icon-park/vue-next'

defineProps({
  currentSection: {
    type: String,
    default: 'general',
  },
  serverCount: {
    type: Number,
    default: 0,
  },
  skillCount: {
    type: Number,
    default: 0,
  },
})

defineEmits(['navigate'])
</script>

<style lang="less" scoped>
// Windows 11 Style Sidebar - Fluent Design
.sidebar {
  width: 220px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  padding: 0 12px;
  margin-bottom: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  gap: 10px;
  
  &:hover {
    background: var(--control-fill);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 500;
    
    .iconpark-icon {
      color: var(--accent);
    }
  }
}

.nav-item-text {
  flex: 1;
}

.nav-item-badge {
  margin-left: auto;
  background: var(--control-fill);
  color: var(--text-tertiary);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  min-width: 24px;
  text-align: center;
}
</style>
