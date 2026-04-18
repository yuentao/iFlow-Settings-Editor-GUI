export default {
  app: {
    title: 'iFlow 设置编辑器'
  },
  window: {
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭'
  },
  sidebar: {
    general: '常规',
    basicSettings: '基本设置',
    apiConfig: 'API 配置',
    advanced: '高级',
    mcpServers: 'MCP 服务器',
    skills: '技能'
  },
  general: {
    title: '基本设置',
    description: '配置应用程序的常规选项',
    language: '语言',
    theme: '主题',
    languageInterface: '语言与界面',
    otherSettings: '其他设置',
    bootAnimation: '启动动画',
    bootAnimationShown: '已显示',
    bootAnimationNotShown: '未显示',
    checkpointing: '检查点保存',
    enabled: '已启用',
    disabled: '已禁用',
    acrylicEffect: '亚克力效果',
    acrylicMin: '不透明',
    acrylicMax: '透明'
  },
  theme: {
    dark: '深色',
    light: '浅色',
    system: '跟随系统'
  },
  api: {
    title: 'API 配置',
    description: '配置 AI 服务和搜索 API',
    currentConfig: '当前配置',
    createTitle: '新建 API 配置',
    editTitle: '编辑 API 配置',
    profileManagement: '配置文件管理',
    newProfile: '新建配置',
    profileName: '配置名称',
    configName: '配置名称',
    configNamePlaceholder: '请输入配置名称',
    newConfigNamePlaceholder: '请输入新配置的名称',
    authType: '认证方式',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'sk-cp-XXXXX...',
    baseUrl: 'Base URL',
    baseUrlPlaceholder: 'https://api.minimaxi.com/v1',
    modelName: '模型名称',
    modelNamePlaceholder: 'MiniMax-M2.7',
    inUse: '使用中',
    cancel: '取消',
    create: '创建',
    save: '保存',
    edit: '编辑',
    duplicate: '复制',
    delete: '删除',
    unconfigured: '未配置',
    noBaseUrl: '未配置 Base URL',
    configCreated: '配置 "{name}" 已创建',
    configDeleted: '配置已删除',
    configCopied: '配置已复制为 "{name}"',
    switchFailed: '切换失败',
    auth: {
      iflow: 'iFlow',
      api: 'API Key',
      openaiCompatible: 'OpenAI 兼容'
    }
  },
  mcp: {
    title: 'MCP 服务器',
    description: '管理 Model Context Protocol 服务器配置',
    serverList: '服务器列表',
    addServer: '添加服务器',
    editServer: '编辑服务器',
    serverName: '服务器名称',
    serverNamePlaceholder: 'my-mcp-server',
    descriptionLabel: '描述',
    descriptionPlaceholder: '服务器描述信息',
    command: '命令',
    commandPlaceholder: 'npx',
    workingDir: '工作目录',
    cwdPlaceholder: '.',
    args: '参数 (每行一个)',
    argsPlaceholder: '-y\\npackage-name',
    envVars: '环境变量 (JSON 格式)',
    envVarsPlaceholder: "例如: API_KEY=xxx",
    invalidEnvJson: '环境变量 JSON 格式错误',
    noServers: '暂无 MCP 服务器',
    addFirstServer: '点击上方按钮添加第一个服务器',
    noDescription: '无描述',
    delete: '删除',
    cancel: '取消',
    saveChanges: '保存更改',
    addServerBtn: '添加服务器',
    inputServerName: '请输入服务器名称',
    serverNameExists: '服务器名称已存在'
  },
  skills: {
    title: '技能管理',
    description: '管理 iFlow CLI 技能配置',
    importLocal: '本地导入',
    importOnline: '在线导入',
    export: '导出',
    delete: '删除',
    noSkills: '暂无技能',
    addFirstSkill: '点击上方按钮添加第一个技能',
    noDescription: '无描述',
    url: '技能 URL',
    urlPlaceholder: 'https://github.com/user/repo/archive/refs/heads/main.zip',
    skillName: '技能名称',
    namePlaceholder: 'my-skill',
    cancel: '取消',
    import: '导入'
  },
  messages: {
    error: '错误',
    warning: '警告',
    success: '成功',
    info: '信息',
    cannotDeleteDefault: '不能删除默认配置',
    inputConfigName: '请输入配置名称',
    confirmDeleteConfig: '确定要删除配置 "{name}" 吗？',
    confirmDeleteServer: '确定要删除服务器 "{name}" 吗？'
  },
  dialog: {
    confirm: '确定',
    cancel: '取消'
  },
  footer: {
    config: '配置'
  },
  languages: {
    'zh-CN': '简体中文',
    'en-US': 'English',
    'ja-JP': '日本語'
  }
}
