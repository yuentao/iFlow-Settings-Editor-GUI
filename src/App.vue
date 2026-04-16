<template>
  <div class="app">
    <div class="titlebar">
      <div class="titlebar-left">
        <span class="titlebar-title">iFlow Settings Editor</span>
      </div>
      <div class="titlebar-controls">
        <button class="titlebar-btn" @click="minimize" title="最小化">
          <svg viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" /></svg>
        </button>
        <button class="titlebar-btn" @click="maximize" title="最大化">
          <svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" stroke-width="1" stroke="currentColor" fill="none" /></svg>
        </button>
        <button class="titlebar-btn close" @click="close" title="关闭">
          <svg viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>

    <header class="header">
      <div class="header-left">
        <span class="header-title">iFlow 设置编辑器</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="reloadSettings">
          <Refresh size="14" />
          重新加载
        </button>
        <button class="btn btn-primary" @click="saveSettings">
          <Save size="14" />
          保存更改
        </button>
      </div>
    </header>

    <main class="main">
      <aside class="sidebar">
        <div class="sidebar-section">
          <div class="sidebar-title">常规</div>
          <div class="nav-item" :class="{ active: currentSection === 'general' }" @click="showSection('general')">
            <Config size="16" />
            <span class="nav-item-text">基本设置</span>
          </div>
          <div class="nav-item" :class="{ active: currentSection === 'api' }" @click="showSection('api')">
            <Key size="16" />
            <span class="nav-item-text">API 配置</span>
          </div>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-title">高级</div>
          <div class="nav-item" :class="{ active: currentSection === 'mcp' }" @click="showSection('mcp')">
            <Server size="16" />
            <span class="nav-item-text">MCP 服务器</span>
            <span class="nav-item-badge">{{ serverCount }}</span>
          </div>
        </div>
      </aside>

      <div class="content">
        <section v-if="currentSection === 'general'">
          <div class="content-header">
            <h1 class="content-title">基本设置</h1>
            <p class="content-desc">配置应用程序的常规选项</p>
          </div>
          <div class="card">
            <div class="card-title">
              <Globe size="16" />
              语言与界面
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">语言</label>
                <select class="form-select" v-model="settings.language">
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">主题</label>
                <select class="form-select" v-model="settings.theme">
                  <option value="Xcode">Xcode</option>
                  <option value="Dark">深色</option>
                  <option value="Light">浅色</option>
                  <option value="Solarized Dark">Solarized Dark</option>
                </select>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">
              <Setting size="16" />
              其他设置
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">启动动画</label>
                <select class="form-select" v-model="settings.bootAnimationShown">
                  <option :value="true">已显示</option>
                  <option :value="false">未显示</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">检查点保存</label>
                <select class="form-select" v-model="settings.checkpointing.enabled">
                  <option :value="true">已启用</option>
                  <option :value="false">已禁用</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section v-if="currentSection === 'api'">
          <div class="content-header">
            <h1 class="content-title">API 配置</h1>
            <p class="content-desc">配置 AI 服务和搜索 API</p>
          </div>
          <div class="card">
            <div class="card-title">
              <Exchange size="16" />
              配置文件管理
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">当前配置</label>
                <select class="form-select" v-model="currentApiProfile" @change="switchApiProfile">
                  <option v-for="profile in apiProfiles" :key="profile.name" :value="profile.name">{{ profile.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <div class="btn-group">
                  <button class="btn btn-secondary" @click="createNewApiProfile">
                    <Add size="14" />
                    新建
                  </button>
                  <button class="btn btn-danger" @click="deleteApiProfile" :disabled="currentApiProfile === 'default'">
                    <Delete size="14" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">
              <Robot size="16" />
              AI 模型
            </div>
            <div class="form-group">
              <label class="form-label">认证方式</label>
              <select class="form-select" v-model="settings.selectedAuthType">
                <option value="iflow">iFlow</option>
                <option value="api">API Key</option>
                <option value="openai-compatible">OpenAI 兼容</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">API Key</label>
              <input type="password" class="form-input" v-model="settings.apiKey" placeholder="sk-cp-XXXXX..." />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" v-model="settings.baseUrl" placeholder="https://api.minimaxi.com/v1" />
              </div>
              <div class="form-group">
                <label class="form-label">模型名称</label>
                <input type="text" class="form-input" v-model="settings.modelName" placeholder="MiniMax-M2.7" />
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">
              <Search size="16" />
              搜索服务
            </div>
            <div class="form-group">
              <label class="form-label">搜索 API Key</label>
              <input type="password" class="form-input" v-model="settings.searchApiKey" placeholder="sk-XXXXX..." />
            </div>
            <div class="form-group">
              <label class="form-label">CNA</label>
              <input type="text" class="form-input" v-model="settings.cna" placeholder="CNA 标识" />
            </div>
          </div>
        </section>

        <section v-if="currentSection === 'mcp'">
          <div class="content-header">
            <h1 class="content-title">MCP 服务器</h1>
            <p class="content-desc">管理 Model Context Protocol 服务器配置</p>
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
              <label class="form-label" style="margin: 0">服务器列表</label>
              <button class="btn btn-primary" @click="addServer" style="padding: 6px 12px; font-size: 12px">
                <Add size="12" />
                添加服务器
              </button>
            </div>
            <div class="server-list">
              <template v-if="serverCount > 0">
                <div v-for="(config, name) in settings.mcpServers" :key="name" class="server-item" :class="{ selected: currentServerName === name }" @click="selectServer(name)">
                  <div class="server-info">
                    <div class="server-name">{{ name }}</div>
                    <div class="server-desc">{{ config.description || '无描述' }}</div>
                  </div>
                  <div class="server-status"></div>
                </div>
              </template>
              <div v-else class="empty-state">
                <Server size="48" class="empty-state-icon" />
                <div class="empty-state-title">暂无 MCP 服务器</div>
                <div class="empty-state-desc">点击上方按钮添加第一个服务器</div>
              </div>
            </div>
          </div>

        </section>
      </div>
    </main>

    <footer class="footer">
      <div class="footer-status">
        <div class="footer-status-dot"></div>
        <span>配置: {{ currentApiProfile || 'default' }}</span>
      </div>
      <span :class="{ 'footer-modified': modified }">{{ modified ? '● 已修改' : '✓ 未修改' }}</span>
    </footer>

    <!-- Input Dialog -->
    <div v-if="showInputDialog.show" class="dialog-overlay dialog-overlay-top" @click.self="closeInputDialog(false)">
      <div class="dialog">
        <div class="dialog-title">{{ showInputDialog.title }}</div>
        <div v-if="showInputDialog.isConfirm" class="dialog-confirm-text">{{ showInputDialog.placeholder }}</div>
        <input v-else type="text" class="form-input" v-model="inputDialogValue" :placeholder="showInputDialog.placeholder" @keyup.enter="closeInputDialog(true)" autofocus />
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeInputDialog(false)">取消</button>
          <button class="btn btn-primary" @click="closeInputDialog(true)">确定</button>
        </div>
      </div>
    </div>

    <!-- Server Side Panel -->
    <div v-if="showServerPanel" class="side-panel-overlay" @click.self="closeServerPanel" @keyup.esc="closeServerPanel" tabindex="-1" ref="serverPanelOverlay">
      <div class="side-panel" @click.stop>
        <div class="side-panel-header">
          <div class="side-panel-title">
            <Server size="18" />
            {{ isEditingServer ? '编辑服务器' : '添加服务器' }}
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
            <label class="form-label">服务器名称 <span class="form-required">*</span></label>
            <input type="text" class="form-input" v-model="editingServerData.name" placeholder="my-mcp-server" />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <input type="text" class="form-input" v-model="editingServerData.description" placeholder="服务器描述信息" />
          </div>
          <div class="form-group">
            <label class="form-label">命令 <span class="form-required">*</span></label>
            <input type="text" class="form-input" v-model="editingServerData.command" placeholder="npx" />
          </div>
          <div class="form-group">
            <label class="form-label">工作目录</label>
            <input type="text" class="form-input" v-model="editingServerData.cwd" placeholder="." />
          </div>
          <div class="form-group">
            <label class="form-label">参数 (每行一个)</label>
            <textarea class="form-textarea" v-model="editingServerData.args" rows="4" placeholder="-y&#10;package-name"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">环境变量 (JSON 格式)</label>
            <textarea class="form-textarea" v-model="editingServerData.env" rows="3" placeholder='{"API_KEY": "xxx"}'></textarea>
          </div>
        </div>
        <div class="side-panel-footer">
          <button v-if="isEditingServer" class="btn btn-danger" @click="deleteServer">
            <Delete size="14" />
            删除
          </button>
          <div class="side-panel-footer-right">
            <button class="btn btn-secondary" @click="closeServerPanel">取消</button>
            <button class="btn btn-primary" @click="saveServerFromPanel">
              <Save size="14" />
              {{ isEditingServer ? '保存更改' : '添加服务器' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { Refresh, Save, Config, Key, Server, Globe, Setting, Robot, Search, Add, Edit, Delete, Exchange } from '@icon-park/vue-next'

const settings = ref({
  language: 'zh-CN',
  theme: 'Xcode',
  bootAnimationShown: true,
  checkpointing: { enabled: true },
  mcpServers: {},
  selectedAuthType: 'iflow',
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
const showServerPanel = ref(false)
const isEditingServer = ref(false)
const editingServerData = ref({
  name: '',
  description: '',
  command: 'npx',
  cwd: '.',
  args: '',
  env: ''
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
  if (modified.value) {
    const confirmed = await new Promise(resolve => {
      showInputDialog.value = { show: true, title: '切换配置', placeholder: '当前有未保存的更改，切换配置将丢失这些更改，确定要切换吗？', callback: resolve, isConfirm: true }
    })
    if (!confirmed) {
      // 恢复到之前的值
      const result = await window.electronAPI.listApiProfiles()
      if (result.success) {
        currentApiProfile.value = result.currentProfile
      }
      return
    }
  }
  const result = await window.electronAPI.switchApiProfile(currentApiProfile.value)
  if (result.success) {
    const data = JSON.parse(JSON.stringify(result.data))
    if (!data.checkpointing) data.checkpointing = { enabled: true }
    if (!data.mcpServers) data.mcpServers = {}
    settings.value = data
    originalSettings.value = JSON.parse(JSON.stringify(data))
    modified.value = false
  } else {
    await window.electronAPI.showMessage({ type: 'error', title: '切换失败', message: result.error })
  }
}

// Create new API profile
const createNewApiProfile = async () => {
  const name = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: '新建配置', placeholder: '请输入配置名称', callback: resolve }
  })
  if (!name) return
  const result = await window.electronAPI.createApiProfile(name)
  if (result.success) {
    await loadApiProfiles()
    await window.electronAPI.showMessage({ type: 'info', title: '创建成功', message: `配置 "${name}" 已创建` })
  } else {
    await window.electronAPI.showMessage({ type: 'error', title: '创建失败', message: result.error })
  }
}

// Delete API profile
const deleteApiProfile = async () => {
  if (currentApiProfile.value === 'default') {
    await window.electronAPI.showMessage({ type: 'warning', title: '无法删除', message: '不能删除默认配置' })
    return
  }
  const confirmed = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: '删除配置', placeholder: `确定要删除配置 "${currentApiProfile.value}" 吗？`, callback: resolve, isConfirm: true }
  })
  if (!confirmed) return
  const result = await window.electronAPI.deleteApiProfile(currentApiProfile.value)
  if (result.success) {
    const data = JSON.parse(JSON.stringify(result.data))
    if (!data.checkpointing) data.checkpointing = { enabled: true }
    if (!data.mcpServers) data.mcpServers = {}
    settings.value = data
    originalSettings.value = JSON.parse(JSON.stringify(data))
    modified.value = false
    await loadApiProfiles()
    await window.electronAPI.showMessage({ type: 'info', title: '删除成功', message: `配置已删除` })
  } else {
    await window.electronAPI.showMessage({ type: 'error', title: '删除失败', message: result.error })
  }
}

const loadSettings = async () => {
  const result = await window.electronAPI.loadSettings()
  if (result.success) {
    const data = JSON.parse(JSON.stringify(result.data))
    if (!data.checkpointing) data.checkpointing = { enabled: true }
    if (!data.mcpServers) data.mcpServers = {}
    // 确保 API 相关字段有默认值
    if (data.selectedAuthType === undefined) data.selectedAuthType = 'iflow'
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

const saveSettings = async () => {
  const dataToSave = JSON.parse(JSON.stringify(settings.value))
  const result = await window.electronAPI.saveSettings(dataToSave)
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(settings.value))
    modified.value = false
    await window.electronAPI.showMessage({ type: 'info', title: '保存成功', message: '设置已保存到 settings.json' })
  } else {
    await window.electronAPI.showMessage({ type: 'error', title: '保存失败', message: `无法保存设置: ${result.error}` })
  }
}

const reloadSettings = async () => {
  if (modified.value) {
    const confirmed = await new Promise(resolve => {
      showInputDialog.value = { show: true, title: '重新加载', placeholder: '当前有未保存的更改，确定要重新加载吗？', callback: resolve, isConfirm: true }
    })
    if (!confirmed) return
  }
  currentServerName.value = null
  await loadSettings()
}

watch(
  settings,
  () => {
    modified.value = true
  },
  { deep: true },
)

const showSection = section => {
  currentSection.value = section
}

const serverCount = computed(() => (settings.value.mcpServers ? Object.keys(settings.value.mcpServers).length : 0))

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
    env: ''
  }
  showServerPanel.value = true
  nextTick(() => {
    serverPanelOverlay.value?.focus()
  })
}

