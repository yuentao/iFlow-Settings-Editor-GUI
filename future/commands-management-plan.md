# iFlow Commands 管理功能实现方案

## 1. 概述

### 1.1 功能目标
为 iFlow CLI 添加 Commands 管理功能，允许用户通过图形界面管理 `~/.iflow/commands/` 目录下的 `.toml` 命令配置文件。

### 1.2 命令文件结构
每个命令文件为 `.toml` 格式，包含以下字段：

```toml
# Command: cleanproject
# Description: Clean up development artifacts while preserving your working code
# Category: utility
# Version: 1
# Author: 10169

description = "命令简短描述"

prompt = """
命令的详细提示词内容...
"""
```

| 字段 | 来源 | 说明 |
|------|------|------|
| Command | 文件名 | 命令标识符 |
| Description | 注释 `# Description:` | 命令描述 |
| Category | 注释 `# Category:` | 分类 (utility/documentation/...) |
| Version | 注释 `# Version:` | 版本号 |
| Author | 注释 `# Author:` | 作者 |
| description | TOML 键值 | 命令描述 |
| prompt | TOML 键值 | 命令提示词 |

### 1.3 目标文件路径
- **iFlow 配置目录**: `C:\Users\<用户名>\.iflow\commands\`
- **项目目录**: `E:\yuantao\iFlow-Settings-Editor-GUI\`

---

## 2. 技术架构

### 2.1 组件结构

```
src/
├── views/
│   └── CommandsView.vue          # 新增: 命令管理主视图
├── components/
│   └── CommandEditorDialog.vue   # 新增: 命令编辑器弹窗
├── locales/
│   └── index.js                  # 修改: 添加 commands 相关翻译
├── App.vue                       # 修改: 添加 commands 视图路由
├── main.js                       # 修改: 注册 IPC handler
└── preload.js                   # 修改: 暴露 commands API
```

### 2.2 IPC API 设计

```javascript
// preload.js - 新增 API
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有 API ...

  // Commands 管理
  listCommands: () => ipcRenderer.invoke('list-commands'),
  createCommand: (name, data) => ipcRenderer.invoke('create-command', name, data),
  updateCommand: (name, data) => ipcRenderer.invoke('update-command', name, data),
  deleteCommand: (name) => ipcRenderer.invoke('delete-command', name),
  readCommand: (name) => ipcRenderer.invoke('read-command', name),
  exportCommand: (name) => ipcRenderer.invoke('export-command', name),
})
```

### 2.3 main.js Handler 设计

```javascript
// main.js - 新增 IPC handlers
ipcMain.handle('list-commands', async () => {
  // 读取 ~/.iflow/commands/ 目录下所有 .toml 文件
  // 解析 metadata 和 content
  // 返回命令列表
})

ipcMain.handle('create-command', async (event, name, data) => {
  // 在 ~/.iflow/commands/ 创建新的 .toml 文件
  // data 包含 description, prompt, category, version, author
})

ipcMain.handle('update-command', async (event, name, data) => {
  // 更新现有命令文件
})

ipcMain.handle('delete-command', async (event, name) => {
  // 删除指定的 .toml 文件
})

ipcMain.handle('read-command', async (event, name) => {
  // 读取单个命令文件内容
})

ipcMain.handle('export-command', async (event, name) => {
  // 导出命令到用户选择的目录
})
```

---

## 3. 前端实现

### 3.1 CommandsView.vue 功能

#### 布局结构
```
┌─────────────────────────────────────────────────────────┐
│  CommandsView                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Header: 标题 + 导入按钮                               ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ Filter: 分类筛选标签 (全部/utility/documentation/...) ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ List: 命令列表                                       ││
│  │  ┌─────────────────────────────────────────────────┐││
│  │  │ Command Item                                     │││
│  │  │ [Icon] Name                    [Edit] [Export] [X]│││
│  │  │        Description                               │││
│  │  │        Category | Version | Author              │││
│  │  └─────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### 功能列表
1. **命令列表展示** - 展示所有 commands 目录下的 .toml 文件
2. **分类筛选** - 按 Category 过滤显示
3. **新建命令** - 打开编辑器创建新命令
4. **编辑命令** - 修改现有命令
5. **删除命令** - 删除命令（带确认对话框）
6. **导出命令** - 导出单个命令文件到指定目录
7. **导入命令** - 从本地导入 .toml 文件

### 3.2 CommandEditorDialog.vue

#### 布局结构
```
┌─────────────────────────────────────────────────────────┐
│  新建命令 / 编辑命令                                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 名称: [________________]  (仅编辑时显示)             ││
│  │ 描述: [________________]                            ││
│  │ 分类: [▼ utility        ]                            ││
│  │ 版本: [________________]                             ││
│  │ 作者: [________________]                             ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ Prompt:                                             ││
│  │ ┌─────────────────────────────────────────────────┐ ││
│  │ │                                                  │ ││
│  │ │ 多行文本编辑器                                   │ ││
│  │ │                                                  │ ││
│  │ └─────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────┘│
│                              [取消]  [保存]              │
└─────────────────────────────────────────────────────────┘
```

