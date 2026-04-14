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

## 项目结构

```
iflow-settings-editor/
├── main.js              # Electron 主进程 (窗口管理、IPC、文件操作)
├── preload.js           # 预加载脚本 (contextBridge API)
├── index.html           # HTML 入口
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
├── src/
│   ├── main.js         # Vue 入口
│   └── App.vue         # 主组件 (所有业务逻辑)
```

## 核心架构

### 进程模型
- **Main Process (main.js)**: Electron 主进程，处理窗口管理、IPC 通信、文件系统操作
- **Preload (preload.js)**: 通过 `contextBridge.exposeInMainWorld` 暴露安全 API
- **Renderer (Vue)**: 渲染进程，只通过 preload 暴露的 API 与主进程通信

### IPC 通信
```javascript
// preload.js 暴露的 API
window.electronAPI = {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
}
```

### 窗口配置
- 窗口尺寸: 1100x750，最小尺寸: 900x600
- 无边框窗口 (frame: false)，自定义标题栏
- 开发模式加载 `http://localhost:5173`，生产模式加载 `dist/index.html`

### API 配置切换
- 支持多环境配置: 默认配置、开发环境、预发布环境、生产环境
- 切换前检查未保存的更改
- 单独保存每个环境的 API 配置到 `apiProfiles` 对象

## 可用命令

```bash
npm install              # 安装依赖
npm run dev              # 启动 Vite 开发服务器
npm run build            # 构建 Vue 应用到 dist 目录
npm start                # 运行 Electron (需先build)
npm run electron:dev     # 同时运行 Vite + Electron (开发模式)
npm run electron:start   # 构建 + 运行 Electron (生产模式)
```

## 功能模块

### 1. 常规设置 (General)
- **语言**: zh-CN / en-US / ja-JP
- **主题**: Xcode / Dark / Light / Solarized Dark
- **启动动画**: 已显示 / 未显示
- **检查点保存**: 启用 / 禁用

### 2. API 配置 (API)
- **配置切换**: 支持多环境 (默认/开发/预发布/生产)
- **认证方式**: iFlow / API Key
- **API Key**: 密码输入框
- **Base URL**: API 端点
- **模型名称**: AI 模型标识
- **搜索 API Key**: 搜索服务认证
- **CNA**: CNA 标识

### 3. MCP 服务器管理 (MCP)
- 服务器列表展示
- 添加/编辑/删除服务器
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

## 开发注意事项

1. **修改检测**: 通过 `watch(settings, () => { modified.value = true }, { deep: true })` 深度监听
2. **服务器编辑**: 使用 DOM 操作收集表单数据 (`collectServerData`)
3. **MCP 参数**: 每行一个参数，通过换行分割
4. **环境变量**: 支持 JSON 格式输入
5. **窗口控制**: 通过 IPC 发送指令，主进程处理实际窗口操作
6. **API 配置切换**: 多个环境配置存储在 `settings.apiProfiles` 对象中
7. **序列化问题**: IPC 通信使用 `JSON.parse(JSON.stringify())` 避免 Vue 响应式代理问题

## 图标使用

使用 `@icon-park/vue-next` 图标库:
```javascript
import { Refresh, Save, Config, Key, Server, Globe, Setting, Robot, Search, Add, Edit, Delete } from '@icon-park/vue-next';
```
