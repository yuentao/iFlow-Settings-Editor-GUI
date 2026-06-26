<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('commands.title') }}</h1>
      <p class="content-desc">{{ $t('commands.description') }}</p>
    </div>

    <div class="form-group">
      <div class="commands-actions">
        <button class="btn btn-primary" @click="createCommand" :disabled="isSavingCommand">
          <span v-if="isSavingCommand" class="spinner spinner-sm"></span>
          <Plus v-else size="14" />
          {{ $t('commands.create') }}
        </button>
        <button class="btn btn-secondary" @click="importCommand" :disabled="isImportingCommand">
          <span v-if="isImportingCommand" class="spinner spinner-sm"></span>
          <FolderOpen v-else size="14" />
          {{ $t('commands.importLocal') }}
        </button>
      </div>

      <!-- Command List -->
      <GenericList
        :items="filteredCommands"
        item-key="name"
        :loading="isLoading"
        skeleton-type="command"
        :categories="categories"
        :selected-category="selectedCategory"
        :empty-icon="Command"
        :empty-title="$t('commands.noCommands')"
        :empty-description="emptyDescription"
        :empty-action-text="selectedCategory === 'all' ? $t('commands.create') : ''"
        @update:selected-category="selectedCategory = $event"
        @action="createCommand"
      >
        <template #item-icon>
          <Command size="20" />
        </template>

        <template #item-info="{ item: cmd }">
          <div class="command-name">{{ cmd.name }}</div>
          <div class="command-desc">{{ cmd.description || $t('commands.noDescription') }}</div>
          <div class="command-meta">
            <span class="command-category">
              <Tag size="10" />
              {{ $t(`commands.category.${cmd.category}`) }}
            </span>
            <span class="command-version">v{{ cmd.version }}</span>
            <span class="command-author">{{ displayAuthor(cmd.author) }}</span>
          </div>
        </template>

        <template #item-actions="{ item: cmd }">
          <button class="action-btn" @click.stop="editCommand(cmd)" :title="$t('commands.edit')" :aria-label="$t('commands.edit')" :disabled="isSavingCommand">
            <Edit size="14" />
          </button>
          <button class="action-btn" @click.stop="exportCommand(cmd)" :title="$t('commands.export')" :aria-label="$t('commands.export')" :disabled="exportingCommand === cmd.name">
            <span v-if="exportingCommand === cmd.name" class="spinner spinner-sm"></span>
            <Upload v-else size="14" />
          </button>
          <button class="action-btn action-btn-danger" @click.stop="deleteCommand(cmd)" :title="$t('commands.delete')" :aria-label="$t('commands.delete')" :disabled="deletingCommand === cmd.name">
            <span v-if="deletingCommand === cmd.name" class="spinner spinner-sm"></span>
            <Delete v-else size="14" />
          </button>
        </template>
      </GenericList>
    </div>

    <!-- Command Editor Dialog -->
    <CommandEditorDialog
      :show="showEditor"
      :command="editingCommand"
      :saving="isSavingCommand"
      @close="closeEditor"
      @save="saveCommand"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Command, Plus, FolderOpen, Edit, Upload, Delete, Tag } from '@icon-park/vue-next'
import GenericList from '@/components/GenericList.vue'
import CommandEditorDialog from '@/components/CommandEditorDialog.vue'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToast()

const emit = defineEmits(['commands-changed', 'show-input-dialog'])

const commands = ref([])
const selectedCategory = ref('all')
const showEditor = ref(false)
const editingCommand = ref(null)
const isLoading = ref(true)
const isSavingCommand = ref(false)
const isImportingCommand = ref(false)
const exportingCommand = ref('')
const deletingCommand = ref('')
let isCancelled = false

const categories = computed(() => [
  { value: 'all', label: t('commands.category.all'), count: commands.value.length },
  { value: 'utility', label: t('commands.category.utility'), count: commands.value.filter(cmd => cmd.category === 'utility').length },
  { value: 'documentation', label: t('commands.category.documentation'), count: commands.value.filter(cmd => cmd.category === 'documentation').length },
  { value: 'other', label: t('commands.category.other'), count: commands.value.filter(cmd => cmd.category === 'other').length },
])

