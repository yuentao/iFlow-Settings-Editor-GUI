/* global window, console */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n } from './i18n'

window.addEventListener('error', event => {
  console.error('[Renderer Error]', event.error || event.message)
})

window.addEventListener('unhandledrejection', event => {
  console.error('[Unhandled Promise Rejection]', event.reason)
})

const pinia = createPinia()

const app = createApp(App)
app.use(pinia)
app.use(i18n)
app.mount('#app')