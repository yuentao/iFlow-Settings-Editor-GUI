# API 配置导入/导出功能技术方案

> 创建日期：2026-04-29
> 状态：规划中

---

## 1. 功能概述

在 API 配置管理页面 (`ApiConfig.vue`) 新增导入/导出能力，允许用户：

- **导出**：将选定的 API 配置（或全部配置）导出为 `.ifse` 文件，方便备份与迁移
- **导入**：从 `.ifse` 文件中导入 API 配置，支持与现有配置合并或覆盖

### 使用场景

| 场景 | 说明 |
|------|------|
| 多设备迁移 | 用户换电脑后，将旧设备的 API 配置导入新设备 |
| 团队共享 | 团队成员共享同一套 API 配置（如统一的 baseUrl、modelName） |
| 备份恢复 | 在修改配置前导出备份，出错时可回滚 |
| 批量配置 | 一次性创建多个配置，避免手动逐个添加 |

---

## 2. 导出格式设计

### 2.1 文件格式

导出文件采用专用扩展名 `.ifse`（iFlow Settings Editor），内部为 JSON 格式，采用带版本号的结构便于后续扩展：

```json
{
  "version": 1,
  "exportedAt": "2026-04-29T10:30:00.000Z",
  "exportedFrom": "iFlow-Settings-Editor",
  "profiles": {
    "production": {
      "selectedAuthType": "openai-compatible",
      "apiKey": "sk-xxx",
      "baseUrl": "https://api.openai.com/v1",
      "modelName": "gpt-4o"
    },
    "staging": {
      "selectedAuthType": "api-key",
      "apiKey": "sk-yyy",
      "baseUrl": "https://staging.example.com/v1",
      "modelName": "gpt-4o-mini"
    }
  }
}
```

**扩展名说明**：`.ifse` 是 iFlow Settings Editor 的专用格式扩展名。文件内容本质为 JSON（UTF-8 编码），使用专用扩展名便于：
- 操作系统中关联默认打开方式（双击直接导入）
- 文件管理器中一眼识别 iFlow 配置文件
- 避免与普通 JSON 配置文件混淆

### 2.2 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | number | 导出格式版本号，当前为 1 |
| `exportedAt` | string | 导出时间 (ISO 8601) |
| `exportedFrom` | string | 来源标识，固定为 `iFlow-Settings-Editor` |
| `profiles` | object | 配置名 → 配置数据的映射，结构与 `settings.apiProfiles` 一致 |

### 2.3 API Key 处理

API Key 显式导出，保留原文不做脱敏处理。`.ifse` 文件的定位是完整备份与迁移，用户应自行妥善保管导出文件。

---

## 3. 交互设计

### 3.1 UI 入口

在 `ApiConfig.vue` 的 `.page-actions` 区域，新增两个按钮：

```
[ + 新建配置 ] [ ↑ 导入配置 ] [ ↓ 导出配置 ]
```

- 导入按钮：使用 `Import` 图标（来自 `@icon-park/vue-next`）
- 导出按钮：使用 `Export` 图标（来自 `@icon-park/vue-next`）

### 3.2 导出流程

```
点击"导出配置"
  → 弹出 ExportDialog 选择导出范围：
     ○ 导出当前配置（仅当前选中的 profile）
     ○ 导出全部配置（所有 profiles）
  → 调用主进程 dialog.showSaveDialog 选择保存路径（默认 .ifse 扩展名）
  → 主进程写入 .ifse 文件（包含完整 API Key）
  → 返回结果，渲染进程显示成功/失败消息
```

### 3.3 导入流程

```
点击"导入配置"
  → 调用主进程 dialog.showOpenDialog 选择 .ifse 文件
  → 主进程读取并解析文件
  → 校验文件格式（version、profiles 结构）
  → 检测冲突（同名配置）：
     ├─ 无冲突 → 直接合并导入
     └─ 有冲突 → 弹出 ConfirmDialog：
        ○ 跳过同名配置
        ○ 覆盖同名配置
        ○ 为导入的配置添加后缀（如 "production (1)"）
  → 写入 settings.json
  → 刷新前端配置列表
  → 显示导入结果摘要（成功 N 个，跳过 M 个，覆盖 K 个）
```

### 3.4 导入结果摘要

导入完成后显示 `MessageDialog`，内容示例：

```
导入完成
- 成功导入：3 个配置
- 跳过（已存在）：1 个
```

---

## 4. 技术实现

### 4.1 主进程 - 新增 IPC Handler

在 `src/main/ipc/apiProfiles.js` 中新增两个 IPC Handler：

#### `export-api-profiles`

```javascript
ipcMain.handle('export-api-profiles', wrapIpcHandler(async (event, options) => {
  // options: { mode: 'current' | 'all', currentProfileName: string }

  const settings = readSettings()
  if (!settings || !settings.apiProfiles) {
    return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND }
  }

  // 1. 筛选要导出的 profiles
  let profilesToExport
  if (options.mode === 'current') {
    const name = options.currentProfileName || settings.currentApiProfile || 'default'
    const profile = settings.apiProfiles[name]
    if (!profile) {
      return { success: false, error: t('errors.configNotExist', { name }), code: ErrorCodes.PROFILE_NOT_FOUND }
    }
    profilesToExport = { [name]: JSON.parse(JSON.stringify(profile)) }
  } else {
    profilesToExport = JSON.parse(JSON.stringify(settings.apiProfiles))
  }

  // 2. 清理内部元数据（_lastModified 等不应导出）
  for (const profile of Object.values(profilesToExport)) {
    delete profile._lastModified
  }

  // 3. 构建导出数据
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedFrom: 'iFlow-Settings-Editor',
    profiles: profilesToExport,
  }

  // 4. 弹出保存对话框
  const { getMainWindow } = require('../window')
  const mainWindow = getMainWindow()
  const result = await dialog.showSaveDialog(mainWindow, {
    title: t('dialogs.exportApiProfiles'),
    defaultPath: `iflow-api-profiles-${new Date().toISOString().slice(0, 10)}.ifse`,
    filters: [
      { name: 'iFlow Settings Files', extensions: ['ifse'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || !result.filePath) {
    return { success: false, cancelled: true }
  }

  // 5. 写入文件
  fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')

  return {
    success: true,
    exportedCount: Object.keys(profilesToExport).length,
  }
}, 'export-api-profiles'))
```

