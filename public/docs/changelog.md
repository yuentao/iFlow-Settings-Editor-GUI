# 变更日志

> **用途**：记录iFlow CLI的版本更新历史、新功能和重要变更  
> **适用场景**：了解版本差异、升级参考、功能追踪

## 版本历史

### 0.5.17 (2026年03月11日)

#### 修复

- 修复流式中断时 thinking parts 签名处理问题，防止后续 API 调用报错
- 改进键盘 CSI 序列处理，新增 Kitty CSI-u 协议支持，防止未识别序列泄漏到输入缓冲区

### 0.5.16 (2026年03月06日)

#### 新增功能

- 指数退避重试：对 429/5xx 错误使用指数退避策略，提升 API 调用稳定性
- read_file 截断信息改进：优化文件截断提示，帮助模型更好地理解截断情况
- 思考模式默认开启
- 支持 PowerShell：动态适配 PowerShell 版本的系统提示词。设置环境变量 `ComSpec=pwsh.exe` 使用 ps7

#### 修复

- 修复 MCP server 子进程在 shutdown/disconnect 时未正确清理的问题
- 修复 ACP agent 工具执行后出现意外 end_turn 的问题
- 修复 ACP 模式下 skill 执行后的后续消息处理
- 修复 ACP 自动压缩：实现按轮次自动上下文压缩
- 修复 `-i` 参数自动提交时认证未刷新的问题
- 修复 MCP 认证状态变更时未同步刷新 OAuth 状态的问题

### 0.5.15 (2026年03月02日)

#### 新增功能

- Agent/Skill 符号链接扫描支持
- Headless 模式会话续连：支持 -c 和 -p 组合使用，可在无头模式下继续之前的会话
- ACP directory 内置命令：为 ACP 模式新增 directory 内置命令

#### 修复

- 修复 MCP 指令不选择时直接显示 mcp list 的问题
- 在未知终端类型时不再误启动 Terminal.app
- 改进 ACP 的认证流程

### 0.5.14 (2026年02月26日)

#### 新增功能

- SubAgent 系统提示词强化：提示词包含 iFlow CLI 身份标识
- [ACP] 创建会话支持传入自定义 sessionId

#### 修复

- GLM-5 token 超限：将上下文限制从默认值调整为 170K，预留 16% 安全余量
- Windows 登录认证页面打开问题修复

### 0.5.13 (2026年02月12日)

#### 新增功能

- MiniMax-2.5 替换 MiniMax-M2.1

### 0.5.12 (2026年02月12日)

#### 新增功能

- GLM-5 模型支持

#### 修复

- 修复粘贴结束后输入字符被错误吞掉的问题
- 修复 "window is not defined" 错误
- 修复 LSTool undefined path 崩溃
- Kimi K2.5 temperature 覆盖移除

### v0.5.7 (2026年2月6日)

#### 新增功能

- 接入 Kimi 2.5 多模态模型，支持更强大的图像理解和多模态交互能力

#### 功能增强

- 完善 ACP 模式下的取消功能，提升协议交互稳定性
- 支持终端直接打印 MCP OAuth 授权链接，优化无浏览器环境下的授权流程

### v0.5.5 (2026年2月2日)

#### 优化

- `/cleanup-xxx` 清理指令后，提示框在下一次用户输入后消失

#### 修复

- 修复思考模式触发压缩后 API 调用返回 400
- 修复时区为系统对应时区而非零时区
- 修复 hook transcript-path 问题

#### 功能

- Mac 实现点击系统通知
- 支持读取剪切板图片数据（ctrl+v）

#### ACP 协议支持

- 支持感知 cwd 下的 skill
- 支持 subagent 并行输出
- 支持 compress 内置命令

### v0.5.3 (2026年1月26日)

#### 修复

- 修复 ACP Client 连接失败问题，比如 Zed/Jetbrains 等

#### 新增功能

- 支持 ACP AvailableCommandsUpdate，以便通过 / 选择命令

#### 优化

- UI 样式优化，优化家目录提示交互
- 移除 output-style 功能
- 默认禁用 [checkpointing](./features/checkpointing.md)。如果已经配置，按照配置执行。
- 优化 GLM 4.7 模型配置，调整 token 使用限制
- 优化 memory 命令功能和性能
- 增强 HMAC 认证机制，提升模型接口调用安全性
- 优化搜索功能体验

### v0.5.2 (2026年1月19日)

#### 修复

- 修复工具调用并行执行导致的更新损失问题
- 修复 session end hook 显示两次的问题

#### 优化

- 加强智能模式安全检测能力
- skill & workflow 的 add 命令去掉模糊搜索，未精确匹配 id 时提示在线仓库无skills/workflow
- markdown 渲染去掉行号

#### 新增功能

- 新增配置文件配置 hook 主动安全能力
- ACP Server 支持 stream 模式
- 增加通知：在对话整体结束之后，提示用户结束，可以查看结果

  - **macOS**：首次出现 terminal-notifier 弹窗，需要用户手动选择允许通知，或者在"设置" => "通知"中允许 terminal-notifier 通知
  - **Windows**："专注模式"无法弹出弹窗，会收缩在任务栏右下角的通知面板中，需要用户允许 SnoreToast 后续才会收到通知弹窗

### v0.5.0 (2026年1月12日)

#### 首次发布

- iFlow CLI 正式版本发布
- 核心功能：AI对话、文件处理、代码分析
- 支持多种模型：GLM-4、GPT-4、Kimi等
- MCP扩展系统
- Sub Agent智能助手系统

---

**注意**: iFlow CLI 将于2026年4月17日正式停止服务，建议迁移至 Qoder。