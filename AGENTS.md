# iFlow Settings Editor - AI Context

## 项目概述

**iFlow 设置编辑器** 是一个用于编辑 iFlow CLI 配置文件 (`~/.iflow/settings.json`) 的桌面应用程序，采用 **Electron + Vue 3** 技术栈构建，支持多语言（中文/英文/日文）、云同步（WebDAV）、iFlow Mod 模组管理和自动更新功能。

**当前版本**: v1.17.0 (2026-05-08)

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
│    ├── autoUpdater.js   - 自动更新模块（差分更新支持）     │
│    │                                                    │
│    ├── ipc/              - IPC 通信处理器（按模块拆分）    │
│    │   ├── index.js     - IPC 处理器聚合与注册           │
│    │   ├── settings.js  - 设置读写（load/save）          │
│    │   ├── apiProfiles.js - API 配置 CRUD + fetchModels │
│    │   ├── skills.js    - 技能导入/导出/删除             │
│    │   ├── commands.js  - 命令 CRUD（无执行功能）        │
│    │   ├── cloud.js     - 云同步 IPC 桥接                │
│    │   ├── dialogs.js   - 对话框控制（消息/确认/输入）   │
│    │   ├── updates.js   - 自动更新检查/下载/安装         │
│    │   └── iflow.js     - iFlow Mod 管理                │
│    │                                                    │
│    ├── services/        - 业务逻辑层                      │
│    │   ├── configService.js   - 配置文件读写封装         │
│    │   ├── autoLaunchService.js - 开机自启管理          │
│    │   ├── SyncService.js     - 云同步核心逻辑          │
│    │   ├── iflowService.js    - iFlow Mod 业务逻辑     │
│    │   └── cloud/             - 云存储适配器层           │
│    │       └── WebDAVProvider.js - WebDAV 协议实现      │
│    │                                                    │
│    ├── crypto/          - 加密模块                       │
│    │   └── CryptoManager.js - 基于 safeStorage 的加密   │
│    │                                                    │
│    └── utils/           - 工具函数                       │
│        ├── errors.js    - 错误类型定义                   │
│        ├── logger.js    - 日志记录                       │
│        ├── translations.js - 国际化加载                   │
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
│    │   ├── TitleBar.vue        - 自定义标题栏（最小化/关闭）│
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
│    │   ├── UpdateProgress.vue  - 下载进度显示            │
│    │   └── CloudSyncWizard.vue - 云同步引导向导         │
│    │                                                    │
│    ├── views/           - 页面视图（按导航切换）          │
│    │   ├── Dashboard.vue       - 仪表盘（概览+快捷操作） │
│    │   ├── GeneralSettings.vue - 基础设置（偏好/其他/关于）│
│    │   ├── ApiConfig.vue       - API 配置管理（含实时连通性监控）│
│    │   ├── McpServers.vue      - MCP 服务器管理（快速添加+高级配置）│
│    │   ├── SkillsView.vue      - 技能管理（本地/在线导入导出）│
│    │   ├── CommandsView.vue    - 命令管理（CRUD+分类筛选）│
│    │   ├── IflowModsView.vue   - iFlow Mod 管理（实验性）│
│    │   └── DocsView.vue        - 文档查看器              │
│    │                                                    │
│    ├── stores/          - Pinia 状态管理（TypeScript）    │
│    │   ├── settings.ts         - 设置状态（持久化到 JSON）│
│    │   ├── apiProfiles.ts      - API 配置状态             │
│    │   ├── skills.ts           - 技能状态                 │
│    │   ├── commands.ts         - 命令状态                 │
│    │   ├── cloudSync.ts        - 云同步状态（WebDAV）     │
│    │   ├── iflowMods.ts        - iFlow Mod 状态          │
│    │   ├── ui.ts               - UI 状态（导航/弹窗）     │
│    │   └── index.js            - Store 聚合入口           │
│    │                                                    │
│    ├── composables/     - Vue 组合式函数                  │
│    │   ├── useLocale.ts   - 国际化支持                   │
│    │   └── useSettings.ts - 设置操作封装                 │
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
│        ├── types.ts    - TypeScript 类型声明             │
│        ├── errors.js    - 错误常量                        │
│        └── mcpParser.js - MCP 配置解析                   │
│                                                          │
│    assets/docs/         - 内置帮助文档                    │
│    ├── quickstart.md    - 快速入门                        │
│    ├── configuration/settings.md - 配置说明               │
│    ├── examples/        - 使用示例                        │
│    └── features/        - 功能特性                        │
│                                                          │
└───────────────────────────────────────────────────────────┘
```

### 配置文件

- **主配置**: `~/.iflow/settings.json` (UTF-8 JSON)
- **自动备份**: 修改时生成 `.bak` 备份文件
- **技能目录**: `~/.iflow/skills/`
- **iFlow Mod 目录**: `~/.iflow/mods/iflow/`
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

# 发布到 GitHub Releases (需配置 GH_TOKEN)
npm run publish

# 清理更新缓存
npm run clean:updates

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
│   ├── TitleBar.vue     # 标题栏 (最小化/关闭按钮)
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
│   ├── CommandEditorDialog.vue # 命令编辑器
│   ├── CloudSyncWizard.vue  # 云同步引导向导 (新增)
│   └── QuickAddDialog.vue   # 快速添加对话框
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
│   ├── CommandsView.vue # 命令管理
│   ├── CommandsView.test.js
│   ├── IflowModsView.vue # iFlow Mod 管理 (新增)
│   └── DocsView.vue     # 文档查看器 (新增)
├── stores/              # Pinia 状态管理
│   ├── settings.ts      # 设置状态
│   ├── settings.test.ts
│   ├── apiProfiles.ts   # API 配置状态
│   ├── apiProfiles.test.ts
│   ├── skills.ts        # 技能状态
│   ├── skills.test.ts
│   ├── commands.ts      # 命令状态
│   ├── commands.test.ts
│   ├── cloudSync.ts     # 云同步状态
│   ├── iflowMods.ts     # iFlow Mod 状态 (新增)
│   ├── ui.ts            # UI 状态
│   └── index.js         # 入口
├── composables/         # Vue 组合式函数 (新增)
│   ├── useLocale.ts     # 国际化支持
│   └── useSettings.ts   # 设置操作封装
├── main/                # Electron 主进程
│   ├── index.js         # 主进程入口
│   ├── constants.js     # 常量定义
│   ├── window.js        # 窗口管理
│   ├── tray.js          # 系统托盘
│   ├── autoUpdater.js   # 自动更新模块 (重构)
│   ├── crypto/          # 加密模块
│   │   ├── CryptoManager.js
│   │   └── CryptoManager.test.js
│   ├── ipc/             # IPC 处理器
│   │   ├── index.js     # 注册中心
│   │   ├── settings.js  # 设置操作
│   │   ├── apiProfiles.js # API 配置
│   │   ├── skills.js    # 技能管理
│   │   ├── commands.js  # 命令管理
│   │   ├── cloud.js     # 云同步
│   │   ├── dialogs.js   # 对话框
│   │   ├── updates.js   # 自动更新
│   │   └── iflow.js     # iFlow Mod (新增)
│   ├── services/        # 业务服务
│   │   ├── configService.js    # 配置读写
│   │   ├── configService.test.js
│   │   ├── autoLaunchService.js # 自启动
│   │   ├── SyncService.js      # 云同步核心
│   │   ├── SyncService.test.js
│   │   ├── iflowService.js     # iFlow Mod 业务逻辑 (新增)
│   │   └── cloud/              # 云存储适配器
│   │       ├── WebDAVProvider.js
│   │       └── WebDAVProvider.test.js
│   └── utils/           # 工具函数
│       ├── errors.js    # 错误处理
│       ├── logger.js    # 日志
│       ├── translations.js # 翻译
│       └── validator.js # 验证
├── shared/              # 共享类型定义
│   ├── types.ts         # TypeScript 类型
│   ├── errors.js        # 错误常量
│   └── mcpParser.js     # MCP 配置解析
├── locales/             # 国际化
│   ├── index.js (zh-CN) # 中文 (默认)
│   ├── en-US.js        # 英文
│   └── ja-JP.js        # 日文
└── styles/
    └── global.less      # 全局样式 (Fluent Design)

scripts/
└── publish.js          # 发布辅助脚本 (新增)

.github/workflows/
└── build.yml           # GitHub 自动构建发布 (新增)

assets/docs/             # 内置帮助文档 (重构)
├── quickstart.md
├── configuration/
│   └── settings.md
├── examples/
│   ├── basic-usage.md
│   ├── hooks.md
│   ├── keyboard-shortcuts.md
│   ├── mcp.md
│   ├── plan-mode.md
│   ├── skill.md
│   ├── slash-commands.md
│   ├── subagent.md
│   ├── subcommand.md
│   └── workflow.md
└── features/
    └── interactive.md
```

