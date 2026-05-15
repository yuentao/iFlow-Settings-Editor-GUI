# P0 Bug 检查报告 - 模型使用趋势图表 & 项目会话管理

**检查日期**: 2026-05-15  
**检查范围**: `ModelUsageChart.vue`, `useModelUsageStats.ts`, `projects.ts`, `ProjectsView.vue`, `SessionDetailView.vue`, `projectService.js`, `modelStatsWorker.js`

---

## 📊 模型使用趋势图表功能

### P0-01: `hasData` 计算属性存在空指针风险

**文件**: `src/components/ModelUsageChart.vue:109-111`

```typescript
const hasData = computed(() => {
  return props.stats && props.stats.data.some(d => d.models.length > 0)
})
```

**问题**: 当 `props.stats` 存在但 `props.stats.data` 为 `undefined` 或 `null` 时，`props.stats.data.some()` 会抛出 TypeError。

**触发场景**: 
- `useModelUsageStats.fetchStats()` 成功返回但 Worker 返回的数据结构不完整
- IPC 返回 `result.messages` 为空数组时，Worker 可能返回 `data: []`，此时 `hasData` 应该返回 `false` 而非抛出异常

**修复建议**:
```typescript
const hasData = computed(() => {
  return props.stats?.data?.some(d => d.models.length > 0) ?? false
})
```

---

### P0-02: `processWithWorker` 缺少超时和异常恢复机制

**文件**: `src/composables/useModelUsageStats.ts:69-76`

```typescript
function processWithWorker(messages: RawMessage[], days: number): Promise<ModelUsageTrendResponse> {
  return new Promise((resolve, reject) => {
    initWorker()
    pendingResolve = resolve
    pendingReject = reject
    worker!.postMessage({ type: 'AGGREGATE', payload: { messages, days } })
  })
}
```

**问题**: 
1. **缺少超时机制**: 如果 Worker 线程因某种原因（如消息量极大、Worker 崩溃）未响应，Promise 将永远 pending，导致 UI 卡死。
2. **pendingResolve/pendingReject 被覆盖**: 如果多次调用 `processWithWorker`（如快速切换时间范围），前一次的 resolve/reject 会被覆盖，导致内存泄漏和状态混乱。
3. **Worker 未验证**: `worker!` 断言假设 Worker 一定存在，但 `initWorker()` 中如果 Worker 创建失败，仍会抛出异常。

**触发场景**:
- 用户快速点击 7 天/30 天切换按钮
- 消息量极大（>50000 条）时 Worker 处理超时
- Worker 脚本加载失败（Vite 构建路径问题）

**修复建议**:
```typescript
function processWithWorker(messages: RawMessage[], days: number): Promise<ModelUsageTrendResponse> {
  return new Promise((resolve, reject) => {
    initWorker()
    if (!worker) {
      reject(new Error('Worker 初始化失败'))
      return
    }
    
    const timeoutId = setTimeout(() => {
      worker.terminate()
      reject(new Error('Worker 处理超时，数据量可能过大'))
    }, 30000)
    
    const handleMessage = (e: MessageEvent) => {
      clearTimeout(timeoutId)
      worker!.onmessage = null
      worker!.onerror = null
      if (e.data.type === 'SUCCESS') {
        resolve(e.data.payload)
      } else {
        reject(new Error(e.data.payload?.message || 'Worker 处理失败'))
      }
    }
    
    const handleError = (e: ErrorEvent) => {
      clearTimeout(timeoutId)
      reject(new Error(e.message))
    }
    
    worker.onmessage = handleMessage
    worker.onerror = handleError
    worker.postMessage({ type: 'AGGREGATE', payload: { messages, days } })
  })
}
```

---

### P0-03: `startAutoRefresh` 未处理竞争条件

**文件**: `src/composables/useModelUsageStats.ts:96-101`

