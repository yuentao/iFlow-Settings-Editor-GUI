# iFlow Settings Editor - AI Context

## 项目概述

**iFlow 设置编辑器** 是一个用于编辑 iFlow CLI 配置文件 (`~/.iflow/settings.json`) 的桌面应用程序，采用 **Electron + Vue 3** 技术栈构建，支持多语言（中文/英文/日文）、云同步（WebDAV）和自动更新功能。

**当前版本**: v1.14.8 (2026-05-02)

### 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Electron | 28.0.0 |
| 前端 | Vue 3 | 3.4.0 |
| 构建工具 | Vite | 8.0.8 |
| 状态管理 | Pinia | 3.0.4 |
| CSS 预处理器 | Less | 4.6.4 |
| 国际化 | vue-i18n | 9.14.5 |
| 测试框架 | Vitest + happy-dom | 4.1.4 |
| 测试工具 | @vue/test-utils | 2.4.6 |
| 打包工具 | electron-builder | 24.13.3 |
| 图标库 | @icon-park/vue-next | 1.4.2 |
| 工具库 | @vueuse/core | 14.2.1 |
| TOML 支持 | @iarna/toml | 2.2.5 |
| XML 解析 | fast-xml-parser | 5.7.2 |
| Markdown 解析 | marked | 18.0.2 |
| ZIP 处理 | adm-zip | 0.5.17 |
| 日志 | electron-log | 5.4.3 |
| 自动更新 | electron-updater | 6.8.3 |

### 核心架构

项目采用模块化架构，主进程与渲染进程通过 IPC 通信，代码结构清晰、职责分离。

