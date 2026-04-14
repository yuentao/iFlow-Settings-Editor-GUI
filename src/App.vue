<template>
  <div class="app">
    <div class="titlebar">
      <div class="titlebar-left">
        <div class="titlebar-icon"></div>
        <span class="titlebar-title">iFlow Settings Editor</span>
      </div>
      <div class="titlebar-controls">
        <button class="titlebar-btn" @click="minimize" title="最小化">
          <svg viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5"/></svg>
        </button>
        <button class="titlebar-btn" @click="maximize" title="最大化">
          <svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" stroke-width="1" stroke="currentColor" fill="none"/></svg>
        </button>
        <button class="titlebar-btn close" @click="close" title="关闭">
          <svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/></svg>
        </button>
      </div>
    </div>

    <header class="header">
      <div class="header-left">
        <div class="header-icon"></div>
        <span class="header-title">iFlow 设置编辑器</span>
        <span class="header-subtitle">settings.json</span>
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
                <label class="form-label">当前配置文件</label>
                <select class="form-select" v-model="currentConfigFilePath" @change="switchConfig">
                  <option v-for="cfg in configList" :key="cfg.filePath" :value="cfg.filePath">{{ cfg.name }}</option>
                </select>
              </div>
              <div class="form-group" style="display: flex; align-items: flex-end; gap: 8px;">
                <button class="btn btn-secondary" @click="createNewConfig" style="height: 40px;">
                  <Add size="14" />
                  新建
                </button>
                <button class="btn btn-danger" @click="deleteConfig" style="height: 40px;" :disabled="configList.length <= 1">
                  <Delete size="14" />
                  删除
                </button>
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
              <input type="password" class="form-input" v-model="settings.apiKey" placeholder="sk-cp-XXXXX...">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Base URL</label>
                <input type="text" class="form-input" v-model="settings.baseUrl" placeholder="https://api.minimaxi.com/v1">
              </div>
              <div class="form-group">
                <label class="form-label">模型名称</label>
                <input type="text" class="form-input" v-model="settings.modelName" placeholder="MiniMax-M2.7">
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
              <input type="password" class="form-input" v-model="settings.searchApiKey" placeholder="sk-XXXXX...">
            </div>
            <div class="form-group">
              <label class="form-label">CNA</label>
              <input type="text" class="form-input" v-model="settings.cna" placeholder="CNA 标识">
            </div>
          </div>
        </section>

        <section v-if="currentSection === 'mcp'">
          <div class="content-header">
            <h1 class="content-title">MCP 服务器</h1>
            <p class="content-desc">管理 Model Context Protocol 服务器配置</p>
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <label class="form-label" style="margin: 0;">服务器列表</label>
              <button class="btn btn-primary" @click="addServer" style="padding: 6px 12px; font-size: 12px;">
                <Add size="12" />
                添加服务器
              </button>
            </div>
            <div class="server-list">
              <template v-if="serverCount > 0">
                <div v-for="(config, name) in settings.mcpServers" :key="name"
                     class="server-item" :class="{ selected: currentServerName === name }"
                     @click="selectServer(name)">
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

          <div v-if="currentServer" class="card">
            <div class="card-title">
              <Edit size="16" />
              编辑服务器
            </div>
            <div class="form-group">
              <label class="form-label">名称</label>
              <input type="text" class="form-input" id="serverName" :value="currentServerName" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <input type="text" class="form-input" id="serverDescription" :value="currentServer.description || ''">
            </div>
            <div class="form-group">
              <label class="form-label">命令</label>
              <input type="text" class="form-input" id="serverCommand" :value="currentServer.command || ''">
            </div>
            <div class="form-group">
              <label class="form-label">工作目录</label>
              <input type="text" class="form-input" id="serverCwd" :value="currentServer.cwd || '.'">
            </div>
            <div class="form-group">
              <label class="form-label">参数 (每行一个)</label>
              <textarea class="form-textarea" id="serverArgs" rows="4">{{ serverArgsText }}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">环境变量 (JSON 格式)</label>
              <textarea class="form-textarea" id="serverEnv" rows="3">{{ serverEnvText }}</textarea>
            </div>
            <div style="margin-top: 16px;">
              <button class="btn btn-danger" @click="deleteServer">
                <Delete size="12" />
                删除服务器
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <footer class="footer">
      <div class="footer-status">
        <div class="footer-status-dot"></div>
        <span>{{ currentConfigFilePath }}</span>
      </div>
      <span :class="{ 'footer-modified': modified }">{{ modified ? '● 已修改' : '✓ 未修改' }}</span>
    </footer>

    <!-- Input Dialog -->
    <div v-if="showInputDialog.show" class="dialog-overlay" @click.self="closeInputDialog(false)">
      <div class="dialog">
        <div class="dialog-title">{{ showInputDialog.title }}</div>
        <div v-if="showInputDialog.isConfirm" class="dialog-confirm-text">{{ showInputDialog.placeholder }}</div>
        <input
          v-else
          type="text"
          class="form-input"
          v-model="inputDialogValue"
          :placeholder="showInputDialog.placeholder"
          @keyup.enter="closeInputDialog(true)"
          autofocus
        />
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeInputDialog(false)">取消</button>
          <button class="btn btn-primary" @click="closeInputDialog(true)">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { Refresh, Save, Config, Key, Server, Globe, Setting, Robot, Search, Add, Edit, Delete, Exchange } from '@icon-park/vue-next';

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
  cna: ''
});

