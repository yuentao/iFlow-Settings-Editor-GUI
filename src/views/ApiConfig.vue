<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('api.title') }}</h1>
      <p class="content-desc">{{ $t('api.description') }}</p>
    </div>
    <div class="form-group">
      <div class="page-actions">
        <button class="btn btn-primary" @click="$emit('create-profile')">
          <Plus size="14" />
          {{ $t('api.newProfile') }}
        </button>
      </div>
    </div>
    <div class="card" v-if="profiles.length > 0">
      <VueDraggable
        v-model="localProfiles"
        :class="['profile-list', `layout-${layoutMode}`]"
        handle=".drag-handle"
        :animation="250"
        ghostClass="sortable-ghost"
        :forceFallback="layoutMode === 'grid'"
        @start="onDragStart"
        @end="onDragEnd"
      >
        <div
          v-for="(profile, index) in localProfiles"
          :key="profile.name"
          class="profile-item"
          :class="{
            active: currentProfile === profile.name,
            expired: isProfileExpired(profile.name),
          }"
          :title="isProfileExpired(profile.name) ? t('api.expiry.cannotSwitch') : ''"
          @click="isProfileExpired(profile.name) ? null : $emit('select-profile', profile.name)"
        >
          <div class="drag-handle" :title="$t('api.dragToSort')">⋮⋮</div>
          <div class="profile-icon" :style="getProfileIconStyle(profile.name)">
            <span class="profile-icon-text">{{ getProfileInitial(profile.name) }}</span>
          </div>
          <div class="profile-info">
            <div class="profile-name-row">
              <div class="profile-name">{{ profile.name }}</div>
              <div
                class="connectivity-indicator"
                :class="'connectivity-' + getConnectivityLevel(profile.name)"
                :title="getConnectivityTooltip(profile.name)"
              >
                <span
                  class="connectivity-dot"
                  :class="{ animated: getConnectivityLevel(profile.name) === 'checking' }"
                ></span>
                <span class="connectivity-label" v-if="getConnectivityLevel(profile.name) !== 'checking' && layoutMode !== 'grid'">
                  {{ getConnectivityLabel(profile.name) }}
                </span>
              </div>
            </div>
            <div class="profile-model-row">
              <div
                class="profile-model"
                :class="{ active: currentProfile === profile.name }"
                v-if="getProfileModel(profile.name)"
              >
                {{ getProfileModel(profile.name) }}
              </div>
              <div class="profile-expiry" v-if="getExpiryText(profile.name)" :class="getExpiryClass(profile.name)">
                <span v-if="layoutMode !== 'grid'">{{ getExpiryText(profile.name) }}</span>
              </div>
              <!-- 网格布局：简洁版，仅显示余额/状态 -->
              <span
                v-if="layoutMode === 'grid' && getBalanceSimple(profile.name)"
                class="balance-badge"
                :class="getBalanceClass(profile.name)"
                :title="getBalanceTooltip(profile.name)"
              >
                {{ getBalanceSimple(profile.name) }}
              </span>
              <!-- 列表布局：直接显示 title 明细文本 -->
              <span
                v-if="layoutMode !== 'grid' && getBalanceTooltip(profile.name)"
                class="balance-detail-text"
                :class="getBalanceClass(profile.name)"
                :title="getBalanceTooltip(profile.name)"
              >
                {{ getBalanceTooltip(profile.name) }}
              </span>
            </div>
          </div>
          <div class="profile-status" v-if="currentProfile === profile.name && layoutMode !== 'grid'">
            <span class="status-badge">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,8 6,11 13,4"></polyline>
              </svg>
              {{ $t('api.inUse') }}
            </span>
          </div>
          <div class="profile-actions">
            <button class="action-btn" @click.stop="$emit('edit-profile', profile.name)" :title="$t('api.edit')">
              <Edit size="14" />
            </button>
            <button
              class="action-btn"
              @click.stop="$emit('duplicate-profile', profile.name)"
              :title="$t('api.duplicate')"
            >
              <Copy size="14" />
            </button>
            <button
              class="action-btn action-btn-danger"
              v-if="index !== 0 && currentProfile !== profile.name"
              @click.stop="$emit('delete-profile', profile.name)"
              :title="$t('api.delete')"
            >
              <Delete size="14" />
            </button>
          </div>
        </div>
      </VueDraggable>
    </div>
    <EmptyState
      v-else
      :icon="Exchange"
      :title="$t('api.noProfiles')"
      :description="$t('api.addFirstProfile')"
      :actionText="$t('api.newProfile')"
      embedded
      @action="$emit('create-profile')"
    />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Edit, Delete, Exchange, Copy } from '@icon-park/vue-next'