#### `import-api-profiles`

```javascript
ipcMain.handle('import-api-profiles', wrapIpcHandler(async (event, options) => {
  // options: { conflictResolution: 'skip' | 'overwrite' | 'rename' }

  // 1. 弹出文件选择对话框
  const { getMainWindow } = require('../window')
  const mainWindow = getMainWindow()
  const result = await dialog.showOpenDialog(mainWindow, {
    title: t('dialogs.importApiProfiles'),
    filters: [
      { name: 'iFlow Settings Files', extensions: ['ifse'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, cancelled: true }
  }

  // 2. 读取并解析文件
  const filePath = result.filePaths[0]
  let fileContent
  try {
    fileContent = fs.readFileSync(filePath, 'utf-8')
  } catch (e) {
    return { success: false, error: t('errors.fileReadFailed'), code: ErrorCodes.FILE_READ_ERROR }
  }

  let importData
  try {
    importData = JSON.parse(fileContent)
  } catch (e) {
    return { success: false, error: t('errors.invalidJsonFormat'), code: ErrorCodes.INVALID_INPUT }
  }

  // 3. 校验格式
  if (!importData.profiles || typeof importData.profiles !== 'object') {
    return { success: false, error: t('errors.invalidExportFormat'), code: ErrorCodes.INVALID_INPUT }
  }

  // 4. 读取当前设置
  const settings = readSettings()
  if (!settings) {
    return { success: false, error: t('errors.configNotFound'), code: ErrorCodes.CONFIG_NOT_FOUND }
  }
  const oldSnapshot = JSON.parse(JSON.stringify(settings))

  if (!settings.apiProfiles) {
    settings.apiProfiles = { default: {} }
  }

  // 5. 合并配置
  const stats = { imported: 0, skipped: 0, overwritten: 0, renamed: 0 }
  const conflictResolution = options?.conflictResolution || 'rename'

  for (const [name, profile] of Object.entries(importData.profiles)) {
    const exists = !!settings.apiProfiles[name]

    if (exists) {
      switch (conflictResolution) {
        case 'skip':
          stats.skipped++
          continue
        case 'overwrite':
          settings.apiProfiles[name] = profile
          stats.overwritten++
          break
        case 'rename':
        default: {
          let newName = name
          let counter = 1
          while (settings.apiProfiles[newName]) {
            newName = `${name} (${counter})`
            counter++
          }
          settings.apiProfiles[newName] = profile
          stats.renamed++
          break
        }
      }
    } else {
      settings.apiProfiles[name] = profile
    }

    stats.imported++
  }

  // 6. 写入设置
  stampModifiedItems(oldSnapshot, settings)
  writeSettings(settings)
  updateTrayMenu()

  return {
    success: true,
    stats,
  }
}, 'import-api-profiles'))
```

### 4.2 Preload 桥接

在 `preload.js` 中新增：

```javascript
// API 配置导入导出
exportApiProfiles: (options) => ipcRenderer.invoke('export-api-profiles', options),
importApiProfiles: (options) => ipcRenderer.invoke('import-api-profiles', options),
```

### 4.3 渲染进程 - ApiConfig.vue 修改

#### Template 修改

在 `.page-actions` 区域新增按钮：

```html
<div class="page-actions">
  <button class="btn btn-primary" @click="$emit('create-profile')">
    <Add size="14" />
    {{ $t('api.newProfile') }}
  </button>
  <button class="btn btn-secondary" @click="$emit('import-profiles')">
    <Import size="14" />
    {{ $t('api.importProfiles') }}
  </button>
  <button class="btn btn-secondary" @click="$emit('export-profiles')">
    <Export size="14" />
    {{ $t('api.exportProfiles') }}
  </button>
</div>
```

#### 新增 emit 事件

```javascript
const emit = defineEmits([
  'create-profile', 'select-profile', 'edit-profile',
  'duplicate-profile', 'delete-profile', 'reorder-profiles',
  'import-profiles', 'export-profiles',  // 新增
])
```

#### 新增图标导入

```javascript
import { Add, Edit, Delete, Exchange, Copy, Import, Export } from '@icon-park/vue-next'
```

### 4.4 渲染进程 - App.vue 修改

在 App.vue 中处理新的 emit 事件：

```html
<ApiConfig
  v-if="currentSection === 'api'"
  ...
  @import-profiles="handleImportApiProfiles"
  @export-profiles="handleExportApiProfiles"
/>
```

新增处理函数：

```javascript
const handleExportApiProfiles = async () => {
  // 选择导出范围
  const mode = await new Promise(resolve => {
    // 使用 ExportDialog 或 ConfirmDialog 让用户选择
    // 选项："导出当前配置" / "导出全部配置"
    showExportDialog.value = true
  })

  // 调用主进程导出
  const result = await window.electronAPI.exportApiProfiles({
    mode: mode === 'current' ? 'current' : 'all',
    currentProfileName: currentApiProfile.value,
  })

  if (result.success) {
    await showMessage({
      type: 'info',
      title: t('messages.success'),
      message: t('api.exportSuccess', { count: result.exportedCount }),
    })
  } else if (!result.cancelled) {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }
}

const handleImportApiProfiles = async () => {
  // 第一步：选择冲突策略
  const conflictResolution = await new Promise(resolve => {
    showInputDialog.value = {
      show: true,
      title: t('api.importProfiles'),
      placeholder: t('api.conflictResolutionHint'),
      callback: resolve,
      isConflictMode: true,  // 选项: skip / overwrite / rename
    }
  })

  // 第二步：调用主进程导入
  const result = await window.electronAPI.importApiProfiles({
    conflictResolution: conflictResolution || 'rename',
  })

  if (result.success) {
    await loadApiProfiles()
    await loadSettings()
    const { stats } = result
    await showMessage({
      type: 'info',
      title: t('api.importComplete'),
      message: t('api.importResult', stats),
    })
  } else if (!result.cancelled) {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }
}
```

