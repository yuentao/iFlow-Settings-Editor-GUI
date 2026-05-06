# iFlow Mod 管理功能 - 详细设计文档

## 📋 1. 项目概述

### 1.1 功能背景
iFlow CLI 的核心逻辑集中在 `iflow.js` 文件中。该文件位于全局 npm 包目录中，路径需要通过 `npm config get prefix` 命令动态获取，然后拼接 `\node_modules\@iflow-ai\iflow-cli\bundle\iflow.js` 得到完整路径。例如：

- **Windows（默认）**：`C:\Users\用户名\AppData\Roaming\npm\node_modules\@iflow-ai\iflow-cli\bundle\iflow.js`
- **Linux/macOS**：`/usr/local/lib/node_modules/@iflow-ai/iflow-cli/bundle/iflow.js`
- **自定义 npm prefix**：根据用户配置而定

用户可能需要对核心逻辑进行自定义修改（如添加新功能、调整行为、修复 Bug 等），但直接修改会导致：
- 更新 iFlow CLI 时修改丢失
- 无法追踪修改历史
- 多个修改之间可能冲突
- 难以分享和复用修改

类似 **ModOrganizer** 的设计理念，本方案聚焦于 **Mod 包的导入/导出/启用禁用管理**，不涉及 Mod 的创建、编辑和应用过程。用户可通过外部工具创建 Mod 包，然后通过本系统进行集中管理。

### 1.2 核心目标
1. **Mod 包导入**：支持从本地文件（`.iflow-mod` 包）导入 Mod，自动验证结构并解析元数据
2. **Mod 包导出**：支持将 Mod 打包为标准化 `.iflow-mod` 格式，便于分享和备份
3. **Mod 启用/禁用**：通过开关控制 Mod 是否生效（启用=应用到 iflow.js，禁用=从 iflow.js 移除）
4. **Mod 列表管理**：集中展示已安装的 Mod，显示元数据、状态、启用时间等信息
5. **路径自动解析**：动态获取 npm 全局路径，定位 `iflow.js` 文件位置

---

## 🏗️ 2. 技术架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron 渲染进程 (Vue 3)                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  IflowModsView.vue (主界面)                             │ │
│  │  ├─ ModCard 组件（Mod 卡片 + 启用/禁用开关）            │ │
│  │  └─ ImportExport 组件（导入/导出对话框）                │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  useIflowModsStore (Pinia 状态管理)                      │ │
│  │  └─ mods.json 读写操作（通过 IPC 调用）                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ IPC (preload.js)
┌─────────────────────────────────────────────────────────────┐
│                    Electron 主进程 (Node.js)                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  src/main/ipc/iflow.js (IPC 处理器)                      │ │
│  │  ├─ getIflowVersion() → 获取 iflow.js 版本号            │ │
│  │  ├─ getModCompatibility() → 版本兼容性检查              │ │
│  │  ├─ importMod() → 导入 Mod 包                           │ │
│  │  ├─ exportMod() → 导出 Mod 包                           │ │
│  │  ├─ toggleMod() → 启用/禁用 Mod                         │ │
│  │  ├─ listMods() → 列出已安装 Mod                         │ │
│  │  └─ validateModPackage() → 验证 Mod 包结构              │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  services/iflowService.js (业务逻辑层)                   │ │
│  │  ├─ getNpmPrefix() → 获取 npm 全局路径                  │ │
│  │  ├─ parseModMetadata() → 解析 mod.json                  │ │
│  │  ├─ packModToZip() → 打包 Mod 为 ZIP                    │ │
│  │  ├─ unzipModPackage() → 解压 Mod 包                     │ │
│  │  ├─ checkVersionCompatibility() → 版本兼容性验证       │ │
│  │  └─ validateModStructure() → 目录结构验证               │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  文件系统层                                              │ │
│  │  ├─ {npm_prefix}/node_modules/@iflow-ai/.../iflow.js   │ │
│  │  │   (目标文件，路径通过 npm config get prefix 获取)    │ │
│  │  ├─ ~/.iflow/settings.json        # 应用配置            │ │
│  │  └─ ~/.iflow/mods/iflow/mods.json  # Mod 元数据索引     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责划分

| 模块 | 职责 | 技术实现 |
|------|------|----------|
| **UI 层** | Mod 列表展示、启用/禁用开关、导入/导出操作 | Vue 3 + Composition API + `<script setup>` |
| **状态管理层** | Mod 列表状态管理、元数据索引读写 | Pinia Store (useIflowModsStore) |
| **IPC 通信层** | 主进程与渲染进程安全通信 | contextBridge + ipcRenderer/ipcMain |
| **业务逻辑层** | Mod 包解析、ZIP 打包/解压、路径动态获取、版本兼容性验证 | 主进程服务 (iflowService.js) |
| **数据持久层** | Mod 元数据存储（mods.json） | configService.js + 文件系统 API |

---

## 📊 3. 数据模型详细设计

### 3.1 数据存储架构

#### 3.1.1 文件存储结构

```
~/.iflow/
├── settings.json          # 主配置文件（不包含 Mod 数据）
├── mods/
│   └── iflow/
│       ├── mods.json      # Mod 元数据索引文件（唯一数据源）
│       ├── {mod-id-1}/
│       │   ├── mod.json          # 必需：Mod 元数据
│       │   ├── code.js           # 或 patch.diff（根据 type 决定）
│       │   ├── README.md         # 可选
│       │   ├── LICENSE           # 可选
│       │   └── icon.png          # 可选
│       ├── {mod-id-2}/
│       │   └── ...
│       └── index.json            # 索引（可选，实际数据在 mods.json）
└── logs/
    └── iflow-mods.log     # Mod 操作日志（可选）
```

#### 3.1.2 核心类型定义

**mods.json 结构**：
```json
{
  "version": 1,
  "timestamp": 1714982400000,
  "mods": [
    {
      "id": "ui-enhancement-001",
      "name": "UI 增强 - 深色模式优化",
      "version": "1.2.0",
      "type": "replace",
      "description": "为 iFlow 界面添加深色模式支持",
      "author": "张三",
      "category": "UI",
      "enabled": true,
      "installedAt": 1714982400000,
      "iflowVersion": "0.5.19",
      "iflowVersionConstraint": "0.5.19+",
      "icon": "🎨",
      "tags": ["UI", "主题", "深色模式"],
      "homepage": "https://github.com/user/iflow-ui-enhancement",
      "repository": "https://github.com/user/iflow-ui-enhancement",
      "license": "MIT"
    }
  ]
}
```

**说明**：
- `mods.json` 是唯一数据源，存储 Mod 元数据（位于 `~/.iflow/mods/iflow/mods.json`）
- `settings.json` 不包含 Mod 数据，仅存储应用级配置
- 文件系统仅存储 Mod 包的实际文件（mod.json + 主体文件 + 可选文件）
- `index.json` 可选的目录索引，用于快速扫描（目前不使用，依赖 mods.json）

### 3.2 mods.json 类型定义

```typescript
export interface ModsMetadata {
  version: number               // 元数据版本号
  timestamp: number             // 最后修改时间戳（毫秒）
  mods: IflowMod[]              // Mod 列表
}
```

**版本兼容性规则**：
- `iflowVersionConstraint` 默认值为 `'0.5.19+'`（向后兼容）
- 导入时如果未指定 `iflowVersionConstraint`，默认为 `'0.5.19+'`
- 启用 Mod 前检查当前 iflow.js 版本是否满足兼容性约束
- 版本不兼容时，显示友好提示，阻止启用操作

**启用/禁用逻辑**：
- `enabled: true`：Mod 已启用，其内容已应用到 iflow.js
- `enabled: false`：Mod 已禁用，其内容未应用到 iflow.js
- 启用/禁用通过 IPC 调用 `toggleMod(modId, enabled)` 实现
- 实际应用逻辑在 `iflowService.js` 中根据 `modsEnabled` 顺序重新生成 iflow.js

### 3.3 IPC 结果类型

```typescript
// Mod 列表
export interface ListModsResult extends IpcResult {
  mods?: IflowMod[]
}

// 获取 iflow.js 版本
export interface GetIflowVersionResult extends IpcResult {
  version?: string
}

// 导出 Mod 结果
export interface ExportModResult extends IpcResult<{ filePath: string }> {}

// 导入 Mod 结果
export interface ImportModResult extends IpcResult<{ imported: number; failed: number; modIds: string[] }> {}
```

---

## 🔧 4. 核心功能详细设计

### 4.1 Mod 导入功能

#### 4.1.1 导入流程

**触发方式**：
1. 点击"导入 Mod"按钮
2. 弹出文件选择对话框
3. 用户选择单个 `.iflow-mod` 文件

