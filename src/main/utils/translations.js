/**
 * 翻译工具模块
 * 提供主进程的翻译功能
 */

// 默认翻译（中文）
const defaultTranslations = {
  app: {
    title: 'iFlow 设置编辑器',
    name: 'iFlow 设置编辑器',
    company: '上海潘哆呐科技有限公司',
    retry: '重试'
  },
  window: {
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭'
  },
  sidebar: {
    general: '常规',
    dashboard: '仪表盘',
    generalSettings: '通用设置',
    apiConfig: 'API 配置',
    advanced: '高级',
    mcpServers: 'MCP 服务器',
    iflowMod: 'iFlow Mod',
    skills: '技能',
    commands: '命令',
    docs: '使用指南',
    about: '关于'
  },
  main: {
    tray: {
      showWindow: '显示主窗口',
      switchApiConfig: '切换 API 配置',
      exit: '退出',
      tooltip: 'iFlow 设置编辑器',
      expired: '已过期',
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
      fileNotFound: '文件不存在',
      permissionDenied: '权限不足',
      unknown: '操作失败，请重试',
    },
    dialogs: {
      importSkill: '导入技能',
      exportSkill: '导出技能到',
      importCommand: '导入命令',
      exportCommand: '导出命令',
      selectExportLocation: '选择导出位置',
      skillArchive: '技能压缩包',
      allFiles: '所有文件',
    },
  },
  messages: {
    error: '错误',
    warning: '警告',
    success: '成功',
    info: '信息',
    cannotDeleteDefault: '不能删除默认配置',
    inputConfigName: '请输入配置名称',
    confirmDelete: '确认删除',
    confirmDeleteConfig: '确定要删除配置 "{name}" 吗？',
    confirmDeleteServer: '确定要删除服务器 "{name}" 吗？',
    confirmDeleteSkill: '确定要删除技能 "{name}" 吗？',
    skillNotFound: '技能 "{name}" 不存在',
    skillExportSuccess: '技能 "{name}" 导出成功',
    skillDeleteSuccess: '技能 "{name}" 已删除',
    skillImportSuccess: '技能 "{name}" 导入成功',
    skillOnlineImportSuccess: '技能 "{name}" 在线导入成功',
    skillArchiveInvalid: '压缩包中未找到有效的技能文件夹（缺少 SKILL.md）\n解压内容:\n{content}',
    downloadFailed: '下载失败: HTTP {code}',
    overwriteConfirm: '技能 "{name}" 已存在，是否覆盖？',
    commandExported: '命令已导出',
  },
  dialog: {
    confirm: '确定',
    cancel: '取消'
  },
  footer: {
    config: '配置'
  },
  update: {
    title: '检查更新',
    checkForUpdates: '检查更新',
    available: '发现新版本',
    updateCancelled: '更新已取消',
    currentVersion: '当前版本',
    newVersion: '最新版本',
    releaseNotes: '更新说明',
    later: '稍后提醒',
    updateNow: '立即更新',
    updateHint: '下载完成后将提醒您安装',
    downloading: '正在下载更新...',
    readyToInstall: '更新已下载',
    downloadComplete: '下载完成，可以安装更新了',
    cancel: '取消',
    installNow: '立即安装',
    installFailed: '安装失败，请稍后重试或手动下载安装',
    background: '后台下载',
    backgroundComplete: '后台下载已完成 v{version}，可在「关于」页面安装更新',
    backgroundDownloading: '后台下载中... {progress}%',
    checkFailed: '检查更新失败',
    noUpdate: '已是最新版本',
    downloadingProgress: '下载进度',
    downloadingSpeed: '下载速度',
    error: {
      network: '网络错误，请检查网络连接',
      server: '服务器错误，请稍后重试',
      unknown: '未知错误',
      requestTimeout: '请求超时',
      downloadFailed: '下载失败: HTTP {code}',
      downloadTimeout: '下载超时',
      downloadInProgress: '上次下载仍在进行中，请稍后重试',
      noDownloadUrl: '无可用下载链接',
      noDownloadedUpdate: '没有已下载的更新',
      noReleaseUrl: '没有 Release 页面链接',
    },
    menu: {
      checkUpdate: '检查更新',
      about: '关于',
      autoUpdate: '自动更新'
    },
    checking: '检查中...'
  },
  languages: {
    'zh-CN': '简体中文',
    'en-US': 'English',
    'ja-JP': '日本語'
  },
  iflow: {
    title: 'iFlow Mod 管理',
    description: '管理 iFlow 核心文件的修改模块',
    fileStatus: '文件状态',
    enabledMods: '已启用 Mod',
    statusFound: '已找到',
    statusNotFound: '未找到',
    mods: {
      title: '已安装的 Mod',
      import: '导入 Mod',
      export: '导出',
      delete: '删除',
      enable: '启用',
      disable: '禁用',
      emptyTitle: '暂无 Mod',
      emptyDesc: '导入 Mod 来修改 iFlow 核心文件的功能',
      enableSuccess: '已启用 "{name}"',
      disableSuccess: '已禁用 "{name}"',
      deleteSuccess: '已删除 "{name}"',
      exportSuccess: '已导出 "{name}"',
      importSuccess: '已导入 {count} 个 Mod',
      confirmDelete: '确定要删除 Mod "{name}" 吗？此操作不可撤销。',
      types: {
        replace: '替换',
        append: '追加',
        prepend: '前置',
        patch: '补丁'
      }
    },
    applying: {
      enabling: '正在启用 Mod…',
      disabling: '正在禁用 Mod…'
    },
    category: {
      all: '全部'
    },
    compatibility: {
      tooOld: '需要 iFlow v{required}，当前 v{current} 版本过低',
      tooNew: '需要 iFlow v{required}，当前 v{current} 版本过高',
      exactRequired: '需要 iFlow v{required}，当前 v{current} 不匹配',
      versionUnavailable: '无法检测 iFlow 版本，跳过兼容性检查'
    },
    errors: {
      missingModJson: 'Mod 包缺少 mod.json 文件',
      invalidModJson: 'mod.json 格式无效',
      missingRequiredField: 'mod.json 缺少必填字段: {field}',
      invalidModType: '无效的 Mod 类型: {type}',
      missingMainFile: 'Mod 包缺少主文件: {file}',
      modNotFound: '未找到 Mod: {id}',
      iflowPathNotFound: '未找到 iFlow 安装路径',
      iflowNotFound: '未找到 iFlow.js 文件，请确认 iFlow 已正确安装',
      invalidModId: '无效的 Mod ID',
      modDirNotFound: 'Mod 目录不存在',
      noOriginalBackup: '未找到原始备份文件，无法恢复',
      patchNotSupported: '补丁类型 Mod 暂不支持',
      fileNotFound: '文件不存在',
      cannotDeleteDependent: '无法删除，以下 Mod 依赖于此: {mods}',
      includeMapDeployFailed: '部署 include-map 失败: {error}',
      includeMapFileNotFound: '未找到 include-map 文件: {file}',
      invalidDependsOn: 'dependsOn 字段格式无效',
      invalidDependsOnItems: 'dependsOn 包含无效的依赖项',
      missingDependencies: '缺少依赖 Mod: {deps}',
    },
    exportDialog: {
      title: '导出 Mod'
    },
    importExport: {
      importTitle: '导入 Mod',
      overwriteConfirm: '已存在同名 Mod "{name}"，是否覆盖？',
      importError: '导入 Mod 失败: {error}',
      diffGenerationError: '生成差异补丁失败'
    }
  }
}

// 当前翻译对象
let translations = { ...defaultTranslations }

// 深度合并对象
function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

/**
 * 更新翻译数据
 * @param {Object} localeData - 包含主进程翻译的数据
 */
function updateTranslations(localeData) {
  if (localeData) {
    translations = deepMerge({ ...defaultTranslations }, localeData)
  }
}

/**
 * 获取翻译
 * @param {string} key - 翻译键，格式 'section.key' 或 'section.subkey'
 *                         也支持 'main.section.key' 格式（会尝试在 main 下查找）
 * @param {Object} params - 替换参数
 * @returns {string} 翻译后的文本
 */
function t(key, params = {}) {
  const keys = key.split('.')
  let value = translations

  // 先尝试直接查找
  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) break
  }

  // 如果没找到，尝试在 main 下查找（兼容 dialogs.xxx → main.dialogs.xxx 等）
  if (value === undefined) {
    value = translations?.main
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }
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