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
          <input type="range" class="form-slider" min="0" max="100" :value="localSettings.acrylicIntensity" @input="updateSliderValue" />
        </div>
      </div>
    </div>

    <!-- 关于 -->
    <div class="card card-appear" style="animation-delay: 0.1s">
      <div class="card-title">
        <Info size="16" />
        {{ $t('update.menu.about') }}
      </div>
      <div class="about-content">
        <div class="about-logo">
          <img class="about-icon" src="/icon.png" alt="iFlow" />
        </div>
        <div class="about-info">
          <div class="about-name">{{ $t('app.name') }}</div>
          <div class="about-version">{{ $t('update.currentVersion') }}: {{ appVersion }}</div>
          <div class="about-copyright">© 2026 {{ $t('app.company') }}</div>
        </div>
      </div>
      <div class="about-actions">
        <div class="auto-update-toggle">
          <label class="switch switch-sm">
            <input type="checkbox" v-model="autoUpdateEnabled" @change="onAutoUpdateChange" />
            <span class="slider"></span>
          </label>
          <span class="auto-update-label">{{ $t('update.menu.autoUpdate') }}</span>
        </div>
        <button class="btn btn-secondary" @click="checkForUpdates" :disabled="isCheckingUpdate">
          <Loading v-if="isCheckingUpdate" size="14" class="spin" />
          <Refresh v-else size="14" />
          {{ isCheckingUpdate ? $t('update.checking') : $t('update.menu.checkUpdate') }}
        </button>
        <button v-if="updateReady" class="btn btn-primary" @click="handleInstallUpdate">
          {{ $t('update.installNow') }}
        </button>
      </div>
      <!-- 后台下载进度指示器 -->
      <div v-if="isBackgroundDownloading" class="background-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: backgroundProgress + '%' }"></div>
        </div>
        <div class="progress-text">{{ $t('update.backgroundDownloading', { progress: backgroundProgress }) }}</div>
      </div>
    </div>

    <!-- 消息对话框 -->
    <MessageDialog :dialog="messageDialog" @close="messageDialog.show = false" />
  </section>
</template>

<script setup>
import { Globe, Setting, Rocket, Info, Refresh, Loading } from '@icon-park/vue-next'
import MessageDialog from '../components/MessageDialog.vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:settings'])

import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const localSettings = computed({
  get: () => props.settings,
  set: val => emit('update:settings', val),
})

const autoLaunchEnabled = ref(false)
const autoUpdateEnabled = ref(true)
const appVersion = ref('1.0.0')
const systemTheme = ref('Light')
const isCheckingUpdate = ref(false)
let checkUpdateTimer = null
const messageDialog = ref({
  show: false,
  type: 'info',
  title: '',
  message: '',
})

// 更新相关状态
const updateReady = ref(false)
const updateVersion = ref('')
const isBackgroundDownloading = ref(false)
const backgroundProgress = ref(0)

const supportsAcrylic = computed(() => {
  if (typeof document === 'undefined' || !('backdropFilter' in document.documentElement.style)) return false
  const effectiveTheme = props.settings.uiTheme === 'System' ? systemTheme.value : props.settings.uiTheme
  return effectiveTheme !== 'Dark'
})

const sliderWrapper = ref(null)

// 更新状态变化处理
const handleStatusChanged = (state) => {
  if (state.status === 'downloaded') {
    updateReady.value = true
    updateVersion.value = state.info?.version || ''
    isBackgroundDownloading.value = false
    backgroundProgress.value = 100
  } else if (state.status === 'downloading' && state.isBackground) {
    isBackgroundDownloading.value = true
    updateReady.value = false
    backgroundProgress.value = state.progress || 0
  } else {
    isBackgroundDownloading.value = false
    updateReady.value = false
    backgroundProgress.value = 0
  }
}

// 后台下载进度处理
const handleBackgroundProgress = (progress) => {
  if (isBackgroundDownloading.value) {
    backgroundProgress.value = progress
  }
}

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

  // 获取应用版本
  try {
    if (window.electronAPI && window.electronAPI.getAppVersion) {
      const result = await window.electronAPI.getAppVersion()
      if (result?.version) {
        appVersion.value = result.version
      }
    }
  } catch (error) {
    console.error('Failed to load app version:', error)
  }

  // 加载自动更新状态
  try {
    if (window.electronAPI && window.electronAPI.getAutoUpdate) {
      const result = await window.electronAPI.getAutoUpdate()
      if (result.success) {
        autoUpdateEnabled.value = result.enabled
      }
    }
  } catch (error) {
    console.error('Failed to load auto update status:', error)
  }

  // 检查当前更新状态
  const checkUpdateState = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getUpdateStatus) {
        const result = await window.electronAPI.getUpdateStatus()
        if (result.success && result.status === 'downloaded') {
          updateReady.value = true
          updateVersion.value = result.info?.version || ''
        }
      }
    } catch (error) {
      console.error('Failed to get update status:', error)
    }
  }
  await checkUpdateState()

  // 监听更新状态变化
  window.electronAPI.onUpdateStatusChanged(handleStatusChanged)
  // 监听下载进度（后台下载用）
  window.electronAPI.onUpdateDownloadProgress(handleBackgroundProgress)
})

