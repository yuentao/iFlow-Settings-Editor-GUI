import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
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
        'preload.js'
      ]
    }
  },
  resolve: {
    alias: {
      '/icon.png': path.resolve(__dirname, 'public/icon.png')
    }
  },
  server: {
    port: 5174
  }
});
