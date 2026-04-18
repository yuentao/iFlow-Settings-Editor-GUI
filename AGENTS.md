# iFlow Settings Editor - AI Context

## 项目概述

**iFlow 设置编辑器** 是一个用于编辑 iFlow CLI 配置文件 (`~/.iflow/settings.json`) 的桌面应用程序，采用 Electron + Vue 3 技术栈构建。

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron 28 + Vue 3.4 |
| 构建工具 | Vite 8 |
| CSS 预处理器 | Less |
| 国际化 | vue-i18n 9 |
| 测试框架 | Vitest 4 + happy-dom |
| 打包工具 | electron-builder 24 |
| 图标库 | @icon-park/vue-next |

### 核心架构

```
┌─────────────────────────────────────────────────────┐
│                    Electron 主进程                    │
│  main.js - 窗口管理、系统托盘、IPC 通信、文件读写       │
│  preload.js - 安全桥接 (contextBridge)               │
└─────────────────────────────────────────────────────┘
                          ↕ IPC
┌─────────────────────────────────────────────────────┐
│                   Vue 3 渲染进程                      │
│  src/App.vue - 根组件                               │
│  ├── TitleBar.vue - 自定义标题栏                     │
│  ├── SideBar.vue - 侧边导航                          │
│  ├── Footer.vue - 底部栏                             │
│  └── views/                                         │
│      ├── GeneralSettings.vue - 基础设置              │
│      ├── ApiConfig.vue - API 配置管理                │
│      └── McpServers.vue - MCP 服务器管理             │
└─────────────────────────────────────────────────────┘
```

### 配置文件

- **路径**: `~/.iflow/settings.json`
- **编码**: UTF-8 JSON
- **备份**: 自动生成 `.bak` 备份文件

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式 (Vite Dev Server)
npm run dev

# Electron 开发模式 (并行启动 Vite + Electron)
npm run electron:dev

# 构建生产版本
npm run build

# 打包 Windows 安装包 (x64)
npm run build:win

# 打包 Windows 便携版
npm run build:win-portable

# 打包 Windows 安装程序 (NSIS)
npm run build:win-installer

# 运行测试
npm run test

# 测试 UI 模式
npm run test:ui

# 测试覆盖率
npm run test:coverage

# 单次运行测试
npm run test:run
```

## 设计规范

### Windows 11 Fluent Design

项目采用 Windows 11 Fluent Design 设计系统，核心规范：

| 属性 | 规范 |
|------|------|
| 字体 | Segoe UI Variable, Segoe UI, system-ui |
| 等宽字体 | Cascadia Code, Consolas |
| 圆角 | 4px (sm) / 6px / 8px (lg) / 12px (xl) |
| 阴影 | 四级层次 (sm///lg/xl) |
| 过渡动画 | 0.1-0.2s ease, 0.15s cubic-bezier(0.4, 0, 0.2, 1) |

### 主题系统

支持三种主题：`Light` (浅色) / `Dark` (深色) / `System` (跟随系统)

CSS 变量定义在 `src/styles/global.less`，包括：
- `--bg-primary/secondary/elevated` - 背景层级
- `--text-primary/secondary/tertiary` - 文本层级
- `--accent` - 主题色 (Windows Blue)
- `--success/warning/danger/info` - 状态色

### 亚克力效果

支持可调节透明度的 Mica-inspired 亚克力效果：
- 背景透明度随 `acrylicIntensity` (0-100) 变化
- 深色/浅色主题有独立的透明度计算逻辑

## 项目结构

```
src/
├── main.js              # Vue 应用入口
├── App.vue              # 根组件
├── components/
│   ├── TitleBar.vue     # 标题栏 (窗口控制按钮)
│   ├── SideBar.vue      # 侧边导航栏
│   ├── Footer.vue       # 底部栏
│   ├── InputDialog.vue  # 输入对话框
│   ├── MessageDialog.vue # 消息对话框
│   ├── ApiProfileDialog.vue # API 配置弹窗
│   └── ServerPanel.vue  # 服务器编辑面板
├── views/
│   ├── GeneralSettings.vue # 常规设置视图
│   ├── ApiConfig.vue    # API 配置视图
│   └── McpServers.vue   # MCP 服务器视图
├── locales/
│   ├── index.js         # 中文 (zh-CN)
│   ├── en-US.js         # 英文
│   └── ja-JP.js         # 日文
└── styles/
    └── global.less      # 全局样式 (Windows Fluent Design)
```

## 关键模块

### IPC 通信

**preload.js** 暴露的 API：

```javascript
// 设置操作
window.electronAPI.loadSettings()
window.electronAPI.saveSettings(data)

// 窗口控制
window.electronAPI.minimize()
window.electronAPI.maximize()
window.electronAPI.close()
window.electronAPI.isMaximized()

// API 配置管理
window.electronAPI.listApiProfiles()
window.electronAPI.switchApiProfile(name)
window.electronAPI.createApiProfile(name)
window.electronAPI.deleteApiProfile(name)
window.electronAPI.renameApiProfile(oldName, newName)
window.electronAPI.duplicateApiProfile(sourceName, newName)
```

### API 配置管理

配置文件内使用 `apiProfiles` 对象存储多个配置：

```json
{
  "currentApiProfile": "default",
  "apiProfiles": {
    "default": { "apiKey": "...", "baseUrl": "..." },
    "production": { "apiKey": "...", "baseUrl": "..." }
  }
}
```

### 系统托盘

- 窗口关闭时隐藏到托盘而非退出
- 托盘菜单支持快速切换 API 配置
- 双击托盘图标显示主窗口

## 代码风格

### Vue 3 Composition API

使用 `<script setup>` 语法：

```vue
<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const settings = ref({})
const modified = computed(() => ...)

const updateSettings = () => { ... }

watch(settings, () => { ... }, { deep: true })

onMounted(async () => { ... })
</script>
```

### 样式规范

- 使用 Less 预处理器
- 通过 CSS 变量 (`var(--xxx)`) 使用主题色
- 组件样式使用 BEM-like 命名或直接使用功能类名
- 动画使用 `@keyframes` 定义

### 测试规范

- 测试文件命名: `*.test.js` 或 `*.spec.js`
- 使用 Vitest + @vue/test-utils
- DOM 测试环境: happy-dom
- 覆盖范围排除: node_modules, dist, release, build

## 快捷键与交互

| 操作 | 说明 |
|------|------|
| 窗口关闭 | 隐藏到系统托盘 |
| 双击托盘 | 显示主窗口 |
| Ctrl+S | 自动保存设置 (通过 watch 监听) |

## 常见问题

1. **图标不显示**: 检查 `build/icon.ico` 是否存在
2. **配置不保存**: 确认 `~/.iflow/settings.json` 目录可写
3. **亚克力效果异常**: 检查 `acrylicIntensity` 值是否在 0-100 范围内
