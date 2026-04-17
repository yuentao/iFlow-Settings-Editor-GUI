export default {
  app: {
    title: 'iFlow 設定エディタ'
  },
  window: {
    minimize: '最小化',
    maximize: '最大化',
    close: '閉じる'
  },
  sidebar: {
    general: '一般',
    basicSettings: '基本設定',
    apiConfig: 'API 設定',
    advanced: '詳細',
    mcpServers: 'MCP サーバー'
  },
  general: {
    title: '基本設定',
    description: 'アプリケーションの一般設定を構成',
    language: '言語',
    theme: 'テーマ',
    languageInterface: '言語とインターフェース',
    otherSettings: 'その他の設定',
    bootAnimation: '起動アニメーション',
    bootAnimationShown: '表示済み',
    bootAnimationNotShown: '未表示',
    checkpointing: 'チェックポイント保存',
    enabled: '有効',
    disabled: '無効'
  },
  theme: {
    xcode: 'Xcode',
    dark: 'ダーク',
    light: 'ライト',
    solarizedDark: 'Solarized Dark'
  },
  api: {
    title: 'API 設定',
    description: 'AI サービスと検索 API を構成',
    currentConfig: '現在設定',
    createTitle: 'API 設定を作成',
    editTitle: 'API 設定を編集',
    profileManagement: 'プロファイル管理',
    newProfile: '新規プロファイル',
    profileName: 'プロファイル名',
    configName: 'プロファイル名',
    configNamePlaceholder: 'プロファイル名を入力',
    newConfigNamePlaceholder: '新しいプロファイル名を入力',
    authType: '認証方式',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'sk-cp-XXXXX...',
    baseUrl: 'Base URL',
    baseUrlPlaceholder: 'https://api.minimaxi.com/v1',
    modelName: 'モデル名',
    modelNamePlaceholder: 'MiniMax-M2.7',
    searchApiKey: '検索 API Key',
    searchApiKeyPlaceholder: 'sk-XXXXX...',
    cna: 'CNA',
    cnaPlaceholder: 'CNA 識別子',
    inUse: '使用中',
    cancel: 'キャンセル',
    create: '作成',
    save: '保存',
    edit: '編集',
    duplicate: '複製',
    delete: '削除',
    unconfigured: '未設定',
    noBaseUrl: 'Base URL 未設定',
    configCreated: 'プロファイル "{name}" を作成しました',
    configDeleted: 'プロファイルを削除しました',
    configCopied: 'プロファイルを "{name}" に複製しました',
    switchFailed: '切り替えに失敗しました',
    auth: {
      iflow: 'iFlow',
      api: 'API Key',
      openaiCompatible: 'OpenAI 互換'
    }
  },
  mcp: {
    title: 'MCP サーバー',
    description: 'Model Context Protocol サーバー設定を管理',
    serverList: 'サーバー一覧',
    addServer: 'サーバーを追加',
    editServer: 'サーバーを編集',
    serverName: 'サーバー名',
    serverNamePlaceholder: 'my-mcp-server',
    descriptionLabel: '説明',
    descriptionPlaceholder: 'サーバーの説明',
    command: 'コマンド',
    commandPlaceholder: 'npx',
    workingDir: '作業ディレクトリ',
    cwdPlaceholder: '.',
    args: '引数（1行に1つ）',
    argsPlaceholder: '-y\\npackage-name',
    envVars: '環境変数（JSON形式）',
    envVarsPlaceholder: "例: API_KEY=xxx",
    invalidEnvJson: '環境変数の JSON 形式が無効です',
    noServers: 'MCP サーバーがありません',
    addFirstServer: '上のボタンをクリックして最初のサーバーを追加',
    noDescription: '説明なし',
    delete: '削除',
    cancel: 'キャンセル',
    saveChanges: '変更を保存',
    addServerBtn: 'サーバーを追加',
    inputServerName: 'サーバー名を入力してください',
    serverNameExists: 'サーバー名は既に存在します'
  },
  messages: {
    error: 'エラー',
    warning: '警告',
    success: '成功',
    info: '情報',
    cannotDeleteDefault: 'デフォルトプロファイルは削除できません',
    inputConfigName: 'プロファイル名を入力してください',
    confirmDeleteConfig: 'プロファイル "{name}" を削除してもよろしいですか？',
    confirmDeleteServer: 'サーバー "{name}" を削除してもよろしいですか？'
  },
  dialog: {
    confirm: '確認',
    cancel: 'キャンセル'
  },
  footer: {
    config: '設定'
  },
  languages: {
    'zh-CN': '简体中文',
    'en-US': 'English',
    'ja-JP': '日本語'
  }
}
