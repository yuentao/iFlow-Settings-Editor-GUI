# iFlow Settings Editor

A desktop application for editing iFlow CLI configuration files.

> 🌍 Documentation: [简体中文](./README.md) | [English](./README-en.md) | [日本語](./README-ja.md)

![iFlow Settings Editor](./screenshots/仪表盘.png)

## Features

- 📝 **API Profile Management** - Multi-environment profile switching, create, edit, rename, duplicate, delete, and drag-to-sort
- 🔄 **Auto Update Check** - Automatic update check on startup, manual check support, real-time download progress, cancel anytime
- 📥 **Background Download** - Silent background update downloads with real-time progress in settings, one-click install when ready
- 🖥️ **MCP Server Management** - Convenient Model Context Protocol server configuration interface
- ⚡ **Commands Management** - Visual management of iFlow commands with create, edit, delete, import/export, and category filtering
- 🎨 **Windows 11 Design** - Fluent Design compliant interface
- 🌈 **Multi-Theme Support** - Light / Dark / System (follow system) themes
- 🌍 **Internationalization** - Simplified Chinese, English, 日本語
- 💧 **Acrylic Effect** - Adjustable transparency for modern visual effects
- 🧩 **Skills Management** - Local and online import, export, delete iFlow skills
- 📦 **System Tray** - Minimize to tray, quick API profile switching
- 🚀 **Auto-Launch** - Start with system boot, always runs silently (no window shown)
- 📊 **Dashboard View** - Intuitive overview of current configuration and quick actions
- ☁️ **Cloud Sync** - WebDAV-based cloud configuration sync with end-to-end encryption, seamless multi-device sync
- 🔧 **TypeScript Type Safety** - Full TypeScript migration with complete type inference and compile-time checking
- 🧱 **Modular Architecture** - Main process modular refactoring for cleaner code structure and maintainability
- 🧪 **Comprehensive Test Coverage** - Full unit test coverage for components and stores ensuring stable functionality
- ✅ **Unified Validation Framework** - Consistent form validation and error handling
- ⚙️ **CLI Behavior Control** - Fine-grained control over CLI runtime behavior (memory display, session limits, tool exclusion, approval mode, etc.)

## Tech Stack

| Technology | Version |
|------------|---------|
| Electron | 28.0.0 |
| Vue | 3.4.0 |
| Vite | 8.0.8 |
| vue-i18n | 9.14.5 |
| Pinia | 3.0.4 |
| TypeScript | 6.0.3 |
| Less | 4.6.4 |
| Vitest | 4.1.4 |
| electron-builder | 24.13.3 |
| @icon-park/vue-next | 1.4.2 |
| @vueuse/core | 14.2.1 |
| @iarna/toml | 2.2.5 |
| fast-xml-parser | 5.7.2 |
| marked | 18.0.2 |
| adm-zip | 0.5.17 |
| electron-log | 5.4.3 |
| electron-updater | 6.8.3 |

## Supported Systems

- Windows 10 / 11 (x64)
- macOS 12+ (x64 / arm64)

## Installation

### Run from Source

```bash
# Clone repository
git clone https://git.pandorastudio.cn/product/iFlow-Settings-Editor-GUI.git

# Enter directory
cd iFlow-Settings-Editor-GUI

# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

### Build Installers

```bash
# Build Windows installer (x64)
npm run build:win

# Build portable version
npm run build:win-portable

# Build NSIS installer
npm run build:win-installer

# Build macOS installer (x64 + arm64)
npm run build:mac

# Build macOS specific architecture
npm run build:mac64   # x64 only
npm run build:mac-arm # arm64 only

# Build macOS DMG image
npm run build:mac-dmg

# Build macOS ZIP archive
npm run build:mac-zip
```

After building, installers will be located in the `release/` directory.

### Development Commands

```bash
# TypeScript type checking
npm run type-check

# Development mode (Vite Dev Server)
npm run dev

