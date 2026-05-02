# iFlow Settings Editor

一个用于编辑 iFlow CLI 配置文件的桌面应用程序。

> 🌍 文档语言： [简体中文](./README.md) | [English](./README-en.md) | [日本語](./README-ja.md)

![iFlow Settings Editor](./screenshots/仪表盘.png)

## 功能特性

- 📝 **API 配置管理** - 支持多环境配置文件切换、创建、编辑、重命名、复制、删除和拖动排序
- 🔄 **自动更新检查** - 启动时自动检查更新，支持手动检查，下载进度实时显示，可随时取消
- 📥 **后台下载支持** - 更新可在后台静默下载，进度在设置页面实时显示，完成后一键安装
- 🖥️ **MCP 服务器管理** - 便捷的 Model Context Protocol 服务器配置界面
- ⚡ **Commands 命令管理** - 可视化管理 iFlow 命令，支持创建、编辑、删除、导入/导出和按类别筛选
- 🎨 **Windows 11 设计风格** - 采用 Fluent Design 设计规范
- 🌈 **多主题支持** - Light / Dark / System (跟随系统) 三种主题
- 🌍 **国际化** - 支持简体中文、English、日語
- 💧 **亚克力效果** - 可调节透明度的现代视觉效果
- 🧩 **技能管理** - 本地和在线导入、导出、删除 iFlow 技能
- 📦 **系统托盘** - 最小化到托盘，快速切换 API 配置
- 🚀 **开机自启动** - 支持开机自动启动，始终以静默模式运行（不显示窗口）
- 📊 **仪表盘视图** - 直观展示当前配置状态和快捷操作
- ☁️ **云同步功能** - 支持 WebDAV 协议的云端配置同步，端到端加密保障数据安全，多设备间无缝同步设置
- 🔧 **TypeScript 类型安全** - 全面 TypeScript 迁移，提供完整的类型推导和编译时检查
- 🧱 **模块化架构** - 主进程模块化重构，代码结构更清晰，维护性更高
- 🧪 **完善测试覆盖** - 组件和 Store 单元测试全覆盖，确保功能稳定可靠
- ✅ **统一验证框架** - 统一的表单验证和错误处理机制
- ⚙️ **CLI 行为控制** - 细粒度控制 CLI 运行时的各项行为（内存显示、会话限制、工具排除、审批模式等）

## 技术栈

| 技术 | 版本 |
|------|------|
| Electron | 28.0.0 |
| Vue | 3.4.0 |
| Vite | 8.0.8 |
| vue-i18n | 9.14.5 |
| Pinia | 3.0.4 |
| TypeScript | 6.0.3 |
| Less | 4.6.4 |
| Vitest | 4.1.4 |
| electron-builder | 24.13.3 |
| @icon-park/vue-next | 1.4.2 |
| @vueuse/core | 14.2.1 |
| @iarna/toml | 2.2.5 |
| fast-xml-parser | 5.7.2 |
| marked | 18.0.2 |
| adm-zip | 0.5.17 |
| electron-log | 5.4.3 |
| electron-updater | 6.8.3 |

## 支持的系统

- Windows 10 / 11 (x64)
- macOS 12+ (x64 / arm64)

## 安装

### 从源码运行

```bash
# 克隆项目
git clone https://git.pandorastudio.cn/product/iFlow-Settings-Editor-GUI.git

# 进入目录
cd iFlow-Settings-Editor-GUI

# 安装依赖
npm install

# 开发模式运行
npm run electron:dev
```

### 构建安装包

```bash
# 构建 Windows 安装包 (x64)
npm run build:win

# 构建便携版
npm run build:win-portable

# 构建 NSIS 安装程序
npm run build:win-installer

# 构建 macOS 安装包 (x64 + arm64)
npm run build:mac

# 构建 macOS 指定架构
npm run build:mac64   # 仅 x64
npm run build:mac-arm # 仅 arm64

# 构建 macOS DMG 安装包
npm run build:mac-dmg

# 构建 macOS ZIP 压缩包
npm run build:mac-zip
```