**解析流程**：
```
1. 读取 ZIP 文件内容
2. 验证 Mod 包结构（见 7.2 节）：
   ├─ 必须存在 mod.json 文件
   ├─ 根据 mod.json 的 type 字段，必须存在对应的主体文件
   └─ 验证 mod.json 字段完整性（name, author, category, description, type, version）
3. 解析 mod.json，提取元数据
4. 生成唯一 ID（UUID v4 或基于 name+version 的哈希）
5. 检查是否已存在相同 ID 的 Mod：
   ├─ 如果存在，提示"是否覆盖？"
   ├─ 用户选择覆盖：删除旧 Mod，导入新 Mod
   └─ 用户选择取消：终止导入
6. 解压到 ~/.iflow/mods/iflow/{mod-id}/
   ├─ mod.json（必需）
   ├─ code.js 或 patch.diff（必需，根据 type 决定）
   └─ 其他可选文件（README.md、LICENSE、icon.png 等）
7. 在 mods.json 中创建记录
8. 默认状态：enabled: false（禁用状态，用户手动启用）
9. 刷新 UI 列表
```

**导入验证规则**：
- **文件完整性**：ZIP 必须包含 mod.json
- **类型匹配**：type='patch' 必须有 patch.diff；type='replace'/'append'/'prepend' 必须有 code.js
- **元数据必填**：name, type, version 不能为空（author、category、description 为可选）
- **ID 冲突**：相同 ID 的 Mod 不能重复导入（除非覆盖）
- **文件大小限制**：整个 Mod 包不超过 50MB（可配置）
- **格式兼容**：支持 `.zip` 和 `.iflow-mod` 两种格式（导入时自动识别）

**错误处理**：
- ZIP 解压失败 → 提示"文件损坏或格式不正确"
- mod.json 缺失 → 提示"缺少 mod.json 文件"
- 主体文件缺失 → 提示"缺少主体文件（code.js 或 patch.diff）"
- 元数据不完整 → 提示"mod.json 缺少必需字段：name、type、version"
- 磁盘空间不足 → 提示"存储空间不足"

#### 4.1.2 导入 UI 交互

**文件选择对话框**：
- 使用 `dialog.showOpenDialog`（IPC 调用）
- 过滤器：`.zip, .iflow-mod`（支持 ZIP 和 .iflow-mod 两种格式）

**导入进度**：
- 显示导入中的 Mod 数量（如 "正在导入 3/10"）
- 失败 Mod 单独提示，不影响其他 Mod 导入

**导入结果反馈**：
- 成功：Toast 提示 "成功导入 Mod: {name} (v{version})"
- 失败：Toast 提示 "导入失败: {reason}"
- 部分成功：显示成功/失败数量统计

---

### 4.2 Mod 导出功能

#### 4.2.1 导出流程

**触发方式**：
1. 在 Mod 列表中选中一个 Mod
2. 点击"导出"按钮
3. 弹出"另存为"对话框

**打包流程**：
```
1. 读取 Mod 配置（从 mods.json）
2. 定位 Mod 文件目录：~/.iflow/mods/iflow/{mod-id}/
3. 读取 mod.json 和所有关联文件（code.js/patch.diff + 可选文件）
4. 创建 ZIP 压缩包（完整导出，包含所有文件）：
   ├─ mod.json（放在根目录）
   ├─ code.js 或 patch.diff（放在根目录）
   ├─ README.md（可选）
   ├─ LICENSE（可选）
   ├─ icon.png / icon.svg（可选）
   └─ 其他文件（tests/, src/ 等）
5. 生成文件名：{mod-name}-v{version}.iflow-mod
   （特殊字符替换：空格→连字符，/ \ ? * : | " < > 移除）
6. 弹出"另存为"对话框，用户选择保存位置
7. 写入 ZIP 文件
8. 提示"导出成功"
```

#### 4.2.2 导出 UI 交互

**导出按钮位置**：
- Mod 卡片右上角：单个导出

**导出对话框**：
```
┌─────────────────────────────────────────────────────┐
│  导出 Mod                                           │
├─────────────────────────────────────────────────────┤
│  Mod 名称：UI 增强 - 深色模式优化                   │
│  Mod 版本：1.2.0                                    │
│  Mod ID：ui-enhancement-001                         │
│                                                     │
│  保存位置：[选择文件夹...]                          │
│  文件名：ui-enhancement-v1.2.0.iflow-mod           │
│                                                     │
│  [取消] [导出]                                      │
└─────────────────────────────────────────────────────┘
```

**导出成功反馈**：
- Toast 提示：`✅ 导出成功: ui-enhancement-v1.2.0.iflow-mod`
- 可选：打开文件所在文件夹

---

### 4.3 Mod 启用/禁用功能

#### 4.3.1 启用/禁用机制

**核心逻辑**：
- `enabled: true`：Mod 已启用，其内容已应用到 iflow.js
- `enabled: false`：Mod 已禁用，其内容未应用到 iflow.js
- 启用/禁用通过 IPC 调用 `toggleMod(modId, enabled)` 实现

**进度显示设计**：
- 由于 iflow.js 可能达到 10MB+，流式读写需要一定时间
- 操作过程中显示模态进度对话框，防止用户误操作（关闭窗口、切换页面等）
- 进度对话框包含：当前阶段描述、进度百分比、取消按钮（可取消操作）

**进度对话框 UI**：
```
┌─────────────────────────────────────────────────────┐
│  正在应用 Mod                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  正在读取 iflow.js 文件...                          │
│  ████████████░░░░░░░░░░░░░░░░░  45%               │
│                                                     │
│  当前 Mod：UI 增强 - 深色模式优化                   │
│  操作：启用                                          │
│                                                     │
│           [取消操作]                                 │
└─────────────────────────────────────────────────────┘
```

**应用流程**（启用 Mod 时）：
```
1. 显示进度对话框（防止误操作）
2. 流式读取 iflow.js → baseContent（大文件优化）
3. 获取所有启用的 Mod（按 installedAt 升序，即安装时间顺序）
4. 遍历启用的 Mod，根据 type 应用变更：
   ├─ patch: 使用 diff 库（applyPatch）应用补丁
   │         └─ 如果应用失败（冲突），提示错误，终止操作
   ├─ replace: 直接替换为 Mod 的 content
   │         └─ 后续 Mod 被忽略（因为文件已完全替换）
   ├─ append: baseContent += mod.content
   └─ prepend: baseContent = mod.content + baseContent
5. 流式写入 iflow.js（显示写入进度）
6. 更新 Mod 的 enabled 状态
7. 关闭进度对话框
8. 刷新 UI 状态
```

**原子写入保护**（流式异步版本）：
```javascript
async function writeFileAtomically(filePath: string, content: string): Promise<void> {
  const tempPath = filePath + '.tmp'
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(tempPath, { encoding: 'utf-8' })
    writeStream.write(content)
    writeStream.end()
    writeStream.on('finish', () => {
      fs.rename(tempPath, filePath, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    writeStream.on('error', reject)
  })
}
```

**流式读取优化**（针对大文件）：
```javascript
async function readFileStream(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const readStream = fs.createReadStream(filePath)
    readStream.on('data', (chunk) => chunks.push(chunk))
    readStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    readStream.on('error', reject)
  })
}
```

**启用失败处理**：
- Patch 应用失败（冲突）：返回错误，`enabled` 保持 `false`
- 文件写入失败：返回错误，提示用户检查权限

---

## 🎨 5. UI/UX 详细设计

### 5.1 导航结构

在 `SideBar.vue` 的"高级"分组中添加 iFlow Mod 导航项：

```vue
<div class="sidebar-section">
  <div class="sidebar-title" v-show="!collapsed">{{ $t('sidebar.advanced') }}</div>

  <!-- 现有项：MCP 服务器、技能、命令 -->
  <div class="nav-item" :class="{ active: currentSection === 'mcp' }" @click="$emit('navigate', 'mcp')">
    <Server size="16" />
    <span class="nav-item-text">{{ $t('sidebar.mcpServers') }}</span>
  </div>

  <!-- 新增：iFlow Mod -->
  <div class="nav-item" :class="{ active: currentSection === 'iflow' }" @click="$emit('navigate', 'iflow')">
    <Package size="16" />  <!-- 使用 Package 图标（icon-park 内置） -->
    <span class="nav-item-text">{{ $t('sidebar.iflowMod') }}</span>
  </div>

  <div class="nav-item" :class="{ active: currentSection === 'skills' }" @click="$emit('navigate', 'skills')">
    <Star size="16" />
    <span class="nav-item-text">{{ $t('sidebar.skills') }}</span>
  </div>
  <!-- ... 其他导航项 ... -->
</div>
```

**国际化键值**（添加到 `locales/index.js`）：
```javascript
export default {
  sidebar: {
    advanced: '高级',
    iflowMod: 'iFlow Mod'  // 新增
  },
  // ...
}
```

---

### 5.2 IflowModsView 主界面

**布局结构**（类似 API 配置列表的行布局）：