const filteredCommands = computed(() => {
  if (selectedCategory.value === 'all') {
    return commands.value
  }
  return commands.value.filter(cmd => cmd.category === selectedCategory.value)
})

const emptyDescription = computed(() => {
  if (commands.value.length === 0) {
    return t('commands.addFirstCommand')
  }
  return t('commands.noCommandsInCategory')
})

const displayAuthor = (author) => {
  if (!author || author === '{{__anonymous__}}') {
    return t('commands.anonymous')
  }
  return author
}

const loadCommands = async () => {
  if (isCancelled) return
  isLoading.value = true
  try {
    const result = await window.electronAPI.listCommands()
    if (isCancelled) return
    if (result.success) {
      commands.value = result.commands || []
      emit('commands-changed', commands.value.length)
    } else {
      toast.error(result.error)
    }
  } catch (error) {
    if (!isCancelled) console.error('Failed to load commands:', error)
  } finally {
    if (!isCancelled) isLoading.value = false
  }
}

const createCommand = () => {
  editingCommand.value = null
  showEditor.value = true
}

const editCommand = (cmd) => {
  editingCommand.value = { ...cmd }
  showEditor.value = true
}

const closeEditor = () => {
  showEditor.value = false
  editingCommand.value = null
}

const saveCommand = async (data) => {
  if (isSavingCommand.value) return
  isSavingCommand.value = true
  try {
    const commandData = { ...data }
    if (!commandData.author) {
      commandData.author = '{{__anonymous__}}'
    }

    let result
    if (editingCommand.value) {
      result = await window.electronAPI.updateCommand(editingCommand.value.name, commandData)
      if (result.success) {
        toast.success(t('commands.commandSaved'))
      }
    } else {
      result = await window.electronAPI.createCommand(commandData.name, commandData)
      if (result.success) {
        toast.success(t('commands.commandCreated', { name: data.name }))
      }
    }

    if (!result.success) {
      toast.error(result.error)
      return
    }

    closeEditor()
    await loadCommands()
  } catch (error) {
    toast.error(error?.message || String(error))
  } finally {
    isSavingCommand.value = false
  }
}

const exportCommand = async (cmd) => {
  if (!cmd || exportingCommand.value) return

  exportingCommand.value = cmd.name
  try {
    const result = await window.electronAPI.exportCommand(cmd.name)
    if (result.success) {
      toast.success(t('commands.commandExported', { name: cmd.name }))
    } else if (!result.cancelled) {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  } finally {
    exportingCommand.value = ''
  }
}

const deleteCommand = async (cmd) => {
  try {
    const confirmed = await new Promise(resolve => {
      emit('show-input-dialog', {
        type: 'confirm',
        title: 'messages.confirmDelete',
        placeholder: 'commands.confirmDelete',
        callback: resolve,
        isConfirm: true,
        name: cmd.name
      })
    })
    if (!confirmed) return

    deletingCommand.value = cmd.name
    const result = await window.electronAPI.deleteCommand(cmd.name)
    if (result.success) {
      await loadCommands()
      toast.success(t('commands.commandDeleted', { name: cmd.name }))
    } else {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  } finally {
    deletingCommand.value = ''
  }
}

const importCommand = async () => {
  if (isImportingCommand.value) return
  isImportingCommand.value = true
  try {
    const result = await window.electronAPI.importCommand()
    if (result.success) {
      await loadCommands()
      if (result.imported && result.imported.length > 0) {
        toast.success(t('commands.commandsImported', { count: result.imported.length }))
      }
    } else if (!result.cancelled) {
      toast.error(result.error)
    }
  } catch (error) {
    toast.error(error?.message || String(error))
  } finally {
    isImportingCommand.value = false
  }
}

onMounted(() => {
  loadCommands()
})

onUnmounted(() => {
  isCancelled = true
})
</script>

<style lang="less" scoped>
.commands-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.command-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  font-family: var(--font-mono);
}

.command-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-meta {
  display: flex;
  gap: 12px;
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

.command-category {
  display: flex;
  align-items: center;
  gap: 4px;
}

.command-version {
  font-family: var(--font-mono);
}
</style>