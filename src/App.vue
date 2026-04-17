<template>
  <div class="app" :class="themeClass">
    <div class="titlebar">
      <div class="titlebar-left">
        <span class="titlebar-title">{{ $t('app.title') }}</span>
      </div>
      <div class="titlebar-controls">
        <button class="titlebar-btn" @click="minimize" :title="$t('window.minimize')">
          <svg viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" /></svg>
        </button>
        <button class="titlebar-btn" @click="maximize" :title="$t('window.maximize')">
          <svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" stroke-width="1" stroke="currentColor" fill="none" /></svg>
        </button>
        <button class="titlebar-btn close" @click="close" :title="$t('window.close')">
          <svg viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
    <main class="main">
      <aside class="sidebar">
        <div class="sidebar-section">
          <div class="sidebar-title">{{ $t('sidebar.general') }}</div>
          <div class="nav-item" :class="{ active: currentSection === 'general' }" @click="showSection('general')">
            <Config size="16" />
            <span class="nav-item-text">{{ $t('sidebar.basicSettings') }}</span>
          </div>
          <div class="nav-item" :class="{ active: currentSection === 'api' }" @click="showSection('api')">
            <Key size="16" />
            <span class="nav-item-text">{{ $t('sidebar.apiConfig') }}</span>
          </div>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-title">{{ $t('sidebar.advanced') }}</div>
          <div class="nav-item" :class="{ active: currentSection === 'mcp' }" @click="showSection('mcp')">
            <Server size="16" />
            <span class="nav-item-text">{{ $t('sidebar.mcpServers') }}</span>
            <span class="nav-item-badge">{{ serverCount }}</span>
          </div>
        </div>
      </aside>
      <div class="content">
        <section v-if="currentSection === 'general'">
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
                <select class="form-select" v-model="settings.language">
                  <option value="zh-CN">{{ $t('languages.zh-CN') }}</option>
                  <option value="en-US">{{ $t('languages.en-US') }}</option>
                  <option value="ja-JP">{{ $t('languages.ja-JP') }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ $t('general.theme') }}</label>
                <select class="form-select" v-model="settings.theme">
                  <option value="Xcode">{{ $t('theme.xcode') }}</option>
                  <option value="Dark">{{ $t('theme.dark') }}</option>
                  <option value="Light">{{ $t('theme.light') }}</option>
                  <option value="Solarized Dark">{{ $t('theme.solarizedDark') }}</option>
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
                <select class="form-select" v-model="settings.bootAnimationShown">
                  <option :value="true">{{ $t('general.bootAnimationShown') }}</option>
                  <option :value="false">{{ $t('general.bootAnimationNotShown') }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ $t('general.checkpointing') }}</label>
                <select class="form-select" v-model="settings.checkpointing.enabled">
                  <option :value="true">{{ $t('general.enabled') }}</option>
                  <option :value="false">{{ $t('general.disabled') }}</option>
                </select>
              </div>
            </div>
          </div>
        </section>
        <section v-if="currentSection === 'api'">
          <div class="content-header">
            <h1 class="content-title">{{ $t('api.title') }}</h1>
            <p class="content-desc">{{ $t('api.description') }}</p>
          </div>
          <div class="card">
            <div class="card-title">
              <Exchange size="16" />
              {{ $t('api.profileManagement') }}
              <button class="btn btn-primary btn-sm" @click="createNewApiProfile" style="margin-left: auto">
                <Add size="14" />
                {{ $t('api.newProfile') }}
              </button>
            </div>
            <div class="profile-list">
              <div v-for="profile in apiProfiles" :key="profile.name" class="profile-item" :class="{ active: currentApiProfile === profile.name }" @click="selectApiProfile(profile.name)">
                <div class="profile-icon" :style="getProfileIconStyle(profile.name)">
                  <span class="profile-icon-text">{{ getProfileInitial(profile.name) }}</span>
                </div>
                <div class="profile-info">
                  <div class="profile-name">{{ profile.name }}</div>
                  <div class="profile-url">{{ getProfileUrl(profile.name) }}</div>
                </div>
                <div class="profile-status" v-if="currentApiProfile === profile.name">
                  <span class="status-badge">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,8 6,11 13,4"></polyline>
                    </svg>
                    {{ $t('api.inUse') }}
                  </span>
                </div>
                <div class="profile-actions">
                  <button class="action-btn" @click.stop="openApiEditDialog(profile.name)" :title="$t('api.edit')">
                    <Edit size="14" />
                  </button>
                  <button class="action-btn" @click.stop="duplicateApiProfile(profile.name)" :title="$t('api.duplicate')">
                    <Copy size="14" />
                  </button>
                  <button class="action-btn action-btn-danger" v-if="profile.name !== 'default'" @click.stop="deleteApiProfile(profile.name)" :title="$t('api.delete')">
                    <Delete size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section v-if="currentSection === 'mcp'">
          <div class="content-header">
            <h1 class="content-title">{{ $t('mcp.title') }}</h1>
            <p class="content-desc">{{ $t('mcp.description') }}</p>
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
              <label class="form-label" style="margin: 0">{{ $t('mcp.serverList') }}</label>
              <button class="btn btn-primary" @click="addServer" style="padding: 6px 12px; font-size: 12px">
                <Add size="12" />
                {{ $t('mcp.addServerBtn') }}
              </button>
            </div>
            <div class="server-list">
              <template v-if="serverCount > 0">
                <div v-for="(config, name) in settings.mcpServers" :key="name" class="server-item" :class="{ selected: currentServerName === name }" @click="selectServer(name)">
                  <div class="server-info">
                    <div class="server-name">{{ name }}</div>
                    <div class="server-desc">{{ config.description || $t('mcp.noDescription') }}</div>
                  </div>
                  <div class="server-status"></div>
                </div>
              </template>
              <div v-else class="empty-state">
                <Server size="48" class="empty-state-icon" />
                <div class="empty-state-title">{{ $t('mcp.noServers') }}</div>
                <div class="empty-state-desc">{{ $t('mcp.addFirstServer') }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
    <footer class="footer">
      <div class="footer-status">
        <div class="footer-status-dot"></div>
        <span>{{ $t('api.currentConfig') }}: {{ currentApiProfile || 'default' }}</span>
      </div>
    </footer>
    <!-- Input Dialog -->
    <div v-if="showInputDialog.show" class="dialog-overlay dialog-overlay-top">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ showInputDialog.title }}</div>
        <div v-if="showInputDialog.isConfirm" class="dialog-confirm-text">{{ showInputDialog.placeholder }}</div>
        <input v-else type="text" class="form-input" v-model="inputDialogValue" :placeholder="showInputDialog.placeholder" @keyup.enter="closeInputDialog(true)" autofocus />
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeInputDialog(false)">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="closeInputDialog(true)">{{ $t('dialog.confirm') }}</button>
        </div>
      </div>
    </div>
    <!-- API Profile Create Dialog -->
    <div v-if="showApiCreateDialog" class="dialog-overlay dialog-overlay-top" @keyup.esc="closeApiCreateDialog" tabindex="-1" ref="apiCreateDialogOverlay">
      <div class="dialog api-edit-dialog" @click.stop>
        <div class="dialog-header">
          <div class="dialog-title">
            <Key size="18" />
            {{ $t('api.createTitle') }}
          </div>
          <button class="side-panel-close" @click="closeApiCreateDialog">
            <svg viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" />
              <line x1="10" y1="0" x2="0" y2="10" />
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">{{ $t('api.configName') }} <span class="form-required">*</span></label>
            <input type="text" class="form-input" v-model="creatingApiData.name" :placeholder="$t('api.configNamePlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.authType') }}</label>
            <select class="form-select" v-model="creatingApiData.selectedAuthType">
              <option value="iflow">{{ $t('api.auth.iflow') }}</option>
              <option value="api">{{ $t('api.auth.api') }}</option>
              <option value="openai-compatible">{{ $t('api.auth.openaiCompatible') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.apiKey') }}</label>
            <input type="password" class="form-input" v-model="creatingApiData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('api.baseUrl') }}</label>
              <input type="text" class="form-input" v-model="creatingApiData.baseUrl" :placeholder="$t('api.baseUrlPlaceholder')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('api.modelName') }}</label>
              <input type="text" class="form-input" v-model="creatingApiData.modelName" :placeholder="$t('api.modelNamePlaceholder')" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.searchApiKey') }}</label>
            <input type="password" class="form-input" v-model="creatingApiData.searchApiKey" :placeholder="$t('api.searchApiKeyPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.cna') }}</label>
            <input type="text" class="form-input" v-model="creatingApiData.cna" :placeholder="$t('api.cnaPlaceholder')" />
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeApiCreateDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="saveApiCreate"> <Save size="14" /> {{ $t('api.create') }} </button>
        </div>
      </div>
    </div>
    <!-- API Profile Edit Dialog -->
    <div v-if="showApiEditDialog" class="dialog-overlay dialog-overlay-top" @keyup.esc="closeApiEditDialog" tabindex="-1" ref="apiEditDialogOverlay">
      <div class="dialog api-edit-dialog" @click.stop>
        <div class="dialog-header">
          <div class="dialog-title">
            <Key size="18" />
            {{ $t('api.editTitle') }}
          </div>
          <button class="side-panel-close" @click="closeApiEditDialog">
            <svg viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" />
              <line x1="10" y1="0" x2="0" y2="10" />
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">{{ $t('api.authType') }}</label>
            <select class="form-select" v-model="editingApiData.selectedAuthType">
              <option value="iflow">{{ $t('api.auth.iflow') }}</option>
              <option value="api">{{ $t('api.auth.api') }}</option>
              <option value="openai-compatible">{{ $t('api.auth.openaiCompatible') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.apiKey') }}</label>
            <input type="password" class="form-input" v-model="editingApiData.apiKey" :placeholder="$t('api.apiKeyPlaceholder')" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('api.baseUrl') }}</label>
              <input type="text" class="form-input" v-model="editingApiData.baseUrl" :placeholder="$t('api.baseUrlPlaceholder')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('api.modelName') }}</label>
              <input type="text" class="form-input" v-model="editingApiData.modelName" :placeholder="$t('api.modelNamePlaceholder')" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.searchApiKey') }}</label>
            <input type="password" class="form-input" v-model="editingApiData.searchApiKey" :placeholder="$t('api.searchApiKeyPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('api.cna') }}</label>
            <input type="text" class="form-input" v-model="editingApiData.cna" :placeholder="$t('api.cnaPlaceholder')" />
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeApiEditDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="saveApiEdit"> <Save size="14" /> {{ $t('api.save') }} </button>
        </div>
      </div>
    </div>
    <!-- Server Side Panel -->
    <div v-if="showServerPanel" class="side-panel-overlay" @keyup.esc="closeServerPanel" tabindex="-1" ref="serverPanelOverlay">
      <div class="side-panel" @click.stop>
        <div class="side-panel-header">
          <div class="side-panel-title">
            <Server size="18" />
            {{ isEditingServer ? $t('mcp.editServer') : $t('mcp.addServer') }}
          </div>
          <button class="side-panel-close" @click="closeServerPanel">
            <svg viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" />
              <line x1="10" y1="0" x2="0" y2="10" />
            </svg>
          </button>
        </div>
        <div class="side-panel-body">
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.serverName') }} <span class="form-required">*</span></label>
            <input type="text" class="form-input" v-model="editingServerData.name" :placeholder="$t('mcp.serverNamePlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.descriptionLabel') }}</label>
            <input type="text" class="form-input" v-model="editingServerData.description" :placeholder="$t('mcp.descriptionPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.command') }} <span class="form-required">*</span></label>
            <input type="text" class="form-input" v-model="editingServerData.command" :placeholder="$t('mcp.commandPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.workingDir') }}</label>
            <input type="text" class="form-input" v-model="editingServerData.cwd" :placeholder="$t('mcp.cwdPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.args') }}</label>
            <textarea class="form-textarea" v-model="editingServerData.args" rows="4" :placeholder="$t('mcp.argsPlaceholder')"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('mcp.envVars') }}</label>
            <textarea class="form-textarea" v-model="editingServerData.env" rows="3" :placeholder="$t('mcp.envVarsPlaceholder')"></textarea>
          </div>
        </div>
        <div class="side-panel-footer">
          <button v-if="isEditingServer" class="btn btn-danger" @click="deleteServer">
            <Delete size="14" />
            {{ $t('mcp.delete') }}
          </button>
          <div class="side-panel-footer-right">
            <button class="btn btn-secondary" @click="closeServerPanel">{{ $t('dialog.cancel') }}</button>
            <button class="btn btn-primary" @click="saveServerFromPanel">
              <Save size="14" />
              {{ isEditingServer ? $t('mcp.saveChanges') : $t('mcp.addServer') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Message Dialog (放在最后确保显示在所有对话框之上) -->
    <div v-if="showMessageDialog.show" class="dialog-overlay dialog-overlay-top">
      <div class="dialog message-dialog" @click.stop>
        <div class="message-dialog-icon" :class="'message-dialog-icon-' + showMessageDialog.type">
          <svg v-if="showMessageDialog.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <svg v-else-if="showMessageDialog.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <svg v-else-if="showMessageDialog.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <svg v-else-if="showMessageDialog.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div class="message-dialog-title">{{ showMessageDialog.title }}</div>
        <div class="message-dialog-message">{{ showMessageDialog.message }}</div>
        <div class="dialog-actions">
          <button class="btn btn-primary" @click="closeMessageDialog">{{ $t('dialog.confirm') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Save, Config, Key, Server, Globe, Setting, Add, Edit, Delete, Exchange, Copy } from '@icon-park/vue-next'
const { locale, t } = useI18n()
const settings = ref({
  language: 'zh-CN',
  theme: 'Xcode',
  bootAnimationShown: true,
  checkpointing: { enabled: true },
  mcpServers: {},
  selectedAuthType: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  modelName: '',
  searchApiKey: '',
  cna: '',
  currentApiProfile: 'default',
  apiProfiles: { default: {} },
})
const originalSettings = ref({})
const modified = ref(false)
const currentSection = ref('general')
const currentServerName = ref(null)
const isLoading = ref(true)
const apiProfiles = ref([])
const currentApiProfile = ref('default')
const showInputDialog = ref({ show: false, title: '', placeholder: '', callback: null })
const inputDialogValue = ref('')
const showMessageDialog = ref({ show: false, type: 'info', title: '', message: '', callback: null })
const showServerPanel = ref(false)
const isEditingServer = ref(false)
const editingServerData = ref({
  name: '',
  description: '',
  command: 'npx',
  cwd: '.',
  args: '',
  env: '',
})
const showApiEditDialog = ref(false)
const editingApiProfileName = ref('')
const editingApiData = ref({
  selectedAuthType: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  modelName: '',
  searchApiKey: '',
  cna: '',
})
const showApiCreateDialog = ref(false)
const creatingApiData = ref({
  name: '',
  selectedAuthType: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  modelName: '',
  searchApiKey: '',
  cna: '',
})
// Load API profiles list
const loadApiProfiles = async () => {
  const result = await window.electronAPI.listApiProfiles()
  if (result.success) {
    // 确保至少有 default 配置
    if (!result.profiles || result.profiles.length === 0) {
      apiProfiles.value = [{ name: 'default', isDefault: true }]
    } else {
      apiProfiles.value = result.profiles
    }
    currentApiProfile.value = result.currentProfile || 'default'
  }
}
// Switch API profile
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
// Create new API profile
const createNewApiProfile = () => {
  creatingApiData.value = {
    name: '',
    selectedAuthType: 'openai-compatible',
    apiKey: '',
    baseUrl: '',
    modelName: '',
    searchApiKey: '',
    cna: '',
  }
  showApiCreateDialog.value = true
}
// Close API create dialog
const closeApiCreateDialog = () => {
  showApiCreateDialog.value = false
}
// Save API create
const saveApiCreate = async () => {
  const name = creatingApiData.value.name.trim()
  if (!name) {
    await showMessage({ type: 'warning', title: t('messages.error'), message: t('messages.inputConfigName') })
    return
  }
  const result = await window.electronAPI.createApiProfile(name)
  if (result.success) {
    // 创建成功后，更新配置数据
    const profileData = {
      selectedAuthType: creatingApiData.value.selectedAuthType,
      apiKey: creatingApiData.value.apiKey,
      baseUrl: creatingApiData.value.baseUrl,
      modelName: creatingApiData.value.modelName,
      searchApiKey: creatingApiData.value.searchApiKey,
      cna: creatingApiData.value.cna,
    }
    // 保存配置数据
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
// Delete API profile
const deleteApiProfile = async name => {
  const profileName = name || currentApiProfile.value
  if (profileName === 'default') {
    await showMessage({ type: 'warning', title: t('messages.warning'), message: t('messages.cannotDeleteDefault') })
    return
  }
  const confirmed = await new Promise(resolve => {
    showInputDialog.value = {
      show: true,
      title: t('api.delete'),
      placeholder: t('messages.confirmDeleteConfig', { name: profileName }),
      callback: resolve,
      isConfirm: true,
    }
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

// Select API profile (click on card)
const selectApiProfile = async name => {
  if (name === currentApiProfile.value) return
  currentApiProfile.value = name
  isLoading.value = true
  await switchApiProfile()
  isLoading.value = false
}
// Get profile initial letter for icon
const getProfileInitial = name => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}
// Get profile URL for display
const getProfileUrl = name => {
  if (!settings.value.apiProfiles || !settings.value.apiProfiles[name]) {
    return t('api.unconfigured')
  }
  const profile = settings.value.apiProfiles[name]
  return profile.baseUrl || t('api.noBaseUrl')
}
// Get profile icon style (gradient colors)
const profileColors = [
  'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', // orange
  'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', // purple
  'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)', // cyan
  'linear-gradient(135deg, #10b981 0%, #34d399 100%)', // green
  'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)', // rose
  'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', // blue
]
const getProfileIconStyle = name => {
  if (name === 'default') {
    return { background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }
  }
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % profileColors.length
  return { background: profileColors[index] }
}
// Duplicate API profile
const duplicateApiProfile = async name => {
  const newName = await new Promise(resolve => {
    showInputDialog.value = {
      show: true,
      title: t('api.duplicate'),
      placeholder: t('api.newConfigNamePlaceholder'),
      callback: resolve,
    }
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
// Open API edit dialog
const openApiEditDialog = profileName => {
  // 保存正在编辑的配置名称
  editingApiProfileName.value = profileName
  // 从 apiProfiles 中加载指定配置的数据
  const profile = settings.value.apiProfiles && settings.value.apiProfiles[profileName]
  editingApiData.value = {
    selectedAuthType: (profile && profile.selectedAuthType) || settings.value.selectedAuthType || 'openai-compatible',
    apiKey: (profile && profile.apiKey) || settings.value.apiKey || '',
    baseUrl: (profile && profile.baseUrl) || settings.value.baseUrl || '',
    modelName: (profile && profile.modelName) || settings.value.modelName || '',
    searchApiKey: (profile && profile.searchApiKey) || settings.value.searchApiKey || '',
    cna: (profile && profile.cna) || settings.value.cna || '',
  }
  showApiEditDialog.value = true
}
// Close API edit dialog
const closeApiEditDialog = () => {
  showApiEditDialog.value = false
}
// Save API edit
const saveApiEdit = async () => {
  if (!settings.value.apiProfiles) {
    settings.value.apiProfiles = {}
  }
  // 确保配置对象存在
  if (!settings.value.apiProfiles[editingApiProfileName.value]) {
    settings.value.apiProfiles[editingApiProfileName.value] = {}
  }
  // 保存到指定的配置
  settings.value.apiProfiles[editingApiProfileName.value].selectedAuthType = editingApiData.value.selectedAuthType
  settings.value.apiProfiles[editingApiProfileName.value].apiKey = editingApiData.value.apiKey
  settings.value.apiProfiles[editingApiProfileName.value].baseUrl = editingApiData.value.baseUrl
  settings.value.apiProfiles[editingApiProfileName.value].modelName = editingApiData.value.modelName
  settings.value.apiProfiles[editingApiProfileName.value].searchApiKey = editingApiData.value.searchApiKey
  settings.value.apiProfiles[editingApiProfileName.value].cna = editingApiData.value.cna
  showApiEditDialog.value = false
  // 自动保存到文件
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
    // 确保常规设置字段有默认值
    if (data.language === undefined) data.language = 'zh-CN'
    if (data.theme === undefined) data.theme = 'Xcode'
    if (data.bootAnimationShown === undefined) data.bootAnimationShown = true
    // 确保 API 相关字段有默认值
    if (!data.selectedAuthType) data.selectedAuthType = 'openai-compatible'
    if (data.apiKey === undefined) data.apiKey = ''
    if (data.baseUrl === undefined) data.baseUrl = ''
    if (data.modelName === undefined) data.modelName = ''
    if (data.searchApiKey === undefined) data.searchApiKey = ''
    if (data.cna === undefined) data.cna = ''
    if (!data.apiProfiles) data.apiProfiles = { default: {} }
    if (!data.currentApiProfile) data.currentApiProfile = 'default'
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
      // 自动保存基础设置到文件
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
const themeClass = computed(() => {
  const theme = settings.value.theme
  if (theme === 'Dark') return 'dark'
  if (theme === 'Solarized Dark') return 'solarized-dark'
  return ''
})
const selectServer = name => {
  currentServerName.value = name
  openEditServerPanel(name)
}
const serverPanelOverlay = ref(null)
const openAddServerPanel = () => {
  isEditingServer.value = false
  editingServerData.value = {
    name: '',
    description: '',
    command: 'npx',
    cwd: '.',
    args: '-y\npackage-name',
    env: '',
  }
  showServerPanel.value = true
  nextTick(() => {
    serverPanelOverlay.value?.focus()
  })
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
  nextTick(() => {
    serverPanelOverlay.value?.focus()
  })
}
const closeServerPanel = () => {
  showServerPanel.value = false
}
const saveServerFromPanel = async () => {
  const name = editingServerData.value.name.trim()
  if (!name) {
    await showMessage({ type: 'warning', title: t('messages.error'), message: t('mcp.inputServerName') })
    return
  }
  if (!isEditingServer.value && settings.value.mcpServers[name]) {
    await showMessage({ type: 'warning', title: t('messages.error'), message: t('mcp.serverNameExists') })
    return
  }
  // 如果是编辑模式且名称改变了，需要删除旧的服务器
  if (isEditingServer.value && currentServerName.value && currentServerName.value !== name) {
    delete settings.value.mcpServers[currentServerName.value]
  }
  const serverConfig = {
    command: editingServerData.value.command.trim(),
    description: editingServerData.value.description.trim(),
    cwd: editingServerData.value.cwd.trim() || '.',
    args: editingServerData.value.args
      .split('\n')
      .map(s => s.trim())
      .filter(s => s),
  }
  const envText = editingServerData.value.env.trim()
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
  // 自动保存到文件
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(dataToSave))
    modified.value = false
  }
}
const addServer = async () => {
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
  // 自动保存到文件
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(dataToSave))
    modified.value = false
  }
}
const currentServer = computed(() => {
  if (!currentServerName.value || !settings.value.mcpServers) return null
  return settings.value.mcpServers[currentServerName.value]
})
const minimize = () => window.electronAPI.minimize()
const maximize = () => window.electronAPI.maximize()
const close = () => window.electronAPI.close()
const closeInputDialog = result => {
  if (showInputDialog.value.callback) {
    // 如果是确认对话框，传递 result（true/false）
    // 如果是输入对话框，点击确定传递输入值，点击取消传递 false
    if (showInputDialog.value.isConfirm) {
      showInputDialog.value.callback(result)
    } else {
      showInputDialog.value.callback(result ? inputDialogValue.value : false)
    }
  }
  showInputDialog.value.show = false
  showInputDialog.value.isConfirm = false
  showInputDialog.value.defaultValue = ''
  inputDialogValue.value = ''
}
// Message Dialog
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
// Watch for dialog open to set default value
watch(
  () => showInputDialog.value.show,
  show => {
    if (show && showInputDialog.value.defaultValue) {
      inputDialogValue.value = showInputDialog.value.defaultValue
    }
  },
)
// Apply theme class to body when theme changes
watch(
  () => settings.value.theme,
  theme => {
    const cls = themeClass.value
    if (cls) {
      document.body.classList.add(cls)
      if (cls === 'dark') document.body.classList.remove('solarized-dark')
      else if (cls === 'solarized-dark') document.body.classList.remove('dark')
    } else {
      document.body.classList.remove('dark', 'solarized-dark')
    }
  },
)
onMounted(async () => {
  await loadApiProfiles()
  await loadSettings()
  // 同步初始语言到 i18n
  locale.value = settings.value.language
  // 应用初始主题
  const cls = themeClass.value
  if (cls) {
    document.body.classList.add(cls)
  }
  // 监听托盘切换 API 配置事件
  window.electronAPI.onApiProfileSwitched(async profileName => {
    currentApiProfile.value = profileName
    await loadSettings()
  })
})

onUnmounted(() => {
  // 清理监听器
})
</script>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --bg-hover: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --accent-light: #eff6ff;
  --border: #e2e8f0;
  --border-light: #f1f5f9;
  --success: #10b981;
  --danger: #ef4444;
  --radius: 6px;
  --radius-lg: 10px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
}
/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
  user-select: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
/* Dark Theme Variables */
.dark,
.solarized-dark {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --bg-hover: #1f4068;
  --text-primary: #e4e4e7;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  --accent: #60a5fa;
  --accent-hover: #3b82f6;
  --accent-light: rgba(96, 165, 250, 0.15);
  --border: #2d2d44;
  --border-light: #232338;
  --success: #34d399;
  --danger: #f87171;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
}

/* Solarized Dark specific overrides */
.solarized-dark {
  --bg-primary: #002b36;
  --bg-secondary: #073642;
  --bg-tertiary: #094856;
  --bg-hover: #0a5a6f;
  --text-primary: #839496;
  --text-secondary: #93a1a1;
  --text-tertiary: #586e75;
  --accent: #268bd2;
  --accent-hover: #1a73c0;
  --accent-light: rgba(38, 139, 210, 0.15);
  --border: #1d3a47;
  --border-light: #0d3a47;
  --success: #2aa198;
  --danger: #dc322f;
}

/* Scrollbar Styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
  transition: background 0.2s ease;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
::-webkit-scrollbar-corner {
  background: transparent;
}
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
/* Titlebar */
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
}
.titlebar-left {
  display: flex;
  align-items: center;
  padding-left: 16px;
  gap: 10px;
}
.titlebar-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
}
.titlebar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}
.titlebar-btn {
  width: 48px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.titlebar-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  transform: scale(1.05);
}
.titlebar-btn:active {
  transform: scale(0.95);
}
.titlebar-btn.close:hover {
  background: var(--danger);
  color: white;
}
.titlebar-btn svg {
  width: 12px;
  height: 12px;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
}
/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 18px;
  border: none;
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;
}
.btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition:
    width 0.4s ease,
    height 0.4s ease;
}
.btn:active::after {
  width: 200px;
  height: 200px;
}
.btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}
.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}
.btn-primary:active {
  transform: translateY(0) scale(0.98);
}
.btn-secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}
.btn-secondary:active {
  transform: scale(0.98);
}
.btn-danger {
  background: var(--danger);
  color: white;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}
