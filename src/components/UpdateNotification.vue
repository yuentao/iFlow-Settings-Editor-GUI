<template>
  <div v-if="show" class="dialog-overlay dialog-overlay-top" @click="handleCancel">
    <div class="update-notification" @click.stop>
      <div class="update-header">
        <div class="update-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div class="update-title">{{ $t('update.available') }}</div>
      </div>

      <div class="update-content">
        <div class="update-version">
          <span class="version-label">{{ $t('update.currentVersion') }}</span>
          <span class="version-value current">{{ currentVersion }}</span>
        </div>
        <div class="update-arrow">→</div>
        <div class="update-version">
          <span class="version-label">{{ $t('update.newVersion') }}</span>
          <span class="version-value new">{{ latestVersion }}</span>
        </div>
      </div>

      <div v-if="releaseNotes" class="update-notes">
        <div class="notes-title">{{ $t('update.releaseNotes') }}</div>
        <div class="notes-content" v-html="formattedReleaseNotes"></div>
      </div>

      <div class="update-actions">
        <button class="btn btn-secondary" @click="handleLater">
          {{ $t('update.later') }}
        </button>
        <button class="btn btn-secondary" @click="handleBackground">
          {{ $t('update.background') }}
        </button>
        <button class="btn btn-primary" @click="handleUpdate">
          {{ $t('update.updateNow') }}
        </button>
      </div>

      <div class="update-hint">
        {{ $t('update.updateHint') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentVersion: {
    type: String,
    default: ''
  },
  latestVersion: {
    type: String,
    default: ''
  },
  releaseNotes: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update', 'later', 'background', 'close'])

// 格式化 Markdown 格式的更新日志
const formattedReleaseNotes = computed(() => {
  if (!props.releaseNotes) return ''
  // 配置 marked 选项
  marked.setOptions({
    breaks: true, // 将换行转换为 <br>
    gfm: true, // 启用 GitHub  flavored Markdown
  })
  return marked.parse(props.releaseNotes)
})

const handleUpdate = () => {
  emit('update')
}

const handleLater = () => {
  emit('later')
  emit('close')
}

const handleBackground = () => {
  emit('background')
  emit('close')
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

.update-notification {
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

.update-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.update-icon {
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

.update-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.update-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-lg);
}

.update-version {
  text-align: center;
}

.version-label {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xs);
}

.version-value {
  display: block;
  font-size: var(--font-size-md);
  font-weight: 600;
}

.version-value.current {
  color: var(--text-secondary);
}

.version-value.new {
  color: var(--success);
}

.update-arrow {
  color: var(--text-tertiary);
  font-size: var(--font-size-lg);
}

.update-notes {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
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

.update-actions {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.update-actions .btn {
  flex: 1;
}

.update-hint {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}
</style>