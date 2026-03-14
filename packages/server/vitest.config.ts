import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.d.ts'],
      thresholds: {
        lines: 5,
        functions: 20,
        branches: 50,
        statements: 5,
      }
    }
  }
});
