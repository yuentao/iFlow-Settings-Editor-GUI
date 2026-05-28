import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLocale, SUPPORTED_LOCALES, getLocaleDisplayName } from './useLocale'

describe('useLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      notifyLanguageChanged: vi.fn(),
      sendTranslation: vi.fn(),
    } as any
  })

  it('should default to zh-CN', () => {
    const { currentLocale } = useLocale()
    expect(currentLocale.value).toBe('zh-CN')
  })

  it('should change locale', () => {
    const { currentLocale, setLocale } = useLocale()
    setLocale('en-US')
    expect(currentLocale.value).toBe('en-US')
  })

  it('should support all three locales', () => {
    const { currentLocale, setLocale } = useLocale()

    setLocale('zh-CN')
    expect(currentLocale.value).toBe('zh-CN')

    setLocale('en-US')
    expect(currentLocale.value).toBe('en-US')

    setLocale('ja-JP')
    expect(currentLocale.value).toBe('ja-JP')
  })

  it('should notify main process on locale change', () => {
    const { setLocale } = useLocale()
    setLocale('en-US')
    expect(window.electronAPI.notifyLanguageChanged).toHaveBeenCalledTimes(1)
  })

  it('should expose SUPPORTED_LOCALES', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(3)
    expect(SUPPORTED_LOCALES[0].code).toBe('zh-CN')
    expect(SUPPORTED_LOCALES[1].code).toBe('en-US')
    expect(SUPPORTED_LOCALES[2].code).toBe('ja-JP')
  })

  it('should get locale display name', () => {
    expect(getLocaleDisplayName('zh-CN')).toBe('简体中文')
    expect(getLocaleDisplayName('en-US')).toBe('English')
    expect(getLocaleDisplayName('ja-JP')).toBe('日本語')
  })

  it('should return code for unknown locale', () => {
    expect(getLocaleDisplayName('fr-FR' as any)).toBe('fr-FR')
  })

  it('should send translation data', () => {
    const { sendTranslation } = useLocale()
    sendTranslation({ key: 'value' })
    expect(window.electronAPI.sendTranslation).toHaveBeenCalledWith({ key: 'value' })
  })
})