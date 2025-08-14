# PixelTracer

A professional-grade Chrome extension for real-time monitoring, visualization, and analysis of web analytics and marketing tracking requests. Built with modern web technologies and a privacy-first approach.

<p align="center">
  <img src="assets/icons/icon128.png" alt="PixelTracer Logo" width="128">
</p>

<p align="center">
  <strong>🚀 Modern Architecture • 🔒 Privacy-First • ⚡ High Performance • 🧩 Extensible</strong>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/pixeltracer/nbkeebnffbdgmkfjihdhhegablfnammc"><img alt="Install from Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?logo=googlechrome"></a>
</p>

## 🎯 Overview

PixelTracer helps developers, marketers, and QA engineers understand web tracking implementations with unprecedented visibility and control. Built on a modern monorepo architecture with TypeScript, React, and Chrome Manifest V3, it provides professional-grade tools for debugging and monitoring analytics implementations.

## ✨ Key Features

### 🔍 **Real-time Monitoring**
- **Instant Detection**: Monitor tracking requests as they happen with zero latency
- **Side Panel Interface**: Professional dashboard built on Chrome's Side Panel API
- **Virtual Scrolling**: Handle thousands of events smoothly without performance impact
- **Live Statistics**: Real-time counters for events, providers, and errors

### 🎨 **Advanced UI/UX**
- **Modern Design**: Built with shadcn/ui components and Tailwind CSS
- **Dark/Light Themes**: Comfortable viewing in any environment  
- **Responsive Layout**: Optimized for Chrome's side panel and popup interfaces
- **Keyboard Navigation**: Full keyboard shortcuts for power users

### 🔬 **Detailed Analysis**
- **Parameter Grouping**: Intelligent categorization of tracking parameters
- **Business Context**: Human-readable explanations of technical data
- **Provider Confidence**: Scoring system to identify the best matches
- **Event Enrichment**: Provider-specific insights and metadata
- **Multi-format Export**: CSV, JSON, and HAR export options

### ⚡ **Performance Optimizations**
- **Web Workers**: Offload processing from main thread for smooth performance
- **Memory Management**: Automatic cleanup and configurable limits
- **Request Deduplication**: Intelligent caching to avoid redundant processing
- **Batch Processing**: Efficient handling of high-traffic sites

### 🧩 **Extensible Architecture**
- **Provider System**: Easy-to-extend pattern for adding new tracking services
- **Monorepo Structure**: Clean separation of concerns with multiple packages
- **TypeScript**: Full type safety with strict mode enabled
- **Comprehensive Testing**: Unit and integration tests with high coverage

## 🏗️ Architecture

PixelTracer is built as a modern monorepo with the following packages:

```
pixeltracer/
├── apps/
│   └── chrome-extension/     # Chrome extension application
├── packages/
│   ├── shared/              # Common types and utilities  
│   ├── core/                # Core engine and processing
│   ├── providers/           # Tracking provider implementations
│   └── ui/                  # React component library
├── docs/                    # Comprehensive documentation
└── scripts/                 # Build and release automation
```

### 📦 **Package Dependencies**
- `@pixeltracer/shared` → Common types and constants
- `@pixeltracer/core` → Event processing engine with Web Workers  
- `@pixeltracer/providers` → Extensible provider system
- `@pixeltracer/ui` → React components with shadcn/ui
- Chrome Extension → Integrates all packages

## 🎯 Supported Tracking Providers

### 🔥 **Currently Supported**
- **Google Ecosystem**
  - Google Ads & AdWords

- **Social Media Platforms**
  - Facebook/Meta Pixel
  - TikTok Pixel

### 🚀 **Extensible System**
Adding new providers is straightforward with our provider pattern. Each provider implements:
- URL pattern matching
- Parameter extraction and parsing
- Confidence scoring
- Business context enrichment
- Parameter grouping for UI display

## 📦 Installation

