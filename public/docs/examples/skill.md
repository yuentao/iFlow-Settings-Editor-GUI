# Skill

> **功能概述**：Skill 是 iFlow CLI 的技能扩展系统，可以从在线市场安装和管理专业化的技能包，提供开箱即用的复杂功能。
> **学习时间**：10-15分钟
> **前置要求**：已安装 iFlow CLI，完成身份验证，了解基本的斜杠命令使用
> **版本要求**：此功能从 v0.4.11 版本开始支持

## 什么是 Skill

Skill 是 iFlow CLI 中的技能市场系统，允许您从在线市场安装专业化的技能包来扩展 CLI 功能。Skill 是一个完整的功能包，可能包含多个文件、依赖项和配置，提供复杂和专业的能力。技能采用目录结构组织，支持资源文件、依赖管理和初始化脚本，适合构建复杂工作流和多步骤任务。

## 核心特点

| 特点 | 说明 | 优势 |
|------|------|------|
| 市场化分发 | 从在线市场获取经过验证的技能包 | 丰富的功能选择 |
| 完整功能包 | 包含多个文件、资源和配置 | 支持复杂场景 |
| 即插即用 | 安装后立即可用，自动执行设置脚本 | 简化使用流程 |
| 作用域管理 | 支持项目级和全局级别的技能安装 | 灵活的权限控制 |
| 版本追踪 | 每个技能都有明确的版本信息 | 确保功能稳定性 |

## 工作原理

### 技能市场架构

```
在线市场 → 下载压缩包 → 解压提取 → 执行设置 → CLI集成
    ↓         ↓          ↓        ↓        ↓
[技能库] → [ZIP/TGZ文件] → [目录结构] → [安装技能] → [技能可用]
```

### 作用域层级

- **全局作用域**：安装到 `~/.iflow/skills/`，所有项目都可使用
- **项目作用域**：安装到 `{project}/.iflow/skills/`，仅当前项目可用
- **优先级规则**：项目级技能优先于全局级技能

## 技能市场管理

### 在 CLI 中浏览在线市场

| 命令 | 功能 | 说明 |
|------|------|------|
| `/skills online` | 进入交互式市场 | 浏览、搜索、安装技能 |

#### 市场导航操作

**交互式浏览快捷键**

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 向下浏览 | `j` 或 `↓` | 移动到下一个技能 |
| 向上浏览 | `k` 或 `↑` | 移动到上一个技能 |
| 查看详情 | `Enter` | 查看技能详细信息 |
| 安装到全局 | `1` | 安装当前选中的技能到全局 |
| 安装到项目 | `2` | 安装当前选中的技能到项目 |
| 返回列表 | `b` | 从详情页返回列表 |
| 翻页 | `h`/`l` 或 `←`/`→` | 上一页/下一页 |
| 退出浏览 | `q` 或 `Esc` | 退出市场浏览模式 |

```bash
# 进入交互式技能市场
/skills online

# 浏览过程中的操作示例
# 1. 使用 j/k 或方向键浏览技能列表
# 2. 按 Enter 查看感兴趣技能的详细信息
# 3. 按 1 键安装到全局，或按 2 键安装到项目
# 4. 按 b 键返回列表继续浏览
```

### 安装技能介绍

```bash
# 基本语法
iflow skill add <skill-id> [--scope project|global]

# 安装到项目（默认）
iflow skill add theme-factory-hslAqA
iflow skill add theme-factory-hslAqA --scope project

# 安装到全局
iflow skill add algorithmic-art-PFjkCH --scope global

# 实际示例
iflow skill add theme-factory-hslAqA --scope project   # 主题工厂技能
iflow skill add pdf-bHAGYL --scope global              # PDF 处理技能
```

### 查看已安装技能

```bash
# 列出所有已安装的技能（交互式）
/skills list
/skills              # 别名

# 列出所有已安装的技能（文本模式）
/skills list desc    # 显示描述
/skills list details # 显示详细信息

# 输出示例（交互式）：
# Configured Skills (3)
#
# 🌍 Global Skills:
#   1. theme-factory
#      Category: Utilities
#      Tags: themes, styling, presentation
#      Toolkit for styling artifacts with pre-set or custom themes
#
# 📂 Project Skills:
#   2. algorithmic-art
#      Category: Creative
#      Tags: art, generative, p5.js
#      Creating algorithmic art using p5.js with seeded randomness
#
# Page 1 of 1
#
# Navigation:
#  • ↑/↓ or j/k - Navigate up/down
#  • Space/Enter - View skill details
#  • ←/→ or h/l - Previous/Next page
#  • q - Exit

# 输出示例（文本模式）：
# Configured Skills:
#
# 📦 theme-factory [Global]
#    Toolkit for styling artifacts with themes
#    File Path: /Users/username/.iflow/skills/theme-factory/skill.toml
#
# 📦 algorithmic-art [Project]
#    Creating algorithmic art using p5.js
#    File Path: /path/to/project/.iflow/skills/algorithmic-art/skill.toml
#
# Total: 2 skills configured
```

### 刷新技能列表

```bash
# 重新扫描并注册技能
/skills refresh

# 输出示例：
# ℹ Refreshing skills registry...
# ✔ Skills registry refreshed successfully
# ℹ Skills refresh completed
```

## 技能分类与推荐

### 创意工具类

| 技能名称 | 功能描述 | 适用场景 |
|----------|----------|----------|
| **algorithmic-art** | 使用 p5.js 创建算法艺术，支持随机种子和参数探索 | 生成艺术、创意编程 |
| **canvas-design** | 创作精美视觉艺术作品，包括制作海报、艺术品、设计图或其他静态作品 | 艺术创作 |