> **注意**：上述使用 `InputDialog` 的方式仅为示意。实际实现时，建议新增专用的 `ExportDialog.vue` 和 `ImportConflictDialog.vue` 组件，提供更友好的选项交互（Radio 单选、Checkbox 等），而非复用 InputDialog。

### 4.5 国际化

#### 中文 (`src/locales/index.js`)

```javascript
api: {
  // ... 现有字段
  importProfiles: '导入配置',
  exportProfiles: '导出配置',
  exportCurrent: '导出当前配置',
  exportAll: '导出全部配置',
  exportSuccess: '已成功导出 {count} 个配置',
  importComplete: '导入完成',
  importResult: '成功导入：{imported} 个 | 跳过：{skipped} 个 | 覆盖：{overwritten} 个 | 重命名：{renamed} 个',
  conflictResolution: '冲突处理',
  conflictSkip: '跳过同名配置',
  conflictOverwrite: '覆盖同名配置',
  conflictRename: '为同名配置添加后缀',
}
```

#### 英文 (`src/locales/en-US.js`)

```javascript
api: {
  importProfiles: 'Import',
  exportProfiles: 'Export',
  exportCurrent: 'Export Current',
  exportAll: 'Export All',
  exportSuccess: 'Successfully exported {count} profile(s)',
  importComplete: 'Import Complete',
  importResult: 'Imported: {imported} | Skipped: {skipped} | Overwritten: {overwritten} | Renamed: {renamed}',
  conflictResolution: 'Conflict Resolution',
  conflictSkip: 'Skip existing profiles',
  conflictOverwrite: 'Overwrite existing profiles',
  conflictRename: 'Add suffix to duplicates',
}
```

#### 日文 (`src/locales/ja-JP.js`)

```javascript
api: {
  importProfiles: 'インポート',
  exportProfiles: 'エクスポート',
  exportCurrent: '現在の設定をエクスポート',
  exportAll: 'すべての設定をエクスポート',
  exportSuccess: '{count}件の設定をエクスポートしました',
  importComplete: 'インポート完了',
  importResult: 'インポート: {imported} | スキップ: {skipped} | 上書き: {overwritten} | リネーム: {renamed}',
  conflictResolution: '競合処理',
  conflictSkip: '同名の設定をスキップ',
  conflictOverwrite: '同名の設定を上書き',
  conflictRename: '同名の設定にサフィックスを追加',
}
```

---

## 5. 错误处理

| 错误场景 | 错误码 | 处理方式 |
|----------|--------|----------|
| 文件读取失败 | `FILE_READ_ERROR` | 提示用户检查文件权限 |
| JSON 格式无效 | `INVALID_INPUT` | 提示文件格式错误（.ifse 文件内容必须为有效 JSON） |
| 缺少 profiles 字段 | `INVALID_INPUT` | 提示非有效的 .ifse 导出文件 |
| 导出文件版本不支持 | `INVALID_INPUT` | 提示版本不兼容（未来扩展） |
| 写入目标路径失败 | `FILE_WRITE_ERROR` | 提示检查磁盘空间/权限 |
| 配置文件不存在 | `CONFIG_NOT_FOUND` | 提示先创建配置 |

在 `src/main/utils/errors.js` 的 `ErrorCodes` 中新增：

```javascript
FILE_READ_ERROR: 'FILE_READ_ERROR',
FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
```

---

## 6. 安全考虑

| 风险 | 缓解措施 |
|------|----------|
| 恶意 JSON 注入 | 校验导入文件结构，只提取 `profiles` 下的已知字段 |
| 路径遍历 | 使用 `dialog.showSaveDialog` / `dialog.showOpenDialog` 限制文件选择 |
| 大文件 DoS | 限制导入文件大小（建议 ≤ 1MB） |

导入时的字段白名单过滤：

```javascript
const ALLOWED_PROFILE_FIELDS = ['selectedAuthType', 'apiKey', 'baseUrl', 'modelName', 'searchApiKey', 'cna']

function sanitizeProfile(profile) {
  const cleaned = {}
  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (profile[field] !== undefined) {
      cleaned[field] = profile[field]
    }
  }
  return cleaned
}
```

---

## 7. 测试方案

### 7.1 主进程 IPC 测试

```javascript
// src/main/ipc/__tests__/apiProfiles.import-export.test.js

describe('export-api-profiles', () => {
  it('导出全部配置')
  it('仅导出当前配置')
  it('清理 _lastModified 元数据')
  it('用户取消保存对话框时返回 cancelled')
})

describe('import-api-profiles', () => {
  it('导入新配置（无冲突）')
  it('导入时跳过同名配置')
  it('导入时覆盖同名配置')
  it('导入时为同名配置添加后缀')
  it('无效 JSON 返回错误')
  it('缺少 profiles 字段返回错误')
  it('用户取消文件选择时返回 cancelled')
})
```

### 7.2 组件测试

```javascript
// src/views/ApiConfig.test.js - 新增用例

describe('导入导出按钮', () => {
  it('渲染导入/导出按钮')
  it('点击导入按钮触发 import-profiles 事件')
  it('点击导出按钮触发 export-profiles 事件')
})
```

---

## 8. 实现清单

按修改文件列出：

