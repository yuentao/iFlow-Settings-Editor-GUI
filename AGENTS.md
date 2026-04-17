# iFlow Settings Editor - Agent 文档

## 项目概述

iFlow 设置编辑器是一个基于 Electron + Vue 3 的桌面应用程序，用于编辑 `C:\Users\<USER>\.iflow\settings.json` 配置文件。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | ^28.0.0 | 桌面应用框架 |
| Vue | ^3.4.0 | 前端框架 (组合式 API) |
| Vite | ^8.0.8 | 构建工具 |
| @icon-park/vue-next | ^1.4.2 | 图标库 |
| @vitejs/plugin-vue | ^6.0.6 | Vue 插件 |
| concurrently | ^8.2.2 | 并发执行工具 |
| electron-builder | ^24.13.3 | 应用打包工具 |

## 项目结构

```
iflow-settings-editor/
├── main.js              # Electron 主进程 (窗口管理、IPC、文件操作、系统托盘)
├── preload.js           # 预加载脚本 (contextBridge API)
├── index.html           # HTML 入口
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
├── src/
│   ├── main.js         # Vue 入口
│   └── App.vue         # 主组件 (所有业务逻辑、UI 组件)
├── build/               # 构建资源 (图标等)
├── dist/                # Vite 构建输出
├── release/             # 打包输出目录
└── screenshots/         # 截图资源
```

## 核心架构

### 进程模型
- **Main Process (main.js)**: Electron 主进程，处理窗口管理、IPC 通信、文件系统操作、系统托盘
- **Preload (preload.js)**: 通过 `contextBridge.exposeInMainWorld` 暴露安全 API
- **Renderer (Vue)**: 渲染进程，只通过 preload 暴露的 API 与主进程通信

### IPC 通信
```javascript
// preload.js 暴露的 API
window.electronAPI = {
  // 基本设置操作
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),

  // 窗口控制
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // API 配置管理（单文件内多配置）
  listApiProfiles: () => ipcRenderer.invoke('list-api-profiles'),
  switchApiProfile: (profileName) => ipcRenderer.invoke('switch-api-profile', profileName),
  createApiProfile: (name) => ipcRenderer.invoke('create-api-profile', name),
  deleteApiProfile: (name) => ipcRenderer.invoke('delete-api-profile', name),
  renameApiProfile: (oldName, newName) => ipcRenderer.invoke('rename-api-profile', oldName, newName),
  duplicateApiProfile: (sourceName, newName) => ipcRenderer.invoke('duplicate-api-profile', sourceName, newName),

  // 托盘事件监听
  onApiProfileSwitched: (callback) => {
    ipcRenderer.on('api-profile-switched', (event, profileName) => callback(profileName))
  }
}
```

### 窗口配置
- 窗口尺寸: 1100x750，最小尺寸: 900x600
- 无边框窗口 (frame: false)，自定义标题栏
- 开发模式加载 `http://localhost:5173`，生产模式加载 `dist/index.html`
- **关闭窗口时隐藏到系统托盘**，双击托盘图标可重新显示

### 系统托盘
- 托盘图标显示应用状态
- 右键菜单支持：
  - 显示主窗口
  - 切换 API 配置（显示所有配置列表，当前配置带勾选标记）
  - 退出应用
- 双击托盘图标显示主窗口

### API 配置切换
- 支持多环境配置: 默认配置、开发环境、预发布环境、生产环境
- 配置文件管理: 支持创建、编辑、复制、删除、重命名
- 单独保存每个环境的 API 配置到 `apiProfiles` 对象
- 切换配置时直接应用新配置，无需确认
- 支持从系统托盘快速切换配置

## 可用命令

```bash
npm install              # 安装依赖
npm run dev              # 启动 Vite 开发服务器
npm run build            # 构建 Vue 应用到 dist 目录
npm start                # 运行 Electron (需先build)
npm run electron:dev     # 同时运行 Vite + Electron (开发模式)
npm run electron:start   # 构建 + 运行 Electron (生产模式)
npm run pack             # 打包应用（不生成安装包）
npm run build:win        # 构建 Windows 安装包
npm run build:win64      # 构建 Windows x64 安装包
npm run build:win32      # 构建 Windows x86 安装包
npm run build:win-portable  # 构建可移植版本
npm run build:win-installer  # 构建 NSIS 安装包
npm run dist             # 完整构建和打包
```

## 功能模块

### 1. 常规设置 (General)
- **语言**: zh-CN / en-US / ja-JP
- **主题**: Xcode / Dark / Light / Solarized Dark
- **启动动画**: 已显示 / 未显示
- **检查点保存**: 启用 / 禁用

