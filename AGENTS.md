# iFlow Settings Editor - AI Context

## 项目概述

**iFlow 设置编辑器** 是一个用于编辑 iFlow CLI 配置文件 (`~/.iflow/settings.json`) 的桌面应用程序，采用 **Electron + Vue 3** 技术栈构建，支持多语言（中文/英文/日文）、云同步（WebDAV）、iFlow Mod 模组管理和自动更新功能。

**当前版本**: v1.21.2 (2026-06-26)

### 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Electron | 28.0.0 |
| 前端 | Vue 3 | 3.4.0 |
| 构建工具 | Vite | 8.0.8 |
| 状态管理 | Pinia | 3.0.4 |
| CSS 预处理器 | Less | 4.6.4 |
| 国际化 | vue-i18n | 11.4.5 |
| 测试框架 | Vitest + happy-dom | 4.1.4 + 20.9.0 |
| 测试工具 | @vue/test-utils | 2.4.6 |
| 打包工具 | electron-builder | 24.13.3 |
| 图标库 | @icon-park/vue-next | 1.4.2 |
| 工具库 | @vueuse/core | 14.2.1 |
| TOML 支持 | @iarna/toml | 2.2.5 |
| XML 解析 | fast-xml-parser | 5.7.2 |
| Markdown 解析 | marked | 18.0.2 |
| ZIP 处理 | adm-zip | 0.5.17 |
| Diff 补丁 | diff | 9.0.0 |
| 日期处理 | moment | 2.30.1 |
| 图表库 | apexcharts / vue3-apexcharts | 5.11.0 / 1.11.1 |
| 日志 | electron-log | 5.4.3 |
| 自动更新 | electron-updater | 6.8.3 |
| DOM 净化 | dompurify | 3.4.8 |
| 拖拽排序 | vue-draggable-plus | 0.6.1 |
| TypeScript | TypeScript | 6.0.3 |
| ESLint | eslint + eslint-plugin-vue | 10.4.0 + 10.9.1 |
| 代码格式化 | prettier | 3.8.3 |

### 核心架构

