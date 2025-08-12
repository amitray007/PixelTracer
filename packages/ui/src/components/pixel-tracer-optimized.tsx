import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { EventList } from "./event-list"
import { EventCard } from "./event-card"
import { FilterPanel } from "./filter-panel"
import { KeyboardShortcuts } from "./keyboard-shortcuts"
import { PerformanceDashboard } from "./performance-dashboard"
import { MemoryIndicator } from "./memory-indicator"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { cn } from "../utils"
import { 
  Play, 
  Pause, 
  Download, 
  Filter, 
  Keyboard, 
  Settings,
} from "lucide-react"

// Performance optimized hooks
import { useVirtualScroll } from "../hooks/use-virtual-scroll"
import { useEventFilters } from "../hooks/use-event-filters"
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation"
import { useEventExport } from "../hooks/use-event-export"
import { useMemoryManagement } from "../hooks/use-memory-management"
import { usePerformanceMonitor, usePerformanceProfiler } from "../hooks/use-performance-monitor"

// Optimized state management
import {
  useEvents,
  useSelectedEvent,
  useSelectedEventId,
  useIsTracking,
  useCompactMode,
  useFilterVisible,
  useKeyboardShortcutsVisible,
  usePerformanceMetrics,
  usePerformanceStats,
  useEventActions,
  useUIActions
} from "../store/performance-store"

export interface PixelTracerOptimizedProps extends React.HTMLAttributes<HTMLDivElement> {
  // Event data
  initialEvents?: TrackingEvent[]
  onEventReceived?: (event: TrackingEvent) => void
  
  // UI configuration  
  showPerformanceDashboard?: boolean
  showMemoryIndicator?: boolean
  enableVirtualScrolling?: boolean
  
  // Performance settings
  maxEvents?: number
  memoryThreshold?: number
  autoOptimize?: boolean
  
  // Callbacks
  onTrackingToggle?: (tracking: boolean) => void
  onSettingsOpen?: () => void
}

