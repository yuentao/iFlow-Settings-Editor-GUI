<template>
  <div class="app" :class="themeClass">
    <TitleBar @minimize="minimize" @maximize="maximize" @close="close" />

    <!-- 全局后台下载进度条 -->
    <div v-if="isBackgroundDownloading" class="global-download-bar" @click="showDownloadDetail">
      <div class="global-download-fill" :style="{ width: updateDownloadProgress + '%' }"></div>
      <span class="global-download-text">{{ $t('update.backgroundDownloading', { progress: Math.round(updateDownloadProgress) }) }}</span>
    </div>

    <main class="main">
      <SideBar :current-section="currentSection" :server-count="serverCount" :skill-count="skillCount" :command-count="commandCount" @navigate="showSection" />

      <div class="content">
        <template v-if="isLoading">
          <div class="content-header">
            <div class="skeleton-header-title"></div>
            <div class="skeleton-header-desc"></div>
          </div>
          <SkeletonLoader v-if="currentSection === 'dashboard'" type="card" :count="4" :columns="2" />
          <SkeletonLoader v-else-if="currentSection === 'api'" type="profile" :count="3" />
          <SkeletonLoader v-else-if="currentSection === 'mcp'" type="list" :count="3" />
          <SkeletonLoader v-else-if="currentSection === 'skills'" type="list" :count="3" />
          <SkeletonLoader v-else-if="currentSection === 'commands'" type="command" :count="3" />
          <SkeletonLoader v-else type="form" :count="4" />
        </template>
        <template v-else>
          <Dashboard v-if="currentSection === 'dashboard'" :settings="settings" :current-api-profile="currentApiProfile" :server-count="serverCount" :skill-count="skillCount" :command-count="commandCount" @navigate="showSection" />

          <GeneralSettings v-if="currentSection === 'general'" :settings="settings" @update:settings="updateSettings" />

          <ApiConfig
            v-if="currentSection === 'api'"
            :profiles="apiProfiles"
            :current-profile="currentApiProfile"
            :settings="settings"
            @create-profile="createNewApiProfile"
            @select-profile="selectApiProfile"
            @edit-profile="openApiEditDialog"
            @duplicate-profile="duplicateApiProfile"
            @delete-profile="deleteApiProfile"
            @reorder-profiles="reorderApiProfiles" />

          <McpServers v-if="currentSection === 'mcp'" :servers="settings.mcpServers" :selected-server="currentServerName" :server-count="serverCount" @add-server="addServer" @select-server="selectServer" />

          <SkillsView v-if="currentSection === 'skills'" @show-message="showMessage" @show-input-dialog="showInput" @skills-changed="onSkillsChanged" />

          <CommandsView v-if="currentSection === 'commands'" @show-message="showMessage" @show-input-dialog="showInput" @commands-changed="onCommandsChanged" />
        </template>
      </div>
    </main>

    <ApiProfileDialog
      :show-create="showApiCreateDialog"
      :show-edit="showApiEditDialog"
      :create-data="creatingApiData"
      :edit-data="editingApiData"
      :current-profile-name="currentApiProfile"
      @close-create="closeApiCreateDialog"
      @save-create="saveApiCreate"
      @close-edit="closeApiEditDialog"
      @save-edit="saveApiEdit" />

    <ServerPanel :show="showServerPanel" :is-editing="isEditingServer" :data="editingServerData" @close="closeServerPanel" @save="saveServerFromPanel" @delete="deleteServer" />

    <InputDialog :dialog="showInputDialog" @confirm="handleInputConfirm" @cancel="closeInputDialog" />

    <MessageDialog :dialog="showMessageDialog" @close="closeMessageDialog" style="z-index: 1500" />

    <ConfirmDialog
      v-if="pendingConfirmRequest"
      :title-key="pendingConfirmRequest.titleKey"
      :message-key="pendingConfirmRequest.messageKey"
      :message-params="pendingConfirmRequest.messageParams"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
      style="z-index: 1600" />

    <UpdateNotification
      :show="showUpdateNotification"
      :current-version="currentAppVersion"
      :latest-version="latestUpdateVersion"
      :release-notes="updateReleaseNotes"
      @update="handleUpdateNow"
      @background="handleDownloadBackground"
      @later="handleUpdateLater"
      @close="handleUpdateLater" />

    <UpdateProgress
      :show="showUpdateProgress"
      :status="updateProgressStatus"
      :progress="updateDownloadProgress"
      :version="latestUpdateVersion"
      :speed="updateDownloadSpeed"
      @cancel="handleUpdateCancel"
      @install="handleInstallNow"
      @later="handleUpdateLater" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

