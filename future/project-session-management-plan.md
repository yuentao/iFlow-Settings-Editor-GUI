# 项目会话管理功能 - 详细方案

## 1. 数据源分析

### 1.1 目录结构
- **数据来源**: `{userHome}/.iflow/projects`
- **项目目录**: 每个子目录代表一个项目，目录名为项目路径的编码（如 `-E-yuantao-2025716-pet`）
- **会话文件**: 每个项目目录下包含多个 `.jsonl` 文件，每个文件代表一个会话

### 1.2 数据格式
会话文件为 JSONL 格式（每行一个 JSON 对象），核心字段：

```json
{
  "uuid": "e1ab0b61-4854-4b0f-9a88-e1bd700b358b",
  "parentUuid": null,
  "sessionId": "session-3be7a4d6-55c8-4eac-9f86-51e89d76719c",
  "timestamp": "2026-05-13T07:47:58.108Z",
  "type": "user",
  "isSidechain": false,
  "userType": "external",
  "message": {
    "role": "user",
    "content": "用户消息内容"
  },
  "cwd": "E:\\yuantao\\2025716-pet",
  "gitBranch": "main",
  "version": "1.0.0"
}
```

### 1.3 关键字段说明
| 字段 | 说明 |
|------|------|
| `sessionId` | 会话唯一标识 |
| `timestamp` | 消息时间戳（ISO 8601 格式） |
| `type` | 消息类型（user/assistant） |
| `isSidechain` | 是否为侧链消息（boolean） |
| `userType` | 用户类型（external/internal） |
| `message.role` | 消息角色（user/assistant/system） |
| `message.content` | 消息内容（字符串或数组） |
| `message.id` | 消息唯一标识（如 response-xxx-tool-call_xxx） |
| `message.type` | 消息类型（通常为 "message"） |
| `message.model` | 使用的模型名称（如 step-3.5-flash-2603） |
| `message.stop_reason` | 停止原因（通常为 null） |
| `message.stop_sequence` | 停止序列（通常为 null） |
| `message.usage` | Token 使用统计（input_tokens, output_tokens） |
| `toolUseResult` | 工具调用结果（包含 toolName, status, timestamp） |
| `cwd` | 项目工作目录 |
| `gitBranch` | 当前 Git 分支 |

### 1.4 消息内容类型
`message.content` 可能为：
- **字符串**：普通文本消息
- **数组**：多模态消息，包含以下类型：

| 类型 | 说明 | 典型字段 |
|------|------|----------|
| `text` | 文本内容 | `text` (包含 think 标签的 Markdown) |
| `tool_use` | 工具调用请求 | `id`, `name`, `input` |
| `tool_result` | 工具调用结果 | `tool_use_id`, `content.resultDisplay` |

**实际数据结构示例**：

```typescript
// 1. 字符串类型 (普通文本)
"content": "用户消息内容"

// 2. 数组类型 - assistant 消息 (含 tool_use)
"content": [
  {
    "type": "tool_use",
    "id": "call_666600a975794118af93d5a9",
    "name": "todo_write",
    "input": { "todos": [...] }
  },
  {
    "type": "text",
    "text": "思考过程...\n\n回复内容"
  }
]

// 3. 数组类型 - user 消息 (含 tool_result)
"content": [
  {
    "type": "tool_result",
    "tool_use_id": "call_666600a975794118af93d5a9",
    "content": {
      "callId": "call_666600a975794118af93d5a9",
      "responseParts": {
        "functionResponse": {
          "id": "call_666600a975794118af93d5a9",
          "name": "todo_write",
          "response": { "output": "..." }
        }
      }
    },
    "resultDisplay": "\u001b[1m任务列表已更新...\u001b[0m"
  }
]
```

**消息渲染建议**：
- `text` 类型：直接渲染，支持 Markdown
- `tool_use` 类型：显示工具名称和输入参数，可折叠
- `tool_result` 类型：显示结果（`resultDisplay` 字段），支持 ANSI 颜色码解析

**完整的原始消息结构示例**：

