import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@pixeltracer/core': resolve(__dirname, './packages/core/src'),
      '@pixeltracer/shared': resolve(__dirname, './packages/shared/src'),
      '@pixeltracer/ui': resolve(__dirname, './packages/ui/src'),
      '@pixeltracer/providers': resolve(__dirname, './packages/providers/src'),
    }
  }
});