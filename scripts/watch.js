/**
 * Watch script for PixelTracer extension
 * This script watches for file changes and rebuilds the extension
 */
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { execSync } = require('child_process');

// Configuration
const SOURCE_DIR = path.resolve(__dirname, '..');
const WATCH_PATTERNS = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'liveview.css',
  'trackingProviders.js',
  'images/**/*'
];

// Full paths to watch
const watchPaths = WATCH_PATTERNS.map(pattern => path.join(SOURCE_DIR, pattern));

// Build the extension
function buildExtension() {
  console.log('\n--- Rebuilding extension ---');
  try {
    execSync('node scripts/build.js', { stdio: 'inherit' });
    console.log('--- Rebuild complete ---\n');
  } catch (error) {
    console.error('Error during rebuild:', error);
  }
}

// Watch for changes
function watchForChanges() {
  console.log('Watching for file changes...');
  console.log('Press Ctrl+C to stop');

  // Initial build
  buildExtension();

  // Set up file watcher
  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true
  });

  // File change event handler
  watcher
    .on('change', filePath => {
      console.log(`File changed: ${path.relative(SOURCE_DIR, filePath)}`);
      buildExtension();
    })
    .on('add', filePath => {
      console.log(`File added: ${path.relative(SOURCE_DIR, filePath)}`);
      buildExtension();
    })
    .on('unlink', filePath => {
      console.log(`File removed: ${path.relative(SOURCE_DIR, filePath)}`);
      buildExtension();
    });
}

// Main function
function main() {
  console.log('Starting PixelTracer development mode...');
  watchForChanges();
}

// Run the script
main(); 