| 序号 | 文件 | 修改内容 |
|------|------|----------|
| 1 | `src/main/ipc/apiProfiles.js` | 新增 `export-api-profiles` 和 `import-api-profiles` Handler |
| 2 | `src/main/utils/errors.js` | 新增 `FILE_READ_ERROR`、`FILE_WRITE_ERROR` 错误码 |
| 3 | `preload.js` | 新增 `exportApiProfiles`、`importApiProfiles` 桥接方法 |
| 4 | `src/views/ApiConfig.vue` | 新增导入/导出按钮，新增 emit 事件，导入图标 |
| 5 | `src/App.vue` | 处理 `import-profiles`、`export-profiles` 事件 |
| 6 | `src/locales/index.js` | 新增中文字段 |
| 7 | `src/locales/en-US.js` | 新增英文字段 |
| 8 | `src/locales/ja-JP.js` | 新增日文字段 |
| 9 | `src/shared/types.ts` | 新增 `ExportApiProfilesOptions`、`ImportApiProfilesResult` 类型（可选） |

可选优化（建议后续迭代）：

| 序号 | 内容 | 说明 |
|------|------|------|
| A | 新增 `ExportDialog.vue` | 专用导出选项对话框，见下方详细设计 |
| B | 新增 `ImportConflictDialog.vue` | 专用冲突处理对话框，见下方详细设计 |
| C | 支持拖拽导入 | 将 .ifse 文件拖入 API 配置页面直接导入 |
| D | 导出为加密文件 | 使用 AES 加密导出文件，需密码解密导入 |

---

## A. ExportDialog.vue 详细设计

### A.1 设计目标

替代 4.4 节中通过 `InputDialog` 选择导出范围的方案。将导出范围选择合并到一个对话框中，一次操作完成选择，避免与多步 ConfirmDialog 交互。

### A.2 布局

参照 `ApiProfileDialog.vue` 的结构（header + body + actions 三段式），宽度 `420px`，使用 `dialog-overlay-top` 层级（z-index: 1300）。

```
┌──────────────────────────────────────┐
│  ↓  导出 API 配置              [×]   │  ← header
├──────────────────────────────────────┤
│                                      │
│  导出范围                            │
│  ┌──────────────────────────────┐   │
│  │ ○  导出当前配置 (production)   │   │  ← Radio
│  │ ●  导出全部配置 (3 个)         │   │
│  └──────────────────────────────┘   │
│                                      │
│  ℹ️  将导出 3 个配置到 .ifse 文件       │  ← 摘要提示
│                                      │
├──────────────────────────────────────┤
│              [ 取消 ]  [ 导出 ]       │  ← actions
└──────────────────────────────────────┘
```

### A.3 Props & Emits

```typescript
interface ExportDialogProps {
  show: boolean
  profileCount: number          // 当前配置总数
  currentProfileName: string    // 当前激活的配置名
}

const emit = defineEmits<{
  'close': []
  'export': [options: {
    mode: 'current' | 'all'
  }]
}>()
```

### A.4 组件内部状态

```typescript
const mode = ref<'current' | 'all'>('all')        // 默认导出全部

const summaryText = computed(() => {
  if (mode.value === 'current') {
    return t('api.exportSummaryCurrent', { name: props.currentProfileName })
  }
  return t('api.exportSummaryAll', { count: props.profileCount })
})
```

### A.5 关键交互

| 交互 | 行为 |
|------|------|
| 选择"导出当前配置" | Radio 切换，摘要文字变为"将导出配置 `xxx`" |
| 选择"导出全部配置" | Radio 切换，摘要文字变为"将导出 N 个配置" |
| 点击"导出" | emit `export` 事件，携带 `{ mode }` |
| 点击"取消" / 右上角× / Esc | emit `close` 事件 |
| `profileCount === 1` | 自动选中"导出当前配置"并禁用 Radio（只有一个配置无需选择） |

### A.6 样式规范

沿用项目现有的 Fluent Design 风格：

```less
// 与 ApiProfileDialog 保持一致的布局
.export-dialog {
  width: 420px;
  padding: 0;
  border-radius: var(--radius-xl);

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg) var(--space-xl);
    border-bottom: 1px solid var(--border-light);
    background: var(--control-fill);
  }

  .dialog-title {
    font-size: var(--font-size-base);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--text-primary);
  }

  .dialog-body {
    padding: var(--space-xl);
  }

  .dialog-actions {
    padding: var(--space-lg) var(--space-xl);
    border-top: 1px solid var(--border-light);
    background: var(--control-fill);
  }
}
```

Radio 和 Checkbox 的自定义样式：

```less
// Radio 组 - Windows 11 风格
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.radio-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill);
    border-color: var(--border-strong);
  }

  &.active {
    background: var(--accent-light);
    border-color: var(--accent);
  }

  input[type="radio"] {
    accent-color: var(--accent);
    width: 16px;
    height: 16px;
  }

  .radio-label {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .radio-desc {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    margin-top: 2px;
  }
}

// 摘要提示
.export-summary {
  margin-top: var(--space-lg);
  padding: 10px 14px;
  background: var(--info-bg);
  border-radius: var(--radius);
  font-size: var(--font-size-sm);
  color: var(--info);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
```

### A.7 国际化新增字段

| key | 中文 | English | 日本語 |
|-----|------|---------|--------|
| `api.exportTitle` | 导出 API 配置 | Export API Profiles | API設定をエクスポート |
| `api.exportRange` | 导出范围 | Export Range | エクスポート範囲 |
| `api.exportCurrentLabel` | 导出当前配置 ({name}) | Export current profile ({name}) | 現在の設定をエクスポート ({name}) |
| `api.exportCurrentDesc` | 仅导出当前激活的配置 | Only export the active profile | 現在有効な設定のみエクスポート |
| `api.exportAllLabel` | 导出全部配置 ({count} 个) | Export all profiles ({count}) | すべての設定をエクスポート ({count}件) |
| `api.exportAllDesc` | 导出所有 API 配置 | Export all API profiles | すべてのAPI設定をエクスポート |
| `api.exportSummaryCurrent` | 将导出配置 {name} 到 .ifse 文件 | Will export profile {name} to .ifse file | 設定 {name} を.ifseファイルにエクスポートします |
| `api.exportSummaryAll` | 将导出 {count} 个配置到 .ifse 文件 | Will export {count} profile(s) to .ifse file | {count}件の設定を.ifseファイルにエクスポートします |
| `api.exportBtn` | 导出 | Export | エクスポート |

