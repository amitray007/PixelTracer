/**
 * Performance Monitoring System
 * 
 * Comprehensive monitoring of system performance, resource usage,
 * and optimization recommendations.
 */

export interface PerformanceMetrics {
  // Processing metrics
  processingTime: {
    average: number
    median: number
    p95: number
    p99: number
  }
  
  // Memory metrics
  memoryUsage: {
    current: number
    peak: number
    average: number
  }
  
  // Throughput metrics
  throughput: {
    requestsPerSecond: number
    eventsPerSecond: number
    errorsPerSecond: number
  }
  
  // Cache metrics
  cacheMetrics: {
    hitRate: number
    missRate: number
    size: number
    evictions: number
  }
  
  // System health
  health: {
    status: 'healthy' | 'degraded' | 'critical'
    score: number // 0-100
    issues: PerformanceIssue[]
  }
}

export interface PerformanceIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'memory' | 'processing' | 'throughput' | 'errors'
  message: string
  recommendation: string
  timestamp: number
}

export interface OptimizationSuggestion {
  type: 'memory' | 'processing' | 'caching' | 'batching' | 'filtering'
  impact: 'low' | 'medium' | 'high'
  description: string
  implementation: string
  estimatedImprovement: string
}

interface MetricsCollector {
  processingTimes: number[]
  memoryReadings: number[]
  requestCounts: number[]
  errorCounts: number[]
  cacheHits: number
  cacheMisses: number
  cacheEvictions: number
  startTime: number
  lastCleanup: number
}

export class PerformanceMonitor {
  private collector: MetricsCollector
  private readonly MAX_SAMPLES = 1000
  private readonly CLEANUP_INTERVAL = 60000 // 1 minute
  private monitoringInterval: NodeJS.Timeout | null = null
  private isMonitoring = false

