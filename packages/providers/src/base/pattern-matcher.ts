/**
 * Advanced pattern matching utilities for URL and request analysis
 * Supports wildcards, regex, domain matching, and complex patterns
 */

export interface MatchOptions {
  /** Case sensitivity */
  caseSensitive?: boolean
  /** Enable wildcard matching (* and ?) */
  wildcards?: boolean
  /** Enable domain-specific matching */
  domainMode?: boolean
  /** Enable path-specific matching */
  pathMode?: boolean
}

export interface MatchResult {
  /** Whether the pattern matched */
  matched: boolean
  /** Confidence score (0.0 to 1.0) */
  confidence: number
  /** Which part of the pattern matched */
  matchedSegment?: string
  /** Extracted groups from regex patterns */
  groups?: Record<string, string>
  /** Match metadata */
  metadata: {
    /** Pattern that matched */
    pattern: string | RegExp
    /** Match type used */
    matchType: 'exact' | 'wildcard' | 'regex' | 'domain' | 'path'
    /** Processing time in milliseconds */
    processingTime: number
  }
}

/**
 * Advanced pattern matcher with support for multiple matching strategies
 */
export class PatternMatcher {
  private static instance: PatternMatcher
  private domainCache = new Map<string, string[]>()
  private regexCache = new Map<string, RegExp>()

  static getInstance(): PatternMatcher {
    if (!PatternMatcher.instance) {
      PatternMatcher.instance = new PatternMatcher()
    }
    return PatternMatcher.instance
  }

  /**
   * Match a value against a single pattern
   */
  match(value: string, pattern: string | RegExp, options: MatchOptions = {}): MatchResult {
    const startTime = performance.now()
    const defaultOptions: Required<MatchOptions> = {
      caseSensitive: false,
      wildcards: true,
      domainMode: false,
      pathMode: false,
      ...options
    }

    try {
      let result: MatchResult

      if (pattern instanceof RegExp) {
        result = this.matchRegex(value, pattern, defaultOptions)
      } else if (defaultOptions.domainMode) {
        result = this.matchDomain(value, pattern, defaultOptions)
      } else if (defaultOptions.pathMode) {
        result = this.matchPath(value, pattern, defaultOptions)
      } else if (defaultOptions.wildcards && pattern.includes('*')) {
        result = this.matchWildcard(value, pattern, defaultOptions)
      } else {
        result = this.matchExact(value, pattern, defaultOptions)
      }

      result.metadata.processingTime = performance.now() - startTime
      return result

    } catch (error) {
      return {
        matched: false,
        confidence: 0.0,
        metadata: {
          pattern,
          matchType: 'exact',
          processingTime: performance.now() - startTime
        }
      }
    }
  }

  /**
   * Match a value against multiple patterns, return best match
   */
  matchBest(value: string, patterns: (string | RegExp)[], options: MatchOptions = {}): MatchResult | null {
    let bestMatch: MatchResult | null = null

    for (const pattern of patterns) {
      const result = this.match(value, pattern, options)
      if (result.matched) {
        if (!bestMatch || result.confidence > bestMatch.confidence) {
          bestMatch = result
        }
      }
    }

    return bestMatch
  }

