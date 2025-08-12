import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  mode: 'production',
  plugins: [
    react(),
    // Custom plugin to sync manifest.json version with package.json
    {
      name: 'sync-manifest-version',
      buildStart() {
        try {
          // Read package.json to get current version
          const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
          const manifestPath = resolve(__dirname, 'src/manifest.json');
          
          // Read current manifest.json
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          
          // Update version if it's different
          if (manifest.version !== packageJson.version) {
            manifest.version = packageJson.version;
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
            console.log(`📦 Updated manifest.json version to ${packageJson.version}`);
          }
        } catch (error) {
          console.warn('⚠️  Failed to sync manifest version:', error.message);
        }
      }
    },
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
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
});