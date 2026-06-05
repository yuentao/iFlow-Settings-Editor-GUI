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
                <span class="connectivity-label" v-if="getConnectivityLevel(profile.name) !== 'checking'">
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
                {{ getExpiryText(profile.name) }}
              </div>
            </div>
          </div>
          <div class="profile-status" v-if="currentProfile === profile.name">
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
})

onUnmounted(() => {
  stopPolling()
})

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

        .profile-actions,
        .drag-handle {
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
        right: 6px;
        margin: 0;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
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
  transition: all 0.15s ease;

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
