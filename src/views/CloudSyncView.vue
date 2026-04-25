<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('cloudSync.title') }}</h1>
      <p class="content-desc">{{ $t('cloudSync.description') }}</p>
    </div>

    <!-- 同步状态 -->
    <div class="card card-appear" style="animation-delay: 0.02s">
      <div class="card-title">
        <Sync size="16" />
        {{ $t('cloudSync.statusTitle') }}
      </div>
      <div class="status-row">
        <div class="status-indicator" :class="statusClass">
          <span class="status-dot"></span>
          <span class="status-label">{{ statusLabel }}</span>
        </div>
        <div class="status-meta" v-if="store.status.enabled && store.isConfigured">
          <span class="status-time" v-if="store.status.lastSyncAt">
            {{ $t('cloudSync.lastSync') }}: {{ formatTime(store.status.lastSyncAt) }}
          </span>
          <span class="status-time" v-else>{{ $t('cloudSync.neverSynced') }}</span>
        </div>
        <button
          class="btn btn-primary btn-sm"
          :disabled="!store.isConfigured || store.isSyncing"
          @click="handleSyncNow"
        >
          <Loading v-if="store.isSyncing" size="14" class="spin" />
          <Refresh v-else size="14" />
          {{ store.isSyncing ? $t('cloudSync.statusSyncing') : $t('cloudSync.syncNow') }}
        </button>
      </div>
      <div class="sync-error" v-if="store.status.lastSyncError">
        <CloseSmall size="14" />
        {{ store.status.lastSyncError }}
      </div>
    </div>

    <!-- 同步开关 -->
    <div class="card card-appear" style="animation-delay: 0.05s">
      <div class="card-title">
        <Setting size="16" />
        {{ $t('cloudSync.toggleTitle') }}
      </div>
      <div class="setting-item setting-item-main">
        <div class="setting-info">
          <label class="setting-label">{{ $t('cloudSync.enableSync') }}</label>
          <p class="setting-desc">{{ $t('cloudSync.enableSyncDesc') }}</p>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="syncEnabled" @change="onToggleEnabled" />
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-divider" v-if="store.status.enabled"></div>
      <div class="setting-item setting-item-main" v-if="store.status.enabled">
        <div class="setting-info">
          <label class="setting-label">{{ $t('cloudSync.autoSync') }}</label>
          <p class="setting-desc">{{ $t('cloudSync.autoSyncDesc') }}</p>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="autoSyncEnabled" @change="onToggleAutoSync" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- 云服务配置 -->
    <div class="card card-appear" style="animation-delay: 0.08s" v-if="store.status.enabled">
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

      <!-- WebDAV 配置表单 -->
      <template v-if="selectedProvider === 'webdav'">
        <div class="webdav-form" v-if="!store.status.isAuthorized">
          <div class="form-group">
            <label class="form-label">{{ $t('cloudSync.webdavServerUrl') }}</label>
            <input
              type="url"
              class="form-input"
              v-model="webdavConfig.serverUrl"
              :placeholder="$t('cloudSync.webdavServerUrlPlaceholder')"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('cloudSync.webdavUsername') }}</label>
              <input
                type="text"
                class="form-input"
                v-model="webdavConfig.username"
                :placeholder="$t('cloudSync.webdavUsernamePlaceholder')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('cloudSync.webdavPassword') }}</label>
              <input
                type="password"
                class="form-input"
                v-model="webdavConfig.password"
                :placeholder="$t('cloudSync.webdavPasswordPlaceholder')"
              />
            </div>
          </div>
          <p class="webdav-hint">{{ $t('cloudSync.webdavPasswordHint') }}</p>
          <div class="webdav-actions">
            <button
              class="btn btn-secondary btn-sm"
              :disabled="!canTestConnection"
              @click="handleTestConnection"
            >
              <Loading v-if="store.isTestingConnection" size="14" class="spin" />
              <Link v-else size="14" />
              {{ $t('cloudSync.testConnection') }}
            </button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="!canSaveProvider"
              @click="handleSaveProvider"
            >
              {{ $t('dialog.confirm') }}
            </button>
          </div>
          <div class="connection-result" v-if="store.connectionTestResult">
            <span :class="store.connectionTestResult.success ? 'text-success' : 'text-danger'">
              {{ store.connectionTestResult.success ? $t('cloudSync.connectionSuccess') : $t('cloudSync.connectionFailed') }}
            </span>
            <span class="text-danger" v-if="store.connectionTestResult.message">
              — {{ store.connectionTestResult.message }}
            </span>
          </div>
        </div>

        <!-- 已授权状态 -->
        <div class="provider-authorized" v-else>
          <div class="authorized-info">
            <CheckSmall size="16" class="text-success" />
            <span class="authorized-text">
              {{ $t('cloudSync.connectionSuccess') }} — WebDAV
            </span>
          </div>
          <button class="btn btn-secondary btn-sm" @click="handleRevokeAuth">
            {{ $t('cloudSync.revokeAuth') }}
          </button>
        </div>
      </template>
    </div>

    <!-- 同步密码 -->
    <div class="card card-appear" style="animation-delay: 0.11s" v-if="store.status.enabled">
      <div class="card-title">
        <Lock size="16" />
        {{ $t('cloudSync.passwordTitle') }}
      </div>
      <div class="setting-item setting-item-main">
        <div class="setting-info">
          <label class="setting-label">{{ $t('cloudSync.passwordStatus') }}</label>
          <p class="setting-desc">
            <span v-if="store.status.hasPassword" class="text-success">{{ $t('cloudSync.passwordSet') }}</span>
            <span v-else class="text-warning">{{ $t('cloudSync.passwordNotSet') }}</span>
            <span class="password-hint" v-if="store.status.hasPassword"> — {{ $t('cloudSync.passwordHint') }}</span>
          </p>
        </div>
        <button
          class="btn btn-sm"
          :class="store.status.hasPassword ? 'btn-secondary' : 'btn-primary'"
          @click="store.status.hasPassword ? showChangePasswordDialog() : showSetPasswordDialog()"
        >
          {{ store.status.hasPassword ? $t('cloudSync.changePassword') : $t('cloudSync.setPassword') }}
        </button>
      </div>
    </div>

    <!-- 设备管理 -->
    <div class="card card-appear" style="animation-delay: 0.14s" v-if="store.status.enabled && store.isConfigured">
      <div class="card-title">
        <Computer size="16" />
        {{ $t('cloudSync.deviceTitle') }}
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <label class="setting-label">{{ $t('cloudSync.deviceName') }}</label>
        </div>
        <div class="device-name-edit">
          <input
            type="text"
            class="form-input device-name-input"
            v-model="deviceName"
            @blur="handleSetDeviceName"
            @keyup.enter="handleSetDeviceName"
          />
        </div>
      </div>
      <div class="setting-divider"></div>
      <div class="device-list-header">{{ $t('cloudSync.syncedDevices') }}</div>
      <div class="device-list" v-if="!store.isLoadingDevices">
        <div
          v-for="device in store.devices"
          :key="device.deviceId"
          class="device-item"
        >
          <div class="device-status-dot" :class="{ 'is-self': device.isSelf }"></div>
          <div class="device-info">
            <div class="device-name">
              {{ device.deviceName || device.deviceId }}
              <span class="device-self-badge" v-if="device.isSelf">{{ $t('cloudSync.thisDevice') }}</span>
            </div>
            <div class="device-time">{{ formatTime(device.lastModified) }}</div>
          </div>
          <button
            v-if="!device.isSelf"
            class="btn btn-secondary btn-sm btn-remove-device"
            @click="handleRemoveDevice(device)"
          >
            {{ $t('cloudSync.removeDevice') }}
          </button>
        </div>
        <div class="device-empty" v-if="store.devices.length === 0">
          {{ $t('cloudSync.neverSynced') }}
        </div>
      </div>
      <div class="device-loading" v-else>
        <Loading size="16" class="spin" />
      </div>
    </div>

    <!-- 同步内容 -->
    <div class="card card-appear" style="animation-delay: 0.17s" v-if="store.status.enabled">
      <div class="card-title">
        <List size="16" />
        {{ $t('cloudSync.syncContentTitle') }}
      </div>
      <div class="sync-content-list">
        <div class="sync-content-item">
          <CheckSmall size="16" class="text-success" />
          <span>{{ $t('cloudSync.apiProfiles') }}</span>
        </div>
        <div class="sync-content-item">
          <CheckSmall size="16" class="text-success" />
          <span>{{ $t('cloudSync.mcpServers') }}</span>
        </div>
        <div class="sync-content-item disabled">
          <CloseSmall size="16" />
          <span>{{ $t('cloudSync.skillsComing') }}</span>
        </div>
        <div class="sync-content-item disabled">
          <CloseSmall size="16" />
          <span>{{ $t('cloudSync.commandsComing') }}</span>
        </div>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="card card-appear card-danger" style="animation-delay: 0.2s" v-if="store.status.enabled && store.isConfigured">
      <div class="card-title">
        <Delete size="16" />
        {{ $t('cloudSync.dangerTitle') }}
      </div>
      <button class="btn btn-danger btn-sm" @click="handleClearCloud">
        {{ $t('cloudSync.clearCloud') }}
      </button>
    </div>

    <!-- 密码输入对话框 -->
    <div v-if="passwordDialog.show" class="dialog-overlay dialog-overlay-top" @click.self="closePasswordDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t(passwordDialog.title) }}</div>
        <div class="dialog-body">
          <div class="form-group" v-if="passwordDialog.showOldPassword">
            <label class="form-label">{{ $t('cloudSync.oldPassword') }}</label>
            <input
              type="password"
              class="form-input"
              v-model="passwordDialog.oldPassword"
              :placeholder="$t('cloudSync.oldPassword')"
              ref="oldPasswordInput"
            />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t(passwordDialog.newPasswordLabel || 'cloudSync.newPassword') }}</label>
            <input
              type="password"
              class="form-input"
              v-model="passwordDialog.password"
              :placeholder="$t('cloudSync.passwordMinLength')"
            />
          </div>
          <div class="form-group" v-if="passwordDialog.showConfirm">
            <label class="form-label">{{ $t('cloudSync.confirmPassword') }}</label>
            <input
              type="password"
              class="form-input"
              v-model="passwordDialog.confirmPassword"
              :placeholder="$t('cloudSync.confirmPassword')"
              @keyup.enter="handlePasswordConfirm"
            />
          </div>
          <div class="password-error" v-if="passwordDialog.error">{{ passwordDialog.error }}</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closePasswordDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="handlePasswordConfirm" :disabled="!passwordDialog.password">
            {{ $t('dialog.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 同步密码输入对话框 -->
    <div v-if="syncPasswordDialog.show" class="dialog-overlay dialog-overlay-top" @click.self="closeSyncPasswordDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t('cloudSync.enterPassword') }}</div>
        <div class="dialog-body">
          <div class="form-group">
            <input
              type="password"
              class="form-input"
              v-model="syncPasswordDialog.password"
              :placeholder="$t('cloudSync.enterPassword')"
              @keyup.enter="handleSyncPasswordConfirm"
              autofocus
            />
          </div>
          <div class="password-error" v-if="syncPasswordDialog.error">{{ syncPasswordDialog.error }}</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeSyncPasswordDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="handleSyncPasswordConfirm" :disabled="!syncPasswordDialog.password">
            {{ $t('cloudSync.syncNow') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <div v-if="confirmDialog.show" class="dialog-overlay dialog-overlay-top" @click.self="closeConfirmDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t(confirmDialog.title) }}</div>
        <div class="dialog-confirm-text">{{ $t(confirmDialog.message, confirmDialog.params) }}</div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeConfirmDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-danger" @click="confirmDialog.onConfirm">{{ $t('dialog.confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 消息提示 -->
    <MessageDialog :dialog="messageDialog" @close="messageDialog.show = false" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCloudSyncStore } from '@/stores/cloudSync'
import {
  Sync, Setting, LinkCloud, Lock, Computer, List, Delete,
  Refresh, Loading, Link, CheckSmall, CloseSmall,
} from '@icon-park/vue-next'
import MessageDialog from '@/components/MessageDialog.vue'

const { t } = useI18n()
const store = useCloudSyncStore()

// Local state
const syncEnabled = ref(false)
const autoSyncEnabled = ref(false)
const selectedProvider = ref('webdav')
const deviceName = ref('')

const webdavConfig = ref({
  serverUrl: '',
  username: '',
  password: '',
})

const messageDialog = ref({
  show: false,
  type: 'info',
  title: '',
  message: '',
})

// Password dialog
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

// Sync password dialog
const syncPasswordDialog = ref({
  show: false,
  password: '',
  error: '',
  onConfirm: null,
})

// Confirm dialog
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  params: {},
  onConfirm: null,
})

const oldPasswordInput = ref(null)

// Computed
const canTestConnection = computed(() => {
  return webdavConfig.value.serverUrl.trim() &&
    webdavConfig.value.username.trim() &&
    webdavConfig.value.password.trim() &&
    !store.isTestingConnection
})

const canSaveProvider = computed(() => canTestConnection.value)

const statusClass = computed(() => {
  const s = store.statusText
  if (s === 'syncing') return 'status-syncing'
  if (s === 'ready') return 'status-ready'
  if (s === 'error') return 'status-error'
  if (s === 'notConfigured') return 'status-warning'
  return 'status-disabled'
})

const statusLabel = computed(() => {
  const s = store.statusText
  const map = {
    disabled: t('cloudSync.statusDisabled'),
    syncing: t('cloudSync.statusSyncing'),
    notConfigured: t('cloudSync.statusNotConfigured'),
    error: t('cloudSync.statusError'),
    ready: t('cloudSync.statusReady'),
  }
  return map[s] || s
})

// Methods
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

function showMessage({ type = 'info', title, message }) {
  messageDialog.value = { show: true, type, title, message }
}

// Toggle handlers
async function onToggleEnabled() {
  await store.toggleEnabled(syncEnabled.value)
  if (syncEnabled.value) {
    await store.loadStatus()
  }
}

async function onToggleAutoSync() {
  await store.setAutoSync(autoSyncEnabled.value)
}

function onProviderChange() {
  // Reset connection test result when switching provider
  store.connectionTestResult = null
}

// WebDAV handlers
async function handleTestConnection() {
  // 先保存配置再测试
  const config = { ...webdavConfig.value }
  await store.configureProvider('webdav', config)
  await store.testConnection()
}

async function handleSaveProvider() {
  const config = { ...webdavConfig.value }
  const result = await store.configureProvider('webdav', config)
  if (result.success) {
    showMessage({ type: 'success', title: t('messages.success'), message: t('cloudSync.connectionSuccess') })
  } else {
    showMessage({ type: 'error', title: t('messages.error'), message: result.error || t('cloudSync.connectionFailed') })
  }
}

async function handleRevokeAuth() {
  const result = await store.revokeAuth()
  if (result.success) {
    webdavConfig.value = { serverUrl: '', username: '', password: '' }
  }
}

// Device handlers
async function handleSetDeviceName() {
  if (deviceName.value.trim() && deviceName.value !== store.status.deviceName) {
    await store.setDeviceName(deviceName.value.trim())
  }
}

async function handleRemoveDevice(device) {
  confirmDialog.value = {
    show: true,
    title: t('cloudSync.removeDevice'),
    message: t('cloudSync.confirmRemoveDevice', { name: device.deviceName || device.deviceId }),
    params: {},
    onConfirm: async () => {
      await store.removeDevice(device.deviceId)
      closeConfirmDialog()
    },
  }
}

// Password handlers
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
  }
  nextTick(() => {
    const input = document.querySelector('.dialog .form-input')
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
  const result = await store.setPassword(password)
  if (result.success) {
    closePasswordDialog()
  } else {
    passwordDialog.value.error = result.error || t('messages.error')
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
  const result = await store.changePassword(oldPassword, password)
  if (result.success) {
    closePasswordDialog()
    if (result.needRepush) {
      showMessage({ type: 'info', title: t('cloudSync.changePassword'), message: t('cloudSync.passwordChangedNeedRepush') })
    }
  } else {
    passwordDialog.value.error = result.error || t('messages.error')
  }
}

function closePasswordDialog() {
  passwordDialog.value.show = false
  passwordDialog.value.error = ''
}

// Sync handlers
function handleSyncNow() {
  if (store.cachedPassword) {
    store.syncNow().then(() => store.loadDevices())
  } else {
    syncPasswordDialog.value = {
      show: true,
      password: '',
      error: '',
      onConfirm: handleSyncPasswordConfirm,
    }
    nextTick(() => {
      const input = document.querySelector('.dialog .form-input')
      if (input) input.focus()
    })
  }
}

async function handleSyncPasswordConfirm() {
  const { password } = syncPasswordDialog.value
  if (!password) return

  // 验证密码
  const verifyResult = await store.verifyPassword(password)
  if (verifyResult.success && verifyResult.valid) {
    closeSyncPasswordDialog()
    await store.syncNow(password)
    store.loadDevices()
  } else {
    syncPasswordDialog.value.error = t('cloudSync.passwordIncorrect')
  }
}

function closeSyncPasswordDialog() {
  syncPasswordDialog.value.show = false
  syncPasswordDialog.value.error = ''
}

// Danger zone
function handleClearCloud() {
  confirmDialog.value = {
    show: true,
    title: t('cloudSync.dangerTitle'),
    message: t('cloudSync.confirmClearCloud'),
    params: {},
    onConfirm: async () => {
      const result = await store.clearCloud()
      closeConfirmDialog()
      if (result.success) {
        showMessage({ type: 'info', title: t('messages.success'), message: t('cloudSync.clearCloudSuccess') })
      } else {
        showMessage({ type: 'error', title: t('messages.error'), message: result.error || t('messages.error') })
      }
    },
  }
}

function closeConfirmDialog() {
  confirmDialog.value.show = false
}

// Status change handler
const handleStatusChanged = (state) => {
  if (state) {
    Object.assign(store.status, state)
  }
}

// Lifecycle
onMounted(async () => {
  await store.loadStatus()
  syncEnabled.value = store.status.enabled
  autoSyncEnabled.value = store.status.autoSyncEnabled
  deviceName.value = store.status.deviceName || ''
  selectedProvider.value = store.status.provider || 'webdav'

  if (store.status.enabled && store.isConfigured) {
    await store.loadDevices()
  }

  // Listen for status changes
  if (window.electronAPI?.onCloudSyncStatusChanged) {
    window.electronAPI.onCloudSyncStatusChanged(handleStatusChanged)
  }
})

onUnmounted(() => {
  // Cleanup listeners
})
</script>

<style lang="less" scoped>
// Card animation
.card-appear {
  animation: fadeInUp 0.3s ease backwards;
}

// Status section
.status-row {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-sm) 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: var(--font-size-sm);
  font-weight: 500;

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

// Toggle section
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  gap: var(--space-lg);

  &.setting-item-main {
    padding: var(--space-md) 0;
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
}

.setting-desc {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.4;
}

.setting-select {
  width: 180px;
  flex-shrink: 0;
}

.setting-divider {
  height: 1px;
  background: var(--border-light);
  margin: var(--space-md) 0;
}

// Switch
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

// WebDAV form
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

// Authorized state
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

// Password section
.password-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

// Device section
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

// Sync content section
.sync-content-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.sync-content-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  padding: var(--space-xs) 0;

  &.disabled {
    color: var(--text-tertiary);
  }
}

// Danger card
.card-danger {
  border-color: var(--danger-bg);

  .card-title {
    color: var(--danger);
  }
}

// Password dialog
.dialog-body {
  padding: var(--space-md) 0;
}

.password-error {
  font-size: var(--font-size-xs);
  color: var(--danger);
  margin-top: var(--space-sm);
}

// Spin animation
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
