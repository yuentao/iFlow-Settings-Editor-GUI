<template>
  <section class="general-settings">
    <div class="content-header">
      <h1 class="content-title">{{ $t('general.title') }}</h1>
      <p class="content-desc">{{ $t('general.description') }}</p>
    </div>

    <!-- ===== 偏好设置 ===== -->
    <div class="section-group">
      <div class="section-header">
        <h2 class="section-title">{{ $t('general.sectionPreferences') }}</h2>
      </div>

      <div class="card card-appear" style="animation-delay: 0.02s">
        <div class="card-title">
          <Globe size="16" />
          {{ $t('general.languageInterface') }}
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.language') }}</label>
              <p class="setting-desc">{{ $t('general.languageDesc') || '' }}</p>
            </div>
            <select class="form-select setting-select" v-model="localSettings.language">
              <option value="zh-CN">{{ $t('languages.zh-CN') }}</option>
              <option value="en-US">{{ $t('languages.en-US') }}</option>
              <option value="ja-JP">{{ $t('languages.ja-JP') }}</option>
            </select>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.theme') }}</label>
              <p class="setting-desc">{{ $t('general.themeDesc') || '' }}</p>
            </div>
            <select class="form-select setting-select" v-model="localSettings.uiTheme">
              <option value="Light">{{ $t('theme.light') }}</option>
              <option value="Dark">{{ $t('theme.dark') }}</option>
              <option value="System">{{ $t('theme.system') }}</option>
            </select>
          </div>
        </div>
        <div class="setting-divider"></div>
        <div class="setting-item" v-if="supportsAcrylic">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.acrylicEffect') }}</label>
            <p class="setting-desc">{{ $t('general.acrylicEffectDesc') }}</p>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="localSettings.acrylicEnabled" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item setting-item-full" v-if="supportsAcrylic && localSettings.acrylicEnabled">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.acrylicIntensity') }}</label>
            <p class="setting-desc">{{ localSettings.acrylicIntensity }}% — {{ $t('general.acrylicMin') }} — {{ $t('general.acrylicMax') }}</p>
          </div>
          <div class="slider-container">
            <div class="slider-track">
              <div class="slider-fill" :style="{ width: localSettings.acrylicIntensity + '%' }"></div>
            </div>
            <input type="range" class="form-slider" min="0" max="100" :value="localSettings.acrylicIntensity" @input="updateSliderValue" />
          </div>
        </div>
      </div>

      <div class="card card-appear" style="animation-delay: 0.05s">
        <div class="card-title">
          <Rocket size="16" />
          {{ $t('general.autoLaunchSettings') }}
        </div>
        <div class="setting-item setting-item-main">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.autoLaunch') }}</label>
            <p class="setting-desc">{{ $t('general.autoLaunchHint') }}</p>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="autoLaunchEnabled" @change="onAutoLaunchChange" />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="card card-appear" style="animation-delay: 0.08s">
        <div class="card-title">
          <DataDisplay size="16" />
          {{ $t('general.monitoring') }}
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.connectivityPollInterval') }}</label>
              <p class="setting-desc">{{ $t('general.connectivityPollIntervalDesc') }}</p>
            </div>
            <input type="number" class="form-input setting-input-number" v-model.number="localSettings.connectivityPollInterval" min="5" max="600" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.modelUsageRefreshInterval') }}</label>
              <p class="setting-desc">{{ $t('general.modelUsageRefreshIntervalDesc') }}</p>
            </div>
            <input type="number" class="form-input setting-input-number" v-model.number="localSettings.modelUsageRefreshInterval" min="1" max="60" />
          </div>
        </div>
      </div>
    </div>

    <!-- ===== CLI 设置 ===== -->
    <div class="section-group">
      <div class="section-header">
        <h2 class="section-title">{{ $t('general.sectionCli') }}</h2>
      </div>

      <div class="card card-appear" style="animation-delay: 0.02s">
        <div class="card-title">
          <Communication size="16" />
          {{ $t('general.conversationMode') }}
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.skipNextSpeakerCheck') }}</label>
              <p class="setting-desc">{{ $t('general.skipNextSpeakerCheckDesc') }}</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="localSettings.skipNextSpeakerCheck" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.thinkingModeEnabled') }}</label>
              <p class="setting-desc">{{ $t('general.thinkingModeEnabledDesc') }}</p>
            </div>
            <select class="form-select setting-select" v-model="localSettings.thinkingModeEnabled">
              <option value="true">{{ $t('general.enabled') }}</option>
              <option value="false">{{ $t('general.disabled') }}</option>
            </select>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.approvalMode') }}</label>
              <p class="setting-desc">{{ $t('general.approvalModeDesc') }}</p>
            </div>
            <select class="form-select setting-select" v-model="localSettings.approvalMode">
              <option value="yolo">{{ $t('general.approvalModeYolo') }}</option>
              <option value="plan">{{ $t('general.approvalModePlan') }}</option>
              <option value="autoEdit">{{ $t('general.approvalModeAutoEdit') }}</option>
              <option value="default">{{ $t('general.approvalModeDefault') }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card card-appear" style="animation-delay: 0.05s">
        <div class="card-title">
          <DataScreen size="16" />
          {{ $t('general.displayUpdates') }}
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.showMemoryUsage') }}</label>
              <p class="setting-desc">{{ $t('general.showMemoryUsageDesc') }}</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="localSettings.showMemoryUsage" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.hideBanner') }}</label>
              <p class="setting-desc">{{ $t('general.hideBannerDesc') }}</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="localSettings.hideBanner" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.disableAutoUpdate') }}</label>
              <p class="setting-desc">{{ $t('general.disableAutoUpdateDesc') }}</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="localSettings.disableAutoUpdate" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.disableTelemetry') }}</label>
              <p class="setting-desc">{{ $t('general.disableTelemetryDesc') }}</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="localSettings.disableTelemetry" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="card card-appear" style="animation-delay: 0.08s">
        <div class="card-title">
          <Time size="16" />
          {{ $t('general.sessionTimeout') }}
        </div>
        <div class="settings-grid">
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.maxSessionTurns') }}</label>
              <p class="setting-desc">{{ $t('general.maxSessionTurnsDesc') }}</p>
            </div>
            <input type="number" class="form-input setting-input-number" v-model.number="localSettings.maxSessionTurns" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.shellTimeout') }}</label>
              <p class="setting-desc">{{ $t('general.shellTimeoutDesc') }}</p>
            </div>
            <input type="number" class="form-input setting-input-number" v-model.number="localSettings.shellTimeout" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.compressionTokenThreshold') }}</label>
              <p class="setting-desc">{{ $t('general.compressionTokenThresholdDesc') }}</p>
            </div>
            <input type="number" class="form-input setting-input-number" v-model.number="localSettings.compressionTokenThreshold" step="0.01" min="0" max="1" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label class="setting-label">{{ $t('general.autoConfigureMaxOldSpaceSize') }}</label>
              <p class="setting-desc">{{ $t('general.autoConfigureMaxOldSpaceSizeDesc') }}</p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="localSettings.autoConfigureMaxOldSpaceSize" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="card card-appear" style="animation-delay: 0.08s">
        <div class="card-title">
          <FilterOne size="16" />
          {{ $t('general.toolFiltering') }}
        </div>
        <div class="setting-item setting-item-full">
          <div class="setting-info">
            <label class="setting-label">{{ $t('general.excludeTools') }}</label>
            <p class="setting-desc">{{ $t('general.excludeToolsDesc') }}</p>
            <p class="setting-desc security-note"
              ><span class="security-label">{{ $t('general.excludeToolsSecurityNoteLabel') }}</span> {{ $t('general.excludeToolsSecurityNote') }}</p
            >
          </div>
          <textarea class="form-textarea core-tools-textarea" :value="excludeToolsText" @input="onExcludeToolsInput" :placeholder="$t('general.excludeToolsPlaceholder')" rows="3"></textarea>
        </div>
      </div>
    </div>

    <!-- ===== 云同步 ===== -->
    <div class="section-group" id="cloud-sync-section">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">{{ $t('general.sectionCloudSync') }}</h2>
        </div>
        <div class="section-header-right">
          <label class="switch" @click.stop>
            <input type="checkbox" :checked="syncEnabled" @click.stop="onToggleSyncEnabled" />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <transition name="collapse">
        <div class="section-body" v-show="syncEnabled">
          <!-- 向导模式：未完成配置时显示引导式设置向导 -->
          <CloudSyncWizard v-if="!cloudStore.isConfigured" @complete="onWizardComplete" @cancel="onWizardCancel" />
          <!-- 正常模式：已完成配置显示常规同步面板 -->
          <template v-else>
            <!-- 状态 + 立即同步 + 同步内容 -->
            <div class="card card-appear" style="animation-delay: 0.02s">
              <div class="cloud-status-bar">
                <div class="cloud-status-left">
                  <div class="status-indicator" :class="statusClass">
                    <span class="status-dot"></span>
                    <span class="status-label">{{ statusLabel }}</span>
                  </div>
                  <span class="next-step-hint" v-if="nextStepHint">{{ nextStepHint }}</span>
                  <span class="status-time" v-if="cloudStore.isConfigured && cloudStore.status.lastSyncAt"> {{ $t('cloudSync.lastSync') }}: {{ formatTime(cloudStore.status.lastSyncAt) }} </span>
                  <span class="status-time" v-else-if="cloudStore.isConfigured">{{ $t('cloudSync.neverSynced') }}</span>
                </div>
                <div class="cloud-status-right">
                  <label class="switch switch-sm" @click.stop>
                    <input type="checkbox" :checked="autoSyncEnabled" @click.prevent.stop="onToggleAutoSync" />
                    <span class="slider"></span>
                  </label>
                  <span class="auto-sync-label">{{ $t('cloudSync.autoSync') }}</span>
                  <button class="btn btn-primary btn-sm" :disabled="!cloudStore.isConfigured || cloudStore.isSyncing" @click="handleSyncNow">
                    <Loading v-if="cloudStore.isSyncing" size="14" class="spin" />
                    <Refresh v-else size="14" />
                    {{ cloudStore.isSyncing ? $t('cloudSync.statusSyncing') : $t('cloudSync.syncNow') }}
                  </button>
                </div>
              </div>
              <div class="sync-error" v-if="cloudStore.status.lastSyncError">
                <CloseSmall size="14" />
                {{ lastSyncErrorText }}
              </div>
              <!-- 同步内容 -->
              <div class="sync-content-section">
                <span class="sync-content-label">{{ $t('cloudSync.syncContentTitle') }}:</span>
                <span class="sync-content-tag success">{{ $t('cloudSync.apiProfiles') }}</span>
                <span class="sync-content-tag success">{{ $t('cloudSync.mcpServers') }}</span>
                <span class="sync-content-tag disabled">{{ $t('cloudSync.skillsComing') }}</span>
                <span class="sync-content-tag disabled">{{ $t('cloudSync.commandsComing') }}</span>
              </div>
              <div class="cloud-danger-zone" v-if="cloudStore.isConfigured">
                <button class="btn btn-danger btn-sm" @click="handleClearCloud">
                  <Delete size="14" />
                  {{ $t('cloudSync.clearCloud') }}
                </button>
              </div>
            </div>

            <!-- 云同步配置（合并 WebDAV 配置、加密密码和设备管理为一张卡片） -->
            <div class="card card-appear" style="animation-delay: 0.06s">
              <div class="card-title">
                <LinkCloud size="16" />
                {{ $t('cloudSync.configTitle') }}
              </div>

              <!-- 服务商类型 -->
              <div class="setting-item">
                <div class="setting-info">
                  <label class="setting-label">{{ $t('cloudSync.providerType') }}</label>
                </div>
                <select class="form-select setting-select" v-model="selectedProvider" @change="onProviderChange">
                  <option value="webdav">{{ $t('cloudSync.webdav') }}</option>
                  <option value="onedrive" disabled>{{ $t('cloudSync.onedrive') }}</option>
                  <option value="dropbox" disabled>{{ $t('cloudSync.dropbox') }}</option>
                </select>
              </div>

              <template v-if="selectedProvider === 'webdav'">
                <div class="setting-divider"></div>

                <!-- WebDAV 连接配置 -->
                <div class="sub-section-header">
                  {{ $t('cloudSync.configSectionConnection') }}
                </div>

                <div class="webdav-form" v-if="!cloudStore.status.isAuthorized">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">{{ $t('cloudSync.webdavServerUrl') }}</label>
                      <input type="url" class="form-input" v-model="webdavConfig.serverUrl" :placeholder="$t('cloudSync.webdavServerUrlPlaceholder')" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">{{ $t('cloudSync.webdavUsername') }}</label>
                      <input type="text" class="form-input" v-model="webdavConfig.username" :placeholder="$t('cloudSync.webdavUsernamePlaceholder')" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">
                        {{ $t('cloudSync.webdavPassword') }}
                        <span class="form-label-hint">{{ $t('cloudSync.webdavPasswordHintTag') }}</span>
                      </label>
                      <input type="password" class="form-input" v-model="webdavConfig.password" :placeholder="$t('cloudSync.webdavPasswordPlaceholder')" />
                    </div>
                  </div>
                  <div class="webdav-actions">
                    <div class="test-connection-wrapper">
                      <transition name="tooltip">
                        <div v-if="cloudStore.connectionTestResult" class="connection-tooltip" :class="cloudStore.connectionTestResult.success ? 'tooltip-success' : 'tooltip-error'">
                          <CheckSmall v-if="cloudStore.connectionTestResult.success" size="12" />
                          <CloseSmall v-else size="12" />
                          <span>{{ cloudStore.connectionTestResult.success ? $t('cloudSync.connectionSuccess') : $t('cloudSync.connectionFailed') }}</span>
                          <span class="tooltip-detail" v-if="cloudStore.connectionTestResult.message"> — {{ cloudStore.connectionTestResult.message }}</span>
                          <div class="tooltip-arrow"></div>
                        </div>
                      </transition>
                      <button class="btn btn-secondary btn-sm" :disabled="!canTestConnection || cloudStore.isTestingConnection" @click="handleTestConnection">
                        <Loading v-if="cloudStore.isTestingConnection" size="14" class="spin" />
                        <Link v-else size="14" />
                        {{ cloudStore.isTestingConnection ? $t('cloudSync.testing') : $t('cloudSync.testConnection') }}
                      </button>
                    </div>
                    <button class="btn btn-primary btn-sm" :disabled="!canTestConnection" @click="handleSaveProvider">
                      {{ $t('dialog.confirm') }}
                    </button>
                  </div>
                </div>

                <div class="provider-authorized" v-else>
                  <div class="authorized-info">
                    <CheckSmall size="16" class="text-success" />
                    <span class="authorized-text"> {{ $t('cloudSync.connectionSuccess') }} — WebDAV </span>
                  </div>
                  <button class="btn btn-secondary btn-sm" @click="handleRevokeAuth">
                    {{ $t('cloudSync.revokeAuth') }}
                  </button>
                </div>
              </template>

              <div class="setting-divider"></div>

              <!-- 同步加密 -->
              <div class="sub-section-header">
                {{ $t('cloudSync.configSectionEncryption') }}
              </div>

              <div class="setting-item setting-item-main">
                <div class="setting-info">
                  <label class="setting-label">{{ $t('cloudSync.passwordStatus') }}</label>
                  <p class="setting-desc">
                    <span v-if="cloudStore.status.hasPassword" class="text-success">{{ $t('cloudSync.passwordSet') }}</span>
                    <span v-else class="text-warning">{{ $t('cloudSync.passwordNotSet') }}</span>
                    <span class="password-hint" v-if="cloudStore.status.hasPassword">
                      — {{ $t('cloudSync.passwordHint') }} <span class="form-label-hint">{{ $t('cloudSync.syncPasswordHintTag') }}</span></span
                    >
                  </p>
                </div>
                <button class="btn btn-sm" :class="cloudStore.status.hasPassword ? 'btn-secondary' : 'btn-primary'" @click="cloudStore.status.hasPassword ? showChangePasswordDialog() : showSetPasswordDialog()">
                  {{ cloudStore.status.hasPassword ? $t('cloudSync.changePassword') : $t('cloudSync.setPassword') }}
                </button>
              </div>

              <template v-if="cloudStore.status.hasPassword">
                <div class="setting-item setting-item-main">
                  <div class="setting-info">
                    <label class="setting-label">{{ $t('cloudSync.rememberPassword') }}</label>
                    <p class="setting-desc">{{ $t('cloudSync.rememberPasswordDesc') }}</p>
                  </div>
                  <label class="switch">
                    <input type="checkbox" :checked="cloudStore.rememberSyncPassword" @change="onToggleRememberPassword" />
                    <span class="slider"></span>
                  </label>
                </div>
              </template>

              <!-- 高级同步设置 -->
              <template v-if="cloudStore.isConfigured">
                <div class="setting-divider"></div>
                <div class="sub-section-header">
                  {{ $t('cloudSync.configSectionAdvanced') }}
                </div>

                <div class="setting-item">
                  <div class="setting-info">
                    <label class="setting-label">{{ $t('cloudSync.tombstoneRetentionDays') }}</label>
                    <p class="setting-desc">{{ $t('cloudSync.tombstoneRetentionDaysDesc') }}</p>
                  </div>
                  <input type="number" class="form-input setting-input-number" v-model.number="tombstoneRetentionDays" min="1" max="365" @blur="handleSetTombstoneRetentionDays" @change="handleSetTombstoneRetentionDays" />
                </div>
              </template>

              <!-- 设备管理 -->
              <template v-if="cloudStore.isConfigured">
                <div class="setting-divider"></div>
                <div class="sub-section-header">
                  {{ $t('cloudSync.configSectionDevices') }}
                </div>

                <div class="device-list" v-if="!cloudStore.isLoadingDevices">
                  <div v-for="device in cloudStore.devices" :key="device.deviceId" class="device-item">
                    <div class="device-status-dot" :class="{ 'is-self': device.isSelf }"></div>
                    <div class="device-info">
                      <!-- 本机设备：点击编辑图标弹框重命名 -->
                      <div class="device-name" v-if="device.isSelf">
                        <span>{{ device.deviceName || $t('cloudSync.unnamedDevice') }}</span>
                        <Edit size="12" class="device-edit-icon" @click="showRenameDeviceDialog" />
                        <span class="device-self-badge">{{ $t('cloudSync.thisDevice') }}</span>
                      </div>
                      <!-- 其他设备：只读 -->
                      <div class="device-name" v-else>
                        {{ device.deviceName || device.deviceId }}
                      </div>
                      <div class="device-time">{{ formatTime(device.lastModified) }}</div>
                    </div>
                    <button v-if="!device.isSelf" class="btn btn-secondary btn-sm btn-remove-device" @click="handleRemoveDevice(device)">
                      {{ $t('cloudSync.removeDevice') }}
                    </button>
                  </div>
                  <div class="device-empty" v-if="cloudStore.devices.length === 0">
                    {{ $t('cloudSync.neverSynced') }}
                  </div>
                </div>
                <div class="device-loading" v-else>
                  <Loading size="16" class="spin" />
                </div>
              </template>
            </div>
          </template>
        </div>
      </transition>
    </div>

    <!-- ===== 关于 ===== -->
    <div class="section-group">
      <div class="section-header">
        <h2 class="section-title">{{ $t('general.sectionAbout') }}</h2>
      </div>

      <div class="card card-appear" style="animation-delay: 0.02s">
        <div class="about-layout">
          <div class="about-brand">
            <div class="about-logo">
              <img class="about-icon" src="/icon.png" alt="iFlow" />
            </div>
            <div class="about-info">
              <div class="about-name">{{ $t('app.name') }}</div>
              <div class="about-version">{{ $t('update.currentVersion') }}: {{ appVersion }}</div>
              <div class="about-copyright">© 2026 {{ $t('app.company') }}</div>
            </div>
          </div>
          <div class="about-actions-col">
            <div class="auto-update-toggle">
              <label class="switch switch-sm">
                <input type="checkbox" v-model="autoUpdateEnabled" @change="onAutoUpdateChange" />
                <span class="slider"></span>
              </label>
              <span class="auto-update-label">{{ $t('update.menu.autoUpdate') }}</span>
            </div>
            <div class="about-btn-group">
              <button class="btn btn-secondary btn-sm" @click="checkForUpdates" :disabled="isCheckingUpdate">
                <Loading v-if="isCheckingUpdate" size="14" class="spin" />
                <Refresh v-else size="14" />
                {{ isCheckingUpdate ? $t('update.checking') : $t('update.menu.checkUpdate') }}
              </button>
              <button v-if="updateReady" class="btn btn-primary btn-sm" @click="handleInstallUpdate">
                {{ $t('update.installNow') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card card-appear" style="animation-delay: 0.05s">
        <div class="card-title">
          <TopicDiscussion size="16" />
          {{ $t('general.feedback') }}
        </div>
        <div class="feedback-channels">
          <a class="feedback-channel-item" @click.prevent="openExternal('https://vibex.iflow.cn/t/topic/5776')">
            <div class="feedback-channel-icon">
              <TopicDiscussion size="20" />
            </div>
            <div class="feedback-channel-info">
              <div class="feedback-channel-name">{{ $t('general.feedbackForum') }}</div>
              <div class="feedback-channel-desc">{{ $t('general.feedbackForumDesc') }}</div>
            </div>
            <Right size="14" class="feedback-channel-arrow" />
          </a>
          <a class="feedback-channel-item" @click.prevent="openExternal('https://github.com/yuentao/iFlow-Settings-Editor-GUI/issues')">
            <div class="feedback-channel-icon github-icon">
              <GithubOne size="20" />
            </div>
            <div class="feedback-channel-info">
              <div class="feedback-channel-name">{{ $t('general.feedbackGithub') }}</div>
              <div class="feedback-channel-desc">{{ $t('general.feedbackGithubDesc') }}</div>
            </div>
            <Right size="14" class="feedback-channel-arrow" />
          </a>
        </div>
      </div>
    </div>

    <!-- 重命名设备对话框 -->
    <div v-if="renameDeviceDialog.show" class="dialog-overlay" @click.self="closeRenameDeviceDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t('cloudSync.renameDevice') }}</div>
        <input type="text" class="form-input" v-model="renameDeviceDialog.name" :placeholder="$t('cloudSync.deviceNamePlaceholder')" maxlength="50" @keyup.enter="confirmRenameDevice" ref="renameDeviceInputRef" />
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeRenameDeviceDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="confirmRenameDevice" :disabled="!renameDeviceDialog.name.trim()">{{ $t('dialog.confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 密码输入对话框 -->
    <div v-if="passwordDialog.show" class="dialog-overlay password-dialog-overlay" @click.self="closePasswordDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t(passwordDialog.title) }}</div>
        <div class="dialog-body">
          <div class="form-group" v-if="passwordDialog.showOldPassword">
            <label class="form-label">{{ $t('cloudSync.oldPassword') }}</label>
            <input type="password" class="form-input" v-model="passwordDialog.oldPassword" :placeholder="$t('cloudSync.oldPassword')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t(passwordDialog.newPasswordLabel || 'cloudSync.newPassword') }}</label>
            <input type="password" class="form-input" v-model="passwordDialog.password" :placeholder="$t('cloudSync.passwordMinLength')" />
          </div>
          <div class="form-group" v-if="passwordDialog.showConfirm">
            <label class="form-label">{{ $t('cloudSync.confirmPassword') }}</label>
            <input type="password" class="form-input" v-model="passwordDialog.confirmPassword" :placeholder="$t('cloudSync.confirmPassword')" @keyup.enter="passwordDialog.onConfirm" />
          </div>
          <div class="password-error" v-if="passwordDialog.error">{{ passwordDialog.error }}</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closePasswordDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="passwordDialog.onConfirm" :disabled="!passwordDialog.password">
            {{ $t('dialog.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 同步密码输入对话框 -->
    <div v-if="syncPasswordDialog.show" class="dialog-overlay sync-password-overlay" @click.self="closeSyncPasswordDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t('cloudSync.enterPassword') }}</div>
        <div class="dialog-body">
          <div class="form-group">
            <input
              type="password"
              class="form-input"
              v-model="syncPasswordDialog.password"
              :placeholder="$t('cloudSync.enterPassword')"
              @keyup.enter="syncPasswordDialog.show && syncPasswordDialog.onConfirm && syncPasswordDialog.onConfirm()"
              autofocus />
          </div>
          <div class="password-error" v-if="syncPasswordDialog.error">{{ syncPasswordDialog.error }}</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeSyncPasswordDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-primary" @click="syncPasswordDialog.show && syncPasswordDialog.onConfirm && syncPasswordDialog.onConfirm()" :disabled="!syncPasswordDialog.password">
            {{ $t('cloudSync.syncNow') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 云同步确认对话框 -->
    <div v-if="cloudConfirmDialog.show" class="dialog-overlay" @click.self="closeCloudConfirmDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-title">{{ $t(cloudConfirmDialog.title) }}</div>
        <div class="dialog-confirm-text">{{ $t(cloudConfirmDialog.message, cloudConfirmDialog.params) }}</div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeCloudConfirmDialog">{{ $t('dialog.cancel') }}</button>
          <button class="btn btn-danger" @click="cloudConfirmDialog.onConfirm">{{ $t('dialog.confirm') }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Globe, Rocket, Refresh, Loading, LinkCloud, Delete, Link, CheckSmall, CloseSmall, Edit, Communication, DataScreen, Time, DataDisplay, FilterOne, TopicDiscussion, GithubOne, Right } from '@icon-park/vue-next'
import CloudSyncWizard from '../components/CloudSyncWizard.vue'
import { useCloudSyncStore } from '@/stores/cloudSync'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:settings'])

import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const cloudStore = useCloudSyncStore()
const toast = useToast()

// 云同步状态 refs（从 cloudSync store 中提取，Pinia 已自动 unwrap，直接使用）
const syncEnabled = computed(() => cloudStore.syncEnabled)
const autoSyncEnabled = computed(() => cloudStore.autoSyncEnabled)

const localSettings = computed({
  get: () => props.settings,
  set: val => emit('update:settings', val),
})

const autoLaunchEnabled = ref(false)
const autoUpdateEnabled = ref(true)
const appVersion = ref('1.0.0')
const systemTheme = ref('Light')
const isCheckingUpdate = ref(false)
let checkUpdateTimer = null

// 云同步状态（由 cloudSync store 统一管理，包括 localStorage 持久化）
const selectedProvider = ref('webdav')
const deviceName = ref('')
const tombstoneRetentionDays = ref(30)
const webdavConfig = ref({
  serverUrl: '',
  username: '',
  password: '',
})
const passwordDialog = ref({
  show: false,
  title: 'cloudSync.setPassword',
  newPasswordLabel: 'cloudSync.newPassword',
  showOldPassword: false,
  showConfirm: true,
  password: '',
  confirmPassword: '',
  oldPassword: '',
  error: '',
  onConfirm: null,
})
const syncPasswordDialog = ref({
  show: false,
  password: '',
  error: '',
  onConfirm: null,
  onCancel: null,
})
const cloudConfirmDialog = ref({
  show: false,
  title: '',
  message: '',
  params: {},
  onConfirm: null,
})

// 更新相关状态
const updateReady = ref(false)
const updateVersion = ref('')

const supportsAcrylic = computed(() => {
  if (typeof document === 'undefined' || !('backdropFilter' in document.documentElement.style)) return false
  const effectiveTheme = props.settings.uiTheme === 'System' ? systemTheme.value : props.settings.uiTheme
  return effectiveTheme !== 'Dark'
})

// 更新状态变化处理
const handleStatusChanged = state => {
  if (state.status === 'downloaded') {
    updateReady.value = true
    updateVersion.value = state.info?.version || ''
  } else {
    updateReady.value = false
  }
}

onMounted(async () => {
  // 加载云同步设置（确保默认值正确显示）
  await cloudStore.loadSettings()

  // 加载系统主题
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  systemTheme.value = isDark ? 'Dark' : 'Light'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    systemTheme.value = e.matches ? 'Dark' : 'Light'
  })

  // 加载自启动状态
  try {
    if (window.electronAPI && window.electronAPI.getAutoLaunch) {
      const result = await window.electronAPI.getAutoLaunch()
      if (result.success) {
        autoLaunchEnabled.value = result.enabled
      }
    }
  } catch (error) {
    console.error('Failed to load auto launch status:', error)
  }

  // 获取应用版本
  try {
    if (window.electronAPI && window.electronAPI.getAppVersion) {
      const result = await window.electronAPI.getAppVersion()
      if (result?.version) {
        appVersion.value = result.version
      }
    }
  } catch (error) {
    console.error('Failed to load app version:', error)
  }

  // 加载自动更新状态
  try {
    if (window.electronAPI && window.electronAPI.getAutoUpdate) {
      const result = await window.electronAPI.getAutoUpdate()
      if (result.success) {
        autoUpdateEnabled.value = result.enabled
      }
    }
  } catch (error) {
    console.error('Failed to load auto update status:', error)
  }

  // 检查当前更新状态
  const checkUpdateState = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getUpdateStatus) {
        const result = await window.electronAPI.getUpdateStatus()
        if (result.success && result.status === 'downloaded') {
          updateReady.value = true
          updateVersion.value = result.info?.version || ''
        }
      }
    } catch (error) {
      console.error('Failed to get update status:', error)
    }
  }
  await checkUpdateState()

  // 监听更新状态变化
  window.electronAPI.onUpdateStatusChanged(handleStatusChanged)

  // 初始化云同步状态（开关状态由 localStorage 持久化，不从 settings.json 加载）
  await cloudStore.loadStatus()
  await cloudStore.getRememberPassword()
  deviceName.value = cloudStore.status.deviceName || ''
  selectedProvider.value = cloudStore.status.provider || 'webdav'
  tombstoneRetentionDays.value = cloudStore.status.tombstoneRetentionDays || 30
  if (cloudStore.syncEnabled && cloudStore.isConfigured) {
    await cloudStore.loadDevices()
  }
  if (window.electronAPI?.onCloudSyncStatusChanged) {
    window.electronAPI.onCloudSyncStatusChanged(handleCloudSyncStatusChanged)
  }
})

onUnmounted(() => {
  if (window.electronAPI && window.electronAPI.removeUpdateListener) {
    window.electronAPI.removeUpdateListener('update-status-changed', handleStatusChanged)
  }
  if (window.electronAPI?.removeListener) {
    window.electronAPI.removeListener('cloud-sync:status-changed', handleCloudSyncStatusChanged)
  }
})

const handleInstallUpdate = async () => {
  try {
    if (window.electronAPI && window.electronAPI.installUpdate) {
      await window.electronAPI.installUpdate()
    }
  } catch (error) {
    console.error('Failed to install update:', error)
    toast.error(t('update.installFailed'))
  }
}

const openExternal = async (url) => {
  if (window.electronAPI?.openExternal) {
    await window.electronAPI.openExternal(url)
  }
}

const checkForUpdates = async () => {
  // 防抖：检查更新中或 2 秒内再次点击则忽略
  if (isCheckingUpdate.value) return
  isCheckingUpdate.value = true

  // 2 秒后恢复检查状态
  if (checkUpdateTimer) clearTimeout(checkUpdateTimer)
  checkUpdateTimer = setTimeout(() => {
    isCheckingUpdate.value = false
  }, 2000)

  try {
    if (window.electronAPI && window.electronAPI.checkForUpdates) {
      const result = await window.electronAPI.checkForUpdates()
      if (result.success) {
        if (result.hasUpdate) {
          // 更新可用，会通过 onUpdateAvailable 事件触发显示通知
        } else {
          // 已是最新版本
          toast.info(t('update.noUpdate'))
        }
      }
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
    toast.error(t('update.checkFailed'))
  } finally {
    // 如果没有成功恢复，在这里也恢复状态
    setTimeout(() => {
      isCheckingUpdate.value = false
    }, 2000)
  }
}

const onAutoLaunchChange = async () => {
  const newValue = autoLaunchEnabled.value
  try {
    if (window.electronAPI && window.electronAPI.setAutoLaunch) {
      const result = await window.electronAPI.setAutoLaunch(newValue)
      if (!result?.success) {
        // 设置失败，回滚开关状态
        autoLaunchEnabled.value = !newValue
        console.error('Failed to set auto launch:', result?.error || 'Unknown error')
      }
    }
  } catch (error) {
    // 异常时回滚开关状态
    autoLaunchEnabled.value = !newValue
    console.error('Failed to set auto launch:', error)
  }
}

const onAutoUpdateChange = async () => {
  try {
    if (window.electronAPI && window.electronAPI.setAutoUpdate) {
      await window.electronAPI.setAutoUpdate(autoUpdateEnabled.value)
    }
  } catch (error) {
    console.error('Failed to set auto update:', error)
  }
}

// Exclude tools: array ↔ textarea text conversion
const excludeToolsText = computed(() => {
  const tools = props.settings.excludeTools
  if (!tools || !Array.isArray(tools) || tools.length === 0) return ''
  return tools.join('\n')
})

const onExcludeToolsInput = e => {
  const text = e.target.value
  const tools = text
    .split('\n')
    .map(s => s.trim())
    .filter(s => s)
  emit('update:settings', { ...props.settings, excludeTools: tools })
}

const updateSliderValue = e => {
  const value = Number(e.target.value)
  emit('update:settings', { ...props.settings, acrylicIntensity: value })
}

// === 云同步 Computed ===
const canTestConnection = computed(() => {
  return webdavConfig.value.serverUrl.trim() && webdavConfig.value.username.trim() && webdavConfig.value.password.trim() && !cloudStore.isTestingConnection
})

// 云同步配置阶段（用于状态分层显示）
const cloudSetupPhase = computed(() => {
  if (!cloudStore.status.isAuthorized && !cloudStore.status.hasPassword) return 'unconfigured'
  if (cloudStore.status.isAuthorized && !cloudStore.status.hasPassword) return 'missingPassword'
  if (!cloudStore.status.isAuthorized && cloudStore.status.hasPassword) return 'missingProvider'
  return 'configured'
})

const statusClass = computed(() => {
  if (!syncEnabled.value) return 'status-disabled'
  if (cloudStore.isSyncing) return 'status-syncing'
  if (cloudSetupPhase.value === 'unconfigured') return 'status-unconfigured'
  if (cloudSetupPhase.value === 'missingPassword' || cloudSetupPhase.value === 'missingProvider') return 'status-incomplete'
  if (cloudStore.status.lastSyncError) return 'status-error'
  return 'status-ready'
})

const statusLabel = computed(() => {
  const s = cloudStore.statusText
  const map = {
    disabled: t('cloudSync.statusPaused'),
    syncing: t('cloudSync.statusSyncing'),
    notConfigured: t('cloudSync.statusUnconfigured'),
    error: t('cloudSync.statusError'),
    ready: t('cloudSync.statusReady'),
  }
  return map[s] || s
})

// 下一步引导提示
const nextStepHint = computed(() => {
  switch (cloudSetupPhase.value) {
    case 'unconfigured':
      return t('cloudSync.hintConfigure')
    case 'missingPassword':
      return t('cloudSync.hintSetPassword')
    case 'missingProvider':
      return t('cloudSync.hintConnectProvider')
    default:
      return null
  }
})

// M-3: 把主进程抛出的错误码映射为本地化提示。
// 未识别的错误码或自由文本原样返回，避免界面上出现裸露的 SYNC_xxx 字符串。
const SYNC_ERROR_I18N_MAP = {
  SYNC_PASSWORD_INCORRECT: 'cloudSync.errPasswordIncorrect',
  SYNC_PASSWORD_LIKELY_INCORRECT: 'cloudSync.errPasswordLikelyIncorrect',
  SYNC_PASSWORD_NOT_SET: 'cloudSync.errorPasswordRequired',
  SYNC_PASSWORD_TOO_SHORT: 'cloudSync.passwordMinLength',
  SYNC_PROVIDER_REQUIRED: 'cloudSync.errorProviderRequired',
  SYNC_IN_PROGRESS: 'cloudSync.statusSyncing',
}

function formatSyncError(err) {
  if (!err) return ''
  const key = SYNC_ERROR_I18N_MAP[err]
  return key ? t(key) : err
}

const lastSyncErrorText = computed(() => formatSyncError(cloudStore.status.lastSyncError))

// === 云同步 Methods ===
function formatTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    if (isToday) return time
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + time
  } catch {
    return isoStr
  }
}

function showCloudMessage({ type = 'info', title, message }) {
  toast[type](message)
}

// 待处理的云同步启用标记（密码设置完成后继续）
const pendingSyncEnable = ref(false)

async function onToggleSyncEnabled(event) {
  // event.target.checked tells us the intended new state (what the user is clicking TO)
  // We use @click.stop with :checked instead of v-model, so the ref isn't toggled before this handler runs
  const targetChecked = event.target.checked
  if (targetChecked) {
    // 开启云同步：检查是否已完成配置（WebDAV 连接 + 同步密码）
    if (!cloudStore.isConfigured) {
      // 未完成配置，先将开关设置为开启状态（让 v-show 展开 section-body）
      // 向导组件会显示在模板中（v-if="!cloudStore.isConfigured"）
      // 用户完成向导后 onWizardComplete 会最终确认 syncEnabled 状态
      cloudStore.setSyncEnabled(true)
    } else {
      // 已完成配置，直接启用
      cloudStore.setSyncEnabled(true)
      await cloudStore.loadStatus()
    }
  } else {
    // 关闭云同步
    cloudStore.setSyncEnabled(false)
    // 同步关闭时，同时关闭自动同步，保持状态一致
    cloudStore.setAutoSyncEnabled(false)
    await cloudStore.setAutoSync(false)
  }
}

async function onToggleAutoSync() {
  // 使用 !cloudStore.autoSyncEnabled 判断目标状态，而不是 event.target.checked
  // 因为 Vue 的 :checked 绑定在 @change 触发前就已经覆盖了 DOM 的 checked 属性
  const enabled = !cloudStore.autoSyncEnabled
  if (enabled) {
    // 开启自动同步：如果有缓存密码直接使用，跳过弹框
    if (cloudStore.cachedPassword) {
      const syncResult = await cloudStore.setAutoSync(true)
      if (syncResult.success) {
        cloudStore.setAutoSyncEnabled(true)
      } else {
        // 设置失败（可能是缓存密码过期），回滚并提示
        cloudStore.setAutoSyncEnabled(false)
        showCloudMessage({ type: 'error', title: t('cloudSync.setAutoSyncFailed'), message: syncResult.error || '' })
      }
    } else {
      // 无缓存密码，弹框验证（保持现有逻辑）
      syncPasswordDialog.value = {
        show: true,
        password: '',
        error: '',
        onConfirm: handleAutoSyncPasswordConfirm,
        onCancel: () => {
          // 用户取消对话框，确保关闭自动同步（同时回滚 UI 开关状态）
          cloudStore.setAutoSyncEnabled(false)
          cloudStore.setAutoSync(false)
        },
      }
      nextTick(() => {
        const input = document.querySelector('.sync-password-overlay .form-input')
        if (input) input.focus()
      })
    }
  } else {
    // 关闭自动同步：直接关闭
    await cloudStore.setAutoSync(false)
    cloudStore.setAutoSyncEnabled(false)
  }
}

async function handleAutoSyncPasswordConfirm() {
  const { password } = syncPasswordDialog.value
  if (!password) return
  const verifyResult = await cloudStore.verifyPassword(password)
  if (verifyResult.success && verifyResult.valid) {
    // 验证成功，清除 onCancel 避免关闭时回滚开关
    syncPasswordDialog.value.onCancel = null
    // 验证成功，密码已缓存到主进程，开启自动同步
    const syncResult = await cloudStore.setAutoSync(true)
    // 检查设置结果，确保成功后才关闭对话框
    if (syncResult.success) {
      cloudStore.setAutoSyncEnabled(true)
      closeSyncPasswordDialog()
    } else {
      // 设置失败，重置对话框状态，让用户可以重试
      syncPasswordDialog.value.error = formatSyncError(syncResult.error) || t('cloudSync.setAutoSyncFailed')
      syncPasswordDialog.value.onCancel = () => {
        cloudStore.setAutoSync(false)
      }
      // 同时回滚 checkbox 状态以反映真实情况
      cloudStore.setAutoSyncEnabled(false)
      cloudStore.setAutoSync(false)
    }
  } else {
    syncPasswordDialog.value.error = t('cloudSync.passwordIncorrect')
  }
}

function onProviderChange() {
  cloudStore.connectionTestResult = null
}

async function handleTestConnection() {
  const config = { ...webdavConfig.value }
  await cloudStore.configureProvider('webdav', config)
  await cloudStore.testConnection()
}

async function handleSaveProvider() {
  const config = { ...webdavConfig.value }
  const result = await cloudStore.configureProvider('webdav', config)
  if (result.success) {
    showCloudMessage({ type: 'success', title: t('messages.success'), message: t('cloudSync.connectionSuccess') })
  } else {
    showCloudMessage({ type: 'error', title: t('messages.error'), message: formatSyncError(result.error) || t('cloudSync.connectionFailed') })
  }
}

async function handleRevokeAuth() {
  const result = await cloudStore.revokeAuth()
  if (result.success) {
    webdavConfig.value = { serverUrl: '', username: '', password: '' }
  }
}

// 设备重命名弹框
const renameDeviceDialog = ref({ show: false, name: '' })
const renameDeviceInputRef = ref(null)

function showRenameDeviceDialog() {
  renameDeviceDialog.value = { show: true, name: deviceName.value }
  nextTick(() => {
    renameDeviceInputRef.value?.focus()
    renameDeviceInputRef.value?.select()
  })
}

async function confirmRenameDevice() {
  const trimmed = renameDeviceDialog.value.name.trim()
  if (!trimmed) return
  closeRenameDeviceDialog()
  if (trimmed !== cloudStore.status.deviceName) {
    await cloudStore.setDeviceName(trimmed)
    deviceName.value = trimmed
  }
}

function closeRenameDeviceDialog() {
  renameDeviceDialog.value.show = false
}

async function handleSetTombstoneRetentionDays() {
  let days = tombstoneRetentionDays.value
  if (typeof days !== 'number' || Number.isNaN(days) || days < 1) days = 1
  if (days > 365) days = 365
  tombstoneRetentionDays.value = days
  const result = await window.electronAPI.cloudSyncSetTombstoneRetentionDays(days)
  if (result.success && result.tombstoneRetentionDays) {
    tombstoneRetentionDays.value = result.tombstoneRetentionDays
  }
}

async function handleRemoveDevice(device) {
  cloudConfirmDialog.value = {
    show: true,
    title: t('cloudSync.removeDevice'),
    message: t('cloudSync.confirmRemoveDevice', { name: device.deviceName || device.deviceId }),
    params: {},
    onConfirm: async () => {
      await cloudStore.removeDevice(device.deviceId)
      closeCloudConfirmDialog()
    },
  }
}

function showSetPasswordDialog() {
  passwordDialog.value = {
    show: true,
    title: 'cloudSync.setPassword',
    newPasswordLabel: 'cloudSync.newPassword',
    showOldPassword: false,
    showConfirm: true,
    password: '',
    confirmPassword: '',
    oldPassword: '',
    error: '',
    onConfirm: handleSetPasswordConfirm,
    onCancel: () => {
      // User cancelled after clicking the sync checkbox - revert checkbox state
      if (pendingSyncEnable.value) {
        pendingSyncEnable.value = false
        cloudStore.setSyncEnabled(false)
      }
    },
  }
  nextTick(() => {
    const input = document.querySelector('.password-dialog-overlay .form-input')
    if (input) input.focus()
  })
}

function showChangePasswordDialog() {
  passwordDialog.value = {
    show: true,
    title: 'cloudSync.changePassword',
    newPasswordLabel: 'cloudSync.newPassword',
    showOldPassword: true,
    showConfirm: true,
    password: '',
    confirmPassword: '',
    oldPassword: '',
    error: '',
    onConfirm: handleChangePasswordConfirm,
  }
}

async function handleSetPasswordConfirm() {
  const { password, confirmPassword } = passwordDialog.value
  if (password.length < 8) {
    passwordDialog.value.error = t('cloudSync.passwordMinLength')
    return
  }
  if (password !== confirmPassword) {
    passwordDialog.value.error = t('cloudSync.passwordMismatch')
    return
  }
  const result = await cloudStore.setPassword(password)
  if (result.success) {
    // 清除 onCancel，避免 closePasswordDialog 调用时回滚 checkbox 状态
    passwordDialog.value.onCancel = null
    // 关闭对话框前先设置 pendingSyncEnable = false，避免 onCancel 中错误地重置 syncEnabled
    const shouldEnableSync = pendingSyncEnable.value
    pendingSyncEnable.value = false
    closePasswordDialog()
    // 检查是否有待处理的云同步启用请求
    if (shouldEnableSync) {
      cloudStore.setSyncEnabled(true)
      await cloudStore.loadStatus()
    }
  } else {
    passwordDialog.value.error = formatSyncError(result.error) || t('messages.error')
  }
}

async function handleChangePasswordConfirm() {
  const { oldPassword, password, confirmPassword } = passwordDialog.value
  if (oldPassword.length < 8) {
    passwordDialog.value.error = t('cloudSync.passwordIncorrect')
    return
  }
  if (password.length < 8) {
    passwordDialog.value.error = t('cloudSync.passwordMinLength')
    return
  }
  if (password !== confirmPassword) {
    passwordDialog.value.error = t('cloudSync.passwordMismatch')
    return
  }
  const result = await cloudStore.changePassword(oldPassword, password)
  if (result.success) {
    closePasswordDialog()
    if (result.repushError) {
      // M-3: 主进程已用新密码尝试重推但失败，告知用户本机已更新但云端需重试
      showCloudMessage({
        type: 'warning',
        title: t('cloudSync.changePassword'),
        message: t('cloudSync.passwordChangedRepushFailed', { error: formatSyncError(result.repushError) }),
      })
    } else if (result.repushed) {
      // 主进程已自动用新密码重推成功，但其他设备文件仍由旧密码加密，需要在那些设备分别重推
      showCloudMessage({ type: 'info', title: t('cloudSync.changePassword'), message: t('cloudSync.passwordChangedNeedRepush') })
    } else if (result.needRepush) {
      // provider 未配置，主进程未尝试重推：渲染端兜底用新密码 push 一次
      showCloudMessage({ type: 'info', title: t('cloudSync.changePassword'), message: t('cloudSync.passwordChangedNeedRepush') })
      await cloudStore.push(password)
    }
  } else {
    passwordDialog.value.error = formatSyncError(result.error) || t('messages.error')
  }
}

function closePasswordDialog() {
  const cancel = passwordDialog.value.onCancel
  passwordDialog.value.show = false
  passwordDialog.value.error = ''
  passwordDialog.value.onConfirm = null
  passwordDialog.value.onCancel = null
  if (cancel) cancel()
}

async function onToggleRememberPassword(event) {
  const enabled = event.target.checked
  await cloudStore.setRememberPasswordValue(enabled)
}

function handleSyncNow() {
  if (cloudStore.cachedPassword) {
    cloudStore.syncNow().then(() => cloudStore.loadDevices())
  } else {
    syncPasswordDialog.value = {
      show: true,
      password: '',
      error: '',
      onConfirm: handleSyncPasswordConfirm,
      onCancel: null,
    }
    nextTick(() => {
      const input = document.querySelector('.sync-password-overlay .form-input')
      if (input) input.focus()
    })
  }
}

async function handleSyncPasswordConfirm() {
  const { password } = syncPasswordDialog.value
  if (!password) return
  const verifyResult = await cloudStore.verifyPassword(password)
  if (verifyResult.success && verifyResult.valid) {
    syncPasswordDialog.value.onCancel = null
    closeSyncPasswordDialog()
    const syncResult = await cloudStore.syncNow(password)
    if (syncResult.success) {
      cloudStore.loadDevices()
    } else {
      showCloudMessage({ type: 'error', title: t('messages.error'), message: formatSyncError(syncResult.error) || t('cloudSync.syncFailed') })
    }
  } else {
    syncPasswordDialog.value.error = t('cloudSync.passwordIncorrect')
  }
}

function closeSyncPasswordDialog() {
  const cancel = syncPasswordDialog.value.onCancel
  syncPasswordDialog.value.show = false
  syncPasswordDialog.value.error = ''
  syncPasswordDialog.value.onConfirm = null
  syncPasswordDialog.value.onCancel = null
  if (cancel) cancel()
}

function handleClearCloud() {
  cloudConfirmDialog.value = {
    show: true,
    title: t('cloudSync.dangerTitle'),
    message: t('cloudSync.confirmClearCloud'),
    params: {},
    onConfirm: async () => {
      const result = await cloudStore.clearCloud()
      closeCloudConfirmDialog()
      if (result.success) {
        showCloudMessage({ type: 'info', title: t('messages.success'), message: t('cloudSync.clearCloudSuccess') })
      } else {
        showCloudMessage({ type: 'error', title: t('messages.error'), message: formatSyncError(result.error) || t('messages.error') })
      }
    },
  }
}

function closeCloudConfirmDialog() {
  cloudConfirmDialog.value.show = false
}

// 向导完成回调
async function onWizardComplete() {
  // 启用云同步（向导第一步 configureProvider 时已保存 WebDAV 配置，
  // 但 syncEnabled 开关状态需要在此处显式设置与主进程状态同步）
  cloudStore.setSyncEnabled(true)
  // 刷新状态，isConfigured 将为 true，面板自动切换到正常模式
  await cloudStore.loadStatus()
}

// 向导取消回调
function onWizardCancel() {
  // 用户取消向导，关闭总开关
  cloudStore.setSyncEnabled(false)
}

const handleCloudSyncStatusChanged = state => {
  if (state) {
    Object.assign(cloudStore.status, state)
  }
}
</script>

<style lang="less" scoped>
// ============================================
// Section Groups
// ============================================
.general-settings {
  display: flex;
  flex-direction: column;
}

.section-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-2xl);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  user-select: none;
}

.content-header + .section-group {
  margin-top: 0;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.section-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.experimental-badge {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: var(--space-sm);
  vertical-align: middle;
  text-transform: none;
  letter-spacing: normal;
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  overflow: hidden;
}

// ============================================
// Card animation
// ============================================
.card-appear {
  animation: fadeInUp 0.3s ease backwards;
}

// ============================================
// Settings grid layout
// ============================================
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  gap: var(--space-lg);

  &.setting-item-main {
    padding: var(--space-md) 0;
  }

  &.setting-item-full {
    flex-direction: column;
    align-items: stretch;

    .setting-info {
      margin-bottom: var(--space-sm);
    }
  }
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.setting-desc {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.4;
}

.form-label-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-left: var(--space-xs);
  font-weight: normal;
}

.setting-select {
  width: 160px;
  flex-shrink: 0;
}

.setting-input-number {
  width: 100px;
  flex-shrink: 0;
  text-align: center;
}

.core-tools-textarea {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  resize: vertical;
  min-height: 60px;
}

.setting-divider {
  height: 1px;
  background: var(--border-light);
  margin: var(--space-md) 0;
}

// ============================================
// Slider
// ============================================
.slider-container {
  position: relative;
  width: 100%;
  height: 20px;
}

.slider-track {
  position: absolute;
  width: 100%;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  overflow: hidden;
}

.slider-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.05s ease;
}

.form-slider {
  position: absolute;
  width: 100%;
  height: 20px;
  background: transparent;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  top: 0;
  left: 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  &::-webkit-slider-thumb:active {
    transform: scale(0.95);
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
}

// ============================================
// Switch
// ============================================
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: 0.2s;
  border-radius: 22px;

  &:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
}

input:checked + .slider {
  background-color: var(--accent);
}

input:checked + .slider:before {
  transform: translateX(18px);
}

.switch-sm {
  width: 32px;
  height: 18px;

  .slider {
    &:before {
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
    }
  }

  input:checked + .slider:before {
    transform: translateX(14px);
  }
}

// ============================================
// Cloud sync - Status
// ============================================
.cloud-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
}

.cloud-status-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.cloud-status-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.auto-sync-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: nowrap;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: var(--font-size-sm);
  font-weight: 500;

  &.status-indicator-sm {
    padding: 2px 8px;
    font-size: var(--font-size-xs);
    border-radius: 12px;
  }

  &.status-ready {
    background: var(--success-bg);
    color: var(--success);
  }
  &.status-syncing {
    background: var(--info-bg);
    color: var(--info);
  }
  &.status-error {
    background: var(--danger-bg);
    color: var(--danger);
  }
  &.status-warning {
    background: var(--warning-bg);
    color: var(--warning);
  }
  &.status-disabled {
    background: var(--control-fill);
    color: var(--text-tertiary);
  }
  &.status-unconfigured {
    background: var(--control-fill);
    color: var(--text-tertiary);
  }
  &.status-incomplete {
    background: var(--warning-bg);
    color: var(--warning);
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;

  .status-syncing & {
    animation: pulse 1.5s ease-in-out infinite;
  }
}

.status-label {
  white-space: nowrap;
}
.status-label-inline {
  white-space: nowrap;
}
.status-meta {
  flex: 1;
  min-width: 0;
}
.status-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.next-step-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-style: italic;
  margin-left: var(--space-sm);
}