### A.8 App.vue 调用方式变化

使用 ExportDialog 后，App.vue 的 `handleExportApiProfiles` 简化为：

```javascript
// 状态
const showExportDialog = ref(false)

const handleExportApiProfiles = () => {
  showExportDialog.value = true
}

const closeExportDialog = () => {
  showExportDialog.value = false
}

const saveExportDialog = async (options) => {
  showExportDialog.value = false

  const result = await window.electronAPI.exportApiProfiles({
    mode: options.mode,
    currentProfileName: currentApiProfile.value,
  })

  if (result.success) {
    await showMessage({
      type: 'info',
      title: t('messages.success'),
      message: t('api.exportSuccess', { count: result.exportedCount }),
    })
  } else if (!result.cancelled) {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }
}
```

Template 中：

```html
<ExportDialog
  :show="showExportDialog"
  :profile-count="apiProfiles.length"
  :current-profile-name="currentApiProfile"
  @close="closeExportDialog"
  @export="saveExportDialog"
/>
```

---

## B. ImportConflictDialog.vue 详细设计

### B.1 设计目标

替代 4.4 节中通过 `InputDialog` 选择冲突策略的方案。核心改进：

1. **先选文件后选策略**：用户先选择文件，对话框解析后展示冲突详情，让用户基于具体信息做决策
2. **显示冲突列表**：列出哪些配置名冲突、对应的 baseUrl 信息，帮助用户判断
3. **全局策略 + 单条覆盖**：默认应用全局策略，但允许对单条配置单独设置

### B.2 两种使用模式

根据实现复杂度，分为精简版和完整版：

#### 精简版（推荐先实现）

仅提供全局冲突策略选择 + 冲突列表预览，不支持单条覆盖。

```
┌──────────────────────────────────────────┐
│  ↑  导入 API 配置                  [×]   │
├──────────────────────────────────────────┤
│                                          │
│  来源: iflow-api-profiles-2026-04-29.ifse │
│  包含 5 个配置                           │
│                                          │
│  冲突检测                                │
│  ┌──────────────────────────────────┐   │
│  │  以下 2 个配置已存在：            │   │
│  │  • production  → https://api...  │   │
│  │  • staging     → https://stg...  │   │
│  │                                  │   │
│  │  新增 3 个配置：                  │   │
│  │  • development → https://dev...  │   │
│  │  • testing     → https://test... │   │
│  │  • demo        → https://demo... │   │
│  └──────────────────────────────────┘   │
│                                          │
│  冲突处理策略                            │
│  ┌──────────────────────────────────┐   │
│  │ ○  跳过同名配置                   │   │  ← Radio
│  │ ●  为同名配置添加后缀              │   │
│  │    如 "production (1)"            │   │
│  │ ○  覆盖同名配置                   │   │
│  │    ⚠ 已有配置的数据将被替换        │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ℹ️  将导入 5 个配置（其中 2 个与现有配置同名）│
│                                          │
├──────────────────────────────────────────┤
│                [ 取消 ]  [ 导入 ]         │
└──────────────────────────────────────────┘
```

#### 完整版（后续迭代）

支持单条配置级别的冲突处理，冲突列表中每条都有独立的下拉选择：

```
冲突检测

配置名          来源 baseUrl                处理方式
─────────────────────────────────────────────────
production   https://api.openai.com    [添加后缀 ▾]
staging      https://stg.example.com   [覆盖 ▾]
development  https://dev.example.com   (新增，无需处理)
testing      https://test.example.com  (新增，无需处理)
demo         https://demo.example.com  (新增，无需处理)

每条的处理方式下拉选项：
  - 添加后缀（默认）
  - 覆盖
  - 跳过
```

### B.3 Props & Emits（精简版）

```typescript
interface ConflictProfile {
  name: string
  baseUrl: string          // 用于展示，帮助用户辨别
  isConflict: boolean      // 是否与现有配置同名
}

interface ImportConflictDialogProps {
  show: boolean
  fileName: string                         // 导入文件名
  profiles: ConflictProfile[]              // 解析后的配置列表
  conflictCount: number                    // 冲突数量
}

const emit = defineEmits<{
  'close': []
  'import': [options: {
    conflictResolution: 'skip' | 'overwrite' | 'rename'
  }]
}>()
```

### B.4 组件内部状态

```typescript
const conflictResolution = ref<'skip' | 'overwrite' | 'rename'>('rename')  // 默认添加后缀

const newProfiles = computed(() =>
  props.profiles.filter(p => !p.isConflict)
)

const conflictProfiles = computed(() =>
  props.profiles.filter(p => p.isConflict)
)

// 覆盖模式时显示警告
const showOverwriteWarning = computed(() =>
  conflictResolution.value === 'overwrite' && props.conflictCount > 0
)
```

### B.5 关键交互

| 交互 | 行为 |
|------|------|
| 无冲突 (`conflictCount === 0`) | 隐藏"冲突检测"区域和"冲突处理策略"区域，直接显示"将导入 N 个配置" |
| 选择"覆盖同名配置" | 策略下方显示 ⚠️ 警告："已有配置的数据将被替换，此操作不可撤销" |
| 选择"跳过同名配置" | 摘要显示："将导入 N 个，跳过 M 个" |
| 选择"添加后缀" | 摘要显示："将导入 N 个，其中 M 个会添加后缀重命名" |
| 点击"导入" | emit `import` 事件，携带 `{ conflictResolution }` |
| 点击"取消" / × / Esc | emit `close` 事件 |

