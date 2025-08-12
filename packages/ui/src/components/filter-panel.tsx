import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { 
  EventFilters, 
  FilterStats
} from "../hooks/use-event-filters"
import { cn } from "../utils"
import { 
  Search, 
  Filter, 
  X, 
  Clock, 
  TrendingUp,
  Settings2
} from "lucide-react"

export interface FilterPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  events: TrackingEvent[]
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  stats: FilterStats
  compact?: boolean
  collapsible?: boolean
}

const FilterPanel = React.forwardRef<HTMLDivElement, FilterPanelProps>(
  ({ 
    className, 
    events, 
    filters, 
    onFiltersChange, 
    stats,
    compact = false,
    collapsible = false,
    ...props 
  }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(!collapsible);
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    const updateFilter = React.useCallback(<K extends keyof EventFilters>(
      key: K,
      value: EventFilters[K]
    ) => {
      onFiltersChange({ ...filters, [key]: value });
    }, [filters, onFiltersChange]);

    const clearFilter = React.useCallback((key: keyof EventFilters) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      onFiltersChange(newFilters);
    }, [filters, onFiltersChange]);

    const clearAllFilters = React.useCallback(() => {
      onFiltersChange({});
    }, [onFiltersChange]);

    // Active filter count
    const activeFilterCount = React.useMemo(() => {
      return Object.keys(filters).filter(key => {
        const value = filters[key as keyof EventFilters];
        return value !== undefined && value !== '';
      }).length;
    }, [filters]);

    if (collapsible && !isExpanded) {
      return (
        <div ref={ref} className={cn("", className)} {...props}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="w-full gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      );
    }

    return (
      <Card ref={ref} className={cn("", className)} {...props}>
        <CardHeader className={cn("pb-3", compact && "p-3 pb-2")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear All
                </Button>
              )}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Statistics */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{stats.total} total</span>
            <span>{stats.filtered} showing</span>
            {stats.providers.length > 0 && (
              <span>{stats.providers.length} providers</span>
            )}
          </div>
        </CardHeader>

        <CardContent className={cn("space-y-3", compact && "p-3 pt-0")}>
          {/* Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events, URLs, parameters..."
                value={filters.searchQuery || ''}
                onChange={(e) => updateFilter('searchQuery', e.target.value || undefined)}
                className="pl-8 h-8"
              />
              {filters.searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => clearFilter('searchQuery')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="space-y-2">
            {/* Provider Filter */}
            {stats.providers.length > 1 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Provider</div>
                <div className="flex flex-wrap gap-1">
                  {stats.providers.map(provider => (
                    <Badge
                      key={provider}
                      variant={filters.provider === provider ? "default" : "secondary"}
                      className="text-xs cursor-pointer hover:bg-primary/80"
                      onClick={() => updateFilter(
                        'provider', 
                        filters.provider === provider ? undefined : provider
                      )}
                    >
                      {provider}
                      {filters.provider === provider && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Event Type Filter */}
            {stats.eventTypes.length > 1 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Event Type</div>
                <div className="flex flex-wrap gap-1">
                  {stats.eventTypes.slice(0, showAdvanced ? undefined : 5).map(eventType => (
                    <Badge
                      key={eventType}
                      variant={filters.eventType === eventType ? "default" : "secondary"}
                      className="text-xs cursor-pointer hover:bg-primary/80"
                      onClick={() => updateFilter(
                        'eventType', 
                        filters.eventType === eventType ? undefined : eventType
                      )}
                    >
                      {eventType}
                      {filters.eventType === eventType && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                  {stats.eventTypes.length > 5 && !showAdvanced && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowAdvanced(true)}
                    >
                      +{stats.eventTypes.length - 5} more
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {(showAdvanced || activeFilterCount > 2) && (
            <div className="space-y-3 pt-2 border-t">
              {/* Confidence Range */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Confidence Range
                  </div>
                  {filters.confidenceRange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => clearFilter('confidenceRange')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.confidenceRange?.min || stats.confidenceRange.min}
                    onChange={(e) => {
                      const min = parseFloat(e.target.value);
                      const max = filters.confidenceRange?.max || stats.confidenceRange.max;
                      updateFilter('confidenceRange', { min, max });
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs w-8">
                    {Math.round((filters.confidenceRange?.min || stats.confidenceRange.min) * 100)}%
                  </span>
                </div>
              </div>

              {/* Recent Events Toggle */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Recent Only
                </div>
                <Button
                  variant={filters.showOnlyRecent ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => updateFilter('showOnlyRecent', !filters.showOnlyRecent)}
                >
                  {filters.showOnlyRecent ? 'On' : 'Off'}
                </Button>
              </div>

              {/* Method Filter */}
              {stats.methods.length > 1 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Method</div>
                  <div className="flex gap-1">
                    {stats.methods.map(method => (
                      <Badge
                        key={method}
                        variant={filters.method === method ? "default" : "secondary"}
                        className="text-xs cursor-pointer hover:bg-primary/80"
                        onClick={() => updateFilter(
                          'method', 
                          filters.method === method ? undefined : method
                        )}
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advanced Toggle */}
          {!showAdvanced && activeFilterCount <= 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={() => setShowAdvanced(true)}
            >
              <Settings2 className="w-3 h-3" />
              Advanced Filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
);

FilterPanel.displayName = "FilterPanel";

export { FilterPanel }