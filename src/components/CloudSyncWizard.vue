<template>
  <div class="cloud-sync-wizard">
    <div class="wizard-header">
      <div class="wizard-title">{{ $t('cloudSync.wizardTitle') }}</div>
      <div class="wizard-steps">
        <div class="wizard-step" :class="{ active: currentStep === 1, completed: step1Completed }">
          <div class="step-indicator">
            <CheckSmall v-if="step1Completed" size="14" />
            <span v-else>1</span>
          </div>
          <span class="step-label">{{ $t('cloudSync.wizardStep1') }}</span>
        </div>
        <div class="step-connector" :class="{ filled: step1Completed }"></div>
        <div class="wizard-step" :class="{ active: currentStep === 2 }">
          <div class="step-indicator">2</div>
          <span class="step-label">{{ $t('cloudSync.wizardStep2') }}</span>
        </div>
      </div>
    </div>

    <div class="wizard-content">
      <!-- 步骤 1: 连接云服务 -->
      <template v-if="currentStep === 1">
        <div class="step-title">{{ $t('cloudSync.wizardStep1Title') }}</div>
        <p class="step-desc">{{ $t('cloudSync.wizardStep1Desc') }}</p>

        <div class="webdav-form">
          <div class="form-group">
            <label class="form-label">{{ $t('cloudSync.webdavServerUrl') }}</label>
            <custom-input type="url" v-model="webdavConfig.serverUrl" :placeholder="$t('cloudSync.webdavServerUrlPlaceholder')" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ $t('cloudSync.webdavUsername') }}</label>
              <custom-input type="text" v-model="webdavConfig.username" :placeholder="$t('cloudSync.webdavUsernamePlaceholder')" />
            </div>
            <div class="form-group">
              <label class="form-label">
                {{ $t('cloudSync.webdavPassword') }}
                <span class="form-label-hint">{{ $t('cloudSync.webdavPasswordHintTag') }}</span>
              </label>
              <custom-input type="password" v-model="webdavConfig.password" :placeholder="$t('cloudSync.webdavPasswordPlaceholder')" />
            </div>
          </div>
        </div>

        <div class="wizard-actions">
          <div class="test-connection-wrapper">
            <transition name="tooltip">
              <div v-if="connectionTestResult" class="connection-tooltip" :class="connectionTestResult.success ? 'tooltip-success' : 'tooltip-error'">
                <CheckSmall v-if="connectionTestResult.success" size="12" />
                <CloseSmall v-else size="12" />
                <span>{{ connectionTestResult.success ? $t('cloudSync.connectionSuccess') : $t('cloudSync.connectionFailed') }}</span>
                <span class="tooltip-detail" v-if="connectionTestResult.message"> — {{ connectionTestResult.message }}</span>
                <div class="tooltip-arrow"></div>
              </div>
            </transition>
            <button class="btn btn-secondary" :disabled="!canTestConnection || isTesting" @click="handleTestConnection">
              <Loading v-if="isTesting" size="14" class="spin" />
              <Link v-else size="14" />
              {{ isTesting ? $t('cloudSync.testing') : $t('cloudSync.testConnection') }}
            </button>
          </div>
          <button class="btn btn-primary" :disabled="!connectionTestResult?.success" @click="handleNextStep">
            {{ $t('cloudSync.nextStep') }}
          </button>
        </div>
      </template>

      <!-- 步骤 2: 设置同步密码 -->
      <template v-if="currentStep === 2">
        <div class="step-title">{{ $t('cloudSync.wizardStep2Title') }}</div>
        <p class="step-desc">{{ $t('cloudSync.wizardStep2Desc') }}</p>

        <div class="password-form">
          <div class="form-group">
            <label class="form-label">{{ $t('cloudSync.newPassword') }}</label>
            <custom-input type="password" v-model="password" :placeholder="$t('cloudSync.passwordMinLength')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('cloudSync.confirmPassword') }}</label>
            <custom-input type="password" v-model="confirmPassword" :placeholder="$t('cloudSync.confirmPassword')" @keyup.enter="handleComplete" />
          </div>
          <div class="password-error" v-if="passwordError">{{ passwordError }}</div>
          <p class="password-hint-tip">
            <span class="hint-icon">💡</span>
            {{ $t('cloudSync.wizardPasswordHint') }}
          </p>
        </div>

        <div class="wizard-actions">
          <button class="btn btn-secondary" @click="currentStep = 1">
            {{ $t('cloudSync.backStep') }}
          </button>
          <button class="btn btn-primary" :disabled="!password || !confirmPassword" @click="handleComplete">
            {{ $t('cloudSync.completeSetup') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckSmall, CloseSmall, Loading, Link } from '@icon-park/vue-next'
import CustomInput from './CustomInput.vue'
import { useCloudSyncStore } from '@/stores/cloudSync'

const { t } = useI18n()
const cloudStore = useCloudSyncStore()

const emit = defineEmits(['complete', 'cancel'])

// 当前步骤
const currentStep = ref(1)
const step1Completed = ref(false)

// WebDAV 配置
const webdavConfig = ref({
  serverUrl: '',
  username: '',
  password: '',
})
const connectionTestResult = ref(null)
const isTesting = ref(false)

// 密码设置
const password = ref('')
const confirmPassword = ref('')
const passwordError = ref('')

const canTestConnection = computed(() => {
  return webdavConfig.value.serverUrl.trim() && webdavConfig.value.username.trim() && webdavConfig.value.password.trim() && !isTesting.value
})

async function handleTestConnection() {
  isTesting.value = true
  connectionTestResult.value = null
  try {
    // 用 testOnly=true 先测试连接，不保存配置
    const config = { ...webdavConfig.value }
    const testResult = await window.electronAPI.cloudSyncConfigureProvider('webdav', config, true)
    connectionTestResult.value = {
      success: testResult.success && testResult.authorized,
      message: testResult.success ? (testResult.authorized ? undefined : 'Unauthorized') : testResult.error,
    }
    // 仅在测试成功后才保存 provider 配置
    if (connectionTestResult.value.success) {
      await cloudStore.configureProvider('webdav', config)
    }
  } catch (error) {
    connectionTestResult.value = { success: false, message: error?.message || String(error) || '' }
  } finally {
    isTesting.value = false
  }
}

function handleNextStep() {
  if (connectionTestResult.value?.success) {
    step1Completed.value = true
    currentStep.value = 2
  }
}

async function handleComplete() {
  passwordError.value = ''
  if (password.value.length < 8) {
    passwordError.value = t('cloudSync.passwordMinLength')
    return
  }
  if (password.value !== confirmPassword.value) {
    passwordError.value = t('cloudSync.passwordMismatch')
    return
  }
  const result = await cloudStore.setPassword(password.value)
  if (result.success) {
    emit('complete')
  } else {
    passwordError.value = result.error || t('cloudSync.setPasswordFailed')
  }
}
</script>

<style lang="less" scoped>
.cloud-sync-wizard {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl) var(--space-2xl);
}