import EmptyState from '@/components/EmptyState.vue'
import { VueDraggable } from 'vue-draggable-plus'
import moment from 'moment'

const { t } = useI18n()

const props = defineProps({
  profiles: {
    type: Array,
    default: () => [],
  },
  currentProfile: {
    type: String,
    default: 'default',
  },
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits([
  'create-profile',
  'select-profile',
  'edit-profile',
  'duplicate-profile',
  'delete-profile',
  'reorder-profiles',
])

// --- 布局模式 ---
const layoutMode = computed(() => props.settings?.apiConfigLayout || 'list')

// Local copy of profiles for VueDraggable v-model sync
const localProfiles = ref([...props.profiles])
watch(
  () => props.profiles,
  val => {
    localProfiles.value = [...val]
  },
  { deep: true },
)
watch(
  localProfiles,
  val => {
    // Emit reorder only when order actually differs from prop
    const sameOrder = val.length === props.profiles.length && val.every((p, i) => p.name === props.profiles[i].name)
    if (!sameOrder) {
      emit('reorder-profiles', [...val])
    }
  },
  { deep: true },
)

let isDragging = false
const onDragStart = () => {
  isDragging = true
  document.body.style.userSelect = 'none'
}
const onDragEnd = () => {
  isDragging = false
  document.body.style.userSelect = ''
}

// --- 连通性监控 ---
const connectivityMap = reactive({}) // { profileName: { level: 'excellent'|'good'|'slow'|'unreachable'|'checking', latency: number } }
let connectivityTimer = null
let pollingCancelled = false
const PING_TIMEOUT_THRESHOLD = 2000 // >2s 视为不可达

// 从设置中读取连通性检测间隔（秒），默认 30 秒
const pollIntervalMs = computed(() => (props.settings?.connectivityPollInterval ?? 30) * 1000)

function getConnectivityLevel(name) {
  return connectivityMap[name]?.level || 'checking'
}

function getConnectivityTooltip(name) {
  const info = connectivityMap[name]
  if (!info || info.level === 'checking') return t('api.connectivity.checking')
  const latencyStr = info.latency >= 0 ? t('api.connectivity.latency', { ms: info.latency }) : ''
  const levelStr = t('api.connectivity.' + info.level)
  return latencyStr ? `${levelStr} (${latencyStr})` : levelStr
}

function getConnectivityLabel(name) {
  const info = connectivityMap[name]
  if (!info || info.level === 'checking') return ''
  if (info.level === 'unreachable') return t('api.connectivity.unreachable')
  return t('api.connectivity.latency', { ms: info.latency })
}

function computeLevel(latency) {
  if (latency < 0) return 'unreachable'
  if (latency < 200) return 'excellent'
  if (latency < 500) return 'good'
  if (latency <= PING_TIMEOUT_THRESHOLD) return 'slow'
  return 'unreachable'
}

async function pingProfile(name) {
  const url = getProfileUrl(name)
  if (!url) {
    connectivityMap[name] = { level: 'unreachable', latency: -1 }
    return
  }
  try {
    connectivityMap[name] = { ...connectivityMap[name], level: 'checking' }
    const result = await window.electronAPI.pingApiProfile(url)
    // 组件已卸载或轮询已停止，不再更新响应式数据
    if (pollingCancelled) return
    if (result.success) {
      connectivityMap[name] = { level: computeLevel(result.latency), latency: result.latency }
    } else {
      connectivityMap[name] = { level: 'unreachable', latency: -1 }
    }
  } catch {
    if (pollingCancelled) return
    connectivityMap[name] = { level: 'unreachable', latency: -1 }
  }
}

async function pingAll() {
  if (pollingCancelled) return
  await Promise.all(props.profiles.filter(p => !isProfileExpired(p.name)).map(p => pingProfile(p.name)))
}

function startPolling() {
  stopPolling()
  pollingCancelled = false
  pingAll()
  connectivityTimer = setInterval(pingAll, pollIntervalMs.value)
}

function stopPolling() {
  pollingCancelled = true
  if (connectivityTimer) {
    clearInterval(connectivityTimer)
    connectivityTimer = null
  }
}

// 记录上一次的配置名集合，用于判断是否只是顺序变化
let prevProfileNames = new Set()

// profiles 变化时重新初始化连通性状态
watch(
  () => props.profiles,
  newProfiles => {
    const newNames = new Set(newProfiles.map(p => p.name))

    // 判断是否只是顺序变化（集合相同但顺序不同）
    const isOnlyReorder =
      prevProfileNames.size === newNames.size && [...prevProfileNames].every(name => newNames.has(name))

    // 更新记录
    prevProfileNames = newNames

    // 清理已不存在的 profile 的连通性数据
    for (const key of Object.keys(connectivityMap)) {
      if (!newNames.has(key)) delete connectivityMap[key]
    }

    // 仅当有新增配置时才触发连通性检测（跳过纯顺序变化）
    if (!isOnlyReorder) {
      pingAll()
    }
  },
  { deep: true },
)

// 连通性检测间隔变化时重启轮询
watch(pollIntervalMs, () => {
  if (connectivityTimer) {
    startPolling()
  }
})

onMounted(() => {
  // 初始化配置名集合
  prevProfileNames = new Set(props.profiles.map(p => p.name))
  startPolling()
  startBalancePolling()
})

onUnmounted(() => {
  stopPolling()
  stopBalancePolling()
})

// --- 余额查询 ---
const balanceMap = reactive({})
// value: { loading: boolean, result: TokenBalanceResult | null, lastError: string | null }

let balanceTimer = null
let balancePollCancelled = false

const balancePollIntervalMs = computed(() => {
  const minutes = props.settings?.balanceRefreshInterval ?? 5
  return Math.max(1, minutes) * 60 * 1000
})

async function fetchBalance(name) {
  const profile = props.settings.apiProfiles?.[name]
  console.log(`[余额] fetchBalance(${name})`, {
    hasBaseUrl: !!profile?.baseUrl,
    hasApiKey: !!profile?.apiKey,
    balanceProvider: profile?.balanceProvider,
    expired: isProfileExpired(name),
    disabled: profile?.balanceProvider === 'disabled',
  })
  if (!profile?.baseUrl || !profile?.apiKey) return
  if (isProfileExpired(name)) return
  if (profile.balanceProvider === 'disabled') return

  balanceMap[name] = { ...balanceMap[name], loading: true }

  try {
    const params = {
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      provider: profile.balanceProvider || 'auto',
      detectionRules: props.settings?.balanceProviderRules ?? [],
    }
    console.log(`[余额] 发起查询:`, { name, baseUrl: params.baseUrl, provider: params.provider, apiKeyMask: params.apiKey ? params.apiKey.substring(0, 8) + '...' : '', rulesCount: (params.detectionRules || []).length })
    // JSON round-trip 剥离 Vue reactive proxy，确保 contextBridge 可序列化
    const safeParams = JSON.parse(JSON.stringify(params))
    const ipcResult = await window.electronAPI.fetchTokenBalance(safeParams)
    const result = ipcResult.success ? ipcResult.data : null
    console.log(`[余额] 查询结果:`, {
      name,
      success: result?.success,
      provider: result?.provider,
      status: result?.status,
      remaining: result?.remaining,
      unit: result?.unit,
      used: result?.used,
      total: result?.total,
      error: result?.error || ipcResult.error,
      raw: result?.raw,
    })
    if (balancePollCancelled) return
    balanceMap[name] = {
      loading: false,
      result,
      lastError: result?.success ? null : (result?.error || ipcResult.error || null),
    }
  } catch (e) {
    console.log(`[余额] 查询异常:`, {
      name,
      msg: e?.message || String(e),
      stack: e?.stack?.substring(0, 300),
    })
    if (balancePollCancelled) return
    balanceMap[name] = { loading: false, result: null, lastError: 'api.balance.fetchFailed' }
  }
}

async function fetchAllBalances() {
  if (balancePollCancelled) return
  // 仅查询当前使用中的 API 配置
  const currentName = props.currentProfile
  if (!currentName) return
  const prof = props.settings.apiProfiles?.[currentName]
  const valid = prof?.baseUrl && prof?.apiKey && !isProfileExpired(currentName) && prof.balanceProvider !== 'disabled'
  console.log(`[余额] fetchAllBalances: current=${currentName}, valid=${valid}`)
  if (valid) {
    await fetchBalance(currentName)
  }
}

function startBalancePolling() {
  stopBalancePolling()
  balancePollCancelled = false
  // 首屏延迟 2s 再查询
  setTimeout(() => { if (!balancePollCancelled) fetchAllBalances() }, 2000)
  balanceTimer = setInterval(() => { if (!balancePollCancelled) fetchAllBalances() }, balancePollIntervalMs.value)
}

function stopBalancePolling() {
  balancePollCancelled = true
  if (balanceTimer) {
    clearInterval(balanceTimer)
    balanceTimer = null
  }
}

// 余额检测间隔变化时重启轮询
watch(balancePollIntervalMs, () => {
  if (balanceTimer) {
    startBalancePolling()
  }
})

// Profile 列表变化时重新查询余额
watch(
  () => props.profiles,
  (newProfiles) => {
    const newNames = new Set(newProfiles.map(p => p.name))
    for (const key of Object.keys(balanceMap)) {
      if (!newNames.has(key)) delete balanceMap[key]
    }
    // 非纯顺序变化才触发重新查询
    const isOnlyReorder = prevProfileNames.size === newNames.size && [...prevProfileNames].every(n => newNames.has(n))
    if (!isOnlyReorder) {
      fetchAllBalances()
    }
  },
  { deep: true },
)

// Profile 数据变化时（如 balanceProvider 修改）重新触发余额查询
watch(
  () => props.settings?.apiProfiles,
  (newVal, oldVal) => {
    console.log(`[余额] apiProfiles watch fired: new=${Object.keys(newVal || {}).length}, old=${Object.keys(oldVal || {}).length}`)
    fetchAllBalances()
  },
  { deep: true },
)

// 供应商检测规则变化时重新查询余额（可能影响 auto 检测结果）
watch(
  () => props.settings?.balanceProviderRules,
  (newVal, oldVal) => {
    const newLen = Array.isArray(newVal) ? newVal.length : 0
    const oldLen = Array.isArray(oldVal) ? oldVal.length : 0
    console.log(`[余额] balanceProviderRules watch fired: new=${newLen}, old=${oldLen}`)
    fetchAllBalances()
  },
  { deep: true },
)

function formatTokenCount(n) {
  if (n == null || isNaN(n)) return ''
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function getBalanceText(name) {
  const info = balanceMap[name]
  if (!info) return ''
  if (info.loading) return t('api.balance.loading')
  if (!info.result) return ''
  if (!info.result.success) return ''
  const r = info.result
  if (r.status === 'unlimited') {
    if (r.used != null) {
      return `${t('api.balance.unlimited')} · ↑${formatTokenCount(r.used)}`
    }
    return t('api.balance.unlimited')
  }
  if (r.remaining !== undefined && r.remaining >= 0) {
    const bal = r.unit
      ? r.remaining < 0.01 ? r.remaining.toFixed(4) : r.remaining.toFixed(2)
      : formatTokenCount(r.remaining)
    const displayRemaining = r.unit ? `${r.unit}${bal}` : bal
    if (r.used != null) {
      return `${displayRemaining} · ↑${formatTokenCount(r.used)}`
    }
    return displayRemaining
  }
  if (r.status === 'ok') return t('api.balance.available')
  return ''
}

function getBalanceClass(name) {
  const info = balanceMap[name]
  if (!info || !info.result || !info.result.success) return 'balance-error'
  const r = info.result
  if (r.status === 'unlimited') return 'balance-unlimited'
  if (r.status === 'expired') return 'balance-low'
  // 余额低于 10% 视为低余额
  if (r.total && r.total > 0 && r.remaining !== undefined && r.remaining / r.total < 0.1) {
    return 'balance-low'
  }
  return 'balance-ok'
}

function getBalanceTooltip(name) {
  const info = balanceMap[name]
  if (!info || !info.result) return ''
  const r = info.result
  const parts = []
  if (r.total !== undefined) {
    const val = r.unit ? r.unit + r.total.toFixed(2) : formatTokenCount(r.total)
    parts.push(`${t('api.balance.total')}: ${val}`)
  }
  if (r.used !== undefined) {
    const val = r.unit ? r.unit + r.used.toFixed(2) : formatTokenCount(r.used)
    parts.push(`${t('api.balance.used')}: ${val}`)
  }
  if (r.remaining !== undefined) {
    const val = r.unit ? r.unit + r.remaining.toFixed(2) : formatTokenCount(r.remaining)
    parts.push(`${t('api.balance.remaining')}: ${val}`)
  }
  if (r.unlimitedQuota) parts.push(t('api.balance.unlimited'))
  if (r.isAvailable === false) parts.push(t('api.balance.notAvailable'))
  return parts.join(' | ')
}

/** 网格布局：简洁版，仅显示余额状态/金额 */
function getBalanceSimple(name) {
  const info = balanceMap[name]
  if (!info) return ''
  if (info.loading) return t('api.balance.loading')
  if (!info.result) return ''
  if (!info.result.success) return ''
  const r = info.result
  if (r.status === 'unlimited') return t('api.balance.unlimited')
  if (r.remaining !== undefined && r.remaining >= 0) {
    if (r.unit) {
      return r.remaining < 0.01 ? `${r.unit}${r.remaining.toFixed(4)}` : `${r.unit}${r.remaining.toFixed(2)}`
    }
    return formatTokenCount(r.remaining)
  }
  if (r.status === 'ok') return t('api.balance.available')
  return ''
}

const profileColors = [
  'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
  'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
]

const getProfileInitial = name => (name ? name.charAt(0).toUpperCase() : '?')

const getProfileUrl = name => {
  if (!props.settings.apiProfiles || !props.settings.apiProfiles[name]) {
    return ''
  }
  const profile = props.settings.apiProfiles[name]
  return profile.baseUrl || ''
}

const getProfileModel = name => {
  if (!props.settings.apiProfiles || !props.settings.apiProfiles[name]) {
    return ''
  }
  const profile = props.settings.apiProfiles[name]
  return profile.modelName || ''
}

const getProfileIconStyle = name => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % profileColors.length
  return { background: profileColors[index] }
}

// --- 过期倒计时 ---
function getProfileExpiryDays(name) {
  if (!props.settings.apiProfiles || !props.settings.apiProfiles[name]) return 0
  return props.settings.apiProfiles[name].expiryDays || 0
}

function getProfileExpiryStartDate(name) {
  if (!props.settings.apiProfiles || !props.settings.apiProfiles[name]) return null
  const profile = props.settings.apiProfiles[name]
  return profile.expiryStartDate || null
}

function getExpiryDate(name) {
  const days = getProfileExpiryDays(name)
  if (!days) return null
  const startDate = getProfileExpiryStartDate(name)
  if (!startDate) return null
  return moment(startDate).add(days, 'days')
}

function getExpiryText(name) {
  const expiryDate = getExpiryDate(name)
  if (!expiryDate) return ''
  const now = moment()

  // Check expired first — moment.diff truncates toward zero, so a profile that
  // expired just hours ago would show diffDays === 0 and incorrectly fall into
  // the "hours left" branch.
  if (now.isAfter(expiryDate)) {
    return t('api.expiry.expired')
  }

  const diffDays = expiryDate.diff(now, 'days')
  if (diffDays === 0) {
    const diffHours = expiryDate.diff(now, 'hours')
    return t('api.expiry.hoursLeft', { hours: Math.max(diffHours, 1) })
  }
  if (diffDays <= 30) {
    return t('api.expiry.daysLeft', { days: diffDays })
  }
  const diffMonths = expiryDate.diff(now, 'months')
  if (diffMonths <= 11) {
    return t('api.expiry.monthsLeft', { months: diffMonths })
  }
  const diffYears = expiryDate.diff(now, 'years')
  return t('api.expiry.yearsLeft', { years: diffYears })
}

function isProfileExpired(name) {
  const expiryDate = getExpiryDate(name)
  if (!expiryDate) return false
  return moment().isAfter(expiryDate)
}

function getExpiryClass(name) {
  const expiryDate = getExpiryDate(name)
  if (!expiryDate) return ''
  const now = moment()

  // Must check expired first — same truncation issue as getExpiryText
  if (now.isAfter(expiryDate)) return 'expiry-expired'

  const daysLeft = expiryDate.diff(now, 'days')
  if (daysLeft <= 3) return 'expiry-urgent'
  if (daysLeft <= 7) return 'expiry-warning'
  return 'expiry-normal'
}
</script>

<style lang="less" scoped>
.page-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

// Windows 11 Style Profile List - Fluent Design
.profile-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  // 网格布局模式
  &.layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;

    .profile-item {
      flex-direction: row;
      align-items: center;
      padding: 12px 14px;
      gap: 0;
      position: relative;
      overflow: hidden;

      // 悬浮遮罩层
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--bg-elevated);
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 1;
        pointer-events: none;
      }

      &:hover {
        transform: scale(1.02);

        &::before {
          opacity: 0.9;
          pointer-events: auto;
        }

        .profile-actions {
          opacity: 1;
          pointer-events: auto;
        }
      }

      // 内容层（不受遮罩影响）
      .profile-icon,
      .profile-info,
      .profile-status {
        position: relative;
        z-index: 0;
      }

      .drag-handle {
        position: absolute;
        top: 6px;
        left: 6px;
        margin: 0;
        z-index: 3;
      }

      .profile-icon {
        width: 36px;
        height: 36px;
        flex-shrink: 0;

        .profile-icon-text {
          font-size: 14px;
        }
      }

      .profile-info {
        margin-left: 12px;
        flex: 1;
        min-width: 0;
      }

      .profile-name-row {
        flex-wrap: nowrap;
        gap: 8px;
      }

      .profile-model-row {
        flex-wrap: nowrap;
        margin-top: 4px;
      }

      .profile-status {
        margin-left: 10px;
        flex-shrink: 0;
      }

      // 操作按钮在遮罩层中绝对定位，不挤压内容
      .profile-actions {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        margin: 0;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
        z-index: 3;
        display: flex;
        gap: 4px;
        background: var(--bg-elevated);
        padding: 4px 8px;
        border-radius: var(--radius);
        box-shadow: var(--shadow-sm);
      }

      // 网格模式下过期标签简化为纯圆点
      .profile-expiry {
        padding: 0;
        width: 8px;
        height: 8px;
        min-width: 8px;
        border-radius: 50%;
        font-size: 0;
        gap: 0;
        border: none;
        background: transparent;

        &::before {
          width: 8px;
          height: 8px;
          margin: 0;
        }
      }

      // 网格模式下连通性指示器更紧凑
      .connectivity-indicator {
        margin-left: 6px;
        gap: 0;
      }

      .connectivity-dot {
        width: 6px;
        height: 6px;
      }
    }
  }
}

