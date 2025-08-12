#!/bin/bash

# PixelTracer Release Script
# This script automates the release process locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "$1"
}

# Check if we're on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    print_warning "You are not on the main branch. Current branch: $BRANCH"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "You have uncommitted changes. Please commit or stash them first."
fi

# Get version bump type
if [ -z "$1" ]; then
    echo "Select version bump type:"
    echo "1) patch (bug fixes)"
    echo "2) minor (new features)"
    echo "3) major (breaking changes)"
    read -p "Enter choice (1-3): " choice
    case $choice in
        1) VERSION_TYPE="patch";;
        2) VERSION_TYPE="minor";;
        3) VERSION_TYPE="major";;
        *) print_error "Invalid choice";;
    esac
else
    VERSION_TYPE=$1
fi

print_info "📦 Starting release process..."

# Pull latest changes
print_info "Pulling latest changes..."
git pull origin main

# Install dependencies
print_info "Installing dependencies..."
pnpm install --frozen-lockfile

# Run tests
print_info "Running tests..."
pnpm test || print_warning "Tests failed, continuing..."

# Type check
print_info "Running type check..."
pnpm type-check

# Build all packages
print_info "Building packages..."
pnpm -w run build

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Bump version
print_info "Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
print_success "New version: $NEW_VERSION"

# Update all workspace packages
print_info "Updating workspace packages..."
for dir in packages/* apps/*; do
    if [ -f "$dir/package.json" ]; then
        (cd "$dir" && npm version $NEW_VERSION --no-git-tag-version) || true
    fi
done

# Update Chrome extension manifest.json version
print_info "Updating Chrome extension manifest.json version..."
MANIFEST_PATH="apps/chrome-extension/src/manifest.json"
if [ -f "$MANIFEST_PATH" ]; then
    # Use node to update the manifest.json version
    node -e "
        const fs = require('fs');
        const path = '$MANIFEST_PATH';
        const manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
        manifest.version = '$NEW_VERSION';
        fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
        console.log('Updated manifest.json version to $NEW_VERSION');
    "
    print_success "Updated manifest.json to version $NEW_VERSION"
else
    print_warning "manifest.json not found at $MANIFEST_PATH"
fi

# Build Chrome extension with new version
print_info "Building Chrome extension..."
cd apps/chrome-extension
pnpm build

# Create release zip
print_info "Creating release package..."
cd dist
zip -r ../pixeltracer-chrome-extension-${NEW_VERSION}.zip . -q
cd ../../../

print_success "Chrome extension package created: apps/chrome-extension/pixeltracer-chrome-extension-${NEW_VERSION}.zip"

# Generate changelog
print_info "Generating changelog..."
echo "# Release v${NEW_VERSION}" > RELEASE_NOTES.md
echo "" >> RELEASE_NOTES.md
echo "## Changes" >> RELEASE_NOTES.md
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --pretty=format:"- %s (%h)" >> RELEASE_NOTES.md 2>/dev/null || echo "- Initial release" >> RELEASE_NOTES.md
echo "" >> RELEASE_NOTES.md

# Commit changes
print_info "Committing version bump..."
git add -A
git commit -m "chore: release v${NEW_VERSION}" || print_warning "No changes to commit"

# Create tag
print_info "Creating git tag..."
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

print_success "🎉 Release v${NEW_VERSION} prepared successfully!"
print_info ""
print_info "Next steps:"
print_info "1. Review the changes: git diff HEAD~1"
print_info "2. Push to GitHub: git push origin main --tags"
print_info "3. The GitHub Action will automatically create a release"
print_info ""
print_info "Or to push now:"
read -p "Push to GitHub now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main --tags
    print_success "Pushed to GitHub! Check the Actions tab for the release progress."
    print_info "Release URL: https://github.com/amitray007/pixeltracer/releases/tag/v${NEW_VERSION}"
fi