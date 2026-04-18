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
| vitest | ^4.1.4 | 单元测试框架 |
| @vue/test-utils | ^2.4.6 | Vue 组件测试工具 |
| happy-dom | ^20.9.0 | 浏览器环境模拟 |
| vue-i18n | ^9.14.5 | 国际化支持 |
| less | ^4.6.4 | CSS 预处理器 |

## 项目结构

```
iflow-settings-editor/
├── main.js              # Electron 主进程 (窗口管理、IPC、文件操作、系统托盘)
├── preload.js           # 预加载脚本 (contextBridge API)
├── index.html           # HTML 入口
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
├── vitest.config.js     # Vitest 测试配置
├── src/
│   ├── main.js         # Vue 入口
│   ├── App.vue          # 根组件
│   ├── components/      # 可复用组件
│   │   ├── ApiProfileDialog.vue
│   │   ├── Footer.vue
│   │   ├── InputDialog.vue
│   │   ├── MessageDialog.vue
│   │   ├── ServerPanel.vue
│   │   ├── SideBar.vue
│   │   └── TitleBar.vue
│   ├── views/           # 页面视图组件
│   │   ├── ApiConfig.vue
│   │   ├── GeneralSettings.vue
│   │   └── McpServers.vue
│   ├── styles/          # 全局样式
│   │   └── global.less
│   └── locales/         # 国际化资源
│       ├── index.js
│       ├── en-US.js
│       └── ja-JP.js
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
  },

  // 语言切换通知
  notifyLanguageChanged: () => ipcRenderer.send('language-changed')
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
- 支持多环境配置: 默认配置，开发环境、预发布环境、生产环境
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
npm run test             # 运行所有测试（监听模式）
npm run test:run         # 运行测试一次
npm run test:ui          # 运行测试 UI 界面
npm run test:coverage    # 生成测试覆盖率报告
```

## 功能模块

### 1. 常规设置 (General)
- **语言**: zh-CN / en-US / ja-JP
- **主题**: Xcode / Dark / Solarized Dark
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

## 设计系统

### Windows UI Kit - Fluent Design

本项目采用 Windows 11 Fluent Design 设计规范，实现统一的视觉效果。

#### 主题变量

**Light 模式：**
```css
:root {
  --bg-primary: rgba(243, 243, 243, 0.85);
  --bg-secondary: rgba(255, 255, 255, 0.70);
  --bg-tertiary: #ebebeb;
  --bg-elevated: rgba(255, 255, 255, 0.95);
  --text-primary: #1a1a1a;
  --text-secondary: #5d5d5d;
  --accent: #0078d4;
  --accent-hover: #106ebe;
  --border: #e0e0e0;
  --control-fill: rgba(249, 249, 249, 0.85);
}
```

**Dark 模式：**
```css
.dark {
  --bg-primary: #1f1f1f;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --accent: #60cdff;
  --control-fill: #333333;
}
```

**Solarized Dark 模式：**
```css
.solarized-dark {
  --bg-primary: #002b36;
  --bg-secondary: #073642;
  --text-primary: #839496;
  --accent: #268bd2;
}
```

#### 设计原则
- **Mica -inspired 层次感**: 使用半透明背景和分层深度
- **圆角系统**: 4px / 6px / 8px / 12px 四级圆角
- **阴影层次**: sm / md / lg / xl 四级阴影
- **过渡动画**: 0.1s-0.2s 流畅曲线
- **Segoe UI Variable 字体**: Windows 11 原生字体

## 测试框架 (Vitest)

**测试配置**：
- 使用 Vitest 作为测试运行器
- 使用 `@vue/test-utils` 进行 Vue 组件测试
- 使用 `happy-dom` 作为浏览器环境模拟
- 配置文件：`vitest.config.js`
- 全局变量启用：`globals: true`
- 覆盖率工具：`v8`
- 覆盖率报告格式：text、json、html

**测试文件结构**：
```
src/
├── components/
│   ├── Footer.test.js      # Footer 组件测试
│   ├── SideBar.test.js      # 侧边栏测试
│   └── TitleBar.test.js     # 标题栏测试
└── views/
    ├── ApiConfig.test.js        # API 配置测试
    ├── GeneralSettings.test.js   # 常规设置测试
    └── McpServers.test.js       # MCP 服务器测试
```

**测试命令**：
```bash
npm run test            # 运行所有测试（监听模式）
npm run test:run       # 运行测试一次
npm run test:ui        # 运行测试 UI 界面 (http://localhost:5174/__vitest__/)
npm run test:coverage  # 生成测试覆盖率报告
```

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
10. **样式系统**: 使用 Windows UI Kit 设计系统，所有变量在 `global.less` 中定义

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

## 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| 1.6.0 | 2026-04-18 | 架构：重构样式系统，采用 Windows 11 Fluent Design 规范 |
| 1.5.1 | 2026-04-17 | 新增系统托盘功能，托盘快速切换 API 配置 |
| 1.5.0 | 2026-04-16 | 新增自定义消息对话框，API 配置重命名 |
| 1.4.0 | 2026-04-14 | 新增多环境配置文件管理 |
| 1.0.0 | 2026-04-14 | 项目初始化 |
