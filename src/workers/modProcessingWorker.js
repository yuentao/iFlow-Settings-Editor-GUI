/**
 * iFlow Mod 处理 Worker
 * 在 Worker 线程中处理大文件的 diff 计算，避免阻塞主线程
 */

const { parentPort, workerData } = require('worker_threads')
const diff = require('diff')

/**
 * 归一化文本（去除 \r）
 */
function normalizeText(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '')
}

/**
 * 检测同一行内两个 Mod 的改动区域是否真正重叠
 */
function hasOverlappingChanges(origLine, modALine, modBLine) {
  if (modALine === origLine || modBLine === origLine) return false
  if (modALine === modBLine) return false

  const regionsA = []
  const regionsB = []
  let pos = 0

  for (const c of diff.diffChars(origLine, modALine)) {
    if (c.removed) {
      regionsA.push({ start: pos, end: pos + c.count })
      pos += c.count
    } else if (!c.added) {
      pos += c.count
    }
  }

  pos = 0
  for (const c of diff.diffChars(origLine, modBLine)) {
    if (c.removed) {
      regionsB.push({ start: pos, end: pos + c.count })
      pos += c.count
    } else if (!c.added) {
      pos += c.count
    }
  }

  for (const ra of regionsA) {
    for (const rb of regionsB) {
      if (ra.end > rb.start && rb.end > ra.start) {
        return true
      }
    }
  }
  return false
}

/**
 * 合并同一行内来自不同 Mod 的字符级改动
 */
function mergeLineChanges(origLine, contentLine, modLine) {
  if (contentLine === origLine) {
    return { merged: modLine, conflict: false }
  }
  if (modLine === origLine) {
    return { merged: contentLine, conflict: false }
  }
  if (modLine === contentLine) {
    return { merged: modLine, conflict: false }
  }

  const changesA = diff.diffChars(origLine, contentLine)
  const changesB = diff.diffChars(origLine, modLine)

  const regionsA = []
  const regionsB = []
  let pos = 0

  for (const c of changesA) {
    if (c.added) {
      regionsA.push({ start: pos, end: pos, value: c.value })
    } else if (c.removed) {
      regionsA.push({ start: pos, end: pos + c.count, value: '' })
      pos += c.count
    } else {
      pos += c.count
    }
  }

  pos = 0
  for (const c of changesB) {
    if (c.added) {
      regionsB.push({ start: pos, end: pos, value: c.value })
    } else if (c.removed) {
      regionsB.push({ start: pos, end: pos + c.count, value: '' })
      pos += c.count
    } else {
      pos += c.count
    }
  }

  for (const ra of regionsA) {
    for (const rb of regionsB) {
      if (ra.end > rb.start && rb.end > ra.start) {
        return { merged: modLine, conflict: true }
      }
    }
  }

  const allRegions = [
    ...regionsA.map(r => ({ ...r, source: 'A' })),
    ...regionsB.map(r => ({ ...r, source: 'B' })),
  ]
  allRegions.sort((a, b) => b.start - a.start)

  let merged = origLine
  for (const region of allRegions) {
    if (region.value === '') {
      merged = merged.slice(0, region.start) + merged.slice(region.end)
    } else {
      merged = merged.slice(0, region.start) + region.value + merged.slice(region.start)
    }
  }

  return { merged, conflict: false }
}

/**
 * 检测已启用 Mod 之间的冲突
 */
function detectConflictsTask(params) {
  const { original, modsCode, sendProgress } = params

  const normalize = s => normalizeText(s)
  const originalLines = normalize(original).split('\n')

  // 收集每个 Mod 改动过的行号及修改后的行内容
  const modChanges = []
  let modIndex = 0
  const totalMods = modsCode.length

  for (const modCode of modsCode) {
    const code = normalize(modCode.content).split('\n')
    const changedLines = []
    const maxLen = Math.max(originalLines.length, code.length)

    for (let i = 0; i < maxLen; i++) {
      if ((originalLines[i] || '') !== (code[i] || '')) {
        changedLines.push({
          lineNum: i + 1,
          content: code[i] || '',
        })
      }
    }

    modChanges.push({ modId: modCode.modId, modName: modCode.modName, changedLines })

    modIndex++
    if (sendProgress && modIndex % 5 === 0) {
      sendProgress({ phase: 'detecting', progress: Math.round((modIndex / totalMods) * 50) })
    }
  }

  // 查找冲突
  const conflicts = []
  for (let i = 0; i < modChanges.length; i++) {
    for (let j = i + 1; j < modChanges.length; j++) {
      const a = modChanges[i]
      const b = modChanges[j]
      const lineMapA = new Map(a.changedLines.map(cl => [cl.lineNum, cl.content]))
      const conflictingLines = []

      for (const clB of b.changedLines) {
        const clAContent = lineMapA.get(clB.lineNum)
        if (clAContent !== undefined) {
          const origLine = originalLines[clB.lineNum - 1] || ''
          if (hasOverlappingChanges(origLine, clAContent, clB.content)) {
            conflictingLines.push(clB.lineNum)
          }
        }
      }

      if (conflictingLines.length > 0) {
        conflicts.push({
          modA: { id: a.modId, name: a.modName },
          modB: { id: b.modId, name: b.modName },
          lines: conflictingLines,
        })
      }

      if (sendProgress) {
        const pairProgress = 50 + Math.round(((i * totalMods + j) / (totalMods * totalMods)) * 50)
        sendProgress({ phase: 'comparing', progress: Math.min(pairProgress, 99) })
      }
    }
  }

  return conflicts
}

