/**
 * iFlow Mod: 深色模式增强
 * Type: replace — 完整替换 iflow.js 中对应的 UI 主题模块
 *
 * 这是一个示例 Mod，展示 replace 类型的用法。
 * 实际使用时，code.js 的内容应为完整的替换代码。
 */

// 示例：替换后的主题配置
const darkTheme = {
  name: 'Dark Mode Enhanced',
  colors: {
    background: '#1a1a2e',
    foreground: '#e0e0e0',
    accent: '#0067c0',
    success: '#0f7b0f',
    warning: '#9d5d00',
    error: '#c42b1c',
  },
  typography: {
    fontFamily: 'Cascadia Code, Consolas, monospace',
    fontSize: 14,
  },
}

module.exports = { darkTheme }
