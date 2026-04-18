<template>
  <footer class="footer">
    <div class="footer-status">
      <div class="footer-status-dot"></div>
      <span>{{ $t('api.currentConfig') }}: {{ currentProfile }}</span>
    </div>
  </footer>
</template>

<script setup>
defineProps({
  currentProfile: {
    type: String,
    default: 'default'
  }
})
</script>

<style lang="less" scoped>
// Windows 11 Style Footer - Fluent Design
.footer {
  height: 26px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.footer-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.footer-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
}
</style>
