<template>
  <section class="projects-view">
    <div class="content-header">
      <h1 class="content-title">{{ $t('projects.title') }}</h1>
      <p class="content-desc">{{ $t('projects.description') }}</p>
    </div>

    <!-- 项目列表 -->
    <div class="projects-content">
      <GenericList :items="store.projects" item-key="id" :loading="isLoadingProjects" :empty-icon="TopicDiscussion" :empty-title="$t('projects.noProjects')" :highlight-fn="projectHighlightFn">
        <template #item-icon>
          <TopicDiscussion size="20" />
        </template>

        <template #item-info="{ item: project }">
          <div class="project-info-clickable" @click="toggleProject(project)">
            <div class="project-name">
              {{ project.name }}
            </div>
            <div class="project-meta">
              <span class="meta-item">
                <Communication size="12" />
                {{ $t('projects.sessionCount', { count: project.sessionCount }) }}
              </span>
              <span class="meta-item">
                <AlarmClock size="12" />
                {{ formatRelativeTime(project.lastActive) }}
              </span>
            </div>
          </div>
        </template>

        <template #item-actions="{ item: project }">
          <button class="action-btn danger" :title="$t('projects.deleteProject')" :aria-label="$t('projects.deleteProject')" @click.stop="handleDeleteProject(project)">
            <Delete size="14" />
          </button>
        </template>

        <template #item-extra="{ item: project }">
          <div class="project-arrow" :class="{ rotated: expandedProjectId === project.id }">
            <Right size="14" />
          </div>
        </template>

        <template #item-children="{ item: project }">
          <ProjectSessionList
            v-if="expandedProjectId === project.id"
            :sessions="store.sessions"
            :loading="isLoadingSessions && store.sessions.length === 0"
            :has-more="sessionsHasMore"
            :loading-more="isLoadingSessions"
            @open-session="openSession"
            @export-session="handleExport"
            @delete-session="handleDeleteSession"
            @load-more="loadMoreSessions" />
        </template>
      </GenericList>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog v-if="confirmState.show" :title-key="confirmState.titleKey" :message-key="confirmState.messageKey" :message-params="confirmState.messageParams" :danger="confirmState.danger" @confirm="handleConfirm" @cancel="closeConfirm" />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectsStore } from '@/stores/projects'
import type { Project, SessionSummary } from '@/stores/projects'
import { useToast } from '@/composables/useToast'
import GenericList from '@/components/GenericList.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ProjectSessionList from '@/components/ProjectSessionList.vue'
import { TopicDiscussion,Communication, AlarmClock, Right, Delete } from '@icon-park/vue-next'

const { t } = useI18n()
const store = useProjectsStore()
const toast = useToast()

const emit = defineEmits<{
  openSession: [project: Project, session: SessionSummary]
}>()

const expandedProjectId = ref<string | null>(null)

const confirmState = ref<{
  show: boolean
  titleKey: string
  messageKey: string
  messageParams: Record<string, unknown>
  danger: boolean
  onConfirm: () => void
}>({
  show: false,
  titleKey: 'messages.warning',
  messageKey: '',
  messageParams: {},
  danger: false,
  onConfirm: () => {},
})
const isLoadingProjects = computed(() => store.isLoadingProjects)
const isLoadingSessions = computed(() => store.isLoadingSessions)
const sessionsHasMore = computed(() => store.sessionsHasMore)

function projectHighlightFn(project: Project) {
  return { highlighted: expandedProjectId.value === project.id }
}

async function toggleProject(project: Project) {
  if (expandedProjectId.value === project.id) {
    expandedProjectId.value = null
    store.resetSessions()
    return
  }
  expandedProjectId.value = project.id
  store.currentProject = project
  store.resetSessions()
  await store.loadSessions(project.id, { limit: 20, sortBy: 'lastActive', sortOrder: 'desc' })
  await nextTick()
  const el = document.querySelector('.sessions-section')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function openSession(session: SessionSummary) {
  const project = store.currentProject
  if (project) {
    emit('openSession', project, session)
  }
}

async function loadMoreSessions() {
  if (!expandedProjectId.value) return
  await store.loadSessions(expandedProjectId.value, {
    offset: store.sessions.length,
    limit: 20,
    sortBy: 'lastActive',
    sortOrder: 'desc',
  })
}

async function handleExport(session: SessionSummary) {
  if (!expandedProjectId.value) return
  const result = await store.exportSessionAction(expandedProjectId.value, session.id, 'markdown')
  if (result.success) {
    toast.success(t('projects.exportSuccess'))
  } else if (!result.cancelled) {
    toast.error(t('projects.exportFailed') + ': ' + (result.error || ''))
  }
}

async function handleDeleteSession(session: SessionSummary) {
  if (!expandedProjectId.value) return
  confirmState.value = {
    show: true,
    titleKey: 'messages.warning',
    messageKey: 'projects.deleteConfirm',
    messageParams: {},
    danger: true,
    onConfirm: async () => {
      const result = await store.deleteSessionAction(expandedProjectId.value!, session.id)
      if (result.success) {
        toast.success(t('projects.deleteSuccess'))
        // 从 store 的 sessions 数组重新计算实际数量
        const project = store.projects.find(p => p.id === expandedProjectId.value)
        if (project) {
          project.sessionCount = store.sessions.length
        }
      } else {
        toast.error(t('projects.deleteFailed') + ': ' + (result.error || ''))
      }
    },
  }
}

async function handleDeleteProject(project: Project) {
  confirmState.value = {
    show: true,
    titleKey: 'messages.warning',
    messageKey: 'projects.deleteProjectConfirm',
    messageParams: { name: project.name, count: project.sessionCount },
    danger: true,
    onConfirm: async () => {
      const result = await store.deleteProjectAction(project.id)
      if (result.success) {
        toast.success(t('projects.deleteProjectSuccess'))
      } else {
        toast.error(t('projects.deleteProjectFailed') + ': ' + (result.error || ''))
      }
    },
  }
}

function handleConfirm() {
  const callback = confirmState.value.onConfirm
  confirmState.value.show = false
  callback()
}

function closeConfirm() {
  confirmState.value.show = false
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('projects.justNow')
  if (minutes < 60) return t('projects.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('projects.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return t('projects.daysAgo', { count: days })
  return formatDateTime(dateStr)
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

onMounted(async () => {
  await store.loadProjects()
})

onUnmounted(() => {
  store.resetSessions()
  expandedProjectId.value = null
})
</script>

<style lang="less" scoped>
.projects-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.projects-content {
  flex: 1;
  padding: 0 0 16px;
}

// 项目列表项内容
.project-info-clickable {
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.15s ease;

  &:hover {
    .project-name {
      color: var(--accent);
    }
  }
}

.project-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.project-arrow {
  color: var(--text-tertiary);
  transition:
    transform 0.2s ease,
    color 0.15s ease;
  display: flex;
  align-items: center;
  padding: 4px;

  &.rotated {
    transform: rotate(90deg);
    color: var(--accent);
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
    color: var(--text-primary);
  }

  &.danger:hover {
    background: rgba(196, 49, 49, 0.1);
    color: var(--danger, #c43131);
  }
}
</style>