.sync-error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--danger-bg);
  color: var(--danger);
  border-radius: var(--radius);
  font-size: var(--font-size-xs);
  margin-top: var(--space-sm);
}

// ============================================
// Cloud sync - WebDAV form
// ============================================
.webdav-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-top: var(--space-md);
}

.webdav-actions {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.webdav-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
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
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.12));

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
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

.text-success {
  color: var(--success);
}
.text-danger {
  color: var(--danger);
}
.text-warning {
  color: var(--warning);
}

.provider-authorized {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--success-bg);
  border-radius: var(--radius);
  margin-top: var(--space-md);
}

.authorized-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.authorized-text {
  font-size: var(--font-size-sm);
  color: var(--success);
  font-weight: 500;
}

// ============================================
// Cloud sync - Password & Device
// ============================================
.password-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.device-edit-icon {
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity 0.15s ease;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 4px;
}
.device-name:hover .device-edit-icon {
  opacity: 1;
}
.device-edit-icon:hover {
  color: var(--accent);
}

.sub-section-header {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.03em;
  margin-top: var(--space-lg);
  margin-bottom: var(--space-sm);
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.device-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--control-fill);
  border-radius: var(--radius);
  transition: background 0.15s ease;

  &:hover {
    background: var(--control-fill-hover);
  }
}

