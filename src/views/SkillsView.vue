<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('skills.title') }}</h1>
      <p class="content-desc">{{ $t('skills.description') }}</p>
    </div>

    <div class="form-group">
      <div class="skills-actions">
        <button class="btn btn-primary" @click="importLocal">
          <FolderOpen size="14" />
          {{ $t('skills.importLocal') }}
        </button>
        <button class="btn btn-secondary" @click="importOnline">
          <Download size="14" />
          {{ $t('skills.importOnline') }}
        </button>
      </div>

      <div class="skill-list">
        <template v-if="skills.length > 0">
          <div v-for="(skill, index) in skills" :key="skill.name" class="skill-item" :class="{ selected: selectedSkill === skill.name }" @click="selectSkill(skill)">
            <div class="skill-icon">
              <Star size="20" />
            </div>
            <div class="skill-info">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-desc">{{ skill.description || $t('skills.noDescription') }}</div>
              <div class="skill-meta">
                <span class="skill-file">{{ skill.folderName }}</span>
                <span class="skill-size">{{ formatFileSize(skill.size) }}</span>
              </div>
            </div>
            <button class="btn btn-icon skill-export" @click.stop="exportSkill(skill)" :title="$t('skills.export')">
              <Upload size="14" />
            </button>
            <button class="btn btn-icon skill-delete" @click.stop="deleteSkill(skill)" :title="$t('skills.delete')">
              <Delete size="14" />
            </button>
          </div>
        </template>
        <div v-else class="empty-state">
          <Star size="48" class="empty-state-icon" />
          <div class="empty-state-title">{{ $t('skills.noSkills') }}</div>
          <div class="empty-state-desc">{{ $t('skills.addFirstSkill') }}</div>
        </div>
      </div>
    </div>

    <!-- Online Import Dialog -->
    <div v-if="showOnlineDialog" class="dialog-overlay" @click.self="closeOnlineDialog">
      <div class="dialog">
        <div class="dialog-title">{{ $t('skills.importOnline') }}</div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">{{ $t('skills.url') }}</label>
            <input v-model="onlineUrl" type="text" class="form-input" :placeholder="$t('skills.urlPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('skills.skillName') }}</label>
            <input v-model="onlineName" type="text" class="form-input" :placeholder="$t('skills.namePlaceholder')" />
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeOnlineDialog">{{ $t('skills.cancel') }}</button>
          <button class="btn btn-primary" @click="confirmOnlineImport" :disabled="!onlineUrl || !onlineName">{{ $t('skills.import') }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Star, FolderOpen, Download, Upload, Delete } from '@icon-park/vue-next'

const emit = defineEmits(['show-message', 'skills-changed', 'show-input-dialog'])

const skills = ref([])
const selectedSkill = ref(null)
const showOnlineDialog = ref(false)
const onlineUrl = ref('')
const onlineName = ref('')

const loadSkills = async () => {
  try {
    const result = await window.electronAPI.listSkills()
    if (result.success) {
      skills.value = result.skills || []
      emit('skills-changed', skills.value.length)
    } else {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    console.error('Failed to load skills:', error)
  }
}

const selectSkill = skill => {
  selectedSkill.value = skill.name
}

const formatFileSize = bytes => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const importLocal = async () => {
  try {
    const result = await window.electronAPI.importSkillLocal()
    if (result.success) {
      await loadSkills()
      emit('show-message', { type: 'success', title: 'messages.success', message: result.message })
    } else if (result.cancelled) {
      // User cancelled
    } else {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
  }
}

const importOnline = () => {
  onlineUrl.value = ''
  onlineName.value = ''
  showOnlineDialog.value = true
}

const closeOnlineDialog = () => {
  showOnlineDialog.value = false
}

const confirmOnlineImport = async () => {
  if (!onlineUrl.value || !onlineName.value) return

  try {
    const result = await window.electronAPI.importSkillOnline(onlineUrl.value, onlineName.value)
    if (result.success) {
      showOnlineDialog.value = false
      await loadSkills()
      emit('show-message', { type: 'success', title: 'messages.success', message: result.message })
    } else {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
  }
}

const exportSkill = async skill => {
  const targetSkill = skill || skills.value.find(s => s.name === selectedSkill.value)
  if (!targetSkill) return

  try {
    const result = await window.electronAPI.exportSkill(targetSkill.name, targetSkill.folderName)
    if (result.success) {
      emit('show-message', { type: 'success', title: 'messages.success', message: result.message, messageParams: { name: targetSkill.name } })
    } else if (result.cancelled) {
      // User cancelled
    } else {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
  }
}

const deleteSkill = skill => {
  const folderToDelete = skill.folderName || skill.name

  new Promise(resolve => {
    emit('show-input-dialog', {
      type: 'confirm',
      title: 'messages.confirmDelete',
      placeholder: 'messages.confirmDeleteSkill',
      callback: resolve,
      isConfirm: true,
      name: skill.name
    })
  }).then(confirmed => {
    if (!confirmed) return

    window.electronAPI.deleteSkill(folderToDelete).then(result => {
      if (result.success) {
        if (selectedSkill.value === skill.name) {
          selectedSkill.value = null
        }
        loadSkills()
        emit('show-message', { type: 'success', title: 'messages.success', message: result.message, messageParams: { name: skill.name } })
      } else {
        emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
      }
    })
  })
}

onMounted(() => {
  loadSkills()
})
</script>

<style lang="less" scoped>
.skills-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.skill-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

.skill-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
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

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--control-fill);

    .skill-export,
    .skill-delete {
      opacity: 1;
    }
  }

  &.selected {
    background: var(--accent-light);
    border-left: 3px solid var(--accent);
    padding-left: 13px;
  }
}

.skill-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--accent-light);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.skill-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.skill-file {
  font-family: var(--font-mono);
}

.skill-export {
  opacity: 0;
  transition: opacity 0.15s ease;
  color: var(--accent);
  margin-right: 8px;

  &:hover {
    background: var(--accent-light);
  }
}

.skill-delete {
  opacity: 0;
  margin-left: 12px;
  transition: opacity 0.15s ease;
  color: var(--danger);

  &:hover {
    background: var(--danger-bg);
  }
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