```
┌───────────────────────────────────────────────────────────┐
│                   Electron 主进程 (Main)                  │
│  src/main/                                                │
│    ├── index.js         - 应用入口，注册 IPC 处理器        │
│    ├── window.js        - 窗口生命周期管理                │
│    ├── tray.js          - 系统托盘菜单                    │
│    ├── constants.js     - 常量定义（API 字段等）          │
│    │                                                    │
│    ├── ipc/              - IPC 通信处理器（按模块拆分）    │
│    │   ├── index.js     - IPC 处理器聚合与注册           │
│    │   ├── settings.js  - 设置读写（load/save）          │
│    │   ├── apiProfiles.js - API 配置 CRUD + fetchModels │
│    │   ├── skills.js    - 技能导入/导出/删除             │
│    │   ├── commands.js  - 命令 CRUD（无执行功能）        │
│    │   ├── cloud.js     - 云同步 IPC 桥接                │
│    │   ├── dialogs.js   - 对话框控制（消息/确认/输入）   │
│    │   └── updates.js   - 自动更新检查/下载/安装         │
│    │                                                    │
│    ├── services/        - 业务逻辑层                      │
│    │   ├── configService.js   - 配置文件读写封装         │
│    │   ├── autoLaunchService.js - 开机自启管理（强制静默）│
│    │   ├── SyncService.js     - 云同步核心逻辑（增量合并）│
│    │   └── cloud/             - 云存储适配器层           │
│    │       └── WebDAVProvider.js - WebDAV 协议实现      │
│    │                                                    │
│    ├── crypto/          - 加密模块                       │
│    │   └── CryptoManager.js - 基于 safeStorage 的加密   │
│    │                                                    │
│    └── utils/           - 工具函数                       │
│        ├── errors.js    - 错误类型定义                   │
│        ├── logger.js    - 日志记录                       │
│        ├── translations.js - 国际化加载                 │
│        ├── validator.js - 表单验证                       │
│        └── mcpParser.js - MCP 配置解析（JSON/CMD/URL）  │
│                                                          │
└───────────────────────↕ IPC (preload.js)─────────────────┘
┌───────────────────────────────────────────────────────────┐
│                 Vue 3 渲染进程 (Renderer)                 │
│  src/                                                    │
│    ├── App.vue          - 根组件（条件渲染视图）         │
│    ├── main.js          - Vue 应用入口                    │
│    │                                                    │
│    ├── components/      - 可复用 UI 组件                 │
│    │   ├── TitleBar.vue        - 自定义标题栏（窗口控制）│
│    │   ├── SideBar.vue         - 侧边导航栏              │
│    │   ├── InputDialog.vue     - 文本输入对话框          │
│    │   ├── MessageDialog.vue   - 消息提示对话框          │
│    │   ├── ConfirmDialog.vue   - 确认对话框              │
│    │   ├── ApiProfileDialog.vue - API 配置编辑弹窗       │
│    │   ├── ServerPanel.vue     - MCP 服务器编辑面板      │
│    │   ├── CommandEditorDialog.vue - 命令编辑对话框      │
│    │   ├── QuickAddDialog.vue  - 快速添加 MCP 服务器     │
│    │   ├── EmptyState.vue      - 空状态占位符            │
│    │   ├── SkeletonLoader.vue  - 骨架屏加载             │
│    │   ├── UpdateNotification.vue - 更新可用通知         │
│    │   └── UpdateProgress.vue  - 下载进度显示            │
│    │                                                    │
│    ├── views/           - 页面视图（按导航切换）          │
│    │   ├── Dashboard.vue       - 仪表盘（概览+快捷操作） │
│    │   ├── GeneralSettings.vue - 基础设置（偏好/其他/关于）│
│    │   ├── ApiConfig.vue       - API 配置管理（含实时连通性监控）│
│    │   ├── McpServers.vue      - MCP 服务器管理（快速添加+高级配置）│
│    │   ├── SkillsView.vue      - 技能管理（本地/在线导入导出）│
│    │   └── CommandsView.vue    - 命令管理（CRUD+分类筛选）│
│    │                                                    │
│    ├── stores/          - Pinia 状态管理（TypeScript）    │
│    │   ├── settings.ts         - 设置状态（持久化到 JSON）│
│    │   ├── apiProfiles.ts      - API 配置状态             │
│    │   ├── skills.ts           - 技能状态                 │
│    │   ├── commands.ts         - 命令状态                 │
│    │   ├── cloudSync.ts        - 云同步状态（WebDAV）     │
│    │   ├── ui.ts               - UI 状态（导航/弹窗）     │
│    │   └── index.js            - Store 聚合入口           │
│    │                                                    │
│    ├── locales/         - 国际化语言包（i18n）            │
│    │   ├── index.js    - 中文（简体，默认）              │
│    │   ├── en-US.js    - 英文                            │
│    │   └── ja-JP.js    - 日文                            │
│    │                                                    │
│    ├── styles/          - 全局样式                        │
│    │   └── global.less - Windows 11 Fluent Design 设计系统│
│    │                                                    │
│    └── shared/          - 主进程与渲染进程共享类型定义    │
│        └── types.ts    - TypeScript 类型声明（Settings、API、Commands 等）│
│                                                          │
└───────────────────────────────────────────────────────────┘
```

### 配置文件

- **主配置**: `~/.iflow/settings.json` (UTF-8 JSON)
- **自动备份**: 修改时生成 `.bak` 备份文件
- **技能目录**: `~/.iflow/skills/`
- **云同步配置**: 存储在 `settings.json` 的 `cloudSync` 字段下

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式 (Vite Dev Server)
npm run dev

# Electron 开发模式 (并行启动 Vite + Electron)
npm run electron:dev

# Electron 生产模式 (先构建再启动)
npm run electron:start

# 构建生产版本 (Vite 构建)
npm run build

# 打包 Windows 版本 (x64 NSIS 安装器 + 便携版)
npm run build:win
npm run build:win64    # 仅 x64
npm run build:win32    # 仅 ia32
npm run build:win-portable  # 仅便携版
npm run build:win-installer # 仅 NSIS 安装器

# 打包 macOS 版本
npm run build:mac
npm run build:mac64    # 仅 x64
npm run build:mac-arm  # 仅 ARM64
npm run build:mac-dmg  # DMG 镜像
npm run build:mac-zip  # ZIP 压缩包

# 打包全部平台 (根据配置)
npm run dist

# 运行测试
npm run test          # 监听模式
npm run test:ui       # UI 模式
npm run test:coverage # 覆盖率报告
npm run test:run      # 单次运行

