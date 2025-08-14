/**
 * Real-time Tracking Dashboard
 * 
 * Advanced dashboard that showcases all backend capabilities:
 * - Live event tracking with real-time updates
 * - Provider analytics and statistics
 * - Performance monitoring with charts
 * - Advanced filtering and search
 * - Revenue analytics and business insights
 */

import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
// ScrollArea removed - using native scrolling
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { EventTable } from "./event-table"
import { EventDetailsEnhanced } from "./event-details-enhanced"
import { ErrorBoundary } from "./error-boundary"
import { cn } from "../utils"
import { ProviderIcon } from "./provider-icon"
import {
  Globe,
  Search,
  Clock,
  Play,
  Pause,
  Trash2,
  Filter,
  ArrowUpDown,
  Moon,
  Sun,
  Check,
  History,
  RotateCcw
} from "lucide-react"

export interface ProviderStats {
  providerId: string
  providerName: string
  eventCount: number
  avgConfidence: number
  lastSeen: number
}

export interface DashboardMetrics {
  totalEvents: number
  activeProviders: number
  avgProcessingTime: number
  memoryUsage: number
  errorRate: number
  uptime: number
}

export interface RealTimeDashboardProps {
  events: TrackingEvent[]
  selectedEvent?: TrackingEvent
  isTracking: boolean
  persistEventsAcrossPages?: boolean
  currentTab?: chrome.tabs.Tab
  onEventSelect: (event: TrackingEvent) => void
  onToggleTracking: () => void
  onTogglePersistence?: () => void
  onClearEvents: () => void
  onExportData: () => void
  onApplyFilters: (filters: any) => void
  className?: string
}

