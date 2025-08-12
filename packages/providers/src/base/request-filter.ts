import { RequestData } from '@pixeltracer/shared'

/**
 * Request filtering configuration
 */
export interface FilterConfig {
  /** Allowed HTTP methods */
  methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS')[]
  /** URL patterns to include */
  includeUrls?: (string | RegExp)[]
  /** URL patterns to exclude */
  excludeUrls?: (string | RegExp)[]
  /** Domains to include */
  includeDomains?: (string | RegExp)[]
  /** Domains to exclude */
  excludeDomains?: (string | RegExp)[]
  /** Minimum URL length */
  minUrlLength?: number
  /** Maximum URL length */
  maxUrlLength?: number
  /** Required query parameters */
  requiredParams?: string[]
  /** Exclude requests with these parameters */
  excludeParams?: string[]
  /** Content-Type filters */
  contentTypes?: string[]
  /** Custom filter functions */
  customFilters?: ((request: RequestData) => boolean)[]
}

/**
 * Request filtering statistics
 */
export interface FilterStats {
  /** Total requests processed */
  totalRequests: number
  /** Requests that passed filters */
  passedRequests: number
  /** Requests blocked by filters */
  blockedRequests: number
  /** Pass rate (0.0 to 1.0) */
  passRate: number
  /** Breakdown by filter type */
  blockReasons: Record<string, number>
  /** Processing time statistics */
  avgProcessingTime: number
  /** Last reset time */
  lastReset: number
}

/**
 * Filter result
 */
export interface FilterResult {
  /** Whether request passed all filters */
  passed: boolean
  /** Reasons why request was blocked (if any) */
  blockReasons: string[]
  /** Processing time in milliseconds */
  processingTime: number
}

/**
 * High-performance request filter for tracking detection
 * Filters out irrelevant requests before expensive provider analysis
 */
export class RequestFilter {
  private config: FilterConfig
  private stats: FilterStats
  private urlCache = new Map<string, boolean>()
  private domainCache = new Map<string, string>()

  constructor(config: FilterConfig = {}) {
    this.config = config
    this.stats = {
      totalRequests: 0,
      passedRequests: 0,
      blockedRequests: 0,
      passRate: 0,
      blockReasons: {},
      avgProcessingTime: 0,
      lastReset: Date.now()
    }
  }

  /**
   * Filter a request through all configured filters
   */
  filter(request: RequestData): FilterResult {
    const startTime = performance.now()
    const blockReasons: string[] = []

    this.stats.totalRequests++

    try {
      // Method filter
      if (this.config.methods && !this.config.methods.includes(request.method as any)) {
        blockReasons.push(`method:${request.method}`)
      }

      // URL length filters
      if (this.config.minUrlLength && request.url.length < this.config.minUrlLength) {
        blockReasons.push(`url-too-short:${request.url.length}`)
      }
      if (this.config.maxUrlLength && request.url.length > this.config.maxUrlLength) {
        blockReasons.push(`url-too-long:${request.url.length}`)
      }

      // URL include/exclude filters
      if (this.config.includeUrls && this.config.includeUrls.length > 0) {
        if (!this.matchesPatterns(request.url, this.config.includeUrls)) {
          blockReasons.push('url-not-included')
        }
      }

      if (this.config.excludeUrls && this.config.excludeUrls.length > 0) {
        if (this.matchesPatterns(request.url, this.config.excludeUrls)) {
          blockReasons.push('url-excluded')
        }
      }

      // Domain filters
      const domain = this.extractDomain(request.url)
      if (domain) {
        if (this.config.includeDomains && this.config.includeDomains.length > 0) {
          if (!this.matchesPatterns(domain, this.config.includeDomains)) {
            blockReasons.push('domain-not-included')
          }
        }

        if (this.config.excludeDomains && this.config.excludeDomains.length > 0) {
          if (this.matchesPatterns(domain, this.config.excludeDomains)) {
            blockReasons.push('domain-excluded')
          }
        }
      }

      // Parameter filters
      if (this.config.requiredParams && this.config.requiredParams.length > 0) {
        const missingParams = this.config.requiredParams.filter(param => 
          !(param in request.query) && (!request.body || !request.body.includes(param))
        )
        if (missingParams.length > 0) {
          blockReasons.push(`missing-params:${missingParams.join(',')}`)
        }
      }

      if (this.config.excludeParams && this.config.excludeParams.length > 0) {
        const foundExcluded = this.config.excludeParams.filter(param =>
          param in request.query || (request.body && request.body.includes(param))
        )
        if (foundExcluded.length > 0) {
          blockReasons.push(`excluded-params:${foundExcluded.join(',')}`)
        }
      }

      // Content-Type filters
      if (this.config.contentTypes && this.config.contentTypes.length > 0) {
        const contentType = request.headers['content-type'] || request.headers['Content-Type']
        if (contentType && !this.config.contentTypes.some(ct => contentType.includes(ct))) {
          blockReasons.push(`content-type:${contentType}`)
        }
      }

      // Custom filters
      if (this.config.customFilters) {
        for (let i = 0; i < this.config.customFilters.length; i++) {
          try {
            if (!this.config.customFilters[i](request)) {
              blockReasons.push(`custom-filter-${i}`)
            }
          } catch (error) {
            blockReasons.push(`custom-filter-${i}-error`)
          }
        }
      }

      const passed = blockReasons.length === 0
      const processingTime = performance.now() - startTime

      // Update statistics
      if (passed) {
        this.stats.passedRequests++
      } else {
        this.stats.blockedRequests++
        blockReasons.forEach(reason => {
          this.stats.blockReasons[reason] = (this.stats.blockReasons[reason] || 0) + 1
        })
      }

      this.updateProcessingTimeStats(processingTime)

      return {
        passed,
        blockReasons,
        processingTime
      }

    } catch (error) {
      const processingTime = performance.now() - startTime
      
      this.stats.blockedRequests++
      this.stats.blockReasons['filter-error'] = (this.stats.blockReasons['filter-error'] || 0) + 1
      this.updateProcessingTimeStats(processingTime)

      return {
        passed: false,
        blockReasons: ['filter-error'],
        processingTime
      }
    }
  }