```vue
<template>
  <section class="iflow-mods-view">
    <!-- 页面标题区 -->
    <div class="content-header">
      <h1 class="content-title">{{ $t('iflow.title') }}</h1>
      <p class="content-desc">{{ $t('iflow.description') }}</p>

      <!-- 状态卡片 -->
      <div class="status-cards">
        <div class="status-card">
          <div class="card-icon">{{ status.exists ? '✅' : '⚠️' }}</div>
          <div class="card-info">
            <div class="card-label">{{ $t('iflow.fileStatus') }}</div>
            <div class="card-value">{{ status.exists ? $t('common.found') : $t('common.notFound') }}</div>
          </div>
        </div>
        <div class="status-card" v-if="status.exists">
          <div class="card-icon">🔧</div>
          <div class="card-info">
            <div class="card-label">{{ $t('iflow.enabledMods') }}</div>
            <div class="card-value">{{ enabledCount }} / {{ totalCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="page-actions">
      <button class="btn btn-primary" @click="openImportDialog">
        <FolderOpen size="14" /> {{ $t('iflow.import') }}
      </button>
      <button
        class="btn btn-secondary"
        @click="exportAllEnabled"
      >

    <!-- 分类筛选（类似命令页） -->
    <div v-if="!isLoading && mods.length > 0" class="category-filter">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="category-btn"
        :class="{ active: selectedCategory === cat.value }"
        @click="selectedCategory = cat.value"
      >
        {{ $t(cat.label) }}
        <span class="category-count">{{ getCategoryCount(cat.value) }}</span>
      </button>
    </div>

    <!-- Mod 列表（列表行布局，类似 API 配置列表）
        <Download size="14" /> {{ $t('iflow.exportAll') }}
      </button>
    </div>

    <!-- Mod 列表（列表行布局，类似 API 配置列表） -->
    <div class="card" v-if="!isLoading && mods.length > 0">
      <div class="mod-list">
        <div
          v-for="mod in filteredMods"
          :key="mod.id"
          class="mod-item"
          :class="{ enabled: mod.enabled }"
        >
          <!-- Mod 信息（左侧） -->
          <div class="mod-info" @click="$emit('edit-mod', mod.id)">
            <div class="mod-icon">
              <span v-if="mod.icon">{{ mod.icon }}</span>
              <Package v-else size="18" />
            </div>
            <div class="mod-details">
              <div class="mod-name-row">
                <span class="mod-name">{{ mod.name }}</span>
                <span class="mod-version">v{{ mod.version }}</span>
                <span class="mod-type-badge">{{ $t(`iflow.types.${mod.type}`) }}</span>
              </div>
              <div class="mod-desc">{{ mod.description }}</div>
              <div class="mod-meta">
                <span class="mod-author" v-if="mod.author">{{ mod.author }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧操作列 -->
          <div class="mod-actions">
            <!-- 启用/禁用开关（始终可见） -->
            <Switch
              :model-value="mod.enabled"
              @update:model-value="toggleMod(mod.id, $event)"
              :title="mod.enabled ? $t('iflow.disable') : $t('iflow.enable')"
            />

            <!-- 禁用状态下显示删除、导出按钮 -->
            <template v-if="!mod.enabled">
              <button
                class="action-btn"
                @click.stop="exportMod(mod.id)"
                :title="$t('iflow.export')"
              >
                <Download size="14" />
              </button>
              <button
                class="action-btn action-btn-danger"
                @click.stop="deleteMod(mod.id)"
                :title="$t('iflow.delete')"
              >
                <Trash size="14" />
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <EmptyState
      v-else-if="!isLoading"
      :icon="Package"
      :title="$t('iflow.mods.emptyTitle')"
      :description="$t('iflow.mods.emptyDesc')"
      embedded
    />

    <!-- 加载状态 -->
    <SkeletonLoader v-else type="list" :count="5" />
  </section>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// --- 状态 ---
const isLoading = ref(false)
const mods = ref<IflowMod[]>([])
const selectedCategory = ref('all')

// --- 计算属性 ---
const sortedMods = computed(() => {
  // 按 installedAt 升序排序（旧的在前）
  return [...mods.value].sort((a, b) => new Date(a.installedAt).getTime() - new Date(b.installedAt).getTime())
})

const filteredMods = computed(() => {
  if (selectedCategory.value === 'all') {
    return sortedMods.value
  }
  return sortedMods.value.filter(mod => mod.category === selectedCategory.value)
})

const categories = computed(() => [
  { value: 'all', label: 'iflow.category.all' },
  { value: 'UI', label: 'iflow.category.UI' },
  { value: 'Performance', label: 'iflow.category.Performance' },
  { value: 'Feature', label: 'iflow.category.Feature' },
  { value: 'Other', label: 'iflow.category.Other' },
])

const getCategoryCount = (category) => {
  if (category === 'all') return mods.value.length
  return mods.value.filter(mod => mod.category === category).length
}

// --- 方法 ---
const loadMods = async () => {
  isLoading.value = true
  try {
    mods.value = await window.electronAPI.iflowListMods()
  } finally {
    isLoading.value = false
  }
}

const enableMod = async (modId, enabled) => {
  await window.electronAPI.iflowToggleMod(modId, enabled)
  await loadMods()
}

const deleteMod = async (modId) => {
  await window.electronAPI.iflowDeleteMod(modId)
  await loadMods()
}

const exportMod = async (modId) => {
  const dest = await window.electronAPI.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择导出目录'
  })
  if (!dest.canceled && dest.filePaths.length > 0) {
    await window.electronAPI.iflowExportMod(modId, dest.filePaths[0])
  }
}

const importMod = async () => {
  const zip = await window.electronAPI.showOpenDialog({
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
    properties: ['openFile'],
    title: '选择 Mod ZIP 文件'
  })
  if (!zip.canceled && zip.filePaths.length > 0) {
    await window.electronAPI.iflowImportMod(zip.filePaths[0])
    await loadMods()
  }
}

const toggleMod = async (modId, enabled) => {
  await enableMod(modId, enabled)
}

// 生命周期
onMounted(() => {
  loadMods()
})
</script>

```

**状态卡片**：
- 只显示 2 个卡片：文件状态、启用 Mod 数量

**列表布局**：
- 左侧：Mod 信息（图标、名称、版本、类型徽章、描述、作者/分类）
- 右侧：操作列（启用/禁用开关始终可见 + 条件按钮）
- 条件按钮：仅当 `!mod.enabled` 时显示删除、导出按钮

---

### 5.3 关键组件设计

#### 5.3.1 ImportModDialog（导入对话框）

**功能**：选择并导入 `.iflow-mod` Mod 包

**UI 结构**：
```vue
<template>
  <Dialog :title="$t('iflow.importDialog.title')" @close="$emit('close')">
    <div class="import-dialog">
      <!-- 文件选择区 -->
      <div class="file-drop-zone"
           :class="{ dragging: isDragging }"
           @drop="onDrop"
           @dragover.prevent
           @dragleave="isDragging = false">
        <Upload size="48" class="upload-icon" />
        <p>{{ $t('iflow.importDialog.dropHint') }}</p>
        <button class="btn btn-secondary" @click="openFilePicker">
          {{ $t('iflow.importDialog.selectFile') }}
        </button>
        <input
          type="file"
          ref="fileInput"
          accept=".zip,.iflow-mod"
          multiple
          @change="onFileSelected"
          style="display: none"
        />
      </div>

      <!-- 文件列表（待导入） -->
      <div v-if="selectedFiles.length > 0" class="file-list">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
          <button class="btn-icon" @click="removeFile(index)">
            <Close size="14" />
          </button>
        </div>
      </div>

      <!-- 导入选项 -->
      <div class="import-options">
        <Checkbox
          :model-value="autoEnable"
          @update:model-value="$emit('update:autoEnable', $event)"
        >
          {{ $t('iflow.importDialog.autoEnable') }}
        </Checkbox>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('close')">
        {{ $t('common.cancel') }}
      </button>
      <button class="btn btn-primary" @click="$emit('import', selectedFiles)" :disabled="selectedFiles.length === 0">
        <Upload size="14" /> {{ $t('iflow.import') }}
      </button>
    </template>
  </Dialog>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// --- 状态 ---
const isLoading = ref(false)
const mods = ref<IflowMod[]>([])
const selectedCategory = ref('all')

// --- 计算属性 ---
const sortedMods = computed(() => {
  // 按 installedAt 升序排序（旧的在前）
  return [...mods.value].sort((a, b) => new Date(a.installedAt).getTime() - new Date(b.installedAt).getTime())
})

const filteredMods = computed(() => {
  if (selectedCategory.value === 'all') {
    return sortedMods.value
  }
  return sortedMods.value.filter(mod => mod.category === selectedCategory.value)
})

const categories = computed(() => [
  { value: 'all', label: 'iflow.category.all' },
  { value: 'UI', label: 'iflow.category.UI' },
  { value: 'Performance', label: 'iflow.category.Performance' },
  { value: 'Feature', label: 'iflow.category.Feature' },
  { value: 'Other', label: 'iflow.category.Other' },
])

const getCategoryCount = (category) => {
  if (category === 'all') return mods.value.length
  return mods.value.filter(mod => mod.category === category).length
}

// --- 方法 ---
const loadMods = async () => {
  isLoading.value = true
  try {
    mods.value = await window.electronAPI.iflowListMods()
  } finally {
    isLoading.value = false
  }
}

const enableMod = async (modId, enabled) => {
  await window.electronAPI.iflowToggleMod(modId, enabled)
  await loadMods()
}

const deleteMod = async (modId) => {
  await window.electronAPI.iflowDeleteMod(modId)
  await loadMods()
}

const exportMod = async (modId) => {
  const dest = await window.electronAPI.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择导出目录'
  })
  if (!dest.canceled && dest.filePaths.length > 0) {
    await window.electronAPI.iflowExportMod(modId, dest.filePaths[0])
  }
}

const importMod = async () => {
  const zip = await window.electronAPI.showOpenDialog({
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
    properties: ['openFile'],
    title: '选择 Mod ZIP 文件'
  })
  if (!zip.canceled && zip.filePaths.length > 0) {
    await window.electronAPI.iflowImportMod(zip.filePaths[0])
    await loadMods()
  }
}

const toggleMod = async (modId, enabled) => {
  await enableMod(modId, enabled)
}

// 生命周期
onMounted(() => {
  loadMods()
})
</script>

```