```json
{
  "uuid": "e1ab0b61-4854-4b0f-9a88-e1bd700b358b",
  "parentUuid": "...",
  "sessionId": "session-3be7a4d6-55c8-4eac-9f86-51e89d76719c",
  "timestamp": "2026-05-13T07:47:58.108Z",
  "type": "user",
  "isSidechain": false,
  "userType": "external",
  "message": {
    "role": "user",
    "content": "用户消息内容",
    "id": "response-1778658483027-tool-call_b21a53f49bf24a43a5f09d2b",
    "type": "message",
    "model": "step-3.5-flash-2603",
    "stop_reason": null,
    "stop_sequence": null,
    "usage": {"input_tokens": 0, "output_tokens": 0}
  },
  "cwd": "E:\\yuantao\\2025716-pet",
  "gitBranch": "main",
  "version": "1.0.0",
  "toolUseResult": {
    "toolName": "todo_write",
    "status": "success",
    "timestamp": 1778658483094
  }
}
```

---

## 2. 功能需求分析

### 2.1 核心功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 项目列表展示 | P0 | 扫描并展示所有项目，按最后活跃时间排序 |
| 会话列表管理 | P0 | 展示项目下的所有会话，支持排序（时间/消息数） |
| 会话详情查看 | P0 | 查看会话中的消息历史，支持消息类型筛选 |
| 消息选择删除 | P0 | 单选/多选删除聊天消息，支持批量删除 |
| 会话搜索 | P1 | 支持按内容、时间范围搜索会话 |
| 会话导出 | P1 | 导出会话为 Markdown/JSON 格式 |
| 会话删除 | P2 | 删除指定会话（需确认） |

### 2.2 扩展功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 会话统计 | P2 | 消息数量、用户/助手消息比例、输入/输出 Token 消耗、工具调用次数/成功率 |
| 项目统计 | P2 | 会话数量、最后活跃时间、Token 总量统计 |
| 批量导出 | P2 | 导出项目下多个会话 |

---

## 3. 技术方案设计

### 3.1 目录结构

```
src/
├── main/
│   ├── ipc/
│   │   └── projects.js          # 项目会话 IPC 处理器
│   ├── services/
│   │   └── projectService.js    # 项目数据读取服务
│   └── utils/
│       └── projectParser.js     # 会话数据解析工具
├── stores/
│   └── projects.ts              # 项目状态管理
├── views/
│   ├── ProjectsView.vue         # 项目列表页面（列表页）
│   └── SessionDetailView.vue    # 会话详情页面（独立页面，聊天形式）
├── components/
│   ├── ProjectCard.vue          # 项目卡片组件
│   ├── SessionItem.vue          # 会话列表项组件
│   ├── MessageBubble.vue        # 消息气泡组件
│   ├── ChatContainer.vue        # 聊天容器（消息列表）
│   └── ToolCallBlock.vue        # 工具调用/结果展示块
└── locales/
    ├── index.js                 # 中文
    ├── en-US.js                 # 英文
    └── ja-JP.js                 # 日文
```

### 3.2 数据模型设计

```typescript
// 项目信息
interface Project {
  id: string;                    // 唯一标识（目录编码）
  name: string;                  // 项目名称（从 cwd 提取）
  path: string;                  // 原始项目路径
  sessionCount: number;          // 会话数量
  messageCount: number;          // 消息总数
  lastActive: Date;              // 最后活跃时间
  firstActive: Date;             // 首次活跃时间
}

// 会话信息（列表展示用）
interface SessionSummary {
  id: string;                    // sessionId
  fileName: string;              // 文件名
  messageCount: number;          // 消息数量
  userMessageCount: number;      // 用户消息数量
  assistantMessageCount: number; // 助手消息数量
  createdAt: Date;               // 最早消息时间
  lastMessageAt: Date;           // 最后消息时间
  gitBranch: string;             // Git 分支
}

// 会话消息（详情用）
interface Message {
  uuid: string;                  // 消息 UUID
  parentUuid: string | null;     // 父消息 UUID
  sessionId: string;             // 会话 ID
  timestamp: string;             // 时间戳
  type: 'user' | 'assistant';    // 消息类型
  isSidechain: boolean;          // 是否为侧链消息
  userType: string;              // 用户类型 (external/internal)
  role: string;                  // 角色
  content: string;               // 内容（纯文本）
  rawContent: any;               // 原始内容（含工具调用等）
  messageId?: string;            // 消息 ID (如 response-xxx-tool-call_xxx)
  messageType?: string;          // 消息类型 (通常为 "message")
  model?: string;                // 使用的模型名称
  stopReason?: string | null;    // 停止原因
  stopSequence?: string | null;  // 停止序列
  usage?: {                      // Token 使用统计
    input_tokens: number;
    output_tokens: number;
  };
  toolUseResult?: {              // 工具调用结果
    toolName: string;
    status: 'success' | 'error';
    timestamp: number;
  };
}

// 分页结果
interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}
```

