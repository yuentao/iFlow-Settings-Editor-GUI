# iFlow Settings Editor

一个用于编辑 `C:\Users\MSI\.iflow\settings.json` 配置文件的桌面应用程序。

## 技术栈

- **Electron** - 桌面应用框架
- **Vue 3** - 前端框架 (组合式 API)
- **Vite** - 构建工具
- **@icon-park/vue-next** - 图标库

## 项目结构

```
settings-editor/
├── main.js          # Electron 主进程
├── preload.js       # 预加载脚本 (IPC 通信)
├── package.json     # 项目配置
├── vite.config.js   # Vite 配置
├── index.html       # HTML 入口
└── src/
    ├── main.js      # Vue 入口
    └── App.vue      # 主组件
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev          # 启动 Vite 开发服务器
npm run electron:dev # 同时运行 Electron (需先执行 npm run dev)
```

### 构建与运行

```bash
npm run build        # 构建 Vue 应用到 dist 目录
npm start            # 运行 Electron 应用
```

## 功能

- **常规设置**: 语言、主题、启动动画、检查点保存
- **API 配置**: 认证方式、API Key、Base URL、模型名称、搜索服务
- **MCP 服务器管理**: 添加、编辑、删除服务器配置

## 截图说明

应用采用 Windows 11 设计风格，包含：
- 自定义标题栏 (支持最小化/最大化/关闭)
- 侧边导航栏
- 表单编辑区域
- 底部状态栏

## 注意事项

- `webSecurity: false` 仅用于开发环境解决 CSP 问题
- 保存设置时会自动创建备份 (`settings.json.bak`)
- MCP 服务器参数每行一个，环境变量支持 JSON 格式