/**
 * 应用 code.js 补丁
 */
function applyCodeJsChangesTask(params) {
  const { original, codeJs, content, sendProgress } = params

  const origLines = normalizeText(original).split('\n')
  const codeLines = normalizeText(codeJs).split('\n')
  const contentLines = normalizeText(content).split('\n')

  const changes = diff.diffArrays(origLines, codeLines)

  const result = []
  let contentPos = 0

  for (let ci = 0; ci < changes.length; ci++) {
    const change = changes[ci]

    if (change.removed) {
      const nextChange = changes[ci + 1]
      if (nextChange && nextChange.added) {
        const removedCount = change.count
        const addedCount = nextChange.count
        const maxPair = Math.max(removedCount, addedCount)

        for (let i = 0; i < maxPair; i++) {
          const origLine = i < removedCount ? change.value[i] : ''
          const modLine = i < addedCount ? nextChange.value[i] : ''
          const contentLine = contentPos < contentLines.length ? contentLines[contentPos] : ''

          if (i < removedCount) {
            const { merged } = mergeLineChanges(origLine, contentLine, modLine)
            result.push(merged)
            contentPos++
          } else {
            result.push(modLine)
          }
        }

        ci++
      } else {
        contentPos += change.count
      }
    } else if (change.added) {
      result.push(...change.value)
    } else {
      for (let i = 0; i < change.count; i++) {
        if (contentPos < contentLines.length) {
          result.push(contentLines[contentPos])
          contentPos++
        }
      }
    }

    // 发送进度
    if (sendProgress && ci % 10 === 0) {
      sendProgress({ phase: 'applying', progress: Math.round((ci / changes.length) * 100) })
    }
  }

  while (contentPos < contentLines.length) {
    result.push(contentLines[contentPos])
    contentPos++
  }

  return result.join('\n')
}

/**
 * 应用 unified diff 补丁
 */
function applyUnifiedDiffTask(params) {
  const { content, diffText } = params

  const hasTrailingNewline = content.endsWith('\n')
  const source = hasTrailingNewline ? content : content + '\n'
  const result = diff.applyPatch(source, diffText)

  if (result === false) {
    throw new Error('diff.applyPatch: Patch application returned false (context mismatch)')
  }

  return hasTrailingNewline ? result : result.replace(/\n$/, '')
}

// 消息处理
parentPort.on('message', (message) => {
  const { type, id, data } = message

  const progressCallback = (progress) => {
    parentPort.postMessage({ type: 'PROGRESS', id, progress })
  }

  try {
    let result

    switch (type) {
      case 'detectConflicts': {
        const conflicts = detectConflictsTask({
          original: data.original,
          modsCode: data.modsCode,
          sendProgress: progressCallback,
        })
        result = { conflicts }
        break
      }

      case 'applyCodeJsChanges': {
        const applied = applyCodeJsChangesTask({
          original: data.original,
          codeJs: data.codeJs,
          content: data.content,
          sendProgress: progressCallback,
        })
        result = { applied }
        break
      }

      case 'applyUnifiedDiff': {
        const applied = applyUnifiedDiffTask({
          content: data.content,
          diffText: data.diffText,
        })
        result = { applied }
        break
      }

      case 'generateDiff': {
        // 使用 diff.createPatch 生成补丁
        const patchContent = diff.createPatch('iflow.js', data.original, data.code)
        result = { patch: patchContent }
        break
      }

      default:
        throw new Error(`Unknown task type: ${type}`)
    }

    parentPort.postMessage({ type: 'SUCCESS', id, result })
  } catch (error) {
    parentPort.postMessage({ type: 'ERROR', id, error: error.message })
  }
})
