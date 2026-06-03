<template>
  <div class="app" :class="themeClass">
    <TitleBar />

    <main class="main">
      <SideBar :current-section="currentSection" :is-background-downloading="isBackgroundDownloading" :update-download-progress="updateDownloadProgress" @navigate="showSection" @show-download-detail="handleShowDownloadDetail" />

      <div class="content">
        <template v-if="isLoading">
          <div class="content-header">
            <div class="skeleton-header-title"></div>
            <div class="skeleton-header-desc"></div>
          </div>
          <SkeletonLoader v-if="currentSection === 'dashboard'" type="card" :count="6" :columns="2" />
          <SkeletonLoader v-else-if="currentSection === 'api'" type="profile" :count="3" />
          <SkeletonLoader v-else-if="currentSection === 'mcp'" type="list" :count="3" />
          <SkeletonLoader v-else-if="currentSection === 'skills'" type="list" :count="3" />
          <SkeletonLoader v-else-if="currentSection === 'commands'" type="command" :count="3" />
          <SkeletonLoader v-else-if="currentSection === 'iflow'" type="list" :count="4" />
          <SkeletonLoader v-else-if="currentSection === 'projects'" type="card" :count="3" />
          <SkeletonLoader v-else type="form" :count="4" />
        </template>
        <template v-else>
          <Dashboard
            v-if="currentSection === 'dashboard'"
            :settings="settings"
            :current-api-profile="currentApiProfile"
            :server-count="serverCount"
            :skill-count="skillCount"
            :command-count="commandCount"
            :mod-count="modCount"
            @navigate="showSection"
            @ready="dismissSplash" />

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

          <McpServers v-if="currentSection === 'mcp'" :servers="settings.mcpServers" :server-count="serverCount" @add-server="addServer" @quick-add="openQuickAddDialog" @edit-server="openEditServerPanel" @delete-server="deleteServerByName" />

          <SkillsView v-if="currentSection === 'skills'" @show-input-dialog="showInput" @skills-changed="onSkillsChanged" />

          <CommandsView v-if="currentSection === 'commands'" @show-input-dialog="showInput" @commands-changed="onCommandsChanged" />

          <DocsView v-if="currentSection === 'docs'" />

          <IflowModsView v-show="currentSection === 'iflow'" @show-input-dialog="showInput" />

          <ProjectsView v-show="currentSection === 'projects' && !activeSession" @open-session="openSessionDetail" />
          <SessionDetailView v-if="currentSection === 'projects' && activeSession" :project="activeSession.project" :session="activeSession.session" @back="closeSessionDetail" />
        </template>
      </div>
    </main>

    <ApiProfileDialog
      v-if="showApiCreateDialog || showApiEditDialog"
      :show-create="showApiCreateDialog"
      :show-edit="showApiEditDialog"
      :create-data="creatingApiData"
      :edit-data="editingApiData"
      :current-profile-name="currentApiProfile"
      @close-create="closeApiCreateDialog"
      @save-create="saveApiCreate"
      @close-edit="closeApiEditDialog"
      @save-edit="saveApiEdit"
      @update-model="handleUpdateModel" />

    <ServerPanel v-if="showServerPanel" :show="showServerPanel" :is-editing="isEditingServer" :data="editingServerData" @close="closeServerPanel" @save="saveServerFromPanel" @delete="deleteServer" />

    <QuickAddDialog v-if="showQuickAddDialog" :show="showQuickAddDialog" :existing-names="existingServerNames" @close="closeQuickAddDialog" @edit-server="handleQuickEditServer" @add-servers="handleQuickAddServers" />

    <InputDialog v-if="showInputDialog.show" :dialog="showInputDialog" @confirm="handleInputConfirm" @cancel="closeInputDialog" />

    <ConfirmDialog
      v-if="pendingConfirmRequest"
      :title-key="pendingConfirmRequest.titleKey"
      :message-key="pendingConfirmRequest.messageKey"
      :message-params="pendingConfirmRequest.messageParams"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
      style="z-index: 1600" />

    <UpdateNotification :show="showUpdateNotification" :current-version="currentAppVersion" :latest-version="latestUpdateVersion" :release-notes="updateReleaseNotes" @update="handleUpdateNow" @later="handleUpdateLater" @close="handleUpdateLater" />

    <UpdateProgress
      :show="showUpdateProgress"
      :status="updateProgressStatus"
      :progress="updateDownloadProgress"
      :version="latestUpdateVersion"
      :speed="updateDownloadSpeed"
      :release-notes="updateReleaseNotes"
      @cancel="handleUpdateCancel"
      @background="handleDownloadBackground"
      @install="handleInstallNow"
      @later="handleUpdateLater" />

    <ToastNotification />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { i18n } from './i18n'

