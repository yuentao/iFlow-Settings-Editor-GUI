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
          <span class="nav-item-text">{{ $t('sidebar.generalSettings') }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'projects' }" @click="$emit('navigate', 'projects')">
          <FolderOpen size="16" />
          <span class="nav-item-text">{{ $t('sidebar.projects') }}</span>
        </div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-title" v-show="!collapsed">{{ $t('sidebar.advanced') }}</div>
        <div class="nav-item" :class="{ active: currentSection === 'mcp' }" @click="$emit('navigate', 'mcp')">
          <Server size="16" />
          <span class="nav-item-text">{{ $t('sidebar.mcpServers') }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'iflow' }" @click="$emit('navigate', 'iflow')">
          <Puzzle size="16" />
          <span class="nav-item-text">{{ $t('sidebar.iflowMod') }}</span>
          <span class="experimental-badge">{{ $t('sidebar.experimental') }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'skills' }" @click="$emit('navigate', 'skills')">
          <Star size="16" />
          <span class="nav-item-text">{{ $t('sidebar.skills') }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'commands' }" @click="$emit('navigate', 'commands')">
          <Command size="16" />
          <span class="nav-item-text">{{ $t('sidebar.commands') }}</span>
        </div>
        <div class="nav-item" :class="{ active: currentSection === 'docs' }" @click="$emit('navigate', 'docs')">
          <Book size="16" />
          <span class="nav-item-text">{{ $t('sidebar.docs') }}</span>
        </div>
      </div>
    </div>
    <div class="collapse-btn" @click="toggleCollapse">
      <span class="collapse-arrow" :class="{ rotated: collapsed }">‹</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * SideBar - 侧边导航栏组件
 */
import { ref } from 'vue'
import { Config, Key, Server, Star, Dashboard, Command, Book, Puzzle, FolderOpen } from '@icon-park/vue-next'

interface Props {
  currentSection?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentSection: 'dashboard',
})

const emit = defineEmits<{
  navigate: [section: string]
}>()

const collapsed = ref(false)

const toggleCollapse = (): void => {
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

.experimental-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--warning-bg, rgba(255, 185, 83, 0.15));
  color: var(--warning, #FFB953);
  border: 1px solid var(--warning-border, rgba(255, 185, 83, 0.3));
  flex-shrink: 0;

  .sidebar.collapsed & {
    display: none;
  }
}
</style>
