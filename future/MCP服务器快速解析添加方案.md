# MCP 服务器快速解析添加方案

## 需求背景

iFlow CLI 的 `settings.json` 中 MCP 服务器配置格式固定但字段较多，手动填写容易出错。用户常从文档/教程/他人分享中复制一段 JSON 配置，需要逐字段手动填入 ServerPanel。

**目标**：用户粘贴一段文本（JSON 配置或命令行），系统自动解析并填充 ServerPanel 各字段，实现一键添加。

---

## 支持的输入格式

### 格式 1：JSON 服务器配置（最常见）

来源：iFlow/Claude/Cursor 等文档中的 JSON 片段。

```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server"],
  "env": {
    "ANTHROPIC_API_KEY": "sk-xxx"
  }
}
```

也支持带服务器名的外层格式：

```json
{
  "my-server": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server"],
    "env": { "API_KEY": "sk-xxx" }
  }
}
```

以及 Claude Desktop / Cursor 等 `mcpServers` 完整格式：

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server"]
    }
  }
}
```

### 格式 2：npx/uvx 命令行

来源：MCP 服务器 README 中的安装命令。

```bash
npx -y @anthropic/mcp-server
```

```bash
uvx mcp-server-sqlite --db-path /path/to/db
```

### 格式 3：SSE URL

来源：远程 MCP 服务器文档。

```
https://api.example.com/sse
```

---

## 解析逻辑

```ts
type ParseResult = {
  success: boolean
  servers: Array<{
    name: string
    config: Record<string, any>
  }>
  error?: string
}

