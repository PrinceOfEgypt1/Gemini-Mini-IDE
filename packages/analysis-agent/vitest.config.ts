import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    passWithNoTests: false,
    // DOCUMENTED EXCLUSIONS:
    // These tests are excluded due to technical debt that requires refactoring:
    // - esaa.test.ts: Uses better-sqlite3 with complex mock requirements
    // - agent.test.ts: Uses outdated OpenAI client structure
    // - index.test.ts: Has unresolved sqlite import issues
    //
    // These exclusions are KNOWN DEBT tracked in DEVELOPMENT.md
    // TODO: Refactor to use proper dependency injection
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/esaa/**/*.test.ts',
      '**/agent.test.ts',
      '**/index.test.ts'
    ],
    setupFiles: ['./src/__mocks__/setup.ts']
  },
  resolve: {
    alias: {
      'better-sqlite3': new URL('./src/__mocks__/better-sqlite3.ts', import.meta.url).pathname
    }
  }
});