const openEditServerPanel = (name) => {
  const server = settings.value.mcpServers[name]
  if (!server) return
  isEditingServer.value = true
  editingServerData.value = {
    name: name,
    description: server.description || '',
    command: server.command || '',
    cwd: server.cwd || '.',
    args: (server.args || []).join('\n'),
    env: server.env ? JSON.stringify(server.env, null, 2) : ''
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
    await window.electronAPI.showMessage({ type: 'warning', title: '错误', message: '请输入服务器名称' })
    return
  }
  if (!isEditingServer.value && settings.value.mcpServers[name]) {
    await window.electronAPI.showMessage({ type: 'warning', title: '错误', message: '服务器名称已存在' })
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
    args: editingServerData.value.args.split('\n').map(s => s.trim()).filter(s => s)
  }

  const envText = editingServerData.value.env.trim()
  if (envText) {
    try {
      serverConfig.env = JSON.parse(envText)
    } catch (e) {
      await window.electronAPI.showMessage({ type: 'error', title: '错误', message: '环境变量 JSON 格式错误' })
      return
    }
  }

  settings.value.mcpServers[name] = serverConfig
  currentServerName.value = name
  showServerPanel.value = false
}

const addServer = async () => {
  openAddServerPanel()
}

const deleteServer = async () => {
  const serverName = isEditingServer.value ? editingServerData.value.name : currentServerName.value
  if (!serverName) return
  const confirmed = await new Promise(resolve => {
    showInputDialog.value = { show: true, title: '删除服务器', placeholder: `确定要删除服务器 "${serverName}" 吗？`, callback: resolve, isConfirm: true }
  })
  if (!confirmed) return
  delete settings.value.mcpServers[serverName]
  currentServerName.value = null
  showServerPanel.value = false
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
  inputDialogValue.value = ''
}

onMounted(async () => {
  await loadApiProfiles()
  await loadSettings()
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
.titlebar-icon {
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
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

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.header-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.25);
}
.header-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.header-subtitle {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 400;
}
.header-actions {
  display: flex;
  gap: 10px;
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
.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
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
.btn-group {
  display: flex;
  gap: 10px;
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
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
  z-index: 1100;
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
</style>
