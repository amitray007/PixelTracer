import { TrackingEvent } from '@pixeltracer/shared'

/**
 * Pattern matching configuration for URL/request detection
 */
export interface PatternConfig {
  /** URL patterns to match (can include wildcards) */
  urlPatterns: (string | RegExp)[]
  /** Domain patterns to match */
  domains?: (string | RegExp)[]
  /** Path patterns to match */
  paths?: (string | RegExp)[]
  /** Query parameter patterns */
  queryPatterns?: Record<string, string | RegExp>
  /** Header patterns to match */
  headerPatterns?: Record<string, string | RegExp>
  /** HTTP methods to match */
  methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[]
}

/**
 * Configuration for parameter parsing
 */
export interface ParameterConfig {
  /** Required parameters that must be present */
  required?: string[]
  /** Optional parameters */
  optional?: string[]
  /** Parameter aliases (different names for same data) */
  aliases?: Record<string, string[]>
  /** Custom parsers for complex parameters */
  parsers?: Record<string, (value: string) => any>
  /** Parameter validation rules */
  validators?: Record<string, (value: any) => boolean>
}

/**
 * Provider metadata and configuration
 */
export interface ProviderConfig {
  /** Unique provider identifier */
  id: string
  /** Human-readable provider name */
  name: string
  /** Provider version */
  version: string
  /** Provider description */
  description: string
  /** Provider website/documentation URL */
  website?: string
  /** Provider icon/logo URL */
  icon?: string
  /** Provider category (advertising, analytics, etc.) */
  category: 'advertising' | 'analytics' | 'social' | 'marketing' | 'other'
  /** Pattern matching configuration */
  patterns: PatternConfig
  /** Parameter parsing configuration */
  parameters: ParameterConfig
}

/**
 * Request data structure for analysis
 */
export interface RequestData {
  /** Request URL */
  url: string
  /** HTTP method */
  method: string
  /** Request headers */
  headers: Record<string, string>
  /** Request body (for POST requests) */
  body?: string
  /** Query parameters */
  query: Record<string, string>
  /** Parsed URL components */
  parsedUrl: {
    protocol: string
    hostname: string
    pathname: string
    search: string
    hash: string
  }
  /** Request timestamp */
  timestamp: number
  /** Request type (xhr, fetch, script, etc.) */
  type?: string
}

/**
 * Provider analysis result
 */
export interface ProviderMatch {
  /** Matching provider instance */
  provider: BaseProvider
  /** Confidence score (0.0 to 1.0) */
  confidence: number
  /** Parsed tracking event */
  event: TrackingEvent
  /** Raw matched data */
  rawData: Record<string, any>
  /** Match metadata */
  metadata: {
    /** Which patterns matched */
    matchedPatterns: string[]
    /** Parsing errors (if any) */
    errors: string[]
    /** Processing time in milliseconds */
    processingTime: number
  }
}

/**
 * Base Provider class that all tracking providers extend
 * Implements the core pattern matching and confidence scoring system
 */
