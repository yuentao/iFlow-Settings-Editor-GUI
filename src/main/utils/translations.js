/**
 * 翻译工具模块
 * 提供主进程的翻译功能
 */

// 默认翻译
const defaultTranslations = {
  tray: {
    showWindow: '显示主窗口',
    switchApiConfig: '切换 API 配置',
    exit: '退出',
    tooltip: 'iFlow 设置编辑器',
  },
  errors: {
    configNotFound: '配置文件不存在',
    configNotExist: '配置 "{name}" 不存在',
    configAlreadyExists: '配置 "{name}" 已存在',
    cannotDeleteDefault: '不能删除默认配置',
    cannotRenameDefault: '不能重命名默认配置',
    switchFailed: '切换 API 配置失败',
    commandNotFound: '命令不存在',
    commandAlreadyExists: '命令已存在',
    commandInvalidName: '命令名只能包含字母、数字、中划线和下划线',
  },
  dialogs: {
    importSkill: '导入技能',
    exportSkill: '导出技能到',
    selectExportLocation: '选择导出位置',
    exportCommand: '导出命令',
    importCommand: '导入命令',
  },
  messages: {
    skillImportSuccess: '技能 "{name}" 导入成功',
    skillExportSuccess: '技能 "{name}" 导出成功',
    skillDeleteSuccess: '技能 "{name}" 已删除',
    skillNotFound: '技能 "{name}" 不存在',
    skillOnlineImportSuccess: '在线技能 "{name}" 导入成功',
    downloadFailed: '下载失败，状态码: {code}',
    skillArchiveInvalid: '压缩包内未包含有效的 SKILL.md 文件。包含的文件:\n{content}',
  },
  update: {
    error: {
      downloadFailed: '下载更新失败，状态码: {code}',
      requestTimeout: '检查更新请求超时',
      downloadTimeout: '下载更新超时',
      noDownloadUrl: '未找到下载链接',
      noDownloadedUpdate: '未找到已下载的更新文件',
      noReleaseUrl: '未找到发布地址',
    },
  },
}

// 当前翻译对象
let translations = { ...defaultTranslations }

/**
 * 更新翻译数据
 * @param {Object} localeData - 包含主进程翻译的数据
 */
function updateTranslations(localeData) {
  if (localeData && localeData.main) {
    translations = { ...defaultTranslations, ...localeData.main }
  }
}

/**
 * 获取翻译
 * @param {string} key - 翻译键，格式 'section.key' 或 'section.subkey'
 * @param {Object} params - 替换参数
 * @returns {string} 翻译后的文本
 */
function t(key, params = {}) {
  const keys = key.split('.')
  let value = translations
  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) break
  }
  if (typeof value === 'string') {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{${paramKey}}`, paramValue)
    }
    return value
  }
  return key
}

/**
 * 重置翻译为默认
 */
function resetTranslations() {
  translations = { ...defaultTranslations }
}

module.exports = {
  t,
  updateTranslations,
  resetTranslations,
  defaultTranslations,
}