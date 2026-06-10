/**
 * 系统托盘模块
 * 负责创建和管理系统托盘
 */

const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')
const fs = require('fs')
const moment = require('moment')
const { createLogger } = require('./utils/logger')
const logger = createLogger('Tray')

// 全局托盘引用
let tray = null

// 翻译函数
let t = (key) => key

/**
 * 设置翻译函数
 * @param {Function} translateFn
 */
function setTranslator(translateFn) {
  t = translateFn
}

/**
 * 获取托盘图标路径
 * @returns {string}
 */
function getTrayIconPath() {
  const isMac = process.platform === 'darwin'

  if (app.isPackaged) {
    const iconDir = path.join(process.resourcesPath, 'icon')
    if (isMac) {
      let iconPath = path.join(iconDir, 'icon.icns')
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(iconDir, 'icon.ico')
      }
      return iconPath
    } else {
      return path.join(iconDir, 'icon.ico')
    }
  } else {
    if (isMac) {
      let iconPath = path.join(__dirname, '..', '..', 'build', 'icon.icns')
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(__dirname, '..', '..', 'build', 'icon.ico')
      }
      return iconPath
    } else {
      return path.join(__dirname, '..', '..', 'build', 'icon.ico')
    }
  }
}

/**
 * 创建托盘图标
 * @returns {nativeImage}
 */
function createTrayIcon() {
  const iconPath = getTrayIconPath()
  let trayIcon

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
  } else {
    trayIcon = nativeImage.createEmpty()
  }

  return trayIcon.resize({ width: 16, height: 16 })
}

/**
 * 获取主窗口引用（延迟获取，避免循环依赖）
 */
function getMainWindowRef() {
  const { getMainWindow } = require('./window')
  return getMainWindow()
}

/**
 * 创建系统托盘
 */
function createTray() {
  if (tray) {
    return tray
  }

  const trayIcon = createTrayIcon()
  tray = new Tray(trayIcon)
  tray.setToolTip(t('tray.tooltip'))

  updateTrayMenu()

  tray.on('double-click', () => {
    const mainWindow = getMainWindowRef()
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  return tray
}

/**
 * 更新托盘菜单
 */
function updateTrayMenu() {
  if (!tray) {
    return
  }

  const { readSettings } = require('./services/configService')
  const settings = readSettings()
  const profiles = settings?.apiProfiles || {}
  const currentProfile = settings?.currentApiProfile || 'default'
  const order = settings?.apiProfilesOrder || []
  // 按 apiProfilesOrder 排序，未在排序列表中的配置追加到末尾
  const profileList = order.length > 0
    ? [...order, ...Object.keys(profiles).filter(n => !order.includes(n))]
    : Object.keys(profiles).length > 0 ? Object.keys(profiles) : ['default']

  const profileMenuItems = profileList.map(name => {
    const profile = profiles[name] || {}
    const modelName = profile.modelName || ''
    const isExpired = (() => {
      const expiryDays = profile.expiryDays
      const expiryStartDate = profile.expiryStartDate
      if (!expiryDays || !expiryStartDate) return false
      return moment().isAfter(moment(expiryStartDate).add(expiryDays, 'days'))
    })()
    const expiredSuffix = isExpired ? ` (${t('tray.expired')})` : ''
    const label = modelName
      ? `${name} - ${modelName}${expiredSuffix}`
      : `${name}${expiredSuffix}`
    return {
      label,
      type: 'radio',
      checked: name === currentProfile,
      enabled: !isExpired,
      click: () => {
        if (isExpired) return
        switchApiProfileFromTray(name)
      },
    }
  })

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t('tray.showWindow'),
      click: () => {
        const mainWindow = getMainWindowRef()
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: t('tray.switchApiConfig'),
      submenu: profileMenuItems,
    },
    { type: 'separator' },
    {
      label: t('tray.exit'),
      click: () => {
        const { setIsQuitting } = require('./window')
        setIsQuitting(true)
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

/**
 * 从托盘切换 API 配置
 * @param {string} profileName
 */
async function switchApiProfileFromTray(profileName) {
  try {
    const { readSettings, writeSettings, API_FIELDS, extractApiConfig, applyApiConfig } = require('./services/configService')
    const { getMainWindow } = require('./window')

    const settings = readSettings()
    if (!settings) return

    const profiles = settings.apiProfiles || {}
    if (!profiles[profileName]) return

    const currentProfile = settings.currentApiProfile || 'default'

    // 保存当前配置到 apiProfiles
    if (profiles[currentProfile]) {
      profiles[currentProfile] = extractApiConfig(settings)
    }

    // 加载新配置
    const newConfig = profiles[profileName]
    applyApiConfig(settings, newConfig)
    settings.currentApiProfile = profileName
    settings.apiProfiles = profiles
    await writeSettings(settings)

    updateTrayMenu()

    // 通知渲染进程
    const mainWindow = getMainWindow()
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('api-profile-switched', profileName)
    }
  } catch (error) {
    logger.error('切换API配置失败:', error)
  }
}

/**
 * 获取托盘实例
 * @returns {Tray|null}
 */
function getTray() {
  return tray
}

/**
 * 销毁托盘
 */
function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

module.exports = {
  createTray,
  updateTrayMenu,
  switchApiProfileFromTray,
  getTray,
  destroyTray,
  setTranslator,
}