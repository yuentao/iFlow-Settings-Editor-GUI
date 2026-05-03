<template>
  <section class="docs-view">
    <!-- 文档内容区域 -->
    <main class="docs-content" ref="contentRef">
      <!-- TOC 目录（sticky 定位，随内容浮动） -->
      <aside v-if="tocItems.length > 0" :class="['docs-toc', { 'docs-toc-hidden': !tocVisible }]">
        <h4 class="docs-toc-title">{{ t('docs.toc') }}</h4>
        <ul class="docs-toc-list">
          <li v-for="item in tocItems" :key="item.id" :class="['docs-toc-item', `toc-h${item.level}`, { active: activeHeadingId === item.id }]" @click="scrollToHeading(item.id)">
            {{ item.text }}
          </li>
        </ul>
      </aside>

      <div class="docs-content-inner">
        <div v-if="isLoading" class="docs-loading">
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
          <div class="skeleton-text shorter"></div>
        </div>
        <div v-else-if="error" class="docs-error">
          <div class="docs-error-icon">!</div>
          <p class="docs-error-msg">{{ error }}</p>
          <button class="docs-error-btn" @click="loadDoc(currentDoc)">{{ $t('docs.retry') }}</button>
        </div>
        <div v-else v-html="renderedContent" class="markdown-body"></div>
      </div>
    </main>

    <!-- 文档导航侧边栏（默认收起为标识条，hover 展开） -->
    <aside class="docs-nav">
      <div class="docs-nav-stripe"></div>
      <div class="docs-nav-body">
        <div class="docs-nav-header">
          <h1 class="docs-nav-heading">{{ $t('docs.title') }}</h1>
        </div>

        <div class="docs-nav-scroll">
          <div v-for="section in navSections" :key="section.titleKey" class="docs-nav-section">
            <h3 class="docs-nav-title">{{ t(section.titleKey) }}</h3>
            <ul class="docs-nav-list">
              <li v-for="item in section.items" :key="item.key" :class="{ active: currentDoc === item.key }" @click="navigateTo(item.key)">
                <span class="nav-indicator"></span>
                {{ t(item.labelKey) }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'

const { t } = useI18n()

const currentDoc = ref('quickstart')
const isLoading = ref(false)
const error = ref('')
const renderedContent = ref('')
const contentRef = ref<HTMLElement | null>(null)

// ── TOC 目录 ────────────────────────────────────────────
interface TocItem {
  id: string
  text: string
  level: number
}

const tocItems = ref<TocItem[]>([])
const activeHeadingId = ref('')
let headingCounter = 0
let observer: IntersectionObserver | null = null

// ── 导航栏配置 ──────────────────────────────────────────
// 导航栏默认收起为左侧标识条，hover 时 CSS 展开展开，无需 JS 控制

// 配置 marked：自定义 heading renderer，生成 id 并收集 TOC 数据
marked.use({
  renderer: {
    heading({ tokens, depth }: { tokens: any[]; depth: number }) {
      const text = (this as any).parser.parseInline(tokens)
      const id = `toc-heading-${headingCounter++}`
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
  },
})

// 导航配置（数据驱动，合并路径）
const navSections = computed(() => [
  {
    titleKey: 'docs.quickStart',
    items: [{ key: 'quickstart', labelKey: 'docs.quickStart', path: '/docs/quickstart.md' }],
  },
  {
    titleKey: 'docs.coreFeatures',
    items: [
      { key: 'basic-usage', labelKey: 'docs.basicUsage', path: '/docs/examples/basic-usage.md' },
      { key: 'interactive', labelKey: 'docs.interactiveMode', path: '/docs/features/interactive.md' },
      { key: 'keyboard-shortcuts', labelKey: 'docs.keyboardShortcuts', path: '/docs/examples/keyboard-shortcuts.md' },
    ],
  },
  {
    titleKey: 'docs.advancedFeatures',
    items: [
      { key: 'slash-commands', labelKey: 'docs.slashCommands', path: '/docs/examples/slash-commands.md' },
      { key: 'mcp', labelKey: 'docs.mcp', path: '/docs/examples/mcp.md' },
      { key: 'subagent', labelKey: 'docs.subAgent', path: '/docs/examples/subagent.md' },
      { key: 'subcommand', labelKey: 'docs.subCommand', path: '/docs/examples/subcommand.md' },
      { key: 'hooks', labelKey: 'docs.hooks', path: '/docs/examples/hooks.md' },
      { key: 'workflow', labelKey: 'docs.workflow', path: '/docs/examples/workflow.md' },
      { key: 'skill', labelKey: 'docs.skill', path: '/docs/examples/skill.md' },
      { key: 'plan-mode', labelKey: 'docs.planMode', path: '/docs/examples/plan-mode.md' },
    ],
  },
  {
    titleKey: 'docs.configuration',
    items: [{ key: 'settings', labelKey: 'docs.cliConfig', path: '/docs/configuration/settings.md' }],
  },
])

// 文档缓存（渲染后的 HTML + TOC 数据）
const docCache = new Map<string, { html: string; toc: TocItem[] }>()

// 从 navSections 中查找文档路径
const getDocPath = (docName: string): string | undefined => {
  for (const section of navSections.value) {
    const item = section.items.find(i => i.key === docName)
    if (item) return item.path
  }
  return undefined
}

const loadDoc = async (docName: string) => {
  // 优先读缓存
  if (docCache.has(docName)) {
    const cached = docCache.get(docName)!
    renderedContent.value = cached.html
    tocItems.value = cached.toc
    error.value = ''
    await nextTick()
    setupObserver()
    return
  }

  const path = getDocPath(docName)
  if (!path) {
    error.value = t('docs.docNotFound')
    return
  }

  isLoading.value = true
  error.value = ''
  headingCounter = 0

  try {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(t('docs.loadFailed'))
    }
    const markdown = await response.text()
    const html = marked(markdown) as string
    renderedContent.value = html

    // 从 DOM 中提取 TOC 数据
    await nextTick()
    extractToc()
    docCache.set(docName, { html, toc: [...tocItems.value] })
    setupObserver()
  } catch (e) {
    error.value = t('docs.loadFailed') + ': ' + (e as Error).message
    renderedContent.value = ''
    tocItems.value = []
  } finally {
    isLoading.value = false
  }
}

// 从渲染后的 DOM 中提取 h2/h3 标题作为 TOC
const extractToc = () => {
  if (!contentRef.value) return
  const headings = contentRef.value.querySelectorAll('.markdown-body h2, .markdown-body h3')
  tocItems.value = Array.from(headings).map(el => ({
    id: el.id,
    text: el.textContent || '',
    level: parseInt(el.tagName[1], 10),
  }))
}

const navigateTo = (docName: string) => {
  if (currentDoc.value === docName) return
  currentDoc.value = docName
  cleanupObserver()
  tocItems.value = []
  activeHeadingId.value = ''
  // 滚动回顶部
  if (contentRef.value) {
    contentRef.value.scrollTo({ top: 0, behavior: 'smooth' })
  }
  loadDoc(docName)
}

// ── Intersection Observer 滚动高亮 ──────────────────────
const setupObserver = () => {
  cleanupObserver()
  if (!contentRef.value || tocItems.value.length === 0) return

  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeHeadingId.value = entry.target.id
        }
      }
    },
    { root: contentRef.value, rootMargin: '0px 0px -70% 0px', threshold: 0 },
  )

  for (const item of tocItems.value) {
    const el = contentRef.value.querySelector(`#${CSS.escape(item.id)}`)
    if (el) observer!.observe(el)
  }
}

