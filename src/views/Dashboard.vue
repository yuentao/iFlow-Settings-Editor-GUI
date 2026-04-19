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

      <!-- 主题 -->
      <div class="stat-card card-appear" style="animation-delay: 0.08s" @click="$emit('navigate', 'general')">
        <div class="stat-icon stat-icon-info">
          <Setting size="28" />
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ $t('dashboard.theme') }}</div>
          <div class="stat-value">{{ themeLabel }}</div>
          <div class="stat-sub">{{ themeDescription }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Key, Server, Star, Setting } from '@icon-park/vue-next'

const { t } = useI18n()

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
})

defineEmits(['navigate'])

const themeLabel = computed(() => {
  const theme = props.settings.uiTheme
  if (theme === 'Light') return t('theme.light')
  if (theme === 'Dark') return t('theme.dark')
  return t('theme.system')
})

const themeDescription = computed(() => {
  if (props.settings.uiTheme === 'System') return t('dashboard.followSystem')
  return t('dashboard.manual')
})

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
</style>
