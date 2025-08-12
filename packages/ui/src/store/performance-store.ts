import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { TrackingEvent } from '@pixeltracer/shared'
import { PerformanceMetrics, PerformanceStats } from '../components/performance-dashboard'

interface PerformanceState {
  // Performance metrics
  metrics: PerformanceMetrics[]
  stats: PerformanceStats
  
  // Event management
  events: TrackingEvent[]
  selectedEventId: string | null
  
  // UI state
  isTracking: boolean
  compactMode: boolean
  filterVisible: boolean
  keyboardShortcutsVisible: boolean
  
  // Memory management
  memoryThreshold: number
  autoOptimize: boolean
  maxEventHistory: number
  
  // Performance tracking
  lastOptimizationTime: number
  renderCount: number
  
  // Actions
  addMetric: (metric: PerformanceMetrics) => void
  updateStats: (stats: Partial<PerformanceStats>) => void
  
  addEvent: (event: TrackingEvent) => void
  addEvents: (events: TrackingEvent[]) => void
  clearEvents: () => void
  removeOldEvents: (maxAge: number) => void
  selectEvent: (eventId: string | null) => void
  
  setTracking: (tracking: boolean) => void
  setCompactMode: (compact: boolean) => void
  setFilterVisible: (visible: boolean) => void
  setKeyboardShortcutsVisible: (visible: boolean) => void
  
  optimizeMemory: () => void
  setMemoryThreshold: (threshold: number) => void
  setAutoOptimize: (auto: boolean) => void
  setMaxEventHistory: (max: number) => void
  
  incrementRenderCount: () => void
  resetRenderCount: () => void
}

export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      metrics: [],
      stats: {
        avgProcessingTime: 0,
        maxProcessingTime: 0,
        avgMemoryUsage: 0,
        maxMemoryUsage: 0,
        totalEvents: 0,
        totalErrors: 0,
        errorRate: 0,
        uptime: 0
      },
      
      events: [],
      selectedEventId: null,
      
      isTracking: true,
      compactMode: false,
      filterVisible: false,
      keyboardShortcutsVisible: false,
      
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      autoOptimize: true,
      maxEventHistory: 1000,
      
      lastOptimizationTime: 0,
      renderCount: 0,
      
      // Performance metrics
      addMetric: (metric) => 
        set((state) => {
          const newMetrics = [...state.metrics, metric].slice(-50); // Keep last 50 metrics
          return { metrics: newMetrics };
        }),
        
      updateStats: (newStats) =>
        set((state) => ({
          stats: { ...state.stats, ...newStats }
        })),
      
      // Event management
      addEvent: (event) =>
        set((state) => {
          const events = [event, ...state.events];
          
          // Limit events for performance
          if (events.length > state.maxEventHistory) {
            events.splice(state.maxEventHistory);
          }
          
          // Auto-optimize if memory threshold reached and auto-optimize enabled
          const estimatedMemory = events.length * 1024; // Rough estimation
          if (state.autoOptimize && estimatedMemory > state.memoryThreshold) {
            setTimeout(() => get().optimizeMemory(), 0);
          }
          
          return { 
            events,
            stats: {
              ...state.stats,
              totalEvents: state.stats.totalEvents + 1
            }
          };
        }),
      
      addEvents: (newEvents) =>
        set((state) => {
          const events = [...newEvents, ...state.events];
          
          // Limit events for performance
          if (events.length > state.maxEventHistory) {
            events.splice(state.maxEventHistory);
          }
          
          return { 
            events,
            stats: {
              ...state.stats,
              totalEvents: state.stats.totalEvents + newEvents.length
            }
          };
        }),
      
      clearEvents: () =>
        set((state) => ({
          events: [],
          selectedEventId: null,
          stats: {
            ...state.stats,
            totalEvents: 0
          }
        })),
      
      removeOldEvents: (maxAge) =>
        set((state) => {
          const cutoffTime = Date.now() - maxAge;
          const events = state.events.filter(event => event.timestamp > cutoffTime);
          
          return { 
            events,
            selectedEventId: events.some(e => e.id === state.selectedEventId) 
              ? state.selectedEventId 
              : null
          };
        }),
      
      selectEvent: (eventId) =>
        set({ selectedEventId: eventId }),
      
      // UI state
      setTracking: (tracking) =>
        set({ isTracking: tracking }),
      
      setCompactMode: (compact) =>
        set({ compactMode: compact }),
      
      setFilterVisible: (visible) =>
        set({ filterVisible: visible }),
        
      setKeyboardShortcutsVisible: (visible) =>
        set({ keyboardShortcutsVisible: visible }),
      
      // Memory management
      optimizeMemory: () =>
        set((state) => {
          const now = Date.now();
          
          // Remove events older than 1 hour
          const oneHour = 60 * 60 * 1000;
          const events = state.events.filter(event => 
            now - event.timestamp < oneHour
          );
          
          // Clear old metrics
          const metrics = state.metrics.slice(-20); // Keep only last 20 metrics
          
          return {
            events,
            metrics,
            selectedEventId: events.some(e => e.id === state.selectedEventId) 
              ? state.selectedEventId 
              : null,
            lastOptimizationTime: now
          };
        }),
      
      setMemoryThreshold: (threshold) =>
        set({ memoryThreshold: threshold }),
        
      setAutoOptimize: (auto) =>
        set({ autoOptimize: auto }),
        
      setMaxEventHistory: (max) =>
        set({ maxEventHistory: max }),
      
      // Performance tracking
      incrementRenderCount: () =>
        set((state) => ({ 
          renderCount: state.renderCount + 1 
        })),
        
      resetRenderCount: () =>
        set({ renderCount: 0 })
    }),
    {
      name: 'pixeltracer-performance-store'
    }
  )
)

// Selectors for optimal performance
export const useEvents = () => usePerformanceStore(state => state.events)
export const useSelectedEvent = () => usePerformanceStore(state => 
  state.events.find(e => e.id === state.selectedEventId)
)
export const useSelectedEventId = () => usePerformanceStore(state => state.selectedEventId)
export const useIsTracking = () => usePerformanceStore(state => state.isTracking)
export const useCompactMode = () => usePerformanceStore(state => state.compactMode)
export const useFilterVisible = () => usePerformanceStore(state => state.filterVisible)
export const useKeyboardShortcutsVisible = () => usePerformanceStore(state => state.keyboardShortcutsVisible)
export const usePerformanceMetrics = () => usePerformanceStore(state => state.metrics)
export const usePerformanceStats = () => usePerformanceStore(state => state.stats)

// Action selectors
export const useEventActions = () => usePerformanceStore(state => ({
  addEvent: state.addEvent,
  addEvents: state.addEvents,
  clearEvents: state.clearEvents,
  removeOldEvents: state.removeOldEvents,
  selectEvent: state.selectEvent
}))

export const useUIActions = () => usePerformanceStore(state => ({
  setTracking: state.setTracking,
  setCompactMode: state.setCompactMode,
  setFilterVisible: state.setFilterVisible,
  setKeyboardShortcutsVisible: state.setKeyboardShortcutsVisible
}))

export const usePerformanceActions = () => usePerformanceStore(state => ({
  addMetric: state.addMetric,
  updateStats: state.updateStats,
  optimizeMemory: state.optimizeMemory,
  incrementRenderCount: state.incrementRenderCount,
  resetRenderCount: state.resetRenderCount
}))