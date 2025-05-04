/**
 * Build a production package of the extension
 * This script provides a cross-platform method to package the extension
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// Get version from manifest
let version;
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  version = manifest.version;
  console.log(`Using version ${version} from manifest.json`);
} catch (err) {
  // Fallback to package.json version
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    version = pkg.version;
    console.log(`Using version ${version} from package.json`);
  } catch (err) {
    // Last resort: date-based version
    const now = new Date();
    version = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
    console.log(`Could not determine version, using date-based version: ${version}`);
  }
}

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a temporary directory for our files
const tempDir = path.join(__dirname, '..', 'temp');
if (fs.existsSync(tempDir)) {
  // Remove existing temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

// Files to include in the package
const filesToInclude = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'liveview.css'
];

// Copy files to temp directory
filesToInclude.forEach(file => {
  fs.copyFileSync(
    path.join(__dirname, '..', file),
    path.join(tempDir, file)
  );
});

// Copy images directory (excluding screenshots and promo images)
const imgSrcDir = path.join(__dirname, '..', 'images');
const imgDestDir = path.join(tempDir, 'images');

if (fs.existsSync(imgSrcDir)) {
  fs.mkdirSync(imgDestDir, { recursive: true });
  
  const imgFiles = fs.readdirSync(imgSrcDir);
  imgFiles.forEach(file => {
    // Skip screenshot and promo images
    if (file.startsWith('screenshot') || file.startsWith('promo')) {
      return;
    }
    
    fs.copyFileSync(
      path.join(imgSrcDir, file),
      path.join(imgDestDir, file)
    );
  });
}

// Create the ZIP file
const output = fs.createWriteStream(path.join(distDir, `pixeltracer-${version}.zip`));
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  console.log(`Successfully created dist/pixeltracer-${version}.zip (${archive.pointer()} bytes)`);
  
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('Cleaned up temporary files');
  
  console.log('\nYou can now upload this file to the Chrome Web Store.');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(tempDir, false);
archive.finalize(); 