const localeLoaders = {
  'zh-CN': () => import('./locales/index.js'),
  'en-US': () => import('./locales/en-US.js'),
  'ja-JP': () => import('./locales/ja-JP.js'),
}

// 缓存已加载的语言包
const loadedLocales = {}

// 动态加载语言包
async function loadLocale(lang) {
  if (loadedLocales[lang]) return loadedLocales[lang]
  const loader = localeLoaders[lang] || localeLoaders['zh-CN']
  loadedLocales[lang] = (await loader()).default
  return loadedLocales[lang]
}

// 安全深拷贝：先解包 Vue reactive proxy，再用 JSON 序列化
// structuredClone 无法处理 undefined 等值，改用 JSON 方式
const deepClone = obj => JSON.parse(JSON.stringify(toRaw(obj)))

// 防抖：settings 深度 watcher 合并连续修改为一次 IPC 保存
let _settingsSaveTimer = null
const SETTINGS_SAVE_DELAY = 500

const debouncedSaveSettings = getSettings => {
  if (_settingsSaveTimer) clearTimeout(_settingsSaveTimer)
  _settingsSaveTimer = setTimeout(async () => {
    _settingsSaveTimer = null
    // 窗口隐藏到托盘时跳过保存，减少后台 IPC 开销
    if (document.hidden) return
    const dataToSave = deepClone(getSettings())
    await window.electronAPI.saveSettings(dataToSave)
  }, SETTINGS_SAVE_DELAY)
}

// 立即刷新待保存的设置（组件卸载或关键操作前调用）
const flushPendingSave = async () => {
  if (_settingsSaveTimer) {
    clearTimeout(_settingsSaveTimer)
    _settingsSaveTimer = null
    const dataToSave = deepClone(settings.value)
    await window.electronAPI.saveSettings(dataToSave)
  }
}

import TitleBar from './components/TitleBar.vue'
import SideBar from './components/SideBar.vue'
import InputDialog from './components/InputDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ApiProfileDialog from './components/ApiProfileDialog.vue'
import ServerPanel from './components/ServerPanel.vue'
import QuickAddDialog from './components/QuickAddDialog.vue'
import UpdateNotification from './components/UpdateNotification.vue'
import UpdateProgress from './components/UpdateProgress.vue'
import SkeletonLoader from './components/SkeletonLoader.vue'
import ToastNotification from './components/ToastNotification.vue'
import { useCloudSyncStore } from './stores/cloudSync'
import { useToast } from './composables/useToast'
import { applyDefaults } from './shared/defaults'

// 视图组件懒加载
import { defineAsyncComponent, h } from 'vue'

const loadingComponent = {
  render() {
    return h('div', { class: 'async-loading' }, [h('div', { class: 'skeleton-header-title' }), h('div', { class: 'skeleton-header-desc' })])
  },
  emits: ['ready'],
  mounted() {
    // 即使在 loading 状态也通知 App.vue 移除 splash，避免无限等待
    this.$emit('ready')
  },
}

const errorComponent = {
  props: ['error'],
  emits: ['retry', 'ready'],
  render() {
    return h('div', { class: 'async-error' }, [h('p', this.error), h('button', { onClick: () => this.$emit('retry') }, this.$t('app.retry'))])
  },
  mounted() {
    // 异步组件加载失败时，也通知父组件移除 splash，避免用户卡在启动画面
    this.$emit('ready')
  },
}

