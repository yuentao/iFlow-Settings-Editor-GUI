<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('api.title') }}</h1>
      <p class="content-desc">{{ $t('api.description') }}</p>
    </div>
    <div class="form-group">
      <div class="page-actions">
        <button class="btn btn-primary" @click="$emit('create-profile')">
          <Add size="14" />
          {{ $t('api.newProfile') }}
        </button>
      </div>
    </div>
    <div class="card" v-if="profiles.length > 0">
      <div class="profile-list">
        <div
          v-for="(profile, index) in profiles"
          :key="profile.name"
          class="profile-item"
          :class="{ active: currentProfile === profile.name, dragging: dragIndex === index }"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover.prevent="onDragOver(index)"
          @drop="onDrop(index)"
          @dragend="onDragEnd"
          @click="$emit('select-profile', profile.name)"
        >
          <div class="drag-handle" :title="$t('api.dragToSort')">
                        ⋮⋮
                      </div>          <div class="profile-icon" :style="getProfileIconStyle(profile.name)">
            <span class="profile-icon-text">{{ getProfileInitial(profile.name) }}</span>
          </div>
          <div class="profile-info">
            <div class="profile-name">{{ profile.name }}</div>
            <div class="profile-url">{{ getProfileUrl(profile.name) }}</div>
          </div>
          <div class="profile-status" v-if="currentProfile === profile.name">
            <span class="status-badge">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,8 6,11 13,4"></polyline>
              </svg>
              {{ $t('api.inUse') }}
            </span>
          </div>
          <div class="profile-actions">
            <button class="action-btn" @click.stop="$emit('edit-profile', profile.name)" :title="$t('api.edit')">
              <Edit size="14" />
            </button>
            <button class="action-btn" @click.stop="$emit('duplicate-profile', profile.name)" :title="$t('api.duplicate')">
              <Copy size="14" />
            </button>
            <button class="action-btn action-btn-danger" v-if="profile.name !== 'default'" @click.stop="$emit('delete-profile', profile.name)" :title="$t('api.delete')">
              <Delete size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      :icon="Exchange"
      :title="$t('api.noProfiles')"
      :description="$t('api.addFirstProfile')"
      :actionText="$t('api.newProfile')"
      embedded
      @action="$emit('create-profile')"
    />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Add, Edit, Delete, Exchange, Copy } from '@icon-park/vue-next'
import EmptyState from '@/components/EmptyState.vue'

const props = defineProps({
  profiles: {
    type: Array,
    default: () => [],
  },
  currentProfile: {
    type: String,
    default: 'default',
  },
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['create-profile', 'select-profile', 'edit-profile', 'duplicate-profile', 'delete-profile', 'reorder-profiles'])
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

const onDragStart = (index) => {
  dragIndex.value = index
}

const onDragOver = (index) => {
  dragOverIndex.value = index
}

const onDrop = (index) => {
  if (dragIndex.value !== -1 && dragIndex.value !== index) {
    const newProfiles = [...props.profiles]
    const [removed] = newProfiles.splice(dragIndex.value, 1)
    newProfiles.splice(index, 0, removed)
    // 通过emit通知父组件排序变化
    emit('reorder-profiles', newProfiles)
  }
  dragIndex.value = -1
  dragOverIndex.value = -1
}

const onDragEnd = () => {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

const profileColors = [
  'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
  'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
]

const getProfileInitial = name => (name ? name.charAt(0).toUpperCase() : '?')

const getProfileUrl = name => {
  if (!props.settings.apiProfiles || !props.settings.apiProfiles[name]) {
    return ''
  }
  const profile = props.settings.apiProfiles[name]
  return profile.baseUrl || ''
}

const getProfileIconStyle = name => {
  if (name === 'default') {
    return { background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }
  }
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % profileColors.length
  return { background: profileColors[index] }
}
</script>

<style lang="less" scoped>
.page-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

// Windows 11 Style Profile List - Fluent Design
.profile-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;
  animation: fadeIn 0.3s ease backwards;

  &:nth-child(1) {
    animation-delay: 0.02s;
  }
  &:nth-child(2) {
    animation-delay: 0.04s;
  }
  &:nth-child(3) {
    animation-delay: 0.06s;
  }
  &:nth-child(4) {
    animation-delay: 0.08s;
  }
  &:nth-child(5) {
    animation-delay: 0.1s;
  }

  &:hover {
    background: var(--control-fill);
    border-color: var(--border);
    transform: translateX(2px);
  }

  &.active {
    background: var(--accent-light);
    border-color: var(--accent);
    box-shadow: var(--shadow-sm);
  }

  &.dragging {
    opacity: 0.5;
    transform: scale(1.02);
  }
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  margin-right: 4px;
  color: var(--text-tertiary);
  cursor: grab;
  border-radius: var(--radius);
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-secondary);
    background: var(--control-fill);
  }

  &:active {
    cursor: grabbing;
  }
}

.profile-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-icon-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.profile-info {
  flex: 1;
  min-width: 0;
  margin-left: 12px;
}

.profile-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.profile-url {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-status {
  margin-left: 10px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius);
  font-size: 11px;
  font-weight: 500;

  svg {
    width: 10px;
    height: 10px;
  }
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;

  .profile-item:hover &,
  .profile-item.active & {
    opacity: 1;
  }
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.1s ease;

  &:hover {
    background: var(--control-fill);
    color: var(--text-primary);
  }

  &.action-btn-danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
  align-self: flex-end;
}
</style>
