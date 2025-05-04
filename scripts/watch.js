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
  try {
    execSync('node scripts/build.js', { stdio: 'inherit' });
  } catch (error) {
  }
}

// Watch for changes
function watchForChanges() {

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
      buildExtension();
    })
    .on('add', filePath => {
      buildExtension();
    })
    .on('unlink', filePath => {
      buildExtension();
    });
}

// Main function
function main() {
  watchForChanges();
}

// Run the script
main(); 