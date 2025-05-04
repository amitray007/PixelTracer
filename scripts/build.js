/**
 * Build script for PixelTracer extension
 * This script copies all necessary files to the build directory
 */
const fs = require('fs');
const path = require('path');

// Configuration
const BUILD_DIR = path.resolve(__dirname, '../build');
const SOURCE_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'liveview.css',
  'trackingProviders.js',
  'images/*'
];

// Ensure the build directory exists
function ensureBuildDirectory() {
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }
}

// Copy all source files to the build directory
function copyFiles() {
  for (const pattern of SOURCE_FILES) {
    if (pattern.includes('*')) {
      // Handle wildcards
      const dirPath = path.resolve(__dirname, '..', pattern.split('*')[0]);
      const destDir = path.resolve(BUILD_DIR, pattern.split('*')[0]);
      
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const srcFile = path.join(dirPath, file);
          const destFile = path.join(destDir, file);
          fs.copyFileSync(srcFile, destFile);
        }
      }
    } else {
      // Handle regular files
      const srcFile = path.resolve(__dirname, '..', pattern);
      const destFile = path.resolve(BUILD_DIR, pattern);
      
      if (fs.existsSync(srcFile)) {
        // Ensure directory exists
        const dir = path.dirname(destFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.copyFileSync(srcFile, destFile);
      } else {
      }
    }
  }
}

// Main function
function main() {
  
  // Clean old build
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  
  ensureBuildDirectory();
  copyFiles();
  
}

// Run the script
main(); 