.profile-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;
  animation: fadeIn 0.3s ease backwards;

  &:nth-child(1) {
    animation-delay: 0.02s;
  }
  &:nth-child(2) {
    animation-delay: 0.04s;
  }
  &:nth-child(3) {
    animation-delay: 0.06s;
  }
  &:nth-child(4) {
    animation-delay: 0.08s;
  }
  &:nth-child(5) {
    animation-delay: 0.1s;
  }

  &:hover {
    background: var(--control-fill);
    border-color: var(--border);
    transform: translateX(2px);
  }

  &.active {
    background: var(--accent-light);
    border-color: var(--accent);
    box-shadow: var(--shadow-sm);
  }
}

// SortableJS ghost placeholder — the animated "gap" during drag
.sortable-ghost {
  opacity: 0.4;
  background: var(--accent-light) !important;
  border: 2px dashed var(--accent) !important;
  box-shadow: var(--shadow-sm);
  transform: scale(1.02);
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  margin-right: 4px;
  color: var(--text-tertiary);
  cursor: grab;
  border-radius: var(--radius);
  opacity: 0;
  transition: all 0.15s ease;

  .profile-item:hover & {
    opacity: 1;
  }

  &:hover {
    color: var(--text-secondary);
    background: var(--control-fill);
  }

  &:active {
    cursor: grabbing;
  }
}

