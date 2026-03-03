import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    // Exclude tests that depend on native modules (better-sqlite3)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/esaa/**/*.test.ts',
      '**/agent.test.ts',
      '**/index.test.ts'
    ]
  },
  resolve: {
    alias: {
      // Mock better-sqlite3 for tests that don't need it
      'better-sqlite3': new URL('./src/__mocks__/better-sqlite3.ts', import.meta.url).pathname
    }
  }
});
