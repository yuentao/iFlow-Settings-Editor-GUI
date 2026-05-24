/**
 * Projects Store - TypeScript 版本
 * 管理项目会话列表和消息
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Project {
  id: string
  name: string
  path: string
  sessionCount: number
  messageCount: number
  lastActive: string
  firstActive: string
}

export interface SessionSummary {
  id: string
  fileName: string
  messageCount: number
  userMessageCount: number
  assistantMessageCount: number
  createdAt: string
  lastMessageAt: string
  gitBranch: string
  firstUserMessage: string
  totalInputTokens: number
  totalOutputTokens: number
}

export interface Message {
  uuid: string
  parentUuid: string | null
  sessionId: string
  timestamp: string
  type: 'user' | 'assistant'
  isSidechain: boolean
  userType: string
  role: string
  content: string
  rawContent: any
  messageId?: string
  messageType?: string
  isMeta?: boolean
  model?: string
  stopReason?: string | null
  stopSequence?: string | null
  usage?: {
    input_tokens: number
    output_tokens: number
  }
  toolUseResult?: {
    toolName: string
    status: 'success' | 'error'
    timestamp: number
  }
}

export interface SessionStats {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  toolCalls: number
  toolCallSuccess: number
  toolCallFailed: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
}

export const useProjectsStore = defineStore('projects', () => {
  // State
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const sessions = ref<SessionSummary[]>([])
  const messages = ref<Message[]>([])
  const currentStats = ref<SessionStats | null>(null)
  const isLoadingProjects = ref(false)
  const isLoadingSessions = ref(false)
  const isLoadingMessages = ref(false)

  // 消息选择模式
  const isSelectionMode = ref(false)
  const selectedMessageUuids = ref<Set<string>>(new Set())

  // 分页
  const sessionsTotal = ref(0)
  const sessionsHasMore = ref(false)
  const messagesTotal = ref(0)
  const messagesHasMore = ref(false)

  // Actions
  async function loadProjects(): Promise<{ success: boolean; error?: string }> {
    isLoadingProjects.value = true
    try {
      const result = await window.electronAPI.listProjects()
      if (result.success) {
        projects.value = (result as any).projects || (result.data as any)?.projects || []
      }
      return result
    } catch (error) {
      console.error('Failed to load projects:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoadingProjects.value = false
    }
  }

  async function loadSessions(projectId: string, options?: { offset?: number; limit?: number; sortBy?: string; sortOrder?: string }): Promise<{ success: boolean; error?: string }> {
    isLoadingSessions.value = true
    try {
      const result = await window.electronAPI.getProjectSessions(projectId, options)
      if (result.success) {
        if (options?.offset && options.offset > 0) {
          sessions.value = [...sessions.value, ...(result.data || [])]
        } else {
          sessions.value = result.data || []
        }
        sessionsTotal.value = (result as any).total || 0
        sessionsHasMore.value = (result as any).hasMore || false
      }
      return result
    } catch (error) {
      console.error('Failed to load sessions:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoadingSessions.value = false
    }
  }

  async function loadMessages(projectId: string, sessionId: string, options?: { offset?: number; limit?: number; filterType?: string }): Promise<{ success: boolean; error?: string }> {
    isLoadingMessages.value = true
    try {
      const result = await window.electronAPI.getSessionMessages(projectId, sessionId, options)
      if (result.success) {
        if (options?.offset && options.offset > 0) {
          messages.value = [...messages.value, ...(result.data || [])]
        } else {
          messages.value = result.data || []
        }
        messagesTotal.value = (result as any).total || 0
        messagesHasMore.value = (result as any).hasMore || false
      }
      return result
    } catch (error) {
      console.error('Failed to load messages:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoadingMessages.value = false
    }
  }

  async function deleteSessionAction(projectId: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.deleteSession(projectId, sessionId)
    if (result.success) {
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      sessionsTotal.value = Math.max(0, sessionsTotal.value - 1)
    }
    return result
  }

  async function deleteProjectAction(projectId: string): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.deleteProject(projectId)
    if (result.success) {
      projects.value = projects.value.filter(p => p.id !== projectId)
      if (currentProject.value?.id === projectId) {
        currentProject.value = null
        resetSessions()
      }
    }
    return result
  }

  async function deleteMessagesAction(projectId: string, sessionId: string, uuids: string[]): Promise<{ success: boolean; error?: string }> {
    const result = await window.electronAPI.deleteMessages(projectId, sessionId, uuids)
    if (result.success) {
      messages.value = messages.value.filter(m => !uuids.includes(m.uuid))
      messagesTotal.value = Math.max(0, messagesTotal.value - uuids.length)
      exitSelectionMode()
    }
    return result
  }

  async function exportSessionAction(projectId: string, sessionId: string, format: 'markdown' | 'json' = 'markdown'): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
    return await window.electronAPI.exportSession(projectId, sessionId, format)
  }

  async function loadSessionStats(projectId: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await window.electronAPI.getSessionStats(projectId, sessionId)
      if (result.success) {
        currentStats.value = (result as any).stats || result.data || null
      }
      return result
    } catch (error) {
      console.error('Failed to load session stats:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function searchSessionsAction(query: string, options?: { projectId?: string; dateFrom?: string; dateTo?: string; limit?: number }): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      return await window.electronAPI.searchSessions(query, options)
    } catch (error) {
      console.error('Failed to search sessions:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  // 选择模式操作
  function enterSelectionMode() {
    isSelectionMode.value = true
    selectedMessageUuids.value.clear()
  }

  function exitSelectionMode() {
    isSelectionMode.value = false
    selectedMessageUuids.value.clear()
  }

  function toggleMessageSelect(uuid: string) {
    if (selectedMessageUuids.value.has(uuid)) {
      selectedMessageUuids.value.delete(uuid)
    } else {
      selectedMessageUuids.value.add(uuid)
    }
  }

  function selectAllMessages() {
    messages.value.forEach(m => selectedMessageUuids.value.add(m.uuid))
  }

  function clearSelection() {
    selectedMessageUuids.value.clear()
  }

  // 重置状态
  function resetSessions() {
    sessions.value = []
    sessionsTotal.value = 0
    sessionsHasMore.value = false
  }

  function resetMessages() {
    messages.value = []
    messagesTotal.value = 0
    messagesHasMore.value = false
    currentStats.value = null
    exitSelectionMode()
  }

  return {
    projects,
    currentProject,
    sessions,
    messages,
    currentStats,
    isLoadingProjects,
    isLoadingSessions,
    isLoadingMessages,
    isSelectionMode,
    selectedMessageUuids,
    sessionsTotal,
    sessionsHasMore,
    messagesTotal,
    messagesHasMore,
    loadProjects,
    loadSessions,
    loadMessages,
    deleteSessionAction,
    deleteProjectAction,
    deleteMessagesAction,
    exportSessionAction,
    loadSessionStats,
    searchSessionsAction,
    enterSelectionMode,
    exitSelectionMode,
    toggleMessageSelect,
    selectAllMessages,
    clearSelection,
    resetSessions,
    resetMessages,
  }
})
