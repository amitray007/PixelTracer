/**
 * Script to package the extension as a ZIP file
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const BUILD_DIR = path.resolve(__dirname, '../build');
const DEST_ZIP = path.resolve(__dirname, '../dist/pixeltracer.zip');
const SOURCE_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'trackingProviders.js',
  'images/*'
];

// Ensure the build and dist directories exist
function ensureDirectories() {
  if (!fs.existsSync(path.dirname(DEST_ZIP))) {
    fs.mkdirSync(path.dirname(DEST_ZIP), { recursive: true });
  }
  
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
          console.log(`Copied ${srcFile} to ${destFile}`);
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
        console.log(`Copied ${srcFile} to ${destFile}`);
      } else {
        console.warn(`Warning: Source file ${srcFile} does not exist`);
      }
    }
  }
}

// Create a zip file from the build directory
function createZip() {
  // Create a file to stream archive data to
  const output = fs.createWriteStream(DEST_ZIP);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Compression level
  });
  
  // Listen for all archive data to be written
  output.on('close', function() {
    console.log(`Archive created: ${DEST_ZIP}`);
    console.log(`Total bytes: ${archive.pointer()}`);
  });
  
  // Handle warnings and errors
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn(err);
    } else {
      throw err;
    }
  });
  
  archive.on('error', function(err) {
    throw err;
  });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Add the build directory contents to the archive
  archive.directory(BUILD_DIR, false);
  
  // Finalize the archive
  archive.finalize();
}

// Main function
function main() {
  console.log('Packaging PixelTracer extension...');
  
  ensureDirectories();
  copyFiles();
  createZip();
}

// Run the script
main(); 