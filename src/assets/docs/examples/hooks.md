# Hooks 配置

## 概述

Hooks（钩子）是 iFlow CLI 中的事件驱动机制，允许您在特定的生命周期事件发生时自动执行自定义命令。通过配置 Hooks，您可以实现工具调用前后的自动化处理、环境设置增强、会话停止时的清理操作等功能。

### 主要功能

- **工具调用拦截**：在工具执行前后运行自定义逻辑
- **环境增强**：在会话开始时动态设置环境信息
- **生命周期管理**：在会话或子代理停止时执行清理操作
- **灵活配置**：支持用户级和项目级的分层配置
- **安全控制**：可阻止工具执行或修改工具行为

## Hook 类型

iFlow CLI 支持以下 9 种 Hook 类型：

### 1. PreToolUse Hook

**触发时机**：在工具执行之前

**用途**：
- 验证工具参数
- 设置执行环境
- 记录工具调用日志
- 阻止不安全的操作

**示例配置**：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'File edit detected'"
          }
        ]
      }
    ]
  }
}
```

### 2. PostToolUse Hook

**触发时机**：在工具执行之后

**用途**：
- 处理工具执行结果
- 清理临时文件
- 发送通知
- 记录执行统计

**示例配置**：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "write_file",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'File operation completed'"
          }
        ]
      }
    ]
  }
}
```

### 3. SetUpEnvironment Hook

**触发时机**：会话开始时，环境信息设置阶段

**用途**：
- 动态生成项目信息
- 设置运行时环境变量
- 增强 AI 的上下文信息
- 加载项目特定配置

**示例配置**：

```json
{
  "hooks": {
    "SetUpEnvironment": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Session environment initialized'"
          }
        ]
      }
    ]
  }
}
```

### 4. Stop Hook

**触发时机**：主会话结束时

**用途**：
- 清理会话资源
- 保存会话信息
- 发送会话总结
- 执行清理脚本

**示例配置**：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Main session ended'"
          }
        ]
      }
    ]
  }
}
```

### 5. SubagentStop Hook

**触发时机**：子代理会话结束时

**用途**：
- 清理子代理资源
- 记录子任务执行情况
- 合并子任务结果
- 执行子任务后处理

**示例配置**：

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Subagent task completed'"
          }
        ]
      }
    ]
  }
}
```

### 6. SessionStart Hook

**触发时机**：会话开始时（启动、恢复、清理、压缩）

**用途**：
- 初始化会话环境
- 设置日志记录
- 发送会话开始通知
- 执行启动时的预处理

**支持matcher**：是 - 可以根据会话启动来源进行匹配（startup、resume、clear、compress）

**示例配置**：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'New session started'"
          }
        ]
      }
    ]
  }
}
```

### 7. SessionEnd Hook

**触发时机**：会话正常结束时

**用途**：
- 生成会话总结报告
- 备份会话数据
- 发送会话结束通知
- 执行会话清理操作

**示例配置**：

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.iflow/hooks/session_report.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 8. UserPromptSubmit Hook

**触发时机**：用户提交提示词之前，在iFlow处理之前

**用途**：
- 内容过滤和审核
- 提示词预处理和增强
- 阻止不当的用户输入
- 记录用户交互日志

**支持matcher**：是 - 可以根据提示词内容进行匹配

**特殊行为**：可以阻止提示词提交（返回非零退出码）

**示例配置**：

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*sensitive.*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.iflow/hooks/content_filter.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### 9. Notification Hook

**触发时机**：当iFlow向用户发送通知时

**用途**：
- 通知内容记录
- 第三方系统集成
- 通知格式转换
- 自定义通知处理

**支持matcher**：是 - 可以根据通知消息内容进行匹配

**特殊行为**：退出码2不阻止通知，仅将stderr显示给用户

**示例配置**：

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": ".*permission.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Permission notification logged' >> ~/.iflow/permission.log"
          }
        ]
      }
    ]
  }
}
```

## 配置方式

### 1. 配置层级

Hooks 配置遵循 iFlow CLI 的分层配置系统：

- **用户配置**：`~/.iflow/settings.json`
- **项目配置**：`./.iflow/settings.json`
- **系统配置**：系统级配置文件

高层级的配置会与低层级配置合并，项目配置会补充用户配置。

### 2. 配置格式

在 `settings.json` 文件中添加 `hooks` 配置项：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "tool_pattern",
        "hooks": [
          {
            "type": "command",
            "command": "your_command",
            "timeout": 30
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "another_pattern",
        "hooks": [
          {
            "type": "command",
            "command": "cleanup_command"
          }
        ]
      }
    ],
    "SetUpEnvironment": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python ~/.iflow/hooks/env_enhancer.py",
            "timeout": 30
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Session ended'"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Subagent stopped'"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Session starting'"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.iflow/hooks/session_report.py",
            "timeout": 30
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": ".*sensitive.*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.iflow/hooks/content_filter.py",
            "timeout": 10
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": ".*permission.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Notification logged' >> ~/.iflow/notification.log"
          }
        ]
      }
    ]
  }
}
```

### 3. Hook 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | Hook 类型，当前仅支持 `command` |
| `command` | string | 是 | 要执行的命令 |
| `timeout` | number | 否 | 命令超时时间（秒），默认 30 |

### 4. Matcher 匹配规则

部分 Hook 类型支持 `matcher` 字段，用于根据事件上下文进行匹配：

- **PreToolUse / PostToolUse**：匹配工具名称（如 `Edit`、`write_file`、`Read` 等）
- **SessionStart**：匹配会话启动来源（`startup`、`resume`、`clear`、`compress`）
- **UserPromptSubmit**：匹配提示词内容（正则表达式）
- **Notification**：匹配通知消息内容（正则表达式）

### 5. 退出码行为

| 退出码 | 行为 |
|--------|------|
| 0 | 成功，允许继续执行 |
| 非0（非2） | 失败，阻止后续操作 |
| 2 | 仅对 Notification Hook：不影响通知发送，仅将 stderr 显示给用户 |

## 最佳实践

1. **使用有意义的命令**：确保 Hook 命令能够清晰地表达其功能
2. **设置合理的超时时间**：避免长时间运行的命令阻塞 iFlow
3. **充分利用 matcher**：通过 matcher 减少不必要的 Hook 执行
4. **错误处理**：为关键操作添加适当的错误处理机制
5. **日志记录**：记录 Hook 执行情况，便于问题排查
