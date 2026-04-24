/**
 * Skills Store - TypeScript 版本
 * 管理技能列表和操作
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Skill } from '@/shared/types'

export const useSkillsStore = defineStore('skills', () => {
  // State
  const skills = ref<Skill[]>([])
  const selectedSkill = ref<string | null>(null)
  const isLoading = ref(false)

  // Actions
  async function loadSkills(): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true
    try {
      const result = await window.electronAPI.listSkills()
      if (result.success) {
        skills.value = result.skills || []
      }
      return result
    } catch (error) {
      console.error('Failed to load skills:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoading.value = false
    }
  }

  async function importLocal(): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.importSkillLocal()
    if (result.success) {
      await loadSkills()
    }
    return result
  }

  async function importOnline(url: string, name?: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.importSkillOnline(url, name)
    if (result.success) {
      await loadSkills()
    }
    return result
  }

  async function exportSkill(skill: string, folderName?: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.exportSkill(skill, folderName)
    return result
  }

  async function deleteSkill(skill: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.deleteSkill(skill)
    if (result.success) {
      if (selectedSkill.value === skill) {
        selectedSkill.value = null
      }
      await loadSkills()
    }
    return result
  }

  function selectSkill(skillName: string | null): void {
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