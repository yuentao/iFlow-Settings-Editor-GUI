<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="nav-content">
      <div class="sidebar-section">
        <div class="sidebar-title" v-show="!collapsed">{{ $t('sidebar.general') }}</div>
        <div class="nav-item" :class="{ active: currentSection === 'dashboard' }" @click="$emit('navigate', 'dashboard')">
          <Dashboard size="16" />
          <span class="nav-item-text">{{ $t('sidebar.dashboard') }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'api' }" @click="$emit('navigate', 'api')">
          <Key size="16" />
          <span class="nav-item-text">{{ $t('sidebar.apiConfig') }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'general' }" @click="$emit('navigate', 'general')">
          <Config size="16" />
          <span class="nav-item-text">{{ $t('sidebar.basicSettings') }}</span>
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-title" v-show="!collapsed">{{ $t('sidebar.advanced') }}</div>
        <div class="nav-item" :class="{ active: currentSection === 'mcp' }" @click="$emit('navigate', 'mcp')">
          <Server size="16" />
          <span class="nav-item-text">{{ $t('sidebar.mcpServers') }}</span>
          <span class="nav-item-badge" v-show="!collapsed">{{ serverCount }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'skills' }" @click="$emit('navigate', 'skills')">
          <Star size="16" />
          <span class="nav-item-text">{{ $t('sidebar.skills') }}</span>
          <span class="nav-item-badge" v-show="!collapsed">{{ skillCount }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'commands' }" @click="$emit('navigate', 'commands')">
          <Command size="16" />
          <span class="nav-item-text">{{ $t('sidebar.commands') }}</span>
          <span class="nav-item-badge" v-show="!collapsed">{{ commandCount }}</span>
        </div>
      </div>
    </div>
    <div class="collapse-btn" @click="toggleCollapse">
      <span class="collapse-arrow" :class="{ rotated: collapsed }">‹</span>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { Config, Key, Server, Star, Dashboard, Command } from '@icon-park/vue-next'

defineProps({
  currentSection: {
    type: String,
    default: 'dashboard',
  },
  serverCount: {
    type: Number,
    default: 0,
  },
  skillCount: {
    type: Number,
    default: 0,
  },
  commandCount: {
    type: Number,
    default: 0,
  },
})

defineEmits(['navigate'])

const collapsed = ref(false)

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<style lang="less" scoped>
// Windows 11 Style Sidebar - Fluent Design
.sidebar {
  width: 220px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s ease;

  &.collapsed {
    width: 52px;
  }
}

.nav-content {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

.collapse-btn {
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--border-light);
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: var(--control-fill);
    color: var(--text-primary);
  }
}

.collapse-arrow {
  font-size: 18px;
  font-weight: 300;
  line-height: 1;
  transition: transform 0.2s ease;

  &.rotated {
    transform: rotate(180deg);
  }
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

  .sidebar.collapsed & {
    padding: 10px;
    justify-content: center;

    :deep(.iconpark-icon) {
      font-size: 20px;
    }
  }

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

  .sidebar.collapsed & {
    display: none;
  }
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

  .sidebar.collapsed & {
    display: none;
  }
}
</style>