```typescript
function startAutoRefresh(days: number = 7, intervalMinutes: number = 5) {
  stopAutoRefresh()
  const ms = Math.max(60000, intervalMinutes * 60000)
  refreshTimer = setInterval(() => {
    fetchStats({ days, silent: true })
  }, ms)
}
```

**问题**: Dashboard `onMounted` 时先 `await fetchStats({ days: 7 })`，然后 `startAutoRefresh(7, interval)`。如果 `fetchStats` 耗时较长，定时器可能在前一次未完成时启动，导致状态竞争。

**修复建议**: 在 `fetchStats` 中检查 `refreshing.value`：
```typescript
async function fetchStats(options: { days?: number; silent?: boolean; force?: boolean } = {}): Promise<void> {
  if (refreshing.value && !options.force) {
    return  // 跳过本次刷新
  }
  // ...
}
```

---

## 📁 项目会话管理功能

### P0-04: `visibleMessages` 过滤逻辑存在空指针风险

**文件**: `src/views/SessionDetailView.vue:162-173`

```typescript
const visibleMessages = computed(() =>
  messages.value.filter(msg => {
    if (msg.type !== 'user') return true
    const content = msg.rawContent || msg.content
    if (typeof content === 'string') return content.trim().length > 0
    if (Array.isArray(content)) {
      return content.some((c: any) => c.type === 'text' && c.text?.trim())
    }
    return !!msg.content?.trim()
  })
)
```

**问题**: 
1. `msg.rawContent` 和 `msg.content` 可能同时为 `null`/`undefined`，此时 `content.trim()` 会抛出 TypeError。
2. `msg.content` 的类型不一致：`msg.content` 在 `getSessionMessages` 中是字符串（`extractTextContent` 返回），但 `rawContent` 可能是数组或对象。代码中 `msg.content?.trim()` 在 `msg.content` 为数组时会失败。

**修复建议**:
```typescript
const visibleMessages = computed(() =>
  messages.value.filter(msg => {
    if (msg.type !== 'user') return true
    const content = msg.rawContent || msg.content
    if (typeof content === 'string') return content.trim().length > 0
    if (Array.isArray(content)) {
      return content.some((c: any) => c.type === 'text' && c.text?.trim())
    }
    if (msg.content && typeof msg.content === 'string') {
      return msg.content.trim().length > 0
    }
    return false
  })
)
```

---

### P0-05: `handleDeleteSession` 中视图层手动更新 `project.sessionCount`

**文件**: `src/views/ProjectsView.vue:113-127`

```typescript
async function handleDeleteSession(session: SessionSummary) {
  // ...
  confirmState.value = {
    onConfirm: async () => {
      const result = await store.deleteSessionAction(expandedProjectId.value!, session.id)
      if (result.success) {
        toast.success(t('projects.deleteSuccess'))
        const project = store.projects.find(p => p.id === expandedProjectId.value)
        if (project) {
          project.sessionCount = Math.max(0, project.sessionCount - 1)
        }
      }
    },
  }
}
```

**问题**: `store.deleteSessionAction` 已经更新了 `sessions.value` 和 `sessionsTotal.value`，但视图层手动更新 `project.sessionCount` 可能导致状态不一致。应该从 Store 读取最新值，而不是手动修改。

**修复建议**: 移除视图层手动更新，改为：
```typescript
if (result.success) {
  toast.success(t('projects.deleteSuccess'))
  // 从 store 读取最新的项目列表
  const project = store.projects.find(p => p.id === expandedProjectId.value)
  if (project) {
    // 从 sessions 数组重新计算
    project.sessionCount = store.sessions.length
  }
}
```

---

### P0-08: `SessionDetailView` 缺少 `project` 和 `session` 的空值检查

**文件**: `src/views/SessionDetailView.vue:126-129`

```typescript
const props = defineProps<{
  project: Project
  session: SessionSummary
}>()
```

**问题**: Props 未标记为可选，但 `App.vue` 中通过 `activeSession` 传递。如果 `activeSession` 在传递过程中被意外清空，`SessionDetailView` 会接收到 `undefined`，导致后续代码抛出异常。