.device-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
  &.is-self {
    background: var(--success);
  }
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.device-self-badge {
  font-size: var(--font-size-xs);
  padding: 1px 8px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 10px;
  font-weight: 500;
}

.device-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.btn-remove-device {
  opacity: 0;
  transition: opacity 0.15s ease;
  .device-item:hover & {
    opacity: 1;
  }
}

.device-empty {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.device-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-lg);
}

// ============================================
// Cloud sync - Sync content (inline layout)
// ============================================
.sync-content-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.sync-content-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-right: var(--space-xs);
}

.sync-content-tag {
  font-size: var(--font-size-xs);
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--bg-elevated);
  color: var(--text-primary);

  &.success {
    background: var(--success-bg);
    color: var(--success);
  }

  &.disabled {
    background: var(--control-fill-secondary);
    color: var(--text-tertiary);
  }
}

// ============================================
// Cloud sync - Danger card
// ============================================
.card-danger {
  border-color: var(--danger-bg);
  .card-title {
    color: var(--danger);
  }
}

.cloud-danger-zone {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--border-color);
  display: flex;
  justify-content: flex-end;
}

// ============================================
// About section - Compact horizontal layout
// ============================================
.about-layout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xl);
}

.about-brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  min-width: 0;
}

.about-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.about-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.about-info {
  flex: 1;
  min-width: 0;
}

