# iFlow Settings Editor - 全维度优化方案

> 生成日期: 2026-06-27
> 版本: v1.21.0
> 基于全代码库(~70文件, ~26,000行)深度分析

---

## 目录

1. [交互 (Interaction)](#1-交互-interaction)
2. [界面 (UI/Frontend)](#2-界面-uifrontend)
3. [布局 (Layout)](#3-布局-layout)
4. [排版 (Typography)](#4-排版-typography)
5. [逻辑 (Logic)](#5-逻辑-logic)
6. [语义 (Semantics)](#6-语义-semantics)
7. [安全性 (Security)](#7-安全性-security)
8. [鲁棒性 (Robustness)](#8-鲁棒性-robustness)
9. [优先级排序与实施路线图](#9-优先级排序与实施路线图)

---

## 1. 交互 (Interaction)

### 1.1 异步操作缺少加载状态

**问题**: 部分视图执行 IPC 异步操作时未提供本地 loading 状态，用户无法感知操作正在进行中。

**影响范围**:
- `SkillsView.vue` - importSkillLocal() / importSkillOnline()
- `CommandsView.vue` - createCommand() / exportCommand()
- `IflowModsView.vue` - iflowEnableMod() 切换
- `ProjectsView.vue` - deleteSession() / deleteProject()

**方案**: 为每个异步操作添加 loading ref，操作期间禁用按钮并显示加载指示器。

```vue
<button :disabled="isExporting" @click="handleExport">
  <span v-if="isExporting" class="spinner"></span>
  <Export v-else size="14" />
</button>
```

**工作量**: 中 | **优先级**: 高

### 1.3 破坏性操作缺少二次确认

**问题**: 部分删除/覆盖操作直接执行，没有二次确认对话框。

**影响范围**:
- `SkillsView.vue` - deleteSkill() 直接执行
- `CommandsView.vue` - deleteCommand() 直接执行

**方案**: 对操作名称中包含"删除"、"清除"等关键词的调用，应统一使用 `ConfirmDialog` 进行二次确认。

**工作量**: 小 | **优先级**: 高

### 1.4 操作反馈不充分

**问题**: 部分成功的操作没有 toast 提示，用户不知道操作是否完成。

**影响范围**: 多个视图的成功操作缺乏 toast.success() 反馈。

**方案**: 为无返回值且成功后关闭对话框或刷新列表的操作补充 toast.success()。

**工作量**: 小 | **优先级**: 中

### 1.5 按钮位置和间距不一致

**问题**: 页面底部操作按钮（保存、取消）的位置和间距在不同视图中不统一。

- `ApiProfileDialog.vue` 使用 `float: right`
- `ServerPanel.vue` 使用 `position: sticky; bottom: 0`
- `GeneralSettings.vue` 提供 `save-btn` 固定底部

**方案**: 统一对话框/侧面板底部按钮栏的布局模式，使用 `display: flex; justify-content: flex-end; gap: var(--space-md)`。

**工作量**: 小 | **优先级**: 中

### 1.6 长时间操作缺少进度提示

**问题**: Mod 冲突检测和应用、云同步等长时间操作缺少进度展示。

**影响范围**:
- `iflowService.js` 的 detectConflicts() - 大文件处理
- `SyncService.js` 的 sync() - 数据上传下载

**方案**: 
- 冲突检测已部分通过 `onIflowDetectConflictsProgress` 事件支持进度回调
- 云同步已通过 `onCloudSyncProgress` 支持进度百分比
- 确保所有长时间操作（> 2s）都通过 `ApplyingDialog.vue` 显示进度

**工作量**: 中 | **优先级**: 中

---

## 2. 界面 (UI/Frontend)

### 2.1 Fluent Reveal 效果未实现鼠标跟随

**问题**: `global.less` 中 `.btn` 的 radial-gradient 光晕效果使用了 CSS 变量 `--reveal-x` / `--reveal-y`，但没有任何 JS 动态设置这些变量的值，导致光晕始终从按钮中心开始，无法实现 Win11 Fluent Design 的鼠标跟随效果。

**影响范围**: 全局所有按钮

**方案**: 创建全局 Vue 指令 `v-reveal`，在 `@mousemove` 事件中动态计算光晕中心位置：

```typescript
// src/directives/reveal.ts
app.directive('reveal', {
  mounted(el: HTMLElement) {
    el.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--reveal-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
      el.style.setProperty('--reveal-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
    })
  }
})
```

**工作量**: 小 | **优先级**: 中

### 2.2 深色模式文字对比度不达标

**问题**: 深色模式下 `--text-tertiary: #808080` 在 `--bg-primary: #0d0d0d` 上的对比度约 4.0:1，低于 WCAG AA 标准 4.5:1。

**影响范围**: 所有使用 `--text-tertiary` 的辅助文本

**方案**: 调整深色模式 `--text-tertiary` 为 `#999999`（对比度 5.1:1）。

**工作量**: 极小 | **优先级**: 中

### 2.3 设置页表单间距不一致

**问题**: 各视图使用不同的 gap/spacing 值：
- `ApiConfig.vue` 使用 `gap: 12px`
- `GeneralSettings.vue` 部分使用 `var(--space-lg)`（16px）
- 部分地方使用硬编码 `8px`

**方案**: 统一定义 `.form-row { gap: var(--space-md) }`、`.page-actions { gap: var(--space-lg) }`，消除硬编码间距值。

**工作量**: 小 | **优先级**: 低

### 2.4 浅色/深色模式切换动画缺失

**问题**: 主题切换时所有颜色立即变化，缺乏过渡动画。

**方案**: 在 `body` 或 `.app` 上添加 `transition: background-color 0.3s ease, color 0.3s ease`，使主题切换视觉平滑。

**工作量**: 极小 | **优先级**: 低

### 2.5 Dashboard 图表默认状态不佳

**问题**: `ModelUsageChart.vue` 在无数据时显示空图表。

**方案**: 无数据时显示 EmptyState 占位，提示用户"暂无使用数据"。

**工作量**: 小 | **优先级**: 低

### 2.6 列表项 hover 状态不统一

**问题**: 不同列表的 hover 效果不一致——部分有背景色变化，部分没有。

**影响范围**: `GenericList.vue`、`SkillsView.vue` 的技能列表、`CommandsView.vue` 的命令列表

**方案**: 统一使用 `var(--bg-hover)` 变量，通过 `transition: background-color 0.15s ease` 实现平滑过渡。

**工作量**: 小 | **优先级**: 低

---

## 3. 布局 (Layout)

### 3.1 表单行缺少响应式断点

**问题**: `.form-row { grid-template-columns: repeat(2, 1fr) }` 在小窗口(<800px)下导致输入框被严重挤压。

**影响范围**: `GeneralSettings.vue` 的双列表单、`ApiProfileDialog.vue` 的配置编辑表单

**方案**: 添加响应式断点，在窄窗口切换为单列：

```less
.form-row {
  grid-template-columns: repeat(2, 1fr);
  @media (max-width: 800px) { grid-template-columns: 1fr; }
}
```

**工作量**: 极小 | **优先级**: 中

### 3.2 侧面板在小窗口超出视口

**问题**: `ServerPanel.vue` 使用 520px 固定宽度侧面板，在 600px 以下窗口中不可用。

**方案**: 在视口宽度 < 700px 时切换为全屏覆盖式布局：

```less
@media (max-width: 700px) {
  .server-panel { width: 100vw; }
}
```

**工作量**: 小 | **优先级**: 中

### 3.3 Dashboard 内容垂直溢出

**问题**: Dashboard 的 stats-grid + 图表组合在窗口高度不足时可能产生难以使用的垂直滚动。

**方案**: 为图表容器设置 `max-height` 并在内部启用滚动，确保统计数据始终可见。

**工作量**: 小 | **优先级**: 低

### 3.4 列表长内容截断不一致

**问题**: 部分列表项的文本溢出使用 `text-overflow: ellipsis`，部分没有。

**影响范围**: `CommandsView.vue` 的命令名称、`SkillsView.vue` 的技能描述

**方案**: 统一使用 `.text-ellipsis` 工具类，确保所有列表项的长内容都有截断保护。

**工作量**: 小 | **优先级**: 低

### 3.5 模态弹窗居中方式不一致

**问题**: 不同对话框使用不同的居中方式（部分 `position: fixed` + transform，部分 flex + align-items）。

**方案**: 统一使用 `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center`。

**工作量**: 小 | **优先级**: 低

---

## 4. 排版 (Typography)

### 4.1 缺少 CJK 字体回退

**问题**: `--font-family` 定义了 Segoe UI / system-ui / -apple-system，但未指定中文字体回退。

**影响范围**: 全局所有文本渲染

**方案**: 在字体栈中增加 CJK 字体回退：

```less
--font-family: 'Segoe UI Variable', 'Segoe UI',
  'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC',
  system-ui, -apple-system, sans-serif;
--font-mono: 'Cascadia Code', 'Consolas',
  'Noto Sans Mono CJK SC', 'Source Han Mono SC', monospace;
```

**工作量**: 极小 | **优先级**: 高

### 4.2 多处使用非标字体大小

**问题**: 多处在 11px 字号，不在 Fluent 2 Type Ramp 定义中（最小 12px Caption）。

**影响范围**:
- `--font-size-xs: 11px`
- `ApiConfig.vue` 的 `profile-model` 使用 11px
- `CommandsView.vue` 的 `command-meta` 使用 11px

**方案**: 统一使用 `--font-size-caption: 12px`，消除 11px 硬编码。

**工作量**: 小 | **优先级**: 中

### 4.3 中英文混排行高不一致

**问题**: 中英文混排的行高（line-height）在部分区域不协调。

**方案**: 为包含中文的文本区域设置 `line-height: 1.6`，提高 CJK 字符的可读性。

**工作量**: 小 | **优先级**: 低

### 4.4 文档查看器代码块样式不足

**问题**: `DocsView.vue` 的 Markdown 代码块（`<pre><code>`）缺乏合适的背景色、圆角和行号。

**方案**: 在 `markdown-body` 样式中为代码块添加：

```less
.markdown-body pre {
  background: var(--bg-elevated);
  border-radius: 6px;
  padding: var(--space-md);
  overflow-x: auto;
}
```

**工作量**: 小 | **优先级**: 低

---

## 5. 逻辑 (Logic)

### 5.1 多个 watcher 链式触发

**问题**: 多处存在多个 watcher 在数据变化时同时触发同一操作，导致多余的 API 调用。

**影响范围**:
- `ApiConfig.vue` - 5 个独立 watcher 均可能触发 `fetchAllBalances()`，最短时间内最多调用 3 次
- `ServerPanel.vue` - `show` 和 `data` 的 watcher 分别触发 `serverConfigToLocal()`，导致双重重置
- `ApiProfileDialog.vue` - `showCreate` 和 `showEdit` 的 watcher 分别管理全局事件监听器，存在竞态

**方案**:
1. 合并相关 watcher，减少重复调用
2. 为可能重复调用的操作添加防抖

```javascript
// ApiConfig.vue 优化
watch(
  [() => props.settings?.apiProfiles, () => props.settings?.balanceProviderRules],
  () => fetchAllBalances(),
  { deep: true }
)

// ServerPanel.vue 优化
watch([() => props.show, () => props.data], ([showVal]) => {
  if (showVal) serverConfigToLocal()
}, { deep: true })
```

**工作量**: 中 | **优先级**: 高

### 5.2 缺少组件卸载时的异步取消

**问题**: 多个组件在 `onMounted` 中启动异步 IPC 调用，但 `onUnmounted` 中未设置取消标志，组件卸载后 IPC 回调仍会执行。

**影响范围**:
- `Dashboard.vue` - setTimeout + IPC 调用
- `SkillsView.vue` - loadSkills()
- `CommandsView.vue` - loadCommands()

**方案**: 使用 `isCancelled` 标志模式：

```typescript
const isCancelled = ref(false)
onMounted(async () => {
  const result = await window.electronAPI.listSkills()
  if (isCancelled.value) return
  skills.value = result.skills || []
})
onUnmounted(() => { isCancelled.value = true })
```

**工作量**: 中 | **优先级**: 高

### 5.3 SessionDetailView 滚动位置补偿不稳定

**问题**: 加载更多消息时使用 `el.scrollTop = el.scrollHeight - prevScrollHeight` 补偿滚动位置，但 `nextTick` 无法保证布局完全稳定（图片/代码块加载后 scrollHeight 变化）。

**方案**: 在 `nextTick` 后增加 `requestAnimationFrame` 等待：

```javascript
await nextTick()
await new Promise(resolve => requestAnimationFrame(resolve))
if (el) el.scrollTop = el.scrollHeight - prevScrollHeight
```

**工作量**: 小 | **优先级**: 中

### 5.4 API 配置编辑后数据同步不完全

**问题**: `saveApiEdit()` 中手动同步配置字段到顶层设置对象，但未来新增字段时容易遗漏同步。

**影响范围**: `App.vue` 的 `saveApiEdit()` 函数

**方案**: 使用 `applyDefaults()` 或遍历 apiProfiles 配置字段自动同步：

```javascript
// 自动同步所有配置字段到顶层
const profile = settings.value.apiProfiles[newName]
if (newName === currentApiProfile.value) {
  Object.assign(settings.value, {
    selectedAuthType: profile.selectedAuthType,
    apiKey: profile.apiKey,
    // ... 所有字段
  })
}
```

更好的方案：在 `apiProfiles.js` 的 `switch-api-profile` handler 中统一处理字段映射，消除渲染进程的手工同步。

**工作量**: 小 | **优先级**: 中

### 5.5 设置保存防抖与云同步竞态

**问题**: `App.vue` 的 500ms 防抖保存与 `SyncService.onSettingsSaved` 云同步之间存在竞态。

**影响范围**: `App.vue` 的 `skipNextSaveSettings` 标志 + cloudSync

**方案**: 确保 `flushPendingSave()` 在云同步前被调用，或增加同步锁确保保存完成后再触发同步。

**工作量**: 中 | **优先级**: 中

### 5.6 大量使用 deepClone 导致性能损耗

**问题**: 多处使用 `JSON.parse(JSON.stringify(toRaw(obj)))` 执行深拷贝，每次保存设置都复制整个 settings 对象（可能包含多个 API 配置）。

**方案**: 在配置数据较大时，考虑增量更新（仅传递变更的字段）而非全量保存。

**工作量**: 大 | **优先级**: 低

---

## 6. 语义 (Semantics)

### 6.1 图标按钮缺少 aria-label

**问题**: 几乎所有图标按钮使用 `:title` 但无 `:aria-label` 或 `role` 属性。

**影响范围**: 全部视图中的 action-btn 图标按钮、ToggleSwitch、Close 按钮

**方案**: 为所有纯图标按钮补充 `:aria-label`：

```html
<button class="action-btn"
  :title="$t('mcp.delete')"
  :aria-label="$t('mcp.delete')"
  @click="deleteServer(item.name)">
  <Delete size="14" />
</button>
```

**工作量**: 中 | **优先级**: 高

### 6.2 对话框焦点管理不完整

**问题**: 部分对话框打开时键盘焦点不会自动移到对话框内。

**影响范围**:
- `ConfirmDialog.vue` - 无 tabindex 和焦点管理
- `QuickAddDialog.vue` - 焦点管理缺失

**方案**: 统一对话框焦点管理模式：

```html
<div ref="dialogRef" tabindex="-1" @keydown.esc="handleClose">
```
```javascript
onMounted(() => nextTick(() => dialogRef.value?.focus()))
```

**工作量**: 小 | **优先级**: 中

### 6.3 缺少 ARIA role 属性

**问题**: 自定义组件缺乏语义化的 ARIA role 标识。

**影响范围**:
- `SideBar.vue` - 导航列表缺少 `role="navigation"`
- `Dashboard.vue` - 统计卡片缺少 `role="button"`
- 所有对话框缺少 `role="dialog"` 和 `aria-modal="true"`
- 动态内容区域缺少 `aria-live="polite"`

**方案**: 为关键组件添加 role 和 aria 属性：

```html
<!-- SideBar -->
<nav role="navigation" :aria-label="$t('nav.main')">
  <ul role="list">
    <li role="listitem" v-for="item in navItems">...</li>
  </ul>
</nav>

<!-- Dialog -->
<div role="dialog" aria-modal="true" :aria-label="title">
```

**工作量**: 小 | **优先级**: 中

### 6.4 键盘导航支持不足

**问题**: 对话框和列表操作完全依赖鼠标点击，不支持键盘快捷键。

**影响范围**: 所有对话框和列表

**方案**:
- 对话框统一支持 Esc 关闭
- ConfirmDialog 支持 Enter 确认 / Esc 取消
- 列表支持上下箭头导航
- 全局快捷键：Ctrl+S 保存设置

**工作量**: 中 | **优先级**: 中

### 6.5 动态内容更新缺少屏幕阅读器通知

**问题**: Toast 通知和列表刷新后没有使用 `aria-live` 区域通知屏幕阅读器。

**方案**: Toast 通知容器添加 `aria-live="polite"`，列表刷新后更新内容。

**工作量**: 极小 | **优先级**: 低

### 6.6 代码注释语言不统一

**问题**: 代码注释混用中文和英文，部分英文注释存在语法问题。

**方案**: 公共 API 注释统一使用英文，内部实现细节注释可继续使用中文。核心 IPC 接口的文档注释使用英文。

**工作量**: 中 | **优先级**: 低

---

## 7. 安全性 (Security)

### 7.1 DocsView 的 v-html 缺少 DOMPurify 过滤

**问题**: `DocsView.vue` 使用 `v-html="renderedContent"`，`renderedContent` 仅经过 `marked` 解析，未使用 DOMPurify 清理。

**风险等级**: 低（文档来自构建时静态导入，非用户输入），但违背安全最佳实践。

**方案**: 依赖已存在的 `dompurify` 依赖进行过滤：

```javascript
import DOMPurify from 'dompurify'
renderedContent.value = DOMPurify.sanitize(marked(markdown) as string)
```

值得肯定的是，`UpdateNotification.vue` 和 `UpdateProgress.vue` 已正确使用 DOMPurify 处理外部数据（GitHub API）。

**工作量**: 极小 | **优先级**: 高

### 7.2 API Key 在渲染进程内存中明文存在

**问题**: API Key 通过 CryptoManager 在持久化时加密，但加载到渲染进程后在 Vue reactive 系统中以明文形式存在于内存中。

**方案**: 考虑在渲染进程使用 `WeakRef` 或定期清除敏感字段，减少敏感数据在内存中的暴露窗口。

**工作量**: 大 | **优先级**: 中（Electron 沙箱环境风险可控）

### 7.3 openExternal URL 校验不足

**问题**: `openExternal` 仅校验 URL 协议是否为 `https?://`，但未校验域名白名单。

**方案**: 增加域名白名单校验，确保用户不会通过应用内链接导航到恶意站点。

```javascript
const ALLOWED_DOMAINS = ['github.com', 'pandorastudio.cn', 'npmjs.com']
function isUrlAllowed(url) {
  try {
    const parsed = new URL(url)
    return ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d))
  } catch { return false }
}
```

**工作量**: 小 | **优先级**: 中

### 7.4 路径遍历防护已存在但分散

**问题**: `isPathSafe()` 在 `iflowService.js`、skills IPC、commands IPC 中各自实现，逻辑重复。

**方案**: 将路径遍历防护抽取到 `src/shared/validators.js` 或 `src/main/utils/validator.js` 统一管理。

**工作量**: 小 | **优先级**: 中

### 7.5 字段级加密未覆盖所有敏感字段

**问题**: CryptoManager 的 `SENSITIVE_KEYS` 定义了 7 个敏感字段。MCP 服务器的 `env` 和 `headers` 已加密（P0-03 修复），但需要确认自定义字段是否加密。

**方案**: 审查所有 `MCP server config` 的自定义字段，确保所有包含敏感信息的字段都被纳入加密范围。

**工作量**: 中 | **优先级**: 中

---

## 8. 鲁棒性 (Robustness)

### 8.1 IPC 调用缺少统一错误处理

**问题**: 渲染进程各组件直接调用 `window.electronAPI.xxx()`，大量调用缺少 try/catch。

**影响范围**: 所有视图和组件

**方案**:
1. 创建统一的 API 调用层 `src/api/` 封装所有 IPC 调用，集中处理错误
2. 添加全局 `window.onerror` / `window.onunhandledrejection` 捕获未预期错误

```typescript
// src/api/index.ts
export async function ipcCall<T>(fn: () => Promise<IpcResult<T>>): Promise<T | null> {
  try {
    const result = await fn()
    if (!result.success) {
      console.error('[IPC Error]', result.error)
      return null
    }
    return result.data ?? null
  } catch (e) {
    console.error('[IPC Crash]', e)
    return null
  }
}
```

**工作量**: 大 | **优先级**: 高

### 8.2 settings.json 读取失败无降级策略

**问题**: `loadSettings` 在文件损坏时会抛错，但渲染进程无降级数据显示。

**方案**: 主进程在 JSON 解析失败时自动尝试用 `.bak` 文件恢复，渲染进程显示"配置文件损坏，已从备份恢复"的 toast 提示。

**工作量**: 小 | **优先级**: 高

### 8.3 外部文件修改竞态

**问题**: iFlow CLI 和其他编辑器可能同时修改 settings.json，configService 的 300ms 防抖文件监听无法完全避免竞态。

**方案**: 实现文件修改检测 → 暂停应用写入 → 重新加载 → 冲突合并流程（类似 Git merge）。

**工作量**: 大 | **优先级**: 低（当前防抖策略基本满足需求）

### 8.4 Worker 线程超时和崩溃处理

**问题**: Mod Worker 设置 5 分钟超时，Worker 崩溃时应提供明确的用户反馈。

**方案**: 增强 `modWorkerManager.js` 的错误处理：

```javascript
worker.on('error', (err) => {
  reject(new Error(`WORKER_CRASHED: ${err.message}`))
})
worker.on('exit', (code) => {
  if (code !== 0) reject(new Error(`WORKER_EXIT_${code}`))
})
```

**工作量**: 小 | **优先级**: 中

### 8.5 云同步密码验证没有速率限制

**问题**: `verifyPassword` 和 `changePassword` 没有速率限制，存在暴力破解风险。

**方案**: 在 SyncService 中增加密码验证速率限制（尝试次数计数器 + 递增延迟）：

```javascript
_passwordAttempts: 0
_passwordLockUntil: null

verifyPassword(password) {
  if (this._passwordLockUntil && Date.now() < this._passwordLockUntil) {
    throw new Error('TOO_MANY_ATTEMPTS')
  }
  const result = // ... 验证逻辑
  if (!result) {
    this._passwordAttempts++
    const delay = Math.min(1000 * Math.pow(2, this._passwordAttempts), 60000)
    this._passwordLockUntil = Date.now() + delay
  } else {
    this._passwordAttempts = 0
    this._passwordLockUntil = null
  }
  return result
}
```

**工作量**: 小 | **优先级**: 高

### 8.6 数据导出文件路径错误无处理

**问题**: exportCommand() / exportSkill() 在文件系统拒绝写入（权限不足、磁盘满）时没有明确的用户反馈。

**方案**: 在 IPC handler 中捕获文件写入错误，返回明确的错误信息。

**工作量**: 小 | **优先级**: 中

### 8.7 拖拽排序缺少视觉反馈

**问题**: `vue-draggable-plus` 网格排序在拖拽过程中缺少视觉反馈。

**方案**: 添加拖拽过程中的 CSS class 样式（透明度、阴影、平移动画）。

**工作量**: 小 | **优先级**: 低

### 8.8 主进程内存泄漏风险

**问题**: Worker 线程和 IPC 事件监听器在长时间运行后可能累积。

**方案**: 
- 确保 Worker 使用完成后始终 `worker.terminate()`
- IPC 事件监听器使用 `once` 或在窗口关闭时清理
- `pendingConfirmDialogs` Map 已有 30s 超时清理机制，值得肯定

**工作量**: 中 | **优先级**: 中

---

## 9. 优先级排序与实施路线图

### 立即实施（P0）- 安全与稳定性底线

| # | 优化项 | 维度 | 文件数 | 预计人天 |
|---|--------|------|--------|---------|
| 1 | 图标按钮补充 aria-label | 语义 | 10+ | 1 |
| 2 | IPC 调用统一错误处理 | 鲁棒性 | 15+ | 3 |
| 3 | settings.json 读取降级策略 | 鲁棒性 | 2 | 0.5 |
| 4 | DocsView 添加 DOMPurify | 安全 | 1 | 0.2 |
| 5 | 破坏性操作补充确认对话框 | 交互 | 3 | 0.5 |
| 6 | 密码验证增加速率限制 | 安全 | 1 | 0.3 |
| 7 | CJK 字体回退 | 排版 | 1 | 0.1 |
| 8 | 异步操作组件卸载取消标志 | 逻辑 | 3 | 0.5 |
| **合计** | | | | **6.1** |

### 短期实施（P1）- 体验与质量提升

| # | 优化项 | 维度 | 文件数 | 预计人天 |
|---|--------|------|--------|---------|
| 1 | 多个 watcher 链式触发优化 | 逻辑 | 3 | 1 |
| 2 | 对话框焦点管理 | 语义 | 3 | 0.5 |
| 3 | 表单行响应式断点 | 布局 | 2 | 0.2 |
| 4 | 侧面板响应式处理 | 布局 | 1 | 0.2 |
| 5 | 非标字体大小统一 | 排版 | 4 | 0.3 |
| 6 | 异步操作加载状态补充 | 交互 | 4 | 1 |
| 7 | Fluent Reveal 鼠标跟随 | 界面 | 1 | 0.5 |
| 8 | 路径遍历防护统一管理 | 安全 | 3 | 0.3 |
| 9 | 操作反馈补充 toast | 交互 | 5 | 0.5 |
| 10 | 深色模式对比度修复 | 界面 | 1 | 0.1 |
| **合计** | | | | **4.6** |

### 中期实施（P2）- 架构与可维护性

| # | 优化项 | 维度 | 文件数 | 预计人天 |
|---|--------|------|--------|---------|
| 1 | 设置保存防抖与云同步竞态 | 逻辑 | 2 | 1 |
| 2 | API 配置编辑数据同步自动化 | 逻辑 | 1 | 0.5 |
| 3 | SessionDetailView 滚动补偿 | 逻辑 | 1 | 0.3 |
| 4 | API Key 渲染进程内存处理 | 安全 | 2 | 1 |
| 5 | Worker 崩溃处理增强 | 鲁棒性 | 1 | 0.3 |
| 6 | 数据导出错误处理 | 鲁棒性 | 2 | 0.3 |
| 7 | openExternal 域名白名单 | 安全 | 1 | 0.2 |
| 8 | 长时间操作进度提示 | 交互 | 2 | 0.5 |
| 9 | ARIA role 属性补充 | 语义 | 5 | 0.5 |
| 10 | 主进程内存泄漏防护 | 鲁棒性 | 3 | 1 |
| **合计** | | | | **5.6** |

### 长期实施（P3）- 体验打磨

| # | 优化项 | 维度 | 文件数 | 预计人天 |
|---|--------|------|--------|---------|
| 1 | 分布式 CSS 变量重建间距体系 | 界面 | 15+ | 2 |
| 2 | 主题切换过渡动画 | 界面 | 2 | 0.3 |
| 3 | 列表 hover 状态统一 | 界面 | 5 | 0.5 |
| 4 | deepClone 性能优化 | 逻辑 | 3 | 1 |
| 5 | 文档查看器代码块样式 | 排版 | 1 | 0.3 |
| 6 | 拖拽排序视觉反馈 | 交互 | 1 | 0.3 |
| 7 | 动态内容 aria-live 通知 | 语义 | 2 | 0.2 |
| 8 | 文件外部修改竞态处理 | 鲁棒性 | 1 | 2 |
| **合计** | | | | **6.6** |

---

## 附录：项目代码规模统计

| 类别 | 文件数 | 代码行数 |
|------|--------|---------|
| 主进程入口/窗口/托盘 | 6 | ~800 |
| IPC 处理器 | 9 | ~1,500 |
| 服务层 | 9 | ~2,500 |
| 服务层(WebDAV) | 1 | ~500 |
| 加密/Worker/Utils | 6 | ~800 |
| Vue 视图 | 10 | ~9,000 |
| Vue 组件 | 23 | ~7,000 |
| Composables/Stores | 7 | ~1,250 |
| 样式 | 1 | ~1,335 |
| 共享模块 | 4 | ~800 |
| 国际化 | 3 | ~1,200 |
| Worker | 2 | ~460 |
| **总计** | **~70** | **~26,000** |

---

*本文档基于 v1.21.0 代码库的全维度分析，涵盖 8 大维度共 50+ 项优化建议。*

*建议按照 P0 → P1 → P2 → P3 的优先级顺序逐步实施，每个阶段完成后进行回归测试。*