  /**
   * Batch filter multiple requests
   */
  filterBatch(requests: RequestData[]): FilterResult[] {
    return requests.map(request => this.filter(request))
  }

  /**
   * Update filter configuration
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Clear caches when configuration changes
    this.urlCache.clear()
    this.domainCache.clear()
  }

  /**
   * Get current filter statistics
   */
  getStats(): FilterStats {
    // const now = Date.now() // TODO: Use for time-based statistics
    return {
      ...this.stats,
      passRate: this.stats.totalRequests > 0 ? 
        this.stats.passedRequests / this.stats.totalRequests : 0
    }
  }

  /**
   * Reset filter statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      passedRequests: 0,
      blockedRequests: 0,
      passRate: 0,
      blockReasons: {},
      avgProcessingTime: 0,
      lastReset: Date.now()
    }
  }

  /**
   * Create common filter configurations
   */
  static createTrackingFilter(): FilterConfig {
    return {
      methods: ['GET', 'POST'],
      excludeUrls: [
        '*.css',
        '*.js',
        '*.png',
        '*.jpg',
        '*.gif',
        '*.svg',
        '*.woff*',
        '*.ttf',
        '*.ico'
      ],
      minUrlLength: 10,
      maxUrlLength: 2000,
      excludeDomains: [
        'localhost',
        '127.0.0.1',
        '*.local'
      ]
    }
  }

  static createPixelFilter(): FilterConfig {
    return {
      methods: ['GET', 'POST'],
      includeUrls: [
        '*pixel*',
        '*track*',
        '*analytics*',
        '*collect*',
        '*event*',
        '*conversion*'
      ],
      requiredParams: [], // Providers will handle specific params
      minUrlLength: 20
    }
  }

  static createStrictFilter(): FilterConfig {
    return {
      methods: ['GET', 'POST'],
      includeDomains: [
        'facebook.com',
        'connect.facebook.net',
        'google-analytics.com',
        'googletagmanager.com',
        'doubleclick.net',
        'analytics.tiktok.com',
        'ads-api.twitter.com',
        'linkedin.com'
      ],
      minUrlLength: 15,
      maxUrlLength: 1500
    }
  }

  /**
   * Check if a string matches any of the given patterns
   */
  private matchesPatterns(value: string, patterns: (string | RegExp)[]): boolean {
    // Use cache for URL patterns
    const cacheKey = `${value}:${patterns.length}`
    if (this.urlCache.has(cacheKey)) {
      return this.urlCache.get(cacheKey)!
    }

    let matches = false
    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        if (pattern.includes('*')) {
          const regexPattern = pattern.replace(/\*/g, '.*')
          if (new RegExp(regexPattern, 'i').test(value)) {
            matches = true
            break
          }
        } else if (value.toLowerCase().includes(pattern.toLowerCase())) {
          matches = true
          break
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(value)) {
          matches = true
          break
        }
      }
    }

    // Cache result (with size limit)
    if (this.urlCache.size < 1000) {
      this.urlCache.set(cacheKey, matches)
    }

    return matches
  }

  /**
   * Extract domain from URL with caching
   */
  private extractDomain(url: string): string | null {
    if (this.domainCache.has(url)) {
      return this.domainCache.get(url)!
    }

    let domain: string | null = null
    try {
      domain = new URL(url).hostname
    } catch {
      // If URL parsing fails, try to extract domain manually
      const match = url.match(/https?:\/\/([^\/\?#]+)/)
      if (match) {
        domain = match[1]
      }
    }

    // Cache result (with size limit)
    if (this.domainCache.size < 500 && domain) {
      this.domainCache.set(url, domain)
    }

    return domain
  }

  /**
   * Update processing time statistics
   */
  private updateProcessingTimeStats(processingTime: number): void {
    if (this.stats.totalRequests === 1) {
      this.stats.avgProcessingTime = processingTime
    } else {
      // Moving average
      const alpha = 0.1 // Weight for new sample
      this.stats.avgProcessingTime = 
        (1 - alpha) * this.stats.avgProcessingTime + alpha * processingTime
    }
  }
}