/**
 * API Profiles Store - TypeScript 版本
 * 管理 API 配置文件的增删改查
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ApiProfile, ApiProfileConfig } from '@/shared/types'

export const useApiProfilesStore = defineStore('apiProfiles', () => {
  // State
  const profiles = ref<ApiProfile[]>([])
  const currentProfileName = ref<string>('default')
  const isLoading = ref(false)

  // Getters
  const currentProfile = computed<ApiProfile | undefined>(() => {
    return profiles.value.find(p => p.name === currentProfileName.value) || profiles.value[0]
  })

  const profileNames = computed<string[]>(() => profiles.value.map(p => p.name))

  // Actions
  async function loadProfiles(): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    try {
      const result = await window.electronAPI.listApiProfiles()
      if (result.success) {
        profiles.value = (result.profiles && result.profiles.length > 0)
          ? result.profiles
          : [{ name: 'default', isDefault: true } as ApiProfile]
        currentProfileName.value = result.currentProfile || 'default'
      }
      return result
    } catch (error) {
      console.error('Failed to load API profiles:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoading.value = false
    }
  }

  async function switchProfile(name: string): Promise<{ success: boolean; error?: string }> {
    if (name === currentProfileName.value) return { success: true }
    const result = await window.electronAPI.switchApiProfile(name)
    if (result.success) {
      currentProfileName.value = name
    }
    return result
  }

  async function createProfile(name: string, profileData?: ApiProfileConfig): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.createApiProfile(name, profileData)
    return result
  }

  async function deleteProfile(name: string): Promise<{ success: boolean; error?: string }> {
    if (name === 'default') {
      return { success: false, error: 'Cannot delete default profile' }
    }
    const result = await window.electronAPI.deleteApiProfile(name)
    return result
  }

  async function renameProfile(oldName: string, newName: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.renameApiProfile(oldName, newName)
    return result
  }

  async function duplicateProfile(sourceName: string, newName: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.duplicateApiProfile(sourceName, newName)
    return result
  }

  return {
    profiles,
    currentProfileName,
    isLoading,
    currentProfile,
    profileNames,
    loadProfiles,
    switchProfile,
    createProfile,
    deleteProfile,
    renameProfile,
    duplicateProfile,
  }
})