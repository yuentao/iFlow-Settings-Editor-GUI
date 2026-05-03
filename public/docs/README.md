# iFlow CLI 官方文档

> iFlow CLI 是一款终端AI助手，可以分析代码、执行编程任务、处理文件操作。

## 📚 文档导航

### 快速入门
- [快速开始](./quickstart.md) - 5分钟快速上手指南

### 核心功能
- [基础用法](./examples/basic-usage.md) - 掌握日常使用技巧
- [交互模式](./features/interactive.md) - 学习高效交互方式
- [键盘快捷键](./examples/keyboard-shortcuts.md) - 快捷键速查表

### 高级功能
- [斜杠命令](./examples/slash-commands.md) - 40+内置命令详解
- [MCP扩展系统](./examples/mcp.md) - 模型上下文协议扩展
- [Sub Agent](./examples/subagent.md) - 智能Agent系统
- [Sub Command](./examples/subcommand.md) - 命令行扩展系统
- [Hooks](./examples/hooks.md) - 事件驱动配置
- [Workflow](./examples/workflow.md) - 工作流管理
- [Skill](./examples/skill.md) - 技能扩展系统
- [计划模式](./examples/plan-mode.md) - 规划执行模式

### 配置管理
- [CLI配置](./configuration/settings.md) - 详细的配置选项

### 最佳实践
- [最佳实践指南](./examples/best-practices.md) - 实战经验总结

### 参考文档
- [术语词汇表](./glossary.md) - 核心概念定义
- [场景案例](./scenarios.md) - 按工作场景的解决方案
- [变更日志](./changelog.md) - 版本历史和更新记录

## 🎯 学习路径

### 初学者路径（首次使用）
1. [快速开始](./quickstart.md) - 安装配置、运行第一个任务
2. [基础用法](./examples/basic-usage.md) - 核心命令、Shell集成
3. [交互模式](./features/interactive.md) - 文本/图片/文件引用

### 进阶用户路径（有基础经验）
1. [MCP扩展系统](./examples/mcp.md) - 安装插件、连接外部工具
2. [Sub Agent](./examples/subagent.md) - 专业领域助手
3. [Hooks](./examples/hooks.md) - 事件驱动自动化

### 专家用户路径（团队使用）
1. [最佳实践指南](./examples/best-practices.md) - 工作流优化
2. [CLI配置](./configuration/settings.md) - 高级设置、性能调优

## 💡 核心概念

| 术语 | 说明 |
|------|------|
| **iFlow CLI** | 基于终端的AI助手工具 |
| **斜杠命令** | 以 `/` 开头的控制命令（如 `/init`、`/help`） |
| **@** | 文件引用 @文件路径 (如 `@src/App.tsx`) |
| **$** | 以 `$` 开头执行某个subagent (如 `$code-reviewer`) |
| **Shell命令** | 以 `!` 开头，可在CLI中执行系统命令 |
| **yolo** | 默认允许CLI执行所有操作的执行模式 |
| **MCP** | 模型上下文协议，用于扩展AI能力 |
| **Sub Agent** | 智能Agent系统，适用于执行不同专业的任务 |

---

**注意**: iFlow CLI 将于2026年4月17日正式停止服务，建议迁移至 Qoder。

**文档版本**: v1.14.8
**最后更新**: 2026-05-02