### 3.3 IPC 接口设计

```typescript
// 项目管理
interface ProjectsAPI {
  // 获取项目列表
  listProjects(): Promise<Project[]>;
  
  // 获取项目下的会话列表（分页）
  getProjectSessions(
    projectId: string,
    options?: {
      offset?: number;
      limit?: number;
      sortBy?: 'lastActive' | 'createdAt' | 'messageCount';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResult<SessionSummary>>;
  
  // 获取会话消息（分页）
  getSessionMessages(
    projectId: string,
    sessionId: string,
    options?: {
      offset?: number;
      limit?: number;
      filterType?: 'user' | 'assistant' | 'all';
    }
  ): Promise<PaginatedResult<Message>>;
  
  // 删除会话
  deleteSession(projectId: string, sessionId: string): Promise<boolean>;
  
  // 导出会话
  exportSession(
    projectId: string,
    sessionId: string,
    format: 'markdown' | 'json'
  ): Promise<string>;
  
  // 搜索会话
  searchSessions(
    query: string,
    options?: {
      projectId?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    }
  ): Promise<Array<{
    project: Project;
    session: SessionSummary;
    matchedMessage: Message;
  }>>;
  
  // 获取会话统计
  getSessionStats(projectId: string, sessionId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    toolCallSuccess: number;
    toolCallFailed: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
  }>;
}
```

### 3.4 preload.js 暴露接口

```javascript
// 在 preload.js 中添加
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有接口
  listProjects: () => ipcRenderer.invoke('projects:list'),
  getProjectSessions: (projectId, options) => 
    ipcRenderer.invoke('projects:sessions:list', projectId, options),
  getSessionMessages: (projectId, sessionId, options) =>
    ipcRenderer.invoke('projects:sessions:messages', projectId, sessionId, options),
  deleteSession: (projectId, sessionId) =>
    ipcRenderer.invoke('projects:sessions:delete', projectId, sessionId),
  exportSession: (projectId, sessionId, format) =>
    ipcRenderer.invoke('projects:sessions:export', projectId, sessionId, format),
  searchSessions: (query, options) =>
    ipcRenderer.invoke('projects:search', query, options),
});
```

---

## 4. 界面设计

### 4.1 页面结构

本功能包含 **两个独立页面**：

#### 页面1：项目列表页 (ProjectsView.vue)

```
┌────────────────────────────────────────────────────────────┐
│  标题栏 (TitleBar)                                         │
├──────────┬─────────────────────────────────────────────────┤
│          │  项目会话                                        │
│  侧边栏   │  ┌─────────────────────────────────────────┐   │
│  (SideBar)│  │ 搜索栏 [🔍 搜索项目/会话...]              │   │
│          │  ├─────────────────────────────────────────┤   │
│  - 仪表盘 │  │ 项目列表 (按最后活跃时间排序)             │   │
│  - 项目会话│  │                                         │   │
│  - 技能   │  │ ┌─────────┐ ┌─────────┐ ┌─────────┐     │   │
│  - ...   │  │ │项目卡片 │ │项目卡片 │ │项目卡片 │     │   │
│          │  │ │         │ │         │ │         │     │   │
│          │  │ │会话: 5  │ │会话: 12 │ │会话: 3  │     │   │
│          │  │ │最后:今天│ │最后:昨天│ │最后:3天前│     │   │
│          │  │ └─────────┘ └─────────┘ └─────────┘     │   │
│          │  │                                         │   │
│          │  │ 点击项目 → 展开会话列表                   │   │
│          │  │   ├─ 会话1 (2026-05-13 10:30, 25条消息) →│   │
│          │  │   │     [查看] [导出] [删除]             │   │
│          │  │   ├─ 会话2 (2026-05-12 15:20, 12条消息)  │   │
│          │  │   └─ 会话3 (2026-05-11 09:00, 8条消息)   │   │
│          │  └─────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────┘
```

