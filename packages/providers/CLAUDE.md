# CLAUDE.md - @pixeltracer/providers

This file provides guidance to Claude Code (claude.ai/code) when working with the providers package.

## Package Overview

Provider system for detecting and parsing tracking requests from various analytics and marketing services.

## Provider Architecture

### Base System (`base/`)

**BaseProvider** abstract class defines the provider contract:
```typescript
abstract class BaseProvider {
  // Required implementations
  abstract calculateCustomConfidence(request: RequestData): Promise<number>
  abstract parseParameters(request: RequestData): Promise<Record<string, any>>
  abstract extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null>
  abstract extractAccountId(request: RequestData, parameters: Record<string, any>): Promise<string | null>
  abstract enrichEvent(event: TrackingEvent, request: RequestData): Promise<void>
  
  // Optional for parameter display
  groupParameters?(parameters: Record<string, any>): ParameterGroup[]
  getParameterDisplayName?(key: string): string
}
```

**Key Components**:
- **PatternMatcher**: URL pattern matching engine
- **RequestFilter**: Pre-filtering logic
- **ProviderValidator**: Validates provider implementations
- **ParameterGroup**: UI grouping system for parameters

### Provider Implementations

#### Google (`google/`)
- **GoogleAdsProvider**: Google Ads/AdWords tracking
- **GoogleAnalyticsProvider**: GA4 and Universal Analytics
- Handles conversion tracking, enhanced ecommerce
- Pattern: `/collect`, `/g/collect`, `/pagead/conversion`

#### Facebook (`facebook/`)
- **FacebookPixelProvider**: Facebook/Meta Pixel
- Handles standard and custom events
- Custom data (cd[]) parameter parsing
- Enhanced matching support
- Pattern: `/tr`, `/facebook.com/tr`

#### TikTok (`tiktok/`)
- **TikTokPixelProvider**: TikTok Pixel tracking
- Events API support
- Auto-collected properties handling
- Pattern: `/api/v*/pixel`, `/track`

### Registry System (`registry/`)

**ProviderRegistry**: Central registration and management
```typescript
// Register provider
registry.register(new GoogleAdsProvider())

// Get all providers
const providers = registry.getAllProviders()

// Analyze request
const results = await registry.analyzeRequest(requestData)
```

## Adding a New Provider

1. Create directory: `packages/providers/src/{provider-name}/`

2. Create provider class:
```typescript
export class MyProvider extends BaseProvider {
  constructor() {
    super({
      id: 'my-provider',
      name: 'My Provider',
      version: '1.0.0',
      patterns: {
        urlPatterns: [/pattern/],
        domains: ['domain.com']
      }
    })
  }
  
  // Implement required methods...
}
```

3. Register in `registry/default-providers.ts`

4. Export from `{provider-name}/index.ts`

## URL Pattern Matching

Patterns support:
- Regular expressions: `/https:\/\/analytics\.com\/track/`
- Domain lists: `['analytics.com', 'tracking.com']`
- Path patterns: `'/api/*/track'`
- Query parameters: Check in `parseParameters()`

## Parameter Extraction

Common patterns:
```typescript
// URL query parameters
const params = Object.fromEntries(new URL(request.url).searchParams)

// POST body JSON
const body = JSON.parse(request.body)

// POST body form data
const formData = new URLSearchParams(request.body)

// Nested flattening
this.flattenObject(complexObject, 'prefix')
```

## Confidence Scoring

Factors to consider:
- URL pattern match strength (0.3-0.5)
- Required parameters present (+0.2)
- Valid account ID format (+0.1)
- Known event types (+0.1)
- Request method match (+0.1)

Target ranges:
- 0.9-1.0: Definite match
- 0.7-0.9: Probable match
- 0.5-0.7: Possible match
- <0.5: Unlikely match

## Parameter Grouping

For UI display, implement `groupParameters()`:
```typescript
groupParameters(parameters: Record<string, any>): ParameterGroup[] {
  return [
    {
      id: 'event',
      name: 'Event Data',
      icon: 'event', // Icon identifier
      parameters: [
        {
          key: 'event_name',
          displayName: 'Event Name',
          value: parameters.event_name,
          format: 'string'
        }
      ]
    }
  ]
}
```

## Testing Providers

```bash
# Test specific provider
pnpm test providers/google

# Test with sample request
const request: RequestData = {
  url: 'https://example.com/track',
  method: 'POST',
  body: '{"event": "purchase"}',
  headers: {},
  query: {}
}

const result = await provider.analyze(request)
```

## Performance Considerations

1. **Lazy Loading**: Providers loaded on-demand
2. **Pattern Caching**: Compiled patterns cached
3. **Parallel Analysis**: Multiple providers analyzed concurrently
4. **Early Exit**: Skip analysis if confidence threshold met

## Common Patterns by Provider Type

### Analytics Providers
- Event-based tracking
- Page view as default event
- User/session identifiers
- Custom dimensions/metrics

### Advertising Providers
- Conversion tracking focus
- Account/campaign IDs
- Revenue/value parameters
- Product/item data

### Tag Managers
- Container IDs
- Multiple nested events
- Dynamic event routing
- Version/environment info