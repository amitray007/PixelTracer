# Changelog

All notable changes to PixelTracer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation in `/docs` folder
- In-depth architecture documentation
- UI/UX design guidelines
- Project roadmap and vision

### Fixed
- Circular dependency between core and providers packages
- TypeScript strict mode compilation errors
- CI/CD build order for package dependencies

## [2.0.0] - 2025-02-14

### Added
- 🚀 **Major Architecture Upgrade**
  - Migrated to monorepo structure with pnpm workspaces
  - Separated concerns into dedicated packages
  - Implemented provider pattern for extensibility

- 📦 **New Packages**
  - `@pixeltracer/shared` - Common types and utilities
  - `@pixeltracer/core` - Core engine with event bus and storage
  - `@pixeltracer/providers` - Tracking provider implementations
  - `@pixeltracer/ui` - React component library

- 🎨 **UI/UX Enhancements**
  - Migrated to shadcn/ui component library
  - Implemented dark mode support
  - Added virtual scrolling for performance
  - Enhanced event details with parameter grouping
  - Real-time dashboard with statistics

- 🔍 **Provider Support**
  - TikTok Pixel provider with full parameter parsing
  - Enhanced Facebook Pixel with custom data support
  - Improved Google Analytics/Ads detection
  - Provider-specific parameter grouping

- ⚡ **Performance Optimizations**
  - Web Workers for request processing
  - Request deduplication and caching
  - Memory management with automatic cleanup
  - Batched event processing

- 🛠️ **Developer Experience**
  - GitHub Actions CI/CD pipeline
  - Automated version bumping
  - Automated GitHub releases
  - Comprehensive TypeScript types
  - ESLint and Prettier configuration

- 📊 **Features**
  - Export functionality (CSV, JSON, HAR)
  - Advanced filtering system
  - Keyboard shortcuts
  - Performance monitoring dashboard
  - Memory usage indicators

### Changed
- Restructured entire codebase to monorepo
- Updated to Chrome Manifest V3
- Improved provider confidence scoring
- Enhanced business context for events
- Modernized build system with Vite

### Fixed
- Memory leaks in long-running sessions
- Event duplication issues
- TypeScript strict mode errors
- Build system dependency issues

## [1.0.0] - 2025-01-15

### Added
- 🎉 **Initial Release**
  - Basic Chrome extension structure
  - Chrome Manifest V3 support
  - Real-time network request monitoring

- 📡 **Core Providers**
  - Google Analytics support
  - Google Ads conversion tracking
  - Facebook Pixel detection
  - Basic parameter extraction

- 🖼️ **User Interface**
  - Side panel interface
  - Popup for quick access
  - Event list display
  - Basic filtering options

- 🔧 **Core Features**
  - Per-tab event tracking
  - Request interception via webRequest API
  - Pattern-based provider detection
  - Confidence scoring system

### Technical Stack
- TypeScript for type safety
- React for UI components
- Chrome Extension APIs
- Webpack for bundling

## [0.5.0-beta] - 2025-01-01

### Added
- Initial proof of concept
- Basic request interception
- Simple UI for event display
- Google Analytics detection only

### Known Issues
- Performance issues with high traffic sites
- Limited provider support
- No export functionality
- Basic UI without styling

## [0.1.0-alpha] - 2024-12-15

### Added
- Project initialization
- Basic Chrome extension manifest
- Simple background script
- Minimal popup interface

---

## Version History Summary

| Version | Release Date | Highlights |
|---------|-------------|------------|
| 2.0.0   | 2025-02-14  | Major architecture upgrade, monorepo, new providers |
| 1.0.0   | 2025-01-15  | First stable release with core features |
| 0.5.0   | 2025-01-01  | Beta release with basic functionality |
| 0.1.0   | 2024-12-15  | Initial alpha version |

## Upgrade Guide

### From 1.0.0 to 2.0.0

1. **Clear Extension Data**
   - The storage format has changed
   - Clear extension data before upgrading
   - Settings will need to be reconfigured

2. **New Features**
   - Explore the new side panel interface
   - Try the export functionality
   - Configure advanced filters

3. **Performance**
   - Notice improved performance with Web Workers
   - Memory usage is now optimized
   - Virtual scrolling handles large datasets

### Breaking Changes in 2.0.0

- Storage format is incompatible with 1.0.0
- Settings structure has changed
- Provider IDs have been standardized

## Deprecation Notices

### Scheduled for Removal in 3.0.0
- Legacy provider detection methods
- Old storage format compatibility
- Deprecated API methods

## Security Updates

### Version 2.0.0
- Updated all dependencies to latest versions
- Implemented Content Security Policy
- Removed unnecessary permissions
- Added input sanitization

### Version 1.0.0
- Initial security audit completed
- No external data transmission
- Local-only processing

---

*For more details on each release, see the [GitHub Releases](https://github.com/amitray007/pixeltracer/releases) page.*

*Last updated: August 2025*