## 关键模块

### IPC 通信

**preload.js** 通过 `contextBridge` 暴露的安全 API：

```javascript
// ── 基础设置 ─────────────────────────────────────────────
window.electronAPI.loadSettings()                    // 加载 settings.json
window.electronAPI.saveSettings(data)               // 保存设置（自动备份）
window.electronAPI.showMessage(options)             // 显示消息对话框
window.electronAPI.showConfirmDialog(options)       // 显示确认对话框
window.electronAPI.showOpenDialog(options)          // 打开文件选择器

// ── 窗口控制 ─────────────────────────────────────────────
window.electronAPI.isMaximized()                    // 是否最大化
window.electronAPI.minimize()                       // 最小化
window.electronAPI.maximize()                       // 最大化/还原
window.electronAPI.close()                          // 关闭（隐藏到托盘）

// ── 开机自启动 ───────────────────────────────────────────
window.electronAPI.getAutoLaunch()                 // 获取自启动状态
window.electronAPI.setAutoLaunch(enabled)           // 设置自启动

// ── 自动更新 ─────────────────────────────────────────────
window.electronAPI.checkForUpdates()                // 检查更新
window.electronAPI.downloadUpdate()                 // 下载更新（前台）
window.electronAPI.downloadUpdateBackground()       // 后台下载更新
window.electronAPI.cancelDownload()                // 取消下载
window.electronAPI.installUpdate()                  // 安装待处理更新
window.electronAPI.getUpdateStatus()                // 获取更新状态
window.electronAPI.getAppVersion()                  // 获取当前版本
window.electronAPI.openReleasePage()                // 打开发布页面
window.electronAPI.getPendingUpdate()               // 获取待安装更新信息
window.electronAPI.clearPendingUpdate()             // 清除待安装更新
window.electronAPI.restorePendingUpdate()           // 恢复待安装更新
window.electronAPI.getUpdateHistory()               // 获取更新历史
window.electronAPI.saveUpdateHistory(history)       // 保存更新历史
window.electronAPI.onUpdateStatusChanged(cb)        // 监听状态变化
window.electronAPI.onUpdateAvailable(cb)            // 监听发现新版本
window.electronAPI.onUpdateDownloadProgress(cb)     // 监听下载进度
window.electronAPI.onUpdateDownloaded(cb)           // 监听下载完成
window.electronAPI.onUpdateBackgroundComplete(cb)   // 监听后台下载完成
window.electronAPI.onAutoCheckUpdate(cb)           // 监听自动检查更新
window.electronAPI.onInstallUpdate(cb)              // 监听安装更新

// ── API 配置管理 ─────────────────────────────────────────
window.electronAPI.listApiProfiles()               // 列出所有配置
window.electronAPI.switchApiProfile(name)          // 切换当前配置
window.electronAPI.createApiProfile(name)           // 新建配置
window.electronAPI.deleteApiProfile(name)           // 删除配置
window.electronAPI.renameApiProfile(oldName, newName) // 重命名配置
window.electronAPI.duplicateApiProfile(source, name) // 复制配置
window.electronAPI.fetchModels(baseUrl, apiKey)     // 从 API 获取模型列表
window.electronAPI.pingApiProfile(baseUrl)          // 检测连通性（延迟）
window.electronAPI.onApiProfileSwitched(cb)         // 监听配置切换

// ── MCP 服务器管理 ───────────────────────────────────────
window.electronAPI.listMcpServers()                 // 列出所有服务器
window.electronAPI.createMcpServer(data)            // 创建服务器
window.electronAPI.updateMcpServer(name, data)      // 更新服务器
window.electronAPI.deleteMcpServer(name)            // 删除服务器

// ── 技能管理 ─────────────────────────────────────────────
window.electronAPI.listSkills()                     // 列出已安装技能
window.electronAPI.importSkillLocal()               // 从本地 ZIP 导入
window.electronAPI.importSkillOnline(url, name)     // 从 URL 在线导入
window.electronAPI.exportSkill(name, folderName)    // 导出技能到目录
window.electronAPI.deleteSkill(name)                // 删除技能

// ── 命令管理 ─────────────────────────────────────────────
window.electronAPI.listCommands()                   // 列出所有命令
window.electronAPI.readCommand(name)                 // 读取命令详情
window.electronAPI.createCommand(name, data)       // 创建命令
window.electronAPI.updateCommand(name, data)        // 更新命令
window.electronAPI.deleteCommand(name)              // 删除命令
window.electronAPI.exportCommand(name)              // 导出命令为 JSON
window.electronAPI.importCommand()                  // 从本地 JSON 导入

// ── iFlow Mod 管理 (实验性) ──────────────────────────────
window.electronAPI.iflowGetIflowVersion()         // 获取 iFlow 版本号
window.electronAPI.iflowListMods()                 // 获取已安装 Mod 列表
window.electronAPI.iflowGetModCompatibility(modId) // 获取 Mod 版本兼容性
window.electronAPI.iflowEnableMod(modId, enabled) // 启用/禁用 Mod
window.electronAPI.iflowDeleteMod(modId)           // 删除 Mod
window.electronAPI.iflowExportMod(modId)           // 导出 Mod
window.electronAPI.iflowImportMod(filePath)        // 导入 Mod
window.electronAPI.iflowOpenImportDialog()         // 打开导入文件选择
window.electronAPI.iflowCheckIflowStatus()         // 检查 iFlow.js 状态

// ── 云同步（WebDAV） ─────────────────────────────────────
window.electronAPI.cloudSyncGetStatus()             // 获取同步状态
window.electronAPI.cloudSyncSetAutoSync(enabled)    // 设置自动同步
window.electronAPI.cloudSyncConfigureProvider(provider, config, testOnly) // 配置云服务
window.electronAPI.cloudSyncTestConnection()        // 测试连接
window.electronAPI.cloudSyncRevokeAuth()            // 断开认证
window.electronAPI.cloudSyncSetPassword(password)   // 设置同步密码
window.electronAPI.cloudSyncVerifyPassword(password) // 验证密码
window.electronAPI.cloudSyncChangePassword(old, new) // 修改密码
window.electronAPI.cloudSyncHasPassword()           // 是否已设置密码
window.electronAPI.cloudSyncHasCachedPassword()     // 是否记住密码
window.electronAPI.cloudSyncGetRememberPassword()    // 获取记住密码状态
window.electronAPI.cloudSyncSetRememberPassword(remember) // 设置记住密码
window.electronAPI.cloudSyncSyncNow(password)       // 手动同步（双向）
window.electronAPI.cloudSyncPull(password)          // 仅从云端拉取
window.electronAPI.cloudSyncPush(password)          // 仅推送到云端
window.electronAPI.cloudSyncClearCloud()            // 清空云端数据
window.electronAPI.cloudSyncGetDevices()            // 获取已同步设备列表
window.electronAPI.cloudSyncSetDeviceName(name)     // 设置本设备名称
window.electronAPI.cloudSyncSetTombstoneRetentionDays(days) // 设置删除记录保留期
window.electronAPI.cloudSyncRemoveDevice(deviceId)  // 移除设备云端数据

// ── 云同步事件监听 ───────────────────────────────────────
window.electronAPI.onCloudSyncStatusChanged(cb)      // 状态变化
window.electronAPI.onCloudSyncProgress(cb)           // 同步进度（0-100）
window.electronAPI.onCloudSyncConflict(cb)          // 冲突检测

// ── 外部链接 ─────────────────────────────────────────────
window.electronAPI.openExternal(url)                // 打开外部链接

// ── 国际化 ─────────────────────────────────────────────
window.electronAPI.notifyLanguageChanged()          // 通知语言切换
window.electronAPI.sendTranslation(translations)    // 发送翻译数据
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
      "connectivityPollInterval": 30
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

### MCP 服务器管理

MCP（Model Context Protocol）服务器配置管理模块：

**核心功能**：
- **多传输协议支持**：stdio（本地进程）、SSE（Server-Sent Events）、streamable-http（HTTP 流式）
- **快速添加**：支持粘贴 JSON、命令行或 URL 快速批量添加，系统自动解析配置并预览
- **高级配置**：可配置命令参数、环境变量、请求头、自定义字段等
- **服务器状态**：显示连接状态、响应时间、错误信息
- **导入导出**：支持本地 JSON 文件导入导出，便于备份和迁移

### 技能管理

技能文件夹位于 `~/.iflow/skills/`，每个技能是一个包含 `SKILL.md` 的文件夹：
- 支持本地 ZIP 导入
- 支持在线 URL 导入（GitHub tarball/zipball）
- 导出技能到指定目录
- 解析 SKILL.md 的 YAML front matter 获取名称和描述

### 命令管理

命令系统用于管理 iFlow CLI 的自定义命令：
- **仅支持 CRUD 操作**：创建、读取、更新、删除
- **不提供"执行"功能**：命令仅用于存储和编辑，实际执行由 iFlow CLI 核心处理
- 支持本地 JSON 导入和导出
- 命令以 JSON 格式存储，包含 `name`、`description`、`content`、`category` 等字段
- 支持按分类筛选和搜索

### iFlow Mod 管理 (实验性)

iFlow Mod 是实验性功能，支持加载和管理 iFlow 修饰符模块，可扩展 iFlow CLI 的核心功能：

**核心功能**：
- **模组管理界面**：集中展示已安装的模组，显示名称、版本、类型、作者等详细信息
- **启用/禁用控制**：可随时开启或关闭特定模组，灵活控制功能扩展
- **导入/导出功能**：支持从本地文件导入模组配置或将已有模组导出分享
- **版本兼容性检查**：自动检查模组与当前 iFlow 版本的兼容性

**Mod 类型**：
- `replace` - 替换 iFlow.js 全部内容
- `append` - 在 iFlow.js 末尾追加代码
- `prepend` - 在 iFlow.js 开头插入代码
- `patch` - 补丁模式（Phase 1 暂不支持）

**数据结构**：
- 模组存储在 `~/.iflow/mods/iflow/` 目录
- 元数据记录在 `mods.json` 文件中
- 支持 `mod.json` 配置文件的模组包导入

### 云同步 (WebDAV)

基于 WebDAV 协议的跨设备配置同步功能：

**核心特性**：
- 端到端加密：所有同步数据在客户端加密后上传
- 增量合并：基于时间戳和 `_lastModified` 字段的智能合并
- 冲突处理：字段级深度合并，保留双方修改
- 设备管理：查看和管理已同步设备
- 密码保护：同步密码独立于设置密码，支持修改
- 记住密码选项：用户可控制是否持久化加密密码（默认不持久化）
- 删除记录保留期：可自定义删除操作在多设备间的同步保留时间（1-365 天，默认 30 天）
- 自动同步：可配置间隔（默认 5 分钟）自动推送/拉取
- 手动同步：一键同步、仅拉取、仅推送
- 清理云端：清空所有云端数据

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
- **差分更新支持**：利用 blockMap 算法实现增量更新，减少更新包体积
- **自动检查**：启动时自动检查 GitHub Releases 更新
- **前台下载**：显示进度条、速度、剩余时间，支持取消
- **后台下载**：在后台静默下载，完成后通过通知提醒用户
- **延迟安装**：下载完成后可选择"立即安装"或"稍后提醒"
- **更新历史**：记录每次更新的版本、类型、大小、耗时等信息
- **多语言提示**：更新对话框和通知根据系统语言自动切换

**API 支持**：
- `downloadUpdateBackground()` - 后台下载（不阻塞界面）
- `cancelDownload()` - 取消正在进行的下载
- `getPendingUpdate()` - 获取待安装更新信息
- `clearPendingUpdate()` - 清除待安装更新（取消更新）
- `restorePendingUpdate()` - 恢复待安装更新
- `getUpdateHistory()` / `saveUpdateHistory()` - 更新历史管理
- 事件监听：`onUpdateAvailable`、`onUpdateDownloadProgress`、`onUpdateDownloaded`、`onUpdateBackgroundComplete`

**GitHub 自动发布**：
- 推送代码到 `release` 分支自动触发构建
- 自动从 CHANGELOG.md 提取版本号和更新日志
- 自动生成 .blockmap 文件支持差分更新
- 支持 Windows (NSIS + 便携版) 和 macOS (DMG + ZIP)

### 文档查看器

内置帮助文档系统，支持快速浏览各类使用文档：
- **快速入门**：新用户入门指南
- **配置说明**：settings.json 各配置项详解
- **使用示例**：hooks、快捷键、MCP、命令、计划模式等示例
- **功能特性**：交互模式等高级功能说明
- 文档在构建时打包，加载速度快

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

### 组合式函数 (Composables)

位于 `src/composables/`，封装可复用的逻辑：

```typescript
// useLocale.ts - 国际化支持
export function useLocale() {
  const currentLocale = ref<SupportedLocale>('zh-CN')
  // ...
  return { currentLocale, setLocale, ... }
}

