# CLAUDE.md - @pixeltracer/shared

This file provides guidance to Claude Code (claude.ai/code) when working with the shared package.

## Package Overview

Shared types, interfaces, constants, and utilities used across all PixelTracer packages. This is the foundational package with no dependencies.

## Type Definitions (`types/`)

### Core Types

**TrackingEvent**:
```typescript
interface TrackingEvent {
  id: string
  timestamp: number
  provider: string
  providerName: string
  providerIcon?: string
  url: string
  method: string
  eventType?: string
  accountId?: string
  parameters: Record<string, any>
  confidence: number
  tabId?: number
  rawData?: Record<string, any>
}
```

**Provider Types**:
```typescript
interface ProviderConfig {
  id: string
  name: string
  description: string
  category: ProviderCategory
  patterns: ProviderPattern[]
  enabled: boolean
}

enum ProviderCategory {
  ADVERTISING = 'advertising',
  ANALYTICS = 'analytics',
  SOCIAL = 'social',
  ECOMMERCE = 'ecommerce'
}
```

**Message Types** (Chrome Extension Communication):
```typescript
interface BackgroundMessage {
  type: MessageType
  payload: any
  tabId?: number
  timestamp: number
}

enum MessageType {
  NEW_EVENT = 'new_event',
  GET_EVENTS = 'get_events',
  CLEAR_EVENTS = 'clear_events',
  TAB_ACTIVATED = 'tab_activated',
  UPDATE_PROVIDERS = 'update_providers'
}
```

## Constants (`constants/`)

**System Constants**:
```typescript
// Limits
export const MAX_EVENTS_PER_TAB = 1000
export const MAX_MEMORY_USAGE = 50 * 1024 * 1024 // 50MB
export const EVENT_RETENTION_TIME = 3600000 // 1 hour

// Intervals
export const CLEANUP_INTERVAL = 60000 // 1 minute
export const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

// Defaults
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7
export const DEFAULT_EXPORT_FORMAT = 'json'
```

**Provider Constants**:
```typescript
// Well-known provider IDs
export const PROVIDER_IDS = {
  GOOGLE_ADS: 'google-ads',
  GOOGLE_ANALYTICS: 'google-analytics',
  FACEBOOK_PIXEL: 'facebook-pixel',
  TIKTOK_PIXEL: 'tiktok-pixel'
}

// Event type mappings
export const STANDARD_EVENTS = {
  PAGE_VIEW: 'PageView',
  PURCHASE: 'Purchase',
  ADD_TO_CART: 'AddToCart',
  SIGN_UP: 'SignUp'
}
```

## Utilities (`utils/`)

**Common Utilities**:
```typescript
// URL parsing
export function parseUrl(url: string): ParsedUrl
export function extractDomain(url: string): string
export function getQueryParams(url: string): Record<string, string>

// Data formatting
export function formatBytes(bytes: number): string
export function formatDuration(ms: number): string
export function truncate(str: string, length: number): string

// Object manipulation
export function deepClone<T>(obj: T): T
export function flattenObject(obj: object, prefix?: string): Record<string, any>
export function pick<T>(obj: T, keys: string[]): Partial<T>

// Validation
export function isValidUrl(url: string): boolean
export function isValidEvent(event: unknown): event is TrackingEvent
```

## Usage Patterns

### Importing Types
```typescript
import type { TrackingEvent, ProviderConfig } from '@pixeltracer/shared'
```

### Using Constants
```typescript
import { MAX_EVENTS_PER_TAB, PROVIDER_IDS } from '@pixeltracer/shared'

if (events.length > MAX_EVENTS_PER_TAB) {
  events.splice(0, events.length - MAX_EVENTS_PER_TAB)
}
```

### Type Guards
```typescript
import { isValidEvent } from '@pixeltracer/shared'

function processEvent(data: unknown) {
  if (!isValidEvent(data)) {
    throw new Error('Invalid event data')
  }
  // data is now typed as TrackingEvent
}
```

## Design Principles

1. **No Dependencies**: Pure TypeScript with no external deps
2. **Type Safety**: Comprehensive type definitions
3. **Immutability**: Utilities return new objects
4. **Tree-Shakeable**: Each export is independent
5. **Cross-Package**: Used by all other packages

## Adding New Shared Code

1. **Types**: Add to `types/index.ts`
2. **Constants**: Add to `constants/index.ts`
3. **Utilities**: Add to `utils/index.ts` with tests
4. **Export**: Ensure exported from package root

## Testing

```bash
# Test shared utilities
pnpm --filter @pixeltracer/shared test

# Test specific utility
pnpm test utils/formatters.test.ts
```

## Common Gotchas

1. **Circular Dependencies**: Never import from other packages
2. **Browser vs Node**: Ensure utilities work in both environments
3. **Type Exports**: Use `export type` for type-only exports
4. **Constants Naming**: Use UPPER_SNAKE_CASE for constants
5. **Breaking Changes**: Changes here affect all packages