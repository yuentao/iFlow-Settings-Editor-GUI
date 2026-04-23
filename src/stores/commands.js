/**
 * Commands Store
 * 管理命令列表和操作
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCommandsStore = defineStore('commands', () => {
  // State
  const commands = ref([])
  const selectedCommand = ref(null)
  const isLoading = ref(false)

  // Actions
  async function loadCommands() {
    isLoading.value = true
    try {
      const result = await window.electronAPI.listCommands()
      if (result.success) {
        commands.value = result.commands || []
      }
      return result
    } catch (error) {
      console.error('Failed to load commands:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  async function importLocal() {
    const result = await window.electronAPI.importCommandLocal()
    if (result.success) {
      await loadCommands()
    }
    return result
  }

  async function importOnline(url, name) {
    const result = await window.electronAPI.importCommandOnline(url, name)
    if (result.success) {
      await loadCommands()
    }
    return result
  }

  async function exportCommand(command, folderName) {
    const result = await window.electronAPI.exportCommand(command, folderName)
    return result
  }

  async function deleteCommand(command) {
    const result = await window.electronAPI.deleteCommand(command)
    if (result.success) {
      if (selectedCommand.value === command) {
        selectedCommand.value = null
      }
      await loadCommands()
    }
    return result
  }

  function selectCommand(commandName) {
    selectedCommand.value = commandName
  }

  return {
    commands,
    selectedCommand,
    isLoading,
    loadCommands,
    importLocal,
    importOnline,
    exportCommand,
    deleteCommand,
    selectCommand,
  }
})