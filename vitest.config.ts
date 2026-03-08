import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // passWithNoTests: false ensures packages without tests are flagged
    // Exception: type-only packages should use package-level config
    passWithNoTests: false,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx', 'packages/*/test/**/*.test.ts', 'packages/*/test/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    // Fail fast on first test failure in CI
    bail: process.env.CI ? 1 : 0,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/test/**',
        '**/__mocks__/**',
        '**/types/**',
        '**/*.d.ts'
      ],
      // ENFORCED thresholds - CI will fail if not met
      thresholds: {
        // Minimum acceptable coverage
        lines: 25,
        functions: 25,
        branches: 15,
        statements: 25,
        // Per-file thresholds (warn but don't fail)
        perFile: false
      }
    },
    // Reporter configuration
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: {
      junit: './test-results/junit.xml'
    }
  }
});
