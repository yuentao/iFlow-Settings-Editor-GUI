/**
 * Mock for vue-i18n
 * 在测试环境中提供 useI18n() 支持
 */
import { ref } from 'vue'

const locale = ref('zh-CN')

export function useI18n() {
  return {
    t: (key, params) => {
      if (params) {
        let result = key
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v))
        }
        return result
      }
      return key
    },
    locale,
    availableLocales: ['zh-CN', 'en-US', 'ja-JP'],
    fallbackLocale: 'zh-CN',
  }
}

export function createI18n() {
  return {
    global: {
      locale: locale,
    },
    install(app) {
      app.config.globalProperties.$t = (key) => key
    },
  }
}

export default { useI18n, createI18n }