const originalSettings = ref({});
const modified = ref(false);
const currentSection = ref('general');
const currentServerName = ref(null);
const isLoading = ref(true);
const configList = ref([]);
const currentConfigFilePath = ref('');
const showInputDialog = ref({ show: false, title: '', placeholder: '', callback: null });
const inputDialogValue = ref('');

// Load config list
const loadConfigList = async () => {
  const result = await window.electronAPI.listConfigs();
  if (result.success) {
    configList.value = result.configs;
  }
};

// Switch config
const switchConfig = async () => {
  if (modified.value) {
    const confirmed = await new Promise((resolve) => {
      showInputDialog.value = { show: true, title: '切换配置', placeholder: '当前有未保存的更改，切换配置将丢失这些更改，确定要切换吗？', callback: resolve, isConfirm: true };
    });
    if (!confirmed) return;
  }
  if (currentConfigFilePath.value) {
    const result = await window.electronAPI.switchConfig(currentConfigFilePath.value);
    if (result.success) {
      await loadSettings();
    }
  }
};

// Create new config
const createNewConfig = async () => {
  const name = await new Promise((resolve) => {
    showInputDialog.value = { show: true, title: '新建配置文件', placeholder: '请输入配置名称', callback: resolve };
  });
  if (!name) return;
  const result = await window.electronAPI.createConfig(name);
  if (result.success) {
    await loadConfigList();
    currentConfigFilePath.value = result.filePath;
    await loadSettings();
    await window.electronAPI.showMessage({ type: 'info', title: '创建成功', message: `配置文件 "${name}" 已创建` });
  } else {
    await window.electronAPI.showMessage({ type: 'error', title: '创建失败', message: result.error });
  }
};

// Delete config
const deleteConfig = async () => {
  if (configList.value.length <= 1) {
    await window.electronAPI.showMessage({ type: 'warning', title: '无法删除', message: '至少需要保留一个配置文件' });
    return;
  }
  const cfg = configList.value.find(c => c.filePath === currentConfigFilePath.value);
  if (!cfg) return;
  const confirmed = await new Promise((resolve) => {
    showInputDialog.value = { show: true, title: '删除配置文件', placeholder: `确定要删除配置文件 "${cfg.name}" 吗？`, callback: resolve, isConfirm: true };
  });
  if (!confirmed) return;
  const result = await window.electronAPI.deleteConfig(currentConfigFilePath.value);
  if (result.success) {
    await loadConfigList();
    if (configList.value.length > 0) {
      currentConfigFilePath.value = configList.value[0].filePath;
      await window.electronAPI.switchConfig(currentConfigFilePath.value);
      await loadSettings();
    }
    await window.electronAPI.showMessage({ type: 'info', title: '删除成功', message: `配置文件 "${cfg.name}" 已删除` });
  } else {
    await window.electronAPI.showMessage({ type: 'error', title: '删除失败', message: result.error });
  }
};

const loadSettings = async () => {
  const result = await window.electronAPI.loadSettings();
  if (result.success) {
    const data = JSON.parse(JSON.stringify(result.data));
    if (!data.checkpointing) data.checkpointing = { enabled: true };
    if (!data.mcpServers) data.mcpServers = {};
    settings.value = data;
    originalSettings.value = JSON.parse(JSON.stringify(data));
    modified.value = false;
  }
  isLoading.value = false;
};