构建完成后，安装包位于 `release/` 目录下。

### 开发命令

```bash
# TypeScript 类型检查
npm run type-check

# 开发模式运行 (Vite Dev Server)
npm run dev

# Electron 开发模式 (并行启动 Vite + Electron)
npm run electron:dev
```

### CI/CD

项目使用 GitHub Actions 进行持续集成和发布：

- **推送标签** `v*` 自动构建并创建 GitHub Release
- 支持 Windows (x64) 和 macOS (x64/arm64) 多平台构建
- 自动提取 CHANGELOG.md 生成发布说明

```bash
# 触发发布
git tag v1.9.0
git push origin v1.9.0
```

## 使用说明

### 基础设置

![基本设置](./screenshots/基本设置.png)

在「基础设置」页面可以设置：

#### 偏好设置
- **语言** - 界面显示语言（简体中文 / English / 日本語）
- **主题** - 视觉主题风格（Light / Dark / System）
- **显示内存使用** - 在标题栏显示内存占用
- **隐藏横幅** - 隐藏启动时的欢迎横幅
- **亚克力效果** - 调节窗口背景透明度（0-100%）

#### 开机自启动
- **开机自启动** - 控制应用是否随系统启动（启用后始终以静默模式运行，不显示窗口）

#### 其他设置
- **最大会话轮次** - 限制对话的最大轮次
- **禁用自动更新** - 关闭自动更新检查
- **自动配置 Node.js 内存** - 根据系统内存自动调整最大堆大小
- **禁用遥测** - 关闭使用数据收集
- **Token 限制** - 设置单次请求的 token 上限
- **压缩 Token 阈值** - 设置触发压缩的 token 比例
- **跳过下一说话者检查** - 允许连续同一说话者
- **Shell 超时** - 命令执行超时时间（秒）
- **连接轮询间隔** - 网络连接检查间隔
- **审批模式** - 选择命令执行审批策略（yolo/plan/autoEdit/default）
- **启用思维链模式** - 开启 AI 的深度思考模式
- **排除工具** - 指定不加载的工具列表
  ![其他设置](./screenshots/其他设置.png)

#### 关于
- **版本信息** - 显示当前应用版本和版权信息
- **手动检查更新** - 点击按钮立即检查新版本（下载进度实时显示，支持取消）
- **自动更新** - 开启/关闭自动更新检查（后台下载，完成后一键安装）

### API 配置管理

![编辑API配置](./screenshots/API配置.png)

在「API 配置」页面可以：

- **切换配置** - 点击不同配置文件快速切换
- **新建配置** - 创建新的 API 环境配置
  ![新建API配置](./screenshots/新建API配置.png)
- **编辑配置** - 修改现有配置的名称、认证方式、API Key、Base URL、模型名称等；支持从 API 自动获取可用模型列表
- **重命名配置** - 为配置设置新名称（当前使用中的配置不可重命名）
- **复制配置** - 复制现有配置创建新配置
- **拖动排序** - 拖动配置文件调整显示顺序
- **删除配置** - 删除不需要的配置（默认配置不可删除）

支持的认证方式：
- API Key
- OpenAI 兼容

### MCP 服务器管理

![MCP服务器管理](./screenshots/MCP服务器.png)

在「MCP 服务器」页面可以：

- **添加服务器** - 配置新的 MCP 服务器（支持 stdio、sse、streamable-http 传输类型）
  ![快速添加MCP服务器](./screenshots/快速添加MCP服务器.png)
- **编辑服务器** - 修改服务器的名称、描述、命令、参数、环境变量等
  ![添加MCP服务器](./screenshots/添加MCP服务器.png)
- **删除服务器** - 移除不需要的服务器
- **快速添加** - 通过粘贴 JSON、命令行或 URL 文本快速批量添加 MCP 服务器（自动解析并去重）
- **环境变量配置** - 为每个服务器设置独立的环境变量

