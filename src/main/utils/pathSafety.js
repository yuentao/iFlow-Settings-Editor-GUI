const path = require('path')

function isPathInside(baseDir, userInput) {
  if (!baseDir || typeof userInput !== 'string') return false
  const resolvedBase = path.resolve(baseDir)
  const resolvedTarget = path.resolve(resolvedBase, userInput)
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + path.sep)
}

function resolveSafePath(baseDir, userInput) {
  if (!isPathInside(baseDir, userInput)) {
    return null
  }
  return path.resolve(baseDir, userInput)
}

module.exports = {
  isPathInside,
  resolveSafePath,
}
