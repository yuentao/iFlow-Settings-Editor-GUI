/**
 * 技能管理 IPC 处理器
 * 处理技能相关的 IPC 通信
 */

const { ipcMain, dialog, app } = require('electron')
const path = require('path')
const fs = require('fs')
const { t } = require('../utils/translations')
const { readSettings } = require('../services/configService')

// 技能文件夹路径
const SKILLS_FOLDER = path.join(app.getPath('home'), '.iflow', 'skills')

// 确保技能文件夹存在
function ensureSkillsFolder() {
  if (!fs.existsSync(SKILLS_FOLDER)) {
    fs.mkdirSync(SKILLS_FOLDER, { recursive: true })
  }
}

/**
 * 计算文件夹大小
 * @param {string} dirPath
 * @returns {number}
 */
function calcFolderSize(dirPath) {
  let size = 0
  try {
    const items = fs.readdirSync(dirPath)
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const itemStat = fs.statSync(itemPath)
      if (itemStat.isFile()) {
        size += itemStat.size
      }
    }
  } catch (e) {
    // 忽略错误
  }
  return size
}

/**
 * 解析 SKILL.md 文件获取技能信息
 * @param {string} skillPath
 * @param {string} folderName
 * @returns {Object}
 */
function parseSkillInfo(skillPath, folderName) {
  const skillMdPath = path.join(skillPath, 'SKILL.md')
  const licensePath = path.join(skillPath, 'LICENSE.txt')

  let description = ''
  let name = folderName

  if (fs.existsSync(skillMdPath)) {
    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8')
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
      if (frontMatterMatch) {
        const frontMatter = frontMatterMatch[1]
        const nameMatch = frontMatter.match(/name:\s*(.+)/)
        const descMatch = frontMatter.match(/description:\s*(.+)/)
        if (nameMatch) name = nameMatch[1].trim()
        if (descMatch) description = descMatch[1].trim()
      }
    } catch (e) {
      console.error('Failed to parse SKILL.md:', e)
    }
  }

  return {
    name,
    description,
    folderName,
    size: calcFolderSize(skillPath),
    path: skillPath,
    hasLicense: fs.existsSync(licensePath),
  }
}

/**
 * 注册技能相关的 IPC 处理器
 */
