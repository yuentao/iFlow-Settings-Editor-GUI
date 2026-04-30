/**
 * 云同步 Pinia Store
 * 管理云同步状态，桥接渲染进程与主进程 IPC
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CloudSyncStatus {
  // enabled 和 autoSyncEnabled 由渲染进程通过 localStorage 持久化，不从此处读取
  hasPassword: boolean
  isAuthorized: boolean
  provider: string | null
  deviceName: string
  deviceId: string
  lastSyncAt: string | null
  lastSyncError: string | null
  isSyncing: boolean
}

export interface CloudDeviceInfo {
  deviceId: string
  deviceName: string
  lastModified: string
  isSelf: boolean
}

export const useCloudSyncStore = defineStore('cloudSync', () => {
  // State（enabled 和 autoSyncEnabled 由渲染进程通过 localStorage 管理，不从此处读取）
  const status = ref<CloudSyncStatus>({
    hasPassword: false,
    isAuthorized: false,
    provider: null,
    deviceName: '',
    deviceId: '',
    lastSyncAt: null,
    lastSyncError: null,
    isSyncing: false,
  })

  const devices = ref<CloudDeviceInfo[]>([])
  const isLoadingDevices = ref(false)
  const isTestingConnection = ref(false)
  const isSyncing = ref(false)
  const rememberPassword = ref(false)
  const connectionTestResult = ref<{ success: boolean; message?: string } | null>(null)

  // 密码缓存（仅内存中，不持久化）
  const cachedPassword = ref<string | null>(null)

  // 云同步启用状态（开关状态由 localStorage 持久化，store 统一管理）
  const syncEnabled = ref(localStorage.getItem('iflow_syncEnabled') === 'true')
  const autoSyncEnabled = ref(localStorage.getItem('iflow_autoSyncEnabled') === 'true')

  // L-10：订阅主进程同步状态广播，以主进程为单一来源覆盖本地 status，
  // 消除主/渲染两端 isSyncing 等字段 desync。
  // preload 暴露的 onCloudSyncStatusChanged 在应用生命周期内一直有效，
  // store 同样在生命周期内长存，无需取消订阅。
  if (typeof window !== 'undefined' && (window as any).electronAPI?.onCloudSyncStatusChanged) {
    ;(window as any).electronAPI.onCloudSyncStatusChanged((state: any) => {
      if (!state || !state.success) return
      const { success: _success, ...rest } = state
      Object.assign(status.value, rest)
      // 同步本地的 isSyncing ref（沿用旧字段供模板/计算属性使用）
      if (typeof state.isSyncing === 'boolean') {
        isSyncing.value = state.isSyncing
      }
    })
  }

  // Getters
  const isConfigured = computed(() => status.value.hasPassword && status.value.isAuthorized)

  const statusText = computed(() => {
    if (status.value.isSyncing) return 'syncing'
    if (!isConfigured.value) return 'notConfigured'
    if (status.value.lastSyncError) return 'error'
    return 'ready'
  })

  // Actions
  async function loadStatus() {
    try {
      const result = await window.electronAPI.cloudSyncGetStatus()
      if (result.success) {
        // L-8：CloudSyncStatus 已不含 enabled/autoSyncEnabled，主进程也不再返回，
        // 直接合并 result 中匹配的字段即可（success 字段不会冲突，Object.assign
        // 即使写入也无副作用，但为避免污染 status 形状，此处显式排除）
        const { success: _success, ...rest } = result
        Object.assign(status.value, rest)
      }
    } catch (error) {
      console.error('[CloudSync] Failed to load status:', error)
    }
  }

  async function setAutoSync(enabled: boolean) {
    try {
      const result = await window.electronAPI.cloudSyncSetAutoSync(enabled)
      // autoSyncEnabled 由渲染进程通过 localStorage 管理，不更新 status
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to set auto sync:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function configureProvider(provider: string, config: Record<string, string>) {
    try {
      const result = await window.electronAPI.cloudSyncConfigureProvider(provider, config)
      if (result.success) {
        status.value.provider = provider
        status.value.isAuthorized = true
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to configure provider:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function testConnection() {
    isTestingConnection.value = true
    connectionTestResult.value = null
    try {
      const result = await window.electronAPI.cloudSyncTestConnection()
      connectionTestResult.value = {
        success: result.success && result.authorized,
        message: result.success
          ? undefined
          : result.error,
      }
      return result
    } catch (error) {
      connectionTestResult.value = { success: false, message: (error as Error).message }
      return { success: false, error: (error as Error).message }
    } finally {
      isTestingConnection.value = false
    }
  }

  async function revokeAuth() {
    try {
      const result = await window.electronAPI.cloudSyncRevokeAuth()
      if (result.success) {
        status.value.isAuthorized = false
        status.value.provider = null
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to revoke auth:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function setPassword(password: string) {
    try {
      const result = await window.electronAPI.cloudSyncSetPassword(password)
      if (result.success) {
        status.value.hasPassword = true
        cachedPassword.value = password
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to set password:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function verifyPassword(password: string) {
    try {
      const result = await window.electronAPI.cloudSyncVerifyPassword(password)
      if (result.success && result.valid) {
        cachedPassword.value = password
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to verify password:', error)
      return { success: false, valid: false, error: (error as Error).message }
    }
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    try {
      const result = await window.electronAPI.cloudSyncChangePassword(oldPassword, newPassword)
      if (result.success) {
        cachedPassword.value = newPassword
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to change password:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function hasPassword() {
    try {
      const result = await window.electronAPI.cloudSyncHasPassword()
      return result.success && result.hasPassword
    } catch {
      return false
    }
  }

  async function syncNow(password?: string) {
    const pwd = password || cachedPassword.value
    if (!pwd) return { success: false, error: 'passwordRequired' }

    try {
      const result = await window.electronAPI.cloudSyncSyncNow(pwd)
      if (result.success) {
        status.value.lastSyncAt = new Date().toISOString()
        status.value.lastSyncError = null
        cachedPassword.value = pwd
      } else {
        status.value.lastSyncError = result.error || 'syncFailed'
      }
      return result
    } catch (error) {
      status.value.lastSyncError = (error as Error).message
      return { success: false, error: (error as Error).message }
    }
    // N-7：不在此处手动置 isSyncing = false，完全依赖 IPC 广播
  }

  async function pull(password?: string) {
    const pwd = password || cachedPassword.value
    if (!pwd) return { success: false, error: 'passwordRequired' }

    try {
      const result = await window.electronAPI.cloudSyncPull(pwd)
      if (result.success) {
        status.value.lastSyncAt = new Date().toISOString()
        status.value.lastSyncError = null
      } else {
        status.value.lastSyncError = result.error || 'pullFailed'
      }
      return result
    } catch (error) {
      status.value.lastSyncError = (error as Error).message
      return { success: false, error: (error as Error).message }
    }
    // N-7：不在此处手动置 isSyncing = false，完全依赖 IPC 广播
  }

  async function push(password?: string) {
    const pwd = password || cachedPassword.value
    if (!pwd) return { success: false, error: 'passwordRequired' }

    try {
      const result = await window.electronAPI.cloudSyncPush(pwd)
      if (result.success) {
        status.value.lastSyncAt = new Date().toISOString()
        status.value.lastSyncError = null
      } else {
        status.value.lastSyncError = result.error || 'pushFailed'
      }
      return result
    } catch (error) {
      status.value.lastSyncError = (error as Error).message
      return { success: false, error: (error as Error).message }
    }
    // N-7：不在此处手动置 isSyncing = false，完全依赖 IPC 广播
  }

  async function clearCloud() {
    try {
      const result = await window.electronAPI.cloudSyncClearCloud()
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to clear cloud:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function loadDevices() {
    isLoadingDevices.value = true
    try {
      const result = await window.electronAPI.cloudSyncGetDevices()
      if (result.success) {
        devices.value = result.devices || []
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to load devices:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      isLoadingDevices.value = false
    }
  }

  async function setDeviceName(name: string) {
    try {
      const result = await window.electronAPI.cloudSyncSetDeviceName(name)
      if (result.success) {
        status.value.deviceName = name
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to set device name:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async function removeDevice(deviceId: string) {
    try {
      const result = await window.electronAPI.cloudSyncRemoveDevice(deviceId)
      if (result.success) {
        devices.value = devices.value.filter(d => d.deviceId !== deviceId)
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to remove device:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  function setSyncEnabled(enabled: boolean) {
    syncEnabled.value = enabled
    localStorage.setItem('iflow_syncEnabled', String(enabled))
  }

  function setAutoSyncEnabled(enabled: boolean) {
    autoSyncEnabled.value = enabled
    localStorage.setItem('iflow_autoSyncEnabled', String(enabled))
  }

  function clearCachedPassword() {
    cachedPassword.value = null
  }

  async function getRememberPassword() {
    try {
      const result = await window.electronAPI.cloudSyncGetRememberPassword()
      if (result.success) {
        rememberPassword.value = result.remember
      }
    } catch (error) {
      console.error('[CloudSync] Failed to get remember password:', error)
    }
  }

  async function setRememberPasswordValue(enabled: boolean) {
    try {
      const result = await window.electronAPI.cloudSyncSetRememberPassword(enabled)
      if (result.success) {
        rememberPassword.value = result.remember
      }
      return result
    } catch (error) {
      console.error('[CloudSync] Failed to set remember password:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  return {
    status,
    devices,
    isLoadingDevices,
    isTestingConnection,
    isSyncing,
    connectionTestResult,
    cachedPassword,
    isConfigured,
    statusText,
    syncEnabled,
    autoSyncEnabled,
    loadStatus,
    setAutoSync,
    setSyncEnabled,
    setAutoSyncEnabled,
    configureProvider,
    testConnection,
    revokeAuth,
    setPassword,
    verifyPassword,
    changePassword,
    hasPassword,
    syncNow,
    pull,
    push,
    clearCloud,
    loadDevices,
    setDeviceName,
    removeDevice,
    clearCachedPassword,
    rememberPassword,
    getRememberPassword,
    setRememberPasswordValue,
  }
})
