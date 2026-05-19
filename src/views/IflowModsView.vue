<template>
  <section class="iflow-mods-view">
    <div class="content-header">
      <h1 class="content-title">{{ $t('iflow.title') }}</h1>
      <p class="content-desc">{{ $t('iflow.description') }}</p>

      <!-- Status Cards -->
      <div class="status-cards" v-if="!isLoading">
        <div class="status-card" :class="{ warning: !iflowStatus.exists }">
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
        </div>
        <div class="status-card" v-if="iflowStatus.exists">
          <div class="status-card-icon">
            <SwitchButton size="20" :fill="enabledCount > 0 ? 'var(--accent)' : 'var(--text-tertiary)'" />
          </div>
          <div class="status-card-info">
            <div class="status-card-label">{{ $t('iflow.enabledMods') }}</div>
            <div class="status-card-value">{{ enabledCount }} / {{ totalCount }}</div>
          </div>
        </div>
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
        @action="openImportDialog"
      >
        <template #item-icon="{ item: mod }">
          <span v-if="mod.enabled" class="mod-enable-index">{{ enableIndexMap[mod.id] }}</span>
          <span v-else-if="mod.icon" class="mod-icon-emoji">{{ mod.icon }}</span>
          <Puzzle v-else size="18" />
        </template>

        <template #item-info="{ item: mod }">
          <div class="mod-name-row">
            <span class="mod-name">{{ mod.name }}</span>
            <span class="mod-version">v{{ mod.version }}</span>
            <span class="mod-type-badge" :class="`type-${mod.type}`">
              {{ $t(`iflow.mods.types.${mod.type}`) }}
            </span>
          </div>
          <div class="mod-desc" v-if="mod.description">{{ mod.description }}</div>
          <div class="mod-meta">
            <span class="mod-author" v-if="mod.author">{{ mod.author }}</span>
            <span class="mod-category" v-if="mod.category">{{ mod.category }}</span>
            <span class="mod-compat" v-if="mod.iflowVersion" :title="`iflow ${mod.iflowVersionConstraint || '0.5.19+'}`">
              iflow {{ mod.iflowVersionConstraint || '0.5.19+' }}
            </span>
          </div>
        </template>

        <template #item-actions="{ item: mod }">
          <template v-if="!mod.enabled && !isApplying">
            <button class="action-btn" @click.stop="exportMod(mod.id)" :title="$t('iflow.mods.export')">
              <Download size="14" />
            </button>
            <button class="action-btn action-btn-danger" @click.stop="deleteMod(mod.id)" :title="$t('iflow.mods.delete')">
              <Delete size="14" />
            </button>
          </template>
        </template>

        <template #item-extra="{ item: mod }">
          <label class="toggle-switch" :title="mod.enabled ? $t('iflow.mods.disable') : $t('iflow.mods.enable')">
            <input
              type="checkbox"
              :checked="mod.enabled"
              @click.prevent="toggleMod(mod.id, !mod.enabled)"
              :disabled="isApplying"
            />
            <span class="toggle-slider"></span>
          </label>
        </template>
      </GenericList>
    </div>

    <!-- Applying overlay -->
    <ApplyingDialog :visible="isApplying" :text="applyingText" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Puzzle, FolderOpen, Download, Delete, Success, Caution, SwitchButton } from '@icon-park/vue-next'
import GenericList from '@/components/GenericList.vue'
import ApplyingDialog from '@/components/ApplyingDialog.vue'
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
const selectedCategory = ref('all')

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
  const sorted = [...mods.value].sort((a, b) => (a.installedAt || 0) - (b.installedAt || 0))
  if (selectedCategory.value === 'all') return sorted
  return sorted.filter(m => m.category === selectedCategory.value)
})

const modHighlightFn = (mod) => ({ highlighted: mod.enabled })

// 计算已启用 mod 的序号（按 installedAt 排序）
const enableIndexMap = computed(() => {
  const map = {}
  const enabled = [...mods.value]
    .filter(m => m.enabled)
    .sort((a, b) => (a.installedAt || 0) - (b.installedAt || 0))
  enabled.forEach((m, i) => { map[m.id] = i + 1 })
  return map
})

// Actions
const loadMods = async () => {
  isLoading.value = true
  try {
    const [modsResult, statusResult] = await Promise.all([
      window.electronAPI.iflowListMods(),
      window.electronAPI.iflowCheckIflowStatus(),
    ])
    if (modsResult.success) {
      mods.value = modsResult.mods || []
    }
    if (statusResult.success) {
      iflowStatus.value = statusResult
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
  applyingText.value = enabled ? t('iflow.applying.enabling') : t('iflow.applying.disabling')
  try {
    const result = await window.electronAPI.iflowEnableMod(modId, enabled)
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

const deleteMod = async (modId) => {
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

const exportMod = async (modId) => {
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
})
</script>

<style lang="less" scoped>
.iflow-mods-view {
  position: relative;
}

.status-cards {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
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
  transition: all 0.15s ease;

  &.warning {
    border-color: var(--warning);
    background: rgba(234, 179, 8, 0.05);
  }
}

.status-card-icon {
  flex-shrink: 0;
}

.status-card-label {
  font-size: 11px;
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
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.mod-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.mod-version {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-tertiary);
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

// 启用索引序号
.mod-enable-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.mod-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mod-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.mod-author {
  color: var(--text-tertiary);
}

.mod-category {
  color: var(--accent);
}

.mod-compat {
  font-family: var(--font-mono);
  font-size: 10px;
}

.mod-icon-emoji {
  font-size: 20px;
}

// Toggle Switch
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .toggle-slider {
      background-color: var(--toggle-on, var(--accent));
      box-shadow: 0 0 0 2px var(--toggle-on-border, rgba(0, 120, 212, 0.3));

      &::before {
        transform: translateX(16px);
        background-color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
    }

    &:disabled + .toggle-slider {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--toggle-off, var(--border));
  border-radius: 10px;
  transition: 0.2s;

  &::before {
    content: '';
    position: absolute;
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: var(--toggle-thumb, #fff);
    border-radius: 50%;
    transition: 0.2s;
  }
}
</style>