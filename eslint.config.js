import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from '@vue/eslint-config-prettier'

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'release/',
      'coverage/',
      'build/',
      '*.config.js',
    ],
  },
  js.configs.recommended,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      ...stylistic.configs.recommended.rules,
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/quotes': ['warn', 'single', { avoidEscape: true }],
      '@stylistic/comma-dangle': ['warn', 'always-multiline'],
      '@stylistic/no-multiple-empty-lines': ['warn', { max: 1 }],
      '@stylistic/indent': ['warn', 2],
      '@stylistic/member-delimiter-style': ['warn', { multiline: { delimiter: 'none' }, singleline: { delimiter: 'comma' } }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-debugger': 'error',
    },
  },
  ...pluginVue.configs['flat/strongly-recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
    },
  },
  prettierConfig,
]