.about-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1px;
}

.about-version {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 1px;
}

.about-copyright {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.about-actions-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.auto-update-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.auto-update-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  user-select: none;
}

.about-btn-group {
  display: flex;
  gap: var(--space-sm);
}

.feedback-channels {
  display: flex;
  gap: var(--space-md);
}

.feedback-channel-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: background 0.15s ease;
  text-decoration: none;

  &:hover {
    background: var(--bg-elevated);

    .feedback-channel-arrow {
      color: var(--text-secondary);
      transform: translateX(2px);
    }
  }
}

.feedback-channel-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--accent-light, rgba(0, 103, 192, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--accent);

  &.github-icon {
    background: rgba(36, 41, 47, 0.1);
    color: var(--text-primary);
  }
}

.feedback-channel-info {
  flex: 1;
  min-width: 0;
}

.feedback-channel-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1px;
}

.feedback-channel-desc {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.feedback-channel-arrow {
  color: var(--text-tertiary);
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.dialog-confirm-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-md);
}

.password-error {
  font-size: var(--font-size-xs);
  color: var(--danger);
  margin-top: var(--space-sm);
}

// ============================================
// Animations
// ============================================
.spin {
  animation: spin 1s linear infinite;
}

// ============================================
// Responsive
// ============================================
@media (max-width: 600px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;

    &.setting-item-main {
      flex-direction: row;
      align-items: center;
    }
  }

  .setting-select {
    width: 100%;
  }

  .about-layout {
    flex-direction: column;
    align-items: flex-start;
  }

  .about-actions-col {
    align-items: flex-start;
    width: 100%;
  }

  .feedback-channels {
    flex-direction: column;
  }

  .sync-content-grid {
    grid-template-columns: 1fr;
  }
}

// Security note styling
.security-note {
  margin-top: var(--space-xs);
  padding: var(--space-sm);
  background: var(--bg-tertiary);
  border-left: 3px solid var(--warning);
  border-radius: var(--radius-sm);

  .security-label {
    font-weight: 600;
    color: var(--warning);
  }
}
</style>
