import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // NOTE: passWithNoTests is intentionally set to true only for packages
    // that legitimately have no tests (e.g., type-only packages).
    // For packages that should have tests, use package-level vitest.config.ts
    passWithNoTests: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
      // Minimum coverage thresholds
      thresholds: {
        // Start with achievable thresholds, increase over time
        lines: 30,
        functions: 30,
        branches: 20,
        statements: 30
      }
    }
  }
});
