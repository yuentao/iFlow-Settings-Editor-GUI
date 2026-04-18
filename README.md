# iFlow Settings Editor

一个基于 Electron + Vue 3 的桌面应用程序，用于编辑 `C:\Users\<USER>\.iflow\settings.json` 配置文件。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | ^28.0.0 | 桌面应用框架 |
| Vue | ^3.4.0 | 前端框架 (组合式 API) |
| Vite | ^8.0.8 | 构建工具 |
| @icon-park/vue-next | ^1.4.2 | 图标库 |
| concurrently | ^8.2.2 | 并发执行工具 |
| electron-builder | ^24.13.3 | 应用打包工具 |
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
├── vitest.config.js      # Vitest 测试配置
├── src/
│   ├── main.js         # Vue 入口
│   ├── components/     # 可复用组件
│   │   ├── ApiProfileDialog.vue
│   │   ├── Footer.vue
│   │   ├── InputDialog.vue
│   │   ├── MessageDialog.vue
│   │   ├── ServerPanel.vue
│   │   ├── SideBar.vue
│   │   └── TitleBar.vue
│   ├── views/         # 页面视图组件
│   │   ├── ApiConfig.vue
│   │   ├── GeneralSettings.vue
│   │   └── McpServers.vue
│   └── App.vue         # 主组件 (所有业务逻辑、UI 组件)
├── build/               # 构建资源 (图标等)
├── dist/                # Vite 构建输出
├── release/             # 打包输出目录
└── screenshots/         # 截图资源
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev              # 启动 Vite 开发服务器
npm run electron:dev     # 同时运行 Electron + Vite
```

### 构建与运行

```bash
npm run build            # 构建 Vue 应用到 dist 目录
npm start                # 运行 Electron 应用
npm run electron:start   # 构建 + 运行 Electron
```

### 打包应用

```bash
npm run pack             # 打包应用（不生成安装包）
npm run build:win        # 构建 Windows 安装包 (NSIS)
npm run build:win64      # 构建 Windows x64 安装包
npm run build:win32      # 构建 Windows x86 安装包
npm run build:win-portable  # 构建可移植版本
npm run build:win-installer  # 构建 NSIS 安装包
npm run dist             # 完整构建和打包
```

## 功能模块

### 1. 常规设置 (General)

![主界面](screenshots/main.png)

配置应用程序的常规选项：

- **语言**: zh-CN / en-US / ja-JP
- **主题**: Xcode / Dark / Solarized Dark
- **启动动画**: 已显示 / 未显示
- **检查点保存**: 启用 / 禁用

### 2. API 配置 (API)

管理多个环境的 API 配置：

- **配置列表**: 显示所有可用的 API 配置文件，带彩色图标和状态标记
- **配置切换**: 点击配置卡片直接切换
- **创建配置**: 新建 API 配置文件
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

管理 Model Context Protocol 服务器配置：

- **服务器列表**: 显示所有已配置的服务器，带描述信息
- **添加服务器**: 创建新的 MCP 服务器配置
- **编辑服务器**: 通过侧边面板修改现有服务器配置
- **删除服务器**: 移除服务器配置
- **服务器配置项**:
  - 名称
  - 描述
  - 命令
  - 工作目录
  - 参数 (每行一个)
  - 环境变量 (JSON 格式)

## 核心架构

### 进程模型
- **Main Process (main.js)**: Electron 主进程，处理窗口管理、IPC 通信、文件系统操作、系统托盘
- **Preload (preload.js)**: 通过 `contextBridge.exposeInMainWorld` 暴露安全 API
- **Renderer (Vue)**: 渲染进程，只通过 preload 暴露的 API 与主进程通信

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

### 安全配置
- `contextIsolation: true` - 隔离上下文
- `nodeIntegration: false` - 禁用 Node.js
- `webSecurity: false` - 仅开发环境解决 CSP 问题

## 设计系统

本项目采用 **Windows 11 Fluent Design** 设计规范，实现统一的视觉效果。

### 主题支持
- **Xcode**: macOS 风格浅色主题
- **Dark**: Windows 11 风格深色主题
- **Solarized Dark**: Solarized 配色深色主题

### 设计特点
- **Mica-inspired 层次感**: 使用半透明背景和分层深度
- **圆角系统**: 4px / 6px / 8px / 12px 四级圆角
- **阴影层次**: sm / md / lg / xl 四级阴影
- **过渡动画**: 0.1s-0.2s 流畅曲线
- **Segoe UI Variable 字体**: Windows 11 原生字体

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

## 注意事项

- `webSecurity: false` 仅用于开发环境解决 CSP 问题
- 保存设置时会自动创建备份 (`settings.json.bak`)
- MCP 服务器参数每行一个，环境变量支持 JSON 格式
- API 配置切换时会直接应用新配置，未保存的更改会被替换
- 关闭窗口时应用会隐藏到系统托盘，不会退出应用

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

## 许可证

MIT License

Copyright © 2026 上海潘哆呐科技有限公司
