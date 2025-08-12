/**
 * Advanced Filtering and Search System
 * 
 * Provides powerful filtering, searching, and aggregation capabilities
 * for tracking events and analytics data.
 */

import type { TrackingEvent } from '@pixeltracer/shared'

export interface FilterCriteria {
  // Basic filters
  providers?: string[]
  eventTypes?: string[]
  methods?: ('GET' | 'POST' | 'PUT' | 'DELETE')[]
  confidenceRange?: { min: number; max: number }
  timeRange?: { start: number; end: number }
  
  // URL filters
  urlPatterns?: (string | RegExp)[]
  domains?: string[]
  pathPatterns?: (string | RegExp)[]
  
  // Parameter filters
  hasParameters?: string[]
  parameterValues?: Record<string, any>
  parameterPatterns?: Record<string, RegExp>
  
  // Business filters
  hasRevenue?: boolean
  revenueRange?: { min: number; max: number }
  currencies?: string[]
  
  // Advanced filters
  customFilter?: (event: TrackingEvent) => boolean
  textSearch?: string
}

export interface SearchOptions {
  limit?: number
  offset?: number
  sortBy?: keyof TrackingEvent | 'relevance'
  sortOrder?: 'asc' | 'desc'
  includeScore?: boolean
}

export interface FilterResult {
  events: TrackingEvent[]
  totalCount: number
  filtered: number
  aggregations?: Record<string, any>
  processingTime: number
}

export interface AggregationOptions {
  groupBy?: (keyof TrackingEvent)[]
  metrics?: {
    count?: boolean
    uniqueCount?: string[]
    sum?: string[]
    avg?: string[]
    min?: string[]
    max?: string[]
  }
  timeInterval?: 'minute' | 'hour' | 'day' | 'week' | 'month'
}

export class AdvancedFilters {
  // Reserved for future search index implementation
  // private searchIndex = new Map<string, Set<TrackingEvent>>()
  // private lastIndexUpdate = 0
  // private readonly INDEX_UPDATE_INTERVAL = 5000 // 5 seconds

