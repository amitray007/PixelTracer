import { BaseProvider, ExtendedProviderMatch, ProviderConfig } from '../base/base-provider'
import { RequestData, AnalysisResult, ProviderMatch } from '@pixeltracer/shared'

/**
 * Provider registration information
 */
export interface ProviderRegistration {
  /** Provider instance */
  provider: BaseProvider
  /** Registration metadata */
  metadata: {
    /** When the provider was registered */
    registeredAt: number
    /** Provider loading time in milliseconds */
    loadTime: number
    /** Whether provider is enabled */
    enabled: boolean
    /** Provider priority (higher = checked first) */
    priority: number
  }
}

/**
 * Provider registry statistics
 */
export interface RegistryStats {
  /** Total number of registered providers */
  totalProviders: number
  /** Number of enabled providers */
  enabledProviders: number
  /** Provider breakdown by category */
  byCategory: Record<string, number>
  /** Average provider loading time */
  avgLoadTime: number
  /** Registry uptime in milliseconds */
  uptime: number
}


/**
 * Provider registry that manages all tracking providers
 * Handles dynamic loading, priority management, and request analysis
 */
export class ProviderRegistry {
  private providers = new Map<string, ProviderRegistration>()
  private startTime = Date.now()
  private analysisCache = new Map<string, AnalysisResult>()
  private cacheMaxSize = 1000
  private cacheMaxAge = 5 * 60 * 1000 // 5 minutes

  /**
   * Register a provider with the registry
   */
  async register(provider: BaseProvider, options: {
    enabled?: boolean
    priority?: number
  } = {}): Promise<void> {
    const startTime = performance.now()
    
    try {
      const config = provider.getConfig()
      
      // Validate provider configuration
      this.validateProviderConfig(config)
      
      const registration: ProviderRegistration = {
        provider,
        metadata: {
          registeredAt: Date.now(),
          loadTime: performance.now() - startTime,
          enabled: options.enabled ?? true,
          priority: options.priority ?? 0
        }
      }
      
      this.providers.set(config.id, registration)
      
      
    } catch (error) {
      throw error
    }
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): boolean {
    const removed = this.providers.delete(providerId)
    if (removed) {
      // Clear related cache entries
      this.clearCacheForProvider(providerId)
    }
    return removed
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(providerId: string): BaseProvider | null {
    const registration = this.providers.get(providerId)
    return registration ? registration.provider : null
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values())
      .filter(reg => reg.metadata.enabled)
      .sort((a, b) => b.metadata.priority - a.metadata.priority)
      .map(reg => reg.provider)
  }

  /**
   * Get providers by category
   */
  getProvidersByCategory(category: string): BaseProvider[] {
    return this.getAllProviders()
      .filter(provider => provider.getConfig().category === category)
  }

  /**
   * Enable/disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): boolean {
    const registration = this.providers.get(providerId)
    if (registration) {
      registration.metadata.enabled = enabled
      
      // Clear cache when provider state changes
      this.clearCacheForProvider(providerId)
      return true
    }
    return false
  }

  /**
   * Set provider priority
   */
  setProviderPriority(providerId: string, priority: number): boolean {
    const registration = this.providers.get(providerId)
    if (registration) {
      registration.metadata.priority = priority
      return true
    }
    return false
  }

