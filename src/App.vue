<template>
  <div class="app" :class="themeClass">
    <TitleBar @minimize="minimize" @maximize="maximize" @close="close" />

    <main class="main">
      <SideBar :current-section="currentSection" :server-count="serverCount" :skill-count="skillCount" @navigate="showSection" />

      <div class="content">
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
          @delete-profile="deleteApiProfile" />

        <McpServers v-if="currentSection === 'mcp'" :servers="settings.mcpServers" :selected-server="currentServerName" :server-count="serverCount" @add-server="addServer" @select-server="selectServer" />

        <SkillsView v-if="currentSection === 'skills'" @show-message="showMessage" @skills-changed="onSkillsChanged" />
      </div>
    </main>

    <Footer :current-config="currentApiProfile" />

    <InputDialog :dialog="showInputDialog" @confirm="handleInputConfirm" @cancel="closeInputDialog" />

    <MessageDialog :dialog="showMessageDialog" @close="closeMessageDialog" />

    <ApiProfileDialog
      :show-create="showApiCreateDialog"
      :show-edit="showApiEditDialog"
      :create-data="creatingApiData"
      :edit-data="editingApiData"
      @close-create="closeApiCreateDialog"
      @save-create="saveApiCreate"
      @close-edit="closeApiEditDialog"
      @save-edit="saveApiEdit" />

    <ServerPanel :show="showServerPanel" :is-editing="isEditingServer" :data="editingServerData" @close="closeServerPanel" @save="saveServerFromPanel" @delete="deleteServer" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

import TitleBar from './components/TitleBar.vue'
import SideBar from './components/SideBar.vue'
import Footer from './components/Footer.vue'
import InputDialog from './components/InputDialog.vue'
import MessageDialog from './components/MessageDialog.vue'
import ApiProfileDialog from './components/ApiProfileDialog.vue'
import ServerPanel from './components/ServerPanel.vue'
import GeneralSettings from './views/GeneralSettings.vue'
import ApiConfig from './views/ApiConfig.vue'
import McpServers from './views/McpServers.vue'
import SkillsView from './views/SkillsView.vue'

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
const currentSection = ref('general')
const currentServerName = ref(null)
const isLoading = ref(true)
const apiProfiles = ref([])
const currentApiProfile = ref('default')
const systemTheme = ref('Light')

const showInputDialog = ref({ show: false, title: '', placeholder: '', callback: null, isConfirm: false, defaultValue: '' })
const showMessageDialog = ref({ show: false, type: 'info', title: '', message: '', callback: null })
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
      const data = loadResult.data
      if (!data.apiProfiles) data.apiProfiles = {}
      data.apiProfiles[name] = profileData
      await window.electronAPI.saveSettings(data)
      showApiCreateDialog.value = false
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
    showInputDialog.value = { show: true, title: t('api.delete'), placeholder: t('messages.confirmDeleteConfig', { name: profileName }), callback: resolve, isConfirm: true }
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

const selectApiProfile = async name => {
  if (name === currentApiProfile.value) return
  currentApiProfile.value = name
  isLoading.value = true
  await switchApiProfile()
  isLoading.value = false
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
  if (!settings.value.apiProfiles) settings.value.apiProfiles = {}
  if (!settings.value.apiProfiles[editingApiProfileName.value]) settings.value.apiProfiles[editingApiProfileName.value] = {}
  settings.value.apiProfiles[editingApiProfileName.value].selectedAuthType = data.selectedAuthType
  settings.value.apiProfiles[editingApiProfileName.value].apiKey = data.apiKey
  settings.value.apiProfiles[editingApiProfileName.value].baseUrl = data.baseUrl
  settings.value.apiProfiles[editingApiProfileName.value].modelName = data.modelName

  // 如果编辑的是当前配置，需要同步到主设置对象
  if (editingApiProfileName.value === currentApiProfile.value) {
    settings.value.selectedAuthType = data.selectedAuthType
    settings.value.apiKey = data.apiKey
    settings.value.baseUrl = data.baseUrl
    settings.value.modelName = data.modelName
  }

  showApiEditDialog.value = false
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(dataToSave))
    modified.value = false
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
  },
)

const showSection = section => {
  currentSection.value = section
}

const serverCount = computed(() => (settings.value.mcpServers ? Object.keys(settings.value.mcpServers).length : 0))

const skillCount = ref(0)

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
    showInputDialog.value = { show: true, title: t('mcp.delete'), placeholder: t('messages.confirmDeleteServer', { name: serverName }), callback: resolve, isConfirm: true }
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

const showMessage = ({ type = 'info', title, message }) => {
  return new Promise(resolve => {
    showMessageDialog.value = { show: true, type, title, message, callback: resolve }
  })
}

const closeMessageDialog = () => {
  if (showMessageDialog.value.callback) {
    showMessageDialog.value.callback(true)
  }
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
  await loadApiProfiles()
  await loadSettings()
  await loadSkillCount()
  locale.value = settings.value.language

  // 初始化系统主题
  updateSystemTheme()

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateSystemTheme)

  const cls = themeClass.value
  if (cls) {
    document.body.classList.add(cls)
  }
  applyAcrylicStyle()
  window.electronAPI.onApiProfileSwitched(async profileName => {
    currentApiProfile.value = profileName
    await loadSettings()
  })
})

onUnmounted(() => {})
</script>

<style lang="less">
@import './styles/global.less';
</style>
