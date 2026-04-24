<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('commands.title') }}</h1>
      <p class="content-desc">{{ $t('commands.description') }}</p>
    </div>

    <div class="form-group">
      <div class="commands-actions">
        <button class="btn btn-primary" @click="createCommand">
          <Plus size="14" />
          {{ $t('commands.create') }}
        </button>
        <button class="btn btn-secondary" @click="importCommand">
          <FolderOpen size="14" />
          {{ $t('commands.importLocal') }}
        </button>
      </div>

      <!-- Category Filter -->
      <div v-if="!isLoading" class="category-filter">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="category-btn"
          :class="{ active: selectedCategory === cat.value }"
          @click="selectedCategory = cat.value"
        >
          {{ $t(cat.label) }}
          <span class="category-count">{{ getCategoryCount(cat.value) }}</span>
        </button>
      </div>

      <!-- Command List -->
      <SkeletonLoader v-if="isLoading" type="command" :count="3" />
      <div class="command-list" v-else>
        <template v-if="filteredCommands.length > 0">
          <div
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.name"
            class="command-item"
            :class="{ selected: selectedCommand === cmd.name }"
            @click="selectCommand(cmd)"
          >
            <div class="command-icon">
              <Command size="20" />
            </div>
            <div class="command-info">
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
            </div>
            <button class="btn btn-icon command-edit" @click.stop="editCommand(cmd)" :title="$t('commands.edit')">
              <Edit size="14" />
            </button>
            <button class="btn btn-icon command-export" @click.stop="exportCommand(cmd)" :title="$t('commands.export')">
              <Upload size="14" />
            </button>
            <button class="btn btn-icon command-delete" @click.stop="deleteCommand(cmd)" :title="$t('commands.delete')">
              <Delete size="14" />
            </button>
          </div>
        </template>
        <EmptyState
          v-else
          :icon="Command"
          :title="$t('commands.noCommands')"
          :description="emptyDescription"
          :actionText="selectedCategory === 'all' ? $t('commands.create') : ''"
          embedded
          @action="createCommand"
        />
      </div>
    </div>

    <!-- Command Editor Dialog -->
    <CommandEditorDialog
      :show="showEditor"
      :command="editingCommand"
      @close="closeEditor"
      @save="saveCommand"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Command, Plus, FolderOpen, Edit, Upload, Delete, Tag } from '@icon-park/vue-next'
import CommandEditorDialog from '@/components/CommandEditorDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const { t } = useI18n()

const emit = defineEmits(['show-message', 'commands-changed', 'show-input-dialog'])

const commands = ref([])
const selectedCommand = ref(null)
const selectedCategory = ref('all')
const showEditor = ref(false)
const editingCommand = ref(null)
const isLoading = ref(true)

const categories = computed(() => [
  { value: 'all', label: 'commands.category.all' },
  { value: 'utility', label: 'commands.category.utility' },
  { value: 'documentation', label: 'commands.category.documentation' },
  { value: 'other', label: 'commands.category.other' },
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

const getCategoryCount = (category) => {
  if (category === 'all') return commands.value.length
  return commands.value.filter(cmd => cmd.category === category).length
}

const displayAuthor = (author) => {
  if (!author || author === '{{__anonymous__}}') {
    return t('commands.anonymous')
  }
  return author
}

const loadCommands = async () => {
  isLoading.value = true
  try {
    const result = await window.electronAPI.listCommands()
    if (result.success) {
      commands.value = result.commands || []
      emit('commands-changed', commands.value.length)
    } else {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    console.error('Failed to load commands:', error)
  } finally {
    isLoading.value = false
  }
}

const selectCommand = (cmd) => {
  selectedCommand.value = cmd.name
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
  try {
    // 处理 author 字段：如果为空则保存为匿名占位符，显示时翻译
    const commandData = { ...data }
    if (!commandData.author) {
      commandData.author = '{{__anonymous__}}'
    }

    let result
    if (editingCommand.value) {
      // Update existing command
      result = await window.electronAPI.updateCommand(editingCommand.value.name, commandData)
      if (result.success) {
        emit('show-message', { type: 'success', title: 'messages.success', message: 'commands.commandSaved' })
      }
    } else {
      // Create new command
      result = await window.electronAPI.createCommand(commandData.name, commandData)
      if (result.success) {
        emit('show-message', { type: 'success', title: 'messages.success', message: 'commands.commandCreated', messageParams: { name: data.name } })
      }
    }

    if (!result.success) {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
      return
    }

    closeEditor()
    await loadCommands()
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
  }
}

const exportCommand = async (cmd) => {
  const targetCmd = cmd || commands.value.find(c => c.name === selectedCommand.value)
  if (!targetCmd) return

  try {
    const result = await window.electronAPI.exportCommand(targetCmd.name)
    if (result.success) {
      emit('show-message', { type: 'success', title: 'messages.success', message: 'commands.commandExported', messageParams: { name: targetCmd.name } })
    } else if (!result.cancelled) {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
  }
}

const deleteCommand = (cmd) => {
  new Promise(resolve => {
    emit('show-input-dialog', {
      type: 'confirm',
      title: 'messages.confirmDelete',
      placeholder: 'commands.confirmDelete',
      callback: resolve,
      isConfirm: true,
      name: cmd.name
    })
  }).then(confirmed => {
    if (!confirmed) return

    window.electronAPI.deleteCommand(cmd.name).then(result => {
      if (result.success) {
        if (selectedCommand.value === cmd.name) {
          selectedCommand.value = null
        }
        loadCommands()
        emit('show-message', { type: 'success', title: 'messages.success', message: 'commands.commandDeleted', messageParams: { name: cmd.name } })
      } else {
        emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
      }
    })
  })
}

const importCommand = async () => {
  try {
    const result = await window.electronAPI.importCommand()
    if (result.success) {
      await loadCommands()
      if (result.imported && result.imported.length > 0) {
        emit('show-message', { type: 'success', title: 'messages.success', message: 'commands.commandsImported', messageParams: { count: result.imported.length } })
      }
    } else if (!result.cancelled) {
      emit('show-message', { type: 'error', title: 'messages.error', message: result.error })
    }
  } catch (error) {
    emit('show-message', { type: 'error', title: 'messages.error', message: error.message })
  }
}

onMounted(() => {
  loadCommands()
})
</script>

<style lang="less" scoped>
.commands-actions {
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

.command-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

.command-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
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

    .command-edit,
    .command-export,
    .command-delete {
      opacity: 1;
    }
  }

  &.selected {
    background: var(--accent-light);
    border-left: 3px solid var(--accent);
    padding-left: 13px;
  }
}

.command-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--control-fill);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.command-info {
  flex: 1;
  min-width: 0;
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
  font-size: 11px;
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

.command-author {
  color: var(--text-tertiary);
}

.command-edit,
.command-export,
.command-delete {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.command-edit {
  color: var(--accent);
  margin-right: 8px;

  &:hover {
    background: var(--accent-light);
  }
}

.command-export {
  color: var(--text-secondary);
  margin-right: 8px;

  &:hover {
    background: var(--control-fill-hover);
  }
}

.command-delete {
  color: var(--danger);
  margin-left: 12px;

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