项目采用模块化架构，主进程与渲染进程通过 IPC 通信，代码结构清晰、职责分离。所有视图组件使用 `defineAsyncComponent` 懒加载，支持骨架屏加载和错误降级。

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
│    │   ├── iflow.js     - iFlow Mod 管理                │
│    │   └── projects.js  - 项目会话管理                  │
│    │                                                    │
│    ├── services/        - 业务逻辑层                      │
│    │   ├── configService.js   - 配置文件读写封装         │
│    │   ├── autoLaunchService.js - 开机自启管理          │
│    │   ├── SyncService.js     - 云同步核心逻辑          │
│    │   ├── iflowService.js    - iFlow Mod 业务逻辑     │
│    │   ├── projectService.js  - 项目会话业务逻辑        │
│    │   ├── balanceService.js  - Token 余额查询服务      │
│    │   └── cloud/             - 云存储适配器层           │
│    │       └── WebDAVProvider.js - WebDAV 协议实现      │
│    │                                                    │
│    ├── crypto/          - 加密模块                       │
│    │   └── CryptoManager.js - 基于 safeStorage 的加密   │
│    │                                                    │
│    ├── workers/         - Worker 线程管理器              │
│    │   └── modWorkerManager.js - Mod 处理 Worker 管理器 │
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
│    ├── App.vue          - 根组件（条件渲染 + 懒加载视图） │
│    ├── main.js          - Vue 应用入口                    │
│    │                                                    │
│    ├── components/      - 可复用 UI 组件                 │
│    │   ├── TitleBar.vue        - 自定义标题栏            │
│    │   ├── SideBar.vue         - 侧边导航栏              │
│    │   ├── InputDialog.vue     - 文本输入对话框          │
│    │   ├── MessageDialog.vue   - 消息提示对话框          │
│    │   ├── ConfirmDialog.vue   - 确认对话框              │
│    │   ├── ApiProfileDialog.vue - API 配置编辑弹窗       │
│    │   ├── ServerPanel.vue     - MCP 服务器编辑面板      │
│    │   ├── CommandEditorDialog.vue - 命令编辑对话框      │
│    │   ├── QuickAddDialog.vue  - 快速添加 MCP 服务器     │
│    │   ├── EmptyState.vue      - 空状态占位符            │
│    │   ├── SkeletonLoader.vue  - 骨架屏加载              │
│    │   ├── UpdateNotification.vue - 更新可用通知          │
│    │   ├── UpdateProgress.vue  - 下载进度显示             │
│    │   ├── CloudSyncWizard.vue - 云同步引导向导          │
│    │   ├── ToastNotification.vue - 全局 Toast 通知       │
│    │   ├── GenericList.vue     - 通用列表组件             │
│    │   ├── MessageBubble.vue   - 消息气泡组件             │
│    │   ├── ModelUsageChart.vue - 模型使用图表             │
│    │   ├── ProjectSessionList.vue - 项目会话列表          │
│    │   ├── ToolCallBlock.vue   - 工具调用块               │
│    │   ├── ApplyingDialog.vue  - 操作进度对话框           │
│    │   ├── CustomDropdown.vue  - 统一下拉选择器           │
│    │   ├── CustomInput.vue     - 统一输入控件             │
│    │   └── ToggleSwitch.vue    - 开关切换控件             │
│    │                                                    │
│    ├── views/           - 页面视图（全部懒加载）          │
│    │   ├── Dashboard.vue       - 仪表盘（概览+快捷操作） │
│    │   ├── GeneralSettings.vue - 基础设置（偏好/云同步/关于）│
│    │   ├── ApiConfig.vue       - API 配置管理（含 Token 余额和连通性监控）│
│    │   ├── McpServers.vue      - MCP 服务器管理          │
│    │   ├── SkillsView.vue      - 技能管理                │
│    │   ├── CommandsView.vue    - 命令管理（CRUD+分类筛选）│
│    │   ├── IflowModsView.vue   - iFlow Mod 管理           │
│    │   ├── ProjectsView.vue    - 项目会话管理（实验性）  │
│    │   ├── SessionDetailView.vue - 会话详情页             │
│    │   └── DocsView.vue        - 文档查看器               │
│    │                                                    │
│    ├── stores/          - Pinia 状态管理                  │
│    │   ├── cloudSync.ts        - 云同步状态（WebDAV）     │
│    │   ├── iflowMods.ts        - iFlow Mod 状态           │
│    │   └── projects.ts         - 项目会话状态             │
│    │                                                    │
│    ├── composables/     - Vue 组合式函数                  │
│    │   ├── useLocale.ts        - 国际化支持               │
│    │   ├── useSettings.ts      - 设置操作封装             │
│    │   ├── useToast.ts         - 全局 Toast 通知          │
│    │   └── useModelUsageStats.ts - 模型统计               │
│    │                                                    │
│    ├── locales/         - 国际化语言包（i18n）            │
│    │   ├── index.js    - 中文（简体，默认）              │
│    │   ├── en-US.js    - 英文                            │
│    │   └── ja-JP.js    - 日文                            │
│    │                                                    │
│    ├── styles/          - 全局样式                        │
│    │   └── global.less - Windows 11 Fluent Design 设计系统│
│    │                                                    │
│    ├── shared/          - 主进程与渲染进程共享类型定义    │
│    │   ├── types.ts    - TypeScript 类型声明             │
│    │   ├── defaults.ts - CLI 默认值常量                   │
│    │   ├── errors.js   - 错误常量                        │
│    │   └── mcpParser.js - MCP 配置解析                   │
│    │                                                    │
│    └── workers/         - Web Worker 线程                 │
│        ├── modelStatsWorker.js  - 模型使用统计聚合       │
│        └── modProcessingWorker.js - Mod 处理逻辑          │
│                                                          │
│    assets/docs/         - 内置帮助文档                    │
│    ├── quickstart.md    - 快速入门                        │
│    ├── configuration/settings.md - 配置说明               │
│    ├── examples/        - 使用示例                       │
│    └── features/        - 功能特性                       │
│                                                          │
└───────────────────────────────────────────────────────────┘
```

### 配置文件

- **主配置**: `~/.iflow/settings.json` (UTF-8 JSON)
- **自动备份**: 修改时生成 `.bak` 备份文件
- **技能目录**: `~/.iflow/skills/`
- **iFlow Mod 目录**: `~/.iflow/mods/iflow/`
- **云同步配置**: 存储在 `settings.json` 的 `cloudSync` 字段下
- **日志目录**: `~/.iflow/logs/`（便携模式自动重定向）


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
npm run publish:win    # 仅 Windows
npm run publish:mac    # 仅 macOS
npm run publish:all    # 全平台

# 清理更新缓存
npm run clean:updates

# 运行测试
npm run test          # 监听模式
npm run test:ui       # UI 模式
npm run test:coverage # 覆盖率报告
npm run test:run      # 单次运行

# TypeScript 类型检查
npm run type-check

# ESLint 代码检查
npm run lint
npm run lint:fix      # 自动修复

# Prettier 格式化
npm run format
npm run format:check  # 检查格式

# 全面检查 (类型检查 + ESLint)
npm run check

# i18n 翻译检查
npm run check:i18n
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
- 非 Windows 平台自动隐藏选项


## 关键模块

### IPC 通信

**preload.js** 通过 `contextBridge` 暴露的安全 API：

```javascript
// -- 基础设置 --
window.electronAPI.loadSettings()                    // 加载 settings.json
window.electronAPI.saveSettings(data)               // 保存设置（自动备份）
window.electronAPI.showMessage(options)             // 显示消息对话框
window.electronAPI.showConfirmDialog(options)       // 显示确认对话框
window.electronAPI.showOpenDialog(options)          // 打开文件选择器
window.electronAPI.getPlatform()                    // 获取平台信息