function registerSkillsIpcHandlers() {
  // 获取技能列表
  ipcMain.handle('list-skills', async () => {
    try {
      ensureSkillsFolder()
      const files = fs.readdirSync(SKILLS_FOLDER)
      const skills = []

      for (const file of files) {
        const skillPath = path.join(SKILLS_FOLDER, file)
        const stat = fs.statSync(skillPath)

        if (stat.isDirectory()) {
          skills.push(parseSkillInfo(skillPath, file))
        }
      }

      return { success: true, skills }
    } catch (error) {
      return { success: false, error: error.message, skills: [] }
    }
  })

  // 本地导入技能
  ipcMain.handle('import-skill-local', async () => {
    try {
      const { getMainWindow } = require('../window')
      const mainWindow = getMainWindow()

      const result = await dialog.showOpenDialog(mainWindow, {
        title: t('dialogs.importSkill'),
        filters: [
          { name: 'Skill Archives', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true }
      }

      const sourcePath = result.filePaths[0]
      const tmpDir = path.join(app.getPath('temp'), `skill-import-${Date.now()}`)

      ensureSkillsFolder()

      try {
        fs.mkdirSync(tmpDir, { recursive: true })

        const admzip = require('adm-zip')
        const zip = new admzip(sourcePath)
        zip.extractAllTo(tmpDir, true)

        const directSkillMdPath = path.join(tmpDir, 'SKILL.md')
        let skillFolder = null
        let skillName = ''

        if (fs.existsSync(directSkillMdPath)) {
          skillFolder = tmpDir
          const content = fs.readFileSync(directSkillMdPath, 'utf-8')
          const nameMatch = content.match(/^---\n([\s\S]*?)\n---/)
          if (nameMatch) {
            const frontMatter = nameMatch[1]
            const nMatch = frontMatter.match(/name:\s*(.+)/)
            if (nMatch) skillName = nMatch[1].trim()
          }
          if (!skillName) {
            skillName = path.basename(sourcePath, '.zip')
          }
        } else {
          const findSkillFolder = (dirPath, depth = 0) => {
            if (depth > 3) return null
            const entries = fs.readdirSync(dirPath)
            for (const entry of entries) {
              const entryPath = path.join(dirPath, entry)
              const stat = fs.statSync(entryPath)
              if (stat.isDirectory()) {
                const skillMdPath = path.join(entryPath, 'SKILL.md')
                if (fs.existsSync(skillMdPath)) {
                  return entryPath
                }
                const found = findSkillFolder(entryPath, depth + 1)
                if (found) return found
              }
            }
            return null
          }

          skillFolder = findSkillFolder(tmpDir)

          if (skillFolder) {
            const skillMdPath = path.join(skillFolder, 'SKILL.md')
            const content = fs.readFileSync(skillMdPath, 'utf-8')
            const nameMatch = content.match(/^---\n([\s\S]*?)\n---/)
            if (nameMatch) {
              const frontMatter = nameMatch[1]
              const nMatch = frontMatter.match(/name:\s*(.+)/)
              if (nMatch) skillName = nMatch[1].trim()
            }
            if (!skillName) {
              skillName = path.basename(skillFolder)
            }
          }
        }

        if (!skillFolder) {
          const listAllFiles = (dirPath, files = [], baseDepth = 0) => {
            try {
              const entries = fs.readdirSync(dirPath)
              for (const entry of entries) {
                const entryPath = path.join(dirPath, entry)
                const stat = fs.statSync(entryPath)
                if (stat.isDirectory()) {
                  listAllFiles(entryPath, files, baseDepth + 1)
                } else {
                  files.push(`${'  '.repeat(baseDepth)}${entry}`)
                }
              }
            } catch (e) {}
            return files
          }
          const allFiles = listAllFiles(tmpDir)
          return {
            success: false,
            error: t('messages.skillArchiveInvalid', { content: allFiles.slice(0, 20).join('\n') })
          }
        }

        const destPath = path.join(SKILLS_FOLDER, skillName)

        if (fs.existsSync(destPath)) {
          const { callConfirmDialog } = require('./dialogs')
          const confirmed = await callConfirmDialog('messages.warning', 'messages.overwriteConfirm', { name: skillName })
          if (!confirmed) {
            return { success: false, cancelled: true }
          }
          fs.rmSync(destPath, { recursive: true })
        }

        fs.cpSync(skillFolder, destPath, { recursive: true })
        return { success: true, message: t('messages.skillImportSuccess', { name: skillName }) }
      } finally {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true })
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 在线导入技能
  ipcMain.handle('import-skill-online', async (event, url, name) => {
    try {
      const https = require('https')
      const http = require('http')
      const { URL } = require('url')

      ensureSkillsFolder()
      const destPath = path.join(SKILLS_FOLDER, name)

      if (fs.existsSync(destPath)) {
        const { callConfirmDialog } = require('./dialogs')
        const confirmed = await callConfirmDialog('messages.warning', 'messages.overwriteConfirm', { name })
        if (!confirmed) {
          return { success: false, cancelled: true }
        }
        fs.rmSync(destPath, { recursive: true })
      }

      fs.mkdirSync(destPath, { recursive: true })

      const parsedUrl = new URL(url)
      const protocol = parsedUrl.protocol === 'https:' ? https : http

      return new Promise(resolve => {
        protocol.get(url, response => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectUrl = new URL(response.headers.location, url)
            protocol.get(redirectUrl.toString(), redirectResponse => {
              handleDownload(redirectResponse, destPath, name).then(resolve)
            }).on('error', err => resolve({ success: false, error: err.message }))
            return
          }

          if (response.statusCode !== 200) {
            resolve({ success: false, error: t('messages.downloadFailed', { code: response.statusCode }) })
            return
          }

          handleDownload(response, destPath, name).then(resolve)
        }).on('error', err => resolve({ success: false, error: err.message }))
      })
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 导出技能
  ipcMain.handle('export-skill', async (event, name, folderName) => {
    try {
      const { getMainWindow } = require('../window')
      const mainWindow = getMainWindow()


      const skillPath = path.join(SKILLS_FOLDER, folderName)
      if (!fs.existsSync(skillPath)) {
        return { success: false, error: 'messages.skillNotFound', name }
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: t('dialogs.exportSkill'),
        buttonLabel: t('dialogs.selectExportLocation'),
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true }
      }

      const destPath = path.join(result.filePaths[0], folderName)
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true })
      }

      fs.cpSync(skillPath, destPath, { recursive: true })
      return { success: true, message: 'messages.skillExportSuccess', name }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 删除技能
  ipcMain.handle('delete-skill', async (event, name) => {
    try {
      const skillPath = path.join(SKILLS_FOLDER, name)
      if (!fs.existsSync(skillPath)) {
        return { success: false, error: 'messages.skillNotFound', name }
      }

      fs.rmSync(skillPath, { recursive: true })
      return { success: true, message: 'messages.skillDeleteSuccess', name }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

// 处理下载内容
async function handleDownload(response, destPath, name) {
  return new Promise(resolve => {
    const contentType = response.headers['content-type'] || ''
    const contentDisposition = response.headers['content-disposition']

    if (
      contentType.includes('application/zip') ||
      contentType.includes('application/x-tar') ||
      (contentDisposition && contentDisposition.includes('attachment'))
    ) {
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        try {
          const content = Buffer.concat(chunks)
          const tmpPath = path.join(app.getPath('temp'), `skill-${Date.now()}`)

          if (contentType.includes('zip') || (contentDisposition && contentDisposition.includes('.zip'))) {
            const admzip = require('adm-zip')
            fs.writeFileSync(tmpPath + '.zip', content)
            const zip = new admzip(tmpPath + '.zip')
            zip.extractAllTo(tmpPath, true)

            const entries = fs.readdirSync(tmpPath)
            const firstEntry = entries.find(e => fs.statSync(path.join(tmpPath, e)).isDirectory())
            if (firstEntry) {
              const extractedPath = path.join(tmpPath, firstEntry)
              const skillFiles = fs.readdirSync(extractedPath)
              for (const file of skillFiles) {
                fs.cpSync(path.join(extractedPath, file), path.join(destPath, file))
              }
            }
            fs.rmSync(tmpPath, { recursive: true, force: true })
            if (fs.existsSync(tmpPath + '.zip')) fs.unlinkSync(tmpPath + '.zip')
          } else {
            fs.writeFileSync(tmpPath, content)
            fs.cpSync(tmpPath, destPath, { recursive: true })
            fs.rmSync(tmpPath, { recursive: true, force: true })
          }

          resolve({ success: true, message: t('messages.skillOnlineImportSuccess', { name }) })
        } catch (writeError) {
          resolve({ success: false, error: writeError.message })
        }
      })
    } else {
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => {
        try {
          const content = Buffer.concat(chunks)
          const skillMdPath = path.join(destPath, 'SKILL.md')
          fs.writeFileSync(skillMdPath, content)
          resolve({ success: true, message: t('messages.skillOnlineImportSuccess', { name }) })
        } catch (writeError) {
          resolve({ success: false, error: writeError.message })
        }
      })
    }
  })
}

module.exports = {
  registerSkillsIpcHandlers,
}