import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  mode: 'development',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/assets/icons/*',
          dest: 'assets/icons'
        },
        {
          src: '../../packages/ui/src/assets/icons/*',
          dest: 'assets/provider-icons'
        },
        {
          src: 'src/manifest.json',
          dest: ''
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // Extension entry points
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'esnext',
    minify: true, // Keep readable for development
    sourcemap: false, // Generate source maps for debugging
    copyPublicDir: false, // We'll handle assets manually
  },
  resolve: {
    alias: {
      '@pixeltracer/core': resolve(__dirname, '../../packages/core/src'),
      '@pixeltracer/shared': resolve(__dirname, '../../packages/shared/src'),
      '@pixeltracer/ui': resolve(__dirname, '../../packages/ui/src'),
      '@pixeltracer/providers': resolve(__dirname, '../../packages/providers/src'),
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});