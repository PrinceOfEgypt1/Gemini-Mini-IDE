import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    passWithNoTests: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    setupFiles: ['./src/__mocks__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts', '**/*.d.ts', '**/__mocks__/**'],
      thresholds: {
        lines: 15,
        functions: 45,
        branches: 70,
        statements: 15,
      }
    }
  },
  resolve: {
    alias: {
      'better-sqlite3': new URL('./src/__mocks__/better-sqlite3.ts', import.meta.url).pathname,
      'node:sqlite': new URL('./src/__mocks__/node-sqlite.ts', import.meta.url).pathname
    }
  }
});