const Dashboard = defineAsyncComponent({
  loader: () => import('./views/Dashboard.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
  timeout: 15000,
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
const DocsView = defineAsyncComponent({
  loader: () => import('./views/DocsView.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})
const IflowModsView = defineAsyncComponent({
  loader: () => import('./views/IflowModsView.vue'),
  loadingComponent,
  errorComponent,
  delay: 0,
})
const ProjectsView = defineAsyncComponent({
  loader: () => import('./views/ProjectsView.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})
const SessionDetailView = defineAsyncComponent({
  loader: () => import('./views/SessionDetailView.vue'),
  loadingComponent,
  errorComponent,
  delay: 200,
})

const { locale, t } = useI18n()
const cloudSyncStore = useCloudSyncStore()
const toast = useToast()

// 云同步完成后自动刷新 API 配置列表数据
// 监听 isSyncing 而非 lastSyncAt，解决 sync() 内部 pull 和 push
// 各触发一次 lastSyncAt 写入导致重复 toast 的问题。
// 1s 防抖：pull 结束 → isSyncing:false → 若 push 在 1s 内开始则取消上一 toast；
// 只有最后一次 isSyncing:false（push 结束）且 1s 内无新同步时，才真正显示 toast。
let _syncEndTimer = null
watch(
  () => cloudSyncStore.isSyncing,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      // isSyncing 从 true → false：一个同步阶段（pull 或 push）结束。
      // 启动防抖等待，看是否紧跟下一个同步阶段（push 或下一次 sync）。
      if (_syncEndTimer) clearTimeout(_syncEndTimer)
      _syncEndTimer = setTimeout(async () => {
        _syncEndTimer = null
        // 确认防抖期间无新同步启动、同步成功（有 lastSyncAt）且无错误
        if (!cloudSyncStore.isSyncing && cloudSyncStore.status.lastSyncAt && !cloudSyncStore.status.lastSyncError) {
          await loadSettings()
          await loadApiProfiles()
          if (!document.hidden) {
            toast.success(t('cloudSync.syncCompleted'))
          }
        }
      }, 1000)
    } else if (newVal === true && oldVal === false) {
      // 新的同步开始（可能是 pull 紧跟 pull 结束，或新的 sync 调用），取消待显示的 toast
      if (_syncEndTimer) {
        clearTimeout(_syncEndTimer)
        _syncEndTimer = null
      }
    }
  },
)

// 云同步失败提示
watch(
  () => cloudSyncStore.status.lastSyncError,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal && !document.hidden) {
      const key = 'cloudSync.' + newVal
      const translated = t(key)
      toast.error(translated !== key ? translated : newVal)
    }
  },
)

const settings = ref({
  language: 'zh-CN',
  uiTheme: 'Light',
  bootAnimationShown: true,
  showMemoryUsage: false,
  maxSessionTurns: -1,
  excludeTools: [],
  checkpointing: { enabled: true },
  mcpServers: {},
  selectedAuthType: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  modelName: '',
  currentApiProfile: 'default',
  apiProfiles: { default: {} },
  acrylicEnabled: true,
  acrylicIntensity: 50,
  connectivityPollInterval: 30,
  modelUsageRefreshInterval: 5,
})
// settings 初始值中的 CLI 默认值已在定义时填充，后续加载会由 loadSettings 统一覆盖

const originalSettings = ref({})
const modified = ref(false)
const currentSection = ref('dashboard')
const currentServerName = ref(null)
const isLoading = ref(true)
const apiProfiles = ref([])
const currentApiProfile = ref('default')
const systemTheme = ref('Light')

const showInputDialog = ref({ show: false, title: '', placeholder: '', callback: null, isConfirm: false, defaultValue: '' })
const pendingConfirmRequest = ref(null)
const pendingConfirmResolve = ref(null)
const showServerPanel = ref(false)
const isEditingServer = ref(false)
const editingServerData = ref({ name: '', description: '' })
const showQuickAddDialog = ref(false)
const existingServerNames = computed(() => Object.keys(settings.value.mcpServers || {}))

// 标志：跳过下次 saveSettings，避免 profile 切换触发不必要的云同步覆盖
const skipNextSaveSettings = ref(false)
const showApiEditDialog = ref(false)
const editingApiProfileName = ref('')
const editingApiData = ref({ selectedAuthType: 'openai-compatible', apiKey: '', baseUrl: '', modelName: '', tokensLimit: 128000, expiryDays: 0 })
const showApiCreateDialog = ref(false)
const creatingApiData = ref({ name: '', selectedAuthType: 'openai-compatible', apiKey: '', baseUrl: '', modelName: '', tokensLimit: 128000, expiryDays: 0 })

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
    const data = applyDefaults(structuredClone(result.data))
    settings.value = data
    originalSettings.value = structuredClone(data)
    modified.value = false
  } else {
    toast.error(t('api.switchFailed') + ': ' + result.error)
  }
}

const createNewApiProfile = () => {
  creatingApiData.value = { name: '', selectedAuthType: 'openai-compatible', apiKey: '', baseUrl: '', modelName: '', tokensLimit: 128000, expiryDays: 0 }
  showApiCreateDialog.value = true
}

const closeApiCreateDialog = () => {
  showApiCreateDialog.value = false
}

const handleUpdateModel = (mode, modelId) => {
  if (mode === 'create' && creatingApiData.value) {
    creatingApiData.value.modelName = modelId
  } else if (mode === 'edit' && editingApiData.value) {
    editingApiData.value.modelName = modelId
  }
}

const saveApiCreate = async data => {
  const name = data.name.trim()
  if (!name) {
    toast.warning(t('messages.inputConfigName'))
    return
  }
  const result = await window.electronAPI.createApiProfile(name)
  if (result.success) {
    const profileData = {
      selectedAuthType: data.selectedAuthType,
      apiKey: data.apiKey,
      baseUrl: data.baseUrl,
      modelName: data.modelName,
      tokensLimit: data.tokensLimit,
      expiryDays: data.expiryDays || 0,
      expiryStartDate: data.expiryDays > 0 ? new Date().toISOString() : undefined,
    }
    const loadResult = await window.electronAPI.loadSettings()
    if (loadResult.success) {
      const loadedData = loadResult.data
      if (!loadedData.apiProfiles) loadedData.apiProfiles = {}
      loadedData.apiProfiles[name] = profileData
      await window.electronAPI.saveSettings(loadedData)
      showApiCreateDialog.value = false
      skipNextSaveSettings.value = true // 跳过 loadSettings 触发的 watch，避免重复 saveSettings
      await loadSettings()
      skipNextSaveSettings.value = false
      await loadApiProfiles()
      toast.success(t('api.configCreated', { name }))
    }
  } else {
    toast.error(result.error)
  }
}

const deleteApiProfile = async name => {
  const profileName = name || currentApiProfile.value

  const confirmed = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: t('api.delete'), placeholder: 'messages.confirmDeleteConfig', name: profileName, callback: resolve, isConfirm: true }
  })
  if (!confirmed) return
  const result = await window.electronAPI.deleteApiProfile(profileName)
  if (result.success) {
    const data = applyDefaults(structuredClone(result.data))
    settings.value = data
    originalSettings.value = structuredClone(data)
    modified.value = false
    skipNextSaveSettings.value = false
    await loadApiProfiles()
    toast.success(t('api.configDeleted'))
  } else {
    toast.error(result.error)
  }
}

