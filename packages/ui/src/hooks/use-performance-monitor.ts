import { useEffect, useCallback, useRef, useState } from 'react'
import { usePerformanceActions, usePerformanceStats } from '../store/performance-store'

export interface PerformanceMonitorOptions {
  enabled?: boolean
  sampleRate?: number
  trackRenders?: boolean
  trackInteractions?: boolean
  trackMemory?: boolean
  reportThreshold?: number
}

interface RenderMetrics {
  componentName: string
  renderTime: number
  renderCount: number
  isUpdate: boolean
  timestamp: number
}

interface InteractionMetrics {
  type: string
  target: string
  duration: number
  timestamp: number
}

/**
 * Performance monitoring hook that tracks React rendering, user interactions,
 * and system performance metrics for PixelTracer optimization
 */
export function usePerformanceMonitor({
  enabled = true,
  sampleRate = 0.1, // 10% sampling
  trackRenders = true,
  trackInteractions = true,
  trackMemory = true,
  reportThreshold = 16.67 // 60fps threshold (1000ms / 60fps)
}: PerformanceMonitorOptions = {}) {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const renderMetricsRef = useRef<RenderMetrics[]>([])
  const interactionMetricsRef = useRef<InteractionMetrics[]>([])
  const frameIdRef = useRef<number>()
  const lastReportTimeRef = useRef(0)
  
  const { addMetric, updateStats } = usePerformanceActions()
  const stats = usePerformanceStats()

  // Sample decision - only collect metrics for a percentage of operations
  const shouldSample = useCallback(() => {
    return Math.random() < sampleRate
  }, [sampleRate])

  // Report performance metrics
  const reportMetrics = useCallback(() => {
    const now = Date.now()
    
    // Aggregate render metrics
    const renderMetrics = renderMetricsRef.current
    if (renderMetrics.length > 0) {
      const avgRenderTime = renderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / renderMetrics.length
      
      // Update performance stats
      updateStats({
        avgProcessingTime: avgRenderTime,
        maxProcessingTime: Math.max(stats.maxProcessingTime, Math.max(...renderMetrics.map(m => m.renderTime)))
      })
      
      // Clear metrics
      renderMetricsRef.current = []
    }
    
    // Aggregate interaction metrics
    const interactionMetrics = interactionMetricsRef.current
    if (interactionMetrics.length > 0) {
      // Clear metrics
      interactionMetricsRef.current = []
    }
    
    // Add overall performance metric
    if (trackMemory && 'memory' in performance) {
      const memoryInfo = (performance as any).memory
      
      addMetric({
        memoryUsage: memoryInfo.usedJSHeapSize || 0,
        eventCount: stats.totalEvents,
        processingTime: renderMetrics.length > 0 
          ? renderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / renderMetrics.length 
          : 0,
        errorCount: 0,
        timestamp: now
      })
    }
    
    lastReportTimeRef.current = now
  }, [addMetric, updateStats, stats, trackMemory, reportThreshold])

  // Track React component renders
  const trackRender = useCallback((componentName: string, actualDuration: number, _baseDuration: number, startTime: number, isUpdate: boolean) => {
    if (!enabled || !trackRenders || !shouldSample()) return
    
    renderMetricsRef.current.push({
      componentName,
      renderTime: actualDuration,
      renderCount: 1,
      isUpdate,
      timestamp: startTime
    })
    
    // Report if we have enough samples or enough time has passed
    const now = performance.now()
    if (renderMetricsRef.current.length >= 10 || now - lastReportTimeRef.current > 5000) {
      reportMetrics()
    }
  }, [enabled, trackRenders, shouldSample, reportMetrics])

  // Track user interactions
  const trackInteraction = useCallback((type: string, target: string, duration: number) => {
    if (!enabled || !trackInteractions || !shouldSample()) return
    
    interactionMetricsRef.current.push({
      type,
      target,
      duration,
      timestamp: Date.now()
    })
    
    // Note: Console logging removed for production
  }, [enabled, trackInteractions, shouldSample])

  // Monitor frame rate
  const monitorFrameRate = useCallback(() => {
    if (!enabled) return
    
    let frameCount = 0
    let lastTime = performance.now()
    
    const countFrame = (currentTime: number) => {
      frameCount++
      
      if (currentTime - lastTime >= 1000) { // Every second
        frameCount = 0
        lastTime = currentTime
      }
      
      frameIdRef.current = requestAnimationFrame(countFrame)
    }
    
    frameIdRef.current = requestAnimationFrame(countFrame)
  }, [enabled])

  // Setup performance monitoring
  useEffect(() => {
    if (!enabled) return
    
    setIsMonitoring(true)
    
    // Monitor frame rate
    monitorFrameRate()
    
    // Setup interaction monitoring
    const handleInteraction = (event: Event) => {
      const startTime = performance.now()
      
      // Track interaction timing
      const trackTiming = () => {
        const duration = performance.now() - startTime
        trackInteraction(event.type, (event.target as Element)?.tagName || 'unknown', duration)
      }
      
      // Track on next frame to capture full interaction time
      requestAnimationFrame(trackTiming)
    }
    
    if (trackInteractions) {
      const interactionEvents = ['click', 'keydown', 'scroll', 'input']
      interactionEvents.forEach(eventType => {
        document.addEventListener(eventType, handleInteraction, { passive: true })
      })
      
      return () => {
        interactionEvents.forEach(eventType => {
          document.removeEventListener(eventType, handleInteraction)
        })
      }
    }
    
    return () => {
      setIsMonitoring(false)
      
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [enabled, trackInteractions, trackInteraction, monitorFrameRate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [])

  // Regular reporting interval
  useEffect(() => {
    if (!enabled) return
    
    const interval = setInterval(() => {
      reportMetrics()
    }, 10000) // Report every 10 seconds
    
    return () => clearInterval(interval)
  }, [enabled, reportMetrics])

  return {
    isMonitoring,
    trackRender,
    trackInteraction,
    reportMetrics
  }
}

/**
 * Hook for creating a performance profiler wrapper
 */
export function usePerformanceProfiler(componentName: string) {
  const { trackRender } = usePerformanceMonitor()
  
  const onRender = useCallback((
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    _baseDuration: number,
    startTime: number
  ) => {
    trackRender(componentName || id, actualDuration, _baseDuration, startTime, phase === 'update')
  }, [trackRender, componentName])
  
  return { onRender }
}

/**
 * Hook for measuring specific operations
 */
export function usePerformanceMeasure() {
  const measureStart = useCallback((markName: string) => {
    performance.mark(`${markName}-start`)
  }, [])
  
  const measureEnd = useCallback((markName: string, measureName?: string) => {
    const endMark = `${markName}-end`
    const startMark = `${markName}-start`
    const measure = measureName || markName
    
    performance.mark(endMark)
    performance.measure(measure, startMark, endMark)
    
    // Get the measurement
    const entries = performance.getEntriesByName(measure, 'measure')
    const entry = entries[entries.length - 1]
    
    // Note: Console logging removed for production
    
    // Clean up marks
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
    performance.clearMeasures(measure)
    
    return entry?.duration || 0
  }, [])
  
  return { measureStart, measureEnd }
}