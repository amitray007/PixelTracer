# CLAUDE.md - @pixeltracer/core

This file provides guidance to Claude Code (claude.ai/code) when working with the core package.

## Package Overview

Core engine providing foundational services for PixelTracer including event processing, storage, logging, and worker management.

## Key Components

### Engine (`engine/`)
- **CoreEngine**: Main orchestrator for all core services
- Initializes and manages subsystems
- Provides unified API for other packages

### Event System (`events/`)
- **EventBus**: Pub/sub system for internal communication
- Priority-based event handling
- Async event processing support

### Processing (`processing/`)
- **RequestProcessingEngine**: Main request analysis pipeline
- **AdvancedFilters**: Sophisticated filtering logic
- **PerformanceMonitor**: Tracks processing metrics
- Uses Web Workers for heavy processing

### Storage (`storage/`)
- **EventStorageManager**: Manages event persistence
- **TabEventStore**: Per-tab event storage
- Memory-based with size limits
- Automatic cleanup of old events

### Workers (`workers/`)
- **request-processor.worker.ts**: Offloads heavy processing
- Parallel request analysis
- Prevents main thread blocking

### Proxy (`proxy/`)
- **ProxyManager**: Manages provider instances
- Dynamic provider loading
- Provider lifecycle management

### Logging (`logging/`)
- **Logger**: Centralized logging with levels
- **LogCollector**: Aggregates logs for debugging
- Console output with formatting

## Architecture Patterns

### Request Processing Flow
```
1. Request received → RequestProcessingEngine
2. Apply filters → AdvancedFilters
3. Send to worker → request-processor.worker
4. Worker analysis → Provider matching
5. Return results → EventBus notification
6. Store event → EventStorageManager
```

### Event Bus Usage
```typescript
// Subscribe to events
eventBus.on('request.processed', (event) => {
  // Handle processed request
});

// Emit events
eventBus.emit('request.processed', {
  type: 'request.processed',
  payload: eventData,
  priority: EventPriority.NORMAL
});
```

### Storage Patterns
- Events stored per tab ID
- Automatic eviction when memory limit reached
- Batch operations for performance
- Cleanup on tab close

## Configuration

Key constants in `constants/`:
- `MAX_EVENTS_PER_TAB`: 1000
- `STORAGE_CLEANUP_INTERVAL`: 60000ms
- `WORKER_TIMEOUT`: 5000ms
- `MAX_WORKER_POOL_SIZE`: 4

## Testing

```bash
# Run core package tests
pnpm --filter @pixeltracer/core test

# Test specific component
pnpm test engine/CoreEngine.test.ts
```

## Performance Optimization

1. **Worker Pool**: Reuses workers to avoid creation overhead
2. **Batch Processing**: Groups requests for efficiency
3. **Memory Management**: Automatic cleanup and limits
4. **Event Debouncing**: Prevents event flooding

## Common Issues

1. **Worker not responding**: Check worker timeout settings
2. **Memory growth**: Verify cleanup intervals running
3. **Event not received**: Check EventBus subscription order
4. **Storage full**: Increase MAX_EVENTS_PER_TAB

## Integration Points

- Consumed by: chrome-extension, providers
- Depends on: shared
- Exports: CoreEngine, EventBus, Logger, storage managers