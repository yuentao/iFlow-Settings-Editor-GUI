#!/usr/bin/env node

/**
 * 增量更新自动化测试脚本
 * 用于 CI/CD 或本地验证构建配置
 * 
 * 使用方法: node scripts/test-delta-update.js
 */

const fs = require('fs')
const path = require('path')

console.log('🧪 Starting Delta Update Build Test...\n')

const errors = []
const warnings = []

/**
 * 运行测试
 */
async function runTests() {
  // Test 1: Verify package.json configuration
  console.log('Test 1: Verify package.json configuration')
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))
    const buildConfig = pkg.build || {}
    const publishConfig = buildConfig.publish || {}

    // generateBlockmap 不是 publish 的有效属性，electron-builder 对 NSIS 目标默认生成 .blockmap
    // 无需在 package.json 中显式配置

    if (!publishConfig.provider || publishConfig.provider !== 'github') {
      errors.push('❌ publish.provider must be "github"')
    } else {
      console.log('✅ provider: github')
    }

    if (!publishConfig.owner) {
      warnings.push('⚠️  publish.owner not set (required for publishing)')
    } else {
      console.log(`✅ publish.owner: ${publishConfig.owner}`)
    }

    if (!publishConfig.repo) {
      warnings.push('⚠️  publish.repo not set (required for publishing)')
    } else {
      console.log(`✅ publish.repo: ${publishConfig.repo}`)
    }

    // 检查版本号
    const version = pkg.version
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      warnings.push('⚠️  Version format may not be standard (expected x.y.z)')
    } else {
      console.log(`✅ Version: ${version}`)
    }

    // 检查 electron-updater 依赖
    const electronUpdaterVersion = pkg.dependencies?.['electron-updater']
    if (!electronUpdaterVersion) {
      errors.push('❌ electron-updater not found in dependencies')
    } else {
      console.log(`✅ electron-updater: ${electronUpdaterVersion}`)
    }

    // 检查 electron-builder 依赖
    const electronBuilderVersion = pkg.devDependencies?.['electron-builder']
    if (!electronBuilderVersion) {
      errors.push('❌ electron-builder not found in devDependencies')
    } else {
      console.log(`✅ electron-builder: ${electronBuilderVersion}`)
    }

    console.log('✅ package.json configuration is valid\n')
  } catch (error) {
    errors.push(`❌ Failed to read package.json: ${error.message}`)
  }

  // Test 2: Verify autoUpdater.js exists and contains delta logic
  console.log('Test 2: Verify autoUpdater.js delta support')
  try {
    const autoUpdaterPath = path.join(__dirname, '..', 'src', 'main', 'autoUpdater.js')
    if (!fs.existsSync(autoUpdaterPath)) {
      errors.push('❌ autoUpdater.js not found')
    } else {
      const content = fs.readFileSync(autoUpdaterPath, 'utf-8')
      
      // 检查关键配置
      // disableDifferentialDownload 是控制差分下载的有效 API（默认 false = 启用差分）
      if (content.includes('disableDifferentialDownload') || content.includes('blockMap')) {
        console.log('✅ autoUpdater.js contains delta update logic')
      } else {
        warnings.push('⚠️  autoUpdater.js may not have delta update configuration')
      }

      // 检查事件绑定
      const requiredEvents = [
        'checking-for-update',
        'update-available',
        'update-not-available',
        'download-progress',
        'update-downloaded',
        'download-error',
        'error'
      ]

      let eventsFound = 0
      requiredEvents.forEach(event => {
        if (content.includes(`.on('${event}'`)) {
          eventsFound++
        }
      })

      if (eventsFound >= 5) {
        console.log(`✅ autoUpdater.js has ${eventsFound}/${requiredEvents.length} event handlers`)
      } else {
        warnings.push(`⚠️  autoUpdater.js only has ${eventsFound}/${requiredEvents.length} event handlers`)
      }
    }
    console.log()
  } catch (error) {
    errors.push(`❌ Failed to check autoUpdater.js: ${error.message}`)
  }

  // Test 3: Verify IPC handlers exist
  console.log('Test 3: Verify IPC handlers')
  try {
    const ipcPath = path.join(__dirname, '..', 'src', 'main', 'ipc', 'updates.js')
    if (!fs.existsSync(ipcPath)) {
      warnings.push('⚠️  updates.js IPC handler not found (using legacy handler)')
    } else {
      const content = fs.readFileSync(ipcPath, 'utf-8')
      
      const handlers = [
        'check-for-updates',
        'download-update',
        'get-update-status',
        'get-pending-update',
      ]

      handlers.forEach(handler => {
        if (content.includes(`'${handler}'`) || content.includes(`"${handler}"`)) {
          console.log(`✅ IPC handler: ${handler}`)
        }
      })
    }
    console.log()
  } catch (error) {
    warnings.push(`⚠️  Failed to check IPC handlers: ${error.message}`)
  }

  // Test 4: Verify publish script exists
  console.log('Test 4: Verify publish script')
  try {
    const publishScriptPath = path.join(__dirname, 'publish.js')
    if (!fs.existsSync(publishScriptPath)) {
      warnings.push('⚠️  scripts/publish.js not found')
    } else {
      const content = fs.readFileSync(publishScriptPath, 'utf-8')
      
      if (content.includes('.blockmap')) {
        console.log('✅ publish.js checks for blockmap files')
      } else {
        warnings.push('⚠️  publish.js may not verify blockmap files')
      }

      if (content.includes('.delta')) {
        console.log('✅ publish.js checks for delta files')
      } else {
        warnings.push('⚠️  publish.js may not verify delta files')
      }
    }
    console.log()
  } catch (error) {
    warnings.push(`⚠️  Failed to check publish script: ${error.message}`)
  }

  // Test 5: Check release directory (if exists)
  console.log('Test 5: Check build output')
  const releaseDir = path.join(__dirname, '..', 'release')
  if (!fs.existsSync(releaseDir)) {
    warnings.push('⚠️  Release directory does not exist (run "npm run build:win" first)')
    console.log('ℹ️  Run "npm run build:win" to generate release files\n')
  } else {
    const files = fs.readdirSync(releaseDir)

    // Check for blockmap files
    const blockmaps = files.filter(f => f.endsWith('.blockmap'))
    if (blockmaps.length === 0) {
      warnings.push('⚠️  No .blockmap files found (normal for first build)')
    } else {
      console.log(`✅ Found ${blockmaps.length} blockmap file(s): ${blockmaps.join(', ')}`)
    }

    // Check for exe files
    const exes = files.filter(f => f.endsWith('.exe') && !f.endsWith('.blockmap'))
    if (exes.length === 0) {
      warnings.push('⚠️  No .exe files found in release directory')
    } else {
      console.log(`✅ Found ${exes.length} installer(s): ${exes.join(', ')}`)
    }

    // Check for delta files (optional, may not exist on first release)
    const deltas = files.filter(f => f.endsWith('.delta'))
    if (deltas.length > 0) {
      console.log(`✅ Found ${deltas.length} delta file(s): ${deltas.join(', ')}`)
    } else {
      console.log('ℹ️  No .delta files found (normal for first release)')
    }

    console.log()
  }

  // Test 6: Check unit test file
  console.log('Test 6: Verify unit tests')
  try {
    const testPath = path.join(__dirname, '..', 'src', 'main', '__tests__', 'autoUpdater.delta.test.js')
    if (!fs.existsSync(testPath)) {
      warnings.push('⚠️  Unit test file not found')
    } else {
      const content = fs.readFileSync(testPath, 'utf-8')
      
      const testCount = (content.match(/it\(/g) || []).length
      const describeCount = (content.match(/describe\(/g) || []).length

      if (testCount > 0) {
        console.log(`✅ Found ${testCount} unit test(s) in ${describeCount} describe block(s)`)
      } else {
        warnings.push('⚠️  No tests found in test file')
      }
    }
    console.log()
  } catch (error) {
    warnings.push(`⚠️  Failed to check unit tests: ${error.message}`)
  }

  // Summary
  console.log('═'.repeat(50))
  console.log('📊 Test Summary')
  console.log('═'.repeat(50))

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    errors.forEach(e => console.log(e))
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    warnings.forEach(w => console.log(w))
  }

  if (errors.length === 0) {
    console.log('\n🎉 All critical tests passed!')
    console.log('\nNext steps:')
    console.log('1. Build and publish: npm run publish')
    console.log('2. Verify GitHub Release contains .blockmap files')
    console.log('3. Test delta update from previous version')
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed. Please fix the errors above.')
    process.exit(1)
  }
}

runTests().catch(error => {
  console.error('❌ Test runner error:', error.message)
  process.exit(1)
})
