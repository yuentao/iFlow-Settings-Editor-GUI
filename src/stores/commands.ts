/**
 * Commands Store - TypeScript 版本
 * 管理命令列表和操作
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Command, CommandFormData } from '@/shared/types'

export const useCommandsStore = defineStore('commands', () => {
  // State
  const commands = ref<Command[]>([])
  const selectedCommand = ref<string | null>(null)
  const isLoading = ref(false)

  // Actions
  async function loadCommands(): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    try {
      const result = await window.electronAPI.listCommands()
      if (result.success) {
        commands.value = result.commands || []
      }
      return result
    } catch (error) {
      console.error('Failed to load commands:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoading.value = false
    }
  }

  async function importLocal(): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.importCommandLocal()
    if (result.success) {
      await loadCommands()
    }
    return result
  }

  async function importOnline(url: string, name?: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.importCommandOnline(url, name)
    if (result.success) {
      await loadCommands()
    }
    return result
  }

  async function exportCommand(command: string, folderName?: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.exportCommand(command, folderName)
    return result
  }

  async function deleteCommand(command: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.deleteCommand(command)
    if (result.success) {
      if (selectedCommand.value === command) {
        selectedCommand.value = null
      }
      await loadCommands()
    }
    return result
  }

  function selectCommand(commandName: string | null): void {
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