**修复建议**: 
```typescript
const props = defineProps<{
  project: Project | null
  session: SessionSummary | null
}>()

// 在模板中添加空值检查
<template v-if="!project || !session">
  <EmptyState :title="$t('projects.sessionNotFound')" :icon="Folder" />
</template>
```

---

## 🔧 projectService.js 服务端检查

### P0-09: `deleteMessages` 写入文件时缺少原子性保证

**文件**: `src/main/services/projectService.js:295-311`

```typescript
async function deleteMessages(projectId, sessionId, messageUuids) {
  // ...
  const lines = remaining.map(m => JSON.stringify(m)).join('\n') + '\n'
  fs.writeFileSync(filePath, lines, 'utf-8')
  return true
}
```

**问题**: 
1. **缺少原子性**: 如果写入过程中程序崩溃或断电，JSONL 文件可能损坏。
2. **缺少文件锁**: 如果多个进程同时修改同一文件，可能导致数据丢失。
3. **缺少写入验证**: 写入后未验证文件完整性。

**修复建议**: 使用临时文件 + 原子替换：
```typescript
const tempPath = filePath + '.tmp.' + Date.now()
const lines = remaining.map(m => JSON.stringify(m)).join('\n') + '\n'
fs.writeFileSync(tempPath, lines, 'utf-8')

// 验证临时文件
const tempContent = fs.readFileSync(tempPath, 'utf-8')
const lineCount = tempContent.split('\n').length
if (lineCount !== remaining.length + 1) {
  fs.unlinkSync(tempPath)
  throw new Error('写入验证失败')
}

// 原子替换
fs.renameSync(tempPath, filePath)
return true
```

---

## 📋 总结

| 编号 | 严重等级 | 功能模块 | 问题描述 | 文件位置 |
|------|---------|---------|---------|---------|
| P0-01 | **P0** | 模型使用趋势图表 | `hasData` 空指针风险 | `ModelUsageChart.vue:109` |
| P0-02 | **P0** | 模型使用趋势图表 | Worker 缺少超时和异常恢复 | `useModelUsageStats.ts:69` |
| P0-03 | **P0** | 模型使用趋势图表 | 自动刷新竞争条件 | `useModelUsageStats.ts:96` |
| P0-04 | **P0** | 项目会话管理 | `visibleMessages` 空指针风险 | `SessionDetailView.vue:162` |
| P0-05 | **P0** | 项目会话管理 | 删除会话后状态不一致 | `ProjectsView.vue:113` |
| P0-06 | ✅ 无问题 | 项目会话管理 | `deleteProjectAction` 逻辑正确 | `projects.ts:135` |
| P0-07 | ✅ 无问题 | 项目会话管理 | `loadMoreSessions` 有安全检查 | `ProjectsView.vue:99` |
| P0-08 | **P0** | 项目会话管理 | `SessionDetailView` 缺少空值检查 | `SessionDetailView.vue:126` |
| P0-09 | **P0** | 项目会话管理（后端） | `deleteMessages` 缺少原子性 | `projectService.js:295` |
| P0-10 | ✅ 无问题 | 项目会话管理（后端） | `getAllSessionMessagesForStats` 有错误处理 | `projectService.js:378` |

---

## 🎯 修复优先级

### 立即修复（P0 阻塞性）
1. **P0-01**: `hasData` 空指针 - 会导致图表组件崩溃
2. **P0-04**: `visibleMessages` 空指针 - 会导致会话详情页崩溃
3. **P0-02**: Worker 超时 - 会导致 UI 卡死

### 高优先级
4. **P0-03**: 自动刷新竞争条件 - 可能导致状态不一致
5. **P0-05**: 删除会话状态不一致 - 影响用户体验
6. **P0-08**: 空值检查 - 防止意外崩溃
7. **P0-09**: 原子性写入 - 防止数据损坏