const PixelTracerOptimized = React.memo(React.forwardRef<HTMLDivElement, PixelTracerOptimizedProps>(
  ({ 
    className,
    initialEvents = [],
    onEventReceived,
    showPerformanceDashboard = true,
    showMemoryIndicator = true,
    enableVirtualScrolling = true,
    maxEvents = 1000,
    memoryThreshold = 100 * 1024 * 1024, // 100MB
    autoOptimize = true,
    onTrackingToggle,
    onSettingsOpen,
    ...props 
  }, ref) => {
    // State management
    const events = useEvents()
    const selectedEvent = useSelectedEvent()
    const selectedEventId = useSelectedEventId()
    const isTracking = useIsTracking()
    const compactMode = useCompactMode()
    const filterVisible = useFilterVisible()
    const keyboardShortcutsVisible = useKeyboardShortcutsVisible()
    const performanceMetrics = usePerformanceMetrics()
    const performanceStats = usePerformanceStats()
    
    const { addEvent, selectEvent, clearEvents } = useEventActions()
    const { setTracking, setFilterVisible, setKeyboardShortcutsVisible } = useUIActions()

    // Performance monitoring
    const { onRender } = usePerformanceProfiler('PixelTracerOptimized')
    const { getCurrentMemoryUsage, performMemoryOptimization } = useMemoryManagement({
      enabled: autoOptimize,
      maxMemoryUsage: memoryThreshold
    })
    
    usePerformanceMonitor({
      enabled: true,
      trackRenders: true,
      trackInteractions: true,
      trackMemory: true
    })

    // Event filtering
    const { 
      filteredEvents, 
      filters, 
      updateFilters, 
      stats: filterStats
    } = useEventFilters(events)

    // Virtual scrolling for performance
    const {
      virtualItems,
      scrollElementProps,
      containerProps
    } = useVirtualScroll({
      itemHeight: compactMode ? 80 : 120,
      containerHeight: 600,
      overscan: 5,
      itemCount: filteredEvents.length
    })

    // Export functionality
    const { exportEvents, copyToClipboard } = useEventExport()

    // Keyboard navigation
    const {
      showShortcuts,
      setShowShortcuts
    } = useKeyboardNavigation({
      onArrowUp: React.useCallback(() => {
        const currentIndex = filteredEvents.findIndex(e => e.id === selectedEventId)
        const prevIndex = Math.max(0, currentIndex - 1)
        if (filteredEvents[prevIndex]) {
          selectEvent(filteredEvents[prevIndex].id)
        }
      }, [filteredEvents, selectedEventId, selectEvent]),
      
      onArrowDown: React.useCallback(() => {
        const currentIndex = filteredEvents.findIndex(e => e.id === selectedEventId)
        const nextIndex = Math.min(filteredEvents.length - 1, currentIndex + 1)
        if (filteredEvents[nextIndex]) {
          selectEvent(filteredEvents[nextIndex].id)
        }
      }, [filteredEvents, selectedEventId, selectEvent]),
      
      onCopy: React.useCallback(() => {
        if (selectedEvent) {
          copyToClipboard([selectedEvent], 'json')
        }
      }, [selectedEvent, copyToClipboard]),
      
      onExport: React.useCallback(() => {
        exportEvents(filteredEvents, { format: 'json' })
      }, [filteredEvents, exportEvents]),
      
      onClear: React.useCallback(() => {
        clearEvents()
      }, [clearEvents]),
      
      onToggleTracking: React.useCallback(() => {
        const newTracking = !isTracking
        setTracking(newTracking)
        onTrackingToggle?.(newTracking)
      }, [isTracking, setTracking, onTrackingToggle]),
      
      enabled: true
    })

    // Memory usage calculation
    const memoryUsage = React.useMemo(() => {
      const usage = getCurrentMemoryUsage()
      return usage.used
    }, [getCurrentMemoryUsage])

    // Initialize events
    React.useEffect(() => {
      if (initialEvents.length > 0) {
        initialEvents.forEach(event => addEvent(event))
      }
    }, [initialEvents, addEvent])

    // Handle new events
    React.useEffect(() => {
      if (onEventReceived && selectedEvent) {
        onEventReceived(selectedEvent)
      }
    }, [selectedEvent, onEventReceived])

    // Memoized handlers
    const handleTrackingToggle = React.useCallback(() => {
      const newTracking = !isTracking
      setTracking(newTracking)
      onTrackingToggle?.(newTracking)
    }, [isTracking, setTracking, onTrackingToggle])

    const handleExportClick = React.useCallback(() => {
      exportEvents(filteredEvents, { format: 'json' })
    }, [filteredEvents, exportEvents])


    const handleMemoryOptimize = React.useCallback(() => {
      performMemoryOptimization()
    }, [performMemoryOptimization])

    // Memoized event list component
    const eventListComponent = React.useMemo(() => {
      if (enableVirtualScrolling && filteredEvents.length > 100) {
        // Use virtual scrolling for large datasets
        return (
          <div {...scrollElementProps} className="h-full">
            <div {...containerProps}>
              {virtualItems.map((virtualItem) => {
                const event = filteredEvents[virtualItem.index]
                if (!event) return null
                
                return (
                  <div
                    key={event.id}
                    style={{
                      position: 'absolute',
                      top: virtualItem.start,
                      left: 0,
                      width: '100%',
                      height: virtualItem.size
                    }}
                  >
                    <EventCard
                      event={event}
                      compact={compactMode}
                      onSelect={(event) => selectEvent(event.id)}
                      className={cn(
                        selectedEventId === event.id && "ring-2 ring-primary"
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      }
      
      // Use regular event list for smaller datasets
      return (
        <EventList
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onEventSelect={(event) => selectEvent(event.id)}
          compact={compactMode}
        />
      )
    }, [
      enableVirtualScrolling,
      filteredEvents,
      virtualItems,
      scrollElementProps,
      containerProps,
      compactMode,
      selectedEvent,
      selectedEventId,
      selectEvent
    ])

    return (
      <React.Profiler id="PixelTracerOptimized" onRender={onRender}>
        <div ref={ref} className={cn("w-full h-full flex flex-col", className)} {...props}>
          {/* Header with controls */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">PixelTracer</CardTitle>
                  <Badge variant={isTracking ? "success" : "secondary"}>
                    {isTracking ? "Tracking" : "Paused"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {filteredEvents.length} events
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Memory indicator */}
                  {showMemoryIndicator && (
                    <MemoryIndicator
                      currentUsage={memoryUsage}
                      compact
                      onOptimize={handleMemoryOptimize}
                    />
                  )}
                  
                  {/* Controls */}
                  <Button
                    variant={isTracking ? "secondary" : "default"}
                    size="sm"
                    onClick={handleTrackingToggle}
                  >
                    {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterVisible(!filterVisible)}
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportClick}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShortcuts(!showShortcuts)}
                  >
                    <Keyboard className="w-4 h-4" />
                  </Button>
                  
                  {onSettingsOpen && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSettingsOpen}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Main content */}
          <div className="flex-1 flex gap-4">
            {/* Sidebar */}
            <div className="w-80 space-y-4">
              {/* Filter panel */}
              {filterVisible && (
                <FilterPanel
                  events={events}
                  filters={filters}
                  onFiltersChange={updateFilters}
                  stats={filterStats}
                />
              )}
              
              {/* Performance dashboard */}
              {showPerformanceDashboard && (
                <PerformanceDashboard
                  metrics={performanceMetrics}
                  stats={performanceStats}
                  onOptimizeMemory={handleMemoryOptimize}
                  compact
                />
              )}
            </div>

            {/* Event list */}
            <Card className="flex-1">
              <CardContent className="p-0 h-full">
                {eventListComponent}
              </CardContent>
            </Card>
          </div>

          {/* Dialogs */}
          {keyboardShortcutsVisible && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <KeyboardShortcuts onClose={() => setKeyboardShortcutsVisible(false)} />
            </div>
          )}
          
          {showShortcuts && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
            </div>
          )}
        </div>
      </React.Profiler>
    )
  }
), (prevProps, nextProps) => {
  // Optimized comparison for React.memo
  return (
    prevProps.maxEvents === nextProps.maxEvents &&
    prevProps.memoryThreshold === nextProps.memoryThreshold &&
    prevProps.autoOptimize === nextProps.autoOptimize &&
    prevProps.showPerformanceDashboard === nextProps.showPerformanceDashboard &&
    prevProps.showMemoryIndicator === nextProps.showMemoryIndicator &&
    prevProps.enableVirtualScrolling === nextProps.enableVirtualScrolling &&
    prevProps.className === nextProps.className
  )
})

PixelTracerOptimized.displayName = "PixelTracerOptimized"

export { PixelTracerOptimized }