// -- 窗口控制 --
window.electronAPI.isMaximized()                    // 是否最大化
window.electronAPI.minimize()                       // 最小化
window.electronAPI.maximize()                       // 最大化/还原
window.electronAPI.close()                          // 关闭（隐藏到托盘）
window.electronAPI.setAcrylicEnabled(enabled)       // 切换亚克力效果
window.electronAPI.getZoomFactor()                  // 获取缩放因子
window.electronAPI.setZoomFactor(factor)            // 设置缩放因子

// -- 开机自启动 --
window.electronAPI.getAutoLaunch()                 // 获取自启动状态
window.electronAPI.setAutoLaunch(enabled)           // 设置自启动

// -- 自动更新设置 --
window.electronAPI.getAutoUpdate()                  // 获取自动更新状态
window.electronAPI.setAutoUpdate(enabled)           // 设置自动更新

// -- 自动更新 --
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

// -- API 配置管理 --
window.electronAPI.listApiProfiles()               // 列出所有配置
window.electronAPI.switchApiProfile(name)          // 切换当前配置
window.electronAPI.createApiProfile(name)           // 新建配置
window.electronAPI.deleteApiProfile(name)           // 删除配置
window.electronAPI.renameApiProfile(oldName, newName) // 重命名配置
window.electronAPI.duplicateApiProfile(source, name) // 复制配置
window.electronAPI.fetchModels(baseUrl, apiKey)     // 从 API 获取模型列表
window.electronAPI.pingApiProfile(baseUrl)          // 检测连通性（延迟）
window.electronAPI.fetchTokenBalance(params)        // 查询 Token 余额
window.electronAPI.onApiProfileSwitched(cb)         // 监听配置切换

// -- MCP 服务器管理 --
window.electronAPI.listMcpServers()                 // 列出所有服务器
window.electronAPI.createMcpServer(data)            // 创建服务器
window.electronAPI.updateMcpServer(name, data)      // 更新服务器
window.electronAPI.deleteMcpServer(name)            // 删除服务器