  constructor() {
    this.collector = {
      processingTimes: [],
      memoryReadings: [],
      requestCounts: [],
      errorCounts: [],
      cacheHits: 0,
      cacheMisses: 0,
      cacheEvictions: 0,
      startTime: Date.now(),
      lastCleanup: Date.now()
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.collector.startTime = Date.now()

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.performCleanup()
    }, intervalMs)
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.isMonitoring = false
  }

  /**
   * Record processing time for a request
   */
  recordProcessingTime(timeMs: number): void {
    this.collector.processingTimes.push(timeMs)
    this.trimArray(this.collector.processingTimes)
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(bytesUsed: number): void {
    this.collector.memoryReadings.push(bytesUsed)
    this.trimArray(this.collector.memoryReadings)
  }

  /**
   * Record request count
   */
  recordRequest(): void {
    this.collector.requestCounts.push(Date.now())
  }

  /**
   * Record error count
   */
  recordError(): void {
    this.collector.errorCounts.push(Date.now())
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.collector.cacheHits++
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.collector.cacheMisses++
  }

  /**
   * Record cache eviction
   */
  recordCacheEviction(): void {
    this.collector.cacheEvictions++
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const processingTimes = [...this.collector.processingTimes].sort((a, b) => a - b)
    const memoryReadings = [...this.collector.memoryReadings]
    
    const currentTime = Date.now()
    const oneSecondAgo = currentTime - 1000

    // Calculate throughput (events in last second)
    const recentRequests = this.collector.requestCounts.filter(t => t > oneSecondAgo)
    const recentErrors = this.collector.errorCounts.filter(t => t > oneSecondAgo)

    const metrics: PerformanceMetrics = {
      processingTime: {
        average: this.calculateAverage(processingTimes),
        median: this.calculatePercentile(processingTimes, 50),
        p95: this.calculatePercentile(processingTimes, 95),
        p99: this.calculatePercentile(processingTimes, 99)
      },
      memoryUsage: {
        current: this.getCurrentMemoryUsage(),
        peak: Math.max(...memoryReadings, 0),
        average: this.calculateAverage(memoryReadings)
      },
      throughput: {
        requestsPerSecond: recentRequests.length,
        eventsPerSecond: recentRequests.length, // Assuming 1:1 for now
        errorsPerSecond: recentErrors.length
      },
      cacheMetrics: {
        hitRate: this.calculateCacheHitRate(),
        missRate: this.calculateCacheMissRate(),
        size: this.collector.cacheHits + this.collector.cacheMisses,
        evictions: this.collector.cacheEvictions
      },
      health: this.calculateHealthMetrics()
    }

    return metrics
  }

  /**
   * Get optimization suggestions based on current metrics
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const metrics = this.getMetrics()
    const suggestions: OptimizationSuggestion[] = []

    // Memory optimization suggestions
    if (metrics.memoryUsage.current > 100 * 1024 * 1024) { // > 100MB
      suggestions.push({
        type: 'memory',
        impact: 'high',
        description: 'High memory usage detected',
        implementation: 'Implement aggressive cleanup of old events and reduce cache size',
        estimatedImprovement: '30-50% memory reduction'
      })
    }

    // Processing time optimization
    if (metrics.processingTime.average > 100) { // > 100ms
      suggestions.push({
        type: 'processing',
        impact: 'medium',
        description: 'Slow processing performance detected',
        implementation: 'Enable Web Worker processing and increase worker count',
        estimatedImprovement: '40-60% processing time reduction'
      })
    }

    // Cache optimization
    if (metrics.cacheMetrics.hitRate < 0.7) { // < 70% hit rate
      suggestions.push({
        type: 'caching',
        impact: 'medium',
        description: 'Low cache hit rate',
        implementation: 'Optimize cache key generation and increase cache size',
        estimatedImprovement: '20-30% performance improvement'
      })
    }

    // Batching suggestions
    if (metrics.throughput.requestsPerSecond > 50) {
      suggestions.push({
        type: 'batching',
        impact: 'high',
        description: 'High request volume detected',
        implementation: 'Implement request batching to reduce processing overhead',
        estimatedImprovement: '25-40% throughput improvement'
      })
    }

    // Error rate suggestions
    const errorRate = metrics.throughput.errorsPerSecond / Math.max(metrics.throughput.requestsPerSecond, 1)
    if (errorRate > 0.05) { // > 5% error rate
      suggestions.push({
        type: 'processing',
        impact: 'high',
        description: 'High error rate detected',
        implementation: 'Review error logs and implement better error handling',
        estimatedImprovement: 'Improved system reliability'
      })
    }

    return suggestions
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics()
    const suggestions = this.getOptimizationSuggestions()
    
    const report = `
# PixelTracer Performance Report
Generated: ${new Date().toISOString()}

## System Health: ${metrics.health.status.toUpperCase()}
Health Score: ${metrics.health.score}/100

## Processing Performance
- Average Processing Time: ${metrics.processingTime.average.toFixed(2)}ms
- 95th Percentile: ${metrics.processingTime.p95.toFixed(2)}ms
- 99th Percentile: ${metrics.processingTime.p99.toFixed(2)}ms

## Memory Usage
- Current: ${(metrics.memoryUsage.current / 1024 / 1024).toFixed(2)}MB
- Peak: ${(metrics.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB
- Average: ${(metrics.memoryUsage.average / 1024 / 1024).toFixed(2)}MB

## Throughput
- Requests/sec: ${metrics.throughput.requestsPerSecond}
- Events/sec: ${metrics.throughput.eventsPerSecond}
- Errors/sec: ${metrics.throughput.errorsPerSecond}

## Cache Performance
- Hit Rate: ${(metrics.cacheMetrics.hitRate * 100).toFixed(1)}%
- Miss Rate: ${(metrics.cacheMetrics.missRate * 100).toFixed(1)}%
- Evictions: ${metrics.cacheMetrics.evictions}

## Issues Detected
${metrics.health.issues.map(issue => `- [${issue.severity.toUpperCase()}] ${issue.message}`).join('\n')}

## Optimization Suggestions
${suggestions.map(s => `- [${s.impact.toUpperCase()} IMPACT] ${s.description}\n  Implementation: ${s.implementation}\n  Expected: ${s.estimatedImprovement}`).join('\n\n')}
`

    return report.trim()
  }

  /**
   * Export metrics data for analysis
   */
  exportMetricsData(): {
    processingTimes: number[]
    memoryReadings: number[]
    cacheStats: { hits: number; misses: number; evictions: number }
    timeRange: { start: number; end: number }
  } {
    return {
      processingTimes: [...this.collector.processingTimes],
      memoryReadings: [...this.collector.memoryReadings],
      cacheStats: {
        hits: this.collector.cacheHits,
        misses: this.collector.cacheMisses,
        evictions: this.collector.cacheEvictions
      },
      timeRange: {
        start: this.collector.startTime,
        end: Date.now()
      }
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.collector = {
      processingTimes: [],
      memoryReadings: [],
      requestCounts: [],
      errorCounts: [],
      cacheHits: 0,
      cacheMisses: 0,
      cacheEvictions: 0,
      startTime: Date.now(),
      lastCleanup: Date.now()
    }
  }

  // Private helper methods

  private collectMetrics(): void {
    // Collect current memory usage
    const memoryUsage = this.getCurrentMemoryUsage()
    if (memoryUsage > 0) {
      this.recordMemoryUsage(memoryUsage)
    }
  }

  private performCleanup(): void {
    const now = Date.now()
    if (now - this.collector.lastCleanup < this.CLEANUP_INTERVAL) return

    // Clean up old timestamp data (older than 1 minute)
    const oneMinuteAgo = now - 60000
    this.collector.requestCounts = this.collector.requestCounts.filter(t => t > oneMinuteAgo)
    this.collector.errorCounts = this.collector.errorCounts.filter(t => t > oneMinuteAgo)
    
    this.collector.lastCleanup = now
  }

  private trimArray(arr: number[]): void {
    if (arr.length > this.MAX_SAMPLES) {
      arr.splice(0, arr.length - this.MAX_SAMPLES)
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  }

  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1
    return sortedNumbers[Math.min(index, sortedNumbers.length - 1)]
  }

  private getCurrentMemoryUsage(): number {
    // Try to get memory usage from performance API
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize || 0
    }
    
    // Fallback estimation based on collected data
    return this.collector.processingTimes.length * 1000 + // Rough estimate
           this.collector.memoryReadings.length * 8 +
           this.collector.requestCounts.length * 8
  }

  private calculateCacheHitRate(): number {
    const total = this.collector.cacheHits + this.collector.cacheMisses
    return total > 0 ? this.collector.cacheHits / total : 0
  }

  private calculateCacheMissRate(): number {
    const total = this.collector.cacheHits + this.collector.cacheMisses
    return total > 0 ? this.collector.cacheMisses / total : 0
  }

  private calculateHealthMetrics(): PerformanceMetrics['health'] {
    const issues: PerformanceIssue[] = []
    let healthScore = 100

    // Check processing time
    const avgProcessingTime = this.calculateAverage(this.collector.processingTimes)
    if (avgProcessingTime > 200) {
      issues.push({
        severity: 'high',
        category: 'processing',
        message: `Slow processing detected (${avgProcessingTime.toFixed(0)}ms average)`,
        recommendation: 'Enable Web Worker processing or optimize provider logic',
        timestamp: Date.now()
      })
      healthScore -= 30
    } else if (avgProcessingTime > 100) {
      issues.push({
        severity: 'medium',
        category: 'processing',
        message: `Elevated processing time (${avgProcessingTime.toFixed(0)}ms average)`,
        recommendation: 'Consider performance optimizations',
        timestamp: Date.now()
      })
      healthScore -= 15
    }

    // Check memory usage
    const currentMemory = this.getCurrentMemoryUsage()
    if (currentMemory > 200 * 1024 * 1024) { // > 200MB
      issues.push({
        severity: 'critical',
        category: 'memory',
        message: `Very high memory usage (${(currentMemory / 1024 / 1024).toFixed(0)}MB)`,
        recommendation: 'Implement aggressive cleanup and reduce cache size',
        timestamp: Date.now()
      })
      healthScore -= 40
    } else if (currentMemory > 100 * 1024 * 1024) { // > 100MB
      issues.push({
        severity: 'medium',
        category: 'memory',
        message: `High memory usage (${(currentMemory / 1024 / 1024).toFixed(0)}MB)`,
        recommendation: 'Monitor memory usage and consider cleanup',
        timestamp: Date.now()
      })
      healthScore -= 20
    }

    // Check error rate
    const recentErrors = this.collector.errorCounts.filter(t => t > Date.now() - 60000)
    const recentRequests = this.collector.requestCounts.filter(t => t > Date.now() - 60000)
    const errorRate = recentRequests.length > 0 ? recentErrors.length / recentRequests.length : 0
    
    if (errorRate > 0.1) { // > 10%
      issues.push({
        severity: 'critical',
        category: 'errors',
        message: `Very high error rate (${(errorRate * 100).toFixed(1)}%)`,
        recommendation: 'Review error logs and fix underlying issues',
        timestamp: Date.now()
      })
      healthScore -= 35
    } else if (errorRate > 0.05) { // > 5%
      issues.push({
        severity: 'high',
        category: 'errors',
        message: `High error rate (${(errorRate * 100).toFixed(1)}%)`,
        recommendation: 'Investigate and fix error causes',
        timestamp: Date.now()
      })
      healthScore -= 20
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical'
    if (healthScore >= 80) {
      status = 'healthy'
    } else if (healthScore >= 50) {
      status = 'degraded'
    } else {
      status = 'critical'
    }

    return {
      status,
      score: Math.max(0, healthScore),
      issues
    }
  }
}