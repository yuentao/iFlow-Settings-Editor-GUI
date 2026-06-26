import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueI18n from '@intlify/unplugin-vue-i18n/vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [
    // Only pre-compile i18n messages in production builds (dev mode uses runtime compiler)
    ...(mode !== 'development' ? [
      vueI18n({
        compositionOnly: true,
        include: [path.resolve(__dirname, 'src/locales/**')],
        strictMessage: false,
      }),
    ] : []),
    vue(),
    // strip 'unsafe-eval' from CSP in production build
    {
      name: 'strip-unsafe-eval-csp',
      transformIndexHtml(html) {
        if (mode !== 'development') {
          return html.replace(" 'unsafe-eval'", '')
        }
        return html
      },
    },
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // 核心框架 + i18n 全家桶（@intlify 子包需要与 vue-i18n 同 chunk 避免 tree-shaking 失效）
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-i18n') || id.includes('node_modules/@intlify')) {
            return 'vendor-vue'
          }
          // 图表库（仅在 Dashboard 使用，独立分包减少首屏体积）
          if (id.includes('node_modules/apexcharts') || id.includes('node_modules/vue3-apexcharts')) {
            return 'vendor-charts'
          }
          // 工具库集合
          if (id.includes('node_modules/@vueuse/core')) {
            return 'vendor-vueuse'
          }
          // 图标库
          if (id.includes('node_modules/@icon-park')) {
            return 'vendor-icons'
          }
          // 解析器/工具（不常变动，可长期缓存）
          if (id.includes('node_modules/marked') || id.includes('node_modules/fast-xml-parser') || id.includes('node_modules/diff') || id.includes('node_modules/@iarna/toml')) {
            return 'vendor-parsers'
          }
          // 日期库（较大，独立分包；后续可考虑替换为 dayjs 减小体积）
          if (id.includes('node_modules/moment')) {
            return 'vendor-moment'
          }
          // 其余小型依赖统一打包
          return 'vendor-common'
        },
      },
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
}));