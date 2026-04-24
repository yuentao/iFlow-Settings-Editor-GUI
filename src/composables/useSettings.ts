/**
 * 设置管理 Composable
 * 提供类型化的设置加载和保存功能
 */

import type { Settings, IpcResult } from '@/shared/types'

export function useSettings() {
  /**
   * 加载设置
   */
  async function loadSettings(): Promise<IpcResult<Settings>> {
    return await window.electronAPI.loadSettings()
  }

  /**
   * 保存设置
   */
  async function saveSettings(data: Settings): Promise<IpcResult> {
    return await window.electronAPI.saveSettings(data)
  }

  /**
   * 获取开机自启动状态
   */
  async function getAutoLaunch(): Promise<IpcResult<{ enabled: boolean }>> {
    return await window.electronAPI.getAutoLaunch()
  }

  /**
   * 设置开机自启动
   */
  async function setAutoLaunch(enabled: boolean): Promise<IpcResult> {
    return await window.electronAPI.setAutoLaunch(enabled)
  }

  /**
   * 获取自动更新状态
   */
  async function getAutoUpdate(): Promise<IpcResult<{ enabled: boolean }>> {
    return await window.electronAPI.getAutoUpdate()
  }

  /**
   * 设置自动更新
   */
  async function setAutoUpdate(enabled: boolean): Promise<IpcResult> {
    return await window.electronAPI.setAutoUpdate(enabled)
  }

  return {
    loadSettings,
    saveSettings,
    getAutoLaunch,
    setAutoLaunch,
    getAutoUpdate,
    setAutoUpdate,
  }
}