const reorderApiProfiles = async newProfiles => {
  // 更新本地列表
  apiProfiles.value = newProfiles
  // 保存排序顺序到settings
  skipNextSaveSettings.value = true // 跳过 watch，避免重复触发 onSettingsSaved
  settings.value.apiProfilesOrder = newProfiles.map(p => p.name)
  const dataToSave = deepClone(settings.value)
  const result = await window.electronAPI.saveSettings(dataToSave)
  skipNextSaveSettings.value = false
  if (result.success) {
    originalSettings.value = structuredClone(dataToSave)
    modified.value = false
  }
}

const selectApiProfile = async name => {
  if (name === currentApiProfile.value) return
  skipNextSaveSettings.value = true // 标记跳过下次 saveSettings，避免竞态覆盖
  currentApiProfile.value = name
  await switchApiProfile()
  skipNextSaveSettings.value = false
}

const duplicateApiProfile = async name => {
  const newName = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: t('api.duplicate'), placeholder: t('api.newConfigNamePlaceholder'), callback: resolve }
  })
  if (!newName) return
  const result = await window.electronAPI.duplicateApiProfile(name, newName)
  if (result.success) {
    await loadApiProfiles()
    // 重新加载当前配置的完整数据，确保 settings.value.apiProfiles 被刷新
    await switchApiProfile()
    toast.success(t('api.configCopied', { name: newName }))
  } else {
    toast.error(result.error)
  }
}