const RealTimeDashboard = React.forwardRef<HTMLDivElement, RealTimeDashboardProps>(
  ({
    className,
    events = [],
    selectedEvent,
    isTracking,
    persistEventsAcrossPages = true,
    currentTab,
    onEventSelect,
    onToggleTracking,
    onTogglePersistence,
    onClearEvents,
    onExportData,
    onApplyFilters,
    ...props
  }, ref) => {
    const [searchQuery, setSearchQuery] = React.useState('')
    const [selectedProvider, setSelectedProvider] = React.useState<string>('')
    const [showFiltersModal, setShowFiltersModal] = React.useState(false)
    const [showInlineSearch, setShowInlineSearch] = React.useState(false)
    const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest'>('newest')
    const [darkMode, setDarkMode] = React.useState(false)

    // Initialize dark mode from localStorage on component mount
    React.useEffect(() => {
      const savedDarkMode = localStorage.getItem('pixeltracer-dark-mode')
      if (savedDarkMode !== null) {
        setDarkMode(savedDarkMode === 'true')
      } else {
        // Fallback to system preference
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
        setDarkMode(systemDarkMode)
        localStorage.setItem('pixeltracer-dark-mode', String(systemDarkMode))
      }
    }, [])



    // Get unique providers for filter dropdown
    const uniqueProviders = React.useMemo(() => {
      const providerMap = new Map()
      events.forEach(event => {
        if (!providerMap.has(event.provider)) {
          providerMap.set(event.provider, {
            id: event.provider,
            name: event.providerName || event.provider,
            count: 0
          })
        }
        providerMap.get(event.provider).count++
      })
      return Array.from(providerMap.values()).sort((a, b) => b.count - a.count)
    }, [events])


    // Filter and sort events based on search, provider, and timestamp
    const filteredEvents = React.useMemo(() => {
      let filtered = events.filter(event => {
        if (selectedProvider && event.provider !== selectedProvider) return false
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          return event.url.toLowerCase().includes(query) ||
                 event.providerName.toLowerCase().includes(query) ||
                 event.eventType?.toLowerCase().includes(query) ||
                 JSON.stringify(event.parameters || {}).toLowerCase().includes(query)
        }
        return true
      })
      
      // Sort by timestamp
      return filtered.sort((a, b) => {
        return sortOrder === 'newest' 
          ? b.timestamp - a.timestamp 
          : a.timestamp - b.timestamp
      })
    }, [events, selectedProvider, searchQuery, sortOrder])

    // Dark mode toggle handler
    const toggleDarkMode = React.useCallback(() => {
      const newDarkMode = !darkMode
      setDarkMode(newDarkMode)
      localStorage.setItem('pixeltracer-dark-mode', String(newDarkMode))
      
      // Apply dark mode to document
      if (newDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }, [darkMode])

    // Apply dark mode on mount
    React.useEffect(() => {
      if (darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }, [darkMode])

    // Check if any filters are active (excluding search since it's separate now)
    const hasActiveFilters = React.useMemo(() => {
      return selectedProvider !== '' || sortOrder !== 'newest'
    }, [selectedProvider, sortOrder])

    // Check if search is active
    const hasActiveSearch = React.useMemo(() => {
      return searchQuery.trim() !== ''
    }, [searchQuery])

    return (
      <div ref={ref} className={cn("flex flex-col h-full bg-background", className)} {...props}>
        {/* Enhanced Header with better alignment */}
        <div className="flex-shrink-0 px-6 pt-5 border-b bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl shadow-md overflow-hidden">
                <img 
                  src={typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getURL('assets/icons/icon48.png') : '/assets/icons/icon48.png'}
                  alt="PixelTracer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2",
                isTracking 
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800" 
                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isTracking ? "bg-green-500" : "bg-red-500",
                  isTracking && "live-indicator-pulse"
                )}></div>
                {isTracking ? 'Live' : 'Paused'}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleDarkMode}
                className="h-9 w-9 p-0 border-2 border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-all duration-200"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="sr-only">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearEvents}
                className="h-9 w-9 p-0 border-2 border-border/60 hover:border-red-400 hover:bg-red-50 hover:text-red-600 
                         dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Clear Events</span>
              </Button>
              
              {onTogglePersistence && (
                <Button 
                  variant={persistEventsAcrossPages ? "default" : "outline"} 
                  size="sm" 
                  onClick={onTogglePersistence}
                  className={cn(
                    "h-9 w-9 p-0 border-2 transition-all duration-200",
                    persistEventsAcrossPages 
                      ? "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-sm" 
                      : "border-border/60 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                  )}
                  title={persistEventsAcrossPages ? "Events persist across page navigation (History mode)" : "Events cleared on page navigation (Reset mode)"}
                >
                  {persistEventsAcrossPages ? (
                    <History className="w-4 h-4" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span className="sr-only">
                    {persistEventsAcrossPages ? 'Disable history mode' : 'Enable history mode'}
                  </span>
                </Button>
              )}
              
              <Button
                variant={isTracking ? "secondary" : "default"}
                size="sm"
                onClick={onToggleTracking}
                className="h-9 w-9 p-0 font-semibold transition-all duration-200 shadow-sm"
              >
                {isTracking ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span className="sr-only">{isTracking ? 'Pause' : 'Start'}</span>
              </Button>
            </div>
          </div>

          {/* Current tab info - enhanced layout */}
          {currentTab && (
            <div className="mb-3 p-3 bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl border border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Site</p>
                  <p className="text-sm font-semibold text-foreground font-mono">
                    {currentTab.url ? new URL(currentTab.url).hostname : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feature Tabs */}
          <div className="space-y-3 mb-3">
            <div className="flex items-start gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowInlineSearch(!showInlineSearch)
                  if (showInlineSearch && searchQuery) {
                    setSearchQuery('')
                  }
                }}
                className={cn(
                  "flex items-center gap-2 h-9 relative transition-all",
                  hasActiveSearch && "border-primary bg-primary/5 hover:bg-primary/10",
                  showInlineSearch && "border-primary"
                )}
              >
                <Search className={cn("w-4 h-4", hasActiveSearch && "text-primary")} />
                Search
                {hasActiveSearch && (
                  <Badge className="ml-1 px-1.5 h-5 bg-primary/10 text-primary border-0">
                    1
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersModal(true)}
                className={cn(
                  "flex items-center gap-2 h-9 relative transition-all",
                  hasActiveFilters && "border-primary bg-primary/5 hover:bg-primary/10"
                )}
              >
                <Filter className={cn("w-4 h-4", hasActiveFilters && "text-primary")} />
                Filters
                {hasActiveFilters && (
                  <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] font-bold">
                    {(selectedProvider ? 1 : 0) + (sortOrder !== 'newest' ? 1 : 0)}
                  </div>
                )}
              </Button>
            </div>
            
            {/* Inline search bar */}
            {showInlineSearch && (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, URLs, or parameters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-10 bg-background/80 border-border/60 focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                  autoFocus
                />
              </div>
            )}
          </div>

        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Events list with full extension scrolling */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 px-6 py-4 border-b bg-card/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">Recent Events</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {filteredEvents.length} events
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <ErrorBoundary>
                <EventTable 
                  events={filteredEvents}
                  selectedEvent={selectedEvent}
                  onEventSelect={onEventSelect}
                  compact
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Filters modal */}
        <Dialog 
          open={showFiltersModal} 
          onOpenChange={setShowFiltersModal}
        >
          <DialogContent className="sm:max-w-[520px] p-0 gap-0 max-h-[90vh] overflow-hidden">
            <DialogHeader className="px-8 pt-8 pb-2">
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Filter className="w-5 h-5 text-primary" />
                </div>
                Filters & Sorting
              </DialogTitle>
            </DialogHeader>
            
            <div className="px-6 py-4 space-y-6">
              {/* Provider Filter Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Filter className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Filter by Provider</h4>
                    <p className="text-xs text-muted-foreground">Show events from specific tracking providers</p>
                  </div>
                </div>
                
                {/* Custom Provider Selector */}
                <div className="grid grid-cols-2 gap-2">
                  {/* All Providers Option */}
                  <button
                    onClick={() => {
                      setSelectedProvider('')
                      onApplyFilters({ provider: undefined })
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                      selectedProvider === ''
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border/60 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-center w-5 h-5">
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">All Providers</span>
                    {selectedProvider === '' && (
                      <Check className="w-3.5 h-3.5 ml-auto" />
                    )}
                  </button>
                  
                  {/* Individual Provider Options */}
                  {uniqueProviders.map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedProvider(provider.id)
                        onApplyFilters({ provider: provider.id })
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                        selectedProvider === provider.id
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background border-border/60 hover:bg-muted/50 hover:border-border"
                      )}
                    >
                      <ProviderIcon 
                        provider={provider.id} 
                        size="sm"
                        showTooltip={false}
                      />
                      <span className="text-sm font-medium flex-1 text-left">{provider.name}</span>
                      <Badge variant="secondary" className="text-xs px-1.5">
                        {provider.count}
                      </Badge>
                      {selectedProvider === provider.id && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/40" />
              
              {/* Timestamp Sorting Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <ArrowUpDown className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Sort Order</h4>
                    <p className="text-xs text-muted-foreground">Arrange events by time</p>
                  </div>
                </div>
                
                {/* Custom Sort Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSortOrder('newest')
                      onApplyFilters({ provider: selectedProvider || undefined, sortOrder: 'newest' })
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-3 rounded-lg border transition-all",
                      sortOrder === 'newest'
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border/60 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center w-5">
                      <div className="w-2 h-2 bg-current rounded-full mb-0.5" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full opacity-60 mb-0.5" />
                      <div className="w-1 h-1 bg-current rounded-full opacity-30" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Newest First</div>
                      <div className="text-xs text-muted-foreground">Latest events at top</div>
                    </div>
                    {sortOrder === 'newest' && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSortOrder('oldest')
                      onApplyFilters({ provider: selectedProvider || undefined, sortOrder: 'oldest' })
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-3 rounded-lg border transition-all",
                      sortOrder === 'oldest'
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border/60 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center w-5">
                      <div className="w-1 h-1 bg-current rounded-full opacity-30 mb-0.5" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full opacity-60 mb-0.5" />
                      <div className="w-2 h-2 bg-current rounded-full" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Oldest First</div>
                      <div className="text-xs text-muted-foreground">Earlier events at top</div>
                    </div>
                    {sortOrder === 'oldest' && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedProvider('')
                      setSortOrder('newest')
                      onApplyFilters({ provider: undefined, sortOrder: 'newest' })
                    }}
                    className="flex-1 h-10 font-medium border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
                <Button 
                  onClick={() => setShowFiltersModal(false)}
                  className={cn(
                    "h-10 font-medium transition-all",
                    hasActiveFilters ? "flex-1" : "w-full"
                  )}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Apply & Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Event details modal - Enhanced */}
        <Dialog 
          open={!!selectedEvent} 
          onOpenChange={(open) => !open && onEventSelect(null as any)}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogTitle className="text-xl font-semibold">Event Details</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedEvent && (
                <EventDetailsEnhanced
                  event={selectedEvent}
                  onClose={() => onEventSelect(null as any)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)

RealTimeDashboard.displayName = "RealTimeDashboard"

export { RealTimeDashboard }