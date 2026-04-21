<template>
  <div v-if="show" class="dialog-overlay dialog-overlay-top" @click="handleCancel">
    <div class="update-progress" @click.stop>
      <div class="progress-header">
        <div class="progress-icon">
          <svg v-if="status === 'downloading'" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <svg v-else-if="status === 'downloaded'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <div class="progress-title">
          {{ status === 'downloading' ? $t('update.downloading') : $t('update.readyToInstall') }}
        </div>
      </div>

      <div class="progress-info">
        <div class="version-info">
          <span class="label">{{ $t('update.newVersion') }}</span>
          <span class="value">{{ version }}</span>
        </div>
        <div v-if="status === 'downloading'" class="progress-percentage">
          {{ Math.round(progress) }}%
        </div>
      </div>

      <div v-if="status === 'downloading'" class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <div v-if="speed && status === 'downloading'" class="progress-speed">
        {{ speed }}
      </div>

      <div v-if="status === 'downloaded'" class="download-complete-message">
        {{ $t('update.downloadComplete') }}
      </div>

      <div class="progress-actions">
        <button v-if="status === 'downloading'" class="btn btn-secondary" @click="handleCancel">
          {{ $t('update.cancel') }}
        </button>
        <button v-if="status === 'downloaded'" class="btn btn-primary" @click="handleInstall">
          {{ $t('update.installNow') }}
        </button>
        <button v-if="status === 'downloaded'" class="btn btn-secondary" @click="handleLater">
          {{ $t('update.later') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'downloading' // 'downloading' | 'downloaded' | 'error'
  },
  progress: {
    type: Number,
    default: 0
  },
  version: {
    type: String,
    default: ''
  },
  speed: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['cancel', 'install', 'later'])

const handleCancel = () => {
  emit('cancel')
}

const handleInstall = () => {
  emit('install')
}

const handleLater = () => {
  emit('later')
}
</script>

<style lang="less" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.update-progress {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 400px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.progress-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.progress-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto var(--space-md);
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 28px;
    height: 28px;
    color: white;
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.version-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.version-info .label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.version-info .value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--success);
}

.progress-percentage {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--accent);
}

.progress-bar-container {
  margin-bottom: var(--space-sm);
}

.progress-bar {
  height: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.progress-speed {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--space-md);
}

.download-complete-message {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--success);
  padding: var(--space-md);
  background: var(--success-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.progress-actions {
  display: flex;
  gap: var(--space-md);
}

.progress-actions .btn {
  flex: 1;
}
</style>