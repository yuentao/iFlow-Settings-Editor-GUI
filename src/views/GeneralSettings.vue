<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('general.title') }}</h1>
      <p class="content-desc">{{ $t('general.description') }}</p>
    </div>
    <div class="card">
      <div class="card-title">
        <Globe size="16" />
        {{ $t('general.languageInterface') }}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('general.language') }}</label>
          <select class="form-select" v-model="localSettings.language">
            <option value="zh-CN">{{ $t('languages.zh-CN') }}</option>
            <option value="en-US">{{ $t('languages.en-US') }}</option>
            <option value="ja-JP">{{ $t('languages.ja-JP') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('general.theme') }}</label>
          <select class="form-select" v-model="localSettings.uiTheme">
            <option value="Light">{{ $t('theme.light') }}</option>
            <option value="Dark">{{ $t('theme.dark') }}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">
        <Setting size="16" />
        {{ $t('general.otherSettings') }}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('general.bootAnimation') }}</label>
          <select class="form-select" v-model="localSettings.bootAnimationShown">
            <option :value="true">{{ $t('general.bootAnimationShown') }}</option>
            <option :value="false">{{ $t('general.bootAnimationNotShown') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('general.checkpointing') }}</label>
          <select class="form-select" v-model="localSettings.checkpointing.enabled">
            <option :value="true">{{ $t('general.enabled') }}</option>
            <option :value="false">{{ $t('general.disabled') }}</option>
          </select>
        </div>
      </div>
      <div class="form-row" v-if="supportsAcrylic">
        <div class="form-group form-group-full">
          <label class="form-label">{{ $t('general.acrylicEffect') }}: {{ localSettings.acrylicIntensity }}%</label>
          <div class="slider-wrapper" ref="sliderWrapper">
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
          <span class="slider-hint">{{ $t('general.acrylicMin') }} — {{ $t('general.acrylicMax') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Globe, Setting } from '@icon-park/vue-next'

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

const supportsAcrylic = computed(() => {
  return typeof document !== 'undefined' && 'backdropFilter' in document.documentElement.style && props.settings.uiTheme !== 'Dark'
})

const sliderWrapper = ref(null)

const updateSliderValue = e => {
  const value = Number(e.target.value)
  emit('update:settings', { ...props.settings, acrylicIntensity: value })
}
</script>

<style lang="less" scoped>
.form-group-full {
  grid-column: 1 / -1;
}

.slider-wrapper {
  position: relative;
  width: 100%;
  height: 20px;
  display: flex;
  align-items: center;
}

.slider-track {
  position: absolute;
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
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
}

.form-slider::-webkit-slider-thumb {
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

.form-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.form-slider::-webkit-slider-thumb:active {
  transform: scale(0.95);
}

.form-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.slider-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-align: right;
  margin-top: 4px;
}
</style>