  /**
   * Filter events with advanced criteria
   */
  filterEvents(
    events: TrackingEvent[], 
    criteria: FilterCriteria, 
    options: SearchOptions = {}
  ): FilterResult {
    const startTime = performance.now()
    
    let filteredEvents = [...events]
    let totalCount = events.length

    // Apply basic filters
    if (criteria.providers?.length) {
      filteredEvents = filteredEvents.filter(event => 
        criteria.providers!.includes(event.provider)
      )
    }

    if (criteria.eventTypes?.length) {
      filteredEvents = filteredEvents.filter(event => 
        event.eventType && criteria.eventTypes!.includes(event.eventType)
      )
    }

    if (criteria.methods?.length) {
      filteredEvents = filteredEvents.filter(event => 
        criteria.methods!.includes(event.method as any)
      )
    }

    // Apply confidence range filter
    if (criteria.confidenceRange) {
      const { min, max } = criteria.confidenceRange
      filteredEvents = filteredEvents.filter(event => 
        event.confidence >= min && event.confidence <= max
      )
    }

    // Apply time range filter
    if (criteria.timeRange) {
      const { start, end } = criteria.timeRange
      filteredEvents = filteredEvents.filter(event => 
        event.timestamp >= start && event.timestamp <= end
      )
    }

    // Apply URL filters
    if (criteria.urlPatterns?.length) {
      filteredEvents = filteredEvents.filter(event => 
        criteria.urlPatterns!.some(pattern => {
          if (typeof pattern === 'string') {
            return event.url.includes(pattern)
          }
          return pattern.test(event.url)
        })
      )
    }

    if (criteria.domains?.length) {
      filteredEvents = filteredEvents.filter(event => {
        try {
          const url = new URL(event.url)
          return criteria.domains!.includes(url.hostname)
        } catch {
          return false
        }
      })
    }

    if (criteria.pathPatterns?.length) {
      filteredEvents = filteredEvents.filter(event => {
        try {
          const url = new URL(event.url)
          return criteria.pathPatterns!.some(pattern => {
            if (typeof pattern === 'string') {
              return url.pathname.includes(pattern)
            }
            return pattern.test(url.pathname)
          })
        } catch {
          return false
        }
      })
    }

    // Apply parameter filters
    if (criteria.hasParameters?.length) {
      filteredEvents = filteredEvents.filter(event => 
        criteria.hasParameters!.every(param => 
          event.parameters && param in event.parameters
        )
      )
    }

    if (criteria.parameterValues) {
      filteredEvents = filteredEvents.filter(event => {
        if (!event.parameters) return false
        return Object.entries(criteria.parameterValues!).every(([key, value]) => 
          event.parameters[key] === value
        )
      })
    }

    if (criteria.parameterPatterns) {
      filteredEvents = filteredEvents.filter(event => {
        if (!event.parameters) return false
        return Object.entries(criteria.parameterPatterns!).every(([key, pattern]) => {
          const value = event.parameters[key]
          return value !== undefined && pattern.test(String(value))
        })
      })
    }

    // Apply business filters
    if (criteria.hasRevenue) {
      filteredEvents = filteredEvents.filter(event => 
        this.hasRevenue(event)
      )
    }

    if (criteria.revenueRange) {
      const { min, max } = criteria.revenueRange
      filteredEvents = filteredEvents.filter(event => {
        const revenue = this.extractRevenue(event)
        return revenue !== null && revenue >= min && revenue <= max
      })
    }

    if (criteria.currencies?.length) {
      filteredEvents = filteredEvents.filter(event => {
        const currency = this.extractCurrency(event)
        return currency && criteria.currencies!.includes(currency)
      })
    }

    // Apply text search
    if (criteria.textSearch) {
      filteredEvents = this.performTextSearch(filteredEvents, criteria.textSearch)
    }

    // Apply custom filter
    if (criteria.customFilter) {
      filteredEvents = filteredEvents.filter(criteria.customFilter)
    }

    // Apply sorting
    if (options.sortBy) {
      filteredEvents = this.sortEvents(filteredEvents, options.sortBy, options.sortOrder || 'desc')
    }

    // Apply pagination
    const paginatedEvents = this.applyPagination(filteredEvents, options.limit, options.offset)

    const processingTime = performance.now() - startTime

    return {
      events: paginatedEvents,
      totalCount,
      filtered: filteredEvents.length,
      processingTime
    }
  }

  /**
   * Perform text search across event data
   */
  performTextSearch(events: TrackingEvent[], searchText: string): TrackingEvent[] {
    const searchTerms = searchText.toLowerCase().split(/\s+/).filter(Boolean)
    
    return events.filter(event => {
      const searchableText = [
        event.url,
        event.provider,
        event.providerName,
        event.eventType || '',
        JSON.stringify(event.parameters || {})
      ].join(' ').toLowerCase()

      return searchTerms.every(term => searchableText.includes(term))
    })
  }

  /**
   * Create aggregations from filtered events
   */
  createAggregations(events: TrackingEvent[], options: AggregationOptions): Record<string, any> {
    const aggregations: Record<string, any> = {}

    // Group by specified fields
    if (options.groupBy?.length) {
      const groups = this.groupEvents(events, options.groupBy)
      aggregations.groups = groups
    }

    // Calculate metrics
    if (options.metrics) {
      const metrics = this.calculateMetrics(events, options.metrics)
      aggregations.metrics = metrics
    }

    // Time-based aggregations
    if (options.timeInterval) {
      const timeSeries = this.createTimeSeries(events, options.timeInterval)
      aggregations.timeSeries = timeSeries
    }

    // Provider breakdown
    aggregations.providerBreakdown = this.createProviderBreakdown(events)

    // Revenue analysis
    aggregations.revenueAnalysis = this.createRevenueAnalysis(events)

    // Confidence distribution
    aggregations.confidenceDistribution = this.createConfidenceDistribution(events)

    return aggregations
  }

