<template>
  <div class="generic-list-wrapper">
    <!-- Category Filter -->
    <div v-if="categories && categories.length > 0" class="category-filter">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="category-btn"
        :class="{ active: selectedCategory === cat.value }"
        @click="$emit('update:selectedCategory', cat.value)"
      >
        {{ cat.label }}
        <span class="category-count">{{ cat.count ?? 0 }}</span>
      </button>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="loading" :type="skeletonType" :count="skeletonCount" />

    <!-- List -->
    <div v-else-if="items.length > 0" class="generic-list">
      <div
        v-for="(item, index) in items"
        :key="item[itemKey || 'id']"
      >
        <div
          class="generic-item"
          :class="itemClass(item)"
          @click="$emit('item-click', item)"
        >
          <!-- Prefix (e.g. enable index) -->
          <div class="item-prefix" v-if="$slots['item-prefix']">
            <slot name="item-prefix" :item="item" :index="index" />
          </div>

          <!-- Icon -->
          <div class="item-icon" v-if="$slots['item-icon']">
            <slot name="item-icon" :item="item" :index="index" />
          </div>

          <!-- Info -->
          <div class="item-info">
            <slot name="item-info" :item="item" :index="index" />
          </div>

          <!-- Actions -->
          <div class="item-actions" v-if="$slots['item-actions']">
            <slot name="item-actions" :item="item" :index="index" />
          </div>

          <!-- Extra -->
          <div class="item-extra" v-if="$slots['item-extra']">
            <slot name="item-extra" :item="item" :index="index" />
          </div>
        </div>

        <!-- Children (展开的子内容) -->
        <div v-if="$slots['item-children']" class="item-children">
          <slot name="item-children" :item="item" :index="index" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
      :actionText="emptyActionText"
      embedded
      @action="$emit('action')"
    />
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const props = defineProps<{
  /** 列表数据 */
  items: any[]
  /** 列表项的唯一标识字段名 */
  itemKey?: string
  /** 是否加载中 */
  loading?: boolean
  /** 骨架屏数量 */
  skeletonCount?: number
  /** 骨架屏类型 */
  skeletonType?: string
  /** 空状态图标组件 */
  emptyIcon?: any
  /** 空状态标题 */
  emptyTitle?: string
  /** 空状态描述 */
  emptyDescription?: string
  /** 空状态操作按钮文本 */
  emptyActionText?: string
  /**
   * 判断列表项高亮样式的函数，返回 CSS class 对象
   * 接收 item，返回 { className: boolean }
   */
  highlightFn?: (item: any) => Record<string, boolean>
  /** 分类过滤选项 [{ value, label, count }] */
  categories?: any[] | null
  /** 当前选中的分类 */
  selectedCategory?: string
}>()

defineEmits<{
  'action': []
  'update:selectedCategory': [value: string]
  'item-click': [item: any]
}>()

defineSlots<{
  'item-prefix'(props: { item: any; index: number }): any
  'item-icon'(props: { item: any; index: number }): any
  'item-info'(props: { item: any; index: number }): any
  'item-actions'(props: { item: any; index: number }): any
  'item-extra'(props: { item: any; index: number }): any
  'item-children'(props: { item: any; index: number }): any
}>()

const itemClass = (item: any): Record<string, boolean> => {
  const cls: Record<string, boolean> = {}
  if (props.highlightFn) {
    Object.assign(cls, props.highlightFn(item))
  }
  return cls
}
</script>

<style lang="less" scoped>
.category-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius);
  background: var(--control-fill);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
    border-color: var(--border-hover);
  }

  &.active {
    background: var(--accent-light);
    border-color: var(--accent);
    color: var(--accent);
  }

  .category-count {
    background: var(--bg-primary);
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
  }
}

.generic-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

.generic-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  transition: all var(--transition-fast) var(--ease-out);
  cursor: pointer;
  animation: genericFadeIn var(--duration-slow) var(--ease-out) backwards;

  &:nth-child(1) { animation-delay: 0.02s; }
  &:nth-child(2) { animation-delay: 0.04s; }
  &:nth-child(3) { animation-delay: 0.06s; }
  &:nth-child(4) { animation-delay: 0.08s; }
  &:nth-child(5) { animation-delay: 0.1s; }
  &:nth-child(6) { animation-delay: 0.12s; }
  &:nth-child(7) { animation-delay: 0.14s; }
  &:nth-child(8) { animation-delay: 0.16s; }

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--control-fill);

    .item-actions {
      opacity: 1;
    }
  }

  &.highlighted {
    border-left: 3px solid var(--accent);
    padding-left: 13px;
    border-bottom: 1px solid var(--border-light);
  }
}

.item-prefix {
  display: flex;
  align-items: center;
  margin-right: 8px;
  flex-shrink: 0;
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast) var(--ease-out);
  flex-shrink: 0;
}

.item-extra {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 8px;
}

.item-children {
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
}

@keyframes genericFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