#### 5.3.2 ExportModDialog（导出对话框）

**功能**：将单个 Mod 导出为 `.iflow-mod` 文件（完整导出）

**UI 结构**：
```vue
<template>
  <Dialog :title="$t('iflow.exportDialog.title', { name: mod?.name })" @close="$emit('close')">
    <div class="export-dialog">
      <!-- Mod 信息预览 -->
      <div v-if="mod" class="mod-preview">
        <div class="preview-row">
          <span class="label">{{ $t('iflow.modName') }}:</span>
          <span>{{ mod.name }}</span>
        </div>
        <div class="preview-row">
          <span class="label">{{ $t('iflow.modVersion') }}:</span>
          <span>v{{ mod.version }}</span>
        </div>
        <div class="preview-row">
          <span class="label">{{ $t('iflow.modType') }}:</span>
          <span>{{ $t(`iflow.types.${mod.type}`) }}</span>
        </div>
        <div class="preview-row">
          <span class="label">{{ $t('iflow.modAuthor') }}:</span>
          <span>{{ mod.author || '-' }}</span>
        </div>
      </div>

      <!-- 保存路径 -->
      <div class="save-path">
        <label>{{ $t('iflow.exportDialog.saveTo') }}</label>
        <div class="path-input">
          <input
            type="text"
            :value="savePath"
            readonly
            @click="openFolderPicker"
            :placeholder="$t('iflow.exportDialog.selectFolder')"
          />
          <button class="btn btn-secondary" @click="openFolderPicker">
            <FolderOpen size="14" />
          </button>
        </div>
        <div class="file-name-preview">
          <span>文件名：</span>
          <span class="file-name">{{ fileName }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('close')">
        {{ $t('common.cancel') }}
      </button>
      <button class="btn btn-primary" @click="$emit('export', { modId, savePath })" :disabled="!savePath">
        <Download size="14" /> {{ $t('iflow.export') }}
      </button>
    </template>
  </Dialog>
</template>
```


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// --- 状态 ---
const isLoading = ref(false)
const mods = ref<IflowMod[]>([])
const selectedCategory = ref('all')

// --- 计算属性 ---
const sortedMods = computed(() => {
  // 按 installedAt 升序排序（旧的在前）
  return [...mods.value].sort((a, b) => new Date(a.installedAt).getTime() - new Date(b.installedAt).getTime())
})

const filteredMods = computed(() => {
  if (selectedCategory.value === 'all') {
    return sortedMods.value
  }
  return sortedMods.value.filter(mod => mod.category === selectedCategory.value)
})

const categories = computed(() => [
  { value: 'all', label: 'iflow.category.all' },
  { value: 'UI', label: 'iflow.category.UI' },
  { value: 'Performance', label: 'iflow.category.Performance' },
  { value: 'Feature', label: 'iflow.category.Feature' },
  { value: 'Other', label: 'iflow.category.Other' },
])

const getCategoryCount = (category) => {
  if (category === 'all') return mods.value.length
  return mods.value.filter(mod => mod.category === category).length
}

// --- 方法 ---
const loadMods = async () => {
  isLoading.value = true
  try {
    mods.value = await window.electronAPI.iflowListMods()
  } finally {
    isLoading.value = false
  }
}

const enableMod = async (modId, enabled) => {
  await window.electronAPI.iflowToggleMod(modId, enabled)
  await loadMods()
}

const deleteMod = async (modId) => {
  await window.electronAPI.iflowDeleteMod(modId)
  await loadMods()
}

const exportMod = async (modId) => {
  const dest = await window.electronAPI.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择导出目录'
  })
  if (!dest.canceled && dest.filePaths.length > 0) {
    await window.electronAPI.iflowExportMod(modId, dest.filePaths[0])
  }
}

const importMod = async () => {
  const zip = await window.electronAPI.showOpenDialog({
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
    properties: ['openFile'],
    title: '选择 Mod ZIP 文件'
  })
  if (!zip.canceled && zip.filePaths.length > 0) {
    await window.electronAPI.iflowImportMod(zip.filePaths[0])
    await loadMods()
  }
}

const toggleMod = async (modId, enabled) => {
  await enableMod(modId, enabled)
}

// 生命周期
onMounted(() => {
  loadMods()
})
</script>

```

---

## 🔌 6. IPC 接口详细设计

### 6.1 接口清单

渲染进程通过 `preload.js` 暴露的 API 调用主进程：

```typescript
// preload.js 中新增的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // ── iFlow Mod 管理 ───────────────────────────────────────
  iflowGetIflowVersion(): Promise<IflowVersionResult>
  iflowListMods(): Promise<ListModsResult>
  iflowGetModCompatibility(modId: string): Promise<ModCompatibilityResult>
  iflowEnableMod(modId: string, enabled: boolean): Promise<IpcResult>
  iflowDeleteMod(modId: string): Promise<IpcResult>
  iflowExportMod(modId: string): Promise<ExportModResult>
  iflowImportMod(filePath: string): Promise<ImportModResult>
})
```

### 6.2 接口详细定义

#### 6.2.0 iflowGetIflowVersion（新增）

**说明**：获取当前安装的 iflow.js 版本号

**参数**：无

**返回值**：
```typescript
interface IflowVersionResult extends IpcResult {
  version?: string  // iflow.js 版本号（如 "0.5.19"）
}
```

**实现方式**：
- 在主进程中执行 `iflow -v` 命令获取版本号
- 使用 `child_process.exec` 执行命令
- 捕获标准输出并解析版本号
- 处理命令执行失败的情况

**示例实现**：
```javascript
async function getIflowVersion() {
  try {
    const { stdout, stderr } = await execAsync('iflow -v', {
      timeout: 5000,
      windowsHide: true
    })

    if (stderr && !stdout) {
      throw new Error('Failed to get iflow version')
    }

    const version = stdout.trim()
    return { success: true, version }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: 'IFLOW_VERSION_ERROR'
    }
  }
}
```

---

#### 6.2.1 iflowListMods

**说明**：获取所有已安装 Mod 列表

**参数**：无

**返回值**：
```typescript
interface ListModsResult extends IpcResult {
  mods: IflowMod[]             // Mod 列表（已按 installedAt 升序排序）
}
```

**排序规则**：按 `installedAt` 升序（先安装的在前，后安装的在后）

---

#### 6.2.2 iflowGetModCompatibility（新增）

**说明**：检查 Mod 是否与当前 iflow.js 版本兼容

**参数**：
```typescript
{
  modId: string
}
```

**返回值**：
```typescript
interface ModCompatibilityResult extends IpcResult {
  compatible: boolean        // 是否兼容
  currentVersion?: string    // 当前 iflow.js 版本号
  modVersion?: string        // Mod 声明的兼容版本
  constraint?: string        // 版本约束
  reason?: string            // 不兼容原因（如果 incompatible）
}
```

**兼容性检查逻辑**：
1. 调用 `iflowGetIflowVersion()` 获取当前版本
2. 读取 Mod 的 `iflowVersion` 和 `iflowVersionConstraint`
3. 根据 `iflowVersionConstraint` 的值进行版本比较：
   - `0.5.19+`：检查 `currentVersion >= iflowVersion`
   - `0.5.19-`：检查 `currentVersion <= iflowVersion`
   - `0.5.19`：检查 `currentVersion === iflowVersion`
   - `*`：始终返回 `compatible: true`（不推荐使用）

4. 返回兼容性检查结果

**示例**：
```javascript
// 示例 1：兼容
// iflow.js 版本：0.5.19
// Mod 声明：iflowVersion: "0.5.19", constraint: "0.5.19+"
// 结果：compatible: true

// 示例 2：不兼容（版本过新）
// iflow.js 版本：0.6.0
// Mod 声明：iflowVersion: "0.5.19", constraint: "0.5.19+"
// 结果：compatible: false, reason: "Mod requires iflow.js 0.5.19 or later, but current version is 0.6.0"

