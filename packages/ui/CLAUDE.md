# CLAUDE.md - @pixeltracer/ui

This file provides guidance to Claude Code (claude.ai/code) when working with the UI package.

## Package Overview

React component library and design system for PixelTracer using shadcn/ui components and Tailwind CSS.

## Component Architecture

### Core Components (`components/`)

**Main Dashboard Components**:
- **RealTimeDashboard**: Main monitoring interface
- **EventTable**: Tabular event display
- **EventCard**: Card-based event display
- **EventDetails**: Detailed event view modal
- **EventDetailsEnhanced**: Enhanced modal with parameter grouping

**Feature Components**:
- **FilterPanel**: Provider and event type filtering
- **ExportDialog**: Data export interface
- **PerformanceDashboard**: Performance metrics display
- **MemoryIndicator**: Memory usage monitoring
- **KeyboardShortcuts**: Keyboard navigation guide

**UI Primitives** (`components/ui/`):
- Based on Radix UI primitives
- Styled with Tailwind CSS
- Consistent with shadcn/ui patterns
- Components: Button, Dialog, Tabs, Card, Badge, etc.

### State Management (`store/`)

**Zustand Stores**:
- **useEventStore**: Event data management
- **useFilterStore**: Filter state
- **useUIStore**: UI preferences
- **performanceStore**: Performance metrics

Store pattern:
```typescript
const useStore = create<StoreState>((set, get) => ({
  // State
  events: [],
  
  // Actions
  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),
  
  // Computed
  get filteredEvents() {
    return get().events.filter(/* filter logic */)
  }
}))
```

### Hooks (`hooks/`)

**Custom Hooks**:
- **useEventFilters**: Event filtering logic
- **useEventExport**: Export functionality
- **useKeyboardNavigation**: Keyboard shortcuts
- **useMemoryManagement**: Memory optimization
- **usePerformanceMonitor**: Performance tracking
- **useVirtualScroll**: Virtual scrolling for lists

### Contexts (`contexts/`)

- **ThemeContext**: Dark/light mode
- **ExtensionContext**: Chrome extension API access
- **ProviderContext**: Provider configuration

## Styling System

### Tailwind Configuration
- Custom color scheme using CSS variables
- Dark mode support via `dark:` prefix
- Animation utilities from tailwindcss-animate

### CSS Variables (`styles/globals.css`)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### Component Styling Pattern
```typescript
// Using cn() utility for conditional classes
import { cn } from "../utils"

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className // Allow override
)} />
```

## Component Patterns

### Provider Icons
```typescript
<ProviderIcon 
  provider="google-ads"
  size="sm" // sm | md | lg
  showTooltip={true}
/>
```

### Event Display Modes
1. **Table View**: Compact, scannable
2. **Card View**: Rich preview
3. **List View**: Chronological
4. **Grouped View**: By provider

### Modal Patterns
```typescript
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

## Performance Optimizations

1. **Virtual Scrolling**: For lists > 100 items
2. **React.memo**: For expensive components
3. **useMemo/useCallback**: For computed values and callbacks
4. **Lazy Loading**: Heavy components loaded on-demand
5. **Debouncing**: Search and filter inputs

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly
- Color contrast compliance

## Testing Components

```bash
# Test UI components
pnpm --filter @pixeltracer/ui test

# Test with React Testing Library
import { render, screen } from '@testing-library/react'
import { EventCard } from './event-card'

test('renders event', () => {
  render(<EventCard event={mockEvent} />)
  expect(screen.getByText('PageView')).toBeInTheDocument()
})
```

## Common Patterns

### Data Flow
```
Chrome Extension → Runtime Message → Store Update → Component Re-render
```

### Error Boundaries
Wrap feature components in error boundaries:
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <FeatureComponent />
</ErrorBoundary>
```

### Loading States
```typescript
if (loading) return <Skeleton />
if (error) return <ErrorMessage />
if (empty) return <EmptyState />
return <DataDisplay />
```

## Integration with Chrome Extension

Components expect Chrome runtime API:
```typescript
// Message handling
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NEW_EVENT') {
    store.addEvent(message.event)
  }
})

// Send messages
chrome.runtime.sendMessage({
  type: 'GET_EVENTS',
  tabId: currentTab.id
})
```

## Build Considerations

- Tree-shaking enabled for unused components
- CSS purging for production builds
- Component chunks for code splitting
- Tailwind JIT for optimal CSS size