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

if (!window.electronAPI) {
  window.electronAPI = {}
}

Object.assign(window.electronAPI, {
  getAppVersion: window.electronAPI.getAppVersion || (() => Promise.resolve({ success: true, version: '1.21.0' })),
  onUpdateStatusChanged: window.electronAPI.onUpdateStatusChanged || (() => createNoopUnsubscribe()),
  onUpdateAvailable: window.electronAPI.onUpdateAvailable || (() => createNoopUnsubscribe()),
  onUpdateDownloadProgress: window.electronAPI.onUpdateDownloadProgress || (() => createNoopUnsubscribe()),
  onUpdateDownloaded: window.electronAPI.onUpdateDownloaded || (() => createNoopUnsubscribe()),
  onAutoCheckUpdate: window.electronAPI.onAutoCheckUpdate || (() => createNoopUnsubscribe()),
  onInstallUpdate: window.electronAPI.onInstallUpdate || (() => createNoopUnsubscribe()),
  onUpdateBackgroundComplete: window.electronAPI.onUpdateBackgroundComplete || (() => createNoopUnsubscribe()),
  onShowConfirmRequest: window.electronAPI.onShowConfirmRequest || (() => createNoopUnsubscribe()),
  onApiProfileSwitched: window.electronAPI.onApiProfileSwitched || (() => createNoopUnsubscribe()),
  onSettingsFileChanged: window.electronAPI.onSettingsFileChanged || (() => createNoopUnsubscribe()),
  confirmDialogResult: window.electronAPI.confirmDialogResult || (() => {}),
  restorePendingUpdate: window.electronAPI.restorePendingUpdate || (() => Promise.resolve({ success: true, hasPending: false })),
  loadSettings: window.electronAPI.loadSettings || (() => Promise.resolve({ apiProfiles: { default: {} }, currentApiProfile: 'default', mcpServers: {} })),
  saveSettings: window.electronAPI.saveSettings || (() => Promise.resolve({ success: true })),
  listApiProfiles: window.electronAPI.listApiProfiles || (() => Promise.resolve({ success: true, profiles: [{ name: 'default' }], current: 'default' })),
  switchApiProfile: window.electronAPI.switchApiProfile || (() => Promise.resolve({ success: true })),
  createApiProfile: window.electronAPI.createApiProfile || (() => Promise.resolve({ success: true })),
  deleteApiProfile: window.electronAPI.deleteApiProfile || (() => Promise.resolve({ success: true })),
  duplicateApiProfile: window.electronAPI.duplicateApiProfile || (() => Promise.resolve({ success: true })),
  renameApiProfile: window.electronAPI.renameApiProfile || (() => Promise.resolve({ success: true })),
  listSkills: window.electronAPI.listSkills || (() => Promise.resolve({ success: true, skills: [] })),
  listCommands: window.electronAPI.listCommands || (() => Promise.resolve({ success: true, commands: [] })),
  iflowListMods: window.electronAPI.iflowListMods || (() => Promise.resolve({ success: true, mods: [] })),
  iflowCheckIflowStatus: window.electronAPI.iflowCheckIflowStatus || (() => Promise.resolve({ success: true, exists: false, path: '', version: null })),
  onIflowApplyProgress: window.electronAPI.onIflowApplyProgress || (() => createNoopUnsubscribe()),
  onIflowDetectConflictsProgress: window.electronAPI.onIflowDetectConflictsProgress || (() => createNoopUnsubscribe()),
  listProjects: window.electronAPI.listProjects || (() => Promise.resolve({ success: true, projects: [] })),
  getProjectSessions: window.electronAPI.getProjectSessions || (() => Promise.resolve({ success: true, sessions: [], hasMore: false })),
  getAllSessionMessagesForStats: window.electronAPI.getAllSessionMessagesForStats || (() => Promise.resolve({ success: true, messages: [] })),
  cloudSyncGetStatus: window.electronAPI.cloudSyncGetStatus || (() => Promise.resolve({ success: true, configured: false, enabled: false })),
  notifyLanguageChanged: window.electronAPI.notifyLanguageChanged || (() => {}),
})

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