const saveSettings = async () => {
  collectServerData();
  const dataToSave = JSON.parse(JSON.stringify(settings.value));
  const result = await window.electronAPI.saveSettings(dataToSave);
  if (result.success) {
    originalSettings.value = JSON.parse(JSON.stringify(settings.value));
    modified.value = false;
    await window.electronAPI.showMessage({ type: 'info', title: '保存成功', message: '设置已保存到 settings.json' });
  } else {
    await window.electronAPI.showMessage({ type: 'error', title: '保存失败', message: `无法保存设置: ${result.error}` });
  }
};

const reloadSettings = async () => {
  if (modified.value) {
    const confirmed = await new Promise((resolve) => {
      showInputDialog.value = { show: true, title: '重新加载', placeholder: '当前有未保存的更改，确定要重新加载吗？', callback: resolve, isConfirm: true };
    });
    if (!confirmed) return;
  }
  currentServerName.value = null;
  await loadSettings();
};

watch(settings, () => { modified.value = true }, { deep: true });

const showSection = (section) => { currentSection.value = section; };

const serverCount = computed(() => settings.value.mcpServers ? Object.keys(settings.value.mcpServers).length : 0);

const selectServer = (name) => { currentServerName.value = name; };

const addServer = async () => {
  const name = await new Promise((resolve) => {
    showInputDialog.value = { show: true, title: '添加服务器', placeholder: '请输入服务器名称', callback: resolve };
  });
  if (!name) return;
  if (!settings.value.mcpServers) settings.value.mcpServers = {};
  if (settings.value.mcpServers[name]) {
    await window.electronAPI.showMessage({ type: 'warning', title: '错误', message: '服务器已存在' });
    return;
  }
  settings.value.mcpServers[name] = { command: 'npx', args: ['-y', 'package-name'] };
  currentServerName.value = name;
};

const deleteServer = async () => {
  if (!currentServerName.value) return;
  const confirmed = await new Promise((resolve) => {
    showInputDialog.value = { show: true, title: '删除服务器', placeholder: `确定要删除服务器 "${currentServerName.value}" 吗？`, callback: resolve, isConfirm: true };
  });
  if (!confirmed) return;
  delete settings.value.mcpServers[currentServerName.value];
  currentServerName.value = null;
};

const collectServerData = () => {
  if (!currentServerName.value) return;
  const el = document.getElementById('serverName');
  if (el) {
    const name = el.value.trim();
    if (name !== currentServerName.value) {
      delete settings.value.mcpServers[currentServerName.value];
      currentServerName.value = name;
    }
    settings.value.mcpServers[name] = {
      command: document.getElementById('serverCommand')?.value || '',
      description: document.getElementById('serverDescription')?.value || '',
      cwd: document.getElementById('serverCwd')?.value || '.',
      args: (document.getElementById('serverArgs')?.value || '').split('\n').map(s => s.trim()).filter(s => s)
    };
    const envText = document.getElementById('serverEnv')?.value || '';
    if (envText) {
      try { settings.value.mcpServers[name].env = JSON.parse(envText); }
      catch (e) { alert('环境变量 JSON 格式错误'); }
    }
  }
};

const currentServer = computed(() => {
  if (!currentServerName.value || !settings.value.mcpServers) return null;
  return settings.value.mcpServers[currentServerName.value];
});

const serverArgsText = computed(() => {
  if (!currentServer.value) return '';
  return (currentServer.value.args || []).join('\n');
});

const serverEnvText = computed(() => {
  if (!currentServer.value || !currentServer.value.env) return '';
  return JSON.stringify(currentServer.value.env, null, 2);
});

const minimize = () => window.electronAPI.minimize();
const maximize = () => window.electronAPI.maximize();
const close = () => window.electronAPI.close();

const closeInputDialog = (result) => {
  if (showInputDialog.value.callback) {
    showInputDialog.value.callback(showInputDialog.value.isConfirm ? result : inputDialogValue.value);
  }
  showInputDialog.value.show = false;
  showInputDialog.value.isConfirm = false;
  inputDialogValue.value = '';
};

onMounted(async () => {
  await loadConfigList();
  const current = await window.electronAPI.getCurrentConfig();
  if (current.filePath) {
    currentConfigFilePath.value = current.filePath;
  }
  await loadSettings();
});
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg-primary: #f3f3f3;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f9f9f9;
  --bg-hover: #e8e8e8;
  --text-primary: #1a1a1a;
  --text-secondary: #5a5a5a;
  --text-tertiary: #8a8a8a;
  --accent: #0078d4;
  --accent-hover: #006cbd;
  --accent-light: #d5e8ff;
  --border: #e0e0e0;
  --radius: 8px;
  --radius-lg: 12px;
  --shadow: rgba(0, 0, 0, 0.06);
}
body {
  font-family: 'Segoe UI Variable', 'Segoe UI', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
  user-select: none;
}
.app { display: flex; flex-direction: column; height: 100vh; }

