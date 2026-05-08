// scripts/publish.js
// 发布辅助脚本 - 构建并发布到 GitHub Releases，自动验证差分更新文件

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Starting iFlow Settings Editor publish process...\n')

async function run() {
  try {
    // 1. 读取版本号
    const pkg = require('../package.json')
    const version = pkg.version
    console.log(`📦 Publishing version: ${version}\n`)

    // 2. 构建 Vue 应用
    console.log('🔨 Building Vue app...')
    execSync('npm run build', { stdio: 'inherit' })
    console.log('✅ Vue build completed\n')

    // 3. 构建并发布到 GitHub Releases
    console.log('📤 Publishing to GitHub Releases...')
    execSync('npm run publish', { stdio: 'inherit' })
    console.log('✅ Published to GitHub Releases\n')

    // 4. 验证发布文件
    const releaseDir = path.join(__dirname, '..', 'release')
    if (!fs.existsSync(releaseDir)) {
      throw new Error('Release directory not found!')
    }

    const files = fs.readdirSync(releaseDir)
    console.log('📂 Published files:')
    files.forEach(f => console.log(`   ${f}`))

    // 5. 检查 blockmap 文件（差分更新关键）
    const blockmaps = files.filter(f => f.endsWith('.blockmap'))
    if (blockmaps.length > 0) {
      console.log('\n🔐 Blockmap files generated (delta update ready):')
      blockmaps.forEach(f => console.log(`   ✅ ${f}`))
    } else {
      console.warn('\n⚠️  WARNING: No .blockmap files found!')
      console.warn('   Delta updates will NOT work without blockmap files.')
      console.warn('   Check your package.json build.publish configuration.')
    }

    // 6. 检查差分包（如果存在旧版本 blockmap）
    const deltas = files.filter(f => f.endsWith('.delta'))
    if (deltas.length > 0) {
      console.log('\n🔄 Delta files generated:')
      deltas.forEach(f => console.log(`   ✅ ${f}`))
      console.log('\n🎉 Delta updates are enabled!')
    } else {
      console.log('\nℹ️  No .delta files found.')
      console.log('   This is normal if this is the first release or no previous version blockmap exists.')
      console.log('   Delta files will be generated on the NEXT release (if previous version has blockmap).')
    }

    console.log('\n🎉 Publish completed successfully!')
    console.log(`   Version ${version} is now available on GitHub Releases.`)
  } catch (error) {
    console.error('\n❌ Publish failed:', error.message)
    process.exit(1)
  }
}

run()