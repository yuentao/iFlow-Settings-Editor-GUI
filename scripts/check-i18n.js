/**
 * i18n 键完整性检查脚本
 * 比较中文、英文、日文三个语言文件中的键是否完整对齐
 *
 * 用法: node scripts/check-i18n.js
 */

async function loadModule(name) {
  const mod = await import(new URL(`../src/locales/${name}`, import.meta.url).href)
  return mod.default
}

/**
 * 递归收集嵌套对象中的所有值键路径（叶子节点）
 * @param {object} obj - 对象
 * @param {string} prefix - 前缀路径
 * @returns {Set<string>} 键路径集合
 */
function collectKeys(obj, prefix = '') {
  const keys = new Set()
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = collectKeys(value, fullKey)
      for (const k of nested) keys.add(k)
    } else {
      keys.add(fullKey)
    }
  }
  return keys
}

async function main() {
  const zh = await loadModule('index.js')
  const en = await loadModule('en-US.js')
  const ja = await loadModule('ja-JP.js')

  const zhKeys = collectKeys(zh)
  const enKeys = collectKeys(en)
  const jaKeys = collectKeys(ja)

  const allKeys = new Set([...zhKeys, ...enKeys, ...jaKeys])

  let hasErrors = false

  console.log('\n=== i18n 键完整性检查 ===\n')
  console.log(`中文 (index.js): ${zhKeys.size} 个键`)
  console.log(`英文 (en-US.js): ${enKeys.size} 个键`)
  console.log(`日文 (ja-JP.js): ${jaKeys.size} 个键`)
  console.log(`总计唯一键:   ${allKeys.size} 个\n`)

  for (const key of [...allKeys].sort()) {
    const inZh = zhKeys.has(key)
    const inEn = enKeys.has(key)
    const inJa = jaKeys.has(key)

    if (!inZh) {
      console.log(`[缺失] 中文缺少: ${key}`)
      hasErrors = true
    }
    if (!inEn) {
      console.log(`[缺失] 英文缺少: ${key}`)
      hasErrors = true
    }
    if (!inJa) {
      console.log(`[缺失] 日文缺少: ${key}`)
      hasErrors = true
    }
  }

  if (!hasErrors) {
    console.log('所有语言文件键完全对齐，无缺失。')
  } else {
    console.log('\n存在缺失的翻译键，请补充后重新检查。')
  }

  process.exit(hasErrors ? 1 : 0)
}

main().catch(err => {
  console.error('检查失败:', err.message)
  process.exit(1)
})