# TypeScript 类型检查
npm run type-check
```

## 设计规范

### Windows 11 Fluent Design

项目采用 Windows 11 Fluent Design 设计系统，核心规范：

| 属性 | 规范 |
|------|------|
| 字体 | Segoe UI Variable, Segoe UI, system-ui |
| 等宽字体 | Cascadia Code, Consolas |
| 圆角 | 4px (sm) / 6px / 8px (lg) / 12px (xl) |
| 阴影 | 四级层次 (sm/lg/xl) |
| 过渡动画 | 0.1-0.2s ease, 0.15s cubic-bezier(0.4, 0, 0.2, 1) |

### 主题系统

支持三种主题：`Light` (浅色) / `Dark` (深色) / `System` (跟随系统)

CSS 变量定义在 `src/styles/global.less`，包括：
- `--bg-primary/secondary/elevated` - 背景层级
- `--text-primary/secondary/tertiary` - 文本层级
- `--accent` - 主题色 (Windows Blue #0067C0)
- `--success/warning/danger/info` - 状态色
- `--border-color` - 边框颜色
- `--shadow-sm/medium/large` - 阴影层次

### 亚克力效果

支持可调节透明度的 Mica-inspired 亚克力效果：
- 背景透明度随 `acrylicIntensity` (0-100) 变化
- 深色/浅色主题有独立的透明度计算逻辑
- 通过 `--acrylic-bg` CSS 变量动态应用

## 项目结构

```
src/
├── main.js              # Vue 应用入口 (渲染进程)
├── App.vue              # 根组件
├── components/          # 可复用组件
│   ├── TitleBar.vue     # 标题栏 (窗口控制按钮)
│   ├── TitleBar.test.js
│   ├── SideBar.vue      # 侧边导航栏
│   ├── SideBar.test.js
│   ├── InputDialog.vue  # 输入对话框
│   ├── InputDialog.test.js
│   ├── MessageDialog.vue    # 消息对话框
│   ├── MessageDialog.test.js
│   ├── ConfirmDialog.vue    # 确认对话框
│   ├── ConfirmDialog.test.js
│   ├── ApiProfileDialog.vue # API 配置弹窗
│   ├── ApiProfileDialog.test.js
│   ├── ServerPanel.vue  # 服务器编辑面板
│   ├── ServerPanel.test.js
│   ├── SkeletonLoader.vue   # 骨架屏
│   ├── SkeletonLoader.test.js
│   ├── UpdateNotification.vue # 更新通知
│   ├── UpdateProgress.vue   # 下载进度
│   └── CommandEditorDialog.vue # 命令编辑器 (新增)
├── views/               # 页面视图
│   ├── Dashboard.vue    # 仪表盘
│   ├── Dashboard.test.js
│   ├── GeneralSettings.vue  # 基础设置
│   ├── GeneralSettings.test.js
│   ├── ApiConfig.vue    # API 配置管理
│   ├── ApiConfig.test.js
│   ├── McpServers.vue   # MCP 服务器管理
│   ├── McpServers.test.js
│   ├── SkillsView.vue   # 技能管理
│   ├── SkillsView.test.js
│   └── CommandsView.vue # 命令管理 (新增)
│   └── CommandsView.test.js (新增)
├── stores/              # Pinia 状态管理
│   ├── settings.ts      # 设置状态
│   ├── settings.test.ts
│   ├── apiProfiles.ts   # API 配置状态
│   ├── apiProfiles.test.ts
│   ├── skills.ts        # 技能状态
│   ├── skills.test.ts
│   ├── commands.ts      # 命令状态 (新增)
│   ├── commands.test.ts (新增)
│   ├── cloudSync.ts     # 云同步状态 (新增)
│   ├── cloudSync.test.ts (新增)
│   ├── ui.ts            # UI 状态
│   └── index.js         # 入口
├── main/                # Electron 主进程 (新结构)
│   ├── index.js         # 主进程入口
│   ├── constants.js     # 常量定义
│   ├── window.js        # 窗口管理
│   ├── tray.js          # 系统托盘
│   ├── crypto/          # 加密模块
│   │   ├── CryptoManager.js
│   │   └── CryptoManager.test.js
│   ├── ipc/             # IPC 处理器
│   │   ├── index.js     # 注册中心
│   │   ├── settings.js  # 设置操作
│   │   ├── apiProfiles.js # API 配置
│   │   ├── skills.js    # 技能管理
│   │   ├── commands.js  # 命令管理 (新增)
│   │   ├── cloud.js     # 云同步 (新增)
│   │   ├── dialogs.js   # 对话框
│   │   └── updates.js   # 自动更新
│   ├── services/        # 业务服务
│   │   ├── configService.js    # 配置读写
│   │   ├── configService.test.js
│   │   ├── autoLaunchService.js # 自启动
│   │   ├── SyncService.js      # 云同步核心 (新增)
│   │   ├── SyncService.test.js (新增)
│   │   └── cloud/                # 云存储适配器
│   │       ├── WebDAVProvider.js  # WebDAV (新增)
│   │       └── WebDAVProvider.test.js (新增)
│   └── utils/           # 工具函数
│       ├── errors.js    # 错误处理
│       ├── logger.js    # 日志
│       ├── translations.js # 翻译
│       └── validator.js # 验证
├── shared/              # 共享类型定义
│   ├── types.ts         # TypeScript 类型
│   └── errors.js        # 错误常量
├── locales/             # 国际化
│   ├── index.js (zh-CN) # 中文 (默认)
│   ├── en-US.js        # 英文
│   └── ja-JP.js        # 日文
└── styles/
    └── global.less      # 全局样式 (Fluent Design)
