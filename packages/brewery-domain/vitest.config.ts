import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000, // 30s for database tests
    hookTimeout: 30000,
    poolOptions: {
      threads: {
        singleThread: true, // Sequential for DB tests
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})



