### B.6 两阶段调用流程

ImportConflictDialog 需要解析文件后才能展示冲突信息，因此 IPC 交互分为两步：

```
用户点击"导入配置"
  → 调用 IPC 'pre-import-api-profiles'（仅读取/解析文件，不写入 settings）
  → 返回 { profiles, conflictCount, fileName, needsApiKeyCount }
  → 渲染进程弹出 ImportConflictDialog，传入解析结果
  → 用户选择冲突策略后点击"导入"
  → 调用 IPC 'import-api-profiles'（传入文件路径 + 冲突策略，执行写入）
```

主进程新增 `pre-import-api-profiles` Handler：

```javascript
ipcMain.handle('pre-import-api-profiles', wrapIpcHandler(async () => {
  // 1. 弹出文件选择对话框
  const { getMainWindow } = require('../window')
  const mainWindow = getMainWindow()
  const result = await dialog.showOpenDialog(mainWindow, {
    title: t('dialogs.importApiProfiles'),
    filters: [
      { name: 'iFlow Settings Files', extensions: ['ifse'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, cancelled: true }
  }

  // 2. 读取并解析
  const filePath = result.filePaths[0]
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const importData = JSON.parse(fileContent)

  // 3. 校验格式
  if (!importData.profiles || typeof importData.profiles !== 'object') {
    return { success: false, error: t('errors.invalidExportFormat'), code: ErrorCodes.INVALID_INPUT }
  }

  // 4. 白名单过滤 + 冲突检测
  const settings = readSettings()
  const existingProfiles = (settings && settings.apiProfiles) || {}
  const profiles = []
  let conflictCount = 0

  for (const [name, raw] of Object.entries(importData.profiles)) {
    const profile = sanitizeProfile(raw)  // 字段白名单过滤
    const isConflict = !!existingProfiles[name]
    if (isConflict) conflictCount++
    profiles.push({
      name,
      baseUrl: profile.baseUrl || '',
      isConflict,
    })
  }

  return {
    success: true,
    filePath,               // 保留路径，供第二步 import 使用
    fileName: path.basename(filePath),
    profiles,
    conflictCount,
  }
}, 'pre-import-api-profiles'))
```

`import-api-profiles` 改为接收 `filePath` 参数（不再弹文件选择框）：

```javascript
ipcMain.handle('import-api-profiles', wrapIpcHandler(async (event, options) => {
  // options: { filePath: string, conflictResolution: 'skip' | 'overwrite' | 'rename' }

  const fileContent = fs.readFileSync(options.filePath, 'utf-8')
  const importData = JSON.parse(fileContent)

  // ... 后续合并逻辑与 4.1 节相同 ...
}))
```

Preload 新增：

```javascript
// API 配置导入（两步式）
preImportApiProfiles: () => ipcRenderer.invoke('pre-import-api-profiles'),
importApiProfiles: (options) => ipcRenderer.invoke('import-api-profiles', options),
```

### B.7 样式规范

沿用 ExportDialog 相同的布局和 Fluent Design 风格，宽度 `480px`：

```less
.import-conflict-dialog {
  width: 480px;
  padding: 0;
  border-radius: var(--radius-xl);

  // header / body / actions 与 ExportDialog 一致
}

// 来源信息
.import-source {
  padding: 10px 14px;
  background: var(--control-fill);
  border-radius: var(--radius);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);

  .source-file {
    font-weight: 500;
    color: var(--text-primary);
  }
}

// 冲突列表
.conflict-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: var(--space-lg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.conflict-section-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 14px 4px;
  color: var(--text-tertiary);
}

.conflict-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-light);

  &:last-child {
    border-bottom: none;
  }

  .profile-name {
    font-weight: 500;
    color: var(--text-primary);
    min-width: 120px;
  }

  .profile-url {
    color: var(--text-tertiary);
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .conflict-badge {
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    margin-left: 8px;

    &.badge-conflict {
      background: var(--warning-bg);
      color: var(--warning);
    }

    &.badge-new {
      background: var(--success-bg);
      color: var(--success);
    }
  }
}

// 覆盖警告
.overwrite-warning {
  margin-top: var(--space-sm);
  padding: 8px 14px;
  background: var(--danger-bg);
  border-radius: var(--radius);
  font-size: var(--font-size-xs);
  color: var(--danger);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

// .apikey-hint 样式已移除（API Key 显式导出，无需占位符提示）
```

### B.8 国际化新增字段

| key | 中文 | English | 日本語 |
|-----|------|---------|--------|
| `api.importTitle` | 导入 API 配置 | Import API Profiles | API設定をインポート |
| `api.importSource` | 来源 | Source | ソース |
| `api.importContains` | 包含 {count} 个配置 | Contains {count} profile(s) | {count}件の設定を含む |
| `api.conflictSection` | 冲突检测 | Conflict Detection | 競合検出 |
| `api.conflictExisting` | 以下 {count} 个配置已存在 | {count} existing profile(s) found | {count}件の同名設定が存在します |
| `api.conflictNew` | 新增 {count} 个配置 | {count} new profile(s) | {count}件の新規設定 |
| `api.conflictBadge` | 已存在 | Existing | 既存 |
| `api.newBadge` | 新增 | New | 新規 |
| `api.conflictStrategy` | 冲突处理策略 | Conflict Resolution Strategy | 競合処理戦略 |
| `api.strategySkip` | 跳过同名配置 | Skip existing profiles | 同名設定をスキップ |
| `api.strategySkipDesc` | 保留现有配置不变 | Keep existing profiles unchanged | 既存の設定をそのまま保持 |
| `api.strategyRename` | 为同名配置添加后缀 | Add suffix to duplicates | 同名設定にサフィックスを追加 |
| `api.strategyRenameDesc` | 如 "production (1)" | e.g. "production (1)" | 例: "production (1)" |
| `api.strategyOverwrite` | 覆盖同名配置 | Overwrite existing profiles | 同名設定を上書き |
| `api.strategyOverwriteDesc` | 已有配置的数据将被替换 | Existing profile data will be replaced | 既存の設定データが置き換えられます |
| `api.overwriteWarning` | ⚠ 已有配置的数据将被替换，此操作不可撤销 | ⚠ Existing profile data will be replaced. This cannot be undone | ⚠ 既存の設定データが置き換えられます。この操作は取り消せません |
| `api.importSummarySkip` | 将导入 {imported} 个，跳过 {skipped} 个 | Will import {imported}, skip {skipped} | {imported}件をインポート、{skipped}件をスキップ |
| `api.importSummaryRename` | 将导入 {imported} 个，其中 {renamed} 个会重命名 | Will import {imported}, {renamed} will be renamed | {imported}件をインポート、{renamed}件をリネーム |
| `api.importBtn` | 导入 | Import | インポート |