// 示例 3：不兼容（版本过旧）
// iflow.js 版本：0.5.18
// Mod 声明：iflowVersion: "0.5.19", constraint: "0.5.19+"
// 结果：compatible: false, reason: "Mod requires iflow.js 0.5.19 or later, but current version is 0.5.18"
```

---

#### 6.2.3 iflowEnableMod

**说明**：启用或禁用 Mod（启用前会自动检查版本兼容性）

**参数**：
```typescript
{
  modId: string,
  enabled: boolean
}
```

**返回值**：
```typescript
interface IpcResult {
  success: boolean
  error?: string
  code?: string
}
```

**处理流程**：
1. 调用 `iflowGetIflowVersion()` 获取当前 iflow.js 版本
2. 调用 `iflowGetModCompatibility(modId)` 检查版本兼容性
3. 如果 `!compatible`，返回错误并提示用户
4. 更新 `mods[modId].enabled = enabled`
5. 重新计算所有启用的 Mod 的应用顺序（按 `installedAt` 升序）
6. 流式读取 iflow.js 原始内容（大文件优化）
7. 遍历启用的 Mod，根据 `type` 应用变更：
   - `replace`：直接替换整个文件
   - `append`：追加到文件末尾
   - `prepend`：插入到文件开头
   - `patch`：（暂不实现，需要 diff 库）
8. 流式原子写入 iflow.js（`.tmp` + `rename`，异步流式写入）
9. 保存 mods.json
10. 刷新 UI

---

#### 6.2.4 iflowDeleteMod

**说明**：删除 Mod

**参数**：
```typescript
{
  modId: string
}
```

**返回值**：`IpcResult`

**处理流程**：
1. 调用 `iflowGetIflowVersion()` 获取当前 iflow.js 版本
2. 调用 `iflowGetModCompatibility(modId)` 检查版本兼容性
3. 如果 `!compatible`，返回错误并提示用户
4. 如果 Mod 当前已启用，先禁用（从 iflow.js 中移除其变更）
5. 删除 Mod 目录：`~/.iflow/mods/iflow/{mod-id}/`
6. 从 `mods.json` 中移除该 Mod 记录
7. 保存 mods.json
8. 刷新 UI

---

#### 6.2.5 iflowExportMod

**说明**：导出单个 Mod 为 ZIP 文件

**参数**：
```typescript
{
  modId: string
}
```

**返回值**：
```typescript
interface ExportModResult extends IpcResult {
  filePath: string  // 生成的 ZIP 文件完整路径
}
```

**处理流程**：
1. 从 `mods.json` 读取 Mod 元数据
2. 定位 Mod 目录：`~/.iflow/mods/iflow/{mod-id}/`
3. 读取所有文件（mod.json + 主体文件 + 可选文件）
4. 创建 ZIP 压缩包
5. 弹出"另存为"对话框，用户选择保存位置
6. 写入 ZIP 文件
7. 返回文件路径

**文件名生成规则**：
```
{mod-name}-v{version}.iflow-mod
// 示例：ui-enhancement-v1.2.0.iflow-mod
```

**说明**：
- 导出格式直接使用 `.iflow-mod` 扩展名（不包含 `.zip`）
- 文件实际上是 ZIP 格式，但扩展名简化为 `.iflow-mod`
- 导入时支持 `.zip` 和 `.iflow-mod` 两种格式（向后兼容）

---

#### 6.2.6 iflowImportMod

**说明**：导入一个或多个 Mod 包

**参数**：
```typescript
{
  filePath: string  // 用户选择的文件完整路径（支持 .zip 或 .iflow-mod 格式）
}
```

**返回值**：
```typescript
interface ImportModResult extends IpcResult {
  imported: number      // 成功导入的数量
  failed: number        // 失败的数量
  errors: string[]      // 失败原因列表
  modIds: string[]      // 成功导入的 Mod ID 列表
}
```

**处理流程**：
1. 使用 `adm-zip` 库解压文件（自动识别 .zip 和 .iflow-mod 格式）
2. 验证 mod.json 和主体文件（根据 type 字段）
3. 验证 mod.json 字段完整性（id, name, type, version 不能为空，author、category、description 为可选）
4. 检查 ID 冲突
5. 移动文件到 `~/.iflow/mods/iflow/{mod-id}/`
6. 更新 `mods.json` 中的 Mod 元数据（写入 `mods.json` 文件）
7. 保存 settings.json
8. 返回统计信息

**版本兼容性验证**：
- 导入时检查 `iflowVersion` 和 `iflowVersionConstraint` 是否存在
- 如果存在，验证当前 iflow.js 版本是否兼容
- 如果不兼容，返回错误并提示用户：
  ```json
  {
    "success": false,
    "error": "Mod requires iflow.js 0.5.19 or later, but current version is 0.5.18",
    "code": "IFLOW_VERSION_INCOMPATIBLE",
    "modId": "ui-enhancement-001",
    "requiredVersion": "0.5.19",
    "currentVersion": "1.13.0",
    "constraint": "compatible-or-later"
  }
  ```

---

### 6.3 preload.js 暴露

在 `preload.js` 中添加：

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有 API ...

  // iFlow Mod 管理
  iflowGetIflowVersion: () => ipcRenderer.invoke('iflow:get-version'),
  iflowListMods: () => ipcRenderer.invoke('iflow:list-mods'),
  iflowGetModCompatibility: (modId) => ipcRenderer.invoke('iflow:get-mod-compatibility', modId),
  iflowEnableMod: (modId, enabled) => ipcRenderer.invoke('iflow:enable-mod', modId, enabled),
  iflowDeleteMod: (modId) => ipcRenderer.invoke('iflow:delete-mod', modId),
  iflowExportMod: (modId) => ipcRenderer.invoke('iflow:export-mod', modId),
  iflowImportMod: (filePath) => ipcRenderer.invoke('iflow:import-mod', filePath),
})
```

### 6.4 主进程 IPC 注册

在 `src/main/ipc/index.js` 中添加：

```javascript
const { registerIflowIpcHandlers } = require('./iflow')

function registerIpcHandlers(getMainWindow, t) {
  // ... 现有注册 ...

    // 注册 iFlow Mod 管理处理器
  registerIflowIpcHandlers()
}
```

在 `src/main/index.js` 中确保调用：

```javascript
const { registerIpcHandlers } = require('./ipc')
registerIpcHandlers(getMainWindow, t)
```

---

## 🗂️ 7. 文件存储结构

### 7.1 目录布局

```
~/.iflow/
├── settings.json          # 主配置文件（不包含 Mod 数据）
├── mods/
│   └── iflow/
│       ├── mods.json      # Mod 元数据索引文件（唯一数据源）
│       ├── {mod-id-1}/
│       │   ├── mod.json          # 必需：Mod 元数据
│       │   ├── code.js           # 或 patch.diff（根据 type 决定）
│       │   ├── README.md         # 可选
│       │   ├── LICENSE           # 可选
│       │   └── icon.png          # 可选
│       ├── {mod-id-2}/
│       │   └── ...
│       └── index.json            # 索引（可选，实际数据在 mods.json）
└── logs/
    └── iflow-mods.log     # Mod 操作日志（可选）
```

**说明**：
- `mods.json` 是唯一数据源，存储 Mod 元数据（位于 `~/.iflow/mods/iflow/mods.json`）
- `settings.json` 不包含 Mod 数据，仅存储应用级配置
- 文件系统仅存储 Mod 包的实际文件（mod.json + 主体文件 + 可选文件）
- `index.json` 可选的目录索引，用于快速扫描（目前不使用，依赖 mods.json）

### 7.2 Mod 包目录结构规范

#### 7.2.1 必需文件

| 文件/目录 | 说明 | 格式 | 必填 |
|-----------|------|------|------|
| `mod.json` | Mod 元数据配置文件 | JSON | ✅ 必需 |
| `code.js` 或 `patch.diff` | Mod 主体文件（根据 type 字段决定） | JS / Diff | ✅ 必需 |

#### 7.2.2 mod.json 规范

**TypeScript 接口**：
```typescript
export interface IflowModMetadata {
  // ── 基础信息（必需） ───────────────────────────────────
  id: string              // 唯一标识符（导入时生成 UUID）
  name: string            // Mod 显示名称
  type: 'patch' | 'replace' | 'append' | 'prepend'  // Mod 类型
  version: string         // 版本号（语义化版本，如 "1.2.0"）

  // ── 可选字段 ───────────────────────────────────────────
  author?: string         // 作者/维护者
  category?: string       // 分类（如 "UI"、"性能"、"功能增强"）
  description?: string    // 详细描述
  icon?: string           // 图标（emoji 如 "🚀" 或图标名）
  tags?: string[]         // 标签数组
  homepage?: string       // 项目主页 URL
  repository?: string     // 代码仓库 URL
  license?: string        // 许可证（如 "MIT"、"GPL-3.0"）
}
```