### 2. API 配置 (API)
- **配置列表**: 显示所有可用的 API 配置文件，带彩色图标和状态标记
- **配置切换**: 点击配置卡片直接切换，无需确认
- **创建配置**: 新建 API 配置文件（支持设置认证方式、API Key、Base URL 等）
- **编辑配置**: 修改现有配置的认证方式、API Key、Base URL 等
- **复制配置**: 基于现有配置创建新配置
- **删除配置**: 删除非默认配置
- **认证方式**: iFlow / API Key / OpenAI 兼容
- **API Key**: 密码输入框
- **Base URL**: API 端点
- **模型名称**: AI 模型标识
- **搜索 API Key**: 搜索服务认证
- **CNA**: CNA 标识

### 3. MCP 服务器管理 (MCP)
- 服务器列表展示（带描述信息）
- 添加/编辑/删除服务器
- 侧边面板编辑界面
- 服务器配置: 名称、描述、命令、工作目录、参数(每行一个)、环境变量(JSON)

## 关键实现细节

### 设置文件路径
```javascript
const SETTINGS_FILE = path.join(app.getPath('home'), '.iflow', 'settings.json');
```

### 保存时自动备份
```javascript
if (fs.existsSync(SETTINGS_FILE)) {
  const backupPath = SETTINGS_FILE + '.bak';
  fs.copyFileSync(SETTINGS_FILE, backupPath);
}
```

### 安全配置
- `contextIsolation: true` - 隔离上下文
- `nodeIntegration: false` - 禁用 Node.js
- `webSecurity: false` - 仅开发环境解决 CSP 问题

### Vue 组件状态管理
- `settings` - 当前设置 (ref)
- `originalSettings` - 原始设置 (用于检测修改)
- `modified` - 是否已修改 (computed/diff)
- `currentSection` - 当前显示的板块
- `currentServerName` - 当前选中的 MCP 服务器
- `currentApiProfile` - 当前使用的 API 配置名称
- `apiProfiles` - 可用的 API 配置列表
- `isLoading` - 加载状态标志

### API 配置字段
```javascript
const API_FIELDS = ['selectedAuthType', 'apiKey', 'baseUrl', 'modelName', 'searchApiKey', 'cna'];
```

### 数据初始化
在 `loadSettings` 函数中确保所有字段都有默认值：
- `language`: 'zh-CN'
- `theme`: 'Xcode'
- `bootAnimationShown`: true
- `checkpointing`: { enabled: true }
- `selectedAuthType`: 'openai-compatible'
- `apiKey`: ''
- `baseUrl`: ''
- `modelName`: ''
- `searchApiKey`: ''
- `cna`: ''
- `apiProfiles`: { default: {} }
- `currentApiProfile`: 'default'
- `mcpServers`: {}

## 开发注意事项

1. **修改检测**: 通过 `watch(settings, () => { modified.value = true }, { deep: true })` 深度监听
2. **服务器编辑**: 使用侧边面板 (Side Panel) 收集表单数据
3. **MCP 参数**: 每行一个参数，通过换行分割
4. **环境变量**: 支持 JSON 格式输入
5. **窗口控制**: 通过 IPC 发送指令，主进程处理实际窗口操作
6. **API 配置切换**: 多个环境配置存储在 `settings.apiProfiles` 对象中
7. **序列化问题**: IPC 通信使用 `JSON.parse(JSON.stringify())` 避免 Vue 响应式代理问题
8. **默认值处理**: 加载配置时检查 `undefined` 并应用默认值，防止界面显示异常
9. **托盘切换事件**: 监听 `onApiProfileSwitched` 处理托盘发起的配置切换

## 图标使用

使用 `@icon-park/vue-next` 图标库:
```javascript
import { Save, Config, Key, Server, Globe, Setting, Add, Edit, Delete, Exchange, Copy } from '@icon-park/vue-next';
```

## 打包配置

### Windows 平台
- **NSIS 安装包**: 支持 x64 架构
- **可移植版本**: 无需安装的独立可执行文件
- **安装器特性**:
  - 允许修改安装目录
  - 允许提升权限
  - 创建桌面和开始菜单快捷方式
  - 支持中文和英文界面 (zh_CN, en_US)
  - 卸载时保留用户数据

### 输出目录
- `release/` - 所有打包输出的根目录
- 安装包命名: `iFlow Settings Editor-${version}-${arch}-setup.${ext}`
- 可移植版本命名: `iFlow Settings Editor-${version}-portable.${ext}`

## UI 组件

### 对话框类型
- **输入对话框**: 用于重命名、复制等需要文本输入的场景
- **确认对话框**: 用于删除等需要确认的操作
- **消息对话框**: 显示 info/success/warning/error 四种类型，带图标

### 侧边面板
- MCP 服务器编辑使用侧边面板 (从右侧滑入)
- API 配置编辑使用模态对话框

### 主题变量
```css
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --border: #e2e8f0;
  --success: #10b981;
  --danger: #ef4444;
}
```