function parseMcpInput(input: string): ParseResult {
  const trimmed = input.trim()

  // 1. 尝试 JSON 解析
  try {
    const json = JSON.parse(trimmed)
    return parseJsonConfig(json)
  } catch {}

  // 2. 尝试命令行解析（npx / uvx / node / python 等）
  if (/^(npx|uvx|node|python|python3|bun|deno)\s/.test(trimmed)) {
    return parseCommandLine(trimmed)
  }

  // 3. 尝试 URL 解析
  if (/^https?:\/\//.test(trimmed)) {
    return parseUrl(trimmed)
  }

  return { success: false, servers: [], error: '无法识别输入格式' }
}
```

### JSON 解析细节

```ts
function parseJsonConfig(json: any): ParseResult {
  // 情况 A: { "mcpServers": { "name": { ... } } }
  if (json.mcpServers && typeof json.mcpServers === 'object') {
    const servers = Object.entries(json.mcpServers).map(([name, config]) => ({
      name,
      config: config as Record<string, any>,
    }))
    return { success: true, servers }
  }

  // 情况 B: { "server-name": { command: "...", args: [...] } }
  // 判断：外层 key 的 value 是对象且包含 command 或 url
  if (typeof json === 'object' && !Array.isArray(json)) {
    const entries = Object.entries(json)
    const isNameWrapped = entries.every(([, val]) =>
      typeof val === 'object' && val !== null && !Array.isArray(val) &&
      (val.command || val.url)
    )
    if (isNameWrapped) {
      const servers = entries.map(([name, config]) => ({
        name,
        config: config as Record<string, any>,
      }))
      return { success: true, servers }
    }

    // 情况 C: 直接是服务器配置对象 { command: "...", args: [...] }
    if (json.command || json.url) {
      return { success: true, servers: [{ name: '', config: json }] }
    }
  }

  return { success: false, servers: [], error: 'JSON 格式不是有效的 MCP 服务器配置' }
}
```

### 命令行解析细节

```ts
function parseCommandLine(cmd: string): ParseResult {
  // 将命令行拆分为 command + args
  // 例如 "npx -y @anthropic/mcp-server --port 3000"
  // → command: "npx", args: ["-y", "@anthropic/mcp-server", "--port", "3000"]

  const parts = splitCommandLine(cmd) // 处理引号内的空格
  if (parts.length === 0) {
    return { success: false, servers: [], error: '命令行格式无效' }
  }

  const command = parts[0]
  const args = parts.slice(1)

  // 从包名推导服务器名称
  // npx -y @scope/pkg → scope-pkg
  // npx -y pkg → pkg
  const packageName = args.includes('-y')
    ? args[args.indexOf('-y') + 1]
    : args.find(a => !a.startsWith('-')) || command
  const name = packageName
    .replace(/^@/, '')
    .replace(/\//, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')

  return {
    success: true,
    servers: [{
      name,
      config: { command, args },
    }],
  }
}

/** 简易命令行分割（处理双引号和单引号） */
function splitCommandLine(input: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuote: string | null = null

  for (const ch of input) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (/\s/.test(ch)) {
      if (current) {
        result.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current) result.push(current)
  return result
}
```

### URL 解析细节

```ts
function parseUrl(url: string): ParseResult {
  try {
    new URL(url)
  } catch {
    return { success: false, servers: [], error: 'URL 格式不正确' }
  }

  // 从 URL 推导名称
  // https://api.example.com/sse → api-example-com
  const hostname = new URL(url).hostname
  const name = hostname.replace(/\./g, '-').replace(/[^a-zA-Z0-9_-]/g, '')

  return {
    success: true,
    servers: [{
      name,
      config: { url, transportType: 'sse' },
    }],
  }
}
```

---

## UI 交互设计

### 入口位置

在 `McpServers.vue` 页面顶部操作栏，紧邻「添加服务器」按钮：

```
[+ 添加服务器]  [📋 快速添加]  [🔍 从 JSON 粘贴]
```

### 快速添加弹框

点击「快速添加」按钮后，弹出对话框：

```
┌──────────────────────────────────────────────┐
│  快速添加 MCP 服务器                   [×]    │
├──────────────────────────────────────────────┤
│  粘贴 JSON 配置、命令行或 URL                 │
│  ┌──────────────────────────────────────────┐│
│  │ {                                        ││
│  │   "command": "npx",                      ││
│  │   "args": ["-y", "@anthropic/mcp-server"]││
│  │ }                                        ││
│  │                                          ││
│  │                                          ││
│  └──────────────────────────────────────────┘│
│                                              │
│  支持的格式：                                 │
│  • JSON 服务器配置                            │
│  • npx / uvx / node 命令行                   │
│  • SSE / Streamable-HTTP URL                 │
│                                              │
├──────────────────────────────────────────────┤
│                    [取消]  [解析并添加]        │
└──────────────────────────────────────────────┘
```

### 解析结果处理

**单服务器** — 解析成功后直接打开 ServerPanel 预填数据，用户确认后保存：

```
解析成功 → 打开 ServerPanel（预填各字段）→ 用户确认/修改 → 保存
```

**多服务器**（如从 `mcpServers` 块粘贴）— 解析后列出识别到的服务器，用户勾选后批量添加：

```
┌──────────────────────────────────────────────┐
│  解析结果 — 发现 3 个服务器            [×]    │
├──────────────────────────────────────────────┤
│  ☑ filesystem                                │
│      command: npx, args: [-y, @anthropic/...]│
│  ☑ github                                    │
│      command: npx, args: [-y, @anthropic/...]│
│  ☐ remote-api                                │
│      url: https://api.example.com/sse        │
│                                              │
│  已有服务器将跳过：filesystem                  │
├──────────────────────────────────────────────┤
│               [取消]  [添加选中的 2 个服务器]  │
└──────────────────────────────────────────────┘
```

**解析失败** — 在输入框下方显示错误提示：

```
  ⚠ 无法识别输入格式，请粘贴 JSON 配置、命令行或 URL
```

---

## 组件结构

### 新增组件

`src/components/QuickAddDialog.vue` — 快速添加对话框

```
Props:
  show: boolean
  existingNames: string[]  // 已有服务器名称，用于重复检测

Emits:
  close
  add-servers  // servers: Array<{ name: string, config: Record<string, any> }>
  edit-server  // server: { name: string, config: Record<string, any> }  // 单服务器时打开面板编辑
```

### 解析函数

`src/main/utils/mcpParser.js` — 纯函数，无 Electron 依赖，方便单测

```ts
export function parseMcpInput(input: string): ParseResult
export function parseJsonConfig(json: any): ParseResult
export function parseCommandLine(cmd: string): ParseResult
export function parseUrl(url: string): ParseResult
export function splitCommandLine(input: string): string[]
```

可同步编写 `mcpParser.test.js`，覆盖各种输入边界。

---

## 数据流

```
McpServers.vue
  ├── @click="addServer"       → App.vue: openAddServerPanel()     → ServerPanel(手动)
  └── @click="quickAddServer"  → App.vue: openQuickAddDialog()     → QuickAddDialog
        ├── 解析成功(单服务器)  → App.vue: openEditServerPanel()   → ServerPanel(预填)
        └── 解析成功(多服务器)  → App.vue: batchAddServers()       → 直接写入 settings
```

单服务器走 ServerPanel，用户可以检查和微调后再保存。多服务器直接批量写入，避免逐个打开面板。

---

## 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 粘贴内容为空 | 禁用「解析并添加」按钮 |
| JSON 语法错误 | 提示 "JSON 格式无效，请检查括号和引号" |
| JSON 有效但非 MCP 配置 | 提示 "JSON 格式不是有效的 MCP 服务器配置" |
| 命令行无法识别 | 提示 "命令行格式无效" |
| URL 格式不正确 | 提示 "URL 格式不正确" |
| 服务器名已存在 | 单服务器：ServerPanel 中名称高亮提示；多服务器：标记跳过 |
| 自动推导名称冲突 | 附加数字后缀，如 `my-server-2` |
| 多服务器全部已存在 | 提示 "所有服务器已存在，无需添加" |
| 粘贴内容包含 env 中的敏感信息 | 正常解析，不额外提示（与手动填写一致） |
| 输入含前后空白/换行 | trim 后再解析 |
| Claude Desktop 格式含 `mcpServers` 外层 | 识别并提取内层 |

---

## i18n 键值

```js
// zh-CN
quickAdd: '快速添加',
quickAddTitle: '快速添加 MCP 服务器',
quickAddPlaceholder: '粘贴 JSON 配置、命令行或 URL',
quickAddHint: '支持的格式：JSON 服务器配置 · npx/uvx/node 命令行 · SSE/Streamable-HTTP URL',
quickAddParse: '解析并添加',
quickAddParseFail: '无法识别输入格式，请粘贴 JSON 配置、命令行或 URL',
quickAddJsonInvalid: 'JSON 格式无效，请检查括号和引号',
quickAddNotMcpConfig: 'JSON 格式不是有效的 MCP 服务器配置',
quickAddCmdInvalid: '命令行格式无效',
quickAddUrlInvalid: 'URL 格式不正确',
quickAddResultTitle: '解析结果 — 发现 {count} 个服务器',
quickAddSelected: '添加选中的 {count} 个服务器',
quickAddAllExist: '所有服务器已存在，无需添加',
quickAddExistSkip: '已有服务器将跳过：{names}',
quickAddSingleEdit: '解析成功，请在编辑面板中确认配置',
```

---

## 改动范围

| 文件 | 改动 |
|------|------|
| `src/components/QuickAddDialog.vue` | **新增** — 快速添加对话框组件 |
| `src/main/utils/mcpParser.js` | **新增** — 纯解析函数 |
| `src/main/utils/mcpParser.test.js` | **新增** — 解析函数单元测试 |
| `src/views/McpServers.vue` | 添加「快速添加」按钮 + emit |
| `src/App.vue` | 添加 `openQuickAddDialog` / `batchAddServers` / 适配单服务器预填逻辑 |
| `src/locales/index.js` | 新增 i18n 键值 |
| `src/locales/en-US.js` | 新增 i18n 键值 |
| `src/locales/ja-JP.js` | 新增 i18n 键值 |

### 不需要修改

- `ServerPanel.vue` — 已支持通过 `data` prop 预填，无需改动
- `preload.js` / 主进程 IPC — 解析纯前端完成，无需新增 IPC
