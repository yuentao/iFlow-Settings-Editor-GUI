<template>
  <section class="general-settings">
    <div class="content-header">
      <h1 class="content-title">{{ $t('general.title') }}</h1>
      <p class="content-desc">{{ $t('general.description') }}</p>
    </div>

    <!-- ===== 偏好设置 ===== -->
    <div class="section-group">
      <div class="section-header">
        <h2 class="section-title">{{ $t('general.sectionPreferences') }}</h2>
      </div>

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
    </div>

    <!-- ===== 云同步 ===== -->
    <div class="section-group" id="cloud-sync-section">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">{{ $t('general.sectionCloudSync') }}</h2>
          <span class="experimental-badge">{{ $t('general.experimental') || '(实验性)' }}</span>
        </div>
        <div class="section-header-right">
          <label class="switch" @click.stop>
            <input type="checkbox" :checked="syncEnabled" @click.stop="onToggleSyncEnabled" />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <transition name="collapse">
        <div class="section-body" v-show="syncEnabled">
          <!-- 状态 + 立即同步 + 同步内容 -->
          <div class="card card-appear" style="animation-delay: 0.02s">
            <div class="cloud-status-bar">
              <div class="cloud-status-left">
                <div class="status-indicator" :class="statusClass">
                  <span class="status-dot"></span>
                  <span class="status-label">{{ statusLabel }}</span>
                </div>
                <span class="status-time" v-if="cloudStore.isConfigured && cloudStore.status.lastSyncAt"> {{ $t('cloudSync.lastSync') }}: {{ formatTime(cloudStore.status.lastSyncAt) }} </span>
                <span class="status-time" v-else-if="cloudStore.isConfigured">{{ $t('cloudSync.neverSynced') }}</span>
              </div>
              <div class="cloud-status-right">
                <label class="switch switch-sm" @click.stop>
                  <input type="checkbox" :checked="autoSyncEnabled" @change="onToggleAutoSync" />
                  <span class="slider"></span>
                </label>
                <span class="auto-sync-label">{{ $t('cloudSync.autoSync') }}</span>
                <button class="btn btn-primary btn-sm" :disabled="!cloudStore.isConfigured || cloudStore.isSyncing" @click="handleSyncNow">
                  <Loading v-if="cloudStore.isSyncing" size="14" class="spin" />
                  <Refresh v-else size="14" />
                  {{ cloudStore.isSyncing ? $t('cloudSync.statusSyncing') : $t('cloudSync.syncNow') }}
                </button>
              </div>
            </div>
            <div class="sync-error" v-if="cloudStore.status.lastSyncError">
              <CloseSmall size="14" />
              {{ lastSyncErrorText }}
            </div>
            <!-- 同步内容 -->
            <div class="sync-content-section">
              <span class="sync-content-label">{{ $t('cloudSync.syncContentTitle') }}:</span>
              <span class="sync-content-tag success">{{ $t('cloudSync.apiProfiles') }}</span>
              <span class="sync-content-tag success">{{ $t('cloudSync.mcpServers') }}</span>
              <span class="sync-content-tag disabled">{{ $t('cloudSync.skillsComing') }}</span>
              <span class="sync-content-tag disabled">{{ $t('cloudSync.commandsComing') }}</span>
            </div>
            <div class="cloud-danger-zone" v-if="cloudStore.isConfigured">
              <button class="btn btn-danger btn-sm" @click="handleClearCloud">
                <Delete size="14" />
                {{ $t('cloudSync.clearCloud') }}
              </button>
            </div>
          </div>

          <!-- 云服务配置 -->
          <div class="card card-appear" style="animation-delay: 0.06s">
            <div class="card-title">
              <LinkCloud size="16" />
              {{ $t('cloudSync.providerTitle') }}
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-label">{{ $t('cloudSync.providerType') }}</label>
              </div>
              <select class="form-select setting-select" v-model="selectedProvider" @change="onProviderChange">
                <option value="webdav">{{ $t('cloudSync.webdav') }}</option>
                <option value="onedrive" disabled>{{ $t('cloudSync.onedrive') }}</option>
                <option value="dropbox" disabled>{{ $t('cloudSync.dropbox') }}</option>
              </select>
            </div>

            <template v-if="selectedProvider === 'webdav'">
              <div class="webdav-form" v-if="!cloudStore.status.isAuthorized">
                <div class="form-group">
                  <label class="form-label">{{ $t('cloudSync.webdavServerUrl') }}</label>
                  <input type="url" class="form-input" v-model="webdavConfig.serverUrl" :placeholder="$t('cloudSync.webdavServerUrlPlaceholder')" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">{{ $t('cloudSync.webdavUsername') }}</label>
                    <input type="text" class="form-input" v-model="webdavConfig.username" :placeholder="$t('cloudSync.webdavUsernamePlaceholder')" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ $t('cloudSync.webdavPassword') }}</label>
                    <input type="password" class="form-input" v-model="webdavConfig.password" :placeholder="$t('cloudSync.webdavPasswordPlaceholder')" />
                  </div>
                </div>
                <p class="webdav-hint">{{ $t('cloudSync.webdavPasswordHint') }}</p>
                <div class="webdav-actions">
                  <button class="btn btn-secondary btn-sm" :disabled="!canTestConnection" @click="handleTestConnection">
                    <Loading v-if="cloudStore.isTestingConnection" size="14" class="spin" />
                    <Link v-else size="14" />
                    {{ $t('cloudSync.testConnection') }}
                  </button>
                  <button class="btn btn-primary btn-sm" :disabled="!canTestConnection" @click="handleSaveProvider">
                    {{ $t('dialog.confirm') }}
                  </button>
                </div>
                <div class="connection-result" v-if="cloudStore.connectionTestResult">
                  <span :class="cloudStore.connectionTestResult.success ? 'text-success' : 'text-danger'">
                    {{ cloudStore.connectionTestResult.success ? $t('cloudSync.connectionSuccess') : $t('cloudSync.connectionFailed') }}
                  </span>
                  <span class="text-danger" v-if="cloudStore.connectionTestResult.message"> — {{ cloudStore.connectionTestResult.message }} </span>
                </div>
              </div>

              <div class="provider-authorized" v-else>
                <div class="authorized-info">
                  <CheckSmall size="16" class="text-success" />
                  <span class="authorized-text"> {{ $t('cloudSync.connectionSuccess') }} — WebDAV </span>
                </div>
                <button class="btn btn-secondary btn-sm" @click="handleRevokeAuth">
                  {{ $t('cloudSync.revokeAuth') }}
                </button>
              </div>
            </template>
          </div>

          <!-- 同步密码 + 设备管理（合并为一张卡片） -->
          <div class="card card-appear" style="animation-delay: 0.08s">
            <div class="card-title">
              <Lock size="16" />
              {{ $t('cloudSync.passwordTitle') }}
            </div>
            <div class="setting-item setting-item-main">
              <div class="setting-info">
                <label class="setting-label">{{ $t('cloudSync.passwordStatus') }}</label>
                <p class="setting-desc">
                  <span v-if="cloudStore.status.hasPassword" class="text-success">{{ $t('cloudSync.passwordSet') }}</span>
                  <span v-else class="text-warning">{{ $t('cloudSync.passwordNotSet') }}</span>
                  <span class="password-hint" v-if="cloudStore.status.hasPassword"> — {{ $t('cloudSync.passwordHint') }}</span>
                </p>
              </div>
              <button class="btn btn-sm" :class="cloudStore.status.hasPassword ? 'btn-secondary' : 'btn-primary'" @click="cloudStore.status.hasPassword ? showChangePasswordDialog() : showSetPasswordDialog()">
                {{ cloudStore.status.hasPassword ? $t('cloudSync.changePassword') : $t('cloudSync.setPassword') }}
              </button>
            </div>

            <!-- 设备管理（内嵌在同一卡片） -->
            <template v-if="cloudStore.isConfigured">
              <div class="setting-divider"></div>
              <div class="card-title" style="margin-top: var(--space-sm)">
                <Computer size="16" />
                {{ $t('cloudSync.deviceTitle') }}
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <label class="setting-label">{{ $t('cloudSync.deviceName') }}</label>
                </div>
                <div class="device-name-edit">
                  <input type="text" class="form-input device-name-input" v-model="deviceName" @blur="handleSetDeviceName" @keyup.enter="handleSetDeviceName" />
                </div>
              </div>
              <div class="device-list-header">{{ $t('cloudSync.syncedDevices') }}</div>
              <div class="device-list" v-if="!cloudStore.isLoadingDevices">
                <div v-for="device in cloudStore.devices" :key="device.deviceId" class="device-item">
                  <div class="device-status-dot" :class="{ 'is-self': device.isSelf }"></div>
                  <div class="device-info">
                    <div class="device-name">
                      {{ device.deviceName || device.deviceId }}
                      <span class="device-self-badge" v-if="device.isSelf">{{ $t('cloudSync.thisDevice') }}</span>
                    </div>
                    <div class="device-time">{{ formatTime(device.lastModified) }}</div>
                  </div>
                  <button v-if="!device.isSelf" class="btn btn-secondary btn-sm btn-remove-device" @click="handleRemoveDevice(device)">
                    {{ $t('cloudSync.removeDevice') }}
                  </button>
                </div>
                <div class="device-empty" v-if="cloudStore.devices.length === 0">
                  {{ $t('cloudSync.neverSynced') }}
                </div>
              </div>
              <div class="device-loading" v-else>
                <Loading size="16" class="spin" />
              </div>
            </template>
          </div>
        </div>
      </transition>
    </div>

    <!-- ===== 关于 ===== -->
    <div class="section-group">
      <div class="section-header">
        <h2 class="section-title">{{ $t('general.sectionAbout') }}</h2>
      </div>

      <div class="card card-appear" style="animation-delay: 0.02s">
        <div class="about-layout">
          <div class="about-brand">
            <div class="about-logo">
              <img class="about-icon" src="/icon.png" alt="iFlow" />
            </div>
            <div class="about-info">
              <div class="about-name">{{ $t('app.name') }}</div>
              <div class="about-version">{{ $t('update.currentVersion') }}: {{ appVersion }}</div>
              <div class="about-copyright">© 2026 {{ $t('app.company') }}</div>
            </div>
          </div>
          <div class="about-actions-col">
            <div class="auto-update-toggle">
              <label class="switch switch-sm">
                <input type="checkbox" v-model="autoUpdateEnabled" @change="onAutoUpdateChange" />
                <span class="slider"></span>
              </label>
              <span class="auto-update-label">{{ $t('update.menu.autoUpdate') }}</span>
            </div>
            <div class="about-btn-group">
              <button class="btn btn-secondary btn-sm" @click="checkForUpdates" :disabled="isCheckingUpdate">
                <Loading v-if="isCheckingUpdate" size="14" class="spin" />
                <Refresh v-else size="14" />
                {{ isCheckingUpdate ? $t('update.checking') : $t('update.menu.checkUpdate') }}
              </button>
              <button v-if="updateReady" class="btn btn-primary btn-sm" @click="handleInstallUpdate">
                {{ $t('update.installNow') }}
              </button>
            </div>
          </div>
        </div>
        <!-- 后台下载进度指示器 -->
        <div v-if="isBackgroundDownloading" class="background-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: backgroundProgress + '%' }"></div>
          </div>
          <div class="progress-text">{{ $t('update.backgroundDownloading', { progress: backgroundProgress }) }}</div>
        </div>
      </div>
    </div>

    <!-- 密码输入对话框 -->
    <div v-if="passwordDialog.show" class="dialog-overlay password-dialog-overlay" @click.self="closePasswordDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t(passwordDialog.title) }}</div>
        <div class="dialog-body">
          <div class="form-group" v-if="passwordDialog.showOldPassword">
            <label class="form-label">{{ $t('cloudSync.oldPassword') }}</label>
            <input type="password" class="form-input" v-model="passwordDialog.oldPassword" :placeholder="$t('cloudSync.oldPassword')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t(passwordDialog.newPasswordLabel || 'cloudSync.newPassword') }}</label>
            <input type="password" class="form-input" v-model="passwordDialog.password" :placeholder="$t('cloudSync.passwordMinLength')" />
          </div>
          <div class="form-group" v-if="passwordDialog.showConfirm">
            <label class="form-label">{{ $t('cloudSync.confirmPassword') }}</label>
            <input type="password" class="form-input" v-model="passwordDialog.confirmPassword" :placeholder="$t('cloudSync.confirmPassword')" @keyup.enter="passwordDialog.onConfirm" />
          </div>
          <div class="password-error" v-if="passwordDialog.error">{{ passwordDialog.error }}</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closePasswordDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="passwordDialog.onConfirm" :disabled="!passwordDialog.password">
            {{ $t('dialog.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 同步密码输入对话框 -->
    <div v-if="syncPasswordDialog.show" class="dialog-overlay sync-password-overlay" @click.self="closeSyncPasswordDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t('cloudSync.enterPassword') }}</div>
        <div class="dialog-body">
          <div class="form-group">
            <input
              type="password"
              class="form-input"
              v-model="syncPasswordDialog.password"
              :placeholder="$t('cloudSync.enterPassword')"
              @keyup.enter="syncPasswordDialog.show && syncPasswordDialog.onConfirm && syncPasswordDialog.onConfirm()"
              autofocus />
          </div>
          <div class="password-error" v-if="syncPasswordDialog.error">{{ syncPasswordDialog.error }}</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeSyncPasswordDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="syncPasswordDialog.show && syncPasswordDialog.onConfirm && syncPasswordDialog.onConfirm()" :disabled="!syncPasswordDialog.password">
            {{ $t('cloudSync.syncNow') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 云同步确认对话框 -->
    <div v-if="cloudConfirmDialog.show" class="dialog-overlay" @click.self="closeCloudConfirmDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t(cloudConfirmDialog.title) }}</div>
        <div class="dialog-confirm-text">{{ $t(cloudConfirmDialog.message, cloudConfirmDialog.params) }}</div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeCloudConfirmDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-danger" @click="cloudConfirmDialog.onConfirm">{{ $t('dialog.confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 消息对话框 -->
    <MessageDialog :dialog="messageDialog" @close="messageDialog.show = false" />
  </section>
</template>

<script setup>
import { Globe, Setting, Rocket, Refresh, Loading, LinkCloud, Lock, Computer, List, Delete, Link, CheckSmall, CloseSmall } from '@icon-park/vue-next'
import MessageDialog from '../components/MessageDialog.vue'
import { useCloudSyncStore } from '@/stores/cloudSync'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:settings'])

import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const cloudStore = useCloudSyncStore()

// 云同步状态 refs（从 cloudSync store 中提取，Pinia 已自动 unwrap，直接使用）
const syncEnabled = computed(() => cloudStore.syncEnabled)
const autoSyncEnabled = computed(() => cloudStore.autoSyncEnabled)

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

// 云同步状态（由 cloudSync store 统一管理，包括 localStorage 持久化）
const selectedProvider = ref('webdav')
const deviceName = ref('')
const webdavConfig = ref({
  serverUrl: '',
  username: '',
  password: '',
})
const passwordDialog = ref({
  show: false,
  title: 'cloudSync.setPassword',
  newPasswordLabel: 'cloudSync.newPassword',
  showOldPassword: false,
  showConfirm: true,
  password: '',
  confirmPassword: '',
  oldPassword: '',
  error: '',
  onConfirm: null,
})
const syncPasswordDialog = ref({
  show: false,
  password: '',
  error: '',
  onConfirm: null,
  onCancel: null,
})
const cloudConfirmDialog = ref({
  show: false,
  title: '',
  message: '',
  params: {},
  onConfirm: null,
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
const handleStatusChanged = state => {
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
const handleBackgroundProgress = progress => {
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

  // 初始化云同步状态（开关状态由 localStorage 持久化，不从 settings.json 加载）
  await cloudStore.loadStatus()
  deviceName.value = cloudStore.status.deviceName || ''
  selectedProvider.value = cloudStore.status.provider || 'webdav'
  if (cloudStore.syncEnabled && cloudStore.isConfigured) {
    await cloudStore.loadDevices()
  }
  if (window.electronAPI?.onCloudSyncStatusChanged) {
    window.electronAPI.onCloudSyncStatusChanged(handleCloudSyncStatusChanged)
  }
})

onUnmounted(() => {
  if (window.electronAPI && window.electronAPI.removeUpdateListener) {
    window.electronAPI.removeUpdateListener('update-status-changed', handleStatusChanged)
    window.electronAPI.removeUpdateListener('update-download-progress', handleBackgroundProgress)
  }
  if (window.electronAPI?.removeListener) {
    window.electronAPI.removeListener('cloud-sync:status-changed', handleCloudSyncStatusChanged)
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

// === 云同步 Computed ===
const canTestConnection = computed(() => {
  return webdavConfig.value.serverUrl.trim() && webdavConfig.value.username.trim() && webdavConfig.value.password.trim() && !cloudStore.isTestingConnection
})

const statusClass = computed(() => {
  const s = cloudStore.statusText
  if (s === 'syncing') return 'status-syncing'
  if (s === 'ready') return 'status-ready'
  if (s === 'error') return 'status-error'
  if (s === 'notConfigured') return 'status-warning'
  return 'status-disabled'
})

const statusLabel = computed(() => {
  const s = cloudStore.statusText
  const map = {
    disabled: t('cloudSync.statusDisabled'),
    syncing: t('cloudSync.statusSyncing'),
    notConfigured: t('cloudSync.statusNotConfigured'),
    error: t('cloudSync.statusError'),
    ready: t('cloudSync.statusReady'),
  }
  return map[s] || s
})

// M-3: 把主进程抛出的错误码映射为本地化提示。
// 未识别的错误码或自由文本原样返回，避免界面上出现裸露的 SYNC_xxx 字符串。
const SYNC_ERROR_I18N_MAP = {
  SYNC_PASSWORD_INCORRECT: 'cloudSync.errPasswordIncorrect',
  SYNC_PASSWORD_LIKELY_INCORRECT: 'cloudSync.errPasswordLikelyIncorrect',
  SYNC_PASSWORD_NOT_SET: 'cloudSync.errorPasswordRequired',
  SYNC_PASSWORD_TOO_SHORT: 'cloudSync.passwordMinLength',
  SYNC_PROVIDER_REQUIRED: 'cloudSync.errorProviderRequired',
  SYNC_IN_PROGRESS: 'cloudSync.statusSyncing',
}

function formatSyncError(err) {
  if (!err) return ''
  const key = SYNC_ERROR_I18N_MAP[err]
  return key ? t(key) : err
}

const lastSyncErrorText = computed(() => formatSyncError(cloudStore.status.lastSyncError))

// === 云同步 Methods ===
function formatTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    if (isToday) return time
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + time
  } catch {
    return isoStr
  }
}

function showCloudMessage({ type = 'info', title, message }) {
  messageDialog.value = { show: true, type, title, message }
}

// 待处理的云同步启用标记（密码设置完成后继续）
const pendingSyncEnable = ref(false)

async function onToggleSyncEnabled(event) {
  // event.target.checked tells us the intended new state (what the user is clicking TO)
  // We use @click.stop with :checked instead of v-model, so the ref isn't toggled before this handler runs
  const targetChecked = event.target.checked
  if (targetChecked) {
    // 开启云同步：检查是否已设置密码
    if (!cloudStore.status.hasPassword) {
      // 未设置密码，弹出密码设置对话框
      showSetPasswordDialog()
      pendingSyncEnable.value = true
    } else {
      // 已设置密码，直接启用
      cloudStore.setSyncEnabled(true)
      await cloudStore.loadStatus()
    }
  } else {
    // 关闭云同步
    cloudStore.setSyncEnabled(false)
    // 同步关闭时，同时关闭自动同步，保持状态一致
    cloudStore.setAutoSyncEnabled(false)
    await cloudStore.setAutoSync(false)
  }
}

async function onToggleAutoSync() {
  // 使用 !cloudStore.autoSyncEnabled 判断目标状态，而不是 event.target.checked
  // 因为 Vue 的 :checked 绑定在 @change 触发前就已经覆盖了 DOM 的 checked 属性
  const enabled = !cloudStore.autoSyncEnabled
  if (enabled) {
    // 开启自动同步：弹出密码对话框进行确认
    // 即使有缓存密码也弹框，确保用户明确确认后才启用
    syncPasswordDialog.value = {
      show: true,
      password: '',
      error: '',
      onConfirm: handleAutoSyncPasswordConfirm,
      onCancel: () => {
        // 用户取消对话框，确保关闭自动同步
        cloudStore.setAutoSync(false)
      },
    }
    nextTick(() => {
      const input = document.querySelector('.sync-password-overlay .form-input')
      if (input) input.focus()
    })
  } else {
    // 关闭自动同步：直接关闭
    await cloudStore.setAutoSync(false)
    cloudStore.setAutoSyncEnabled(false)
  }
}

async function handleAutoSyncPasswordConfirm() {
  const { password } = syncPasswordDialog.value
  if (!password) return
  const verifyResult = await cloudStore.verifyPassword(password)
  if (verifyResult.success && verifyResult.valid) {
    // 验证成功，清除 onCancel 避免关闭时回滚开关
    syncPasswordDialog.value.onCancel = null
    // 验证成功，密码已缓存到主进程，开启自动同步
    const syncResult = await cloudStore.setAutoSync(true)
    // 检查设置结果，确保成功后才关闭对话框
    if (syncResult.success) {
      cloudStore.setAutoSyncEnabled(true)
      closeSyncPasswordDialog()
    } else {
      // 设置失败，重置对话框状态，让用户可以重试
      syncPasswordDialog.value.error = formatSyncError(syncResult.error) || t('cloudSync.setAutoSyncFailed')
      syncPasswordDialog.value.onCancel = () => {
        cloudStore.setAutoSync(false)
      }
      // 同时回滚 checkbox 状态以反映真实情况
      cloudStore.setAutoSyncEnabled(false)
      cloudStore.setAutoSync(false)
    }
  } else {
    syncPasswordDialog.value.error = t('cloudSync.passwordIncorrect')
  }
}

function onProviderChange() {
  cloudStore.connectionTestResult = null
}

async function handleTestConnection() {
  const config = { ...webdavConfig.value }
  await cloudStore.configureProvider('webdav', config)
  await cloudStore.testConnection()
}

async function handleSaveProvider() {
  const config = { ...webdavConfig.value }
  const result = await cloudStore.configureProvider('webdav', config)
  if (result.success) {
    showCloudMessage({ type: 'success', title: t('messages.success'), message: t('cloudSync.connectionSuccess') })
  } else {
    showCloudMessage({ type: 'error', title: t('messages.error'), message: formatSyncError(result.error) || t('cloudSync.connectionFailed') })
  }
}

async function handleRevokeAuth() {
  const result = await cloudStore.revokeAuth()
  if (result.success) {
    webdavConfig.value = { serverUrl: '', username: '', password: '' }
  }
}

async function handleSetDeviceName() {
  if (deviceName.value.trim() && deviceName.value !== cloudStore.status.deviceName) {
    await cloudStore.setDeviceName(deviceName.value.trim())
  }
}

async function handleRemoveDevice(device) {
  cloudConfirmDialog.value = {
    show: true,
    title: t('cloudSync.removeDevice'),
    message: t('cloudSync.confirmRemoveDevice', { name: device.deviceName || device.deviceId }),
    params: {},
    onConfirm: async () => {
      await cloudStore.removeDevice(device.deviceId)
      closeCloudConfirmDialog()
    },
  }
}

function showSetPasswordDialog() {
  passwordDialog.value = {
    show: true,
    title: 'cloudSync.setPassword',
    newPasswordLabel: 'cloudSync.newPassword',
    showOldPassword: false,
    showConfirm: true,
    password: '',
    confirmPassword: '',
    oldPassword: '',
    error: '',
    onConfirm: handleSetPasswordConfirm,
    onCancel: () => {
      // User cancelled after clicking the sync checkbox - revert checkbox state
      if (pendingSyncEnable.value) {
        pendingSyncEnable.value = false
        cloudStore.setSyncEnabled(false)
      }
    },
  }
  nextTick(() => {
    const input = document.querySelector('.password-dialog-overlay .form-input')
    if (input) input.focus()
  })
}

function showChangePasswordDialog() {
  passwordDialog.value = {
    show: true,
    title: 'cloudSync.changePassword',
    newPasswordLabel: 'cloudSync.newPassword',
    showOldPassword: true,
    showConfirm: true,
    password: '',
    confirmPassword: '',
    oldPassword: '',
    error: '',
    onConfirm: handleChangePasswordConfirm,
  }
}

async function handleSetPasswordConfirm() {
  const { password, confirmPassword } = passwordDialog.value
  if (password.length < 8) {
    passwordDialog.value.error = t('cloudSync.passwordMinLength')
    return
  }
  if (password !== confirmPassword) {
    passwordDialog.value.error = t('cloudSync.passwordMismatch')
    return
  }
  const result = await cloudStore.setPassword(password)
  if (result.success) {
    // 清除 onCancel，避免 closePasswordDialog 调用时回滚 checkbox 状态
    passwordDialog.value.onCancel = null
    // 关闭对话框前先设置 pendingSyncEnable = false，避免 onCancel 中错误地重置 syncEnabled
    const shouldEnableSync = pendingSyncEnable.value
    pendingSyncEnable.value = false
    closePasswordDialog()
    // 检查是否有待处理的云同步启用请求
    if (shouldEnableSync) {
      cloudStore.setSyncEnabled(true)
      await cloudStore.loadStatus()
    }
  } else {
    passwordDialog.value.error = formatSyncError(result.error) || t('messages.error')
  }
}

async function handleChangePasswordConfirm() {
  const { oldPassword, password, confirmPassword } = passwordDialog.value
  if (oldPassword.length < 8) {
    passwordDialog.value.error = t('cloudSync.passwordIncorrect')
    return
  }
  if (password.length < 8) {
    passwordDialog.value.error = t('cloudSync.passwordMinLength')
    return
  }
  if (password !== confirmPassword) {
    passwordDialog.value.error = t('cloudSync.passwordMismatch')
    return
  }
  const result = await cloudStore.changePassword(oldPassword, password)
  if (result.success) {
    closePasswordDialog()
    if (result.repushError) {
      // M-3: 主进程已用新密码尝试重推但失败，告知用户本机已更新但云端需重试
      showCloudMessage({
        type: 'warning',
        title: t('cloudSync.changePassword'),
        message: t('cloudSync.passwordChangedRepushFailed', { error: formatSyncError(result.repushError) }),
      })
    } else if (result.repushed) {
      // 主进程已自动用新密码重推成功，但其他设备文件仍由旧密码加密，需要在那些设备分别重推
      showCloudMessage({ type: 'info', title: t('cloudSync.changePassword'), message: t('cloudSync.passwordChangedNeedRepush') })
    } else if (result.needRepush) {
      // provider 未配置，主进程未尝试重推：渲染端兜底用新密码 push 一次
      showCloudMessage({ type: 'info', title: t('cloudSync.changePassword'), message: t('cloudSync.passwordChangedNeedRepush') })
      await cloudStore.push(password)
    }
  } else {
    passwordDialog.value.error = formatSyncError(result.error) || t('messages.error')
  }
}

function closePasswordDialog() {
  const cancel = passwordDialog.value.onCancel
  passwordDialog.value.show = false
  passwordDialog.value.error = ''
  passwordDialog.value.onConfirm = null
  passwordDialog.value.onCancel = null
  if (cancel) cancel()
}

function handleSyncNow() {
  if (cloudStore.cachedPassword) {
    cloudStore.syncNow().then(() => cloudStore.loadDevices())
  } else {
    syncPasswordDialog.value = {
      show: true,
      password: '',
      error: '',
      onConfirm: handleSyncPasswordConfirm,
      onCancel: null,
    }
    nextTick(() => {
      const input = document.querySelector('.sync-password-overlay .form-input')
      if (input) input.focus()
    })
  }
}

async function handleSyncPasswordConfirm() {
  const { password } = syncPasswordDialog.value
  if (!password) return
  const verifyResult = await cloudStore.verifyPassword(password)
  if (verifyResult.success && verifyResult.valid) {
    syncPasswordDialog.value.onCancel = null
    closeSyncPasswordDialog()
    const syncResult = await cloudStore.syncNow(password)
    if (syncResult.success) {
      cloudStore.loadDevices()
    } else {
      showCloudMessage({ type: 'error', title: t('messages.error'), message: formatSyncError(syncResult.error) || t('cloudSync.syncFailed') })
    }
  } else {
    syncPasswordDialog.value.error = t('cloudSync.passwordIncorrect')
  }
}

function closeSyncPasswordDialog() {
  const cancel = syncPasswordDialog.value.onCancel
  syncPasswordDialog.value.show = false
  syncPasswordDialog.value.error = ''
  syncPasswordDialog.value.onConfirm = null
  syncPasswordDialog.value.onCancel = null
  if (cancel) cancel()
}

function handleClearCloud() {
  cloudConfirmDialog.value = {
    show: true,
    title: t('cloudSync.dangerTitle'),
    message: t('cloudSync.confirmClearCloud'),
    params: {},
    onConfirm: async () => {
      const result = await cloudStore.clearCloud()
      closeCloudConfirmDialog()
      if (result.success) {
        showCloudMessage({ type: 'info', title: t('messages.success'), message: t('cloudSync.clearCloudSuccess') })
      } else {
        showCloudMessage({ type: 'error', title: t('messages.error'), message: formatSyncError(result.error) || t('messages.error') })
      }
    },
  }
}

function closeCloudConfirmDialog() {
  cloudConfirmDialog.value.show = false
}

const handleCloudSyncStatusChanged = state => {
  if (state) {
    Object.assign(cloudStore.status, state)
  }
}
</script>

<style lang="less" scoped>
// ============================================
// Section Groups
// ============================================
.general-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.section-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  user-select: none;
}

.section-header-clickable {
  cursor: pointer;
  border-radius: var(--radius);
  padding: var(--space-xs) var(--space-sm);
  margin: 0 calc(-1 * var(--space-sm));
  transition: background 0.15s ease;

  &:hover {
    background: var(--control-fill);
  }
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.section-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.experimental-badge {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: var(--space-sm);
  vertical-align: middle;
  text-transform: none;
  letter-spacing: normal;
}

.section-chevron {
  display: flex;
  align-items: center;
  color: var(--text-tertiary);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-expanded {
    transform: rotate(180deg);
  }
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  overflow: hidden;
}

// Collapse transition
.collapse-enter-active,
.collapse-leave-active {
  transition:
    max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s ease;
  max-height: 2000px;
  opacity: 1;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

// ============================================
// Card animation
// ============================================
.card-appear {
  animation: fadeInUp 0.3s ease backwards;
}

// ============================================
// Settings grid layout
// ============================================
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

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

.setting-divider {
  height: 1px;
  background: var(--border-light);
  margin: var(--space-md) 0;
}

// ============================================
// Slider
// ============================================
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

// ============================================
// Switch
// ============================================
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

// ============================================
// Cloud sync - Status
// ============================================
.cloud-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.cloud-status-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.cloud-status-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.auto-sync-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: nowrap;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: var(--font-size-sm);
  font-weight: 500;

  &.status-indicator-sm {
    padding: 2px 8px;
    font-size: var(--font-size-xs);
    border-radius: 12px;
  }

  &.status-ready {
    background: var(--success-bg);
    color: var(--success);
  }
  &.status-syncing {
    background: var(--info-bg);
    color: var(--info);
  }
  &.status-error {
    background: var(--danger-bg);
    color: var(--danger);
  }
  &.status-warning {
    background: var(--warning-bg);
    color: var(--warning);
  }
  &.status-disabled {
    background: var(--control-fill);
    color: var(--text-tertiary);
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;

  .status-syncing & {
    animation: pulse 1.5s ease-in-out infinite;
  }
}

.status-label {
  white-space: nowrap;
}
.status-label-inline {
  white-space: nowrap;
}
.status-meta {
  flex: 1;
  min-width: 0;
}
.status-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.sync-error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--danger-bg);
  color: var(--danger);
  border-radius: var(--radius);
  font-size: var(--font-size-xs);
  margin-top: var(--space-sm);
}

// ============================================
// Cloud sync - WebDAV form
// ============================================
.webdav-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.webdav-actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.webdav-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.4;
}

.connection-result {
  font-size: var(--font-size-xs);
  margin-top: var(--space-xs);
}

.text-success {
  color: var(--success);
}
.text-danger {
  color: var(--danger);
}
.text-warning {
  color: var(--warning);
}

.provider-authorized {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  margin-top: var(--space-sm);
}

.authorized-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.authorized-text {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

// ============================================
// Cloud sync - Password & Device
// ============================================
.password-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.device-name-edit {
  width: 200px;
  flex-shrink: 0;
}
.device-name-input {
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
}

.device-list-header {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--control-fill);
  border-radius: var(--radius);
  transition: background 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
  }
}

.device-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
  &.is-self {
    background: var(--success);
  }
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.device-self-badge {
  font-size: var(--font-size-xs);
  padding: 1px 6px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 10px;
  font-weight: 500;
}

.device-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.btn-remove-device {
  opacity: 0;
  transition: opacity 0.15s ease;
  .device-item:hover & {
    opacity: 1;
  }
}

.device-empty {
  text-align: center;
  padding: var(--space-lg);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.device-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-lg);
}

// ============================================
// Cloud sync - Sync content (inline layout)
// ============================================
.sync-content-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-color);
}

.sync-content-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-right: var(--space-xs);
}

.sync-content-tag {
  font-size: var(--font-size-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-primary);

  &.success {
    background: var(--success-bg);
    color: var(--success);
  }

  &.disabled {
    background: var(--bg-secondary);
    color: var(--text-tertiary);
  }
}

// ============================================
// Cloud sync - Danger card
// ============================================
.card-danger {
  border-color: var(--danger-bg);
  .card-title {
    color: var(--danger);
  }
}

.cloud-danger-zone {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--danger-bg);
}

// ============================================
// About section - Compact horizontal layout
// ============================================
.about-layout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xl);
}

.about-brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  min-width: 0;
}

.about-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.about-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.about-info {
  flex: 1;
  min-width: 0;
}

.about-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1px;
}

.about-version {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 1px;
}

.about-copyright {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.about-actions-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.auto-update-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.auto-update-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  user-select: none;
}

.about-btn-group {
  display: flex;
  gap: var(--space-sm);
}

// Background download progress
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

// ============================================
// Dialog overlays
// ============================================
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  min-width: 360px;
  max-width: 460px;
  box-shadow: var(--shadow-xl);
}

.dialog-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.dialog-body {
  padding: var(--space-md) 0;
}

.dialog-confirm-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-md);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.password-error {
  font-size: var(--font-size-xs);
  color: var(--danger);
  margin-top: var(--space-sm);
}

// ============================================
// Animations
// ============================================
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

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ============================================
// Responsive
// ============================================
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

  .about-layout {
    flex-direction: column;
    align-items: flex-start;
  }

  .about-actions-col {
    align-items: flex-start;
    width: 100%;
  }

  .sync-content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
