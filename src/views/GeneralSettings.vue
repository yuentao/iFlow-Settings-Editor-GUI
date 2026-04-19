<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('general.title') }}</h1>
      <p class="content-desc">{{ $t('general.description') }}</p>
    </div>

    <!-- 语言与界面 -->
    <div class="card card-appear" style="animation-delay: 0.02s">
      <div class="card-title">
        <Globe size="16" />
        {{ $t('general.languageInterface') }}
      </div>
      <div class="settings-grid">
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.language') }}</label>
            <p class="setting-desc">{{ $t('general.languageDesc') || '' }}</p>
          </div>
          <select class="form-select setting-select" v-model="localSettings.language">
            <option value="zh-CN">{{ $t('languages.zh-CN') }}</option>
            <option value="en-US">{{ $t('languages.en-US') }}</option>
            <option value="ja-JP">{{ $t('languages.ja-JP') }}</option>
          </select>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.theme') }}</label>
            <p class="setting-desc">{{ $t('general.themeDesc') || '' }}</p>
          </div>
          <select class="form-select setting-select" v-model="localSettings.uiTheme">
            <option value="Light">{{ $t('theme.light') }}</option>
            <option value="Dark">{{ $t('theme.dark') }}</option>
            <option value="System">{{ $t('theme.system') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 开机自启动 -->
    <div class="card card-appear" style="animation-delay: 0.05s">
      <div class="card-title">
        <Rocket size="16" />
        {{ $t('general.autoLaunchSettings') }}
      </div>
      <div class="setting-item setting-item-main">
        <div class="setting-info">
          <label class="setting-label">{{ $t('general.autoLaunch') }}</label>
          <p class="setting-desc">{{ $t('general.autoLaunchHint') }}</p>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="autoLaunchEnabled" @change="onAutoLaunchChange" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- 其他设置 -->
    <div class="card card-appear" style="animation-delay: 0.08s">
      <div class="card-title">
        <Setting size="16" />
        {{ $t('general.otherSettings') }}
      </div>
      <div class="settings-grid">
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.bootAnimation') }}</label>
          </div>
          <select class="form-select setting-select" v-model="localSettings.bootAnimationShown">
            <option :value="true">{{ $t('general.bootAnimationShown') }}</option>
            <option :value="false">{{ $t('general.bootAnimationNotShown') }}</option>
          </select>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.checkpointing') }}</label>
          </div>
          <select class="form-select setting-select" v-model="localSettings.checkpointing.enabled">
            <option :value="true">{{ $t('general.enabled') }}</option>
            <option :value="false">{{ $t('general.disabled') }}</option>
          </select>
        </div>
      </div>
      <div class="setting-divider"></div>
      <div class="setting-item setting-item-full" v-if="supportsAcrylic">
        <div class="setting-info">
          <label class="setting-label">{{ $t('general.acrylicEffect') }}</label>
          <p class="setting-desc">{{ localSettings.acrylicIntensity }}% — {{ $t('general.acrylicMin') }} — {{ $t('general.acrylicMax') }}</p>
        </div>
        <div class="slider-container">
          <div class="slider-track">
            <div class="slider-fill" :style="{ width: localSettings.acrylicIntensity + '%' }"></div>
          </div>
          <input
            type="range"
            class="form-slider"
            min="0"
            max="100"
            :value="localSettings.acrylicIntensity"
            @input="updateSliderValue"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Globe, Setting, Rocket } from '@icon-park/vue-next'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:settings'])

import { computed, ref, onMounted, watch, nextTick } from 'vue'

const localSettings = computed({
  get: () => props.settings,
  set: val => emit('update:settings', val),
})

const autoLaunchEnabled = ref(false)

const systemTheme = ref('Light')

const supportsAcrylic = computed(() => {
  if (typeof document === 'undefined' || !('backdropFilter' in document.documentElement.style)) return false
  const effectiveTheme = props.settings.uiTheme === 'System' ? systemTheme.value : props.settings.uiTheme
  return effectiveTheme !== 'Dark'
})

const sliderWrapper = ref(null)

onMounted(async () => {
  // 加载系统主题
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  systemTheme.value = isDark ? 'Dark' : 'Light'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    systemTheme.value = e.matches ? 'Dark' : 'Light'
  })

  // 加载自启动状态
  try {
    if (window.electronAPI && window.electronAPI.getAutoLaunch) {
      const result = await window.electronAPI.getAutoLaunch()
      if (result.success) {
        autoLaunchEnabled.value = result.enabled
      }
    }
  } catch (error) {
    console.error('Failed to load auto launch status:', error)
  }
})

const onAutoLaunchChange = async () => {
  try {
    if (window.electronAPI && window.electronAPI.setAutoLaunch) {
      await window.electronAPI.setAutoLaunch(autoLaunchEnabled.value)
    }
  } catch (error) {
    console.error('Failed to set auto launch:', error)
  }
}

const updateSliderValue = e => {
  const value = Number(e.target.value)
  emit('update:settings', { ...props.settings, acrylicIntensity: value })
}
</script>

<style lang="less" scoped>
// Card animation
.card-appear {
  animation: fadeInUp 0.3s ease backwards;
}

// Settings grid layout
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

// Setting item base style
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  gap: var(--space-lg);

  &.setting-item-main {
    padding: var(--space-md) 0;
  }

  &.setting-item-full {
    flex-direction: column;
    align-items: stretch;

    .setting-info {
      margin-bottom: var(--space-sm);
    }
  }
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.setting-desc {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.4;
}

.setting-select {
  width: 160px;
  flex-shrink: 0;
}

// Setting divider
.setting-divider {
  height: 1px;
  background: var(--border-light);
  margin: var(--space-md) 0;
}

// Slider container
.slider-container {
  position: relative;
  width: 100%;
  padding-top: var(--space-sm);
}

.slider-track {
  position: absolute;
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
}

.slider-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.05s ease;
}

.form-slider {
  position: relative;
  width: 100%;
  height: 4px;
  background: transparent;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  z-index: 1;
  margin: 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: transform 0.1s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  &::-webkit-slider-thumb:active {
    transform: scale(0.95);
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
}

// Switch styles
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: 0.2s;
  border-radius: 22px;

  &:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
}

input:checked + .slider {
  background-color: var(--accent);
}

input:checked + .slider:before {
  transform: translateX(18px);
}

// Responsive
@media (max-width: 600px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;

    &.setting-item-main {
      flex-direction: row;
      align-items: center;
    }
  }

  .setting-select {
    width: 100%;
  }
}
</style>