#### 页面2：会话详情页 (SessionDetailView.vue) - 聊天形式

```
┌────────────────────────────────────────────────────────────┐
│  标题栏 (TitleBar)                                         │
├──────────┬─────────────────────────────────────────────────┤
│          │  ← 返回  会话详情                    导出 删除  │
│  侧边栏   │  项目: 2025716-pet | 分支: main               │
│  (SideBar)├─────────────────────────────────────────────────┤
│          │                                                 │
│  - 仪表盘 │  ┌─────────────────────────────────────────┐   │
│  - 项目会话│  │                                         │   │
│  - 技能   │  │  聊天消息区域 (ChatContainer)            │   │
│  - ...   │  │                                         │   │
│          │  │  ┌─────────────────────────────────┐    │   │
│          │  │  │ 👤 用户        10:30:25         │    │   │
│          │  │  │ 需要帮我生成一个PDF文档...       │    │   │
│          │  │  └─────────────────────────────────┘    │   │
│          │  │                                         │   │
│          │  │         ┌─────────────────────────────────┐ │
│          │  │         │ 🤖 助手        10:30:28       │ │
│          │  │         │ 好的，我来帮你生成PDF文档...   │ │
│          │  │         │                                 │ │
│          │  │         │ 🔧 工具调用: read_file         │ │
│          │  │         │ { path: "..." }                │ │
│          │  │         └─────────────────────────────────┘ │
│          │  │                                         │   │
│          │  │  ┌─────────────────────────────────┐    │   │
│          │  │  │ 👤 用户        10:31:05         │    │   │
│          │  │  │ ✅ 工具结果: 文件已读取          │    │   │
│          │  │  └─────────────────────────────────┘    │   │
│          │  │                                         │   │
│          │  │         ┌─────────────────────────────────┐ │
│          │  │         │ 🤖 助手        10:31:10       │ │
│          │  │         │ 已读取文件内容，现在开始生成... │ │
│          │  │         └─────────────────────────────────┘ │
│          │  │                                         │   │
│          │  └─────────────────────────────────────────┘   │
│          │  ─────────────────────────────────────────────  │
│          │  统计: 消息 25 | 用户 10 | 助手 15 | 工具调用 8 | Token 12.5K | 成功率 87.5% |
│          │  ─────────────────────────────────────────────  │
│          │  [消息筛选: 全部 ▼]  [🔍 搜索当前会话]          │
└──────────┴─────────────────────────────────────────────────┘
```

**统计信息说明**：
- 消息总数 / 用户消息 / 助手消息
- 工具调用次数 / 成功率
- Token 消耗总量 (输入 + 输出)

**页面跳转逻辑**：
1. 用户在 ProjectsView 点击会话的"查看"按钮
2. 跳转到 SessionDetailView（独立页面）
3. SessionDetailView 加载该会话的所有消息，以聊天形式展示
4. 支持返回按钮回到项目列表

### 4.2 组件设计

#### 4.2.1 ProjectCard.vue
- 项目名称（高亮 cwd 提取的路径）
- 会话数量统计
- 最后活跃时间
- 展开/收起会话列表

#### 4.2.2 SessionItem.vue
- 会话 ID（截取前 8 位）
- 创建时间
- 消息数量
- Git 分支标签
- Token 消耗统计（可选显示）
- 操作按钮（查看、导出、删除）

#### 4.2.3 MessageBubble.vue
- 消息类型图标（用户/助手）
- 时间戳
- 消息内容（支持 Markdown）
- 折叠逻辑：超过 100 字默认折叠
- 工具调用结果展示

### 4.2.4 消息差异化显示规则

#### 4.2.4.1 按消息类型 (`type` 字段) 差异化

| 类型 | 左侧标识 | 背景色 | 头像 |
|------|----------|--------|------|
| `user` | 绿色竖条 | `--bg-secondary` | 👤 用户图标 |
| `assistant` | 蓝色竖条 | `--bg-elevated` | 🤖 助手图标 |

