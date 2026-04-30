# iFlow Settings Editor - AI Context

## 项目概述

**iFlow 设置编辑器** 是一个用于编辑 iFlow CLI 配置文件 (`~/.iflow/settings.json`) 的桌面应用程序，采用 **Electron + Vue 3** 技术栈构建，支持多语言（中文/英文/日文）和云同步功能。

### 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Electron | 28.0.0 |
| 前端 | Vue 3 | 3.4.0 |
| 构建工具 | Vite | 8.0.8 |
| 路由/状态 | Vue Router (未使用) / Pinia | 3.0.4 |
| CSS 预处理器 | Less | 4.6.4 |
| 国际化 | vue-i18n | 9.14.5 |
| 测试框架 | Vitest + happy-dom | 4.1.4 |
| 测试工具 | @vue/test-utils | 2.4.6 |
| 打包工具 | electron-builder | 24.13.3 |
| 图标库 | @icon-park/vue-next | 1.4.2 |
| XML 解析 | fast-xml-parser | 5.7.2 |
| Markdown 解析 | marked | 18.0.2 |
| TOML 支持 | @iarna/toml | 2.2.5 |
| ZIP 处理 | adm-zip | 0.5.17 |
| 日志 | electron-log | 5.4.3 |
| 自动更新 | electron-updater | 6.8.3 |

### 核心架构

```
┌─────────────────────────────────────────────────────┐
│                    Electron 主进程                    │
│  src/main/index.js - 应用入口                        │
│  src/main/window.js - 窗口管理                       │
│  src/main/tray.js - 系统托盘                         │
│  src/main/ipc/ - IPC 通信处理器                      │
│    ├── settings.js      - 设置读写                   │
│    ├── apiProfiles.js   - API 配置管理               │
│    ├── skills.js        - 技能管理                   │
│    ├── commands.js      - 命令管理                   │
│    ├── cloud.js         - 云同步 (WebDAV)            │
│    ├── dialogs.js       - 对话框控制                 │
│    └── updates.js       - 自动更新                   │
│  src/main/services/ - 业务服务                       │
│    ├── configService.js - 配置服务                   │
│    ├── autoLaunchService.js - 自启动服务             │
│    ├── SyncService.js   - 云同步核心逻辑             │
│    └── cloud/           - 云存储适配器               │
│        └── WebDAVProvider.js - WebDAV 实现           │
│  src/main/crypto/CryptoManager.js - 加密管理器       │
└─────────────────────────────────────────────────────┘
                          ↕ IPC (preload.js)
┌─────────────────────────────────────────────────────┐
│                   Vue 3 渲染进程                      │
│  src/App.vue - 根组件                               │
│  ├── components/ - 通用组件                          │
│  │   ├── TitleBar.vue     - 自定义标题栏             │
│  │   ├── SideBar.vue      - 侧边导航                 │
│  │   ├── InputDialog.vue  - 输入对话框               │
│  │   ├── MessageDialog.vue - 消息对话框              │
│  │   ├── ConfirmDialog.vue - 确认对话框              │
│  │   ├── ApiProfileDialog.vue - API 配置弹窗         │
│  │   ├── ServerPanel.vue  - 服务器编辑面板           │
│  │   ├── SkeletonLoader.vue - 骨架屏加载             │
│  │   ├── UpdateNotification.vue - 更新通知           │
│  │   ├── UpdateProgress.vue - 下载进度               │
│  │   └── CommandEditorDialog.vue - 命令编辑器        │
│  ├── views/ - 页面视图                               │
│  │   ├── Dashboard.vue     - 仪表盘                  │
│  │   ├── GeneralSettings.vue - 基础设置              │
│  │   ├── ApiConfig.vue     - API 配置管理            │
│  │   ├── McpServers.vue    - MCP 服务器管理          │
│  │   ├── SkillsView.vue    - 技能管理                │
│  │   └── CommandsView.vue  - 命令管理 (新增)         │
│  ├── stores/ - Pinia 状态管理                        │
│  │   ├── settings.ts      - 设置状态                 │
│  │   ├── apiProfiles.ts   - API 配置状态             │
│  │   ├── skills.ts        - 技能状态                 │
│  │   ├── commands.ts      - 命令状态 (新增)          │
│  │   ├── cloudSync.ts     - 云同步状态 (新增)        │
│  │   ├── ui.ts            - UI 状态                  │
│  │   └── index.js         - 入口                     │
│  ├── locales/ - 国际化资源                          │
│  │   ├── index.js (zh-CN)                           │
│  │   ├── en-US.js                                  │
│  │   └── ja-JP.js                                  │
│  └── styles/ - 全局样式                             │
│      └── global.less (Windows Fluent Design)        │
└─────────────────────────────────────────────────────┘
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

**preload.js** 暴露的安全 API（通过 contextBridge）：

```javascript
// 基础设置操作
window.electronAPI.loadSettings()
window.electronAPI.saveSettings(data)