.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}
.btn-danger:active {
  transform: translateY(0) scale(0.98);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
/* Main Layout */
.main {
  display: flex;
  flex: 1;
  overflow: hidden;
}
/* Sidebar */
.sidebar {
  width: 220px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
}
.sidebar-section {
  margin-bottom: 20px;
}
.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 10px;
  margin-bottom: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-secondary);
  margin-bottom: 2px;
  position: relative;
}
.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: var(--accent);
  border-radius: var(--radius) 0 0 var(--radius);
  transition: width 0.2s ease;
}
.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.nav-item.active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 500;
  animation: slideIn 0.3s ease;
}
.nav-item.active::before {
  width: 3px;
}
.nav-item-text {
  font-size: 13px;
  letter-spacing: -0.01em;
}
.nav-item-badge {
  margin-left: auto;
  background: var(--bg-tertiary);
  padding: 2px 7px;
  border-radius: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.nav-item.active .nav-item-badge {
  background: var(--accent);
  color: white;
}
/* Content */
.content {
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;
  background: var(--bg-primary);
}
.content section {
  animation: fadeIn 0.35s ease;
}
.content-header {
  margin-bottom: 28px;
}
.content-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 6px;
  letter-spacing: -0.03em;
  animation: slideIn 0.3s ease;
}
.content-desc {
  font-size: 14px;
  color: var(--text-tertiary);
  animation: fadeIn 0.4s ease 0.1s backwards;
}
/* Cards */
.card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.4s ease backwards;
}
.card:nth-child(1) {
  animation-delay: 0.05s;
}
.card:nth-child(2) {
  animation-delay: 0.1s;
}
.card:nth-child(3) {
  animation-delay: 0.15s;
}
.card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.card-title .iconpark-icon {
  color: var(--accent);
}
/* Form Elements */
.form-group {
  margin-bottom: 18px;
}
.form-group:last-child {
  margin-bottom: 0;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-secondary);
  letter-spacing: -0.01em;
}
.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
}
.form-input:hover {
  border-color: var(--text-tertiary);
}
.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
  transform: translateY(-1px);
}
.form-input::placeholder {
  color: var(--text-tertiary);
}
.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.form-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  letter-spacing: -0.01em;
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
  transition: all 0.2s ease;
  position: relative;
}
.form-select:hover {
  border-color: var(--text-tertiary);
  background-color: var(--bg-tertiary);
}
.form-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
  transition: all 0.2s ease;
}
.form-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
/* Server List */
.server-list {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-secondary);
}
.server-item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.3s ease backwards;
}
.server-item:nth-child(1) {
  animation-delay: 0.02s;
}
.server-item:nth-child(2) {
  animation-delay: 0.04s;
}
.server-item:nth-child(3) {
  animation-delay: 0.06s;
}
.server-item:nth-child(4) {
  animation-delay: 0.08s;
}
.server-item:nth-child(5) {
  animation-delay: 0.1s;
}
.server-item:nth-child(6) {
  animation-delay: 0.12s;
}
.server-item:nth-child(7) {
  animation-delay: 0.14s;
}
.server-item:nth-child(8) {
  animation-delay: 0.16s;
}
.server-item:last-child {
  border-bottom: none;
}
.server-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(4px);
}
.server-item.selected {
  background: var(--accent-light);
  border-left: 3px solid var(--accent);
  padding-left: 15px;
}
.server-info {
  flex: 1;
  min-width: 0;
}
.server-name {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.server-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.server-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
  animation: pulse 2s ease-in-out infinite;
}
/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
}
.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
  color: var(--text-tertiary);
}
.empty-state-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-secondary);
}
.empty-state-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 20px;
}
/* Footer */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-tertiary);
}
.footer-status {
  display: flex;
  align-items: center;
  gap: 8px;
}
.footer-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}
.footer-modified {
  color: var(--accent);
  font-weight: 500;
}
/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.dialog {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 360px;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.2s ease;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.dialog-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 18px;
  letter-spacing: -0.01em;
}
.dialog-confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
.dialog-overlay-top {
  z-index: 1300;
}
/* Message Dialog */
.message-dialog {
  position: relative;
  text-align: center;
  padding: 32px 24px;
  z-index: 1400;
}
.message-dialog-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.message-dialog-icon svg {
  width: 24px;
  height: 24px;
}
.message-dialog-icon-info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent);
}
.message-dialog-icon-success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}
.message-dialog-icon-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.message-dialog-icon-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}
.message-dialog-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.message-dialog-message {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.message-dialog .dialog-actions {
  justify-content: center;
  margin-top: 24px;
}
.message-dialog .dialog-actions .btn {
  min-width: 100px;
}
.iconpark-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: -0.125em;
  flex-shrink: 0;
}
.iconpark-icon svg {
  display: block;
}
/* Profile List (API Configuration Cards) */
.profile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.profile-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.3s ease backwards;
}
.profile-item:nth-child(1) {
  animation-delay: 0.02s;
}
.profile-item:nth-child(2) {
  animation-delay: 0.04s;
}
.profile-item:nth-child(3) {
  animation-delay: 0.06s;
}
.profile-item:nth-child(4) {
  animation-delay: 0.08s;
}
.profile-item:nth-child(5) {
  animation-delay: 0.1s;
}
.profile-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--text-tertiary);
  transform: translateX(4px);
}
.profile-item.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  box-shadow:
    0 0 0 1px var(--accent),
    0 4px 12px rgba(59, 130, 246, 0.15);
}
.profile-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
.profile-icon-text {
  font-size: 16px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.profile-info {
  flex: 1;
  min-width: 0;
  margin-left: 14px;
}
.profile-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.profile-url {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-status {
  margin-left: 12px;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent);
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.status-badge svg {
  width: 12px;
  height: 12px;
}
.profile-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.profile-item:hover .profile-actions,
.profile-item.active .profile-actions {
  opacity: 1;
}
.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.2s ease;
}
.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.action-btn.action-btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}
/* Side Panel */
.side-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}
.side-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 420px;
  max-width: 100%;
  background: var(--bg-secondary);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.side-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.side-panel-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.side-panel-title .iconpark-icon {
  color: var(--accent);
}
.side-panel-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.2s ease;
}
.side-panel-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.side-panel-close svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
}
.side-panel-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.side-panel-body .form-group {
  margin-bottom: 20px;
}
.side-panel-body .form-group:last-child {
  margin-bottom: 0;
}
.form-required {
  color: var(--danger);
  font-weight: 500;
}
.side-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.side-panel-footer-right {
  display: flex;
  gap: 10px;
}
/* API Edit Dialog */
.api-edit-dialog {
  min-width: 480px;
  max-width: 520px;
  padding: 0;
  overflow: hidden;
}
.api-edit-dialog .dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.api-edit-dialog .dialog-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  margin-bottom: 0;
}
.api-edit-dialog .dialog-title .iconpark-icon {
  color: var(--accent);
}
.api-edit-dialog .dialog-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}
.api-edit-dialog .dialog-body .form-group {
  margin-bottom: 18px;
}
.api-edit-dialog .dialog-body .form-group:last-child {
  margin-bottom: 0;
}
.api-edit-dialog .dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-tertiary);
  margin-top: 0;
}
</style>
