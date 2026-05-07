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

      <!-- Category Filter -->
      <div v-if="!isLoading && mods.length > 0" class="category-filter">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="category-btn"
          :class="{ active: selectedCategory === cat.value }"
          @click="selectedCategory = cat.value"
        >
          {{ cat.label }}
          <span class="category-count">{{ getCategoryCount(cat.value) }}</span>
        </button>
      </div>

      <!-- Mod List -->
      <SkeletonLoader v-if="isLoading" type="list" :count="4" />
      <div v-else-if="mods.length > 0" class="mod-list">
        <div
          v-for="mod in filteredMods"
          :key="mod.id"
          class="mod-item"
          :class="{ enabled: mod.enabled }"
        >
          <!-- Left: Mod Info -->
          <div class="mod-info">
            <div class="mod-icon">
              <span v-if="mod.icon" class="mod-icon-emoji">{{ mod.icon }}</span>
              <Puzzle v-else size="18" />
            </div>
            <div class="mod-details">
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
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="mod-actions">
            <!-- Conditional actions (only when disabled) -->
            <template v-if="!mod.enabled && !isApplying">
              <button class="action-btn" @click.stop="exportMod(mod.id)" :title="$t('iflow.mods.export')">
                <Download size="14" />
              </button>
              <button class="action-btn action-btn-danger" @click.stop="deleteMod(mod.id)" :title="$t('iflow.mods.delete')">
                <Delete size="14" />
              </button>
            </template>

            <!-- Enable/Disable Toggle -->
            <label class="toggle-switch" :title="mod.enabled ? $t('iflow.mods.disable') : $t('iflow.mods.enable')">
              <input
                type="checkbox"
                :checked="mod.enabled"
                @change="toggleMod(mod.id, $event.target.checked)"
                :disabled="isApplying"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else
        :icon="Puzzle"
        :title="$t('iflow.mods.emptyTitle')"
        :description="$t('iflow.mods.emptyDesc')"
        :actionText="$t('iflow.mods.import')"
        embedded
        @action="openImportDialog"
      />
    </div>

    <!-- Applying overlay -->
    <div v-if="isApplying" class="applying-overlay">
      <div class="applying-dialog">
        <div class="applying-spinner"></div>
        <div class="applying-text">{{ applyingText }}</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Puzzle, FolderOpen, Download, Delete, Success, Caution, SwitchButton } from '@icon-park/vue-next'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const { t } = useI18n()

const emit = defineEmits(['show-message'])

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
  const sorted = [...mods.value].sort((a, b) => a.installedAt - b.installedAt)
  if (selectedCategory.value === 'all') return sorted
  return sorted.filter(m => m.category === selectedCategory.value)
})

const getCategoryCount = (category) => {
  if (category === 'all') return mods.value.length
  return mods.value.filter(m => m.category === category).length
}

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
  isApplying.value = true
  applyingText.value = enabled ? t('iflow.applying.enabling') : t('iflow.applying.disabling')
  try {
    const result = await window.electronAPI.iflowEnableMod(modId, enabled)
    if (result.success) {
      await loadMods()
      emit('show-message', {
        type: 'success',
        title: 'messages.success',
        message: enabled ? 'iflow.mods.enableSuccess' : 'iflow.mods.disableSuccess',
        messageParams: { name: mod.name },
      })
    } else if (result.code === 'IFLOW_VERSION_INCOMPATIBLE') {
      emit('show-message', {
        type: 'warning',
        title: 'messages.warning',
        message: result.error,
      })
    } else {
      emit('show-message', {
        type: 'error',
        title: 'messages.error',
        message: result.error,
      })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
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

  try {
    const result = await window.electronAPI.iflowDeleteMod(modId)
    if (result.success) {
      await loadMods()
      emit('show-message', {
        type: 'success',
        title: 'messages.success',
        message: 'iflow.mods.deleteSuccess',
        messageParams: { name: mod.name },
      })
    } else {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
  }
}

const exportMod = async (modId) => {
  const mod = mods.value.find(m => m.id === modId)
  try {
    const result = await window.electronAPI.iflowExportMod(modId)
    if (result.success) {
      emit('show-message', {
        type: 'success',
        title: 'messages.success',
        message: 'iflow.mods.exportSuccess',
        messageParams: { name: mod?.name || modId },
      })
    } else if (!result.cancelled) {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
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
      emit('show-message', {
        type: 'success',
        title: 'messages.success',
        message: 'iflow.mods.importSuccess',
        messageParams: { count: importResult.imported || 1 },
      })
    } else if (!importResult.cancelled) {
      emit('show-message', {
        type: 'error',
        title: 'messages.error',
        message: importResult.error,
      })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
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

.category-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius);
  background: var(--control-fill);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
    border-color: var(--border-hover);
  }

  &.active {
    background: var(--accent-light);
    border-color: var(--accent);
    color: var(--accent);
  }

  .category-count {
    background: var(--bg-primary);
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
  }
}

.mod-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

.mod-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  transition: all 0.15s ease;
  animation: fadeIn 0.3s ease backwards;

  &:nth-child(1) { animation-delay: 0.02s; }
  &:nth-child(2) { animation-delay: 0.04s; }
  &:nth-child(3) { animation-delay: 0.06s; }
  &:nth-child(4) { animation-delay: 0.08s; }
  &:nth-child(5) { animation-delay: 0.1s; }

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--control-fill);

    .mod-actions .action-btn {
      opacity: 1;
    }
  }

  &.enabled {
    border-left: 3px solid var(--accent);
    padding-left: 13px;
  }
}

.mod-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.mod-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.mod-icon-emoji {
  font-size: 20px;
}

.mod-details {
  flex: 1;
  min-width: 0;
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

.mod-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;

  .action-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: var(--radius);
    transition: all 0.1s ease;
    opacity: 0;

    &:hover {
      background: var(--control-fill);
      color: var(--text-primary);
    }

    &.action-btn-danger:hover {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
    }
  }
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

// Applying overlay
.applying-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.applying-dialog {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-xl);
}

.applying-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.applying-text {
  font-size: 14px;
  color: var(--text-primary);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
