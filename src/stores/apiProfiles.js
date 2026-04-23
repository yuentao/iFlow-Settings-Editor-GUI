/**
 * API Profiles Store
 * 管理 API 配置文件的增删改查
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useApiProfilesStore = defineStore('apiProfiles', () => {
  // State
  const profiles = ref([])
  const currentProfileName = ref('default')
  const isLoading = ref(false)

  // Getters
  const currentProfile = computed(() => {
    return profiles.value.find(p => p.name === currentProfileName.value) || profiles.value[0]
  })

  const profileNames = computed(() => profiles.value.map(p => p.name))

  // Actions
  async function loadProfiles() {
    isLoading.value = true
    try {
      const result = await window.electronAPI.listApiProfiles()
      if (result.success) {
        profiles.value = result.profiles && result.profiles.length > 0
          ? result.profiles
          : [{ name: 'default', isDefault: true }]
        currentProfileName.value = result.currentProfile || 'default'
      }
      return result
    } catch (error) {
      console.error('Failed to load API profiles:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  async function switchProfile(name) {
    if (name === currentProfileName.value) return { success: true }
    const result = await window.electronAPI.switchApiProfile(name)
    if (result.success) {
      currentProfileName.value = name
    }
    return result
  }

  async function createProfile(name, profileData = {}) {
    const result = await window.electronAPI.createApiProfile(name)
    return result
  }

  async function deleteProfile(name) {
    if (name === 'default') {
      return { success: false, error: 'Cannot delete default profile' }
    }
    const result = await window.electronAPI.deleteApiProfile(name)
    return result
  }

  async function renameProfile(oldName, newName) {
    const result = await window.electronAPI.renameApiProfile(oldName, newName)
    return result
  }

  async function duplicateProfile(sourceName, newName) {
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