.wizard-header {
  margin-bottom: var(--space-2xl);
}

.wizard-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xl);
}

.wizard-steps {
  display: flex;
  align-items: center;
  justify-content: center;
}

.wizard-step {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--control-fill-secondary);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;

  .wizard-step.active & {
    background: var(--accent);
    color: white;
    box-shadow: 0 0 0 3px rgba(0, 103, 192, 0.15);
  }

  .wizard-step.completed & {
    background: var(--success);
    color: white;
    box-shadow: 0 0 0 3px rgba(16, 124, 16, 0.12);
  }
}

.step-connector {
  width: 40px;
  height: 2px;
  margin: 0 var(--space-sm);
  background: var(--control-fill-secondary);
  border-radius: 1px;
  transition: background 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  &.filled {
    background: var(--success);
  }
}

.step-label {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  transition: color 0.2s ease, font-weight 0.2s ease;

  .wizard-step.active & {
    color: var(--text-primary);
    font-weight: 600;
  }

  .wizard-step.completed & {
    color: var(--text-secondary);
    font-weight: 500;
  }
}

.wizard-content {
  padding: var(--space-sm) 0;
}

.step-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.step-desc {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
  line-height: 1.5;
}

.webdav-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-row {
  display: flex;
  gap: var(--space-md);

  .form-group {
    flex: 1;
  }
}

.test-connection-wrapper {
  position: relative;
  display: inline-flex;
}

.connection-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-xs, 12px);
  white-space: nowrap;
  z-index: 10;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.12));

  &.tooltip-success {
    background: var(--success, #0f7b0f);
    color: #fff;
  }

  &.tooltip-error {
    background: var(--danger, #c42b1c);
    color: #fff;
  }
}

.tooltip-detail {
  opacity: 0.85;
}

.tooltip-arrow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;

  .tooltip-success & {
    border-top: 5px solid var(--success, #0f7b0f);
  }

  .tooltip-error & {
    border-top: 5px solid var(--danger, #c42b1c);
  }
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

.wizard-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-2xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.password-error {
  color: var(--danger);
  font-size: var(--font-size-sm);
  line-height: 1.4;
}

.password-hint-tip {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-xs);
  line-height: 1.5;

  .hint-icon {
    margin-right: var(--space-xs);
  }
}
</style>