#### 4.2.4.2 按消息内容类型差异化

| 内容类型 | 显示方式 | 样式 |
|----------|----------|------|
| **字符串** (纯文本) | 直接渲染，支持 Markdown | 普通文本样式 |
| **`text`** | 渲染 `text` 字段，支持 Markdown | 普通文本样式 |
| **`tool_use`** | 显示工具名称和输入参数 | 代码块样式，背景 `#f5f5f5`，左侧橙色边框 |
| **`tool_result`** | 显示 `resultDisplay` 字段内容 | 代码块样式，背景 `#e8f4f8`，支持 ANSI 颜色码解析 |

#### 4.2.4.3 工具调用特殊显示

```vue
<!-- tool_use 显示示例 -->
<div class="tool-use">
  <span class="tool-icon">🔧</span>
  <span class="tool-name">todo_write</span>
  <pre class="tool-input">{{ JSON.stringify(input, null, 2) }}</pre>
  <button class="toggle-btn">展开/收起</button>
</div>

<!-- tool_result 显示示例 -->
<div class="tool-result">
  <span class="result-icon">✅</span>
  <span class="result-status">success</span>
  <pre class="result-display" v-html="parseAnsi(resultDisplay)"></pre>
</div>
```

#### 4.2.4.4 消息折叠规则

| 条件 | 默认状态 | 展开按钮 |
|------|----------|----------|
| 纯文本 > 100 字符 | 折叠 | "展开" 按钮 |
| 含 tool_use | 展开 | "收起" 按钮 |
| 含 tool_result | 展开 | "收起" 按钮 |
| 多内容项 (数组) | 折叠 | "展开" 按钮 |

#### 4.2.4.5 ANSI 颜色码解析

`tool_result` 中的 `resultDisplay` 包含 ANSI 转义序列，需要解析：

```typescript
// ANSI 颜色码映射
const ansiColors: Record<string, string> = {
  '30': '#000000', // 黑色
  '31': '#ff0000', // 红色
  '32': '#00ff00', // 绿色
  '33': '#ffff00', // 黄色
  '34': '#0000ff', // 蓝色
  '35': '#ff00ff', // 紫色
  '36': '#00ffff', // 青色
  '37': '#ffffff', // 白色
  '1;33': '#ffff00;bold', // 亮黄
  '1;32': '#00ff00;bold', // 亮绿
  // ...
};

// 解析函数
function parseAnsi(text: string): string {
  return text.replace(/\x1b\[(\d+(?:;\d+)*)m/g, (match, codes) => {
    const color = ansiColors[codes];
    return color ? `<span style="color: ${color}">` : '</span>';
  });
}
```

### 4.2.5 消息选择删除功能

#### 4.2.5.1 选择模式

| 模式 | 触发方式 | 说明 |
|------|----------|------|
| 单选 | 点击消息左侧复选框 | 选择单条消息 |
| 多选 | 点击"多选"按钮进入选择模式 | 批量选择多条消息 |
| 全选 | 点击"全选"复选框 | 选择当前筛选条件下的所有消息 |
| 取消选择 | 点击"取消"或再次点击消息 | 取消选择 |

#### 4.2.5.2 选择模式 UI

```
┌────────────────────────────────────────────────────────────┐
│  ← 返回  已选择 3 条消息              全选  删除 🔴       │
│  项目: 2025716-pet | 分支: main                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ☐ ┌─────────────────────────────────┐                    │
│    │ 👤 用户        10:30:25         │                    │
│    │ 需要帮我生成一个PDF文档...       │                    │
│    └─────────────────────────────────┘                    │
│                                                            │
│    ☑ ┌─────────────────────────────────┐                  │
│      │ 🤖 助手        10:30:28         │                  │
│      │ 好的，我来帮你生成PDF文档...   │                  │
│      └─────────────────────────────────┘                  │
│                                                            │
│  ☐ ┌─────────────────────────────────┐                    │
│    │ 👤 用户        10:31:05         │                    │
│    │ ✅ 工具结果: 文件已读取          │                    │
│    └─────────────────────────────────┘                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 4.2.5.3 选择状态下的消息气泡

```vue
<!-- 选择模式下的消息气泡 -->
<div class="message-bubble" :class="{ selected: isSelected }">
  <!-- 复选框 (选择模式下显示) -->
  <input 
    type="checkbox" 
    class="message-checkbox"
    :checked="isSelected"
    @change="toggleSelect(uuid)"
  />
  
  <!-- 消息内容 -->
  <div class="message-content">
    <!-- ...原有消息内容... -->
  </div>
