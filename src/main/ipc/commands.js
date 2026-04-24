/**
 * 命令管理 IPC 处理器
 * 处理命令相关的 IPC 通信
 */

const { ipcMain, dialog, app } = require('electron')
const path = require('path')
const fs = require('fs')
const { t } = require('../utils/translations')
const { wrapIpcHandler, successResult, errorResult, ErrorCodes } = require('../utils/errors')

// 命令文件夹路径
const COMMANDS_FOLDER = path.join(app.getPath('home'), '.iflow', 'commands')

// 确保 commands 文件夹存在
function ensureCommandsFolder() {
  if (!fs.existsSync(COMMANDS_FOLDER)) {
    fs.mkdirSync(COMMANDS_FOLDER, { recursive: true })
  }
}

/**
 * 解析 TOML 命令文件
 * @param {string} filePath
 * @returns {Object}
 */
function parseCommandFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, '.toml')

  const metadata = {
    command: fileName,
    description: '',
    category: 'utility',
    version: '1',
    author: '',
  }

  const commentPatterns = {
    command: /# Command:\s*(.+)/,
    description: /# Description:\s*(.+)/,
    category: /# Category:\s*(.+)/,
    version: /# Version:\s*(.+)/,
    author: /# Author:\s*(.+)/,
  }

  for (const [key, pattern] of Object.entries(commentPatterns)) {
    const match = content.match(pattern)
    if (match) {
      metadata[key] = match[1].trim()
    }
  }

  let tomlData = {}
  try {
    const toml = require('@iarna/toml')
    tomlData = toml.parse(content)
  } catch (e) {
    console.error('Failed to parse TOML:', e)
  }

  return {
    name: fileName,
    description: tomlData.description || metadata.description || '',
    category: metadata.category || 'utility',
    version: metadata.version || '1',
    author: metadata.author || '',
    prompt: tomlData.prompt || '',
    fileName,
  }
}

/**
 * 生成 TOML 命令文件内容
 * @param {Object} data
 * @returns {string}
 */
function generateCommandContent(data) {
  let content = `# Command: ${data.name}\n`
  content += `# Description: ${data.description}\n`
  content += `# Category: ${data.category || 'utility'}\n`
  content += `# Version: ${data.version || '1'}\n`
  content += `# Author: ${data.author || ''}\n`
  content += `description = ${JSON.stringify(data.description || '')}\n`
  content += `prompt = """\n${data.prompt || ''}\n"""\n`
  return content
}

/**
 * 注册命令相关的 IPC 处理器
 */
function registerCommandsIpcHandlers() {
  // 列出所有命令
  ipcMain.handle('list-commands', wrapIpcHandler(async () => {
    ensureCommandsFolder()
    const files = fs.readdirSync(COMMANDS_FOLDER)
    const commands = []

    for (const file of files) {
      if (!file.endsWith('.toml')) continue
      try {
        const filePath = path.join(COMMANDS_FOLDER, file)
        const stat = fs.statSync(filePath)
        if (!stat.isFile()) continue
        const cmd = parseCommandFile(filePath)
        commands.push(cmd)
      } catch (e) {
        console.error(`Failed to parse command file ${file}:`, e)
      }
    }

    return successResult({ commands })
  }, 'list-commands'))

  // 读取单个命令
  ipcMain.handle('read-command', wrapIpcHandler(async (event, name) => {
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound'), code: ErrorCodes.COMMAND_NOT_FOUND }
    }
    const cmd = parseCommandFile(filePath)
    return successResult({ command: cmd })
  }, 'read-command'))

  // 创建新命令
  ipcMain.handle('create-command', wrapIpcHandler(async (event, name, data) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return { success: false, error: t('errors.commandInvalidName'), code: ErrorCodes.COMMAND_EXISTS }
    }
    ensureCommandsFolder()
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandAlreadyExists'), code: ErrorCodes.COMMAND_EXISTS }
    }
    const content = generateCommandContent({ name, ...data })
    fs.writeFileSync(filePath, content, 'utf-8')
    return successResult()
  }, 'create-command'))

  // 更新命令
  ipcMain.handle('update-command', wrapIpcHandler(async (event, name, data) => {
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound'), code: ErrorCodes.COMMAND_NOT_FOUND }
    }
    const content = generateCommandContent({ name, ...data })
    fs.writeFileSync(filePath, content, 'utf-8')
    return successResult()
  }, 'update-command'))

  // 删除命令
  ipcMain.handle('delete-command', wrapIpcHandler(async (event, name) => {
    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound'), code: ErrorCodes.COMMAND_NOT_FOUND }
    }
    fs.unlinkSync(filePath)
    return successResult()
  }, 'delete-command'))

  // 导出命令
  ipcMain.handle('export-command', wrapIpcHandler(async (event, name) => {
    const { getMainWindow } = require('../window')
    const mainWindow = getMainWindow()

    const filePath = path.join(COMMANDS_FOLDER, `${name}.toml`)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: t('errors.commandNotFound'), code: ErrorCodes.COMMAND_NOT_FOUND }
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialogs.exportCommand', { defaultValue: 'Export Command' }),
      buttonLabel: t('dialogs.selectExportLocation'),
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    const destPath = path.join(result.filePaths[0], `${name}.toml`)
    fs.copyFileSync(filePath, destPath)
    return successResult({ message: t('messages.commandExported', { name }) })
  }, 'export-command'))

  // 导入命令
  ipcMain.handle('import-command', wrapIpcHandler(async () => {
    const { getMainWindow } = require('../window')
    const mainWindow = getMainWindow()

    const result = await dialog.showOpenDialog(mainWindow, {
      title: t('dialogs.importCommand', { defaultValue: 'Import Command' }),
      filters: [
        { name: 'TOML Files', extensions: ['toml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true }
    }

    ensureCommandsFolder()
    const imported = []

    for (const sourcePath of result.filePaths) {
      try {
        const cmd = parseCommandFile(sourcePath)
        const destPath = path.join(COMMANDS_FOLDER, `${cmd.name}.toml`)

        if (fs.existsSync(destPath)) {
          const { callConfirmDialog } = require('./dialogs')
          const confirmed = await callConfirmDialog('messages.warning', 'messages.overwriteCommandConfirm', { name: cmd.name })
          if (!confirmed) continue
        }

        fs.copyFileSync(sourcePath, destPath)
        imported.push(cmd.name)
      } catch (e) {
        console.error(`Failed to import command from ${sourcePath}:`, e)
      }
    }

    return successResult({ imported })
  }, 'import-command'))
}

module.exports = {
  registerCommandsIpcHandlers,
}