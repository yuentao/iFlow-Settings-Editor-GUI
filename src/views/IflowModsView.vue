<template>
  <section class="iflow-mods-view">
    <div class="content-header">
      <h1 class="content-title">{{ $t('iflow.title') }}</h1>
      <p class="content-desc">{{ $t('iflow.description') }}</p>

      <!-- Status Cards -->
      <div class="status-cards" v-if="!isLoading">
        <div class="status-card" :class="{ warning: !iflowStatus.exists }" @click="openDirectory(coreDir)" :title="coreDir">
          <div class="status-card-icon">
            <Success v-if="iflowStatus.exists" size="20" theme="filled" fill="var(--success)" />
            <Caution v-else size="20" theme="filled" fill="var(--warning)" />
          </div>
          <div class="status-card-info">
            <div class="status-card-label">{{ $t('iflow.fileStatus') }}</div>
            <div class="status-card-value">
              <template v-if="iflowStatus.exists">
                {{ $t('iflow.statusFound') }}
                <span v-if="iflowStatus.version" class="status-version">v{{ iflowStatus.version }}</span>
              </template>
              <template v-else>{{ $t('iflow.statusNotFound') }}</template>
            </div>
          </div>
          <FolderSettingsOne size="20" class="status-card-action" />
        </div>
        <div class="status-card" :class="{ clickable: !!iflowDir }" @click="openDirectory(iflowDir)" :title="iflowDir">
          <div class="status-card-icon">
            <SwitchButton v-if="iflowStatus.exists" size="20" :fill="enabledCount > 0 ? 'var(--accent)' : 'var(--text-tertiary)'" />
            <FolderSettingsOne v-else size="20" fill="var(--text-tertiary)" />
          </div>
          <div class="status-card-info">
            <div class="status-card-label">{{ $t('iflow.enabledMods') }}</div>
            <div class="status-card-value" v-if="iflowStatus.exists">{{ enabledCount }} / {{ totalCount }}</div>
            <div class="status-card-value" v-else>{{ $t('iflow.quickOpen.config') }}</div>
          </div>
          <FolderCodeOne size="20" class="status-card-action" />
        </div>
      </div>

      <div v-if="!isLoading && !iflowStatus.exists" class="manual-core-path-panel">
        <div class="manual-core-path-panel__text">
          <div class="manual-core-path-panel__title">{{ $t('iflow.manualPath.action') }}</div>
          <div class="manual-core-path-panel__hint">{{ $t('iflow.manualPath.hint') }}</div>
          <div v-if="iflowStatus.manualPath" class="manual-core-path-panel__path">{{ iflowStatus.manualPath }}</div>
        </div>
        <button class="btn btn-secondary" @click="selectManualCorePath" :disabled="isApplying">
          <FolderOpen size="14" />
          {{ $t('iflow.manualPath.action') }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <!-- Actions Bar -->
      <div class="page-actions" v-if="mods.length > 0">
        <button class="btn btn-primary" @click="openImportDialog" :disabled="isApplying">
          <FolderOpen size="14" />
          {{ $t('iflow.mods.import') }}
        </button>
      </div>

      <!-- Mod List -->
      <GenericList
        :items="filteredMods"
        item-key="id"
        :loading="isLoading"
        :skeleton-count="4"
        :empty-icon="Puzzle"
        :empty-title="$t('iflow.mods.emptyTitle')"
        :empty-description="$t('iflow.mods.emptyDesc')"
        :empty-action-text="$t('iflow.mods.import')"
        :categories="categories"
        :selected-category="selectedCategory"
        :highlight-fn="modHighlightFn"
        @update:selected-category="selectedCategory = $event"
        @item-click="openModDetail"
        @action="openImportDialog">
        <template #item-prefix="{ item: mod }">
          <span v-if="mod.enabled" class="mod-enable-index">{{ enableIndexMap[mod.id] }}</span>
        </template>

        <template #item-icon="{ item: mod }">
          <img v-if="mod.icon && isImageIcon(mod.icon)" :src="mod.icon" class="mod-icon-img" />
          <span v-else-if="mod.icon" class="mod-icon-emoji">{{ mod.icon }}</span>
          <Puzzle v-else size="18" />
        </template>

        <template #item-info="{ item: mod }">
          <div class="mod-name-row">
            <span class="mod-name">{{ mod.name }}</span>
            <span class="mod-type-badge" :class="`type-${mod.type}`">
              {{ $t(`iflow.mods.types.${mod.type}`) }}
            </span>
          </div>
        </template>

        <template #item-actions="{ item: mod }">
          <button v-if="!mod.enabled && !isApplying" class="action-btn action-btn-danger" @click.stop="deleteMod(mod.id)" :title="$t('iflow.mods.delete')" :aria-label="$t('iflow.mods.delete')">
            <Delete size="14" />
          </button>
        </template>

        <template #item-extra="{ item: mod }">
          <ToggleSwitch controlled :model-value="mod.enabled" @update:model-value="toggleMod(mod.id, !mod.enabled)" :disabled="isApplying" :title="mod.enabled ? $t('iflow.mods.disable') : $t('iflow.mods.enable')" />
        </template>
      </GenericList>
    </div>

    <!-- Mod Detail Modal -->
    <div v-if="detailMod" class="dialog-overlay" @click.self="detailMod = null" @keyup.esc="detailMod = null" tabindex="-1" ref="detailOverlayRef">
      <div class="dialog mod-detail-dialog" @click.stop>
        <div class="dialog-header">
          <div class="dialog-title">
            <img v-if="detailMod.icon && isImageIcon(detailMod.icon)" :src="detailMod.icon" class="mod-icon-img" />
            <span v-else-if="detailMod.icon" class="mod-icon-emoji">{{ detailMod.icon }}</span>
            <Puzzle v-else size="18" />
            {{ detailMod.name }}
          </div>
          <button class="side-panel-close" @click="detailMod = null" :aria-label="$t('dialog.close')">
            <svg viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" />
              <line x1="10" y1="0" x2="0" y2="10" />
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <!-- ID -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.id') }}</div>
            <div class="detail-field-value detail-field-value--mono">{{ detailMod.id || '-' }}</div>
          </div>

          <!-- Type -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.type') }}</div>
            <span v-if="detailMod.type" class="mod-type-badge" :class="`type-${detailMod.type}`">
              {{ $t(`iflow.mods.types.${detailMod.type}`) }}
            </span>
            <span v-else class="detail-empty">-</span>
          </div>

          <!-- Version -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.version') }}</div>
            <div class="detail-field-value">{{ detailMod.version ? `v${detailMod.version}` : '-' }}</div>
          </div>

          <!-- Author -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.author') }}</div>
            <div class="detail-field-value">{{ detailMod.author || '-' }}</div>
          </div>

          <!-- Category -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.category') }}</div>
            <div class="detail-field-value">{{ detailMod.category || '-' }}</div>
          </div>

          <!-- Compatibility -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.compatibility') }}</div>
            <div class="detail-field-value detail-field-value--mono">{{ detailMod.iflowVersion ? `iflow ${detailMod.iflowVersionConstraint || '0.5.19+'}` : '-' }}</div>
          </div>

          <!-- License -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.license') }}</div>
            <div class="detail-field-value">{{ detailMod.license || '-' }}</div>
          </div>

          <!-- Homepage -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.homepage') }}</div>
            <div class="detail-field-value">
              <a v-if="detailMod.homepage" class="detail-link" :href="detailMod.homepage" @click.prevent="openExternal(detailMod.homepage)">{{ detailMod.homepage }}</a>
              <span v-else class="detail-empty">-</span>
            </div>
          </div>

          <!-- Repository -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.repository') }}</div>
            <div class="detail-field-value">
              <a v-if="detailMod.repository" class="detail-link" :href="detailMod.repository" @click.prevent="openExternal(detailMod.repository)">{{ detailMod.repository }}</a>
              <span v-else class="detail-empty">-</span>
            </div>
          </div>

          <!-- Tags -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.tags') }}</div>
            <div class="detail-field-value">
              <template v-if="detailMod.tags && detailMod.tags.length">
                <span class="detail-tag" v-for="tag in detailMod.tags" :key="tag">{{ tag }}</span>
              </template>
              <span v-else class="detail-empty">-</span>
            </div>
          </div>

          <!-- Depends On -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.dependsOn') }}</div>
            <div class="detail-field-value">
              <template v-if="detailMod.dependsOn && detailMod.dependsOn.length">
                <span class="detail-tag" v-for="dep in detailMod.dependsOn" :key="dep">{{ dep }}</span>
              </template>
              <span v-else class="detail-empty">-</span>
            </div>
          </div>

          <!-- Include -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.include') }}</div>
            <div class="detail-field-value detail-field-value--mono">
              <template v-if="detailMod.include && detailMod.include.length">
                <div v-for="inc in detailMod.include" :key="inc" class="detail-include-item">
                  {{ inc }}
                  <span v-if="detailMod.includeMap && detailMod.includeMap[inc]" class="detail-include-map">→ {{ detailMod.includeMap[inc] }}</span>
                </div>
              </template>
              <span v-else class="detail-empty">-</span>
            </div>
          </div>

          <!-- Description -->
          <div class="detail-field">
            <div class="detail-field-label">{{ $t('iflow.mods.detail.description') }}</div>
            <div class="detail-field-value">{{ detailMod.description || '-' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Applying overlay -->
    <ApplyingDialog :visible="isApplying" :text="applyingText" :progress="applyingProgress" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Puzzle, FolderOpen, Download, Delete, Success, Caution, SwitchButton, FolderSettingsOne, FolderCodeOne } from '@icon-park/vue-next'
import GenericList from '@/components/GenericList.vue'
import ApplyingDialog from '@/components/ApplyingDialog.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToast()

const emit = defineEmits(['show-input-dialog'])

// State
const mods = ref([])
const iflowStatus = ref({ exists: false, path: '', version: null })
const isLoading = ref(true)
const isApplying = ref(false)
const applyingText = ref('')
const applyingProgress = ref({ current: 0, total: 0, modName: '' })
const selectedCategory = ref('all')
const detailMod = ref(null)
const detailOverlayRef = ref(null)

watch(detailMod, (val) => {
  if (val) {
    nextTick(() => {
      detailOverlayRef.value?.focus()
    })
  }
})

// 进度事件清理函数
let cleanupApplyProgress = null
let cleanupDetectConflictsProgress = null

// Computed
const enabledCount = computed(() => mods.value.filter(m => m.enabled).length)
const totalCount = computed(() => mods.value.length)

const categories = computed(() => {
  const cats = new Set()
  mods.value.forEach(m => {
    if (m.category) cats.add(m.category)
  })
  const result = [{ value: 'all', label: t('iflow.category.all'), count: mods.value.length }]
  cats.forEach(cat => {
    result.push({
      value: cat,
      label: cat,
      count: mods.value.filter(m => m.category === cat).length,
    })
  })
  return result
})

const filteredMods = computed(() => {
  // 列表按安装时间升序排列（仅控制显示顺序，应用顺序见 enableIndexMap）
  const sorted = [...mods.value].sort((a, b) => a.installedAt - b.installedAt)
  if (selectedCategory.value === 'all') return sorted
  return sorted.filter(m => m.category === selectedCategory.value)
})

const modHighlightFn = mod => ({ highlighted: mod.enabled })

const isImageIcon = icon => {
  return /^(https?:\/\/|data:|\/[^/]|[a-zA-Z]:\\)/.test(icon) && /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|#|$)/i.test(icon)
}

const openModDetail = mod => {
  detailMod.value = mod
}

// 目录路径
const coreDir = computed(() => {
  if (iflowStatus.value?.path) {
    // iflow.js 所在目录（即 bundle/ 目录）
    const match = iflowStatus.value.path.match(/^(.+?)[/\\]iflow\.js$/i)
    return match ? match[1] : ''
  }
  return ''
})

const iflowDir = computed(() => {
  return iflowStatus.value?.iflowDir || ''
})

const openDirectory = async dirPath => {
  if (!dirPath) return
  try {
    await window.electronAPI.openPath(dirPath)
  } catch (error) {
    toast.error(String(error?.message || error))
  }
}

const openExternal = async url => {
  try {
    await window.electronAPI.openExternal(url)
  } catch (error) {
    toast.error(String(error?.message || error))
  }
}

const selectManualCorePath = async () => {
  try {
    const dialogResult = await window.electronAPI.iflowOpenCoreFileDialog()
    if (!dialogResult?.success || !dialogResult.filePath) {
      return
    }

    const selectedPath = String(dialogResult.filePath || '')
    const normalizedPath = selectedPath.replace(/\\/g, '/').toLowerCase()
    if (!normalizedPath.endsWith('/iflow.js')) {
      toast.warning(t('iflow.manualPath.invalid'))
      return
    }

    const settingsResult = await window.electronAPI.loadSettings()
    if (!settingsResult?.success || !settingsResult.data) {
      toast.error(settingsResult?.error || 'Failed to load settings')
      return
    }

    const nextSettings = structuredClone(settingsResult.data)
    nextSettings.iflowCorePath = selectedPath

    const saveResult = await window.electronAPI.saveSettings(nextSettings)
    if (!saveResult?.success) {
      toast.error(saveResult?.error || 'Failed to save settings')
      return
    }

    await loadMods()
    toast.success(t('iflow.manualPath.saved'))
  } catch (error) {
    toast.error(String(error?.message || error))
  }
}

// 计算 mod 的应用顺序序号（与后端 applyModsToIflowJs 的应用顺序一致：按 enabledAt 升序）
const enableIndexMap = computed(() => {
  const map = {}
  // 应用顺序：与后端 iflow:enable-mod 中 enabledMods 的排序一致（按启用时间升序）
  const enabled = [...mods.value].filter(m => m.enabled).sort((a, b) => (a.enabledAt || a.installedAt || 0) - (b.enabledAt || b.installedAt || 0))
  enabled.forEach((m, i) => {
    map[m.id] = i + 1
  })
  return map
})

// Actions
const loadMods = async () => {
  isLoading.value = true
  try {
    const [modsResult, statusResult] = await Promise.all([window.electronAPI.iflowListMods(), window.electronAPI.iflowCheckIflowStatus()])
    if (modsResult.success) {
      mods.value = modsResult.mods || []
    }
    if (statusResult.success) {
      iflowStatus.value = statusResult
    }
    // Keep detail modal in sync
    if (detailMod.value) {
      const updated = mods.value.find(m => m.id === detailMod.value.id)
      detailMod.value = updated || null
    }
  } catch (error) {
    console.error('Failed to load mods:', error)
  } finally {
    isLoading.value = false
  }
}

const toggleMod = async (modId, enabled) => {
  const mod = mods.value.find(m => m.id === modId)
  if (!mod) return

  // replace 类型冲突检测：启用 replace 时检查是否有其他已启用的 replace mod
  if (enabled && mod.type === 'replace') {
    const conflicting = mods.value.find(m => m.id !== modId && m.enabled && m.type === 'replace')
    if (conflicting) {
      // 弹出冲突确认对话框，用户确认后自动禁用旧的、启用新的
      const confirmed = await new Promise(resolve => {
        emit('show-input-dialog', {
          type: 'confirm',
          title: 'messages.warning',
          placeholder: 'iflow.mods.replaceConflict',
          callback: resolve,
          isConfirm: true,
          name: mod.name,
          conflict: conflicting.name,
        })
      })
      if (!confirmed) return

      isApplying.value = true
      applyingProgress.value = null
      applyingText.value = t('iflow.applying.swapping')
      try {
        // 先禁用旧的 replace mod
        const disableResult = await window.electronAPI.iflowEnableMod(conflicting.id, false)
        if (!disableResult.success) {
          toast.error(disableResult.error || t('iflow.mods.disableFailed', { name: conflicting.name }))
          return
        }
        // 再启用新的 replace mod
        const enableResult = await window.electronAPI.iflowEnableMod(modId, true)
        if (enableResult.success) {
          await loadMods()
          toast.success(t('iflow.mods.replaceSwapSuccess', { name: mod.name, conflict: conflicting.name }))
        } else if (enableResult.code === 'IFLOW_VERSION_INCOMPATIBLE') {
          await loadMods()
          toast.warning(enableResult.error)
        } else {
          toast.error(enableResult.error)
        }
      } catch (error) {
        toast.error(error?.message || String(error))
      } finally {
        isApplying.value = false
      }
      return
    }
  }

  const confirmed = await new Promise(resolve => {
    emit('show-input-dialog', {
      type: 'confirm',
      title: 'messages.warning',
      placeholder: 'iflow.mods.confirmToggle',
      callback: resolve,
      isConfirm: true,
    })
  })

  if (!confirmed) return

  isApplying.value = true
  applyingProgress.value = null
  applyingText.value = enabled ? t('iflow.applying.enabling') : t('iflow.applying.disabling')
  try {
    const result = await window.electronAPI.iflowEnableMod(modId, enabled)
    if (result?.cancelled) {
      return
    }
    if (result.success) {
      await loadMods()
      toast.success(t(enabled ? 'iflow.mods.enableSuccess' : 'iflow.mods.disableSuccess', { name: mod.name }))
    } else if (result.code === 'IFLOW_VERSION_INCOMPATIBLE') {
      toast.warning(result.error)
    } else {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  } finally {
    isApplying.value = false
  }
}

const deleteMod = async modId => {
  const mod = mods.value.find(m => m.id === modId)
  if (!mod) return

  const confirmed = await new Promise(resolve => {
    emit('show-input-dialog', {
      type: 'confirm',
      title: 'messages.confirmDelete',
      placeholder: 'iflow.mods.confirmDelete',
      callback: resolve,
      isConfirm: true,
      name: mod.name,
    })
  })

  if (!confirmed) return

  isApplying.value = true
  applyingProgress.value = null
  try {
    const result = await window.electronAPI.iflowDeleteMod(modId)
    if (result.success) {
      await loadMods()
      toast.success(t('iflow.mods.deleteSuccess', { name: mod.name }))
    } else {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  } finally {
    isApplying.value = false
  }
}

const exportMod = async modId => {
  const mod = mods.value.find(m => m.id === modId)
  try {
    const result = await window.electronAPI.iflowExportMod(modId)
    if (result.success) {
      toast.success(t('iflow.mods.exportSuccess', { name: mod?.name || modId }))
    } else if (!result.cancelled) {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  }
}

const openImportDialog = async () => {
  try {
    const result = await window.electronAPI.iflowOpenImportDialog()
    if (result.cancelled) return

    const filePath = result.filePath
    const importResult = await window.electronAPI.iflowImportMod(filePath)
    if (importResult.success) {
      await loadMods()
      toast.success(t('iflow.mods.importSuccess', { count: importResult.imported || 1 }))
    } else if (!importResult.cancelled) {
      toast.error(importResult.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  }
}

onMounted(() => {
  loadMods()

  // 初始化进度事件监听
  // Worker 进度中的 phase 标识符到翻译 key 的映射（使用不带占位符的 key）
  const phaseI18nMap = {
    detecting: 'iflow.applying.detectingConflictsProgress',
    comparing: 'iflow.applying.detectingConflictsProgress',
    applying: 'iflow.applying.applyingChanges',
  }

  cleanupApplyProgress = window.electronAPI.onIflowApplyProgress(progress => {
    // Worker 进度的 modName 可能是 phase 标识符（如 'applying'），需要翻译
    const phase = phaseI18nMap[progress.modName]
    if (phase) {
      // Worker 进度是百分比型（0~100），不显示进度条，只更新状态文本
      applyingProgress.value = null
      applyingText.value = t(phase)
    } else {
      // 主进程进度是步骤型（1/3），显示进度条和步骤信息
      applyingProgress.value = progress
      applyingText.value = t('iflow.applying.applyingMod', {
        name: progress.modName,
      })
    }
  })

  cleanupDetectConflictsProgress = window.electronAPI.onIflowDetectConflictsProgress(progress => {
    // 冲突检测是百分比型进度，不显示进度条
    applyingProgress.value = null
    applyingText.value = t('iflow.applying.detectingConflictsProgress')
  })
})

onUnmounted(() => {
  // 清理事件监听
  cleanupApplyProgress?.()
  cleanupDetectConflictsProgress?.()
})
</script>

<style lang="less" scoped>
.iflow-mods-view {
  position: relative;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.manual-core-path-panel {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.manual-core-path-panel__text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manual-core-path-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.manual-core-path-panel__hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.manual-core-path-panel__path {
  font-size: 12px;
  color: var(--text-tertiary);
  word-break: break-all;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  flex: 1;
  min-width: 200px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-elevated, var(--bg-primary));
    border-color: var(--accent);

    .status-card-action {
      color: var(--accent);
      opacity: 1;
    }
  }

  &.warning {
    border-color: var(--warning);
    background: rgba(234, 179, 8, 0.05);
  }
}

.status-card-action {
  margin-left: auto;
  color: var(--text-tertiary);
  opacity: 0.4;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.status-card-icon {
  flex-shrink: 0;
}

.status-card-label {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  margin-bottom: 2px;
}

.status-card-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.status-version {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.page-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.mod-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mod-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.mod-type-badge {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 500;
  background: var(--control-fill);
  color: var(--text-secondary);
  border: 1px solid var(--border);

  &.type-replace {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.2);
  }

  &.type-append {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.2);
  }

  &.type-prepend {
    background: rgba(168, 85, 247, 0.1);
    color: #a855f7;
    border-color: rgba(168, 85, 247, 0.2);
  }

  &.type-patch {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.2);
  }

  &.type-diff {
    background: rgba(236, 72, 153, 0.1);
    color: #ec4899;
    border-color: rgba(236, 72, 153, 0.2);
  }
}

// 启用索引序号（显示在图标左侧）
// 启用索引序号
.mod-enable-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1;
}

.mod-icon-emoji {
  font-size: 20px;
}

.mod-icon-img {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: contain;
  flex-shrink: 0;
}

// Mod Detail Modal
.mod-detail-dialog {
  width: 420px;
  height: 70vh;
  display: flex;
  flex-direction: column;
}

.mod-detail-dialog .dialog-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.detail-empty {
  color: var(--text-tertiary);
  font-style: italic;
}

.mod-detail-dialog .dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--border-light);
  background: var(--control-fill);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.mod-detail-dialog .dialog-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.detail-field {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);

  &:last-of-type {
    border-bottom: none;
  }
}

.detail-field-label {
  flex-shrink: 0;
  width: 56px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.detail-field-value {
  font-size: 13px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;

  &--mono {
    font-family: var(--font-mono);
    font-size: 12px;
  }
}

.detail-link {
  color: var(--accent);
  text-decoration: none;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
}

.detail-tag {
  display: inline-block;
  font-size: var(--font-size-caption);
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--control-fill);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  margin-right: 4px;
  margin-bottom: 4px;
}

.detail-include-item {
  line-height: 1.8;
}

.detail-include-map {
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
}
</style>
