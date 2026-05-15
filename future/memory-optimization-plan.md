# 内存优化方案

> 创建日期: 2026-05-15
> 目标: 将后台运行时内存占用从 115-150MB 降至 80-100MB

## 当前内存状况

应用在后台运行时占用 **115-150MB**，在 Electron + Vue 3 应用中属于中等水平。主要内存消耗分布：

| 模块 | 估算内存 | 说明 |
|------|---------|------|
| 渲染进程 (Vue 3) | ~60-80MB | 组件、Pinia stores、i18n、响应式系统 |
| 主进程 (Electron) | ~30-40MB | IPC handlers、tray、autoUpdater、SyncService |
| V8 堆外内存 | ~20-30MB | 深拷贝临时对象、DOM 树、亚克力效果 |

## 优化项

### 1. [高] settings 深度 watcher 防抖

**问题**: `watch(settings, ..., { deep: true })` 在每次属性变更时都执行全量深拷贝 + IPC 调用。用户在输入框中每敲一个字符或切换开关，都会触发一次 `JSON.parse(JSON.stringify())` + `saveSettings` IPC。

**方案**: 改为 500ms 防抖保存，合并连续修改为一次 IPC 调用。

**改动文件**: `src/App.vue`

```diff
+ let _settingsSaveTimer = null
+ const SETTINGS_SAVE_DELAY = 500

+ const debouncedSaveSettings = () => {
+   if (_settingsSaveTimer) clearTimeout(_settingsSaveTimer)
+   _settingsSaveTimer = setTimeout(async () => {
+     _settingsSaveTimer = null
+     const dataToSave = JSON.parse(JSON.stringify(settings.value))
+     await window.electronAPI.saveSettings(dataToSave)
+   }, SETTINGS_SAVE_DELAY)
+ }

  watch(settings, () => {
    if (!isLoading.value) {
      if (skipNextSaveSettings.value) { ... return }
      modified.value = true
-     const dataToSave = JSON.parse(JSON.stringify(settings.value))
-     await window.electronAPI.saveSettings(dataToSave)
+     debouncedSaveSettings()
    }
  }, { deep: true })
```

**预期收益**: ~10-20MB（减少临时对象和 GC 频率）

---

### 2. [高] 窗口隐藏到托盘时暂停后台活动

**问题**: 用户关闭窗口到托盘后，渲染进程仍在全速运行：
- `ApiConfig.vue` 的连通性轮询（`setInterval`）持续运行
- 所有 Vue watcher 和 computed 仍在响应变化
- DOM 树和所有组件实例完整保留

**方案**: 监听 `document.visibilitychange`，窗口隐藏时暂停非关键活动。

**改动文件**: `src/App.vue`, `src/views/ApiConfig.vue`

```diff
// App.vue
+ let _windowHidden = false

  onMounted(() => {
+   document.addEventListener('visibilitychange', () => {
+     _windowHidden = document.hidden
+   })
  })

// ApiConfig.vue - 连通性轮询
+ watch(documentVisibility, (hidden) => {
+   if (hidden) clearInterval(connectivityTimer)
+   else startConnectivityPolling()
+ })
```

**预期收益**: ~15-30MB（暂停轮询和响应式更新）

---

### 3. [高] 减少 JSON.parse(JSON.stringify()) 深拷贝

**问题**: 代码中 20+ 处使用 `JSON.parse(JSON.stringify(x))` 深拷贝，每次调用都创建完整对象图副本。

**方案**: 使用 `structuredClone()`（现代浏览器/Node 17+ 原生支持，性能优于 JSON roundtrip），不需要深拷贝的地方改用浅拷贝。

**改动文件**: `src/App.vue` 及相关文件

```diff
- const data = JSON.parse(JSON.stringify(result.data))
+ const data = structuredClone(result.data)
```

**预期收益**: ~5-10MB（减少 GC 压力）

---

### 4. [中] 懒加载语言包

**问题**: `main.js` 启动时同时加载 zh-CN、en-US、ja-JP 三个语言包。

**方案**: 启动时只加载默认语言，切换时动态加载。

**改动文件**: `src/main.js`

```diff
- import zhCN from './locales/index.js'
- import enUS from './locales/en-US.js'
- import jaJP from './locales/ja-JP.js'

+ const loadLocale = async (lang) => {
+   switch(lang) {
+     case 'en-US': return (await import('./locales/en-US.js')).default
+     case 'ja-JP': return (await import('./locales/ja-JP.js')).default
+     default: return (await import('./locales/index.js')).default
+   }
+ }
```

**预期收益**: ~1-2MB

---

### 5. [低] 主进程优化

**问题**: 
- `cloud.js` 的 `getSyncService()` 懒加载但初始化标志永久为 true
- 自动更新模块在禁用更新时仍注册事件监听

**方案**: 
- 维持现状（影响很小）
- 在 `autoUpdate === false` 时跳过 `initAutoUpdater()` 中的事件注册

**改动文件**: `src/main/index.js`

**预期收益**: ~2-5MB

---

### 6. [低] Toast 定时器管理

**问题**: `useToast.ts` 的 `timers` Map 在 toast 消失后清理，但极端情况下可能累积。

**方案**: 确认清理逻辑完整（当前已使用 `clearTimer` + `Map.delete`），无需改动。

**预期收益**: 极小

---

## 实施优先级

1. **防抖 watcher** — 改动最小、收益最大
2. **窗口隐藏节流** — 需要修改 App.vue + ApiConfig.vue
3. **减少深拷贝** — 替换 `JSON.parse(JSON.stringify())` 为 `structuredClone()`
4. **懒加载语言包** — 修改 main.js
5. **主进程优化** — 可选

## 预期总收益

| 优化项 | 预期内存节省 |
|--------|------------|
| 防抖 watcher | ~10-20MB |
| 窗口隐藏节流 | ~15-30MB |
| 减少深拷贝 | ~5-10MB |
| 懒加载语言包 | ~1-2MB |
| **总计** | **~30-60MB** |

后台运行时有望从 **115-150MB** 降至 **80-100MB**。