// -- 技能管理 --
window.electronAPI.listSkills()                     // 列出已安装技能
window.electronAPI.importSkillLocal()               // 从本地 ZIP 导入
window.electronAPI.importSkillOnline(url, name)     // 从 URL 在线导入
window.electronAPI.exportSkill(name, folderName)    // 导出技能到目录
window.electronAPI.deleteSkill(name)                // 删除技能

// -- 命令管理 --
window.electronAPI.listCommands()                   // 列出所有命令
window.electronAPI.readCommand(name)                 // 读取命令详情
window.electronAPI.createCommand(name, data)       // 创建命令
window.electronAPI.updateCommand(name, data)        // 更新命令
window.electronAPI.deleteCommand(name)              // 删除命令
window.electronAPI.exportCommand(name)              // 导出命令为 JSON
window.electronAPI.importCommand()                  // 从本地 JSON 导入

// -- iFlow Mod 管理 (实验性) --
window.electronAPI.iflowGetIflowVersion()         // 获取 iFlow 版本号
window.electronAPI.iflowListMods()                 // 获取已安装 Mod 列表
window.electronAPI.iflowGetModCompatibility(modId) // 获取 Mod 版本兼容性
window.electronAPI.iflowEnableMod(modId, enabled) // 启用/禁用 Mod
window.electronAPI.iflowDeleteMod(modId)           // 删除 Mod
window.electronAPI.iflowExportMod(modId)           // 导出 Mod
window.electronAPI.iflowImportMod(filePath)        // 导入 Mod
window.electronAPI.iflowOpenImportDialog()         // 打开导入文件选择
window.electronAPI.iflowCheckIflowStatus()         // 检查 iFlow.js 状态
window.electronAPI.onIflowApplyProgress(cb)        // 监听 Mod 应用进度
window.electronAPI.onIflowDetectConflictsProgress(cb)// 监听冲突检测进度

// -- 项目会话管理 (实验性) --
window.electronAPI.listProjects()                   // 列出所有项目
window.electronAPI.getProjectSessions(projectId, options) // 列出项目会话（分页）
window.electronAPI.getSessionMessages(projectId, sessionId, options) // 获取会话消息
window.electronAPI.deleteSession(projectId, sessionId) // 删除会话
window.electronAPI.deleteProject(projectId)         // 删除项目
window.electronAPI.deleteMessages(projectId, sessionId, messageUuids) // 删除消息
window.electronAPI.exportSession(projectId, sessionId, format) // 导出会话（MD/JSON）
window.electronAPI.searchSessions(query, options)   // 搜索会话
window.electronAPI.getSessionStats(projectId, sessionId) // 获取会话统计
window.electronAPI.getAllSessionMessagesForStats(days) // 获取统计数据用消息

// -- 云同步（WebDAV） --
window.electronAPI.cloudSyncGetStatus()             // 获取同步状态
window.electronAPI.cloudSyncSetAutoSync(enabled, interval) // 设置自动同步
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
window.electronAPI.cloudSyncSetSyncInterval(minutes) // 设置同步间隔
window.electronAPI.cloudSyncRemoveDevice(deviceId)  // 移除设备云端数据
window.electronAPI.onCloudSyncStatusChanged(cb)      // 状态变化
window.electronAPI.onCloudSyncProgress(cb)           // 同步进度（0-100）
window.electronAPI.onCloudSyncConflict(cb)          // 冲突检测

// -- 外部链接与路径 --
window.electronAPI.openExternal(url)                // 打开外部链接
window.electronAPI.openPath(filePath)               // 打开系统文件路径

// -- 日志管理 --
window.electronAPI.getLogDir()                      // 获取日志目录
window.electronAPI.clearLogs()                      // 清理日志
window.electronAPI.getLogLevel()                    // 获取日志级别
window.electronAPI.setLogLevel(level)               // 设置日志级别

// -- 国际化 --
window.electronAPI.notifyLanguageChanged()          // 通知语言切换
window.electronAPI.sendTranslation(translations)    // 发送翻译数据

// -- 文件变化监听 --
window.electronAPI.onSettingsFileChanged(cb)        // 监听外部修改 settings.json
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
      "tokensLimit": 128000,
      "expiryDays": 0,
      "balanceProvider": "auto",
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

