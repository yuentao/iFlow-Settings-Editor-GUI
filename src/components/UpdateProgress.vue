<template>
  <div v-if="show" class="dialog-overlay dialog-overlay-top" @click="handleCancel" @keyup.esc="handleCancel" tabindex="-1" ref="overlayRef">
    <div class="update-progress" @click.stop>
      <div class="progress-header">
        <div class="progress-icon">
          <div v-if="status === 'downloading'" class="progress-spinner"></div>
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

      <div v-if="status === 'downloading'" class="progress-section">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="progress-meta">
          <span v-if="speed" class="progress-speed">{{ speed }}</span>
        </div>
      </div>

      <div v-if="status === 'downloaded'" class="download-complete-message">
        {{ $t('update.downloadComplete') }}
      </div>

      <div v-if="status === 'downloaded' && releaseNotes" class="update-notes">
        <div class="notes-title">{{ $t('update.releaseNotes') }}</div>
        <div class="notes-content" v-html="formattedReleaseNotes"></div>
      </div>

      <div class="progress-actions">
        <button v-if="status === 'downloading'" class="btn btn-secondary" @click="handleBackground">
          {{ $t('update.background') }}
        </button>
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
import { computed, ref, watch, nextTick } from 'vue'

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
  },
  releaseNotes: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['cancel', 'install', 'later', 'background'])

const overlayRef = ref(null)

watch(() => props.show, (val) => {
  if (val) {
    nextTick(() => {
      overlayRef.value?.focus()
    })
  }
})

import { marked } from 'marked'

// 格式化 Markdown 格式的更新日志
const formattedReleaseNotes = computed(() => {
  if (!props.releaseNotes) return ''
  return marked.parse(props.releaseNotes, {
    breaks: true,
    gfm: true,
  })
})

const handleCancel = () => {
  emit('cancel')
}

const handleInstall = () => {
  emit('install')
}

const handleLater = () => {
  emit('later')
}

const handleBackground = () => {
  emit('background')
}
</script>

<style lang="less" scoped>
.update-progress {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 400px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
  animation: scaleIn 0.2s ease;
}

.progress-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.progress-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto var(--space-md);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:has(.progress-spinner) {
    background: none;
  }

  &:has(svg) {
    background: linear-gradient(135deg, var(--accent), var(--accent-light));
  }

  svg {
    width: 28px;
    height: 28px;
    color: white;
  }
}

.progress-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.progress-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius);
  margin-bottom: var(--space-lg);
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
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.progress-section {
  margin-bottom: var(--space-lg);
}

.progress-bar-track {
  height: 3px;
  background: var(--control-fill-hover);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  min-width: 2px;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 40px;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
    animation: progress-shimmer 1.5s ease-in-out infinite;
  }
}

@keyframes progress-shimmer {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.progress-meta {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-xs);
}

.progress-speed {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.01em;
}

.download-complete-message {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--success);
  padding: var(--space-md);
  background: var(--success-bg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-lg);
}

.update-notes {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  max-height: 240px;
  overflow-y: auto;
}

.notes-title {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xs);
}

.notes-content {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;

  // Markdown 渲染样式
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--space-sm) 0 var(--space-xs);
  }

  :deep(p) {
    margin: var(--space-xs) 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: var(--space-xs) 0;
    padding-left: var(--space-lg);
  }

  :deep(li) {
    margin: 2px 0;
  }

  :deep(code) {
    background: var(--bg-primary);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  :deep(pre) {
    background: var(--bg-primary);
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    overflow-x: auto;
    margin: var(--space-xs) 0;

    code {
      background: none;
      padding: 0;
    }
  }

  :deep(blockquote) {
    border-left: 3px solid var(--accent);
    margin: var(--space-xs) 0;
    padding-left: var(--space-sm);
    color: var(--text-tertiary);
  }

  :deep(a) {
    color: var(--accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(strong) {
    font-weight: 600;
    color: var(--text-primary);
  }

  :deep(em) {
    font-style: italic;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: var(--space-sm) 0;
  }
}

.progress-actions {
  display: flex;
  gap: var(--space-md);
}

.progress-actions .btn {
  flex: 1;
}
</style>