// useSettings.ts - 设置操作封装
export function useSettings() {
  // ...
}
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
8. **差分更新失败**: 确保发布时生成了 .blockmap 文件，检查网络和 GitHub 连接

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

- **v1.17.0** (2026-05-08) - 自动更新模块重构、差分更新支持、GitHub 自动发布、窗口控制简化
- **v1.16.2** (2026-05-08) - 稳定性提升
- **v1.16.1** (2026-05-07) - iFlow Mod 页面体验优化、空状态优化、模组删除防误触
- **v1.16.0** (2026-05-06) - iFlow Mod 功能模块（实验性）
- **v1.15.14** (2026-05-05) - 文档系统重构、删除记录保留期设置、API 配置排序优化
- **v1.15.7** (2026-05-03) - 文档查看器、动画效果优化、云同步体验改进
- **v1.14.8** (2026-05-02) - API 模型智能获取、连通性实时监控、界面视觉统一
- **v1.14.5** (2026-05-01) - MCP 服务器快速添加、MCP 服务器高级配置
- **v1.14.0** (2026-05-01) - 云同步功能正式版（WebDAV）、命令管理模块、崩溃自动恢复
- **v1.13.0** (2026-04-29) - CLI 行为控制面板（14 项配置）
- **v1.12.1** (2026-04-28) - 云同步删除同步、密码持久化开关
- **v1.12.0** - 云同步 Beta、MCP 服务器管理、API 配置重构、技能系统增强
- **v1.11.x** - 首次公开发布

---

最后更新：2026-05-08
维护者：iFlow 团队