# Electron development mode (parallel Vite + Electron)
npm run electron:dev
```

### CI/CD

Project uses GitHub Actions for continuous integration and releases:

- **Push tag** `v*` automatically builds and creates GitHub Release
- Multi-platform builds for Windows (x64) and macOS (x64/arm64)
- Auto-extract CHANGELOG.md for release notes

```bash
# Trigger release
git tag v1.9.0
git push origin v1.9.0
```

## Usage Guide

### General Settings

![General Settings](./screenshots/基本设置.png)

On the "General Settings" page you can configure:

#### Preferences
- **Language** - Interface display language (简体中文 / English / 日本語)
- **Theme** - Visual theme style (Light / Dark / System)
- **Show Memory Usage** - Display CLI memory usage in status bar
- **Hide Banner** - Hide welcome banner on CLI startup
- **Acrylic Effect** - Adjust window background transparency (0-100%)

#### Auto-Launch
- **Auto-Launch** - Control whether app starts with system (always runs silently when enabled, no window shown)

#### Other Settings
- **Max Session Turns** - Limit maximum conversation turns
- **Disable Auto Update** - Disable automatic update checks
- **Auto Configure Memory Limit** - Automatically adjust Node.js V8 heap size based on system memory
- **Disable Telemetry** - Disable usage data collection
- **Tokens Limit** - Set token limit per request
- **Compression Token Threshold** - Set token ratio threshold for auto-compression (0-1)
- **Skip Next Speaker Check** - Allow consecutive same speaker
- **Shell Timeout** - Command execution timeout in seconds
- **Connectivity Poll Interval** - Network connectivity check interval in seconds
- **Approval Mode** - Default command execution approval strategy (yolo/plan/autoEdit/default)
- **Thinking Mode Enabled** - Enable AI deep reasoning before final answer (only works with thinking-capable models)
- **Exclude Tools** - Specify list of core tools to exclude from CLI; supports command-specific restrictions like ShellTool(rm -rf)
  ![Other Settings](./screenshots/其他设置.png)

#### About
- **Version Info** - Display current app version and copyright
- **Manual Check for Updates** - Click to immediately check for new version (real-time download progress, cancellable)
- **Auto Update** - Toggle automatic update checks (background download, one-click install when ready)

### API Profile Management

![API Configuration](./screenshots/API配置.png)

On the "API Configuration" page you can:

- **Switch Profiles** - Click different profiles to quickly switch
- **Create New Profile** - Create new API environment configuration
  ![New API Config](./screenshots/新建API配置.png)
- **Edit Configuration** - Modify profile name, authentication type, API Key, Base URL, model name; supports auto-fetching available models from API
- **Rename Profile** - Set new name for profile (cannot rename currently active profile)
- **Duplicate Profile** - Copy existing profile to create new one
- **Drag to Sort** - Reorder profiles by dragging
- **Delete Profile** - Remove unwanted profiles (default profile cannot be deleted)

Supported authentication types:
- API Key
- OpenAI Compatible

### MCP Server Management

![MCP Server Management](./screenshots/MCP服务器.png)

On the "MCP Servers" page you can:

- **Add Server** - Configure new MCP server (supports stdio, sse, streamable-http transport types)
  ![Quick Add MCP Server](./screenshots/快速添加MCP服务器.png)
- **Edit Server** - Modify server name, description, command, arguments, environment variables
  ![Add MCP Server](./screenshots/添加MCP服务器.png)
- **Delete Server** - Remove unwanted servers
- **Quick Add** - Batch add MCP servers by pasting JSON, command-line, or URL text (auto-parse and deduplicate)
- **Environment Variables** - Set independent environment variables per server

Supported transport types:
- **stdio** - Standard input/output mode (local process)
- **sse** - Server-Sent Events mode (HTTP service)
- **streamable-http** - Streamable HTTP mode

### Skills Management

![Skills Management](./screenshots/技能管理.png)

On the "Skills" page you can:

- **Local Import** - Import skills from local ZIP archive
- **Online Import** - Import skills from GitHub URL
- **Export Skill** - Export skill to specified directory
- **Delete Skill** - Remove unwanted skills

### Commands Management

![Commands Management](./screenshots/命令管理.png)

On the "Commands" page you can:

- **Command List** - View all available iFlow commands with category filtering (utility, documentation, other)
- **Create Command** - Create new custom command via editor dialog
- **Edit Command** - Modify command name, description, category, version, author, and prompt
- **Export Command** - Export command as JSON file to local
- **Delete Command** - Remove unwanted commands
- **Import Command** - Import commands from local JSON file

Command editor supports the following fields:
- **Name** - Unique command identifier (letters, numbers, underscores, hyphens)
- **Description** - Command functionality description
- **Category** - Category label (utility/documentation/other)
- **Version** - Command version number
- **Author** - Creator information (optional)
- **Prompt** - Detailed content or instructions for command execution

Commands are stored in JSON format for flexible management and sharing.

### Cloud Sync Management

![Cloud Sync Settings](./screenshots/云同步设置.png)

On the "Cloud Sync" page you can:

- **Configure WebDAV Server** - Enter server URL, username, password, etc.
- **Test Connection** - Verify WebDAV server connectivity and permissions
  ![Test Connection](./screenshots/其他设置.png)
- **Manual Sync** - Click "Sync Now" to upload local config to cloud or download from cloud
- **Auto Sync** - Enable automatic sync when settings change
- **View Sync Status** - Real-time display of last sync time, sync errors, etc.
- **Clear Cloud Data** - One-click clear all cloud-stored configuration data
- **Device Management** - View and manage synced device list
- **Password Protection** - Set sync password to ensure end-to-end encrypted data security

**Synced Content**: Currently supports API profiles and MCP servers sync; skills and commands coming soon.

**Security Design**:
- All sync data encrypted client-side before upload
- Timestamp-based intelligent incremental merging
- Field-level deep merge preserving both modifications
- Tombstone mechanism prevents deleted items from resurrecting

### System Tray

![System Tray](./screenshots/托盘图标.png)

- Closing window minimizes to system tray instead of exiting
- Double-click tray icon to show main window
- Right-click tray menu for quick API profile switching

## Configuration Files

Application configuration files are located at:

```
~/.iflow/settings.json
```

A backup file `settings.json.bak` is automatically generated on each save.

## Testing

Project uses **Vitest 4.x** as the testing framework with **happy-dom** providing the DOM testing environment.

```bash
# Run tests (watch mode)
npm run test

