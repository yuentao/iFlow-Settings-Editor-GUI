/**
 * iFlow Settings Editor - 主进程入口
 *
 * 已迁移到模块化结构: src/main/index.js
 *
 * 此文件保留作为向后兼容入口点。
 * package.json 的 "main" 字段已指向 src/main/index.js，
 * 因此正常运行时不执行此文件。
 *
 * 如果直接运行 `electron main.js`，此文件会引导到模块化入口。
 */

const { app } = require('electron')
const path = require('path')

// 导入模块化的主进程入口
const { initializeApp } = require('./src/main/index')

// 设置应用路径
app.setAppUserModelId('com.pandorastudio.iflow-settings-editor')

// 引导到模块化入口
console.log('main.js loaded - delegating to src/main/index.js')

// 初始化应用
app.whenReady().then(() => {
  initializeApp()
})

// 保留必要的生命周期事件以确保完全向后兼容
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不自动退出，保持托盘运行
    // 实际退出逻辑在 src/main/index.js 中处理
  }
})

app.on('activate', () => {
  // macOS 激活处理在 src/main/index.js 中
})

app.on('before-quit', () => {
  // 实际清理逻辑在 src/main/index.js 中处理
})

app.on('will-quit', () => {
  // 实际清理逻辑在 src/main/index.js 中处理
})

console.log('main.js initialization complete')