const openApiEditDialog = profileName => {
  editingApiProfileName.value = profileName
  const profile = settings.value.apiProfiles && settings.value.apiProfiles[profileName]
  editingApiData.value = {
    name: profileName,
    selectedAuthType: profile?.selectedAuthType || 'openai-compatible',
    apiKey: profile?.apiKey ?? '',
    baseUrl: profile?.baseUrl ?? '',
    modelName: profile?.modelName ?? '',
    tokensLimit: profile?.tokensLimit ?? 128000,
    expiryDays: profile?.expiryDays ?? 0,
    _originalExpiryDays: profile?.expiryDays ?? 0,
    _originalExpiryStartDate: profile?.expiryStartDate ?? null,
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
      toast.warning(t('messages.inputConfigName'))
      return
    }
    // 调用重命名 API
    const renameResult = await window.electronAPI.renameApiProfile(oldName, newName)
    if (!renameResult.success) {
      toast.error(renameResult.error)
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
  skipNextSaveSettings.value = true // 跳过 watch，避免重复触发 onSettingsSaved
  if (!settings.value.apiProfiles[newName]) settings.value.apiProfiles[newName] = {}
  settings.value.apiProfiles[newName].selectedAuthType = data.selectedAuthType
  settings.value.apiProfiles[newName].apiKey = data.apiKey
  settings.value.apiProfiles[newName].baseUrl = data.baseUrl
  settings.value.apiProfiles[newName].modelName = data.modelName
  settings.value.apiProfiles[newName].tokensLimit = data.tokensLimit
  settings.value.apiProfiles[newName].expiryDays = data.expiryDays || 0

  // 仅当 expiryDays 发生变更时，才写入/重置 expiryStartDate
  const newExpiryDays = data.expiryDays || 0
  const oldExpiryDays = data._originalExpiryDays || 0
  if (newExpiryDays !== oldExpiryDays) {
    // expiryDays 被修改了：如果 >0 则重新开始倒计时，否则清除起始时间
    settings.value.apiProfiles[newName].expiryStartDate = newExpiryDays > 0 ? new Date().toISOString() : undefined
  } else {
    // expiryDays 未变更：保留原始 expiryStartDate
    settings.value.apiProfiles[newName].expiryStartDate = data._originalExpiryStartDate || undefined
  }

  // 如果编辑的是当前配置，需要同步到主设置对象
  if (newName === currentApiProfile.value) {
    settings.value.selectedAuthType = data.selectedAuthType
    settings.value.apiKey = data.apiKey
    settings.value.baseUrl = data.baseUrl
    settings.value.modelName = data.modelName
    settings.value.tokensLimit = data.tokensLimit
  }

  showApiEditDialog.value = false
  const dataToSave = deepClone(settings.value)
  const result = await window.electronAPI.saveSettings(dataToSave)
  skipNextSaveSettings.value = false
  if (result.success) {
    skipNextSaveSettings.value = true // 跳过 loadSettings 触发的 watch，避免重复 saveSettings
    await loadSettings()
    skipNextSaveSettings.value = false
    toast.success(t('api.configSaved'))
  }
}

const loadSettings = async () => {
  try {
    const result = await window.electronAPI.loadSettings()
    if (result && result.success) {
      const data = structuredClone(result.data)
      if (!data.checkpointing) data.checkpointing = { enabled: true }
      if (!data.mcpServers) data.mcpServers = {}
      if (data.language === undefined) data.language = 'zh-CN'
      if (data.uiTheme === undefined) data.uiTheme = 'Light'
      if (data.bootAnimationShown === undefined) data.bootAnimationShown = true
      if (data.showMemoryUsage === undefined) data.showMemoryUsage = false
      if (data.maxSessionTurns === undefined) data.maxSessionTurns = -1
      if (data.excludeTools === undefined) data.excludeTools = []
      if (!data.selectedAuthType) data.selectedAuthType = 'openai-compatible'
      if (data.apiKey === undefined) data.apiKey = ''
      if (data.baseUrl === undefined) data.baseUrl = ''
      if (data.modelName === undefined) data.modelName = ''
      if (!data.apiProfiles) data.apiProfiles = { default: {} }
      if (!data.currentApiProfile) data.currentApiProfile = 'default'
      if (data.acrylicIntensity === undefined) data.acrylicIntensity = 50
      if (data.acrylicEnabled === undefined) data.acrylicEnabled = true
      if (data.connectivityPollInterval === undefined) data.connectivityPollInterval = 30
      if (data.modelUsageRefreshInterval === undefined) data.modelUsageRefreshInterval = 5
      applyDefaults(data)
      settings.value = data
      originalSettings.value = structuredClone(data)
      modified.value = false
    }
  } catch (err) {
    // 兜底：IPC 异常、structuredClone 失败、applyDefaults 抛错等情况
    // 必须保证 isLoading 被重置，否则 SkeletonLoader 永久占位导致 splash 卡死
    console.error('[loadSettings] failed:', err)
  } finally {
    isLoading.value = false
  }
}

watch(
  settings,
  () => {
    if (!isLoading.value) {
      if (skipNextSaveSettings.value) {
        skipNextSaveSettings.value = false
        return
      }
      modified.value = true
      debouncedSaveSettings(() => settings.value)
    }
  },
  { deep: true },
)

watch(
  () => settings.value.language,
  newLang => {
    locale.value = newLang
    window.electronAPI.notifyLanguageChanged()
    // 动态加载并注册语言包到 vue-i18n
    loadLocale(newLang).then(messages => {
      i18n.global.setLocaleMessage(newLang, messages)
      window.electronAPI.sendTranslation(messages)
    })
  },
)

// 淡出并移除静态启动画面
let splashDismissed = false
const dismissSplash = () => {
  if (splashDismissed) return
  splashDismissed = true
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash')
    if (splash) {
      splash.classList.add('fade-out')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
      setTimeout(() => { if (splash.parentNode) splash.remove() }, 2000)
    }
  })
}