</div>
```

#### 4.2.5.4 选择模式状态管理

```typescript
// Store 状态
interface SelectionState {
  isSelectionMode: boolean;      // 是否处于选择模式
  selectedMessages: Set<string>; // 已选中的消息 UUID 集合
  selectAll: boolean;            // 是否全选
}

// Actions
function enterSelectionMode() {
  isSelectionMode.value = true;
  selectedMessages.value.clear();
}

function exitSelectionMode() {
  isSelectionMode.value = false;
  selectedMessages.value.clear();
}

function toggleSelect(uuid: string) {
  if (selectedMessages.value.has(uuid)) {
    selectedMessages.value.delete(uuid);
  } else {
    selectedMessages.value.add(uuid);
  }
}

function selectAll() {
  // 选择当前筛选条件下的所有消息
  messages.value.forEach(m => selectedMessages.value.add(m.uuid));
}

function deleteSelected() {
  // 批量删除选中的消息
  const uuids = Array.from(selectedMessages.value);
  // 调用 IPC 删除消息
}
```

#### 4.2.5.5 删除确认对话框

```
┌─────────────────────────────────────────────┐
│  确认删除                                    │
├─────────────────────────────────────────────┤
│  确定要删除选中的 3 条消息吗？               │
│  此操作不可恢复。                            │
│                                             │
│  [取消]                    [删除]           │
└─────────────────────────────────────────────┘
```

#### 4.2.5.6 IPC 接口（消息删除）

```typescript
// 新增消息删除接口
interface MessageAPI {
  // 删除单条消息
  deleteMessage(
    projectId: string, 
    sessionId: string, 
    messageUuid: string
  ): Promise<boolean>;
  
