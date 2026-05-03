<template>
  <section class="docs-view">
    <!-- 文档导航侧边栏 -->
    <aside class="docs-nav">
      <div class="docs-nav-header">
        <h1 class="docs-nav-heading">{{ $t('docs.title') }}</h1>
      </div>

      <div class="docs-nav-scroll">
        <div class="docs-nav-section">
          <h3 class="docs-nav-title">{{ $t('docs.quickStart') }}</h3>
          <ul class="docs-nav-list">
            <li :class="{ active: currentDoc === 'quickstart' }" @click="navigateTo('quickstart')">
              <span class="nav-indicator"></span>
              {{ $t('docs.quickStart') }}
            </li>
          </ul>
        </div>

        <div class="docs-nav-section">
          <h3 class="docs-nav-title">{{ $t('docs.coreFeatures') }}</h3>
          <ul class="docs-nav-list">
            <li :class="{ active: currentDoc === 'basic-usage' }" @click="navigateTo('basic-usage')">
              <span class="nav-indicator"></span>
              {{ $t('docs.basicUsage') }}
            </li>
            <li :class="{ active: currentDoc === 'interactive' }" @click="navigateTo('interactive')">
              <span class="nav-indicator"></span>
              {{ $t('docs.interactiveMode') }}
            </li>
            <li :class="{ active: currentDoc === 'keyboard-shortcuts' }" @click="navigateTo('keyboard-shortcuts')">
              <span class="nav-indicator"></span>
              {{ $t('docs.keyboardShortcuts') }}
            </li>
          </ul>
        </div>

        <div class="docs-nav-section">
          <h3 class="docs-nav-title">{{ $t('docs.advancedFeatures') }}</h3>
          <ul class="docs-nav-list">
            <li :class="{ active: currentDoc === 'slash-commands' }" @click="navigateTo('slash-commands')">
              <span class="nav-indicator"></span>
              {{ $t('docs.slashCommands') }}
            </li>
            <li :class="{ active: currentDoc === 'mcp' }" @click="navigateTo('mcp')">
              <span class="nav-indicator"></span>
              {{ $t('docs.mcp') }}
            </li>
            <li :class="{ active: currentDoc === 'subagent' }" @click="navigateTo('subagent')">
              <span class="nav-indicator"></span>
              {{ $t('docs.subAgent') }}
            </li>
            <li :class="{ active: currentDoc === 'subcommand' }" @click="navigateTo('subcommand')">
              <span class="nav-indicator"></span>
              {{ $t('docs.subCommand') }}
            </li>
            <li :class="{ active: currentDoc === 'hooks' }" @click="navigateTo('hooks')">
              <span class="nav-indicator"></span>
              {{ $t('docs.hooks') }}
            </li>
            <li :class="{ active: currentDoc === 'workflow' }" @click="navigateTo('workflow')">
              <span class="nav-indicator"></span>
              {{ $t('docs.workflow') }}
            </li>
            <li :class="{ active: currentDoc === 'skill' }" @click="navigateTo('skill')">
              <span class="nav-indicator"></span>
              {{ $t('docs.skill') }}
            </li>
            <li :class="{ active: currentDoc === 'plan-mode' }" @click="navigateTo('plan-mode')">
              <span class="nav-indicator"></span>
              {{ $t('docs.planMode') }}
            </li>
          </ul>
        </div>

        <div class="docs-nav-section">
          <h3 class="docs-nav-title">{{ $t('docs.configuration') }}</h3>
          <ul class="docs-nav-list">
            <li :class="{ active: currentDoc === 'settings' }" @click="navigateTo('settings')">
              <span class="nav-indicator"></span>
              {{ $t('docs.cliConfig') }}
            </li>
          </ul>
        </div>

        <div class="docs-nav-section">
          <h3 class="docs-nav-title">{{ $t('docs.reference') }}</h3>
          <ul class="docs-nav-list">
            <li :class="{ active: currentDoc === 'best-practices' }" @click="navigateTo('best-practices')">
              <span class="nav-indicator"></span>
              {{ $t('docs.bestPractices') }}
            </li>
            <li :class="{ active: currentDoc === 'glossary' }" @click="navigateTo('glossary')">
              <span class="nav-indicator"></span>
              {{ $t('docs.glossary') }}
            </li>
            <li :class="{ active: currentDoc === 'scenarios' }" @click="navigateTo('scenarios')">
              <span class="nav-indicator"></span>
              {{ $t('docs.scenarios') }}
            </li>
            <li :class="{ active: currentDoc === 'changelog' }" @click="navigateTo('changelog')">
              <span class="nav-indicator"></span>
              {{ $t('docs.changelog') }}
            </li>
          </ul>
        </div>
      </div>
    </aside>

    <!-- 文档内容区域 -->
    <main class="docs-content" ref="contentRef">
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
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'

const { t } = useI18n()

const currentDoc = ref('quickstart')
const isLoading = ref(false)
const error = ref('')
const renderedContent = ref('')
const contentRef = ref<HTMLElement | null>(null)

// 文档路径映射
const docPaths: Record<string, string> = {
  'quickstart': '/docs/quickstart.md',
  'basic-usage': '/docs/examples/basic-usage.md',
  'interactive': '/docs/features/interactive.md',
  'keyboard-shortcuts': '/docs/examples/keyboard-shortcuts.md',
  'slash-commands': '/docs/examples/slash-commands.md',
  'mcp': '/docs/examples/mcp.md',
  'subagent': '/docs/examples/subagent.md',
  'subcommand': '/docs/examples/subcommand.md',
  'hooks': '/docs/examples/hooks.md',
  'workflow': '/docs/examples/workflow.md',
  'skill': '/docs/examples/skill.md',
  'plan-mode': '/docs/examples/plan-mode.md',
  'settings': '/docs/configuration/settings.md',
  'best-practices': '/docs/examples/best-practices.md',
  'glossary': '/docs/glossary.md',
  'scenarios': '/docs/scenarios.md',
  'changelog': '/docs/changelog.md',
}

const loadDoc = async (docName: string) => {
  const path = docPaths[docName]
  if (!path) {
    error.value = t('docs.docNotFound')
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(t('docs.loadFailed'))
    }
    const markdown = await response.text()
    renderedContent.value = marked(markdown)
  } catch (e) {
    error.value = t('docs.loadFailed') + ': ' + (e as Error).message
    renderedContent.value = ''
  } finally {
    isLoading.value = false
  }
}

const navigateTo = (docName: string) => {
  if (currentDoc.value === docName) return
  currentDoc.value = docName
  // 滚动回顶部
  if (contentRef.value) {
    contentRef.value.scrollTo({ top: 0, behavior: 'smooth' })
  }
  loadDoc(docName)
}

onMounted(() => {
  loadDoc(currentDoc.value)
})
</script>

<style lang="less" scoped>
.docs-view {
  display: flex;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
}

// ── 左侧导航 ──────────────────────────────────────────
.docs-nav {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
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
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
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
    transition: background 0.15s ease, color 0.15s ease;
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
  transition: opacity 0.2s ease, transform 0.2s ease;
}

// ── 右侧内容 ──────────────────────────────────────────
.docs-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;

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

    &.short { width: 80%; animation-delay: 0.15s; }
    &.shorter { width: 60%; animation-delay: 0.2s; }
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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

  :deep(ul), :deep(ol) {
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

    th, td {
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