### 🌐 **From Chrome Web Store**
1. Open the store listing: [PixelTracer](https://chromewebstore.google.com/detail/pixeltracer/nbkeebnffbdgmkfjihdhhegablfnammc)
2. Click "Add to Chrome"
3. Confirm the installation and permissions

### 🔧 **From Source** *(Development)*

#### Prerequisites
- **Node.js 20+** and **pnpm 8+**
- **Git**
- **Chrome browser** (version 114+ recommended for Side Panel support)

#### Quick Start
```bash
# Clone the repository
git clone https://github.com/amitray007/pixeltracer.git
cd pixeltracer

# Install dependencies (uses pnpm workspaces)
pnpm install

# Build all packages
pnpm build

# Load the extension in Chrome
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select apps/chrome-extension/dist
```

#### Development Workflow
```bash
# Start development mode (watches all packages)
pnpm dev

# Build specific packages
pnpm build:packages    # Build only packages/*
pnpm build:apps       # Build only apps/*

# Run tests
pnpm test             # All tests
pnpm test:ui          # Tests with UI
pnpm test:coverage    # Generate coverage

# Code quality
pnpm type-check       # TypeScript checking
pnpm format           # Prettier formatting
```

## 🚀 Using PixelTracer

### 📊 **Side Panel Dashboard** *(Primary Interface)*

The main interface is accessed via Chrome's Side Panel (Chrome 114+):

1. **Open Side Panel**: Click the PixelTracer icon in your browser toolbar
2. **Real-time Dashboard**: View live statistics and event counters
3. **Event Stream**: Scroll through tracking events with virtual scrolling
4. **Advanced Filters**: Filter by provider, event type, or custom criteria
5. **Export Options**: Download data in CSV, JSON, or HAR formats

**Dashboard Features:**
- 📈 **Live Statistics**: Real-time counters and metrics
- 🔍 **Smart Search**: Search across all event parameters
- 🏷️ **Provider Grouping**: Organize events by tracking service
- ⚙️ **Advanced Filters**: Complex filtering with multiple criteria
- 📊 **Performance Metrics**: Memory usage and processing statistics

### 💬 **Popup Interface** *(Quick Access)*

Click the extension icon for quick access:
- **Summary Statistics**: Total events and provider count
- **Quick Controls**: Export, clear data, settings
- **Status Indicators**: Current tracking status and health
- **Direct Actions**: One-click access to common tasks

### 🔬 **Event Analysis**

Click any tracking event to view detailed analysis:

#### 📋 **General Tab**
- Provider information and confidence score
- Event type and timestamp
- Account/Property IDs
- Business context and insights

#### 🎯 **Event Details**
- Marketing or analytics event data
- E-commerce details (for purchase events)
- Custom event parameters
- User and session identifiers

#### 🔧 **Parameters Tab**
- Intelligent parameter grouping
- Human-readable parameter names
- Value formatting and validation
- Parameter documentation links

#### 📡 **Technical Tab**
- HTTP headers and metadata
- Request payload/body
- Response information
- Network timing data

## 🛠️ Development & Customization

### 🧩 **Adding Custom Providers**

PixelTracer's provider system makes it easy to add support for new tracking services:

```typescript
// packages/providers/src/my-provider/my-provider.ts
import { BaseProvider } from '../base/base-provider'

export class MyProvider extends BaseProvider {
  constructor() {
    super({
      id: 'my-provider',
      name: 'My Tracking Service',
      version: '1.0.0',
      patterns: {
        urlPatterns: [/https:\/\/api\.myservice\.com\/track/],
        domains: ['myservice.com']
      }
    })
  }

  async calculateCustomConfidence(request: RequestData): Promise<number> {
    // Return confidence score 0.0 - 1.0
    return request.url.includes('/track') ? 0.9 : 0.0
  }

  async parseParameters(request: RequestData): Promise<Record<string, any>> {
    // Extract and parse parameters
    const params = Object.fromEntries(new URL(request.url).searchParams)
    return params
  }

  // Implement other required methods...
}
```

**Register the provider:**
```typescript
// packages/providers/src/registry/default-providers.ts
import { MyProvider } from '../my-provider'

export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry()
  
  // Register existing providers...
  registry.register(new MyProvider())
  
  return registry
}
```

### 📚 **Comprehensive Documentation**

Explore our detailed documentation:

- **[📖 Getting Started](./docs/development/CONTRIBUTING.md)** - Complete developer guide
- **[🏗️ Architecture](./docs/architecture/README.md)** - Technical architecture overview
- **[🎨 Design System](./docs/design/README.md)** - UI/UX guidelines
- **[🗺️ Roadmap](./docs/ROADMAP.md)** - Future plans and vision
- **[📝 Changelog](./docs/CHANGELOG.md)** - Version history

## 🔒 Privacy & Performance

### 🛡️ **Privacy-First Design**
- **100% Local Processing**: All analysis happens in your browser
- **Zero Data Collection**: No tracking, analytics, or data transmission
- **Minimal Permissions**: Only essential Chrome extension permissions
- **Open Source**: Full transparency with public source code

### ⚡ **Performance Optimized**
- **Web Workers**: Heavy processing offloaded from main thread
- **Virtual Scrolling**: Smooth handling of 10,000+ events
- **Memory Management**: Automatic cleanup with configurable limits
- **Request Deduplication**: Smart caching prevents redundant work
- **Batch Processing**: Efficient handling of high-traffic sites

**Performance Metrics:**
- < 50MB memory footprint
- Sub-10ms event processing
- Support for 1000+ events/second
- Zero impact on host page performance

## 🛠️ Troubleshooting

### **Common Issues**

**🚫 No Events Detected**
```bash
# Check if tracking is enabled for the current tab
# Refresh the page to start monitoring
# Verify Chrome version supports Side Panel (114+)
```

**🐛 Extension Not Loading**
```bash
# Clear extension data and reload
pnpm clean && pnpm install && pnpm build
# Reload extension in chrome://extensions
```

**💾 Memory Issues**
- Adjust event limits in settings
- Clear old events regularly
- Close unused tabs to free memory

**🔄 Build Problems**
```bash
# Clean and reinstall dependencies
pnpm clean
pnpm install
pnpm build

# Check Node.js and pnpm versions
node --version  # Should be 20+
pnpm --version  # Should be 8+
```

## 🤝 Contributing

We welcome contributions from developers of all skill levels! 

### **Quick Start for Contributors**

1. **Fork & Clone**
   ```bash
   git clone https://github.com/amitray007/pixeltracer.git
   cd pixeltracer
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Start Development**
   ```bash
   pnpm dev  # Starts watch mode for all packages
   ```

4. **Make Changes & Test**
   ```bash
   pnpm test         # Run tests
   pnpm type-check   # TypeScript validation
   pnpm format       # Code formatting
   ```

5. **Submit PR**
   - Create feature branch
   - Make your changes
   - Add tests if needed
   - Submit pull request

### **Ways to Contribute**

- 🆕 **Add New Providers** - Support for additional tracking services
- 🎨 **UI/UX Improvements** - Enhance user experience
- 🔧 **Performance Optimization** - Make it faster and more efficient
- 📖 **Documentation** - Improve guides and examples
- 🐛 **Bug Reports** - Help us identify and fix issues
- 💡 **Feature Suggestions** - Share ideas for improvements

**Detailed Guide:** See our [Contributing Guide](./docs/development/CONTRIBUTING.md) for comprehensive information on development workflow, coding standards, and project structure.

## 🧰 Technology Stack

**Core Technologies:**
- **TypeScript 5.4+** - Type safety and developer experience
- **React 18** - Modern UI with hooks and concurrent features
- **Chrome Manifest V3** - Latest extension platform
- **pnpm Workspaces** - Efficient monorepo management
- **Vite** - Fast build tooling and HMR

**UI/UX:**
- **shadcn/ui** - Modern, accessible component library
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful, consistent icons
- **Radix UI** - Low-level, accessible primitives

**Development & Testing:**
- **Vitest** - Fast unit testing framework
- **Testing Library** - Component testing utilities
- **ESLint & Prettier** - Code quality and formatting
- **GitHub Actions** - Automated CI/CD pipeline

**Performance & Architecture:**
- **Web Workers** - Background processing
- **Virtual Scrolling** - Efficient large list rendering
- **Event Bus System** - Decoupled component communication
- **Provider Pattern** - Extensible service detection

## 📊 Project Status

- **Status**: Active development
- **Chrome Web Store**: Available — [Install from the Chrome Web Store](https://chromewebstore.google.com/detail/pixeltracer/nbkeebnffbdgmkfjihdhhegablfnammc)
- **Browser Support**: Chrome 114+ (Side Panel API)
- **License**: MIT License

## 🌟 Acknowledgements

PixelTracer builds upon the excellent work of the web development community:

- **[Omnibug](https://omnibug.io/)** - Inspiration for provider patterns and UI concepts
- **[Chrome DevTools](https://developer.chrome.com/docs/devtools/)** - UX patterns and developer ergonomics
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible component system
- **[Radix UI](https://www.radix-ui.com/)** - Foundational primitive components
- **[Lucide](https://lucide.dev/)** - Elegant icon library
- **Open Source Community** - Tools, libraries, and inspiration

## 📬 Community & Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/amitray007/pixeltracer/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/amitray007/pixeltracer/discussions)
- **Documentation**: [Comprehensive guides and API docs](./docs/README.md)
- **Contributing**: [Help improve PixelTracer](./docs/development/CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <strong>🔍 Making the invisible web visible</strong>
</p>

<p align="center">
  Made with ❤️ for developers, marketers, and privacy advocates worldwide
</p>

<p align="center">
  <a href="https://github.com/amitray007/pixeltracer">⭐ Star this project on GitHub</a>
</p> 