// 全局兜底：无论初始化链路是否正常，10 秒后强制移除 splash
// 防止 Dashboard/ModelUsageChart 因任何异常未触发 @ready 导致 splash 永久卡死
const SPLASH_TIMEOUT_MS = 10000
setTimeout(() => {
  if (!splashDismissed) {
    console.warn('[Splash] Force dismiss after timeout: chart rendered event was not triggered within ' + SPLASH_TIMEOUT_MS + 'ms')
    dismissSplash()
  }
}, SPLASH_TIMEOUT_MS)

const showSection = (section, subSection) => {
  currentSection.value = section
  // 切换页面时重置滚动条
  nextTick(() => {
    const contentEl = document.querySelector('.content')
    if (contentEl) contentEl.scrollTop = 0
  })
  if (section === 'general' && subSection && subSection.section === 'cloudSync') {
    nextTick(() => {
      setTimeout(() => {
        const el = document.getElementById('cloud-sync-section')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    })
  }
}

const serverCount = computed(() => (settings.value.mcpServers ? Object.keys(settings.value.mcpServers).length : 0))

const skillCount = ref(0)

const commandCount = ref(0)

const modCount = ref(0)

// 项目会话导航状态
const activeSession = ref(null)

const openSessionDetail = (project, session) => {
  activeSession.value = { project, session }
}

const closeSessionDetail = () => {
  activeSession.value = null
}

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

const loadModCount = async () => {
  try {
    const result = await window.electronAPI.iflowListMods()
    if (result.success) {
      modCount.value = result.mods ? result.mods.length : 0
    }
  } catch (error) {
    console.error('Failed to load mod count:', error)
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
const isAutoChecking = ref(false)
const downloadCancelled = ref(false)

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

const openAddServerPanel = () => {
  isEditingServer.value = false
  editingServerData.value = { name: '', description: '', command: 'npx', args: ['-y', 'package-name'] }
  showServerPanel.value = true
  nextTick(() => {})
}

const openEditServerPanel = name => {
  const server = settings.value.mcpServers[name]
  if (!server) return
  isEditingServer.value = true
  // 传入原始配置（name 单独注入），ServerPanel 自行拆分 description 与自定义字段
  editingServerData.value = { name, ...server }
  showServerPanel.value = true
  nextTick(() => {})
}

const closeServerPanel = () => {
  showServerPanel.value = false
}

const openQuickAddDialog = () => {
  showQuickAddDialog.value = true
}

const closeQuickAddDialog = () => {
  showQuickAddDialog.value = false
}

const handleQuickEditServer = data => {
  // 解析出单服务器，预填到 ServerPanel
  isEditingServer.value = false
  editingServerData.value = data
  showServerPanel.value = true
}

const handleQuickAddServers = async servers => {
  // 批量添加多个服务器
  for (const { name, config } of servers) {
    settings.value.mcpServers[name] = config
  }
  skipNextSaveSettings.value = true
  const dataToSave = deepClone(settings.value)
  const result = await window.electronAPI.saveSettings(dataToSave)
  skipNextSaveSettings.value = false
  if (result.success) {
    originalSettings.value = structuredClone(dataToSave)
    modified.value = false
    toast.success(t('mcp.quickAddSuccess', { count: servers.length }))
  }
}

const saveServerFromPanel = async data => {
  const name = data.name.trim()
  if (!name) {
    toast.warning(t('mcp.inputServerName'))
    return
  }
  if (!isEditingServer.value && settings.value.mcpServers[name]) {
    toast.warning(t('mcp.serverNameExists'))
    return
  }
  if (isEditingServer.value && currentServerName.value && currentServerName.value !== name) {
    delete settings.value.mcpServers[currentServerName.value]
  }
  // ServerPanel 返回的 data 包含 name + 所有配置字段（description + 自定义字段）
  const { name: _, ...serverConfig } = data
  settings.value.mcpServers[name] = serverConfig
  currentServerName.value = name
  showServerPanel.value = false
  skipNextSaveSettings.value = true // 跳过 watch，避免重复触发 onSettingsSaved
  const dataToSave = deepClone(settings.value)
  const result = await window.electronAPI.saveSettings(dataToSave)
  skipNextSaveSettings.value = false
  if (result.success) {
    originalSettings.value = structuredClone(dataToSave)
    modified.value = false
  }
}

const addServer = () => {
  openAddServerPanel()
}

const deleteServer = async () => {
  const serverName = isEditingServer.value ? editingServerData.value.name : currentServerName.value
  if (!serverName) return
  await deleteServerByName(serverName)
  showServerPanel.value = false
}

const deleteServerByName = async serverName => {
  if (!serverName) return
  const confirmed = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: t('mcp.delete'), placeholder: 'messages.confirmDeleteServer', name: serverName, callback: resolve, isConfirm: true }
  })
  if (!confirmed) return
  delete settings.value.mcpServers[serverName]
  if (currentServerName.value === serverName) {
    currentServerName.value = null
    showServerPanel.value = false
  }
  skipNextSaveSettings.value = true
  const dataToSave = deepClone(settings.value)
  const result = await window.electronAPI.saveSettings(dataToSave)
  skipNextSaveSettings.value = false
  if (result.success) {
    originalSettings.value = structuredClone(dataToSave)
    modified.value = false
  }
}

// P0-05 + P0-06：收集所有事件监听器的清理函数，组件卸载时统一移除
const cleanupFns = []

// 更新相关处理函数
const initUpdateListeners = () => {
  // 获取当前应用版本
  window.electronAPI.getAppVersion().then(result => {
    currentAppVersion.value = result?.version || '1.0.0'
  })

  // 监听更新状态变化
  cleanupFns.push(
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
        // 后台下载模式：仅在用户未主动打开进度弹框时才隐藏
        if (!showUpdateProgress.value) {
          isBackgroundDownloading.value = true
          showUpdateProgress.value = false
        }
      } else if (state.status === 'downloaded') {
        isBackgroundDownloading.value = false
        updateProgressStatus.value = 'downloaded'
        updateDownloadProgress.value = 100
        showUpdateProgress.value = false // 下载完成，隐藏进度窗（安装按钮在 GeneralSettings）
      } else if (state.status === 'idle' || state.status === 'error') {
        isBackgroundDownloading.value = false
        showUpdateProgress.value = false
        if (state.status === 'error' && state.error) {
          toast.error(t('update.checkFailed') + ': ' + state.error)
        }
      }
    }),
  )

  // 监听发现新版本
  cleanupFns.push(
    window.electronAPI.onUpdateAvailable(info => {
      // 自动检查流程中（checkForUpdatesAuto）会静默后台下载，不弹通知对话框
      if (isAutoChecking.value) return
      latestUpdateVersion.value = info.version || ''
      updateReleaseNotes.value = info.releaseNotes || ''
      showUpdateNotification.value = true
      showUpdateProgress.value = false
    }),
  )
  cleanupFns.push(
    window.electronAPI.onUpdateDownloadProgress(progress => {
      // 用户已取消下载，忽略后续残留的进度事件
      if (downloadCancelled.value) return
      const percent = typeof progress === 'object' ? progress.percent : progress
      const speed = typeof progress === 'object' && progress.bytesPerSecond ? `${Math.round(progress.bytesPerSecond / 1024)} KB/s` : ''
      updateDownloadProgress.value = percent
      updateDownloadSpeed.value = speed
      if (!isBackgroundDownloading.value) {
        showUpdateProgress.value = true
        showUpdateNotification.value = false
        updateProgressStatus.value = 'downloading'
      }
      // 后台下载时不显示进度窗，进度由 GeneralSettings 自行处理
    }),
  )

  // 监听下载完成
  cleanupFns.push(
    window.electronAPI.onUpdateDownloaded(() => {
      updateProgressStatus.value = 'downloaded'
      updateDownloadProgress.value = 100
    }),
  )

  // 监听自动检查更新（自动触发，不显示"已是最新"提示）
  cleanupFns.push(
    window.electronAPI.onAutoCheckUpdate(() => {
      console.log('[AutoUpdate][Renderer] Received auto-check-update event from main process')
      checkForUpdatesAuto()
    }),
  )

  // 监听安装更新
  cleanupFns.push(
    window.electronAPI.onInstallUpdate(() => {
      window.electronAPI.installUpdate()
    }),
  )

  // 监听后台下载完成
  cleanupFns.push(
    window.electronAPI.onUpdateBackgroundComplete(info => {
      console.log('[AutoUpdate][Renderer] Background download complete:', JSON.stringify(info))
      // 后台下载完成，弹出安装提示让用户选择
      latestUpdateVersion.value = info?.version || ''
      updateProgressStatus.value = 'downloaded'
      updateDownloadProgress.value = 100
      showUpdateProgress.value = true
      isBackgroundDownloading.value = false
    }),
  )
}