# UI test mode (visual interface)
npm run test:ui

# Test coverage report
npm run test:coverage

# Single run (CI mode)
npm run test:run
```

### Test Coverage

- **Component Tests**: TitleBar, SideBar, InputDialog, MessageDialog, ApiProfileDialog, ServerPanel, EmptyState, SkeletonLoader, UpdateNotification, UpdateProgress, etc.
- **View Tests**: GeneralSettings, ApiConfig, McpServers, SkillsView, Dashboard, etc.
- **Store Tests**: settings, apiProfiles, skills, commands state management modules
- **Unit Tests**: Utilities, composables, type definitions

Test files reside in same directories as source files, named `*.test.js` or `*.test.ts`.

## Project Structure

```
iFlow-Settings-Editor-GUI/
├── main.js              # Electron main process entry
├── preload.js           # Preload script
├── index.html           # Entry HTML
├── vite.config.js       # Vite configuration
├── vitest.config.js     # Vitest configuration
├── tsconfig.json        # TypeScript configuration
├── build/               # Build assets
├── dist/                # Vite build output
├── release/             # Electron Builder output
├── screenshots/         # Application screenshots
└── src/
    ├── main.js          # Vue entry
    ├── App.vue          # Root component
    ├── components/      # Shared components
    │   ├── TitleBar.vue        # Title bar
    │   ├── SideBar.vue         # Side navigation
    │   ├── InputDialog.vue     # Input dialog
    │   ├── MessageDialog.vue   # Message dialog
    │   ├── ApiProfileDialog.vue # API profile dialog
    │   ├── ServerPanel.vue     # Server edit panel
    │   ├── CommandEditorDialog.vue # Command editor dialog
    │   ├── EmptyState.vue      # Empty state
    │   ├── SkeletonLoader.vue  # Skeleton loader
    │   ├── UpdateNotification.vue # Update notification
    │   └── UpdateProgress.vue  # Update progress
    ├── composables/     # Vue composables
    │   ├── useLocale.ts        # i18n hook
    │   └── useSettings.ts      # Settings hook
    ├── views/           # Page views
    │   ├── GeneralSettings.vue # General settings
    │   ├── ApiConfig.vue      # API configuration
    │   ├── McpServers.vue     # MCP server management
    │   ├── SkillsView.vue     # Skills management
    │   ├── CommandsView.vue   # Commands management
    │   └── Dashboard.vue      # Dashboard
    ├── main/            # Electron main process modules
    │   ├── index.js           # Main process entry
    │   ├── constants.js       # Constants
    │   ├── window.js          # Window management
    │   ├── tray.js            # Tray management
    │   ├── ipc/               # IPC handlers
    │   │   ├── apiProfiles.js # API config IPC
    │   │   ├── commands.js    # Commands IPC
    │   │   ├── dialogs.js     # Dialog IPC
    │   │   ├── index.js       # IPC aggregator
    │   │   ├── settings.js    # Settings IPC
    │   │   ├── skills.js      # Skills IPC
    │   │   ├── updates.js     # Updates IPC
    │   │   └── cloud.js       # Cloud sync IPC
    │   ├── services/          # Main process services
    │   │   ├── autoLaunchService.js # Auto-launch service
    │   │   ├── configService.js # Config service
    │   │   └── cloud/         # Cloud sync service
    │   │       └── WebDAVProvider.js # WebDAV adapter
    │   └── utils/             # Utilities
    │       ├── errors.js      # Error definitions
    │       ├── logger.js      # Logger
    │       ├── translations.js # Translation utilities
    │       └── validator.js   # Validator
    ├── stores/          # Pinia state management (TypeScript)
    │   ├── apiProfiles.ts     # API profiles state
    │   ├── commands.ts        # Commands state
    │   ├── settings.ts        # Settings state
    │   ├── skills.ts          # Skills state
    │   ├── cloudSync.ts       # Cloud sync state
    │   ├── ui.ts              # UI state
    │   └── index.js           # Store aggregator
    ├── locales/         # i18n language packs
    │   ├── en-US.js    # English
    │   ├── index.js    # Chinese (Simplified)
    │   └── ja-JP.js    # Japanese
    ├── styles/          # Global styles
    │   └── global.less # Windows Fluent Design styles
    └── shared/          # Shared type definitions
        └── types.ts    # TypeScript type declarations
```

## License

MIT License

## Contact

- Company: 上海潘哆呐科技有限公司 (Shanghai Pandora Technology Co., Ltd.)
- Repository: https://git.pandorastudio.cn/product/iFlow-Settings-Editor-GUI
