/**
 * 国际化 Composable
 * 提供类型化的多语言支持
 */

import { ref } from 'vue'
import type { IpcResult } from '@/shared/types'

export type SupportedLocale = 'zh-CN' | 'en-US' | 'ja-JP'

export interface LocaleInfo {
  code: SupportedLocale
  name: string
  nativeName: string
}

// 支持的语言列表
export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'zh-CN', name: 'Chinese', nativeName: '简体中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
]

/**
 * 获取当前语言环境的显示名称
 */
export function getLocaleDisplayName(code: SupportedLocale): string {
  const locale = SUPPORTED_LOCALES.find(l => l.code === code)
  return locale?.nativeName || code
}

export function useLocale() {
  const currentLocale = ref<SupportedLocale>('zh-CN')

  /**
   * 通知主进程语言已切换
   */
  function notifyLanguageChanged(): void {
    window.electronAPI.notifyLanguageChanged()
  }

  /**
   * 发送翻译数据给主进程
   */
  function sendTranslation(translations: Record<string, unknown>): void {
    window.electronAPI.sendTranslation(translations)
  }

  /**
   * 设置当前语言
   */
  function setLocale(locale: SupportedLocale): void {
    currentLocale.value = locale
    notifyLanguageChanged()
  }

  return {
    currentLocale,
    setLocale,
    notifyLanguageChanged,
    sendTranslation,
    SUPPORTED_LOCALES,
    getLocaleDisplayName,
  }
}