const cleanupObserver = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

// TOC 点击跳转
const scrollToHeading = (id: string) => {
  if (!contentRef.value) return
  const el = contentRef.value.querySelector(`#${CSS.escape(id)}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(() => {
  loadDoc(currentDoc.value)
})

onBeforeUnmount(() => {
  cleanupObserver()
})
</script>

<style lang="less" scoped>
.docs-view {
  position: relative;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
}

// ── TOC 目录（sticky 定位） ────────────────────────────
.docs-toc {
  position: sticky;
  float: right;
  width: 160px;
  top: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 12px 0;
  margin: 16px 16px 16px 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  z-index: 5;
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;

  &.docs-toc-hidden {
    opacity: 0;
    transform: translateX(12px);
    pointer-events: none;
  }

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }
}

.docs-toc-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.03em;
  margin: 0 0 8px 14px;
}

.docs-toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.docs-toc-item {
  padding: 4px 14px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-tertiary);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;

  &.toc-h3 {
    padding-left: 24px;
  }

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    color: var(--accent);
    border-left-color: var(--accent);
    font-weight: 500;
  }
}

// ── 右侧内容 ──────────────────────────────────────────
.docs-content {
  height: 100%;
  overflow-y: auto;
  position: relative;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
  }
}

.docs-content-inner {
  max-width: 820px;
  padding: 32px 48px 64px;
}

// 窄屏内容区适配
@media (max-width: 1100px) {
  .docs-content-inner {
    max-width: 100%;
    padding: 32px 32px 64px;
  }
}

// ── 加载骨架屏 ─────────────────────────────────────────
.docs-loading {
  padding-top: 8px;

  .skeleton-title {
    height: 28px;
    width: 50%;
    background: var(--control-fill);
    border-radius: 6px;
    margin-bottom: 28px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-text {
    height: 16px;
    width: 100%;
    background: var(--control-fill);
    border-radius: 4px;
    margin-bottom: 14px;
    animation: pulse 1.5s ease-in-out infinite;
    animation-delay: 0.1s;

    &.short {
      width: 80%;
      animation-delay: 0.15s;
    }
    &.shorter {
      width: 60%;
      animation-delay: 0.2s;
    }
  }
}

// ── 错误状态 ───────────────────────────────────────────
.docs-error {
  text-align: center;
  padding: 80px 40px;

  .docs-error-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--danger-bg);
    color: var(--danger);
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .docs-error-msg {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0 0 20px;
    line-height: 1.6;
  }

  .docs-error-btn {
    padding: 8px 24px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.15s ease;

    &:hover {
      background: var(--accent-hover);
    }

    &:active {
      background: var(--accent-pressed);
    }
  }
}

// ── 动画 ───────────────────────────────────────────────
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

// ── Markdown 内容样式 ──────────────────────────────────
.markdown-body {
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-primary);

  :deep(h1) {
    font-size: 26px;
    font-weight: 600;
    margin: 0 0 20px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-light);
    line-height: 1.3;
  }

  :deep(h2) {
    font-size: 20px;
    font-weight: 600;
    margin: 36px 0 14px 0;
    line-height: 1.4;
    scroll-margin-top: 16px;
  }

  :deep(h3) {
    font-size: 17px;
    font-weight: 600;
    margin: 28px 0 12px 0;
    line-height: 1.4;
    scroll-margin-top: 16px;
  }

  :deep(h4) {
    font-size: 15px;
    font-weight: 600;
    margin: 24px 0 10px 0;
  }

  :deep(p) {
    margin: 14px 0;
    line-height: 1.8;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 24px;
    margin: 12px 0;
  }

  :deep(li) {
    margin: 6px 0;
    line-height: 1.7;
  }

  :deep(code) {
    background: var(--control-fill);
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 13px;
    font-family: var(--font-mono);
  }

  :deep(pre) {
    background: var(--bg-secondary);
    padding: 18px 22px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 18px 0;
    border: 1px solid var(--border-light);

    code {
      background: none;
      padding: 0;
      font-size: 13px;
      line-height: 1.6;
    }
  }

  :deep(blockquote) {
    border-left: 3px solid var(--accent);
    margin: 18px 0;
    padding: 10px 18px;
    background: var(--accent-light);
    color: var(--text-secondary);
    border-radius: 0 6px 6px 0;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 13px;

    th,
    td {
      border: 1px solid var(--border-light);
      padding: 10px 14px;
      text-align: left;
    }

    th {
      background: var(--control-fill);
      font-weight: 600;
    }

    tr:hover td {
      background: var(--control-fill);
    }
  }

  :deep(a) {
    color: var(--accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--border-light);
    margin: 28px 0;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 8px;
    margin: 14px 0;
  }
}
</style>

<style lang="less">
// docs-nav 样式（非 scoped，因为使用 absolute 定位覆盖在内容之上）
.docs-nav {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  z-index: 20;
  display: flex;

  // 标识条（默认可见，带呼吸动画提示可交互）
  .docs-nav-stripe {
    width: 4px;
    height: 100%;
    background: var(--accent);
    opacity: 0.35;
    border-radius: 0 2px 2px 0;
    flex-shrink: 0;
    animation: stripe-pulse 2.5s ease-in-out infinite;
    transition: opacity 0.25s ease;
    position: relative;
    overflow: hidden;

    // 光扫效果（与呼吸同步 2.5s）
    &::after {
      content: '';
      position: absolute;
      top: -40%;
      left: 0;
      width: 100%;
      height: 40%;
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(255, 255, 255, 0.45) 50%,
        transparent 100%
      );
      animation: stripe-sweep 2.5s ease-in-out infinite;
    }
  }

  // hover 时呼吸动画暂停，标识条变亮
  &:hover .docs-nav-stripe {
    animation-play-state: paused;
    opacity: 0.6;
  }

  // 导航栏主体（默认隐藏）
  .docs-nav-body {
    width: 216px; // 220 - 4(stripe)
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--docs-nav-bg, #f9f9f9);
    border-right: 1px solid var(--border-light);
    opacity: 0;
    transform: translateX(-8px);
    pointer-events: none;
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
    overflow: hidden;
  }

  // hover 时展开
  &:hover .docs-nav-body {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }
}

.docs-nav-header {
  padding: 24px 20px 16px;
  flex-shrink: 0;
}

.docs-nav-heading {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.docs-nav-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 24px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
  }
}

.docs-nav-section {
  margin-bottom: 4px;
  padding-top: 12px;

  &:first-child {
    padding-top: 0;
  }
}

.docs-nav-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--text-tertiary);
  margin: 0 0 4px 12px;
  padding: 4px 0;
}

.docs-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    position: relative;
    padding: 7px 12px 7px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-secondary);
    transition:
      background 0.15s ease,
      color 0.15s ease;
    user-select: none;

    &:hover {
      background: var(--control-fill);
      color: var(--text-primary);
    }

    &.active {
      background: var(--accent-light);
      color: var(--accent);
      font-weight: 500;

      .nav-indicator {
        opacity: 1;
        transform: scaleY(1);
      }
    }
  }
}

.nav-indicator {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.dark .docs-nav .docs-nav-body {
  background: #1a1a1a;
}

@media (max-width: 1100px) {
  .docs-nav .docs-nav-body {
    width: 196px;
  }
}

// ── 标识条呼吸动画关键帧 ─────────────────────────────────
@keyframes stripe-pulse {
  0%, 100% {
    opacity: 0.35;
    filter: brightness(1);
  }
  50% {
    opacity: 0.55;
    filter: brightness(1.15);
  }
}

// ── 标识条光扫动画关键帧 ─────────────────────────────────
@keyframes stripe-sweep {
  0% {
    top: -40%;
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  50% {
    top: 100%;
    opacity: 0.3;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}
</style>