支持三种传输类型：
- **stdio** - 标准输入输出模式（本地进程）
- **sse** - Server-Sent Events 模式（HTTP 服务）
- **streamable-http** - 流式 HTTP 模式

### 技能管理

![技能管理](./screenshots/技能管理.png)

在「技能」页面可以：

- **本地导入** - 从本地 ZIP 压缩包导入技能
- **在线导入** - 从 GitHub URL 导入技能
- **导出技能** - 将技能导出到指定目录
- **删除技能** - 移除不需要的技能

### Commands 命令管理

![命令管理](./screenshots/命令管理.png)

在「Commands」页面可以：

- **命令列表** - 查看所有可用的 iFlow 命令，支持按类别筛选（utility、documentation、other）
- **创建命令** - 通过编辑器对话框创建新的自定义命令
- **编辑命令** - 修改命令的名称、描述、类别、版本、作者和提示词（Prompt）
- **导出命令** - 将命令导出为 JSON 文件到本地
- **删除命令** - 移除不需要的命令
- **导入命令** - 从本地 JSON 文件导入命令

命令编辑器支持以下字段：
- **名称** - 命令唯一标识符（字母、数字、下划线、连字符）
- **描述** - 命令功能说明
- **类别** - 分类标签（utility/documentation/other）
- **版本** - 命令版本号
- **作者** - 创建者信息（可选）
- **提示词** - 命令的具体内容或指令

命令以 JSON 格式存储，可灵活管理和分享。

### 云同步管理

![云同步设置](./screenshots/云同步设置.png)

在「云同步」页面可以：

- **配置 WebDAV 服务器** - 输入服务器地址、用户名、密码等信息
- **测试连接** - 验证 WebDAV 服务器连通性和权限
  ![测试连接](./screenshots/其他设置.png)
- **手动同步** - 点击「立即同步」按钮将本地配置上传到云端或从云端下载
- **自动同步** - 开启后会在设置变更时自动同步到云端
- **查看同步状态** - 实时显示最后同步时间、同步错误等信息
- **清除云端数据** - 一键清除云端存储的所有配置数据
- **设备管理** - 查看和管理已同步的设备列表
- **密码保护** - 设置同步密码，确保数据端到端加密安全

**同步内容**：目前支持 API 配置和 MCP 服务器的同步，技能和命令即将支持。

**安全设计**：
- 所有同步数据在客户端加密后上传
- 基于时间戳的智能增量合并
- 字段级深度合并，保留双方修改
- tombstone 机制防止已删除项目反复复活

### 系统托盘

![托盘图标](./screenshots/托盘图标.png)

- 关闭窗口时，应用会最小化到系统托盘
- 双击托盘图标可重新显示主窗口
- 右键托盘菜单可快速切换 API 配置

## 配置文件

应用配置文件位于：

```
~/.iflow/settings.json
```

每次保存时会自动生成备份文件 `settings.json.bak`。

## 测试

项目使用 **Vitest 4.x** 作为测试框架，配合 **happy-dom** 提供 DOM 测试环境。

```bash
# 运行测试（监听模式）
npm run test

# UI 模式测试（可视化界面）
npm run test:ui

# 测试覆盖率报告
npm run test:coverage

# 单次运行测试（CI 模式）
npm run test:run
```

### 测试覆盖范围

- **组件测试**：TitleBar, SideBar, InputDialog, MessageDialog, ApiProfileDialog, ServerPanel, EmptyState, SkeletonLoader, UpdateNotification, UpdateProgress 等
- **视图测试**：GeneralSettings, ApiConfig, McpServers, SkillsView, Dashboard 等
- **Store 测试**：settings, apiProfiles, skills, commands 等状态管理模块
- **单元测试**：工具函数、组合式函数、类型定义等

测试文件与源文件同目录，命名为 `*.test.js` 或 `*.test.ts`。

## 项目结构

