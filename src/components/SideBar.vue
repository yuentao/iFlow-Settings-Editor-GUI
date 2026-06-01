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
          <span class="experimental-badge">{{ $t('sidebar.experimental') }}</span>
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
    <!-- 全局后台下载进度条 -->
    <Transition name="download-bar">
      <div v-if="isBackgroundDownloading" class="global-download-bar" @click="$emit('show-download-detail')">
        <div class="global-download-fill" :style="{ width: updateDownloadProgress + '%' }"></div>
        <div class="global-download-inner">
          <svg class="global-download-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 1v9M4 7l4 4 4-4M2 13h12" />
          </svg>
          <span class="global-download-text">{{ $t('update.backgroundDownloading', { progress: Math.round(updateDownloadProgress) }) }}</span>
        </div>
      </div>
    </Transition>
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
  isBackgroundDownloading?: boolean
  updateDownloadProgress?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentSection: 'dashboard',
  isBackgroundDownloading: false,
  updateDownloadProgress: 0,
})

const emit = defineEmits<{
  navigate: [section: string]
  'show-download-detail': []
}>()

const collapsed = ref(false)

const toggleCollapse = (): void => {
  collapsed.value = !collapsed.value
}
</script>

<style lang="less" scoped>
// Windows 11 Fluent 2 NavView Sidebar
.sidebar {
  width: 220px;
  background: var(--bg-mica);
  backdrop-filter: blur(20px) saturate(125%);
  -webkit-backdrop-filter: blur(20px) saturate(125%);
  border-right: 1px solid var(--border-subtle, var(--border-light));
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--duration-slow) var(--ease-out);
}

.nav-content {
  flex: 1;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

// 全局后台下载进度条（侧边栏底部）
.global-download-bar {
  height: 28px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background var(--duration-slow) var(--ease-out);

  &:hover {
    background: var(--control-fill);

    .global-download-text {
      color: var(--text-primary);
    }
  }

  .sidebar.collapsed & {
    height: 24px;
  }
}

.global-download-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  transition: width var(--duration-slow) var(--ease-emphasized);
  opacity: 0.12;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -60%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
    animation: download-shimmer 2s ease-in-out infinite;
  }
}

@keyframes download-shimmer {
  0% { left: -60%; }
  100% { left: 100%; }
}

.global-download-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  width: 100%;
  transition: transform var(--transition-fast) var(--ease-out);

  .sidebar.collapsed & {
    justify-content: center;
    padding: 0 4px;
  }
}

.global-download-icon {
  width: 14px;
  height: 14px;
  color: var(--accent);
  flex-shrink: 0;
  animation: download-bounce 1.5s ease-in-out infinite;

  .sidebar.collapsed & {
    width: 16px;
    height: 16px;
  }
}

@keyframes download-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(2px); }
}

.global-download-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .sidebar.collapsed & {
    display: none;
  }
}

// 进度条进出动画
.download-bar-enter-active {
  animation: bar-slide-in 0.25s ease-out;
}

.download-bar-leave-active {
  animation: bar-slide-out 0.2s ease-in;
}

@keyframes bar-slide-in {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 28px;
  }
}

@keyframes bar-slide-out {
  from {
    opacity: 1;
    max-height: 28px;
  }
  to {
    opacity: 0;
    max-height: 0;
  }
}

.collapse-btn {
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--border-subtle, var(--border-light));
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all var(--transition-fast) var(--ease-out);
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
  transition: transform var(--duration-slow) var(--ease-out);

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

// Win11 Fluent NavView item — with left accent pill indicator
.nav-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--duration-normal) var(--ease-out),
    color var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  gap: 10px;
  position: relative;

  // Fluent Reveal hover
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      circle at var(--reveal-x, 50%) var(--reveal-y, 50%),
      rgba(255, 255, 255, 0.06) 0%,
      transparent 50%
    );
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
    pointer-events: none;
  }

  // Left accent pill indicator (Win11 NavView signature)
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%) scaleY(0);
    width: 3px;
    height: 16px;
    border-radius: 0 2px 2px 0;
    background: var(--accent);
    transition: transform var(--duration-normal) var(--ease-emphasized);
  }

  .sidebar.collapsed & {
    padding: 10px;
    justify-content: center;

    :deep(.iconpark-icon) {
      font-size: 20px;
    }

    // Collapse indicator to bottom dot
    &::after {
      top: auto;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%) scaleX(0);
      width: 4px;
      height: 4px;
      border-radius: 50%;
    }
  }

  &:hover {
    background: var(--control-fill);
    color: var(--text-primary);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    background: var(--control-fill-pressed);
  }

  &.active {
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 500;

    // Show left accent pill
    &::after {
      transform: translateY(-50%) scaleY(1);
    }

    .sidebar.collapsed &::after {
      transform: translateX(-50%) scaleX(1);
    }

    .iconpark-icon {
      color: var(--accent);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--text-primary);
    outline-offset: -2px;
    border-radius: var(--radius);
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