```

## 关键模块

### IPC 通信

**preload.js** 通过 `contextBridge` 暴露的安全 API：

```javascript
// ── 基础设置 ─────────────────────────────────────────────
window.electronAPI.loadSettings()                    // 加载 settings.json
window.electronAPI.saveSettings(data)                // 保存设置（自动备份）
window.electronAPI.showMessage(options)              // 显示消息对话框
window.electronAPI.showConfirmDialog(options)        // 显示确认对话框
window.electronAPI.showOpenDialog(options)           // 打开文件选择器

// ── 窗口控制 ─────────────────────────────────────────────
window.electronAPI.isMaximized()                     // 是否最大化
window.electronAPI.minimize()                        // 最小化
window.electronAPI.maximize()                        // 最大化/还原
window.electronAPI.close()                           // 关闭（隐藏到托盘）

// ── 开机自启动 ───────────────────────────────────────────
window.electronAPI.getAutoLaunch()                   // 获取自启动状态
window.electronAPI.setAutoLaunch(enabled)            // 设置自启动（始终静默）

// ── 自动更新 ─────────────────────────────────────────────
window.electronAPI.checkForUpdates()                 // 手动检查更新
window.electronAPI.downloadUpdate()                  // 下载更新（前台）
window.electronAPI.downloadUpdateBackground()        // 后台下载更新
window.electronAPI.cancelDownload()                  // 取消下载
window.electronAPI.installUpdate()                   // 安装待处理更新
window.electronAPI.getUpdateStatus()                 // 获取更新状态
window.electronAPI.getAppVersion()                   // 获取当前版本
window.electronAPI.getPendingUpdate()                // 获取待安装更新信息
window.electronAPI.clearPendingUpdate()              // 清除待安装更新
window.electronAPI.onUpdateStatusChanged(cb)         // 监听状态变化
window.electronAPI.onUpdateAvailable(cb)             // 监听发现新版本
window.electronAPI.onUpdateDownloadProgress(cb)      // 监听下载进度
window.electronAPI.onUpdateDownloaded(cb)            // 监听下载完成
window.electronAPI.onUpdateBackgroundComplete(cb)    // 监听后台下载完成

// ── API 配置管理 ─────────────────────────────────────────
window.electronAPI.listApiProfiles()                 // 列出所有配置
window.electronAPI.switchApiProfile(name)            // 切换当前配置
window.electronAPI.createApiProfile(name)            // 新建配置
window.electronAPI.deleteApiProfile(name)            // 删除配置
window.electronAPI.renameApiProfile(oldName, newName)// 重命名配置
window.electronAPI.duplicateApiProfile(source, name) // 复制配置
window.electronAPI.fetchModels(baseUrl, apiKey)      // 从 API 获取模型列表
window.electronAPI.pingApiProfile(baseUrl)           // 检测连通性（延迟）
window.electronAPI.onApiProfileSwitched(cb)          // 监听配置切换