  /**
   * Match a value against multiple patterns, return all matches
   */
  matchAll(value: string, patterns: (string | RegExp)[], options: MatchOptions = {}): MatchResult[] {
    const results: MatchResult[] = []

    for (const pattern of patterns) {
      const result = this.match(value, pattern, options)
      if (result.matched) {
        results.push(result)
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Exact string matching
   */
  private matchExact(value: string, pattern: string, options: Required<MatchOptions>): MatchResult {
    const compareValue = options.caseSensitive ? value : value.toLowerCase()
    const comparePattern = options.caseSensitive ? pattern : pattern.toLowerCase()
    
    const matched = compareValue === comparePattern
    const confidence = matched ? 1.0 : (compareValue.includes(comparePattern) ? 0.7 : 0.0)

    return {
      matched,
      confidence,
      matchedSegment: matched ? pattern : undefined,
      metadata: {
        pattern,
        matchType: 'exact',
        processingTime: 0
      }
    }
  }

  /**
   * Wildcard pattern matching (* and ? support)
   */
  private matchWildcard(value: string, pattern: string, options: Required<MatchOptions>): MatchResult {
    const compareValue = options.caseSensitive ? value : value.toLowerCase()
    const comparePattern = options.caseSensitive ? pattern : pattern.toLowerCase()

    // Convert wildcard pattern to regex
    const regexPattern = comparePattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\\\*/g, '.*') // Convert * to .*
      .replace(/\\\?/g, '.') // Convert ? to .

    const regex = new RegExp(`^${regexPattern}$`)
    const matched = regex.test(compareValue)
    
    // Calculate confidence based on specificity
    let confidence = 0.0
    if (matched) {
      const wildcardCount = (pattern.match(/[*?]/g) || []).length
      const totalLength = pattern.length
      confidence = Math.max(0.5, 1.0 - (wildcardCount / totalLength) * 0.3)
    }

    return {
      matched,
      confidence,
      matchedSegment: matched ? value : undefined,
      metadata: {
        pattern,
        matchType: 'wildcard',
        processingTime: 0
      }
    }
  }

  /**
   * Regular expression matching
   */
  private matchRegex(value: string, pattern: RegExp, options: Required<MatchOptions>): MatchResult {
    const testValue = options.caseSensitive ? value : value.toLowerCase()
    const testRegex = options.caseSensitive ? pattern : new RegExp(pattern.source, pattern.flags + 'i')

    const match = testRegex.exec(testValue)
    const matched = match !== null

    let groups: Record<string, string> = {}
    if (match && match.groups) {
      groups = match.groups
    }

    // Calculate confidence based on match coverage
    let confidence = 0.0
    if (matched && match) {
      const matchLength = match[0].length
      const totalLength = value.length
      confidence = Math.min(1.0, 0.8 + (matchLength / totalLength) * 0.2)
    }

    return {
      matched,
      confidence,
      matchedSegment: match ? match[0] : undefined,
      groups: Object.keys(groups).length > 0 ? groups : undefined,
      metadata: {
        pattern,
        matchType: 'regex',
        processingTime: 0
      }
    }
  }

  /**
   * Domain-specific matching (handles subdomains, TLDs, etc.)
   */
  private matchDomain(value: string, pattern: string, _options: Required<MatchOptions>): MatchResult {
    const valueDomain = this.extractDomain(value)
    const patternDomain = this.extractDomain(pattern)

    if (!valueDomain || !patternDomain) {
      return {
        matched: false,
        confidence: 0.0,
        metadata: {
          pattern,
          matchType: 'domain',
          processingTime: 0
        }
      }
    }

    const valueSegments = this.getDomainSegments(valueDomain)
    const patternSegments = this.getDomainSegments(patternDomain)

    let matched = false
    let confidence = 0.0

    // Exact domain match
    if (valueSegments.domain === patternSegments.domain && 
        valueSegments.tld === patternSegments.tld) {
      matched = true
      confidence = 1.0

      // Reduce confidence for subdomain mismatches
      if (valueSegments.subdomain !== patternSegments.subdomain) {
        confidence = 0.8
      }
    }
    // Domain and TLD match with wildcard subdomain
    else if (patternSegments.subdomain === '*' &&
             valueSegments.domain === patternSegments.domain &&
             valueSegments.tld === patternSegments.tld) {
      matched = true
      confidence = 0.9
    }
    // Partial domain match
    else if (valueSegments.domain.includes(patternSegments.domain) ||
             patternSegments.domain.includes(valueSegments.domain)) {
      matched = true
      confidence = 0.6
    }

    return {
      matched,
      confidence,
      matchedSegment: matched ? valueDomain : undefined,
      metadata: {
        pattern,
        matchType: 'domain',
        processingTime: 0
      }
    }
  }

  /**
   * Path-specific matching
   */
  private matchPath(value: string, pattern: string, _options: Required<MatchOptions>): MatchResult {
    try {
      const valuePath = new URL(value).pathname
      const patternPath = pattern.startsWith('/') ? pattern : `/${pattern}`

      return this.matchWildcard(valuePath, patternPath, _options)
    } catch {
      // If URL parsing fails, fall back to string matching
      return this.matchWildcard(value, pattern, _options)
    }
  }

  /**
   * Extract domain from URL or domain string
   */
  private extractDomain(input: string): string | null {
    try {
      // Try parsing as URL first
      const url = new URL(input)
      return url.hostname
    } catch {
      // If not a valid URL, assume it's already a domain
      if (input.includes('.') && !input.includes('/')) {
        return input
      }
      return null
    }
  }

  /**
   * Split domain into components
   */
  private getDomainSegments(domain: string): {
    subdomain: string
    domain: string
    tld: string
  } {
    // Use cache for repeated domain parsing
    if (this.domainCache.has(domain)) {
      const segments = this.domainCache.get(domain)!
      return {
        subdomain: segments[0],
        domain: segments[1],
        tld: segments[2]
      }
    }

    const parts = domain.toLowerCase().split('.')
    let subdomain = ''
    let domainName = ''
    let tld = ''

    if (parts.length >= 2) {
      tld = parts[parts.length - 1]
      domainName = parts[parts.length - 2]
      
      if (parts.length > 2) {
        subdomain = parts.slice(0, -2).join('.')
      }
    }

    // Cache the result
    this.domainCache.set(domain, [subdomain, domainName, tld])

    return { subdomain, domain: domainName, tld }
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.domainCache.clear()
    this.regexCache.clear()
  }
}