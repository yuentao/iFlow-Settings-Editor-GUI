<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('dashboard.title') }}</h1>
      <p class="content-desc">{{ $t('dashboard.description') }}</p>
    </div>

    <!-- 状态卡片网格 -->
    <div class="stats-grid">
      <!-- API 配置 -->
      <div class="stat-card card-appear" style="animation-delay: 0.02s" @click="$emit('navigate', 'api')">
        <div class="stat-icon stat-icon-accent">
          <Key size="28" />
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ $t('dashboard.currentApiConfig') }}</div>
          <div class="stat-value">{{ currentApiProfile }}</div>
          <div class="stat-sub" v-if="currentApiProfileData?.modelName">
            {{ currentApiProfileData.modelName }}
          </div>
        </div>
        <div class="stat-badge">{{ apiProfileCount }} {{ $t('dashboard.profiles') }}</div>
      </div>

      <!-- MCP 服务器 -->
      <div class="stat-card card-appear" style="animation-delay: 0.04s" @click="$emit('navigate', 'mcp')">
        <div class="stat-icon stat-icon-success">
          <Server size="28" />
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ $t('dashboard.mcpServers') }}</div>
          <div class="stat-value">{{ serverCount }}</div>
          <div class="stat-sub" v-if="serverCount > 0">
            {{ $t('dashboard.configured') }}
          </div>
          <div class="stat-sub stat-sub-empty" v-else>
            {{ $t('dashboard.noServers') }}
          </div>
        </div>
      </div>

      <!-- 技能 -->
      <div class="stat-card card-appear" style="animation-delay: 0.06s" @click="$emit('navigate', 'skills')">
        <div class="stat-icon stat-icon-warning">
          <Star size="28" />
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ $t('dashboard.skills') }}</div>
          <div class="stat-value">{{ skillCount }}</div>
          <div class="stat-sub" v-if="skillCount > 0">
            {{ $t('dashboard.installed') }}
          </div>
          <div class="stat-sub stat-sub-empty" v-else>
            {{ $t('dashboard.noSkills') }}
          </div>
        </div>
      </div>

      <!-- 命令管理 -->
      <div class="stat-card card-appear" style="animation-delay: 0.08s" @click="$emit('navigate', 'commands')">
        <div class="stat-icon stat-icon-accent">
          <Command size="28" />
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ $t('dashboard.commands') }}</div>
          <div class="stat-value">{{ commandCount }}</div>
          <div class="stat-sub" v-if="commandCount > 0">
            {{ $t('dashboard.installed') }}
          </div>
          <div class="stat-sub stat-sub-empty" v-else>
            {{ $t('dashboard.noCommands') }}
          </div>
        </div>
      </div>

      <!-- 云同步 -->
      <div class="stat-card card-appear" style="animation-delay: 0.1s" @click="$emit('navigate', 'settings')">
        <div class="stat-icon" :class="cloudSyncStatusClass">
          <Refresh size="28" />
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ $t('dashboard.cloudSync') }}</div>
          <div class="stat-value stat-value-sm">{{ cloudSyncStatusLabel }}</div>
          <div class="stat-sub" v-if="cloudStore.status.lastSyncAt">
            {{ $t('dashboard.lastSync') }}: {{ formatTime(cloudStore.status.lastSyncAt) }}
          </div>
          <div class="stat-sub stat-sub-empty" v-else-if="cloudStore.status.enabled">
            {{ $t('dashboard.neverSynced') }}
          </div>
        </div>
        <div class="stat-actions">
          <button
            class="btn btn-primary btn-xs"
            :disabled="!cloudStore.isConfigured || cloudStore.isSyncing"
            @click.stop="handleSyncNow"
          >
            <Loading v-if="cloudStore.isSyncing" size="12" class="spin" />
            <Refresh v-else size="12" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Key, Server, Star, Command, Refresh, Loading } from '@icon-park/vue-next'
import { useCloudSyncStore } from '@/stores/cloudSync'

const { t } = useI18n()
const cloudStore = useCloudSyncStore()

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
  currentApiProfile: {
    type: String,
    default: 'default',
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

const currentApiProfileData = computed(() => {
  if (props.settings.apiProfiles && props.settings.apiProfiles[props.currentApiProfile]) {
    return props.settings.apiProfiles[props.currentApiProfile]
  }
  return props.settings
})

const apiProfileCount = computed(() => {
  if (!props.settings.apiProfiles) return 1
  return Object.keys(props.settings.apiProfiles).length
})

// 云同步状态
const cloudSyncStatusClass = computed(() => {
  if (!cloudStore.status.enabled) return 'stat-icon-secondary'
  if (cloudStore.isSyncing) return 'stat-icon-info'
  if (cloudStore.status.lastSyncError) return 'stat-icon-danger'
  return 'stat-icon-success'
})

const cloudSyncStatusLabel = computed(() => {
  if (!cloudStore.status.enabled) return t('dashboard.cloudSyncDisabled')
  if (cloudStore.isSyncing) return t('dashboard.syncing')
  if (cloudStore.status.lastSyncError) return t('dashboard.syncError')
  return t('dashboard.ready')
})

function formatTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString()
}

async function handleSyncNow() {
  if (cloudStore.cachedPassword) {
    await cloudStore.syncNow()
  }
}

onMounted(async () => {
  await cloudStore.loadStatus()
})
</script>

<style lang="less" scoped>
// Card animation
.card-appear {
  animation: fadeInUp 0.3s ease backwards;
}

// Stats grid - 最大化显示，2x2 网格
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
  align-content: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

// Stat card - 最大化尺寸
.stat-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  min-height: 120px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--accent);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover {
    border-color: var(--accent);
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);

    &::before {
      opacity: 1;
    }
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.stat-icon-accent {
    background: var(--accent-light);
    color: var(--accent);
  }

  &.stat-icon-success {
    background: rgba(16, 185, 129, 0.12);
    color: var(--success);
  }

  &.stat-icon-warning {
    background: rgba(245, 158, 11, 0.12);
    color: var(--warning);
  }

  &.stat-icon-info {
    background: rgba(59, 130, 246, 0.12);
    color: var(--info);
  }
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
}

.stat-sub {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: var(--space-sm);

  &.stat-sub-empty {
    opacity: 0.5;
  }
}

.stat-badge {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  background: var(--control-fill);
  color: var(--text-tertiary);
  padding: 4px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.stat-actions {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.stat-value-sm {
  font-size: 1.1rem;
}

.stat-icon-secondary {
  background: var(--bg-secondary);
  color: var(--text-tertiary);
}

.stat-icon-danger {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
}

.switch-xs {
  width: 32px;
  height: 16px;

  .slider:before {
    height: 10px;
    width: 10px;
    left: 3px;
    bottom: 3px;
  }

  input:checked + .slider:before {
    transform: translateX(16px);
  }
}

.btn-xs {
  padding: 4px 8px;
  font-size: 12px;
  min-height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