.profile-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-icon-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.profile-info {
  flex: 1;
  min-width: 0;
  margin-left: 12px;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.profile-model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.profile-model {
  font-size: 11px;
  color: var(--text-secondary);
  display: inline-block;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: var(--radius);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.profile-model.active {
  color: var(--accent);
  background: var(--accent-light);
}

.profile-status {
  margin-left: 10px;
}

// Connectivity indicator
.connectivity-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
  flex-shrink: 0;
}

.connectivity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
}

.connectivity-dot.animated {
  animation: breathing 1.5s ease-in-out infinite;
}

@keyframes breathing {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

.connectivity-label {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

// 4 color levels
.connectivity-excellent .connectivity-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.connectivity-good .connectivity-dot {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
}

.connectivity-slow .connectivity-dot {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
}

.connectivity-unreachable .connectivity-dot {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.connectivity-checking .connectivity-dot {
  background: var(--text-tertiary);
  animation: connectivity-pulse 1.2s ease-in-out infinite;
}

@keyframes connectivity-pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

// Balance badge
.balance-badge {
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  flex-shrink: 0;
  cursor: default;

  &.balance-ok {
    color: var(--success);
    background: color-mix(in srgb, var(--success) 12%, transparent);
  }

  &.balance-low {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
  }

  &.balance-unlimited {
    color: var(--info);
    background: color-mix(in srgb, var(--info) 12%, transparent);
  }

  &.balance-error {
    color: var(--text-tertiary);
  }
}

/* 列表布局余额明细文本：默认灰色（过期/错误），可用时绿色 */
.balance-detail-text {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

.balance-detail-text.balance-ok {
  color: var(--success);
}

// Disabled / expired state — only block profile selection, keep actions/sort active
.profile-item.expired {
  cursor: not-allowed;

  // Hide connectivity dot for expired profiles
  .connectivity-indicator {
    display: none;
  }

  // Apply disabled visual only to non-action parts
  > :not(.drag-handle):not(.profile-actions) {
    opacity: 0.55;
    filter: grayscale(0.6);
    pointer-events: none;
  }

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border);
    transform: none;
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius);
  font-size: 11px;
  font-weight: 500;

  svg {
    width: 10px;
    height: 10px;
  }
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;

  .profile-item:hover &,
  .profile-item.active & {
    opacity: 1;
  }
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
  align-self: flex-end;
}

// Expiry countdown badge
.profile-expiry {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }
}

.expiry-normal {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);

  &::before {
    background: #10b981;
  }
}

.expiry-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);

  &::before {
    background: #f59e0b;
  }
}

.expiry-urgent {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);

  &::before {
    background: #ef4444;
  }
}

.expiry-expired {
  background: rgba(128, 128, 128, 0.12);
  color: var(--text-tertiary);
  border: 1px solid rgba(128, 128, 128, 0.2);
  font-weight: 500;

  &::before {
    background: var(--text-tertiary);
  }
}
</style>
