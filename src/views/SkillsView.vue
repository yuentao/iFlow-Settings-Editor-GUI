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

      <GenericList
        :items="skills"
        item-key="name"
        :loading="isLoading"
        :empty-icon="Star"
        :empty-title="$t('skills.noSkills')"
        :empty-description="$t('skills.addFirstSkill')"
        :empty-action-text="$t('skills.importLocal')"
        @action="importLocal"
      >
        <template #item-icon="{ item: skill }">
          <Star size="20" />
        </template>

        <template #item-info="{ item: skill }">
          <div class="skill-name">{{ skill.name }}</div>
          <div class="skill-desc">{{ skill.description || $t('skills.noDescription') }}</div>
          <div class="skill-meta">
            <span class="skill-file">{{ skill.folderName }}</span>
            <span class="skill-size">{{ formatFileSize(skill.size) }}</span>
          </div>
        </template>

        <template #item-actions="{ item: skill }">
          <button class="action-btn" @click.stop="exportSkill(skill)" :title="$t('skills.export')" :aria-label="$t('skills.export')">
            <Upload size="14" />
          </button>
          <button class="action-btn action-btn-danger" @click.stop="deleteSkill(skill)" :title="$t('skills.delete')" :aria-label="$t('skills.delete')">
            <Delete size="14" />
          </button>
        </template>
      </GenericList>
    </div>

    <!-- Online Import Dialog -->
    <div v-if="showOnlineDialog" class="dialog-overlay" @click.self="closeOnlineDialog">
      <div class="dialog">
        <div class="dialog-title">{{ $t('skills.importOnline') }}</div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">{{ $t('skills.url') }}</label>
            <custom-input v-model="onlineUrl" :placeholder="$t('skills.urlPlaceholder')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('skills.skillName') }}</label>
            <custom-input v-model="onlineName" :placeholder="$t('skills.namePlaceholder')" />
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Star, FolderOpen, Download, Upload, Delete } from '@icon-park/vue-next'
import GenericList from '@/components/GenericList.vue'
import CustomInput from '@/components/CustomInput.vue'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToast()

const emit = defineEmits(['skills-changed', 'show-input-dialog'])

const skills = ref([])
const showOnlineDialog = ref(false)
const onlineUrl = ref('')
const onlineName = ref('')
const isLoading = ref(true)
let isCancelled = false

const loadSkills = async () => {
  if (isCancelled) return
  isLoading.value = true
  try {
    const result = await window.electronAPI.listSkills()
    if (isCancelled) return
    if (result.success) {
      skills.value = result.skills || []
      emit('skills-changed', skills.value.length)
    } else {
      toast.error(result.error)
    }
  } catch (error) {
    if (!isCancelled) console.error('Failed to load skills:', error)
  } finally {
    if (!isCancelled) isLoading.value = false
  }
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
      toast.success(t(result.message))
    } else if (result.cancelled) {
      // User cancelled
    } else {
      toast.error(result.error ? t(result.error) : t('messages.error'))
    }
  } catch (error) {
    toast.error(error?.message || String(error))
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
      toast.success(t(result.message))
    } else {
      toast.error(result.error ? t(result.error) : t('messages.error'))
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  }
}

const exportSkill = async skill => {
  if (!skill) return

  try {
    const result = await window.electronAPI.exportSkill(skill.name, skill.folderName)
    if (result.success) {
      toast.success(t(result.message, { name: skill.name }))
    } else if (result.cancelled) {
      // User cancelled
    } else {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  }
}

const deleteSkill = async skill => {
  const folderToDelete = skill.folderName || skill.name

  try {
    const confirmed = await new Promise(resolve => {
      emit('show-input-dialog', {
        type: 'confirm',
        title: 'messages.confirmDelete',
        placeholder: 'messages.confirmDeleteSkill',
        callback: resolve,
        isConfirm: true,
        name: skill.name
      })
    })
    if (!confirmed) return

    const result = await window.electronAPI.deleteSkill(folderToDelete)
    if (result.success) {
      await loadSkills()
      toast.success(t(result.message, { name: skill.name }))
    } else {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  }
}

onMounted(() => {
  loadSkills()
})

onUnmounted(() => {
  isCancelled = true
})
</script>

<style lang="less" scoped>
.skills-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
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
</style>