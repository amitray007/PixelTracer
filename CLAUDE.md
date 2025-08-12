# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

PixelTracer is a Chrome extension for real-time monitoring of web analytics and marketing tracking requests. Built with TypeScript, React, and Chrome Extension Manifest V3.

## Essential Commands

```bash
# Development
pnpm dev                    # Start development mode (watches all packages)
pnpm --filter chrome-extension dev  # Watch only chrome extension

# Building
pnpm build                  # Build all packages in dependency order
pnpm build:packages         # Build only packages/*
pnpm build:apps            # Build only apps/*
pnpm --filter chrome-extension build  # Build chrome extension only

# Testing
pnpm test                   # Run all tests
pnpm test:ui               # Run tests with UI
pnpm test:coverage         # Generate coverage report
pnpm test -- path/to/test  # Run specific test file

# Code Quality
pnpm type-check            # TypeScript type checking
pnpm lint                  # ESLint check
pnpm lint:fix              # Auto-fix ESLint issues
pnpm format                # Format with Prettier
pnpm format:check          # Check formatting

# Maintenance
pnpm clean                 # Clean all build artifacts
pnpm install               # Install dependencies (use pnpm only)

# Release
./scripts/release.sh       # Interactive release script
./scripts/release.sh patch # Direct patch release
```

## Architecture Overview

### Monorepo Structure
- **pnpm workspaces** for package management
- **TypeScript** for all packages
- **Vite** for bundling chrome extension
- **Vitest** for testing

### Package Dependency Graph
```
@pixeltracer/shared (base types & constants)
    ↑
@pixeltracer/core (engine & processing)
    ↑
@pixeltracer/providers (tracking detection)
    ↑
@pixeltracer/ui (React components)
    ↑
@pixeltracer/chrome-extension (final app)
```

### Key Architectural Patterns

1. **Provider System**: Each tracking service (Google, Facebook, TikTok) is a provider with:
   - URL pattern matching
   - Parameter extraction
   - Event type detection
   - Account ID extraction
   - Parameter grouping for display

2. **Event Processing Pipeline**:
   - Background script intercepts network requests
   - Provider matching via URL patterns
   - Parameter extraction and enrichment
   - Event storage per tab
   - Real-time messaging to UI

3. **Chrome Extension Architecture**:
   - **Service Worker** (background.ts): Network interception, provider matching
   - **Side Panel** (sidepanel/): Main UI for monitoring
   - **Popup** (popup/): Quick access controls
   - **Content Scripts**: None (uses chrome.webRequest API)

4. **State Management**:
   - Per-tab event storage in background script
   - Zustand stores in UI components
   - Chrome runtime messaging for communication

### Critical Files

- `apps/chrome-extension/src/manifest.json` - Extension configuration
- `apps/chrome-extension/src/background/index.ts` - Main service worker
- `packages/providers/src/base/base-provider.ts` - Provider base class
- `packages/ui/src/components/real-time-dashboard.tsx` - Main UI component

## Provider Implementation

When adding a new provider:

1. Create provider class in `packages/providers/src/{provider-name}/`
2. Extend `BaseProvider` class
3. Implement required methods:
   - `calculateCustomConfidence()` - Confidence scoring
   - `parseParameters()` - Extract parameters from request
   - `extractEventType()` - Determine event type
   - `extractAccountId()` - Extract account/pixel ID
   - `enrichEvent()` - Add provider-specific metadata
   - `groupParameters()` - Group parameters for display

4. Register in `packages/providers/src/registry/default-providers.ts`

## Chrome Extension Specifics

- **Manifest V3**: Uses service workers, not background pages
- **Permissions**: tabs, webRequest, webRequestBlocking, storage, sidePanel
- **Side Panel API**: Main UI uses chrome.sidePanel (Chrome 114+)
- **Tab-specific tracking**: Each tab maintains its own event list
- **Hot reload not supported**: Must reload extension after changes

## Testing Approach

- Unit tests for providers and core logic
- Component tests for UI elements
- Manual testing in Chrome for extension features
- Use `vitest` for all testing needs

## Build Process

1. TypeScript compilation for packages (tsc)
2. Vite bundling for Chrome extension
3. Static asset copying to dist/
4. Manifest and icon files included in bundle

## GitHub Workflows

- **CI**: On all PRs - lint, test, build
- **Release**: On main push - version bump, build, create release

## Performance Considerations

- Minimize background script overhead
- Batch message passing between background and UI
- Use virtual scrolling for large event lists
- Debounce/throttle UI updates
- Clean up old events to prevent memory leaks

## Common Issues & Solutions

1. **Extension not updating**: Reload extension in chrome://extensions
2. **Side panel not opening**: Check Chrome version (needs 114+)
3. **Events not capturing**: Verify tab tracking is started
4. **Build errors**: Run `pnpm clean` then `pnpm install`
5. **Type errors**: Ensure all packages built in order