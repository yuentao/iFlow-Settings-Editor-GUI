import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import zhCN from './locales/index.js'
import enUS from './locales/en-US.js'
import jaJP from './locales/ja-JP.js'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP
  }
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