// ── MCP 服务器管理 ───────────────────────────────────────
window.electronAPI.listMcpServers()                  // 列出所有服务器
window.electronAPI.createMcpServer(data)             // 创建服务器
window.electronAPI.updateMcpServer(name, data)       // 更新服务器
window.electronAPI.deleteMcpServer(name)             // 删除服务器

// ── 技能管理 ─────────────────────────────────────────────
window.electronAPI.listSkills()                      // 列出已安装技能
window.electronAPI.importSkillLocal()                // 从本地 ZIP 导入
window.electronAPI.importSkillOnline(url, name)      // 从 URL 在线导入
window.electronAPI.exportSkill(name, folderName)     // 导出技能到目录
window.electronAPI.deleteSkill(name)                 // 删除技能

// ── 命令管理 ─────────────────────────────────────────────
// 注意：命令系统仅支持 CRUD 操作，不提供"执行"功能
window.electronAPI.listCommands()                    // 列出所有命令
window.electronAPI.readCommand(name)                 // 读取命令详情
window.electronAPI.createCommand(name, data)         // 创建命令
window.electronAPI.updateCommand(name, data)         // 更新命令
window.electronAPI.deleteCommand(name)               // 删除命令
window.electronAPI.exportCommand(name)               // 导出命令为 JSON
window.electronAPI.importCommand()                   // 从本地 JSON 导入

// ── 云同步（WebDAV） ─────────────────────────────────────
window.electronAPI.cloudSyncGetStatus()              // 获取同步状态
window.electronAPI.cloudSyncSetAutoSync(enabled)     // 设置自动同步
window.electronAPI.cloudSyncConfigureProvider(provider, config) // 配置云服务
window.electronAPI.cloudSyncTestConnection()         // 测试连接
window.electronAPI.cloudSyncRevokeAuth()             // 断开认证
window.electronAPI.cloudSyncSetPassword(password)    // 设置同步密码
window.electronAPI.cloudSyncVerifyPassword(password) // 验证密码
window.electronAPI.cloudSyncChangePassword(old, new) // 修改密码
window.electronAPI.cloudSyncHasPassword()            // 是否已设置密码
window.electronAPI.cloudSyncHasCachedPassword()      // 是否记住密码
window.electronAPI.cloudSyncGetRememberPassword()    // 获取记住密码状态
window.electronAPI.cloudSyncSetRememberPassword(remember) // 设置记住密码
window.electronAPI.cloudSyncSyncNow(password)        // 手动同步（双向）
window.electronAPI.cloudSyncPull(password)           // 仅从云端拉取
window.electronAPI.cloudSyncPush(password)           // 仅推送到云端
window.electronAPI.cloudSyncClearCloud()             // 清空云端数据
window.electronAPI.cloudSyncGetDevices()             // 获取已同步设备列表
window.electronAPI.cloudSyncSetDeviceName(name)      // 设置本设备名称
window.electronAPI.cloudSyncRemoveDevice(deviceId)   // 移除设备云端数据

// ── 云同步事件监听 ───────────────────────────────────────
window.electronAPI.onCloudSyncStatusChanged(cb)      // 状态变化（同步中/就绪/错误）
window.electronAPI.onCloudSyncProgress(cb)           // 同步进度（0-100）
window.electronAPI.onCloudSyncConflict(cb)           // 冲突检测（字段级）