### 文档处理类

| 技能名称 | 功能描述 | 适用场景 |
|----------|----------|----------|
| **pdf** | 全面的 PDF 操作工具包：提取文本/表格、创建、合并/拆分、处理表单 | PDF 文档处理、数据提取 |
| **docx** | Word 文档创建、编辑和分析，支持修订跟踪、批注、格式保留 | 专业文档编辑 |
| **pptx** | PowerPoint 演示文稿创建、编辑和分析，支持布局、批注、演讲者备注 | 演示文稿制作 |

### 开发工具类

| 技能名称 | 功能描述 | 适用场景 |
|----------|----------|----------|
| **mcp-builder** | 创建高质量的 MCP 服务器，支持 Python (FastMCP) 和 Node/TypeScript | MCP 服务器开发 |
| **skill-creator** | 创建新技能，或更新现有技能 | 技能创建、AI 集成 |

## 技能结构

### 目录结构示例

```
~/.iflow/skills/
├── algorithmic-art/         # 技能目录
│   ├── SKILL.md            # 技能主文件（必需）
│   ├── LICENSE.txt         # 许可证文件
│   └── templates/          # 资源目录
│       ├── template1.html
│       └── template2.js
├── pdf/
│   ├── SKILL.md            # 技能主文件（必需）
│   ├── LICENSE.txt         # 许可证文件
│   ├── reference.md        # 参考文档
│   ├── forms.md            # 表单处理指南
│   └── scripts/            # 脚本目录
│       ├── extract.py
│       └── merge.py
└── docx/
    ├── SKILL.md            # 技能主文件（必需）
    ├── LICENSE.txt         # 许可证文件
    ├── docx-js.md          # JavaScript 文档
    ├── ooxml.md            # OOXML 格式文档
    ├── ooxml/              # OOXML 资源
    └── scripts/            # 脚本目录
```

### 技能主文件 (SKILL.md)

每个技能必须包含一个 `SKILL.md` 文件，包含 YAML frontmatter 和 Markdown 内容：

```markdown
---
name: my-skill
description: 简短描述技能的功能和使用场景
license: MIT 或 Proprietary. LICENSE.txt has complete terms
---

# 技能名称

## 概述

详细描述技能的功能、使用场景和核心能力。

## 使用方法

提供使用示例、代码片段和最佳实践。

## 参考资料

列出相关的文档、API 参考和外部资源。
```

**Frontmatter 字段说明**：

| 字段 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `name` | ✅ 是 | 技能的唯一标识符 | `pdf`, `algorithmic-art` |
| `description` | ✅ 是 | 简短描述技能功能和使用场景 | `Creating algorithmic art using p5.js` |
| `license` | ✅ 是 | 许可证信息 | `MIT`, `Proprietary. LICENSE.txt has complete terms` |

**Markdown 内容要求**：

- 提供清晰的概述和使用说明
- 包含代码示例和最佳实践
- 说明技能的核心能力和限制
- 提供相关的参考文档链接

### 支持文件

技能可以包含以下可选文件和目录：

| 文件/目录 | 用途 | 示例 |
|-----------|------|------|
| `LICENSE.txt` | 许可证详细条款 | MIT、Apache 2.0 等 |
| `scripts/` | Python、JavaScript 等脚本 | 数据处理、API 调用脚本 |
| `templates/` | 模板文件 | HTML、CSS、配置模板 |
| `reference/` | 参考文档 | API 文档、使用指南 |
| `*.md` | 补充文档 | 详细的使用说明、FAQ |

### 技能调用机制

**模型自主调用**：

- Skills 是**模型调用的**，iFlow 根据用户请求和技能描述自主决定何时使用
- 这与斜杠命令（Slash Commands）不同，斜杠命令是**用户调用的**（需要显式输入 `/command`）
- 技能的 `description` 字段是 iFlow 判断是否使用该技能的关键依据

**调用示例**：

```
用户: 帮我创建一个生成艺术作品
iFlow: [自动识别并调用 algorithmic-art 技能]

用户: 我需要处理一个 PDF 文件
iFlow: [自动识别并调用 pdf 技能]
```

## 故障排除

### 常见问题及解决方案

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 技能安装失败 | API 密钥未设置或过期 | 重新进行身份验证 |
| 技能不可用 | 未刷新技能注册表 | 运行 `/skills refresh` |
| 下载失败 | 网络连接问题 | 检查网络连接和防火墙设置 |
| 解压失败 | 缺少解压工具 | 安装 `unzip`（Unix）或 `7-Zip`（Windows） |
| 设置脚本失败 | 权限不足或依赖缺失 | 检查脚本输出，手动执行设置 |
| 技能冲突 | 同名技能在不同作用域 | 使用 `--scope` 明确指定 |

### 诊断步骤

**1. 连接检查**

```bash
# 测试 API 连接
/skills online

# 检查身份验证状态
/auth status
```

**2. 配置验证**

```bash
# 查看本地技能列表
/skills list

# 检查技能目录
ls -la ~/.iflow/skills/
ls -la ./.iflow/skills/
```

**3. 权限验证**

```bash
# 检查目录权限
ls -la ~/.iflow/skills/
```

**4. 重新安装**

如果以上步骤都无法解决问题，可以尝试：

```bash
# 先卸载技能（如果需要）
# 然后重新安装
iflow skill add <skill-id> --scope <project|global>
```