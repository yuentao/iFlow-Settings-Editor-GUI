<template>
  <section>
    <div class="content-header">
      <h1 class="content-title">{{ $t('general.title') }}</h1>
      <p class="content-desc">{{ $t('general.description') }}</p>
    </div>
    <div class="card">
      <div class="card-title">
        <Globe size="16" />
        {{ $t('general.languageInterface') }}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('general.language') }}</label>
          <select class="form-select" v-model="localSettings.language">
            <option value="zh-CN">{{ $t('languages.zh-CN') }}</option>
            <option value="en-US">{{ $t('languages.en-US') }}</option>
            <option value="ja-JP">{{ $t('languages.ja-JP') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('general.theme') }}</label>
          <select class="form-select" v-model="localSettings.theme">
            <option value="Xcode">{{ $t('theme.xcode') }}</option>
            <option value="Dark">{{ $t('theme.dark') }}</option>
            <option value="Light">{{ $t('theme.light') }}</option>
            <option value="Solarized Dark">{{ $t('theme.solarizedDark') }}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">
        <Setting size="16" />
        {{ $t('general.otherSettings') }}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">{{ $t('general.bootAnimation') }}</label>
          <select class="form-select" v-model="localSettings.bootAnimationShown">
            <option :value="true">{{ $t('general.bootAnimationShown') }}</option>
            <option :value="false">{{ $t('general.bootAnimationNotShown') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('general.checkpointing') }}</label>
          <select class="form-select" v-model="localSettings.checkpointing.enabled">
            <option :value="true">{{ $t('general.enabled') }}</option>
            <option :value="false">{{ $t('general.disabled') }}</option>
          </select>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Globe, Setting } from '@icon-park/vue-next'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:settings'])

import { computed } from 'vue'

const localSettings = computed({
  get: () => props.settings,
  set: val => emit('update:settings', val),
})
</script>

<style lang="less" scoped></style>