3. **Token 余额查询** (`fetchTokenBalance`)
   - 支持 BUZZ / DeepSeek / 云雾等多家服务商
   - 支持自定义供应商规则（接口地址 + 字段映射）
   - 定时刷新余额显示，配置可选的刷新间隔
   - 网格视图简洁展示，列表视图显示明细信息

4. **配置布局模式**
   - 支持列表/网格两种布局模式，可自由切换
   - 网格模式下支持拖拽排序（vue-draggable-plus）
   - API 配置过期天数管理（expiryDays + 自动倒计时）

### MCP 服务器管理

MCP（Model Context Protocol）服务器配置管理模块：

**核心功能**：
- **多传输协议支持**：stdio（本地进程）、SSE（Server-Sent Events）、streamable-http（HTTP 流式）
- **快速添加**：支持粘贴 JSON、命令行或 URL 快速批量添加，系统自动解析配置并预览
- **高级配置**：可配置命令参数、环境变量、请求头、自定义字段等
- **服务器状态**：显示连接状态、响应时间、错误信息
- **导入导出**：支持本地 JSON 文件导入导出，便于备份和迁移
- **分享配置**：支持导出分享 MCP 服务器配置，方便团队复用

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
- **冲突检测**：启用模组前自动检测行级冲突，多个模组修改同一行时弹出警告
- **冲突自动替换**：启用 replace 类型模组时如遇冲突，支持一键自动替换
- **Worker 线程处理**：大文件冲突检测和应用使用 Worker 线程，不阻塞 UI

**Mod 类型**：
- `replace` - 替换 iFlow.js 全部内容
- `append` - 在 iFlow.js 末尾追加代码
- `prepend` - 在 iFlow.js 开头插入代码
- `diff` - 以 unified diff 补丁形式应用改动
- `patch` - 补丁模式（Phase 1 暂不支持）

**数据结构**：
- 模组存储在 `~/.iflow/mods/iflow/` 目录
- 元数据记录在 `mods.json` 文件中
- 支持 `mod.json` 配置文件的模组包导入

