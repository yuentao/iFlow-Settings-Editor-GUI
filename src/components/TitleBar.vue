<template>
  <div class="titlebar">
    <div class="titlebar-left">
      <img class="titlebar-icon" src="/icon.png" alt="" />
      <span class="titlebar-title">{{ $t('app.title') }}</span>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-btn" @click="minimize" :title="$t('window.minimize')">
        <svg viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" /></svg>
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

<script setup lang="ts">
/**
 * TitleBar - 窗口标题栏组件
 * Windows 11 Fluent 2 Mica-inspired title bar
 * 提供最小化、关闭按钮
 */

const minimize = (): void => {
  window.electronAPI.minimize()
}

const close = (): void => {
  window.electronAPI.close()
}
</script>

<style lang="less" scoped>
// Windows 11 Fluent 2 Title Bar — Mica-inspired
.titlebar {
  height: 32px;
  background: var(--bg-mica);
  backdrop-filter: blur(20px) saturate(125%);
  -webkit-backdrop-filter: blur(20px) saturate(125%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 12px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--border-subtle, var(--border-light));
  flex-shrink: 0;
  transition: background var(--duration-slow) var(--ease-out);
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.titlebar-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
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
  transition:
    background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
  position: relative;
  overflow: hidden;

  // Fluent Reveal highlight
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at var(--reveal-x, 50%) var(--reveal-y, 50%),
      rgba(255, 255, 255, 0.06) 0%,
      transparent 50%
    );
    opacity: 0;
    transition: opacity var(--duration-normal) var(--ease-out);
    pointer-events: none;
  }

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);

    &::after {
      opacity: 1;
    }
  }

  &:active {
    background: var(--control-fill-pressed);
  }

  &.close:hover {
    background: #c42b1c;
    color: #ffffff;

    &::after {
      background: radial-gradient(
        circle at var(--reveal-x, 50%) var(--reveal-y, 50%),
        rgba(255, 255, 255, 0.15) 0%,
        transparent 50%
      );
      opacity: 1;
    }
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