### B.9 App.vue 调用方式变化

```javascript
// 状态
const showImportDialog = ref(false)
const importPreviewData = ref(null)

const handleImportApiProfiles = async () => {
  // 第一步：预解析
  const result = await window.electronAPI.preImportApiProfiles()

  if (result.success) {
    importPreviewData.value = result
    showImportDialog.value = true
  } else if (!result.cancelled) {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }
}

const closeImportDialog = () => {
  showImportDialog.value = false
  importPreviewData.value = null
}

const saveImportDialog = async (options) => {
  showImportDialog.value = false

  // 第二步：执行导入
  const result = await window.electronAPI.importApiProfiles({
    filePath: importPreviewData.value.filePath,
    conflictResolution: options.conflictResolution,
  })

  if (result.success) {
    await loadApiProfiles()
    await loadSettings()
    const { stats } = result
    await showMessage({
      type: 'info',
      title: t('api.importComplete'),
      message: t('api.importResult', stats),
    })
  } else if (!result.cancelled) {
    await showMessage({ type: 'error', title: t('messages.error'), message: result.error })
  }

  importPreviewData.value = null
}
```

Template 中：

```html
<ImportConflictDialog
  v-if="importPreviewData"
  :show="showImportDialog"
  :file-name="importPreviewData.fileName"
  :profiles="importPreviewData.profiles"
  :conflict-count="importPreviewData.conflictCount"
  @close="closeImportDialog"
  @import="saveImportDialog"
/>
```

### B.10 实现文件清单

| 序号 | 文件 | 修改内容 |
|------|------|----------|
| 1 | `src/components/ExportDialog.vue` | **新增**，专用导出对话框 |
| 2 | `src/components/ImportConflictDialog.vue` | **新增**，专用导入冲突对话框 |
| 3 | `src/main/ipc/apiProfiles.js` | 新增 `pre-import-api-profiles` Handler |
| 4 | `preload.js` | 新增 `preImportApiProfiles` 桥接方法 |
| 5 | `src/App.vue` | 替换 InputDialog 调用为专用对话框 |
| 6 | `src/locales/index.js` | 新增 A.7 + B.8 节的 i18n 字段 |
| 7 | `src/locales/en-US.js` | 同上 |
| 8 | `src/locales/ja-JP.js` | 同上 |
| 9 | `src/components/ExportDialog.test.js` | **新增**，导出对话框测试 |
| 10 | `src/components/ImportConflictDialog.test.js` | **新增**，导入冲突对话框测试 |

---

## 9. 云同步兼容性设计

### 9.1 问题分析

当前云同步机制 (`SyncService`) 的合并策略依赖以下机制：

| 机制 | 作用 | 导入/导出的潜在冲突 |
|------|------|---------------------|
| `_lastModified` 时间戳 | 每个 profile/server 条目的修改时间，合并时"最新胜出" | 导入的配置缺少时间戳，可能被远端旧数据覆盖 |
| Tombstone（墓碑）`_deletedProfiles` | 标记已删除的配置，合并时物理删除被墓碑覆盖的条目 | 导入曾被其他设备删除的配置，下次 pull 会被再次删除 |
| `apiProfilesOrder` | 配置排序，合并时去重保序 | 导入新配置后排序未更新，远端不知道新条目的存在 |
| `_runExclusive` 并发锁 | 同步期间互斥，同一时刻只有一个同步任务 | 导入与同步并发时，双方各自读写 settings.json 可能丢失数据 |

### 9.2 导出兼容性

**原则：导出是只读操作，不修改 settings.json，与云同步零冲突。**

需要注意的点：

1. **清理 `_lastModified`**：导出文件中不应包含内部元数据（已在 4.1 节处理）
2. **清理墓碑数据**：导出文件中不包含 `_deletedProfiles` / `_deletedServers`，这些是设备间的同步协议数据，不属于用户配置
3. **导出时机**：无需限制，导出不涉及写操作

### 9.3 导入兼容性（核心）

#### 问题 1：`_lastModified` 缺失导致导入数据被云同步覆盖

**场景**：
1. 用户导入配置 `production`（无 `_lastModified`）
2. 自动同步触发 `pull`
3. 远端没有 `production`，本地有 → 合并保留本地 ✓
4. `push` 推送 `production` 到远端，但 **没有 `_lastModified`**
5. 另一台设备 `pull` 时，`production` 的 `remoteItemTime = 0`，被判定为"旧数据"跳过

**解决方案**：导入时为每个配置条目设置 `_lastModified = now()`，确保云同步将其识别为"最新数据"。

```javascript
// 导入时，在写入 settings 之前为每个 profile 打时间戳
const now = new Date().toISOString()
for (const [name, profile] of Object.entries(importData.profiles)) {
  // ... 合并逻辑之后 ...
  profile._lastModified = now  // 标记为当前时间，确保云同步不会覆盖
}
```

