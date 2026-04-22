# GitHub Release 自动更新方案

## 一、技术选型

| 方案 | 说明 |
|------|------|
| **electron-updater** | 官方方案，需要配合 electron-builder 的 publish 配置使用 |
| **自实现 GitHub API** | 直接调用 GitHub Releases API，更灵活，不受发布配置限制 |

考虑到你的 package.json 中 publish: null（手动发布），建议采用**自实现方案**，通过 GitHub Releases API 检查更新。

## 二、核心模块设计

`
┌─────────────────────────────────────────────────────────┐
│                      主进程 (main.js)                     │
│  ├── updateChecker.js    - 检查更新、下载、安装           │
│  └── autoUpdater.js      - 定时检查、事件通知              │
└─────────────────────────────────────────────────────────┘
                          ↕ IPC
┌─────────────────────────────────────────────────────────┐
│                    渲染进程 (Vue)                         │
│  ├── UpdateNotification.vue - 更新提示组件                │
│  └── UpdateProgress.vue    - 下载进度组件                │
└─────────────────────────────────────────────────────────┘
`

## 三、实现步骤

### 1. 安装依赖
\\\ash
npm install electron-updater
# 或仅使用 Node.js 原生 fetch（Node 18+）
\\\

### 2. 主进程实现（main.js 或独立模块）
- etch('https://api.github.com/repos/{owner}/{repo}/releases/latest') 获取最新版本
- 比较 package.json 的 ersion 与最新 release tag
- 下载 *.exe 或 *.zip 附件
- 调用 electron-updater 的 utoUpdater.quitAndInstall()

### 3. IPC 通信设计
\\\javascript
// preload.js 暴露
window.electronAPI.checkForUpdates()      // 手动检查更新
window.electronAPI.onUpdateAvailable(cb)  // 监听更新可用
window.electronAPI.onUpdateDownloaded(cb) // 监听下载完成
window.electronAPI.onUpdateProgress(cb)   // 监听下载进度
window.electronAPI.downloadUpdate()      // 开始下载
window.electronAPI.installUpdate()        // 安装并重启
\\\

### 4. 渲染层 UI
- 检查更新时显示 UpdateNotification 对话框
- 下载时显示进度条 UpdateProgress
- 支持用户选择"立即更新"或"稍后提醒"

## 四、关键文件

| 文件 | 作用 |
|------|------|
| src/components/UpdateNotification.vue | 新增 - 更新提示弹窗 |
| src/components/UpdateProgress.vue | 新增 - 下载进度显示 |
| src/main.js | Electron 主进程入口 |
| preload.js | IPC 桥接 |
| src/locales/*.js | 国际化文本 |

## 五、注意事项

1. **GitHub Token**：频繁检查可能触发限流，建议添加 GitHub Token
2. **NSIS vs Portable**：便携版需要不同的安装逻辑
3. **自动 vs 手动**：默认手动检查更新，可选自动检查（启动时/定时）
4. **回退机制**：更新失败时保留旧版本恢复能力