// 窗口控制
window.electronAPI.minimize()
window.electronAPI.maximize()
window.electronAPI.close()
window.electronAPI.isMaximized()

// 开机自启动
window.electronAPI.getAutoLaunch()
window.electronAPI.setAutoLaunch(enabled)

// 自动更新
window.electronAPI.checkForUpdates()
window.electronAPI.downloadUpdate()
window.electronAPI.installUpdate()
window.electronAPI.getUpdateStatus()
window.electronAPI.onUpdateStatusChanged(callback)

// API 配置管理
window.electronAPI.listApiProfiles()
window.electronAPI.switchApiProfile(name)
window.electronAPI.createApiProfile(name)
window.electronAPI.deleteApiProfile(name)
window.electronAPI.renameApiProfile(oldName, newName)
window.electronAPI.duplicateApiProfile(sourceName, newName)

// 技能管理
window.electronAPI.listSkills()
window.electronAPI.importSkillLocal()
window.electronAPI.importSkillOnline(url, name)
window.electronAPI.exportSkill(name, folderName)
window.electronAPI.deleteSkill(name)

// 命令管理 (新增)
window.electronAPI.listCommands()
window.electronAPI.readCommand(name)
window.electronAPI.createCommand(name, data)
window.electronAPI.updateCommand(name, data)
window.electronAPI.deleteCommand(name)
window.electronAPI.exportCommand(name)
window.electronAPI.importCommand()

// 云同步 (新增 - WebDAV)
window.electronAPI.cloudSyncGetStatus()
window.electronAPI.cloudSyncSetAutoSync(enabled)
window.electronAPI.cloudSyncConfigureProvider(provider, config)
window.electronAPI.cloudSyncTestConnection()
window.electronAPI.cloudSyncRevokeAuth()
window.electronAPI.cloudSyncSetPassword(password)
window.electronAPI.cloudSyncVerifyPassword(password)
window.electronAPI.cloudSyncChangePassword(oldPassword, newPassword)
window.electronAPI.cloudSyncHasPassword()
window.electronAPI.cloudSyncGetRememberPassword()
window.electronAPI.cloudSyncSetRememberPassword(remember)
window.electronAPI.cloudSyncSyncNow(password)
window.electronAPI.cloudSyncPull(password)
window.electronAPI.cloudSyncPush(password)
window.electronAPI.cloudSyncClearCloud()
window.electronAPI.cloudSyncGetDevices()
window.electronAPI.cloudSyncSetDeviceName(name)
window.electronAPI.cloudSyncRemoveDevice(deviceId)

// 云同步事件监听 (新增)
window.electronAPI.onCloudSyncStatusChanged(callback)
window.electronAPI.onCloudSyncProgress(callback)
window.electronAPI.onCloudSyncConflict(callback)

// 事件监听
window.electronAPI.onApiProfileSwitched(callback)
window.electronAPI.notifyLanguageChanged()
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
      "modelName": "..."
    },
    "production": { ... }
  },
  "apiProfilesOrder": ["default", "production"]
}
```

**API 字段** (定义于 `src/main/constants.js`):
- `selectedAuthType` - 认证类型
- `apiKey` - API 密钥
- `baseUrl` - 基础 URL
- `modelName` - 模型名称

### 技能管理

技能文件夹位于 `~/.iflow/skills/`，每个技能是一个包含 `SKILL.md` 的文件夹：
- 支持本地 ZIP 导入
- 支持在线 URL 导入（GitHub tarball/zipball）
- 导出技能到指定目录
- 解析 SKILL.md 的 YAML front matter 获取名称和描述

### 命令管理 (新增)

命令系统用于管理 iFlow CLI 的自定义命令：
- 支持创建、读取、更新、删除命令
- 支持本地导入和在线导入
- 命令以 JSON 格式存储，包含名称、描述、内容等字段
- 可通过 `CommandsView.vue` 进行图形化管理

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

- 基于 `electron-updater` 实现
- 支持自动检查、后台下载、进度显示
- 支持延迟安装（稍后提醒）
- 更新包发布到 GitHub Releases
- 支持多语言更新提示

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

- **v1.14.0** (当前) - 新增命令管理、云同步（WebDAV）、自动更新优化
- **v1.13.x** - 改进 MCP 服务器管理、API 配置重构
- **v1.12.x** - 技能系统增强、导入导出优化
- **v1.11.x** - 首次公开发布

---

最后更新：2026-05-01
维护者：iFlow 团队