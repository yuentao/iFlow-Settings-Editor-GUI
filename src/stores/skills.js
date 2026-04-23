/**
 * Skills Store
 * 管理技能列表和操作
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSkillsStore = defineStore('skills', () => {
  // State
  const skills = ref([])
  const selectedSkill = ref(null)
  const isLoading = ref(false)

  // Actions
  async function loadSkills() {
    isLoading.value = true
    try {
      const result = await window.electronAPI.listSkills()
      if (result.success) {
        skills.value = result.skills || []
      }
      return result
    } catch (error) {
      console.error('Failed to load skills:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  async function importLocal() {
    const result = await window.electronAPI.importSkillLocal()
    if (result.success) {
      await loadSkills()
    }
    return result
  }

  async function importOnline(url, name) {
    const result = await window.electronAPI.importSkillOnline(url, name)
    if (result.success) {
      await loadSkills()
    }
    return result
  }

  async function exportSkill(skill, folderName) {
    const result = await window.electronAPI.exportSkill(skill, folderName)
    return result
  }

  async function deleteSkill(skill) {
    const result = await window.electronAPI.deleteSkill(skill)
    if (result.success) {
      if (selectedSkill.value === skill) {
        selectedSkill.value = null
      }
      await loadSkills()
    }
    return result
  }

  function selectSkill(skillName) {
    selectedSkill.value = skillName
  }

  return {
    skills,
    selectedSkill,
    isLoading,
    loadSkills,
    importLocal,
    importOnline,
    exportSkill,
    deleteSkill,
    selectSkill,
  }
})