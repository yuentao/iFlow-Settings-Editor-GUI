<template>
  <div class="model-usage-chart">
    <!-- 头部：标题 + 时间范围选择 -->
    <div class="chart-header">
      <div class="chart-title-area">
        <h3 class="chart-title">{{ $t('dashboard.modelUsage') }}</h3>
        <span class="chart-desc">{{ $t('dashboard.modelUsageDescription') }}</span>
      </div>
      <div class="chart-controls">
        <div class="time-range-selector">
          <button
            v-for="opt in timeRangeOptions"
            :key="opt.value"
            class="range-btn"
            :class="{ active: activeDays === opt.value }"
            :disabled="refreshing"
            @click="handleTimeRangeChange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <span>{{ $t('dashboard.loading') }}</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="chart-error">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- 空数据状态 -->
    <div v-else-if="!hasData" class="chart-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
      <span>{{ $t('dashboard.noData') }}</span>
    </div>

    <!-- 图表区域 -->
    <div v-else class="chart-body">
      <div class="apex-chart-wrapper">
        <apexchart
          type="line"
          height="320"
          :options="chartOptions"
          :series="chartSeries"
        />
      </div>

      <!-- 统计摘要 -->
      <div class="stats-summary">
        <div class="summary-item">
          <span class="summary-label">{{ $t('dashboard.totalCalls') }}</span>
          <span class="summary-value">{{ formatNumber(stats!.summary?.totalCalls ?? 0) }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">{{ $t('dashboard.mostUsedModel') }}</span>
          <span class="summary-value summary-model">{{ stats!.summary?.mostUsedModel ?? '-' }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-label">{{ $t('dashboard.peakDate') }}</span>
          <span class="summary-value">{{ formatDateLabel(stats!.summary?.peakDate ?? '') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ModelUsageTrendResponse } from '@/composables/useModelUsageStats'

const { t, locale } = useI18n()

const props = defineProps<{
  stats: ModelUsageTrendResponse | null
  loading: boolean
  error: string | null
  refreshing: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh', days: number): void
  (e: 'rendered'): void
}>()

const activeDays = ref(7)

// 幂等的 rendered 触发器：保证组件挂载后无论数据状态如何（loading/error/empty/有数据）
// 都向父组件发出 rendered 事件，避免 splash 因图表元素未创建而永久卡死
let renderedEmitted = false
function emitRendered() {
  if (renderedEmitted) return
  renderedEmitted = true
  emit('rendered')
}

// 组件挂载后立即通知父组件：不再依赖 <apexchart> 是否被实际渲染
onMounted(() => {
  emitRendered()
})

const timeRangeOptions = computed(() => [
  { label: t('dashboard.timeRange.last7Days'), value: 7 },
  { label: t('dashboard.timeRange.last30Days'), value: 30 },
])

const hasData = computed(() => {
  return props.stats?.data?.some(d => d.models.length > 0) ?? false
})

const chartColors = [
  '#0067C0', '#00B894', '#FD7E14', '#6F42C1',
  '#E17055', '#0984E3', '#00CEC9', '#FDCB6E',
  '#A29BFE', '#636E72', '#D63031', '#55EFC4',
]

const chartSeries = computed(() => {
  if (!props.stats || !hasData.value) return []

  const allModelNames = new Set<string>()
  for (const day of props.stats.data) {
    for (const model of day.models) {
      allModelNames.add(model.modelName)
    }
  }

  return Array.from(allModelNames).map((modelName, idx) => ({
    name: modelName,
    type: 'line' as const,
    data: props.stats!.data.map(day => {
      const m = day.models.find(m => m.modelName === modelName)
      return m ? m.callCount : 0
    }),
    color: chartColors[idx % chartColors.length],
  }))
})

const chartOptions = computed(() => {
  const dates = props.stats?.data.map(d => d.date) || []

  return {
    chart: {
      type: 'line' as const,
      height: 320,
      parentHeightOffset: 0,
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeout' as const,
        speed: 500,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 150 },
      },
      events: {
        mounted: () => { emitRendered() },
      },
      zoom: { enabled: false },
      foreColor: 'var(--text-secondary)',
      fontFamily: 'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
    },
    stroke: {
      width: 2,
      curve: 'smooth' as const,
    },
    fill: {
      opacity: 1,
      type: 'solid' as const,
    },
    markers: {
      size: 1,
      strokeWidth: 0,
      hover: { size: 5 },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'dark' as const,
      x: {
        format: 'yyyy-MM-dd',
      },
    },
    legend: {
      position: 'bottom' as const,
      horizontalAlign: 'center' as const,
      fontSize: '12px',
      itemMargin: { horizontal: 12, vertical: 4 },
      onItemClick: { toggleDataSeries: true },
      labels: { colors: 'var(--text-secondary)' },
    },
    grid: {
      borderColor: 'var(--border-light)',
      strokeDashArray: 3,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 16 },
    },
    xaxis: {
      categories: dates,
      type: 'datetime' as const,
      labels: {
        formatter: (val: string) => {
          const d = new Date(val)
          return d.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
            month: '2-digit',
            day: '2-digit',
          })
        },
        style: { fontSize: '11px' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: { show: true, width: 1 },
    },
    yaxis: {
      title: {
        text: t('dashboard.callsUnit'),
        style: { fontSize: '11px', fontWeight: 500 },
      },
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (val: number) => Math.round(val).toString(),
        style: { fontSize: '11px' },
      },
    },
    colors: chartColors,
    dataLabels: { enabled: false },
    states: {
      hover: { filter: { type: 'darken' as const, value: 0.1 } },
      active: { filter: { type: 'none' as const } },
    },
    noData: {
      text: t('dashboard.noData'),
      align: 'center' as const,
      verticalAlign: 'middle' as const,
      style: { fontSize: '14px', color: 'var(--text-tertiary)' },
    },
  } as any
})

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
  })
}

function handleTimeRangeChange(days: number) {
  activeDays.value = days
  emit('refresh', days)
}
</script>

<script lang="ts">
import { defineAsyncComponent } from 'vue'

export default {
  components: {
    apexchart: defineAsyncComponent(() => import('vue3-apexcharts')),
  },
}
</script>

<style lang="less" scoped>
.model-usage-chart {
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  margin-top: var(--space-lg);
  animation: fadeInUp 0.3s ease backwards;
}

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.chart-title-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.chart-desc {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.time-range-selector {
  display: flex;
  background: var(--control-fill);
  border-radius: var(--radius-md);
  padding: 2px;
  gap: 2px;
}

.range-btn {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
    background: var(--control-fill-hover);
  }

  &.active {
    background: var(--accent);
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: var(--space-md);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-light);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.chart-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 40px 20px;
  color: var(--danger);
  font-size: var(--font-size-sm);
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: var(--space-md);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);

  .empty-icon {
    opacity: 0.4;
  }
}

.chart-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.apex-chart-wrapper {
  width: 100%;
  min-height: 320px;
}

.stats-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.summary-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.summary-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.summary-model {
  color: var(--accent);
}

.summary-divider {
  width: 1px;
  height: 32px;
  background: var(--border-light);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>