onUnmounted(() => {
  if (window.electronAPI && window.electronAPI.removeUpdateListener) {
    window.electronAPI.removeUpdateListener('update-status-changed', handleStatusChanged)
    window.electronAPI.removeUpdateListener('update-download-progress', handleBackgroundProgress)
  }
})

const handleInstallUpdate = async () => {
  try {
    if (window.electronAPI && window.electronAPI.installUpdate) {
      await window.electronAPI.installUpdate()
    }
  } catch (error) {
    console.error('Failed to install update:', error)
    messageDialog.value = {
      show: true,
      type: 'error',
      title: 'update.title',
      message: 'update.installFailed',
    }
  }
}

const checkForUpdates = async () => {
  // 防抖：检查更新中或 2 秒内再次点击则忽略
  if (isCheckingUpdate.value) return
  isCheckingUpdate.value = true

  // 2 秒后恢复检查状态
  if (checkUpdateTimer) clearTimeout(checkUpdateTimer)
  checkUpdateTimer = setTimeout(() => {
    isCheckingUpdate.value = false
  }, 2000)

  try {
    if (window.electronAPI && window.electronAPI.checkForUpdates) {
      const result = await window.electronAPI.checkForUpdates()
      if (result.success) {
        if (result.hasUpdate) {
          // 更新可用，会通过 onUpdateAvailable 事件触发显示通知
        } else {
          // 已是最新版本
          messageDialog.value = {
            show: true,
            type: 'info',
            title: 'update.title',
            message: 'update.noUpdate',
          }
        }
      } else {
        // 检查失败
        messageDialog.value = {
          show: true,
          type: 'error',
          title: 'update.title',
          message: 'update.checkFailed',
        }
      }
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
    messageDialog.value = {
      show: true,
      type: 'error',
      title: 'update.title',
      message: 'update.checkFailed',
    }
  } finally {
    // 如果没有成功恢复，在这里也恢复状态
    setTimeout(() => {
      isCheckingUpdate.value = false
    }, 2000)
  }
}

const onAutoLaunchChange = async () => {
  const newValue = autoLaunchEnabled.value
  try {
    if (window.electronAPI && window.electronAPI.setAutoLaunch) {
      const result = await window.electronAPI.setAutoLaunch(newValue)
      if (!result?.success) {
        // 设置失败，回滚开关状态
        autoLaunchEnabled.value = !newValue
        console.error('Failed to set auto launch:', result?.error || 'Unknown error')
      }
    }
  } catch (error) {
    // 异常时回滚开关状态
    autoLaunchEnabled.value = !newValue
    console.error('Failed to set auto launch:', error)
  }
}

const onAutoUpdateChange = async () => {
  try {
    if (window.electronAPI && window.electronAPI.setAutoUpdate) {
      await window.electronAPI.setAutoUpdate(autoUpdateEnabled.value)
    }
  } catch (error) {
    console.error('Failed to set auto update:', error)
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
  height: 20px;
}

.slider-track {
  position: absolute;
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  overflow: hidden;
}

.slider-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.05s ease;
}

.form-slider {
  position: absolute;
  width: 100%;
  height: 20px;
  background: transparent;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  top: 0;
  left: 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
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
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
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

// Small switch variant
.switch-sm {
  width: 32px;
  height: 18px;

  .slider {
    &:before {
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
    }
  }

  input:checked + .slider:before {
    transform: translateX(14px);
  }
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

// About section
.about-content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.about-logo {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.about-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.about-info {
  flex: 1;
  min-width: 0;
}

.about-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.about-version {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.about-copyright {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.about-actions {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.auto-update-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.auto-update-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  user-select: none;
}

// 后台下载进度条
.background-progress {
  margin-top: var(--space-md);
  padding: 0 var(--space-sm);
}

.background-progress .progress-bar {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.background-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  border-radius: var(--radius-sm);
  transition: width 0.2s ease;
}

.background-progress .progress-text {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-align: center;
}

// Loading spin animation
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
