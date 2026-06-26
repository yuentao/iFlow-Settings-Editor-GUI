import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    testTimeout: 30000,
    setupFiles: [],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'release', '.git'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'release/',
        'test/',
        '**/*.config.js',
        'main.js',
        'preload.js',
        'src/main/workers/',
        'src/workers/',
      ],
      thresholds: {
        lines: 50,
        branches: 50,
        functions: 50,
        statements: 50,
      },
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '/icon.png': path.resolve(__dirname, 'public/icon.png'),
      '@icon-park/vue-next': path.resolve(__dirname, 'src/__mocks__/icon-park.js'),
      'vue-i18n': path.resolve(__dirname, 'src/__mocks__/vue-i18n.js'),
    }
  },
  server: {
    port: 5174
  }
});