// ── 其他 ─────────────────────────────────────────────────
window.electronAPI.notifyLanguageChanged()           // 通知语言切换
```

### API 配置管理

配置文件内使用 `apiProfiles` 对象存储多个配置：

```json
{
  "currentApiProfile": "default",
  "apiProfiles": {
    "default": {
      "selectedAuthType": "openai-compatible",
      "apiKey": "...",
      "baseUrl": "...",
      "modelName": "...",
      "connectivityPollInterval": 30  // 连通性检测间隔（秒），可选
    },
    "production": { ... }
  },
  "apiProfilesOrder": ["default", "production"]
}
```

**核心功能**：

1. **API 模型智能获取** (`fetchModels`)
   - 从 OpenAI 兼容 API 的 `/v1/models` 端点自动获取可用模型列表
   - 解析返回的 JSON 数据，提取 `id` 字段填充模型下拉框
   - 支持自定义 API 地址和密钥

2. **实时连通性监控** (`pingApiProfile`)
   - 定时向 API 发送 HEAD 或 GET 请求检测延迟
   - 显示实时状态指示器：优秀/良好/缓慢/无法连接/检测中
   - 状态点动画效果，支持悬停显示延迟详情
   - 可配置检测间隔（`connectivityPollInterval`，默认 30 秒，范围 5-600 秒）
   - 每个配置独立维护连通性状态

**API 字段** (定义于 `src/main/constants.js`):
- `selectedAuthType` - 认证类型（openai-compatible / api-key / oauth）
- `apiKey` - API 密钥
- `baseUrl` - 基础 URL（如 `https://api.openai.com/v1`）
- `modelName` - 模型名称
- `connectivityPollInterval` - 连通性检测间隔（秒），默认 30，最小 5，最大 600

**UI 交互**：
- `ApiConfig.vue` 中每个配置卡片右上角显示连通性状态圆点
- 悬停显示延迟（ms）和状态描述
- 页面加载时自动开始检测，切换导航时暂停以节省资源
- 支持手动点击刷新按钮立即检测

### MCP 服务器管理

MCP（Model Context Protocol）服务器配置管理模块：

**核心功能**：
- **多传输协议支持**：stdio（本地进程）、SSE（Server-Sent Events）、streamable-http（HTTP 流式）
- **快速添加**：支持粘贴 JSON、命令行或 URL 快速批量添加，系统自动解析配置并预览
- **高级配置**：可配置命令参数、环境变量、请求头、自定义字段等
- **服务器状态**：显示连接状态、响应时间、错误信息
- **导入导出**：支持本地 JSON 文件导入导出，便于备份和迁移

**配置字段**：
- `transportType` - 传输类型：`stdio` / `sse` / `streamable-http`
- `command` / `url` - 命令路径或服务器 URL
- `args` - 命令行参数数组
- `env` - 环境变量对象
- `headers` - HTTP 请求头（适用于 SSE/HTTP）
- `name` / `description` - 服务器名称和描述
- `enabled` - 启用/禁用开关

**UI 交互**：
- `McpServers.vue` 主页面：卡片列表展示，支持搜索、筛选、启用/禁用切换
- `ServerPanel.vue` 编辑面板：根据传输类型动态显示配置项
- `QuickAddDialog.vue` 快速添加：智能识别 JSON/CMD/URL 格式，实时预览解析结果
- 每个服务器卡片显示：状态指示灯、名称、传输类型、延迟、操作按钮（编辑/复制/删除）

**数据存储**：
- 配置存储在 `settings.json` 的 `mcpServers` 字段
- 每个服务器包含 `_lastModified` 时间戳用于同步冲突处理
- 删除时记录 tombstone 防止跨设备复活

### 技能管理

技能文件夹位于 `~/.iflow/skills/`，每个技能是一个包含 `SKILL.md` 的文件夹：
- 支持本地 ZIP 导入
- 支持在线 URL 导入（GitHub tarball/zipball）
- 导出技能到指定目录
- 解析 SKILL.md 的 YAML front matter 获取名称和描述

### 命令管理 (新增)

命令系统用于管理 iFlow CLI 的自定义命令：
- **仅支持 CRUD 操作**：创建、读取、更新、删除
- **不提供"执行"功能**：命令仅用于存储和编辑，实际执行由 iFlow CLI 核心处理
- 支持本地 JSON 导入和导出
- 命令以 JSON 格式存储，包含 `name`、`description`、`content`、`category` 等字段
- 支持按分类筛选和搜索
- 可通过 `CommandsView.vue` 进行图形化管理
- 数据存储在 `settings.json` 的 `commands` 字段中

### 云同步 (新增 - WebDAV)

基于 WebDAV 协议的跨设备配置同步功能：