  // 批量删除消息
  deleteMessages(
    projectId: string, 
    sessionId: string, 
    messageUuids: string[]
  ): Promise<boolean>;
}
```

#### 4.2.5.7 选择删除功能清单

| 功能 | 说明 |
|------|------|
| 进入选择模式 | 点击消息列表上方的"多选"按钮 |
| 单选 | 点击消息左侧复选框选中/取消 |
| 全选 | 点击"全选"复选框选中当前所有消息 |
| 取消选择 | 点击"取消"按钮退出选择模式 |
| 删除选中 | 点击红色删除按钮，弹出确认对话框 |
| 选择计数 | 顶部显示"已选择 X 条消息" |
| 状态保持 | 选择模式切换时保持已选状态 |

### 4.3 交互设计

| 交互 | 行为 |
|------|------|
| 点击项目卡片 | 展开/收起会话列表 |
| 点击会话项 | 跳转到会话详情页（独立页面） |
| 点击"多选"按钮 | 进入消息选择模式 |
| 点击消息复选框 | 选中/取消选中单条消息 |
| 点击"全选" | 选中当前筛选条件下的所有消息 |
| 点击"删除"按钮 | 弹出确认对话框，批量删除选中消息 |
| 长按/右键会话 | 弹出操作菜单（导出、删除） |
| 搜索框输入 | 实时搜索，支持回车搜索 |
| 消息折叠 | 点击"展开/收起"切换 |

---

## 5. 实现步骤

### Phase 1: 基础功能（约 2 小时）

1. **创建 IPC 处理器** (`src/main/ipc/projects.js`)
   - 实现 `listProjects()` 读取项目目录
   - 实现 `getProjectSessions()` 读取会话列表
   
2. **创建服务层** (`src/main/services/projectService.js`)
   - 读取项目目录结构
   - 解析 JSONL 文件
   - 提取项目信息

3. **创建 Store** (`src/stores/projects.ts`)
   - 项目列表状态
   - 会话列表状态
   - 加载状态管理

4. **创建前端页面** (`src/views/ProjectsView.vue`)
   - 项目列表展示
   - 会话列表展示

### Phase 2: 详情功能（约 2 小时）

1. **实现消息加载**
   - 分页加载会话消息
   - 支持消息类型筛选

2. **实现消息渲染**
   - Markdown 渲染支持
   - 消息折叠功能（>100 字）

3. **实现搜索功能**
   - 按内容搜索
   - 按时间范围筛选

### Phase 3: 管理功能（约 1 小时）

1. **实现会话删除**
   - 确认对话框
   - 删除文件

2. **实现会话导出**
   - Markdown 格式导出
   - JSON 格式导出
   - 文件保存对话框

3. **完善统计功能**
   - 消息数量统计
   - 用户/助手消息比例
   - Token 消耗统计 (输入/输出/总量)
   - 工具调用统计 (调用次数/成功/失败/成功率)

### Phase 4: 优化（约 1 小时）

1. **性能优化**
   - 虚拟列表（大量会话时）
   - 懒加载消息

2. **国际化**
   - 中文/英文/日文支持

3. **错误处理**
   - 文件不存在处理
   - 编码错误处理
   - 权限错误提示

---

## 6. 关键问题解决方案

### 6.1 目录编码解析
- **问题**: 目录名编码存在歧义
- **解决**: 从会话消息的 `cwd` 字段获取真实路径
  1. 遍历项目目录下的 `.jsonl` 文件
  2. 读取第一条消息，提取 `cwd` 字段
  3. 根据 `cwd` 聚合展示真实项目名称

### 6.2 消息内容编码
- **问题**: 消息内容可能出现乱码
- **解决**: 使用 UTF-8 编码读取文件
  ```javascript
  const content = await fs.promises.readFile(filePath, 'utf-8');
  ```

### 6.3 性能优化
- **按需加载策略**:
  - 项目列表: 首次加载所有项目基本信息
  - 会话列表: 首次加载 20 条，支持"加载更多"
  - 消息详情: 点击会话时加载，支持分页

### 6.4 权限处理
- 使用 `app.getPath('home')` 获取用户主目录
- 参考 `configService.js` 的实现方式

---

## 7. 国际化键值

```javascript
// src/locales/index.js 添加
projects: {
  title: '项目会话',
  search: '搜索会话...',
  noProjects: '暂无项目',
  noSessions: '暂无会话',
  sessionCount: '{count} 个会话',
  messageCount: '{count} 条消息',
  lastActive: '最后活跃: {time}',
  deleteConfirm: '确定要删除这个会话吗？',
  deleteSuccess: '会话已删除',
  exportSuccess: '会话已导出',
  loadMore: '加载更多',
  expand: '展开',
  collapse: '收起',
  // 消息选择删除
  multiSelect: '多选',
  selectAll: '全选',
  cancelSelect: '取消',
  selectedCount: '已选择 {count} 条消息',
  deleteMessageConfirm: '确定要删除选中的 {count} 条消息吗？',
  deleteMessageSuccess: '消息已删除',
  messageDeleted: '消息已删除',
}
```

---

## 8. 错误码定义

```javascript
// src/shared/errors.js 添加
export const PROJECT_ERRORS = {
  PROJECT_NOT_FOUND: '项目不存在',
  SESSION_NOT_FOUND: '会话不存在',
  FILE_READ_ERROR: '文件读取失败',
  FILE_DELETE_ERROR: '文件删除失败',
  EXPORT_ERROR: '导出失败',
  PERMISSION_DENIED: '权限不足',
};
```

---

## 9. 参考实现

参考现有模块的实现模式：
- `src/stores/skills.ts` - 技能状态管理
- `src/views/SkillsView.vue` - 技能页面
- `src/main/ipc/skills.js` - 技能 IPC 处理器
- `src/main/services/configService.js` - 配置服务
- `src/components/EmptyState.vue` - 空状态组件

---

## 10. 预计工作量

| 阶段 | 功能 | 预计时间 |
|------|------|----------|
| Phase 1 | 基础功能 | 2 小时 |
| Phase 2 | 详情功能 | 2 小时 |
| Phase 3 | 管理功能 | 1 小时 |
| Phase 4 | 优化 | 1 小时 |
| **总计** | | **6 小时** |