// 自动检查更新（不显示"已是最新"提示，发现新版本后自动后台下载）
const checkForUpdatesAuto = async () => {
  console.log('[AutoUpdate][Renderer] checkForUpdatesAuto called')
  isAutoChecking.value = true
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
  } finally {
    isAutoChecking.value = false
  }
}

const handleUpdateNow = async () => {
  showUpdateNotification.value = false
  downloadCancelled.value = false
  showUpdateProgress.value = true
  updateProgressStatus.value = 'downloading'
  updateDownloadProgress.value = 0
  updateDownloadSpeed.value = ''
  try {
    await window.electronAPI.downloadUpdate()
  } catch (error) {
    console.error('[AutoUpdate][Renderer] handleUpdateNow failed:', error)
    showUpdateProgress.value = false
  }
}

const handleUpdateLater = async () => {
  showUpdateNotification.value = false
  showUpdateProgress.value = false
  // 取消正在进行的后台下载
  if (isBackgroundDownloading.value) {
    downloadCancelled.value = true
    await window.electronAPI.cancelDownload()
    isBackgroundDownloading.value = false
  }
}

// 后台下载更新：保持当前下载进程，关闭进度弹框，在侧边栏显示进度
const handleDownloadBackground = () => {
  isBackgroundDownloading.value = true
  showUpdateProgress.value = false
  showUpdateNotification.value = false
}

