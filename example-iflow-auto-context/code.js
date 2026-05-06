/**
 * iFlow Mod: 自动上下文注入
 * Type: append — 追加到 iflow.js 末尾
 *
 * 这是一个示例 Mod，展示 append 类型的用法。
 * 实际使用时，code.js 的内容会被追加到 iflow.js 文件末尾。
 */

// 示例：追加的上下文注入逻辑
function injectProjectContext() {
  const fs = require('fs')
  const path = require('path')

  const cwd = process.cwd()
  const gitDir = path.join(cwd, '.git')

  let context = `\n// ── 自动注入的上下文 ──────────────────────\n`
  context += `// 工作目录: ${cwd}\n`

  if (fs.existsSync(gitDir)) {
    context += `// Git 仓库: 已检测\n`
  }

  context += `// ──────────────────────────────────────────\n`

  return context
}

module.exports = { injectProjectContext }