**字段说明**：
- `id`：导入时自动生成 UUID v4，确保全局唯一
- `name`：显示名称，最多 50 字符
- `type`：决定主体文件的类型（见下表）
- `version`：语义化版本号（SemVer）
- `author`：作者/维护者，最多 50 字符（可选）
- `category`：分类（如 "UI"、"性能"、"功能增强"、"其他"），最多 30 字符（可选）
- `description`：详细描述，最多 200 字符（可选）
- `iflowVersion`：兼容的 iflow.js 版本号（可选，推荐填写）
- `iflowVersionConstraint`：版本兼容性约束（可选，默认为 "0.5.19+"）

#### 7.2.3 Mod 类型与主体文件映射

| `type` 值 | 主体文件 | 说明 |
|-----------|----------|------|
| `patch`   | `patch.diff` | 包含 unified diff 格式的差异补丁 |
| `replace` | `code.js` | 完整的替换文件内容（整个文件） |
| `append`  | `code.js` | 要追加到文件末尾的代码片段 |
| `prepend` | `code.js` | 要插入到文件开头的代码片段 |

**示例**：
- 如果 `type: 'patch'`，则必须存在 `patch.diff`，`code.js` 可以不存在
- 如果 `type: 'replace'`，则必须存在 `code.js`，`patch.diff` 可以不存在
- `append`/`prepend` 类型同理

#### 7.2.4 版本兼容性字段（新增）

在 `mod.json` 中添加 `iflowVersion` 和 `iflowVersionConstraint` 字段（可选）：

```json
{
  "id": "ui-enhancement-001",
  "name": "UI 增强 - 深色模式优化",
  "author": "张三",
  "category": "UI",
  "description": "为 iFlow 界面添加深色模式支持",
  "type": "replace",
  "version": "1.2.0",
  "iflowVersion": "0.5.19",
  "iflowVersionConstraint": "0.5.19+",
  "icon": "🎨",
  "tags": ["UI", "主题", "深色模式"],
  "homepage": "https://github.com/user/iflow-ui-enhancement",
  "license": "MIT"
}
```

**字段说明**：
- `iflowVersion`: Mod 开发时使用的 iflow.js 版本号（如 "0.5.19"）
- `iflowVersionConstraint`: 版本兼容性约束（见下方详细说明）

**版本兼容性约束说明** (`iflowVersionConstraint`):

| 约束值 | 说明 | 兼容性判断 |
|--------|------|------------|
| `0.5.19+` | 兼容当前版本或更新版本（默认） | `currentVersion >= iflowVersion` |
| `0.5.19-` | 兼容当前版本或更旧版本 | `currentVersion <= iflowVersion` |
| `0.5.19` | 仅兼容指定版本 | `currentVersion === iflowVersion` |
| `*` | 兼容所有版本（不推荐） | 始终返回 `compatible: true` |

**版本号格式**：
- 使用语义化版本号（SemVer）：`主版本.次版本.修订号`（如 `0.5.19`）
- 比较规则：先比较主版本号，主版本号相同则比较次版本号，以此类推
- 示例：
  - `0.5.19` 兼容 `0.5.19`、`0.5.20`、`0.6.0`
  - `0.5.19` **不兼容** `0.5.18`、`0.5.17`

#### 7.2.5 可选文件

| 文件/目录 | 说明 |
|-----------|------|
| `README.md` | Mod 详细文档（Markdown 格式） |
| `LICENSE`   | 许可证文件 |
| `icon.png` / `icon.svg` | 自定义图标（替代 `mod.json` 中的 `icon` 字段） |
| `tests/`    | 测试文件目录（用于 Mod 开发调试） |
| `src/`      | 源代码目录（用于 Mod 开发） |

#### 7.2.5 完整示例

```
ui-enhancement-001/
├── mod.json              # 必需：元数据
├── code.js               # 必需：Mod 主体（type='replace'）
├── README.md             # 可选：详细文档
├── LICENSE               # 可选：MIT 许可证
└── icon.png              # 可选：自定义图标
```

`mod.json` 示例：

```json
{
  "id": "ui-enhancement-001",
  "name": "UI 增强 - 深色模式优化",
  "author": "张三",
  "category": "UI",
  "description": "为 iFlow 界面添加深色模式支持，优化对比度，减少眼部疲劳。",
  "type": "replace",
  "version": "1.2.0",
  "icon": "🎨",
  "tags": ["UI", "主题", "深色模式"],
  "homepage": "https://github.com/user/iflow-ui-enhancement",
  "license": "MIT"
}
```

#### 7.2.6 Mod 包验证规则

系统在加载 Mod 包时会进行以下验证：

1. **目录结构检查**：
   - 必须存在 `mod.json` 文件
   - 根据 `type` 字段，必须存在对应的主体文件（`code.js` 或 `patch.diff`）

2. **mod.json 字段检查**：
   - 必需字段：`id`, `name`, `type`, `version`
   - 可选字段：`author`, `category`, `description`, `iflowVersion`, `iflowVersionConstraint`
   - 必需字段非空且类型正确
   - `type` 值必须是有效的枚举值
   - `iflowVersion` 和 `iflowVersionConstraint` 如果填写必须符合版本号格式

3. **文件大小限制**：
   - ZIP 包总大小不超过 50MB

4. **文件名安全**：
   - 不使用特殊字符（`/ \ ? * : | " < >`）
   - 不使用保留文件名（`CON`, `PRN`, `AUX`, `NUL` 等 Windows 保留名）

5. **内容安全（可选）**：
   - 检查是否包含可疑代码（如 `eval`, `Function` 构造函数）
   - 检查是否访问敏感 API（如 `fs`, `child_process`，Mod 不应拥有这些权限）

6. **版本兼容性检查**：
   - 如果 Mod 声明了 `iflowVersion`，则必须检查当前 iflow.js 版本是否兼容
   - 如果不兼容，返回错误并提示用户（见 6.2.6 节）
   - 如果 `iflowVersionConstraint` 未填写，默认使用 `'0.5.19+'`

#### 7.3.2 mods.json 元数据索引文件（写入 `mods.json` 文件）

**文件路径**：`~/.iflow/mods/iflow/mods.json`

**文件结构**：
```json
{
  "version": 1,
  "mods": {
    "ui-enhancement-001": {
      "id": "ui-enhancement-001",
      "name": "UI 增强 - 深色模式优化",
      "version": "1.2.0",
      "type": "replace",
      "description": "为 iFlow 界面添加深色模式支持",
      "author": "张三",
      "category": "UI",
      "iflowVersion": "0.5.19",
      "iflowVersionConstraint": "0.5.19+",
      "enabled": false,
      "installedAt": 1746432000000
    },
    "performance-optimization-002": {
      "id": "performance-optimization-002",
      "name": "性能优化 - 启动加速",
      "version": "1.0.0",
      "type": "append",
      "description": "优化 iFlow CLI 启动速度",
      "author": "李四",
      "category": "Performance",
      "iflowVersion": "1.13.0",
      "iflowVersionConstraint": "1.13+",
      "enabled": true,
      "installedAt": 1746300000000
    }
  },
  "updatedAt": 1746432000000,
  "totalMods": 2
}
```

**字段说明**：
- `version`: 元数据索引文件版本号（当前为 1）
- `mods`: Mod 对象字典（key = Mod ID）
- `updatedAt`: 最后更新时间戳（毫秒）
- `totalMods`: Mod 总数（用于快速统计）

**读写操作**：
- **写入**：每次导入/删除/启用/禁用 Mod 时，更新 `mods.json`
- **读取**：通过 IPC 调用 `iflowListMods()` 读取 `mods.json`
- **原子性**：使用临时文件（`.tmp`）+ `rename` 保证写入原子性
- **错误恢复**：如果 `mods.json` 损坏，清空文件并重建

系统在加载 Mod 包时会进行以下验证：

1. **目录结构检查**：
   - 必须存在 `mod.json` 文件
   - 根据 `type` 字段，必须存在对应的主体文件（`code.js` 或 `patch.diff`）

2. **mod.json 字段检查**：
   - 必需字段：`id`, `name`, `type`, `version`
   - 可选字段：`author`, `category`, `description`
   - 必需字段非空且类型正确
   - `type` 值必须是有效的枚举值

3. **文件大小限制**：
   - ZIP 包总大小不超过 50MB

4. **文件名安全**：
   - 不使用特殊字符（`/ \ ? * : | " < >`）
   - 不使用保留文件名（`CON`, `PRN`, `AUX`, `NUL` 等 Windows 保留名）

5. **内容安全（可选）**：
   - 检查是否包含可疑代码（如 `eval`, `Function` 构造函数）
   - 检查是否访问敏感 API（如 `fs`, `child_process`，Mod 不应拥有这些权限）

---

### 7.3 文件存储结构

#### 7.3.1 目录布局

```
~/.iflow/
├── settings.json          # 主配置文件（不包含 Mod 数据）
├── mods/
│   └── iflow/
│       ├── mods.json      # Mod 元数据索引文件
│       ├── {mod-id-1}/
│       │   ├── mod.json          # 必需：Mod 元数据
│       │   ├── code.js           # 或 patch.diff（根据 type 决定）
│       │   ├── README.md         # 可选
│       │   ├── LICENSE           # 可选
│       │   └── icon.png          # 可选
│       ├── {mod-id-2}/
│       │   └── ...
│       └── index.json            # 索引（可选，实际数据在 mods.json）
└── logs/
    └── iflow-mods.log     # Mod 操作日志（可选）
```

