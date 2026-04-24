<template>
  <div class="skeleton-wrapper">
    <div v-if="type === 'card'" class="skeleton-card-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
      <div v-for="i in count" :key="i" class="skeleton-card">
        <div class="skeleton-circle"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line skeleton-line-label"></div>
          <div class="skeleton-line skeleton-line-value"></div>
          <div class="skeleton-line skeleton-line-sub"></div>
        </div>
      </div>
    </div>

    <div v-else-if="type === 'list'" class="skeleton-list">
      <div v-for="i in count" :key="i" class="skeleton-list-item">
        <div class="skeleton-circle skeleton-circle-sm"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-desc"></div>
        </div>
      </div>
    </div>

    <div v-else-if="type === 'profile'" class="skeleton-list">
      <div v-for="i in count" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-desc"></div>
        </div>
        <div class="skeleton-badge"></div>
      </div>
    </div>

    <div v-else-if="type === 'form'" class="skeleton-form">
      <div v-for="i in count" :key="i" class="skeleton-form-group">
        <div class="skeleton-line skeleton-line-label"></div>
        <div class="skeleton-input"></div>
      </div>
    </div>

    <div v-else-if="type === 'command'" class="skeleton-list">
      <div v-for="i in count" :key="i" class="skeleton-list-item">
        <div class="skeleton-circle skeleton-circle-sm"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line skeleton-line-title"></div>
          <div class="skeleton-line skeleton-line-desc"></div>
          <div class="skeleton-line skeleton-line-meta"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'card',
    validator: (v) => ['card', 'list', 'profile', 'form', 'command'].includes(v),
  },
  count: {
    type: Number,
    default: 4,
  },
  columns: {
    type: Number,
    default: 2,
  },
})
</script>

<style lang="less" scoped>
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shape() {
  border-radius: var(--radius);
  background: linear-gradient(
    90deg,
    var(--control-fill) 25%,
    var(--control-fill-hover) 37%,
    var(--control-fill) 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

// Card grid
.skeleton-card-grid {
  display: grid;
  gap: var(--space-lg);
}

.skeleton-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  min-height: 120px;
}

.skeleton-circle {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
  .skeleton-shape();
}

.skeleton-circle-sm {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
}

.skeleton-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  .skeleton-shape();
}

.skeleton-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  .skeleton-shape();
  height: 12px;
}

.skeleton-line-label {
  width: 60px;
  height: 10px;
}

.skeleton-line-value {
  width: 80px;
  height: 28px;
  border-radius: var(--radius-sm);
}

.skeleton-line-sub {
  width: 50px;
  height: 10px;
}

.skeleton-line-title {
  width: 45%;
  height: 14px;
}

.skeleton-line-desc {
  width: 70%;
  height: 11px;
}

.skeleton-line-meta {
  width: 55%;
  height: 10px;
}

.skeleton-badge {
  width: 60px;
  height: 22px;
  border-radius: 12px;
  flex-shrink: 0;
  .skeleton-shape();
}

// List
.skeleton-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  gap: 14px;

  &:last-child {
    border-bottom: none;
  }
}

// Form
.skeleton-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.skeleton-form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.skeleton-input {
  width: 100%;
  height: 36px;
  border-radius: var(--radius);
  .skeleton-shape();
}
</style>