  /**
   * Analyze a request against all registered providers
   */
  async analyze(request: RequestData, options: {
    maxMatches?: number
    minConfidence?: number
    useCache?: boolean
  } = {}): Promise<AnalysisResult> {
    const startTime = performance.now()
    const {
      maxMatches = 10,
      minConfidence = 0.1,
      useCache = true
    } = options

    // Check cache first
    if (useCache) {
      const cacheKey = this.getCacheKey(request)
      const cached = this.analysisCache.get(cacheKey)
      if (cached && (Date.now() - startTime < this.cacheMaxAge)) {
        return cached
      }
    }

    const matches: ProviderMatch[] = []
    const providers = this.getAllProviders()
    
    try {
      // Analyze request with each provider in parallel
      const analysisPromises = providers.map(async (provider) => {
        try {
          const confidence = await provider.canHandle(request)
          if (confidence >= minConfidence) {
            return await provider.parse(request)
          }
          return null
        } catch (error) {
          return null
        }
      })

      const results = await Promise.allSettled(analysisPromises)
      
      // Collect successful matches and convert to shared ProviderMatch interface
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const extendedMatch = result.value as ExtendedProviderMatch
          const providerMatch: ProviderMatch = {
            providerId: extendedMatch.providerId,
            providerName: extendedMatch.providerName,
            confidence: extendedMatch.confidence,
            event: extendedMatch.event,
            metadata: extendedMatch.metadata
          }
          matches.push(providerMatch)
        }
      })

      // Sort by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence)

      // Limit results
      const limitedMatches = matches.slice(0, maxMatches)
      const bestMatch = limitedMatches.length > 0 ? limitedMatches[0] : undefined

      const analysisResult: AnalysisResult = {
        matches: limitedMatches,
        bestMatch,
        metadata: {
          processingTime: performance.now() - startTime,
          timestamp: Date.now(),
          totalProvidersChecked: providers.length,
          cacheHit: false
        }
      }

      // Cache the result
      if (useCache) {
        this.cacheAnalysisResult(request, analysisResult)
      }

      return analysisResult

    } catch (error) {
      return {
        matches: [],
        bestMatch: undefined,
        metadata: {
          processingTime: performance.now() - startTime,
          timestamp: Date.now(),
          totalProvidersChecked: providers.length,
          cacheHit: false
        }
      }
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const totalProviders = this.providers.size
    const enabledProviders = Array.from(this.providers.values())
      .filter(reg => reg.metadata.enabled).length

    const byCategory: Record<string, number> = {}
    let totalLoadTime = 0

    this.providers.forEach((registration) => {
      const category = registration.provider.getConfig().category
      byCategory[category] = (byCategory[category] || 0) + 1
      totalLoadTime += registration.metadata.loadTime
    })

    return {
      totalProviders,
      enabledProviders,
      byCategory,
      avgLoadTime: totalProviders > 0 ? totalLoadTime / totalProviders : 0,
      uptime: Date.now() - this.startTime
    }
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear()
  }

  /**
   * Validate provider configuration
   */
  private validateProviderConfig(config: ProviderConfig): void {
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('Provider must have a valid ID')
    }
    
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Provider must have a valid name')
    }
    
    if (!config.version || typeof config.version !== 'string') {
      throw new Error('Provider must have a valid version')
    }
    
    if (!config.patterns || !config.patterns.urlPatterns || config.patterns.urlPatterns.length === 0) {
      throw new Error('Provider must define URL patterns')
    }
    
    // Check for duplicate provider ID - allow re-registration by replacing
    if (this.providers.has(config.id)) {
      // Remove the existing registration
      this.providers.delete(config.id)
    }
  }

  /**
   * Generate cache key for a request
   */
  private getCacheKey(request: RequestData): string {
    const keyData = {
      url: request.url,
      method: request.method,
      timestamp: Math.floor(request.timestamp / 60000) // Round to minute
    }
    return JSON.stringify(keyData)
  }

  /**
   * Cache analysis result
   */
  private cacheAnalysisResult(request: RequestData, result: AnalysisResult): void {
    // Implement LRU cache behavior
    if (this.analysisCache.size >= this.cacheMaxSize) {
      const firstKey = this.analysisCache.keys().next().value
      if (firstKey !== undefined) {
        this.analysisCache.delete(firstKey)
      }
    }
    
    const cacheKey = this.getCacheKey(request)
    this.analysisCache.set(cacheKey, result)
  }

  /**
   * Clear cache entries for a specific provider
   */
  private clearCacheForProvider(providerId: string): void {
    const keysToDelete: string[] = []
    
    this.analysisCache.forEach((result, key) => {
      if (result.matches.some(match => match.providerId === providerId)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.analysisCache.delete(key))
  }
}

// Global registry instance
export const providerRegistry = new ProviderRegistry()