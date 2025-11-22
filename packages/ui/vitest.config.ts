/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // AQUI ESTÁ A CHAVE
    setupFiles: [],
    include: ['test/**/*.test.tsx', 'src/**/*.test.tsx'],
  },
});
