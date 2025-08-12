import { useEffect, useCallback, useRef } from 'react'
import { usePerformanceStore, usePerformanceActions } from '../store/performance-store'

export interface MemoryManagementOptions {
  enabled?: boolean
  checkInterval?: number
  maxMemoryUsage?: number
  gcThreshold?: number
  eventTTL?: number
  autoOptimize?: boolean
}

/**
 * Memory management hook for automatic cleanup and optimization
 * Monitors memory usage and automatically optimizes when thresholds are reached
 */
export function useMemoryManagement({
  enabled = true,
  checkInterval = 30000, // 30 seconds
  maxMemoryUsage = 100 * 1024 * 1024, // 100MB
  gcThreshold = 0.8, // 80% of max
  eventTTL = 3600000, // 1 hour
  autoOptimize = true
}: MemoryManagementOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastCleanupRef = useRef(0)
  const performanceObserverRef = useRef<PerformanceObserver>()
  
  const { events, stats, autoOptimize: storeAutoOptimize } = usePerformanceStore()
  const { optimizeMemory, addMetric, updateStats } = usePerformanceActions()

  // Get current memory usage estimate
  const getCurrentMemoryUsage = useCallback(() => {
    try {
      if ('memory' in performance) {
        const perfMemory = (performance as any).memory
        return {
          used: perfMemory.usedJSHeapSize || 0,
          total: perfMemory.totalJSHeapSize || 0,
          limit: perfMemory.jsHeapSizeLimit || 0
        }
      }
      
      // Fallback estimation based on events
      const eventEstimate = events.length * 1024 // Rough 1KB per event
      return {
        used: eventEstimate,
        total: eventEstimate,
        limit: maxMemoryUsage
      }
    } catch (error) {
      return {
        used: 0,
        total: 0,
        limit: maxMemoryUsage
      }
    }
  }, [events.length, maxMemoryUsage])

  // Check if memory cleanup is needed
  const shouldCleanup = useCallback((memoryUsage: ReturnType<typeof getCurrentMemoryUsage>) => {
    const usageRatio = memoryUsage.used / memoryUsage.limit
    const eventCount = events.length
    const timeSinceLastCleanup = Date.now() - lastCleanupRef.current
    
    return (
      usageRatio > gcThreshold ||
      eventCount > 1000 ||
      timeSinceLastCleanup > eventTTL
    )
  }, [events.length, gcThreshold, eventTTL])

  // Perform memory optimization
  const performMemoryOptimization = useCallback(() => {
    const startTime = performance.now()
    
    try {
      // Run store optimization
      optimizeMemory()
      
      // Force garbage collection if available (dev/test environments)
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc()
      }
      
      // Update last cleanup time
      lastCleanupRef.current = Date.now()
      
      const endTime = performance.now()
      const processingTime = endTime - startTime
      
      // Add performance metric
      const memoryUsage = getCurrentMemoryUsage()
      addMetric({
        memoryUsage: memoryUsage.used,
        eventCount: events.length,
        processingTime,
        errorCount: 0,
        timestamp: Date.now()
      })
      
      // Update stats
      updateStats({
        avgMemoryUsage: memoryUsage.used,
        maxMemoryUsage: Math.max(stats.maxMemoryUsage, memoryUsage.used)
      })
      
      // Memory optimization completed successfully
      
    } catch (error) {
      // Add error metric
      addMetric({
        memoryUsage: getCurrentMemoryUsage().used,
        eventCount: events.length,
        processingTime: 0,
        errorCount: 1,
        timestamp: Date.now()
      })
      
      updateStats({
        totalErrors: stats.totalErrors + 1,
        errorRate: (stats.totalErrors + 1) / Math.max(stats.totalEvents, 1)
      })
    }
  }, [
    optimizeMemory,
    getCurrentMemoryUsage,
    events.length,
    addMetric,
    updateStats,
    stats.maxMemoryUsage,
    stats.totalErrors,
    stats.totalEvents
  ])

  // Memory monitoring loop
  const checkMemoryUsage = useCallback(() => {
    if (!enabled) return
    
    const memoryUsage = getCurrentMemoryUsage()
    const needsCleanup = shouldCleanup(memoryUsage)
    
    if (needsCleanup && (storeAutoOptimize || autoOptimize)) {
      performMemoryOptimization()
    }
    
    // Update performance stats
    updateStats({
      avgMemoryUsage: memoryUsage.used,
      maxMemoryUsage: Math.max(stats.maxMemoryUsage, memoryUsage.used)
    })
    
  }, [
    enabled,
    getCurrentMemoryUsage,
    shouldCleanup,
    storeAutoOptimize,
    autoOptimize,
    performMemoryOptimization,
    updateStats,
    stats.maxMemoryUsage
  ])

  // Setup performance observer for memory monitoring
  useEffect(() => {
    if (!enabled) return

    try {
      // Setup performance observer for memory measurements
      if ('PerformanceObserver' in window && 'memory' in performance) {
        performanceObserverRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          
          entries.forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.includes('memory')) {
              const memoryUsage = getCurrentMemoryUsage()
              
              addMetric({
                memoryUsage: memoryUsage.used,
                eventCount: events.length,
                processingTime: entry.duration,
                errorCount: 0,
                timestamp: entry.startTime
              })
            }
          })
        })
        
        performanceObserverRef.current.observe({ 
          entryTypes: ['measure', 'navigation', 'resource'] 
        })
      }
    } catch (error) {
      // Performance observer setup failed
    }

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect()
        performanceObserverRef.current = undefined
      }
    }
  }, [enabled, getCurrentMemoryUsage, addMetric, events.length])

  // Setup memory monitoring interval
  useEffect(() => {
    if (!enabled) return

    intervalRef.current = setInterval(checkMemoryUsage, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = undefined
      }
    }
  }, [enabled, checkMemoryUsage, checkInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect()
      }
    }
  }, [])

  return {
    getCurrentMemoryUsage,
    performMemoryOptimization,
    checkMemoryUsage,
    isEnabled: enabled
  }
}

/**
 * Hook for manual memory management controls
 */
export function useMemoryControls() {
  const { optimizeMemory } = usePerformanceActions()
  const getCurrentMemoryUsage = useCallback(() => {
    try {
      if ('memory' in performance) {
        const perfMemory = (performance as any).memory
        return {
          used: perfMemory.usedJSHeapSize || 0,
          total: perfMemory.totalJSHeapSize || 0,
          limit: perfMemory.jsHeapSizeLimit || 0
        }
      }
      return { used: 0, total: 0, limit: 0 }
    } catch {
      return { used: 0, total: 0, limit: 0 }
    }
  }, [])

  const forceGarbageCollection = useCallback(() => {
    try {
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc()
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  return {
    optimizeMemory,
    getCurrentMemoryUsage,
    forceGarbageCollection
  }
}