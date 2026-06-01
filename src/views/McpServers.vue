<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('mcp.title') }}</h1>
      <p class="content-desc">{{ $t('mcp.description') }}</p>
    </div>
    <div class="form-group">
      <div class="page-actions">
        <button class="btn btn-primary" @click="$emit('add-server')">
          <Plus size="14" />
          {{ $t('mcp.addServerBtn') }}
        </button>
        <button class="btn btn-secondary" @click="$emit('quick-add')">
          <Lightning size="14" />
          {{ $t('mcp.quickAddBtn') }}
        </button>
      </div>

      <GenericList
        :items="serverList"
        item-key="name"
        :empty-icon="Server"
        :empty-title="$t('mcp.noServers')"
        :empty-description="$t('mcp.addFirstServer')"
        :empty-action-text="$t('mcp.addServerBtn')"
        @action="$emit('add-server')"
      >
        <template #item-info="{ item }">
          <div class="server-name">{{ item.name }}</div>
          <div class="server-desc">{{ item.description || $t('mcp.noDescription') }}</div>
        </template>

        <template #item-actions="{ item }">
          <button class="action-btn" @click.stop="copyServerConfig(item.name)" :title="$t('mcp.share')">
            <Share size="14" />
          </button>
          <button class="action-btn" @click.stop="$emit('edit-server', item.name)" :title="$t('mcp.edit')">
            <Edit size="14" />
          </button>
          <button class="action-btn action-btn-danger" @click.stop="$emit('delete-server', item.name)" :title="$t('mcp.delete')">
            <Delete size="14" />
          </button>
        </template>
      </GenericList>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Server, Plus, Lightning, Delete, Edit, Share } from '@icon-park/vue-next'
import GenericList from '@/components/GenericList.vue'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  servers: {
    type: Object,
    default: () => ({})
  },
  serverCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['add-server', 'quick-add', 'edit-server', 'delete-server'])

const { t } = useI18n()
const toast = useToast()

const copyServerConfig = async (name) => {
  const config = props.servers[name]
  if (config) {
    const { _lastModified, ...cleanConfig } = config
    const json = JSON.stringify({ mcpServers: { [name]: cleanConfig } }, null, 2)
    await navigator.clipboard.writeText(json)
    toast.success(t('mcp.copied'))
  }
}

const serverList = computed(() =>
  Object.entries(props.servers).map(([name, config]) => ({
    name,
    description: config.description,
  }))
)
</script>

<style lang="less" scoped>
.page-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.server-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.server-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>