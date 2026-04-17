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
.titlebar {
  height: 32px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.titlebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.titlebar-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}
.titlebar-btn {
  width: 32px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}
.titlebar-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.titlebar-btn.close:hover {
  background: var(--danger);
  color: white;
}
.titlebar-btn svg {
  width: 10px;
  height: 10px;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
}
</style>