import locales from './locales/index.js'
import enUS from './locales/en-US.js'
import jaJP from './locales/ja-JP.js'

const localeMap = {
  'zh-CN': locales,
  'en-US': enUS,
  'ja-JP': jaJP,
}

import TitleBar from './components/TitleBar.vue'
import SideBar from './components/SideBar.vue'
import InputDialog from './components/InputDialog.vue'
import MessageDialog from './components/MessageDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ApiProfileDialog from './components/ApiProfileDialog.vue'
import ServerPanel from './components/ServerPanel.vue'
import UpdateNotification from './components/UpdateNotification.vue'
import UpdateProgress from './components/UpdateProgress.vue'
import SkeletonLoader from './components/SkeletonLoader.vue'

// 视图组件懒加载
import { defineAsyncComponent } from 'vue'

const loadingComponent = {
  template: '<div class="async-loading"><div class="skeleton-header-title"></div><div class="skeleton-header-desc"></div></div>',
}

const errorComponent = {
  template: '<div class="async-error"><p>{{ error }}</p><button @click="$emit(\'retry\')">重试</button></div>',
  props: ['error'],
  emits: ['retry'],
}

const Dashboard = defineAsyncComponent({
  loader: () => import('./views/Dashboard.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})
const GeneralSettings = defineAsyncComponent({
  loader: () => import('./views/GeneralSettings.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})
const ApiConfig = defineAsyncComponent({
  loader: () => import('./views/ApiConfig.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})
const McpServers = defineAsyncComponent({
  loader: () => import('./views/McpServers.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})
const SkillsView = defineAsyncComponent({
  loader: () => import('./views/SkillsView.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})
const CommandsView = defineAsyncComponent({
  loader: () => import('./views/CommandsView.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})

const { locale, t } = useI18n()

const settings = ref({
  language: 'zh-CN',
  uiTheme: 'Light',
  bootAnimationShown: true,
  checkpointing: { enabled: true },
  mcpServers: {},
  selectedAuthType: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  modelName: '',
  currentApiProfile: 'default',
  apiProfiles: { default: {} },
  acrylicIntensity: 50,
})

const originalSettings = ref({})
const modified = ref(false)
const currentSection = ref('dashboard')
const currentServerName = ref(null)
const isLoading = ref(true)
const apiProfiles = ref([])
const currentApiProfile = ref('default')
const systemTheme = ref('Light')

const showInputDialog = ref({ show: false, title: '', placeholder: '', callback: null, isConfirm: false, defaultValue: '' })
const showMessageDialog = ref({ show: false, type: 'info', title: '', message: '' })
const pendingConfirmRequest = ref(null)
const pendingConfirmResolve = ref(null)
const showServerPanel = ref(false)
const isEditingServer = ref(false)
const editingServerData = ref({ name: '', description: '', command: 'npx', cwd: '.', args: '', env: '' })
const showApiEditDialog = ref(false)
const editingApiProfileName = ref('')
const editingApiData = ref({ selectedAuthType: 'openai-compatible', apiKey: '', baseUrl: '', modelName: '' })
const showApiCreateDialog = ref(false)
const creatingApiData = ref({ name: '', selectedAuthType: 'openai-compatible', apiKey: '', baseUrl: '', modelName: '' })

const updateSettings = newSettings => {
  settings.value = newSettings
}

const loadApiProfiles = async () => {
  const result = await window.electronAPI.listApiProfiles()
  if (result.success) {
    apiProfiles.value = result.profiles && result.profiles.length > 0 ? result.profiles : [{ name: 'default', isDefault: true }]
    currentApiProfile.value = result.currentProfile || 'default'
  }
}

const switchApiProfile = async () => {
  const result = await window.electronAPI.switchApiProfile(currentApiProfile.value)
  if (result.success) {
    const data = JSON.parse(JSON.stringify(result.data))
    if (!data.checkpointing) data.checkpointing = { enabled: true }
    if (!data.mcpServers) data.mcpServers = {}
    settings.value = data
    originalSettings.value = JSON.parse(JSON.stringify(data))
    modified.value = false
  } else {
    await showMessage({ type: 'error', title: t('api.switchFailed'), message: result.error })
  }
}

const createNewApiProfile = () => {
  creatingApiData.value = { name: '', selectedAuthType: 'openai-compatible', apiKey: '', baseUrl: '', modelName: '' }
  showApiCreateDialog.value = true
}

const closeApiCreateDialog = () => {
  showApiCreateDialog.value = false
}

const saveApiCreate = async data => {
  const name = data.name.trim()
  if (!name) {
    await showMessage({ type: 'warning', title: t('messages.error'), message: t('messages.inputConfigName') })
    return
  }
  const result = await window.electronAPI.createApiProfile(name)
  if (result.success) {
    const profileData = {
      selectedAuthType: data.selectedAuthType,
      apiKey: data.apiKey,
      baseUrl: data.baseUrl,
      modelName: data.modelName,
    }
    const loadResult = await window.electronAPI.loadSettings()
    if (loadResult.success) {
      const loadedData = loadResult.data
      if (!loadedData.apiProfiles) loadedData.apiProfiles = {}
      loadedData.apiProfiles[name] = profileData
      await window.electronAPI.saveSettings(loadedData)
      showApiCreateDialog.value = false
      await loadSettings()
      await loadApiProfiles()
      await showMessage({ type: 'info', title: t('messages.success'), message: t('api.configCreated', { name }) })
    }
  } else {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }
}

const deleteApiProfile = async name => {
  const profileName = name || currentApiProfile.value
  if (profileName === 'default') {
    await showMessage({ type: 'warning', title: t('messages.warning'), message: t('messages.cannotDeleteDefault') })
    return
  }
  const confirmed = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: t('api.delete'), placeholder: 'messages.confirmDeleteConfig', name: profileName, callback: resolve, isConfirm: true }
  })
  if (!confirmed) return
  const result = await window.electronAPI.deleteApiProfile(profileName)
  if (result.success) {
    const data = JSON.parse(JSON.stringify(result.data))
    if (!data.checkpointing) data.checkpointing = { enabled: true }
    if (!data.mcpServers) data.mcpServers = {}
    settings.value = data
    originalSettings.value = JSON.parse(JSON.stringify(data))
    modified.value = false
    await loadApiProfiles()
    await showMessage({ type: 'info', title: t('messages.success'), message: t('api.configDeleted') })
  } else {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }
}

const reorderApiProfiles = async newProfiles => {
  // 更新本地列表
  apiProfiles.value = newProfiles
  // 保存排序顺序到settings
  settings.value.apiProfilesOrder = newProfiles.map(p => p.name)
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(dataToSave))
    modified.value = false
  }
}

const selectApiProfile = async name => {
  if (name === currentApiProfile.value) return
  currentApiProfile.value = name
  await switchApiProfile()
}

const duplicateApiProfile = async name => {
  const newName = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: t('api.duplicate'), placeholder: t('api.newConfigNamePlaceholder'), callback: resolve }
  })
  if (!newName) return
  const result = await window.electronAPI.duplicateApiProfile(name, newName)
  if (result.success) {
    await loadApiProfiles()
    await showMessage({ type: 'info', title: t('messages.success'), message: t('api.configCopied', { name: newName }) })
  } else {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }
}

const openApiEditDialog = profileName => {
  editingApiProfileName.value = profileName
  const profile = settings.value.apiProfiles && settings.value.apiProfiles[profileName]
  editingApiData.value = {
    name: profileName,
    selectedAuthType: (profile && profile.selectedAuthType) || settings.value.selectedAuthType || 'openai-compatible',
    apiKey: (profile && profile.apiKey) || settings.value.apiKey || '',
    baseUrl: (profile && profile.baseUrl) || settings.value.baseUrl || '',
    modelName: (profile && profile.modelName) || settings.value.modelName || '',
  }
  showApiEditDialog.value = true
}

const closeApiEditDialog = () => {
  showApiEditDialog.value = false
}

const saveApiEdit = async data => {
  const oldName = editingApiProfileName.value
  const newName = data.name.trim()

  // 检查名称是否改变
  if (oldName !== newName) {
    if (!newName) {
      await showMessage({ type: 'warning', title: t('messages.error'), message: t('messages.inputConfigName') })
      return
    }
    // 调用重命名 API
    const renameResult = await window.electronAPI.renameApiProfile(oldName, newName)
    if (!renameResult.success) {
      await showMessage({ type: 'error', title: t('messages.error'), message: renameResult.error })
      return
    }
    // 更新当前配置名称
    if (oldName === currentApiProfile.value) {
      currentApiProfile.value = newName
    }
    // 删除旧名称的配置
    if (settings.value.apiProfiles[oldName]) {
      delete settings.value.apiProfiles[oldName]
    }
    editingApiProfileName.value = newName
    await loadApiProfiles()
  }

  // 更新配置数据
  if (!settings.value.apiProfiles[newName]) settings.value.apiProfiles[newName] = {}
  settings.value.apiProfiles[newName].selectedAuthType = data.selectedAuthType
  settings.value.apiProfiles[newName].apiKey = data.apiKey
  settings.value.apiProfiles[newName].baseUrl = data.baseUrl
  settings.value.apiProfiles[newName].modelName = data.modelName

  // 如果编辑的是当前配置，需要同步到主设置对象
  if (newName === currentApiProfile.value) {
    settings.value.selectedAuthType = data.selectedAuthType
    settings.value.apiKey = data.apiKey
    settings.value.baseUrl = data.baseUrl
    settings.value.modelName = data.modelName
  }

  showApiEditDialog.value = false
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    await loadSettings()
    await showMessage({ type: 'success', title: t('messages.success'), message: t('api.configSaved') })
  }
}

const loadSettings = async () => {
  const result = await window.electronAPI.loadSettings()
  if (result.success) {
    const data = JSON.parse(JSON.stringify(result.data))
    if (!data.checkpointing) data.checkpointing = { enabled: true }
    if (!data.mcpServers) data.mcpServers = {}
    if (data.language === undefined) data.language = 'zh-CN'
    if (data.uiTheme === undefined) data.uiTheme = 'Light'
    if (data.bootAnimationShown === undefined) data.bootAnimationShown = true
    if (!data.selectedAuthType) data.selectedAuthType = 'openai-compatible'
    if (data.apiKey === undefined) data.apiKey = ''
    if (data.baseUrl === undefined) data.baseUrl = ''
    if (data.modelName === undefined) data.modelName = ''
    if (!data.apiProfiles) data.apiProfiles = { default: {} }
    if (!data.currentApiProfile) data.currentApiProfile = 'default'
    if (data.acrylicIntensity === undefined) data.acrylicIntensity = 50
    settings.value = data
    originalSettings.value = JSON.parse(JSON.stringify(data))
    modified.value = false
  }
  isLoading.value = false
}

watch(
  settings,
  async () => {
    if (!isLoading.value) {
      modified.value = true
      const dataToSave = JSON.parse(JSON.stringify(settings.value))
      await window.electronAPI.saveSettings(dataToSave)
    }
  },
  { deep: true },
)

watch(
  () => settings.value.language,
  newLang => {
    locale.value = newLang
    window.electronAPI.notifyLanguageChanged()
    // 发送翻译数据给主进程
    const translations = localeMap[newLang] || locales
    window.electronAPI.sendTranslation(translations)
  },
)

const showSection = section => {
  currentSection.value = section
  if (section === 'general') {
    nextTick(() => {
      setTimeout(() => {
        const el = document.getElementById('cloud-sync-section')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      },100)
    })
  }
}

const serverCount = computed(() => (settings.value.mcpServers ? Object.keys(settings.value.mcpServers).length : 0))

const skillCount = ref(0)

const commandCount = ref(0)

const loadSkillCount = async () => {
  try {
    const result = await window.electronAPI.listSkills()
    if (result.success) {
      skillCount.value = result.skills ? result.skills.length : 0
    }
  } catch (error) {
    console.error('Failed to load skill count:', error)
  }
}

const onSkillsChanged = count => {
  skillCount.value = count
}

const onCommandsChanged = count => {
  commandCount.value = count
}

const loadCommandCount = async () => {
  try {
    const result = await window.electronAPI.listCommands()
    if (result.success) {
      commandCount.value = result.commands ? result.commands.length : 0
    }
  } catch (error) {
    console.error('Failed to load command count:', error)
  }
}

// 更新相关状态
const showUpdateNotification = ref(false)
const showUpdateProgress = ref(false)
const currentAppVersion = ref('')
const latestUpdateVersion = ref('')
const updateReleaseNotes = ref('')
const updateProgressStatus = ref('downloading')
const updateDownloadProgress = ref(0)
const updateDownloadSpeed = ref('')
const isBackgroundDownloading = ref(false)

const getEffectiveTheme = () => {
  const theme = settings.value.uiTheme
  if (theme === 'System') return systemTheme.value
  return theme
}

const themeClass = computed(() => {
  const theme = getEffectiveTheme()
  if (theme === 'Dark') return 'dark'
  return ''
})

const selectServer = name => {
  currentServerName.value = name
  openEditServerPanel(name)
}

const openAddServerPanel = () => {
  isEditingServer.value = false
  editingServerData.value = { name: '', description: '', command: 'npx', cwd: '.', args: '-y\npackage-name', env: '' }
  showServerPanel.value = true
  nextTick(() => {})
}

const openEditServerPanel = name => {
  const server = settings.value.mcpServers[name]
  if (!server) return
  isEditingServer.value = true
  editingServerData.value = {
    name: name,
    description: server.description || '',
    command: server.command || '',
    cwd: server.cwd || '.',
    args: (server.args || []).join('\n'),
    env: server.env ? JSON.stringify(server.env, null, 2) : '',
  }
  showServerPanel.value = true
  nextTick(() => {})
}

const closeServerPanel = () => {
  showServerPanel.value = false
}

const saveServerFromPanel = async data => {
  const name = data.name.trim()
  if (!name) {
    await showMessage({ type: 'warning', title: t('messages.error'), message: t('mcp.inputServerName') })
    return
  }
  if (!isEditingServer.value && settings.value.mcpServers[name]) {
    await showMessage({ type: 'warning', title: t('messages.error'), message: t('mcp.serverNameExists') })
    return
  }
  if (isEditingServer.value && currentServerName.value && currentServerName.value !== name) {
    delete settings.value.mcpServers[currentServerName.value]
  }
  const serverConfig = {
    command: data.command.trim(),
    description: data.description.trim(),
    cwd: data.cwd.trim() || '.',
    args: data.args
      .split('\n')
      .map(s => s.trim())
      .filter(s => s),
  }
  const envText = data.env.trim()
  if (envText) {
    try {
      serverConfig.env = JSON.parse(envText)
    } catch (e) {
      await showMessage({ type: 'error', title: t('messages.error'), message: t('mcp.invalidEnvJson') })
      return
    }
  }
  settings.value.mcpServers[name] = serverConfig
  currentServerName.value = name
  showServerPanel.value = false
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(dataToSave))
    modified.value = false
  }
}

const addServer = () => {
  openAddServerPanel()
}

const deleteServer = async () => {
  const serverName = isEditingServer.value ? editingServerData.value.name : currentServerName.value
  if (!serverName) return
  const confirmed = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: t('mcp.delete'), placeholder: 'messages.confirmDeleteServer', name: serverName, callback: resolve, isConfirm: true }
  })
  if (!confirmed) return
  delete settings.value.mcpServers[serverName]
  currentServerName.value = null
  showServerPanel.value = false
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(dataToSave))
    modified.value = false
  }
}

const minimize = () => window.electronAPI.minimize()
const maximize = () => window.electronAPI.maximize()
const close = () => window.electronAPI.close()

// 更新相关处理函数
const initUpdateListeners = () => {
  // 获取当前应用版本
  window.electronAPI.getAppVersion().then(result => {
    currentAppVersion.value = result?.version || '1.0.0'
  })

  // 监听更新状态变化
  window.electronAPI.onUpdateStatusChanged(state => {
    console.log('[AutoUpdate][Renderer] Update status changed:', JSON.stringify(state))
    if (state.status === 'available' && state.info) {
      latestUpdateVersion.value = state.info.version || ''
      updateReleaseNotes.value = state.info.releaseNotes || ''
      // 自动后台下载流程中不弹通知对话框
      if (!isBackgroundDownloading.value) {
        showUpdateNotification.value = true
      }
      showUpdateProgress.value = false
    } else if (state.status === 'downloading' && state.isBackground) {
      // 后台下载开始，不显示进度窗
      isBackgroundDownloading.value = true
      showUpdateProgress.value = false
    } else if (state.status === 'downloaded') {
      isBackgroundDownloading.value = false
      updateProgressStatus.value = 'downloaded'
      updateDownloadProgress.value = 100
      showUpdateProgress.value = false // 下载完成，隐藏进度窗（安装按钮在 GeneralSettings）
    } else if (state.status === 'idle' || state.status === 'error') {
      isBackgroundDownloading.value = false
      showUpdateProgress.value = false
    }
  })

  // 监听发现新版本
  window.electronAPI.onUpdateAvailable(info => {
    latestUpdateVersion.value = info.version || ''
    updateReleaseNotes.value = info.releaseNotes || ''
    showUpdateNotification.value = true
    showUpdateProgress.value = false
  })

  // 监听下载进度
  window.electronAPI.onUpdateDownloadProgress(progress => {
    updateDownloadProgress.value = progress
    if (!isBackgroundDownloading.value) {
      showUpdateProgress.value = true
      showUpdateNotification.value = false
      updateProgressStatus.value = 'downloading'
    }
    // 后台下载时不显示进度窗，进度由 GeneralSettings 自行处理
  })

  // 监听下载完成
  window.electronAPI.onUpdateDownloaded(() => {
    updateProgressStatus.value = 'downloaded'
    updateDownloadProgress.value = 100
  })

  // 监听自动检查更新（自动触发，不显示"已是最新"提示）
  window.electronAPI.onAutoCheckUpdate(() => {
    console.log('[AutoUpdate][Renderer] Received auto-check-update event from main process')
    checkForUpdatesAuto()
  })

  // 监听安装更新
  window.electronAPI.onInstallUpdate(() => {
    window.electronAPI.installUpdate()
  })

  // 监听后台下载完成
  window.electronAPI.onUpdateBackgroundComplete(info => {
    console.log('[AutoUpdate][Renderer] Background download complete:', JSON.stringify(info))
    // 后台下载完成，弹出安装提示让用户选择
    latestUpdateVersion.value = info?.version || ''
    updateProgressStatus.value = 'downloaded'
    updateDownloadProgress.value = 100
    showUpdateProgress.value = true
    isBackgroundDownloading.value = false
  })
}

const checkForUpdatesManual = async () => {
  try {
    const result = await window.electronAPI.checkForUpdates()
    if (result.success && result.hasUpdate) {
      latestUpdateVersion.value = result.version || ''
      updateReleaseNotes.value = result.releaseNotes || ''
      showUpdateNotification.value = true
    } else if (result.success) {
      await showMessage({ type: 'info', title: t('update.title'), message: t('update.noUpdate') })
    }
  } catch (error) {
    console.error('Check for updates failed:', error)
    await showMessage({ type: 'error', title: t('update.title'), message: t('update.checkFailed') })
  }
}

// 自动检查更新（不显示"已是最新"提示，发现新版本后自动后台下载）
const checkForUpdatesAuto = async () => {
  console.log('[AutoUpdate][Renderer] checkForUpdatesAuto called')
  try {
    const result = await window.electronAPI.checkForUpdates()
    console.log('[AutoUpdate][Renderer] checkForUpdates result:', JSON.stringify(result))
    if (result.success && result.hasUpdate) {
      console.log(`[AutoUpdate][Renderer] New version available: ${result.version}, starting background download...`)
      latestUpdateVersion.value = result.version || ''
      updateReleaseNotes.value = result.releaseNotes || ''
      // 自动检查发现新版本，直接启动后台下载，不弹通知对话框
      isBackgroundDownloading.value = true
      showUpdateNotification.value = false
      const downloadResult = await window.electronAPI.downloadUpdateBackground()
      console.log('[AutoUpdate][Renderer] downloadUpdateBackground result:', JSON.stringify(downloadResult))
    } else {
      console.log('[AutoUpdate][Renderer] No update available or check failed')
    }
    // 自动检查不显示"已是最新"提示，静默完成
  } catch (error) {
    console.error('[AutoUpdate][Renderer] Auto check for updates failed:', error)
    isBackgroundDownloading.value = false
  }
}

const handleUpdateNow = async () => {
  showUpdateNotification.value = false
  showUpdateProgress.value = true
  updateProgressStatus.value = 'downloading'
  updateDownloadProgress.value = 0
  await window.electronAPI.downloadUpdate()
}

const handleUpdateLater = () => {
  showUpdateNotification.value = false
  showUpdateProgress.value = false
}

// 点击全局进度条跳转到关于页面查看详情
const showDownloadDetail = () => {
  currentSection.value = 'general'
}

// 后台下载更新（不显示进度窗）
const handleDownloadBackground = async () => {
  showUpdateNotification.value = false
  isBackgroundDownloading.value = true
  // 不显示进度窗，直接后台下载
  try {
    await window.electronAPI.downloadUpdateBackground()
    // 下载完成后的提示会在 updateChecker 中通过事件通知
  } catch (error) {
    console.error('Background download failed:', error)
    // 后台下载失败也可以提示用户
    await showMessage({ type: 'error', title: t('update.title'), message: t('update.error.downloadFailed', { code: '??' }) })
  }
}

const handleUpdateCancel = async () => {
  await window.electronAPI.cancelDownload()
  showUpdateProgress.value = false
  await showMessage({ type: 'info', title: t('update.title'), message: t('update.updateCancelled') })
}

const handleInstallNow = () => {
  showUpdateProgress.value = false
  window.electronAPI.installUpdate()
}

const handleInputConfirm = result => {
  if (showInputDialog.value.callback) {
    showInputDialog.value.callback(result)
  }
  showInputDialog.value.show = false
  showInputDialog.value.isConfirm = false
  showInputDialog.value.defaultValue = ''
}

const closeInputDialog = () => {
  if (showInputDialog.value.callback) {
    showInputDialog.value.callback(false)
  }
  showInputDialog.value.show = false
  showInputDialog.value.isConfirm = false
  showInputDialog.value.defaultValue = ''
}

const showMessage = ({ type = 'info', title, message, messageParams }) => {
  return new Promise(resolve => {
    showMessageDialog.value = { show: true, type, title, message, messageParams }
  })
}

const showInput = ({ type, title, placeholder, callback, isConfirm, defaultValue, name }) => {
  showInputDialog.value = { show: true, title, placeholder, callback, isConfirm, defaultValue, name }
}

const handleConfirmDialogConfirm = () => {
  if (pendingConfirmRequest.value?.requestId) {
    window.electronAPI.confirmDialogResult(pendingConfirmRequest.value.requestId, true)
  }
  pendingConfirmRequest.value = null
  pendingConfirmResolve.value = null
}

const handleConfirmDialogCancel = () => {
  if (pendingConfirmRequest.value?.requestId) {
    window.electronAPI.confirmDialogResult(pendingConfirmRequest.value.requestId, false)
  }
  pendingConfirmRequest.value = null
  pendingConfirmResolve.value = null
}

const closeMessageDialog = () => {
  showMessageDialog.value.show = false
}

watch(
  () => settings.value.uiTheme,
  () => {
    document.body.classList.remove('dark')
    const cls = themeClass.value
    if (cls) document.body.classList.add(cls)
    applyAcrylicStyle()
  },
)

watch(
  () => settings.value.acrylicIntensity,
  () => {
    applyAcrylicStyle()
  },
)

const applyAcrylicStyle = () => {
  const intensity = settings.value.acrylicIntensity
  if (intensity === undefined || intensity === null) return
  const opacity = 1 - intensity / 100
  const isDark = getEffectiveTheme() === 'Dark'
  const root = document.documentElement

  if (!isDark) {
    root.style.setProperty('--bg-primary', `rgba(243, 243, 243, ${Math.max(0.05, opacity * 0.85)})`)
    root.style.setProperty('--bg-secondary', `rgba(255, 255, 255, ${Math.max(0.05, opacity * 0.7)})`)
    root.style.setProperty('--bg-mica', `rgba(243, 243, 243, ${Math.max(0.05, opacity * 0.473)})`)
    root.style.setProperty('--control-fill', `rgba(249, 249, 249, ${Math.max(0.05, opacity * 0.85)})`)
  }
}

const updateSystemTheme = () => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  systemTheme.value = isDark ? 'Dark' : 'Light'
  if (settings.value.uiTheme === 'System') {
    const cls = themeClass.value
    document.body.classList.remove('dark')
    if (cls) document.body.classList.add(cls)
    applyAcrylicStyle()
  }
}

onMounted(async () => {
  // 优先初始化更新监听，确保在主进程发送 auto-check-update 事件前注册好
  initUpdateListeners()

  await loadApiProfiles()
  await loadSettings()
  await loadSkillCount()
  await loadCommandCount()
  locale.value = settings.value.language

  // 初始化系统主题
  updateSystemTheme()

  // 发送翻译数据给主进程
  const translations = localeMap[settings.value.language] || locales
  window.electronAPI.sendTranslation(translations)

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateSystemTheme)

  const cls = themeClass.value
  if (cls) {
    document.body.classList.add(cls)
  }
  applyAcrylicStyle()

  // 恢复待安装更新：如果上次下载了更新但用户选择"稍后安装"，重启后再次提醒
  try {
    const result = await window.electronAPI.restorePendingUpdate()
    if (result?.success && result?.restored && result?.pending) {
      latestUpdateVersion.value = result.pending.version || ''
      updateProgressStatus.value = 'downloaded'
      updateDownloadProgress.value = 100
      showUpdateProgress.value = true
    }
  } catch (e) {
    console.error('Failed to restore pending update:', e)
  }

  // 监听主进程的确认对话框请求
  window.electronAPI.onShowConfirmRequest(request => {
    pendingConfirmRequest.value = request
  })

  window.electronAPI.onApiProfileSwitched(async profileName => {
    currentApiProfile.value = profileName
    await loadSettings()
  })
})

onUnmounted(() => {})
</script>

<style lang="less">
@import './styles/global.less';

// 全局后台下载进度条
.global-download-bar {
  height: 22px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  position: relative;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.3s ease;

  &:hover {
    .global-download-fill {
      filter: brightness(1.1);
    }
  }
}

.global-download-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light), var(--accent));
  background-size: 200% 100%;
  animation: download-shimmer 2s ease-in-out infinite;
  transition: width 0.3s ease;
  opacity: 0.15;
}

@keyframes download-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.global-download-text {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
  user-select: none;
}

.skeleton-header-title {
  width: 120px;
  height: 24px;
  border-radius: var(--radius-sm);
  margin-bottom: 6px;
  background: linear-gradient(90deg, var(--control-fill) 25%, var(--control-fill-hover) 37%, var(--control-fill) 63%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-header-desc {
  width: 200px;
  height: 14px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--control-fill) 25%, var(--control-fill-hover) 37%, var(--control-fill) 63%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
