/**
 * iFlow Mod Store - TypeScript 版本
 * 管理 iFlow Mod 列表和操作
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IflowMod } from '@/shared/types'

export const useIflowModsStore = defineStore('iflowMods', () => {
  // State
  const mods = ref<IflowMod[]>([])
  const iflowVersion = ref<string | null>(null)
  const isLoading = ref(false)

  // Computed
  const enabledCount = computed(() => mods.value.filter(m => m.enabled).length)
  const totalCount = computed(() => mods.value.length)

  const categories = computed(() => {
    const cats = new Set<string>()
    mods.value.forEach(m => {
      if (m.category) cats.add(m.category)
    })
    return ['all', ...Array.from(cats)]
  })

  // Actions
  async function loadMods(): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    try {
      const result = await window.electronAPI.iflowListMods()
      if (result.success) {
        mods.value = result.mods || []
      }
      return result
    } catch (error) {
      console.error('Failed to load mods:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoading.value = false
    }
  }

  async function loadIflowVersion(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const result = await window.electronAPI.iflowGetIflowVersion()
      if (result.success && result.version) {
        iflowVersion.value = result.version
      }
      return result
    } catch (error) {
      console.error('Failed to get iflow version:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function enableMod(modId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.iflowEnableMod(modId, enabled)
    if (result.success) {
      await loadMods()
    }
    return result
  }

  async function deleteMod(modId: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.iflowDeleteMod(modId)
    if (result.success) {
      await loadMods()
    }
    return result
  }

  async function exportMod(modId: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const result = await window.electronAPI.iflowExportMod(modId)
    return result
  }

  async function importMod(filePath: string): Promise<{ success: boolean; imported?: number; failed?: number; errors?: string[]; modIds?: string[]; error?: string }> {
    const result = await window.electronAPI.iflowImportMod(filePath)
    if (result.success) {
      await loadMods()
    }
    return result
  }

  async function getModCompatibility(modId: string): Promise<{ success: boolean; compatible?: boolean; reason?: string; error?: string }> {
    const result = await window.electronAPI.iflowGetModCompatibility(modId)
    return result
  }

  return {
    mods,
    iflowVersion,
    isLoading,
    enabledCount,
    totalCount,
    categories,
    loadMods,
    loadIflowVersion,
    enableMod,
    deleteMod,
    exportMod,
    importMod,
    getModCompatibility,
  }
})
