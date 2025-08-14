/**
 * Event Table Component
 * Displays tracking events in tabular format: [Provider] | [Event Name] | [Account ID]
 */

import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { ProviderIcon } from "./provider-icon"
import { Tooltip } from "./ui/tooltip"
import { cn } from "../utils"
import { Navigation, ArrowRight } from "lucide-react"

export interface EventTableProps extends React.HTMLAttributes<HTMLDivElement> {
  events: TrackingEvent[]
  selectedEvent?: TrackingEvent
  onEventSelect?: (event: TrackingEvent) => void
  compact?: boolean
  loading?: boolean
  emptyMessage?: string
}

const EventTable = React.forwardRef<HTMLDivElement, EventTableProps>(
  ({ 
    className, 
    events, 
    selectedEvent, 
    onEventSelect, 
    compact = false, 
    loading = false,
    emptyMessage = "No events to display",
    ...props 
  }, ref) => {
    // ALL HOOKS MUST COME FIRST - React Rules of Hooks
    
    // Debug logging

    // Extract account ID from event - now simplified to use event.accountId
    const extractAccountId = React.useCallback((event: any) => {
      if (event.accountId) {
        return String(event.accountId);
      }
      return '';
    }, []);
    
    // Render account ID with pattern support
    const renderAccountId = React.useCallback((accountId: string) => {
      // Check for pattern: value$/$value means line break
      if (accountId.includes('$/$')) {
        const parts = accountId.split('$/$');
        return (
          <div className="text-sm font-mono text-muted-foreground">
            <div className="truncate" title={parts[0]}>
              {parts[0].length > 20 ? parts[0].slice(0, 20) + '...' : parts[0]}
            </div>
            <div className="truncate text-xs opacity-70" title={parts[1]}>
              {parts[1].length > 20 ? parts[1].slice(0, 20) + '...' : parts[1]}
            </div>
          </div>
        );
      }
      
      // Simple string - truncate if needed
      return (
        <div className="text-sm font-mono text-muted-foreground truncate" title={accountId}>
          {accountId.length > 30 ? accountId.slice(0, 30) + '...' : accountId}
        </div>
      );
    }, []);

    // Memoized table rows - MOVED UP BEFORE RETURNS
    const tableRows = React.useMemo(() => {
      if (!events || !Array.isArray(events)) return [];
      
      return events
        .filter(event => event && event.id) // Filter out null/undefined events
        .map((event) => {
          const isSelected = selectedEvent?.id === event.id;
          const accountId = extractAccountId(event);
          return {
            id: event.id,
            provider: event.providerName || event.provider,
            eventName: event.eventType || 'pageview',
            accountId: accountId || 'N/A',
            isSelected,
            fullEvent: event,
            isNavigationEvent: event.isNavigationEvent
          };
        });
    }, [events, selectedEvent?.id, extractAccountId]);

    // NOW SAFE TO HAVE EARLY RETURNS AFTER ALL HOOKS
    if (loading) {
      return (
        <div className={cn("flex items-center justify-center p-8", className)}>
          <div className="text-sm text-muted-foreground">Loading events...</div>
        </div>
      )
    }

    if (!events || events.length === 0) {
      return (
        <div className={cn("flex items-center justify-center p-8 text-center", className)}>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{emptyMessage}</div>
            <div className="text-xs text-muted-foreground">
              Events will appear here when tracking requests are detected
            </div>
          </div>
        </div>
      )
    }

    const handleRowClick = (event: TrackingEvent) => {
      onEventSelect?.(event);
    };

    // RENDER - All hooks completed above
    return (
      <div ref={ref} className={cn("h-full overflow-hidden", className)} {...props}>
        <div className="h-full overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <tr className="border-b">
                <th className="text-left p-2 font-semibold text-sm text-foreground w-[100px]">
                  Provider
                </th>
                <th className="text-left p-2 font-semibold text-sm text-foreground w-[120px]">
                  Event Name
                </th>
                <th className="text-left p-2 font-semibold text-sm text-foreground w-[140px]">
                  Account ID
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                // Special rendering for navigation events
                if (row.isNavigationEvent) {
                  return (
                    <tr key={row.id} className="border-b">
                      <td colSpan={3} className="p-0">
                        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-l-4 border-blue-400 dark:border-blue-600">
                          <Navigation className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
                            <Tooltip 
                              content={`Page: ${row.fullEvent.parameters?.title || 'Unknown Page'}\nURL: ${row.fullEvent.parameters?.toUrl || row.fullEvent.url}`}
                              delay={500}
                            >
                              <span className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100 cursor-help">
                                Page Navigation
                              </span>
                            </Tooltip>
                            <ArrowRight className="hidden sm:block w-3 h-3 text-blue-500 shrink-0" />
                          </div>
                          <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">
                            {new Date(row.fullEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Regular event row
                return (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.fullEvent)}
                    className={cn(
                      "border-b hover:bg-muted/50 cursor-pointer transition-colors",
                      row.isSelected && "bg-primary/10 border-primary/30"
                    )}
                  >
                    <td className="p-2">
                      <div className="flex items-center justify-start pl-2">
                        <ProviderIcon 
                          provider={row.fullEvent.provider}
                          iconUrl={row.fullEvent.providerIcon}
                          className="w-6 h-6"
                        />
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-sm font-medium text-foreground truncate">
                        {row.eventName}
                      </div>
                    </td>
                    <td className="p-2">
                      {renderAccountId(row.accountId)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
)


EventTable.displayName = "EventTable"

export { EventTable }