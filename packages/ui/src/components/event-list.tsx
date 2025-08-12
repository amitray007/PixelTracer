import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { EventCard } from "./event-card"
import { cn } from "../utils"

export interface EventListProps extends React.HTMLAttributes<HTMLDivElement> {
  events: TrackingEvent[]
  selectedEvent?: TrackingEvent
  onEventSelect?: (event: TrackingEvent) => void
  compact?: boolean
  loading?: boolean
  emptyMessage?: string
}

const EventList = React.memo(React.forwardRef<HTMLDivElement, EventListProps>(
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
    
    // Track which events are new (for animation)
    const [newEventIds, setNewEventIds] = React.useState<Set<string>>(new Set())
    const prevEventsRef = React.useRef<TrackingEvent[]>([])

    // Memoize new event detection logic with null safety
    const prevEventIds = React.useMemo(() => 
      new Set((prevEventsRef.current || []).map(e => e?.id).filter(Boolean)), 
      [prevEventsRef.current]
    );
    
    const newIds = React.useMemo(() => 
      (events || [])
        .filter(event => event && event.id && !prevEventIds.has(event.id))
        .map(event => event.id),
      [events, prevEventIds]
    );

    // Memoize the event rendering logic with null safety - MOVED UP BEFORE RETURNS
    const renderedEvents = React.useMemo(() => {
      if (!events || !Array.isArray(events)) return [];
      
      return events
        .filter(event => event && event.id) // Filter out null/undefined events
        .map((event) => {
          const isSelected = selectedEvent?.id === event.id;
          const isNew = newEventIds.has(event.id);
          
          return (
            <EventCard
              key={event.id}
              event={event}
              compact={compact}
              isNew={isNew}
              onSelect={onEventSelect}
              className={cn(
                isSelected && "ring-2 ring-primary",
                "transition-all duration-200"
              )}
            />
          );
        });
    }, [events, compact, newEventIds, selectedEvent?.id, onEventSelect]);

    React.useEffect(() => {
      if (newIds.length > 0) {
        setNewEventIds(new Set(newIds))
        
        // Remove the "new" indicator after animation
        const timeoutId = setTimeout(() => {
          setNewEventIds(prev => {
            const next = new Set(prev)
            newIds.forEach(id => next.delete(id))
            return next
          })
        }, 2000)
        
        return () => clearTimeout(timeoutId);
      }

      prevEventsRef.current = events
    }, [events, newIds])

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

    // RENDER - All hooks completed above
    return (
      <div ref={ref} className={cn("h-full", className)} {...props}>
        <div className="h-full overflow-y-auto">
          <div className={cn(
            "space-y-3 p-4", 
            compact && "space-y-2 p-3"
          )}>
            {renderedEvents}
          </div>
        </div>
      </div>
    )
  }
))

EventList.displayName = "EventList"

export { EventList }