```
iFlow-Settings-Editor-GUI/
├── main.js              # Electron 主进程入口
├── preload.js           # 预加载脚本
├── index.html           # 入口 HTML
├── vite.config.js       # Vite 配置
├── vitest.config.js     # Vitest 测试配置
├── tsconfig.json        # TypeScript 配置
├── build/               # 构建资源
├── dist/                # Vite 构建输出
├── release/             # Electron Builder 输出
├── screenshots/         # 应用截图
└── src/
    ├── main.js          # Vue 入口
    ├── App.vue          # 根组件
    ├── components/      # 公共组件
    │   ├── TitleBar.vue        # 标题栏
    │   ├── SideBar.vue         # 侧边导航
    │   ├── InputDialog.vue     # 输入对话框
    │   ├── MessageDialog.vue   # 消息对话框
    │   ├── ApiProfileDialog.vue # API 配置弹窗
    │   ├── ServerPanel.vue     # 服务器编辑面板
    │   ├── CommandEditorDialog.vue # 命令编辑对话框
    │   ├── EmptyState.vue      # 空状态组件
    │   ├── SkeletonLoader.vue  # 骨架屏加载
    │   ├── UpdateNotification.vue # 更新通知
    │   └── UpdateProgress.vue  # 更新进度
    ├── composables/     # 组合式函数
    │   ├── useLocale.ts        # 国际化钩子
    │   └── useSettings.ts      # 设置钩子
    ├── views/           # 页面视图
    │   ├── GeneralSettings.vue # 常规设置
    │   ├── ApiConfig.vue      # API 配置管理
    │   ├── McpServers.vue     # MCP 服务器管理
    │   ├── SkillsView.vue     # 技能管理
    │   ├── CommandsView.vue   # 命令管理
    │   └── Dashboard.vue      # 仪表盘
    ├── main/            # Electron 主进程模块
    │   ├── index.js           # 主进程入口
    │   ├── constants.js       # 常量定义
    │   ├── window.js          # 窗口管理
    │   ├── tray.js            # 托盘管理
    │   ├── ipc/               # IPC 处理器
    │   │   ├── apiProfiles.js # API 配置 IPC
    │   │   ├── commands.js    # 命令 IPC
    │   │   ├── dialogs.js     # 对话框 IPC
    │   │   ├── index.js       # IPC 聚合
    │   │   ├── settings.js    # 设置 IPC
    │   │   ├── skills.js      # 技能 IPC
    │   │   ├── updates.js     # 更新 IPC
    │   │   └── cloud.js       # 云同步 IPC
    │   ├── services/          # 主进程服务
    │   │   ├── autoLaunchService.js # 自启动服务
    │   │   ├── configService.js # 配置服务
    │   │   └── cloud/         # 云同步服务
    │   │       └── WebDAVProvider.js # WebDAV 适配器
    │   └── utils/             # 工具模块
    │       ├── errors.js      # 错误定义
    │       ├── logger.js      # 日志工具
    │       ├── translations.js # 翻译工具
    │       └── validator.js   # 验证器
    ├── stores/          # Pinia 状态管理 (TypeScript)
    │   ├── apiProfiles.ts     # API 配置状态
    │   ├── commands.ts        # 命令状态
    │   ├── settings.ts        # 设置状态
    │   ├── skills.ts          # 技能状态
    │   ├── cloudSync.ts       # 云同步状态
    │   ├── ui.ts              # UI 状态
    │   └── index.js           # Store 聚合
    ├── locales/         # 国际化语言包
    │   ├── en-US.js    # 英文
    │   ├── index.js    # 中文（简体）
    │   └── ja-JP.js    # 日文
    ├── styles/          # 全局样式
    │   └── global.less # Windows Fluent Design 样式
    └── shared/          # 共享类型定义
        └── types.ts    # TypeScript 类型声明
```

## 许可证

MIT License

## 联系方式

- 公司: 上海潘哆呐科技有限公司
- 项目地址: https://git.pandorastudio.cn/product/iFlow-Settings-Editor-GUI
