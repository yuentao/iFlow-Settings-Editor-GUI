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

const createNoopUnsubscribe = () => () => {}

// contextBridge.exposeInMainWorld() exposes a frozen (read-only) object.
// Object.assign on it throws "Cannot assign to read only property".
// Only install mock fallbacks when running outside Electron (browser dev mode).
if (!window.electronAPI) {
  window.electronAPI = {
    getAppVersion: () => Promise.resolve({ success: true, version: '1.21.0' }),
    onUpdateStatusChanged: () => createNoopUnsubscribe(),
    onUpdateAvailable: () => createNoopUnsubscribe(),
    onUpdateDownloadProgress: () => createNoopUnsubscribe(),
    onUpdateDownloaded: () => createNoopUnsubscribe(),
    onAutoCheckUpdate: () => createNoopUnsubscribe(),
    onInstallUpdate: () => createNoopUnsubscribe(),
    onUpdateBackgroundComplete: () => createNoopUnsubscribe(),
    onShowConfirmRequest: () => createNoopUnsubscribe(),
    onApiProfileSwitched: () => createNoopUnsubscribe(),
    onSettingsFileChanged: () => createNoopUnsubscribe(),
    confirmDialogResult: () => {},
    restorePendingUpdate: () => Promise.resolve({ success: true, hasPending: false }),
    loadSettings: () => Promise.resolve({ apiProfiles: { default: {} }, currentApiProfile: 'default', mcpServers: {} }),
    saveSettings: () => Promise.resolve({ success: true }),
    listApiProfiles: () => Promise.resolve({ success: true, profiles: [{ name: 'default' }], current: 'default' }),
    switchApiProfile: () => Promise.resolve({ success: true }),
    createApiProfile: () => Promise.resolve({ success: true }),
    deleteApiProfile: () => Promise.resolve({ success: true }),
    duplicateApiProfile: () => Promise.resolve({ success: true }),
    renameApiProfile: () => Promise.resolve({ success: true }),
    listSkills: () => Promise.resolve({ success: true, skills: [] }),
    listCommands: () => Promise.resolve({ success: true, commands: [] }),
    iflowListMods: () => Promise.resolve({ success: true, mods: [] }),
    iflowCheckIflowStatus: () => Promise.resolve({ success: true, exists: false, path: '', version: null }),
    onIflowApplyProgress: () => createNoopUnsubscribe(),
    onIflowDetectConflictsProgress: () => createNoopUnsubscribe(),
    listProjects: () => Promise.resolve({ success: true, projects: [] }),
    getProjectSessions: () => Promise.resolve({ success: true, sessions: [], hasMore: false }),
    getAllSessionMessagesForStats: () => Promise.resolve({ success: true, messages: [] }),
    cloudSyncGetStatus: () => Promise.resolve({ success: true, configured: false, enabled: false }),
    notifyLanguageChanged: () => {},
  }
}

const pinia = createPinia()

const app = createApp(App)

const updateRevealPosition = (el, event) => {
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  el.style.setProperty('--reveal-x', `${((event.clientX - rect.left) / rect.width) * 100}%`)
  el.style.setProperty('--reveal-y', `${((event.clientY - rect.top) / rect.height) * 100}%`)
}

app.directive('reveal', {
  mounted(el) {
    const onMouseMove = event => updateRevealPosition(el, event)
    el.__iflowRevealHandler = onMouseMove
    el.addEventListener('mousemove', onMouseMove)
  },
  unmounted(el) {
    if (el.__iflowRevealHandler) {
      el.removeEventListener('mousemove', el.__iflowRevealHandler)
      delete el.__iflowRevealHandler
    }
  },
})

window.document.addEventListener('mousemove', event => {
  const target = event.target instanceof window.Element ? event.target.closest('.btn') : null
  if (target) updateRevealPosition(target, event)
})

app.use(pinia)
app.use(i18n)
app.mount('#app')