**核心特性：**
- 端到端加密：所有同步数据在客户端加密后上传
- 增量合并：基于时间戳和 `_lastModified` 字段的智能合并
- 冲突处理：字段级深度合并，保留双方修改
- 设备管理：查看和管理已同步设备
- 密码保护：同步密码独立于设置密码，支持修改
- 记住密码选项：用户可控制是否持久化加密密码（默认不持久化）
- 自动同步：可配置间隔（默认 5 分钟）自动推送/拉取
- 手动同步：一键同步、仅拉取、仅推送
- 清理云端：清空所有云端数据

**安全设计：**
- 使用 Electron `safeStorage` 加密持久化密码（系统级加密）
- 密码长度至少 8 位
- 密码验证失败不影响本地数据
- 解密失败保留原始数据，不自动删除

**数据格式：**
```json
{
  "version": 2,
  "timestamp": "2026-04-30T...",
  "deviceId": "unique-device-id",
  "deviceName": "My PC",
  "fingerprint": "sha256-of-encrypted-data",
  "data": "AES-256-GCM 加密的配置数据"
}
```

** tombstone 机制：**
- 删除条目时记录 `_deletedProfiles` / `_deletedServers`
- 同步时合并 tombstone 并物理删除过期条目
- 防止已删除项目在设备间反复复活

### 系统托盘

- 窗口关闭时隐藏到托盘而非退出
- 托盘菜单支持快速切换 API 配置
- 双击托盘图标显示主窗口
- 支持多语言托盘菜单
- 右键菜单包含：显示/隐藏、退出、API 配置切换

### 开机自启动

- 支持开机自动启动功能
- 支持后台静默启动模式（`--hidden` / `--silent` 参数）
- 自启动设置存储在 `~/.iflow/settings.json` 的 `autoLaunch` 字段

### 自动更新

基于 `electron-updater` 实现，支持无缝更新体验：

**核心功能**：
- **自动检查**：启动时自动检查 GitHub Releases 更新
- **前台下载**：显示进度条、速度、剩余时间，支持取消
- **后台下载**：在后台静默下载，完成后通过通知提醒用户
- **延迟安装**：下载完成后可选择"立即安装"或"稍后提醒"
- **静默安装**：无交互模式，适用于自动化部署
- **多语言提示**：更新对话框和通知根据系统语言自动切换

**API 支持**：
- `downloadUpdateBackground()` - 后台下载（不阻塞界面）
- `cancelDownload()` - 取消正在进行的下载
- `getPendingUpdate()` - 获取待安装更新信息
- `clearPendingUpdate()` - 清除待安装更新（取消更新）
- 事件监听：`onUpdateAvailable`、`onUpdateDownloadProgress`、`onUpdateDownloaded`、`onUpdateBackgroundComplete`

**更新流程**：
1. 检查更新 → 发现新版本 → 弹窗提示
2. 用户选择：下载前台 / 下载后台 / 跳过 / 延迟提醒
3. 下载中：显示进度（百分比、速度、剩余时间）
4. 下载完成：提示安装（立即 / 稍后）
5. 安装：应用重启并完成更新

**配置**：
- 更新源：GitHub Releases（默认）或自定义服务器
- 自动检查：可通过设置禁用
- 下载行为：前台或后台模式
- 更新通知：系统托盘气泡或应用内弹窗

## 代码风格

### Vue 3 Composition API

使用 `<script setup>` 语法，全面采用 TypeScript：

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCloudSyncStore } from '@/stores/cloudSync'

const { t } = useI18n()
const settings = ref<Settings>({})
const modified = computed(() => ...)

const updateSettings = () => { ... }

watch(settings, () => { ... }, { deep: true })

