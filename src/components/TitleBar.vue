<template>
  <div class="titlebar">
    <div class="titlebar-left">
      <span class="titlebar-title">{{ $t('app.title') }}</span>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-btn" @click="minimize" :title="$t('window.minimize')">
        <svg viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" /></svg>
      </button>
      <button class="titlebar-btn" @click="maximize" :title="$t('window.maximize')">
        <svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" stroke-width="1" stroke="currentColor" fill="none" /></svg>
      </button>
      <button class="titlebar-btn close" @click="close" :title="$t('window.close')">
        <svg viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
const minimize = () => window.electronAPI.minimize()
const maximize = () => window.electronAPI.maximize()
const close = () => window.electronAPI.close()
</script>

<style lang="less" scoped>
// Windows 11 Style Title Bar - Fluent Design
.titlebar {
  height: 32px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 12px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.titlebar-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  width: 46px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.1s ease;
  
  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }
  
  &:active {
    background: var(--control-fill-pressed);
  }
  
  &.close:hover {
    background: #c42b1c;
    color: #ffffff;
  }
  
  &.close:active {
    background: #a72b1c;
  }
  
  svg {
    width: 10px;
    height: 10px;
    stroke: currentColor;
    stroke-width: 1.5;
    fill: none;
  }
}
</style>