  /**
   * Get suggested filters based on current data
   */
  getSuggestedFilters(events: TrackingEvent[]): Record<string, any> {
    const suggestions: Record<string, any> = {}

    // Most common providers
    const providerCounts = new Map<string, number>()
    events.forEach(event => {
      providerCounts.set(event.provider, (providerCounts.get(event.provider) || 0) + 1)
    })
    suggestions.topProviders = Array.from(providerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([provider, count]) => ({ provider, count }))

    // Most common event types
    const eventTypeCounts = new Map<string, number>()
    events.forEach(event => {
      if (event.eventType) {
        eventTypeCounts.set(event.eventType, (eventTypeCounts.get(event.eventType) || 0) + 1)
      }
    })
    suggestions.topEventTypes = Array.from(eventTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([eventType, count]) => ({ eventType, count }))

    // Most common domains
    const domainCounts = new Map<string, number>()
    events.forEach(event => {
      try {
        const url = new URL(event.url)
        domainCounts.set(url.hostname, (domainCounts.get(url.hostname) || 0) + 1)
      } catch {}
    })
    suggestions.topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }))

    // Time range suggestions
    const timestamps = events.map(e => e.timestamp).sort((a, b) => a - b)
    if (timestamps.length > 0) {
      suggestions.timeRange = {
        earliest: timestamps[0],
        latest: timestamps[timestamps.length - 1],
        common: {
          last1Hour: Date.now() - 3600000,
          last24Hours: Date.now() - 86400000,
          last7Days: Date.now() - 604800000
        }
      }
    }

    return suggestions
  }

  /**
   * Export filtered data in various formats
   */
  exportData(
    events: TrackingEvent[], 
    format: 'json' | 'csv' | 'xlsx',
    options?: { includeHeaders?: boolean; customFields?: string[] }
  ): string | ArrayBuffer {
    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2)
        
      case 'csv':
        return this.exportToCsv(events, options?.includeHeaders, options?.customFields)
        
      case 'xlsx':
        // Would integrate with a library like SheetJS for Excel export
        throw new Error('XLSX export not implemented yet')
        
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  // Private helper methods

  private hasRevenue(event: TrackingEvent): boolean {
    if (!event.parameters) return false
    
    const revenueFields = ['value', 'revenue', 'amount', 'price', 'total', 'purchase_value']
    return revenueFields.some(field => 
      event.parameters[field] !== undefined && 
      !isNaN(parseFloat(String(event.parameters[field])))
    )
  }

  private extractRevenue(event: TrackingEvent): number | null {
    if (!event.parameters) return null
    
    const revenueFields = ['value', 'revenue', 'amount', 'price', 'total', 'purchase_value']
    for (const field of revenueFields) {
      if (event.parameters[field] !== undefined) {
        const value = parseFloat(String(event.parameters[field]))
        if (!isNaN(value)) return value
      }
    }
    
    return null
  }

  private extractCurrency(event: TrackingEvent): string | null {
    if (!event.parameters) return null
    
    const currencyFields = ['currency', 'currency_code', 'cur']
    for (const field of currencyFields) {
      if (event.parameters[field]) {
        return String(event.parameters[field]).toUpperCase()
      }
    }
    
    return null
  }

  private sortEvents(
    events: TrackingEvent[], 
    sortBy: keyof TrackingEvent | 'relevance', 
    sortOrder: 'asc' | 'desc'
  ): TrackingEvent[] {
    return events.sort((a, b) => {
      let compareValue = 0
      
      if (sortBy === 'relevance') {
        // Sort by confidence for relevance
        compareValue = a.confidence - b.confidence
      } else {
        const aVal = a[sortBy as keyof TrackingEvent]
        const bVal = b[sortBy as keyof TrackingEvent]
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          compareValue = aVal.localeCompare(bVal)
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          compareValue = aVal - bVal
        } else {
          compareValue = String(aVal).localeCompare(String(bVal))
        }
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue
    })
  }

  private applyPagination(
    events: TrackingEvent[], 
    limit?: number, 
    offset?: number
  ): TrackingEvent[] {
    const startIndex = offset || 0
    const endIndex = limit ? startIndex + limit : events.length
    return events.slice(startIndex, endIndex)
  }

  private groupEvents(events: TrackingEvent[], groupBy: (keyof TrackingEvent)[]): Record<string, TrackingEvent[]> {
    const groups: Record<string, TrackingEvent[]> = {}
    
    events.forEach(event => {
      const key = groupBy.map(field => String(event[field])).join('|')
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(event)
    })
    
    return groups
  }

  private calculateMetrics(events: TrackingEvent[], metrics: AggregationOptions['metrics']): Record<string, any> {
    const result: Record<string, any> = {}
    
    if (metrics?.count) {
      result.count = events.length
    }
    
    if (metrics?.uniqueCount?.length) {
      metrics.uniqueCount.forEach(field => {
        const uniqueValues = new Set(events.map(e => e[field as keyof TrackingEvent]))
        result[`unique_${field}`] = uniqueValues.size
      })
    }
    
    // Add other metric calculations (sum, avg, min, max)
    
    return result
  }

  private createTimeSeries(events: TrackingEvent[], interval: string): Record<string, number> {
    const timeSeries: Record<string, number> = {}
    
    events.forEach(event => {
      const bucket = this.getTimeBucket(event.timestamp, interval)
      timeSeries[bucket] = (timeSeries[bucket] || 0) + 1
    })
    
    return timeSeries
  }

  private getTimeBucket(timestamp: number, interval: string): string {
    const date = new Date(timestamp)
    
    switch (interval) {
      case 'minute':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      case 'hour':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
      case 'day':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      case 'week':
        const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
        return `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / 604800000)).padStart(2, '0')}`
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      default:
        return date.toISOString()
    }
  }

  private createProviderBreakdown(events: TrackingEvent[]): Record<string, number> {
    const breakdown: Record<string, number> = {}
    events.forEach(event => {
      breakdown[event.provider] = (breakdown[event.provider] || 0) + 1
    })
    return breakdown
  }

  private createRevenueAnalysis(events: TrackingEvent[]): Record<string, any> {
    const revenueEvents = events.filter(e => this.hasRevenue(e))
    const revenues = revenueEvents.map(e => this.extractRevenue(e)).filter(r => r !== null) as number[]
    
    if (revenues.length === 0) {
      return { totalEvents: 0, totalRevenue: 0 }
    }
    
    return {
      totalEvents: revenueEvents.length,
      totalRevenue: revenues.reduce((sum, r) => sum + r, 0),
      averageRevenue: revenues.reduce((sum, r) => sum + r, 0) / revenues.length,
      minRevenue: Math.min(...revenues),
      maxRevenue: Math.max(...revenues)
    }
  }

  private createConfidenceDistribution(events: TrackingEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {
      'high (>0.8)': 0,
      'medium (0.5-0.8)': 0,
      'low (<0.5)': 0
    }
    
    events.forEach(event => {
      if (event.confidence > 0.8) {
        distribution['high (>0.8)']++
      } else if (event.confidence >= 0.5) {
        distribution['medium (0.5-0.8)']++
      } else {
        distribution['low (<0.5)']++
      }
    })
    
    return distribution
  }

  private exportToCsv(events: TrackingEvent[], includeHeaders = true, customFields?: string[]): string {
    if (events.length === 0) return ''

    const fields = customFields || [
      'timestamp', 'provider', 'providerName', 'url', 'method', 
      'eventType', 'confidence', 'tabId', 'parameters'
    ]

    const rows: string[] = []
    
    if (includeHeaders) {
      rows.push(fields.join(','))
    }

    for (const event of events) {
      const row = fields.map(field => {
        const value = event[field as keyof TrackingEvent]
        if (field === 'timestamp') {
          return `"${new Date(event.timestamp).toISOString()}"`
        }
        if (field === 'parameters') {
          return `"${JSON.stringify(value || {}).replace(/"/g, '""')}"`
        }
        return `"${String(value || '')}"`
      })
      rows.push(row.join(','))
    }

    return rows.join('\n')
  }
}