export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config }
  }

  /**
   * Get provider ID
   */
  getId(): string {
    return this.config.id
  }

  /**
   * Get provider name
   */
  getName(): string {
    return this.config.name
  }

  /**
   * Get provider version
   */
  getVersion(): string {
    return this.config.version
  }

  /**
   * Check if this provider can handle the given request
   * Returns confidence score (0.0 = no match, 1.0 = perfect match)
   */
  async canHandle(request: RequestData): Promise<number> {
    // const startTime = performance.now() // TODO: Use for performance metrics
    
    try {
      let confidence = 0.0
      const { patterns } = this.config

      // Check URL patterns (highest weight)
      const urlMatch = this.matchPatterns(request.url, patterns.urlPatterns)
      if (urlMatch) {
        confidence += 0.4
      } else {
        return 0.0 // No URL match = no provider match
      }

      // Check domain patterns
      if (patterns.domains) {
        const domainMatch = this.matchPatterns(request.parsedUrl.hostname, patterns.domains)
        if (domainMatch) {
          confidence += 0.3
        }
      }

      // Check path patterns
      if (patterns.paths) {
        const pathMatch = this.matchPatterns(request.parsedUrl.pathname, patterns.paths)
        if (pathMatch) {
          confidence += 0.15
        }
      }

      // Check HTTP method
      if (patterns.methods && patterns.methods.length > 0) {
        if (patterns.methods.includes(request.method as any)) {
          confidence += 0.05
        } else {
          confidence -= 0.1 // Wrong method reduces confidence
        }
      }

      // Check query parameters
      if (patterns.queryPatterns) {
        const queryScore = this.scoreQueryPatterns(request.query, patterns.queryPatterns)
        confidence += queryScore * 0.1
      }

      // Check required parameters
      if (this.config.parameters.required) {
        const requiredScore = this.scoreRequiredParameters(request, this.config.parameters.required)
        confidence *= requiredScore // Multiply to make required params critical
      }

      // Apply provider-specific scoring
      const customScore = await this.calculateCustomConfidence(request)
      confidence += customScore * 0.1

      // Normalize confidence to 0.0-1.0 range
      confidence = Math.max(0.0, Math.min(1.0, confidence))

      return confidence

    } catch (error) {
      return 0.0
    }
  }

  /**
   * Parse the request and extract tracking event data
   */
  async parse(request: RequestData): Promise<ProviderMatch> {
    const startTime = performance.now()
    const errors: string[] = []
    let confidence = 0.0

    try {
      // Calculate confidence
      confidence = await this.canHandle(request)
      if (confidence === 0.0) {
        throw new Error('Request does not match this provider')
      }

      // Parse parameters
      const parameters = await this.parseParameters(request)
      
      // Extract event type
      const eventType = await this.extractEventType(request, parameters)
      
      // Extract account ID
      const accountId = await this.extractAccountId(request, parameters)
      
      // Create tracking event
      const event: TrackingEvent = {
        id: this.generateEventId(request),
        provider: this.config.id,
        providerName: this.config.name,
        providerIcon: this.config.icon,
        eventType: eventType || 'unknown',
        accountId: accountId || undefined,
        url: request.url,
        method: request.method,
        parameters,
        confidence,
        timestamp: request.timestamp || Date.now(),
        rawData: {
          headers: request.headers,
          body: request.body,
          query: request.query
        }
      }

      // Apply provider-specific parsing
      await this.enrichEvent(event, request)

      const processingTime = performance.now() - startTime

      return {
        provider: this,
        confidence,
        event,
        rawData: parameters,
        metadata: {
          matchedPatterns: [], // TODO: Track which patterns matched
          errors,
          processingTime
        }
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      
      // Return minimal event even on error
      const event: TrackingEvent = {
        id: this.generateEventId(request),
        provider: this.config.id,
        providerName: this.config.name,
        eventType: 'error',
        url: request.url,
        method: request.method,
        parameters: {},
        confidence: 0.0,
        timestamp: request.timestamp || Date.now(),
        rawData: { error: error instanceof Error ? error.message : String(error) }
      }

      const processingTime = performance.now() - startTime

      return {
        provider: this,
        confidence: 0.0,
        event,
        rawData: {},
        metadata: {
          matchedPatterns: [],
          errors,
          processingTime
        }
      }
    }
  }

  /**
   * Match a value against an array of patterns
   */
  protected matchPatterns(value: string, patterns: (string | RegExp)[]): boolean {
    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        // Simple wildcard matching
        if (pattern.includes('*')) {
          const regexPattern = pattern.replace(/\*/g, '.*')
          if (new RegExp(regexPattern, 'i').test(value)) {
            return true
          }
        } else if (value.toLowerCase().includes(pattern.toLowerCase())) {
          return true
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(value)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Score query parameter matches
   */
  protected scoreQueryPatterns(query: Record<string, string>, patterns: Record<string, string | RegExp>): number {
    let score = 0
    let totalPatterns = Object.keys(patterns).length
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const value = query[key]
      if (value) {
        if (typeof pattern === 'string') {
          if (value.toLowerCase().includes(pattern.toLowerCase())) {
            score += 1
          }
        } else if (pattern instanceof RegExp) {
          if (pattern.test(value)) {
            score += 1
          }
        }
      }
    }
    
    return totalPatterns > 0 ? score / totalPatterns : 0
  }

  /**
   * Score required parameter presence
   */
  protected scoreRequiredParameters(request: RequestData, required: string[]): number {
    if (required.length === 0) return 1.0
    
    let found = 0
    for (const param of required) {
      if (request.query[param] || (request.body && request.body.includes(param))) {
        found++
      }
    }
    
    return found / required.length
  }

  /**
   * Generate unique event ID
   */
  protected generateEventId(request: RequestData): string {
    const timestamp = request.timestamp || Date.now()
    const urlHash = this.simpleHash(request.url)
    return `${this.config.id}-${timestamp}-${urlHash}`
  }

  /**
   * Simple hash function for URLs
   */
  protected simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // Abstract methods that providers must implement

  /**
   * Provider-specific confidence calculation
   */
  protected abstract calculateCustomConfidence(request: RequestData): Promise<number>

  /**
   * Parse parameters from the request
   */
  protected abstract parseParameters(request: RequestData): Promise<Record<string, any>>

  /**
   * Extract event type from request/parameters
   */
  protected abstract extractEventType(request: RequestData, parameters: Record<string, any>): Promise<string | null>

  /**
   * Extract account ID from request/parameters
   */
  protected abstract extractAccountId(request: RequestData, parameters: Record<string, any>): Promise<string | null>

  /**
   * Enrich the tracking event with provider-specific data
   */
  protected abstract enrichEvent(event: TrackingEvent, request: RequestData): Promise<void>
}