**说明**：
- `settings.json` 仅存储应用配置（API 配置、云同步、UI 设置等），不包含 Mod 元数据
- `mods.json` 是 Mod 的唯一元数据索引文件（位于 `~/.iflow/mods/iflow/mods.json`）
- 文件系统仅存储 Mod 包的实际文件（mod.json + 主体文件 + 可选文件）
- `index.json` 可选的目录索引，用于快速扫描（目前不使用，依赖 mods.json）

#### 7.3.2 mods.json 元数据索引文件

`mods.json` 是 Mod 元数据的集中索引文件，存储在 `~/.iflow/mods/iflow/mods.json`，用于快速查找和管理已安装的 Mod。

**文件结构**：
```json
{
  "version": 1,
  "timestamp": 1746432000000,
  "mods": [
    {
      "id": "ui-enhancement-001",
      "name": "UI 增强 - 深色模式优化",
      "version": "1.2.0",
      "type": "replace",
      "description": "为 iFlow 界面添加深色模式支持",
      "author": "张三",
      "category": "UI",
      "iflowVersion": "1.14.0",
      "iflowVersionConstraint": "1.14+",
      "enabled": false,
      "installedAt": 1746432000000,
      "lastModified": 1746432000000
    },
    {
      "id": "command-shortcut-002",
      "name": "命令快捷键增强",
      "version": "0.8.0",
      "type": "patch",
      "description": "增强命令快捷键功能",
      "author": "李四",
      "category": "Commands",
      "iflowVersion": "1.13.0",
      "iflowVersionConstraint": "1.13-",
      "enabled": true,
      "installedAt": 1746345600000,
      "lastModified": 1746345600000
    }
  ]
}
```

**字段说明**：

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `version` | number | 是 | 文件格式版本号（当前为 1） |
| `timestamp` | number | 是 | 元数据更新时间戳（毫秒） |
| `mods` | IflowMod[] | 是 | Mod 对象数组（见 3.2.1 节定义） |
| `id` | string | 是 | Mod 唯一标识符（见 3.1 节命名规范） |
| `name` | string | 是 | Mod 显示名称 |
| `version` | string | 是 | Mod 版本号（SemVer 格式） |
| `type` | 'replace' \| 'patch' | 是 | Mod 类型（见 3.3 节） |
| `description` | string | 是 | Mod 描述 |
| `author` | string | 是 | Mod 作者 |
| `category` | string | 是 | Mod 分类（见 3.1 节分类规范） |
| `iflowVersion` | string | 否 | Mod 开发时使用的 iflow.js 版本号 |
| `iflowVersionConstraint` | '0.5.19+' \| '0.5.19-' \| '0.5.19' \| '*' | 否 | 兼容性约束（见 6.2 节） |
| `enabled` | boolean | 是 | 是否已启用 |
| `installedAt` | number | 是 | 安装时间戳（毫秒） |
| `lastModified` | number | 是 | 最后修改时间戳（毫秒） |

**更新机制**：

1. **原子写入**：修改 `mods.json` 时先写入临时文件，成功后再重命名覆盖原文件
2. **时间戳同步**：每次写入时更新 `timestamp` 和 `lastModified` 字段
3. **备份机制**：生成 `.bak` 备份文件（如 `mods.json.bak`）
4. **懒加载**：应用启动时仅读取 `mods.json`，Mod 具体数据按需加载

**与 settings.json 的区别**：

- `settings.json`：存储应用配置（API、云同步、界面偏好等），不包含 Mod 数据
- `mods.json`：存储 Mod 元数据（仅元数据，不包含代码），独立于 `settings.json`
- 两者通过 `id` 字段关联，但数据完全分离，互不影响

**索引文件（可选）**：

`index.json` 是可选的索引文件，用于加速大文件系统的查询性能：

```json
{
  "version": 1,
  "mods": {
    "ui-enhancement-001": {
      "name": "UI 增强 - 深色模式优化",
      "version": "1.2.0",
      "enabled": false,
      "path": "mods/iflow/ui-enhancement-001"
    },
    "command-shortcut-002": {
      "name": "命令快捷键增强",
      "version": "0.8.0",
      "enabled": true,
      "path": "mods/iflow/command-shortcut-002"
    }
  }
}
```

**使用场景**：

- **快速查找**：通过 `id` 查找 Mod 元数据
- **批量操作**：遍历 `mods` 数组进行批量启用/禁用/删除
- **版本管理**：检查 Mod 版本、作者、描述等元信息
- **冲突检测**：基于 `lastModified` 字段判断数据冲突

**注意事项**：

1. `mods.json` 必须是有效的 JSON 格式，否则应用无法启动
2. `id` 字段必须唯一，重复 `id` 会导致覆盖冲突
 3. `iflowVersionConstraint` 必须使用简化符号（`0.5.19+`、`0.5.19-`、`0.5.19`、`*`）4. `timestamp` 和 `lastModified` 使用 Unix 时间戳（毫秒）



---

## 🌐 8. 国际化（i18n）设计

在 `src/locales/index.js`（中文）、`en-US.js`、`ja-JP.js` 中添加：

```javascript
// zh-CN (index.js)
export default {
  // ... 现有翻译 ...

  // iFlow Mod Management
  iflow: {
    title: 'iFlow Mod',
    description: '管理 iFlow CLI 核心文件 (iflow.js) 的 Mod 扩展',
    fileStatus: '文件状态',
    enabledMods: '已启用 Mod',

    // Mod 管理
    mods: {
      title: 'Mod 管理',
      import: '导入 Mod',
      export: '导出',
      exportAll: '导出全部',
      deleteSelected: '删除选中',
      emptyTitle: '暂无 Mod',
      emptyDesc: '点击"导入 Mod"添加第一个 Mod',
      modName: 'Mod 名称',
      modType: '类型',
      modAuthor: '作者',
      confirmDelete: '确定要删除此 Mod 吗？',
      types: {
        patch: '补丁 (Patch)',
        replace: '替换 (Replace)',
        append: '追加 (Append)',
        prepend: '前置 (Prepend)'
      }
    },

    // 导入/导出
    importExport: {
      importTitle: '导入 Mod',
      exportTitle: '导出 Mod',
      selectFile: '选择 Mod 文件',
      importSuccess: 'Mod 导入成功',
      importError: '导入失败：{error}',
    }
  },
}
```


---

## 🛡️ 9. 安全性与错误处理

### 9.1 文件操作安全

**原子写入**：
- 所有写入 iflow.js 的操作使用临时文件（`.tmp`）+ `rename` 保证原子性
- 避免写入中断导致文件损坏

**错误恢复**：
- 写入失败时保留原始文件不变
- 提供手动恢复选项（从备份恢复）

### 9.2 Mod 安全

**代码审查**：
- Mod 内容不经过滤（信任用户）
- 应用前用户可预览 Mod 内容
- 高风险操作（replace 类型）需要二次确认

### 9.3 数据完整性

**原子性操作**：
```javascript
async function applyMods() {
  try {
    const newContent = await computeAppliedContent()
    await writeIflowFile(newContent)
    await updateSettings()
  } catch (error) {
    throw error  // 失败时不修改原始文件
  }
}
```

---

## ⚡ 10. 性能优化

### 10.1 缓存策略

- **Mod 列表缓存**：缓存在 Pinia store，避免重复读取 settings.json
- **路径缓存**：iflowPath 缓存在 store 中，避免重复计算

### 10.2 懒加载

- IflowModsView 组件懒加载（已在 App.vue 中使用 `defineAsyncComponent`）

### 10.3 大文件处理

iflow.js 可能达到 10MB+，需要特殊优化：

**流式读写**：
- 使用 `fs.createReadStream` 和 `fs.createWriteStream` 替代 `fs.readFileSync` / `fs.writeFileSync`
- 避免一次性将大文件加载到内存，减少内存占用
- 示例实现：
  ```javascript
  // 流式读取
  const chunks = []
  const stream = fs.createReadStream(iflowPath)
  for await (const chunk of stream) chunks.push(chunk)
  const content = Buffer.concat(chunks).toString('utf-8')
  
  // 流式写入（原子操作）
  const tmpPath = iflowPath + '.tmp'
  const writeStream = fs.createWriteStream(tmpPath)
  await new Promise((resolve, reject) => {
    writeStream.write(newContent)
    writeStream.end()
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })
  fs.rename(tmpPath, iflowPath, (err) => {
    if (err) reject(err)
    else resolve()
  })
  ```

**增量合并策略**：
- 仅当 Mod 内容变化时才重新生成 iflow.js
- 启用/禁用 Mod 时，只合并受影响的 Mod，避免全量计算
- 缓存已合并的内容（基于 Mod 列表和顺序的哈希）

**内存优化**：
- Mod 内容以 Buffer 形式存储，减少字符串复制
- 使用 `Buffer.concat` 合并多个 Mod，避免 `+=` 操作符的重复分配
- 及时释放临时 Buffer，避免内存泄漏