#### 功能列表
1. **表单验证** - 名称、描述必填，prompt 必填
2. **分类选择** - 预设分类下拉选择 (utility/documentation/other)
3. **多行 Prompt 编辑** - 大文本框编辑 prompt 内容
4. **自动生成 Metadata** - 根据文件名自动填充 Command 字段

---

## 4. 国际化

### 4.1 新增翻译字段 (src/locales/index.js)

```javascript
commands: {
  title: '命令管理',
  description: '管理 iFlow CLI 自定义命令',
  importLocal: '本地导入',
  noCommands: '暂无命令',
  addFirstCommand: '点击上方按钮添加第一个命令',
  // 分类
  category: {
    all: '全部',
    utility: '工具类',
    documentation: '文档类',
    other: '其他'
  },
  // 编辑器
  editor: {
    createTitle: '新建命令',
    editTitle: '编辑命令',
    name: '命令名称',
    namePlaceholder: '命令标识符',
    description: '描述',
    descriptionPlaceholder: '命令简短描述',
    category: '分类',
    version: '版本',
    author: '作者',
    prompt: 'Prompt',
    promptPlaceholder: '输入命令的详细提示词...',
    cancel: '取消',
    save: '保存'
  },
  // 操作
  export: '导出',
  delete: '删除',
  // 消息
  commandCreated: '命令 "{name}" 已创建',
  commandSaved: '命令已保存',
  commandDeleted: '命令 "{name}" 已删除',
  commandExported: '命令 "{name}" 已导出',
  confirmDelete: '确定要删除命令 "{name}" 吗？',
  invalidFile: '无效的命令文件'
}
```

---

## 5. 侧边栏集成

### 5.1 SideBar.vue 修改

在 `advanced` 分组下添加 Commands 导航项：

```vue
<div class="nav-item" :class="{ active: currentSection === 'commands' }" 
     @click="$emit('navigate', 'commands')">
  <Command size="16" />
  <span class="nav-item-text">{{ $t('sidebar.commands') }}</span>
  <span class="nav-item-badge" v-show="!collapsed">{{ commandCount }}</span>
</div>
```

### 5.2 导航状态管理 (App.vue)

```javascript
// App.vue - 添加 commands 视图
const currentSection = ref('dashboard')
const commandCount = ref(0)

// 导航处理
const handleNavigate = (section) => {
  currentSection.value = section
}
```

---

## 6. 实现步骤

### Phase 1: 后端 IPC (main.js + preload.js)
1. 实现 `list-commands` handler - 列出所有命令
2. 实现 `read-command` handler - 读取单个命令
3. 实现 `create-command` handler - 创建新命令
4. 实现 `update-command` handler - 更新命令
5. 实现 `delete-command` handler - 删除命令
6. 实现 `export-command` handler - 导出命令

### Phase 2: 前端基础 (CommandsView.vue)
1. 创建基础布局
2. 实现列表展示
3. 实现加载状态
4. 实现空状态显示

### Phase 3: 功能完善
1. 实现分类筛选
2. 实现 CommandEditorDialog
3. 实现导入/导出功能
4. 实现删除确认

### Phase 4: 集成与优化
1. 侧边栏导航集成
2. 国际化翻译
3. 样式美化
4. 错误处理优化

---

## 7. 注意事项

### 7.1 TOML 解析
- 使用 Node.js 内置模块或轻量级库解析 TOML
- 考虑兼容性问题，推荐使用 `@iarna/toml` 或 `toml` 包

### 7.2 文件名规范
- 命令名称必须与文件名（不含扩展名）一致
- 禁止使用特殊字符，只能使用字母、数字、中划线、下划线

### 7.3 安全性
- 验证文件内容，防止路径遍历攻击
- 限制 prompt 最大长度（如 100KB）

### 7.4 性能考虑
- 命令列表建议添加分页（如超过 50 个命令）
- 考虑懒加载命令详情

---

## 8. 测试计划

### 8.1 单元测试
- TOML 解析正确性
- IPC API 参数验证
- 表单验证逻辑

### 8.2 集成测试
- 命令 CRUD 全流程
- 导入/导出功能
- 与侧边栏导航联动

---

## 9. 估计工作量

| 模块 | 预估时间 |
|------|----------|
| 后端 IPC | 4-6 小时 |
| CommandsView.vue | 6-8 小时 |
| CommandEditorDialog.vue | 4-6 小时 |
| 侧边栏集成 | 1-2 小时 |
| 国际化 | 1-2 小时 |
| 测试与修复 | 4-6 小时 |
| **总计** | **20-30 小时** |