.titlebar {
  display: flex; align-items: center; justify-content: space-between;
  height: 32px; background: var(--bg-secondary); border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
}
.titlebar-left { display: flex; align-items: center; padding-left: 12px; gap: 8px; }
.titlebar-icon { width: 16px; height: 16px; background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%); border-radius: 4px; }
.titlebar-title { font-size: 12px; color: var(--text-secondary); }
.titlebar-controls { display: flex; -webkit-app-region: no-drag; }
.titlebar-btn {
  width: 46px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: var(--text-primary); cursor: pointer; transition: background 0.1s;
}
.titlebar-btn:hover { background: var(--bg-hover); }
.titlebar-btn.close:hover { background: #e81123; color: white; }
.titlebar-btn svg { width: 10px; height: 10px; stroke: currentColor; stroke-width: 1; fill: none; }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 56px; background: var(--bg-secondary); border-bottom: 1px solid var(--border);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-icon { width: 24px; height: 24px; background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%); border-radius: 6px; }
.header-title { font-size: 14px; font-weight: 600; }
.header-subtitle { font-size: 12px; color: var(--text-tertiary); margin-left: 8px; }
.header-actions { display: flex; gap: 8px; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 16px; border: none; border-radius: var(--radius);
  font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover { background: var(--accent-hover); }
.btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--bg-hover); }
.btn-danger { background: #d13438; color: white; }
.btn-danger:hover { background: #b52d30; }

.main { display: flex; flex: 1; overflow: hidden; }

.sidebar { width: 240px; background: var(--bg-secondary); border-right: 1px solid var(--border); padding: 8px; }
.sidebar-section { margin-bottom: 16px; }
.sidebar-title { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px 4px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: var(--radius); cursor: pointer; transition: all 0.15s; color: var(--text-primary);
}
.nav-item:hover { background: var(--bg-hover); }
.nav-item.active { background: var(--accent-light); color: var(--accent); }
.nav-item-text { font-size: 13px; }
.nav-item-badge { margin-left: auto; background: var(--bg-tertiary); padding: 2px 8px; border-radius: 10px; font-size: 11px; color: var(--text-tertiary); }

.content { flex: 1; padding: 24px; overflow-y: auto; background: var(--bg-primary); }
.content-header { margin-bottom: 24px; }
.content-title { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
.content-desc { font-size: 13px; color: var(--text-tertiary); }

.card { background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px var(--shadow); }
.card-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

.form-group { margin-bottom: 16px; }
.form-group:last-child { margin-bottom: 0; }
.form-label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.form-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius);
  font-family: 'Cascadia Code', 'Consolas', monospace; font-size: 13px;
  background: var(--bg-secondary); color: var(--text-primary); transition: all 0.15s;
}
.form-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
.form-input::placeholder { color: var(--text-tertiary); }
.form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.form-select {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius);
  font-family: inherit; font-size: 13px; background: var(--bg-secondary); color: var(--text-primary);
  cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235a5a5a' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px;
}
.form-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
.form-textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius);
  font-family: 'Cascadia Code', 'Consolas', monospace; font-size: 13px;
  background: var(--bg-secondary); color: var(--text-primary); resize: vertical; min-height: 80px;
}
.form-textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }

.server-list { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.server-item {
  display: flex; align-items: center; padding: 12px 16px;
  border-bottom: 1px solid var(--border); cursor: pointer; transition: all 0.15s;
}
.server-item:last-child { border-bottom: none; }
.server-item:hover { background: var(--bg-hover); }
.server-item.selected { background: var(--accent-light); }
.server-info { flex: 1; }
.server-name { font-size: 13px; font-weight: 500; }
.server-desc { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.server-status { width: 8px; height: 8px; border-radius: 50%; background: #6ccb5f; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; }
.empty-state-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; color: var(--text-tertiary); }
.empty-state-title { font-size: 16px; font-weight: 500; margin-bottom: 8px; }
.empty-state-desc { font-size: 13px; color: var(--text-tertiary); margin-bottom: 20px; }

.footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: var(--bg-secondary); border-top: 1px solid var(--border); font-size: 12px; color: var(--text-tertiary); }
.footer-status { display: flex; align-items: center; gap: 6px; }
.footer-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #6ccb5f; }
.footer-modified { color: var(--accent); }

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.dialog-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}
.dialog-confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.iconpark-icon { display: inline-block; vertical-align: middle; }
</style>