// 点击侧边栏后台下载条，重新打开进度弹框
const handleShowDownloadDetail = () => {
  isBackgroundDownloading.value = false
  showUpdateProgress.value = true
  updateProgressStatus.value = 'downloading'
}

const handleUpdateCancel = async () => {
  downloadCancelled.value = true
  await window.electronAPI.cancelDownload()
  showUpdateProgress.value = false
  toast.info(t('update.updateCancelled'))
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

const showInput = ({ type, title, placeholder, callback, isConfirm, defaultValue, name, conflict }) => {
  showInputDialog.value = { show: true, title, placeholder, callback, isConfirm, defaultValue, name, conflict }
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
  // Fluent Reveal Highlight — mouse-following glow on buttons (event delegation)
  const revealHandler = e => {
    const btn = e.target.closest('.btn, .nav-item, .action-btn, .titlebar-btn, .collapse-btn')
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1)
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1)
    btn.style.setProperty('--reveal-x', x + '%')
    btn.style.setProperty('--reveal-y', y + '%')
  }
  document.addEventListener('mousemove', revealHandler, { passive: true })
  cleanupFns.push(() => document.removeEventListener('mousemove', revealHandler))

  // 优先初始化更新监听，确保在主进程发送 auto-check-update 事件前注册好
  initUpdateListeners()

  // 关键数据并行加载（减少串行 IPC 等待）
  // 使用 allSettled 防止任一 IPC 失败时阻断整个启动流程
  const results = await Promise.allSettled([loadApiProfiles(), loadSettings()])
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[App.onMounted] initial load failed:', r.reason)
    }
  }

  // 非关键计数数据延迟加载，不阻塞首次渲染
  loadSkillCount()
  loadCommandCount()
  loadModCount()
  locale.value = settings.value.language

  // 初始化系统主题
  updateSystemTheme()

  // 动态加载并注册语言包到 vue-i18n
  loadLocale(settings.value.language).then(messages => {
    i18n.global.setLocaleMessage(settings.value.language, messages)
    window.electronAPI.sendTranslation(messages)
  })

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', updateSystemTheme)
  // P0-05：保存清理函数，onUnmounted 时移除监听
  cleanupFns.push(() => mediaQuery.removeEventListener('change', updateSystemTheme))

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
  cleanupFns.push(
    window.electronAPI.onShowConfirmRequest(request => {
      pendingConfirmRequest.value = request
    }),
  )

  cleanupFns.push(
    window.electronAPI.onApiProfileSwitched(async profileName => {
      skipNextSaveSettings.value = true
      currentApiProfile.value = profileName
      await loadSettings()
      skipNextSaveSettings.value = false
    }),
  )

  // 监听外部应用对 settings.json 的修改
  cleanupFns.push(
    window.electronAPI.onSettingsFileChanged(async () => {
      await loadSettings()
      await loadApiProfiles()
    }),
  )

  // 恢复自动同步定时器（由 cloudSync store 统一管理，包括 localStorage 持久化）
  if (cloudSyncStore.autoSyncEnabled) {
    await cloudSyncStore.loadStatus()
    if (cloudSyncStore.isConfigured) {
      await cloudSyncStore.setAutoSync(true)
    }
  }
})

onUnmounted(() => {
  // 刷新待保存的设置，避免防抖未触发导致数据丢失
  flushPendingSave()
  // P0-05 + P0-06：移除所有事件监听器，防止内存泄漏
  for (const cleanup of cleanupFns) {
    try {
      cleanup()
    } catch (_) {
      /* ignore */
    }
  }
  cleanupFns.length = 0
})
</script>

<style lang="less">
@import './styles/global.less';

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