**进度反馈**：
- 大文件操作（>5MB）显示进度条或加载状态
- 使用 `stream.bytesWritten` 跟踪写入进度
- 在 UI 中显示"正在应用 Mod..."提示，避免用户误操作

**性能监控**：
- 记录文件大小和操作耗时，用于性能分析
- 超过 50MB 时发出警告，建议用户优化 iflow.js

---

## 🧪 11. 测试策略

### 11.1 单元测试

**测试文件位置**：
- `src/stores/iflowMods.test.ts` - Store 逻辑测试
- `src/main/ipc/iflow.test.js` - IPC 处理器测试

**测试用例示例**：

```typescript
// iflowMods.test.ts
describe('useIflowModsStore', () => {
  test('should import mod package', async () => {
    const store = useIflowModsStore()
    const result = await store.importMod('/path/to/mod.iflow-mod')
    expect(result.success).toBe(true)
    expect(result.imported).toBe(1)
  })

  test('should enable/disable mod correctly', async () => {
    const store = useIflowModsStore()
    await store.enableMod('mod-id', true)
    expect(store.mods['mod-id'].enabled).toBe(true)
  })

  test('should delete mod and clean up files', async () => {
    const store = useIflowModsStore()
    await store.deleteMod('mod-id')
    expect(store.mods['mod-id']).toBeUndefined()
  })
})
```

### 11.2 集成测试

**E2E 测试**（使用 Vitest + Playwright 或 Cypress）：
1. 启动应用 → 导航到 iFlow Mod 页面
2. 导入 Mod → 验证列表更新
3. 启用 Mod → 验证 iflow.js 内容变化
4. 禁用 Mod → 验证 iflow.js 恢复
5. 删除 Mod → 验证文件和记录清除
6. 导出 Mod → 验证 ZIP 文件生成

---

## 📦 12. 依赖管理

### 12.1 新增 npm 依赖

在 `package.json` 中添加：

```json
{
  "dependencies": {
    "adm-zip": "^0.5.10"           // ZIP 打包/解压库
  }
}
```

安装：
```bash
npm install adm-zip
```

---

## 🚀 13. 实施步骤

### Phase 1: 基础架构（1 天）

**目标**：搭建基础框架，实现核心 IPC 接口

1. **类型定义**（待实现）
   - 扩展 `types.ts` 添加 Mod 管理接口

2. **Store 实现**（待实现）
   - 创建 `src/stores/iflowMods.ts`
   - 实现基础状态和 actions

3. **IPC 处理器**（待实现）
   - 创建 `src/main/ipc/iflow.js`
   - 实现 5 个核心接口：`list-mods`, `enable-mod`, `delete-mod`, `export-mod`, `import-mod`
   - 集成到 `src/main/ipc/index.js`

4. **preload 暴露**（待实现）
   - 更新 `preload.js` 暴露 Mod 管理 API

5. **基础 UI**（待实现）
   - 创建 `src/views/IflowModsView.vue`（骨架）
   - 在 `SideBar.vue` 添加导航项
   - 在 `App.vue` 注册路由

6. **国际化**（待实现）
   - 在 `locales/index.js` 添加中文翻译
   - 在 `locales/en-US.js` 添加英文翻译

**验证**：
- 打开 iFlow Mod 页面，显示状态卡片
- 导入 Mod 包（.zip 或 .iflow-mod 格式）后列表更新
- 启用/禁用 Mod 后 iflow.js 内容变化

---

### Phase 2: 测试与优化（1 天）

**目标**：完善错误处理、测试、文档

1. **错误处理**
   - 所有操作添加错误提示
   - 文件权限错误处理
   - 磁盘空间不足提示

2. **单元测试**
   - 编写 Store 测试（iflowMods.test.ts）
   - 编写 IPC 处理器测试（iflow.test.js）
   - 覆盖核心逻辑

3. **E2E 测试**
   - 编写关键路径 E2E 测试
   - 自动化测试流程

4. **文档**
   - 更新 README 添加 Mod 管理章节
   - 编写用户指南（docs/features/iflow-mods.md）
   - 说明支持 .zip 和 .iflow-mod 两种导入格式

5. **代码审查**
   - 代码格式化（Prettier）
   - TypeScript 类型检查（`npm run type-check`）
   - ESLint 检查（如有配置）

---

## 🔮 14. 未来扩展方向

### 14.1 可选增强功能

- **Mod 预览**：在启用前预览 Mod 对 iflow.js 的修改效果
- **Mod 分类筛选**：按分类（UI、性能、功能增强）筛选列表
- **搜索功能**：按名称、描述、作者搜索 Mod
- **图标自定义**：支持自定义 Mod 图标（emoji 或图片）
- **导入验证增强**：更严格的代码安全检查
- **操作日志**：记录所有 Mod 操作（启用、禁用、删除）到日志文件

---

## 📝 15. 注意事项与风险

### 15.1 已知限制

1. **路径依赖**：当前设计假设 iflow.js 在固定路径（通过 `npm config get prefix` 动态获取）。未来可支持用户自定义路径。
2. **并发修改**：如果同时有多个进程修改 iflow.js（罕见），可能产生冲突。
3. **Patch 类型暂未实现**：`patch` 类型需要 diff 库支持，当前版本暂不实现（仅支持 `replace`、`append`、`prepend`）。
4. **无依赖检测**：Mod 之间可能存在依赖冲突，需要用户自行处理。
5. **无版本控制**：不提供版本快照和回滚功能，用户需手动备份 iflow.js。
6. **大文件性能**：iflow.js 可能达到 10MB+，全量读写可能导致卡顿。已采用流式读写和增量合并优化，但超大文件（>50MB）仍可能影响性能。
7. **版本兼容性检查**：依赖 `iflow -v` 命令，如果 iflow 命令不可用或执行失败，将无法获取版本号（已提供降级方案：如果获取失败，默认允许导入/启用）。

### 15.2 用户教育

- 首次使用时显示警告："Mod 功能涉及修改核心文件，请谨慎操作"
- 强调"启用 Mod 前请确认代码来源可信"
- 建议用户在使用前手动备份 iflow.js
- 提供恢复指引（从备份恢复）

### 15.3 安全建议

- Mod 包应仅来自可信来源
- 启用 Mod 前应审查代码内容
- 避免安装来源不明的 Mod
- 定期备份 iflow.js 文件

---

## 📚 16. 参考资料

- **ModOrganizer 设计理念**：https://modorganizer.org/
- **Electron 安全指南**：https://www.electronjs.org/docs/latest/tutorial/security
- **Vue 3 Composition API**：https://vuejs.org/guide/composition-api/introduction.html
- **Pinia 状态管理**：https://pinia.vuejs.org/

---

## ✅ 17. 验收标准

完成上述所有功能后，应满足：

1. ✅ 用户可以查看 iflow.js 文件状态（存在/路径/大小）
2. ✅ 用户可以导入 Mod 包（ZIP 格式，自动验证结构）
3. ✅ 用户可以导出 Mod 为标准化 `.iflow-mod` 文件（ZIP 压缩包）
4. ✅ 用户可以启用/禁用 Mod（实时应用到 iflow.js）
5. ✅ 用户可以删除 Mod（自动清理文件和配置）
6. ✅ Mod 按安装时间顺序（`installedAt` 升序）应用
7. ✅ 所有操作有确认对话框和错误处理
8. ✅ 完整的 TypeScript 类型支持
9. ✅ 中英日三语界面
10. ✅ 单元测试覆盖核心逻辑
11. ✅ 代码符合项目规范（Fluent Design 风格）

---

## 📅 18. 时间估算

| 阶段 | 工作量 | 预计时间 |
|------|--------|----------|
| Phase 1: 基础架构 | 类型定义 + Store + IPC + 基础 UI | 1 天 |
| Phase 2: 测试与优化 | 单元测试 + E2E 测试 + 文档 + 优化 | 1 天 |
| **总计** | - | **2 天** |

---

## 🎯 19. 立即开始

按以下顺序实施：

1. **安装依赖**：`npm install adm-zip`
2. **扩展类型**：修改 `src/shared/types.ts` 添加 Mod 类型定义
3. **创建 Store**：新建 `src/stores/iflowMods.ts` 实现状态管理
4. **创建 IPC**：新建 `src/main/ipc/iflow.js` 实现 5 个核心接口
5. **注册 IPC**：修改 `src/main/ipc/index.js` 注册处理器
6. **暴露 API**：修改 `preload.js` 暴露给渲染进程
7. **创建视图**：新建 `src/views/IflowModsView.vue` 主界面
8. **添加导航**：修改 `SideBar.vue` 添加 iFlow Mod 导航项
9. **国际化**：修改 `locales/index.js`、`en-US.js`、`ja-JP.js`
10. **测试调试**：运行 `npm run dev` 验证功能，编写单元测试

---

**文档版本**：v2.0  
**最后更新**：2026-05-06  
**作者**：iFlow 团队
