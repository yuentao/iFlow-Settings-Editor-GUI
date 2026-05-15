/**
 * 模型使用统计 Worker
 * 在 Worker 线程中处理大数据量的聚合计算，避免阻塞 UI
 */

self.onmessage = function (e) {
  const { type, payload } = e.data

  if (type === 'AGGREGATE') {
    try {
      const { messages, days } = payload
      const result = aggregateModelUsage(messages, days)
      self.postMessage({ type: 'SUCCESS', payload: result })
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        payload: { message: error.message },
      })
    }
  }
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 按天 + 模型聚合统计
 */
function aggregateModelUsage(messages, days) {
  const now = new Date()
  const startDate = new Date()
  startDate.setDate(now.getDate() - days)

  // 1. 按日期分组: Map<dateStr, Map<modelName, callCount>>
  const dailyMap = new Map()

  for (const msg of messages) {
    const date = new Date(msg.timestamp)
    if (date < startDate) continue

    const dateStr = formatDate(date)
    const modelName = msg.message.model
    // 过滤掉 slash-command
    if (modelName === 'slash-command') continue

    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, new Map())
    }

    const modelMap = dailyMap.get(dateStr)
    modelMap.set(modelName, (modelMap.get(modelName) || 0) + 1)
  }

  // 2. 构建日期序列（填充空日期）
  const dateList = []
  const tempDate = new Date(startDate)
  while (tempDate <= now) {
    dateList.push(formatDate(tempDate))
    tempDate.setDate(tempDate.getDate() + 1)
  }

  // 3. 构建最终数据结构
  const data = dateList.map((dateStr) => {
    const modelMap = dailyMap.get(dateStr) || new Map()
    return {
      date: dateStr,
      models: Array.from(modelMap.entries()).map(([modelName, callCount]) => ({
        modelName,
        callCount,
      })),
    }
  })

  // 4. 计算摘要
  const allModels = new Set()
  let totalCalls = 0
  const modelCalls = new Map()

  for (const day of data) {
    for (const model of day.models) {
      allModels.add(model.modelName)
      totalCalls += model.callCount
      modelCalls.set(
        model.modelName,
        (modelCalls.get(model.modelName) || 0) + model.callCount
      )
    }
  }

  let mostUsedModel = ''
  let maxCalls = 0
  for (const [name, calls] of modelCalls) {
    if (calls > maxCalls) {
      maxCalls = calls
      mostUsedModel = name
    }
  }

  // 5. 找出高峰日期
  const dailyTotals = data.map((d) => ({
    date: d.date,
    calls: d.models.reduce((sum, m) => sum + m.callCount, 0),
  }))
  const peakDate = dailyTotals.sort((a, b) => b.calls - a.calls)[0]?.date || ''

  return {
    timeRange: {
      start: dateList[0],
      end: dateList[dateList.length - 1],
    },
    data,
    summary: {
      totalCalls,
      modelCount: allModels.size,
      mostUsedModel,
      peakDate,
    },
  }
}