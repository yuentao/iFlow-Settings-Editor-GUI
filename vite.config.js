import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // 核心框架
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-i18n')) {
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
});