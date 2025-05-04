#!/bin/bash

echo "PixelTracer - Building production package"
echo "==========================================="

# Set version from manifest.json using multiple methods
echo "Extracting version from manifest.json..."

# Try grep with regex approach first (should work on most Unix systems)
VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' manifest.json | grep -o '[0-9][0-9\.]*' | head -1)

# If grep failed, try with jq if available
if [ -z "$VERSION" ] && command -v jq &> /dev/null; then
  echo "Trying extraction with jq..."
  VERSION=$(jq -r '.version' manifest.json)
fi

# If python is available, try with that as another fallback
if [ -z "$VERSION" ] && command -v python3 &> /dev/null; then
  echo "Trying extraction with python..."
  VERSION=$(python3 -c "import json,sys; print(json.load(open('manifest.json'))['version'])" 2>/dev/null)
fi

# If python3 failed, try python2
if [ -z "$VERSION" ] && command -v python &> /dev/null; then
  echo "Trying extraction with python2..."
  VERSION=$(python -c "import json,sys; print(json.load(open('manifest.json'))['version'])" 2>/dev/null)
fi

# Last resort - use date as version
if [ -z "$VERSION" ]; then
  echo "Warning: Could not extract version from manifest.json."
  echo "Using date-based version instead."
  VERSION=$(date +"%Y.%m.%d")
fi

echo "Building version: $VERSION"

# Create build directory if it doesn't exist
mkdir -p dist

# Clean any existing files in dist folder
rm -f dist/*

# Create a clean temp directory for build files
rm -rf temp
mkdir -p temp

# Copy only the necessary files
echo "Copying files..."
cp manifest.json temp/
cp background.js temp/
cp content.js temp/
cp popup.html temp/
cp popup.js temp/
cp popup.css temp/
cp liveview.css temp/

# Copy images directory
mkdir -p temp/images
cp -r images/* temp/images/

# Remove any development-only or unnecessary files
rm -f temp/images/screenshot*.png temp/images/promo*.png

# Create the zip file
echo "Creating zip file..."
cd temp
zip -q -r "../dist/pixeltracer-${VERSION}.zip" *
cd ..

# Clean up
rm -rf temp

echo ""
echo "Successfully created dist/pixeltracer-${VERSION}.zip"
echo ""
echo "You can now upload this file to the Chrome Web Store." 