`stampModifiedItems(oldSnapshot, settings)` 也会对比新旧 diff 自动打戳，但显式设置更可靠，避免"新旧内容恰好相同"时不打戳的边界情况。

#### 问题 2：墓碑导致导入的配置被下次 pull 删除

**场景**：
1. 设备 A 删除配置 `staging`，墓碑写入 `_deletedProfiles.staging = { deletedAt: T1 }`
2. 同步后，设备 B 也获得墓碑
3. 用户在设备 B 手动导入包含 `staging` 的文件（导入时间 T2 > T1）
4. 下次 `pull` 时，`_mergeConfigs` 检查 `itemT <= tombT` → `staging` 再次被物理删除

**解决方案**：导入时，清除与新导入配置同名的墓碑记录，并确保 `_lastModified > deletedAt`。

```javascript
// 导入完成后，清理相关墓碑
for (const name of Object.keys(importData.profiles)) {
  if (settings._deletedProfiles && settings._deletedProfiles[name]) {
    delete settings._deletedProfiles[name]  // 移除墓碑
  }
}
```

这与现有 `create-api-profile` Handler 的逻辑一致（见 `apiProfiles.js` 中 `create-api-profile` 的处理）。

#### 问题 3：`apiProfilesOrder` 未更新

**场景**：
1. 导入 3 个新配置，但 `apiProfilesOrder` 仍是旧的列表
2. 同步时 `_mergeConfigs` 合并排序时，新配置名不在旧列表中 → 只能通过远端排序追加
3. 如果远端也没有，新配置排在末尾且不在排序中

**解决方案**：导入新配置后，将新配置名追加到 `apiProfilesOrder` 末尾。

```javascript
// 导入完成后，更新排序
if (!settings.apiProfilesOrder) {
  settings.apiProfilesOrder = Object.keys(settings.apiProfiles)
} else {
  const orderSet = new Set(settings.apiProfilesOrder)
  for (const name of Object.keys(settings.apiProfiles)) {
    if (!orderSet.has(name)) {
      settings.apiProfilesOrder.push(name)
    }
  }
}
```

#### 问题 4：导入与云同步的并发竞态

**场景**：
1. 用户点击"导入配置"，主进程开始读取/修改 `settings.json`
2. 同时自动同步触发 `pull`，也在修改 `settings.json`
3. 两者几乎同时 `writeSettings`，后写入者覆盖前者的修改

**解决方案**：导入期间暂停自动同步，导入完成后再恢复。

```javascript
// 导入前：通知 SyncService 暂停自动同步
const { syncService } = require('../cloud')
syncService.stopAutoSync()

try {
  // ... 导入逻辑 ...
  // ... writeSettings(settings) ...
} finally {
  // 导入后：恢复自动同步（如果之前已启用）
  // SyncService.startAutoSync() 会在下次 onSettingsSaved 时自然恢复
  // 或者由渲染进程根据 localStorage 中的 autoSyncEnabled 标记决定
}
```

更安全的做法：在 `import-api-profiles` Handler 中，导入完成后主动触发一次 push，确保导入的数据上传到云端：

```javascript
// 导入完成后，主动 push（如果已配置云同步）
if (syncService.provider && syncService.hasCachedPassword()) {
  try {
    await syncService.push(syncService._cachedPassword)
  } catch (err) {
    logger.warn('Post-import push failed:', err.message)
    // push 失败不影响导入结果，仅 warn
  }
}
```

### 9.4 完整的导入流程（修订版）

```
import-api-profiles:
  1. 暂停自动同步
  2. 弹出文件选择对话框
  3. 读取并解析 JSON
  4. 校验格式 + 白名单过滤
  5. 读取当前 settings
  6. 合并配置（处理冲突策略）
  7. 为每个导入的 profile 设置 _lastModified = now
  8. 清理同名墓碑（_deletedProfiles）
  9. 更新 apiProfilesOrder
  10. stampModifiedItems + writeSettings
  11. updateTrayMenu
  12. 尝试 push 到云端（如果已配置）
  13. 返回结果
```

### 9.5 导出文件格式（修订版）

导出文件保持纯净的用户数据格式，不携带同步元数据。文件扩展名为 `.ifse`（iFlow Settings Editor），内容为 JSON 格式。可选择性包含 `exportedAt` 供参考：

```json
{
  "version": 1,
  "exportedAt": "2026-04-29T10:30:00.000Z",
  "exportedFrom": "iFlow-Settings-Editor",
  "profiles": {
    "production": {
      "selectedAuthType": "openai-compatible",
      "apiKey": "sk-xxx",
      "baseUrl": "https://api.openai.com/v1",
      "modelName": "gpt-4o"
    }
  }
}
```

**不含**：`_lastModified`、`_deletedProfiles`、`_deletedServers`、`apiProfilesOrder`、`cloudSync`。

这些同步协议数据由 `SyncService._mergeConfigs` 在运行时根据各设备状态动态计算，导入时正确设置时间戳和清理墓碑即可保证合并正确性。

### 9.6 兼容性检查清单

| 检查项 | 导出 | 导入 |
|--------|------|------|
| 不含 `_lastModified` | ✓ 清理 | ✓ 导入时设置为 now |
| 不含墓碑数据 | ✓ 不导出 | ✓ 清理同名墓碑 |
| 不含 `cloudSync` 配置 | ✓ 不导出 | N/A |
| `apiProfilesOrder` 更新 | N/A | ✓ 追加新配置名 |
| 并发安全 | ✓ 只读 | ✓ 暂停自动同步 + push |
| `stampModifiedItems` 调用 | N/A | ✓ 在 writeSettings 前调用 |
| `updateTrayMenu` 调用 | N/A | ✓ 写入后调用 |