> 💡 配套工具：**[iFlow-Mod-Builder](https://github.com/yuentao/iFlow-Mod-Builder)** — 基于 Tauri + Vue3 的图形化 Mod 打包工具，可视化编辑 `mod.json`，一键生成 `.iflow-mod` 文件。

### 项目会话管理 (实验性)

iFlow 项目与会话的查看和管理功能：

**核心功能**：
- **项目列表**：展示所有 iFlow 项目，显示会话数量和最后活动时间
- **会话展开**：点击项目可展开查看该项目的所有会话记录
- **会话详情**：查看会话消息内容、统计信息（消息数、Token 消耗、工具调用数等）
- **搜索会话**：支持按关键字搜索历史会话
- **导出功能**：支持导出为 Markdown 或 JSON 格式
- **删除管理**：支持删除单个会话、消息或整个项目
- **分页加载**：支持分页加载历史会话，分页获取消息
- **Token 用量统计**：会话详情页展示详细的 Token 消耗统计

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
- 支持多语言托盘菜单（通过 IPC 接收翻译）
- 右键菜单包含：显示/隐藏、退出、API 配置切换

### 开机自启动

- 支持开机自动启动功能
- 支持后台静默启动模式（`--hidden` / `--silent` 参数）
- 自启动设置存储在 `~/.iflow/settings.json` 的 `autoLaunch` 字段
- 便携模式自动禁用开机自启

### 自动更新

基于 `electron-updater` 实现，支持无缝更新体验。主进程 `src/main/autoUpdater.js` 独立管理更新逻辑，支持差分更新（blockMap）。

**核心功能**：
- **差分更新支持**：利用 blockMap 算法实现增量更新（默认启用），减少更新包体积
- **差分失败自动回滚**：差分更新失败时自动降级为完整包重试
- **自动检查**：启动时 5 秒后自动检查 GitHub Releases 更新
- **前台下载**：显示进度条、速度、剩余时间，支持取消
- **后台下载**：在后台静默下载，完成后通过通知提醒用户
- **延迟安装**：下载完成后可选择"立即安装"或"稍后提醒"
- **更新历史**：记录每次更新的版本、类型、大小、耗时等信息
- **多语言提示**：更新对话框和通知根据系统语言自动切换
- **自动更新开关**：用户可在设置中启用/禁用自动更新（默认启用）
- **便携模式跳过**：便携版自动跳过更新检查

**API 支持**：
- `getAutoUpdate() / setAutoUpdate(enabled)` - 自动更新开关
- `downloadUpdateBackground()` - 后台下载（不阻塞界面）
- `cancelDownload()` - 取消正在进行的下载
- `getPendingUpdate()` - 获取待安装更新信息
- `clearPendingUpdate()` - 清除待安装更新
- `restorePendingUpdate()` - 恢复待安装更新
- `getUpdateHistory() / saveUpdateHistory()` - 更新历史管理
- 事件监听：`onUpdateAvailable`、`onUpdateDownloadProgress`、`onUpdateDownloaded`、`onUpdateBackgroundComplete`

**GitHub 自动发布**：
- 推送代码到 `release` 分支自动触发构建
- 自动从 CHANGELOG.md 提取版本号和更新日志
- 自动生成 .blockmap 文件支持差分更新
- 支持 Windows (NSIS + 便携版) 和 macOS (DMG + ZIP)

### 全局 Toast 通知

基于 Composable 的全局轻量级通知系统，从底部居中弹出，不打断用户操作：

**组件**：`ToastNotification.vue` + `useToast.ts` Composable

**核心特性**：
- 四种类型：`info` / `success` / `warning` / `error`，各有对应图标和颜色
- 自动消失：info/success/warning 3s，error 5s，可自定义时长
- 底部进度条：显示剩余时间倒计时
- 鼠标悬停暂停计时，移开恢复
- 最多同时显示 5 条，超出自动移除最早的
- TransitionGroup 进出动画（底部向上滑入/滑出）
- 手动关闭按钮
- 模块级单例状态，任何组件调用共享同一份列表

**使用方式**：

```typescript
import { useToast } from '@/composables/useToast'
const toast = useToast()

// 通用调用
toast.show({ type: 'success', message: '保存成功', title: '提示' })

// 快捷方法
toast.success('操作完成')
toast.error('网络连接失败')
toast.warning('磁盘空间不足')
toast.info('正在同步...')

// 手动关闭
const id = toast.info('处理中...')
toast.removeToast(id)

// 清空所有
toast.clearAll()
```

### 日志管理

支持在设置中动态切换日志级别：
- 日志存储在 `~/.iflow/logs/`（便携模式重定向到 `~/.iflow/logs/`）
- 日志级别：`info` / `debug` / `silent`
- 支持界面清理历史日志文件
- 通过 IPC 接口 `getLogDir`、`clearLogs`、`getLogLevel`、`setLogLevel` 管理

### UI 缩放

支持界面缩放调整，适配不同分辨率显示：
- 缩放范围：75% - 125%（0.75 - 1.25）
- 通过设置页滑块或 IPC 接口调整
- 即时生效，无需重启

### 设置防抖保存

- 设置修改使用 500ms 防抖合并，减少不必要的 IPC 写入
- 窗口隐藏到托盘时跳过保存
- 支持 `flushPendingSave` 在关键操作前立即刷新待保存设置

### 视图懒加载

- 所有页面视图使用 `defineAsyncComponent` 懒加载
- 加载中显示骨架屏组件（`SkeletonLoader`）
- 加载失败显示错误降级 UI，支持重试
- 超时限制（Dashboard 15s，其余默认无限）
- 静态启动画面 10 秒超时自动移除兜底

### Worker 线程

项目使用两种 Worker 机制：

1. **Node.js Worker Threads**（`src/main/workers/modWorkerManager.js`）
   - 处理大文件的 Mod 冲突检测和应用
   - 超过 1MB 的文件自动使用 Worker 处理
   - 支持的 task 类型：`detectConflicts`、`applyCodeJsChanges`、`applyUnifiedDiff`、`generateDiff`

2. **Web Workers**（`src/workers/`）
   - `modelStatsWorker.js`：在 Worker 线程中聚合模型使用统计数据，避免阻塞 UI
   - `modProcessingWorker.js`：Mod 处理逻辑的 Worker 实现

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

// useToast.ts - 全局 Toast 通知
export function useToast() {
  const toast = useToast()
  toast.success('操作完成')
  // ...
}

// useModelUsageStats.ts - 模型使用统计
export function useModelUsageStats() {
  // ...
}
```

### 样式规范

- 使用 Less 预处理器
- 通过 CSS 变量 (`var(--xxx)`) 使用主题色
- 组件样式使用 BEM-like 命名或功能类名
- 动画使用 `@keyframes` 定义
- 响应式设计：支持窗口缩放
- 统一下拉控件 `CustomDropdown`、统一输入控件 `CustomInput`、开关控件 `ToggleSwitch`

### 测试规范

- 测试框架：Vitest 4 + @vue/test-utils + happy-dom
- 测试文件命名：`*.test.js` 或 `*.test.ts`
- DOM 测试环境：happy-dom (jsdom 替代)
- 覆盖率排除：`node_modules`, `dist`, `release`, `build`
- 测试文件覆盖：所有主要组件、view、composable、service 均有测试
- 运行命令：
  ```bash
  npm run test           # 监听模式
  npm run test:ui        # UI 模式
  npm run test:coverage  # 覆盖率报告
  npm run test:run       # 单次运行
  ```

### TypeScript 配置

- `tsconfig.json` - Vue 3 + Vite 配置（target ES2020, strict: true）
- `tsconfig.node.json` - Node/Electron 配置
- TypeScript 版本：6.0.3
- 严格模式：`strict: true` + `noUnusedLocals` + `noUnusedParameters`
- 路径别名：`@/*` -> `src/*`
- 目标：ES2020

### 代码检查与格式化

- **ESLint**：eslint 10 + eslint-plugin-vue + @stylistic/eslint-plugin
- **Prettier**：统一的代码格式化规则
- 运行 `npm run check` 进行全面检查（类型检查 + ESLint）
- 运行 `npm run format` 格式化代码

### 共享默认值

CLI 配置默认值集中在 `src/shared/defaults.ts` 中管理，通过 `applyDefaults()` 函数在初始化、profile 切换、profile 删除等多处复用，避免默认值散落导致不一致。

## 开发建议

### 添加新页面

1. 在 `src/views/` 创建 `MyView.vue`
2. 在 `src/App.vue` 中添加路由条件：
   ```vue
   const MyView = defineAsyncComponent(() => import('./views/MyView.vue'))
   <MyView v-if="currentSection === 'myview'" />
   ```
3. 在 `SideBar.vue` 中添加导航项
4. 如果不需要 Pinia store，状态数据通过 props 从 `App.vue` 传入，保持数据流清晰
5. 添加国际化键值到 `src/locales/index.js`

### 添加新 IPC 接口

1. 在 `src/main/ipc/` 对应文件中添加处理器
2. 在 `src/preload.js` 中暴露 API
3. 在渲染进程通过 `window.electronAPI.xxx()` 调用
4. 添加错误处理包装器 `wrapIpcHandler`
5. 在 `src/main/ipc/index.js` 的 `registerIpcHandlers` 中注册

### 添加新依赖

```bash
npm install <package-name>
# 若需类型定义
npm install -D @types/<package-name>
```

### 调试技巧

- 主进程调试：在 `package.json` 的 `start` 脚本中添加 `--inspect` 参数
- 渲染进程调试：Ctrl+Shift+I 打开 DevTools
- 查看日志：应用日志存储在 `~/.iflow/logs/`
- 测试运行：`npm run test:ui` 打开 UI 界面
- 浏览器开发模式：`npm run dev` 启动 Vite Dev Server，在浏览器中预览和调试界面（无需 Electron）

---

最后更新：2026-06-23
维护者：iFlow 团队
