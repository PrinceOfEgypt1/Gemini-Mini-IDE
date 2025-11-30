import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Busca recursiva em todas as subpastas
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    environment: 'node',
    globals: true
  }
});
