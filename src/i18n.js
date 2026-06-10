import { createI18n } from 'vue-i18n'
import zhCN from './locales/index.js'
import enUS from './locales/en-US.js'
import jaJP from './locales/ja-JP.js'

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP,
  }
})