onMounted(async () => { ... })
</script>
```

### 状态管理 (Pinia)

使用 Pinia 进行全局状态管理，stores 位于 `src/stores/`：

```typescript
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({})
  const isLoading = ref(false)

  async function load() {
    isLoading.value = true
    const data = await window.electronAPI.loadSettings()
    settings.value = data
    isLoading.value = false
  }

  return { settings, isLoading, load }
})
```

### 样式规范

- 使用 Less 预处理器
- 通过 CSS 变量 (`var(--xxx)`) 使用主题色
- 组件样式使用 BEM-like 命名或功能类名
- 动画使用 `@keyframes` 定义
- 响应式设计：支持窗口缩放

### 测试规范

- 测试框架：Vitest 4 + @vue/test-utils + happy-dom
- 测试文件命名：`*.test.js` 或 `*.test.ts`
- DOM 测试环境：happy-dom (jsdom 替代)
- 覆盖率排除：`node_modules`, `dist`, `release`, `build`
- 运行命令：
  ```bash
  npm run test           # 监听模式
  npm run test:run       # 单次运行
  npm run test:coverage  # 覆盖率报告
  ```

### TypeScript 配置

- `tsconfig.json` - Vue 3 + Vite 配置
- `tsconfig.node.json` - Node/Electron 配置
- 严格模式：`strict: true`
- 目标：ESNext

## 快捷键与交互

| 操作 | 说明 |
|------|------|
| 窗口关闭 | 隐藏到系统托盘（非退出） |
| 双击托盘 | 显示/隐藏主窗口 |
| Ctrl+S | 自动保存设置（通过 watch 监听） |
| 侧边栏导航 | 点击导航项切换视图 |
| 对话框确认 | Enter 键确认，Escape 键取消 |

## 常见问题

1. **图标不显示**: 检查 `build/icon.ico` 和 `build/icon.icns` 是否存在
2. **配置不保存**: 确认 `~/.iflow/settings.json` 目录可写，检查文件权限
3. **亚克力效果异常**: 检查 `acrylicIntensity` 值是否在 0-100 范围内
4. **技能导入失败**: 确保压缩包内包含有效的 `SKILL.md` 文件
5. **云同步失败**: 
   - 检查 WebDAV 服务器地址、用户名、密码是否正确
   - 确认网络连接
   - 查看控制台日志中的错误信息
6. **命令导入失败**: 确保命令 JSON 格式正确，包含必需的 `name` 和 `content` 字段
7. **自动更新不工作**: 检查网络连接，确认 GitHub Releases 配置正确

## 开发建议

### 添加新页面

1. 在 `src/views/` 创建 `MyView.vue` 和 `MyView.test.js`
2. 在 `src/App.vue` 中添加路由条件：
   ```vue
   <MyView v-if="currentSection === 'myview'" />
   ```
3. 在 `SideBar.vue` 中添加导航项
4. 在 `src/stores/` 创建对应的 store（如需要状态管理）
5. 添加国际化键值到 `src/locales/index.js`

### 添加新 IPC 接口

1. 在 `src/main/ipc/` 对应文件中添加处理器
2. 在 `src/preload.js` 中暴露 API
3. 在渲染进程通过 `window.electronAPI.xxx()` 调用
4. 添加错误处理包装器 `wrapIpcHandler`

### 添加新依赖

```bash
npm install <package-name>
# 若需类型定义
npm install -D @types/<package-name>
```

### 调试技巧

- 主进程调试：在 `package.json` 的 `start` 脚本中添加 `--inspect` 参数
- 渲染进程调试：Ctrl+Shift+I 打开 DevTools
- 查看日志：应用日志存储在 `~/.iflow/logs/`（如果配置了 electron-log）
- 测试运行：`npm run test:ui` 打开 UI 界面

## 版本历史

- **v1.14.8** (2026-05-02) - API 模型智能获取、连通性实时监控、连通性检测自定义、界面视觉统一、稳定性提升
- **v1.14.5** (2026-05-01) - MCP 服务器快速添加、MCP 高级配置、自动更新体验改进、列表行内操作、界面视觉统一
- **v1.14.0** (2026-05-01) - 云同步功能正式版（WebDAV）、命令管理模块、崩溃自动恢复、密码管理改进、同步性能提升、冲突处理优化、界面响应更流畅、数据安全修复、状态同步修复、密码验证修复
- **v1.13.0** (2026-04-29) - CLI 行为控制面板（14 项配置）、API 配置名称验证扩展、云同步数据模型简化、崩溃恢复机制、WebDAV 解析健壮性、N-1/N-2 场景数据丢失修复
- **v1.12.1** (2026-04-28) - 云同步删除同步、密码持久化开关
- **v1.12.0** - 云同步 Beta、MCP 服务器管理、API 配置重构、技能系统增强
- **v1.11.x** - 首次公开发布

---

最后更新：2026-05-02
维护者：iFlow 团队