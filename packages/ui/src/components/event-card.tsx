import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Tooltip } from "./ui/tooltip"
import { 
  cn, 
  formatEventTime
} from "../utils"
import { Navigation, ArrowRight } from "lucide-react"

export interface EventCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  event: TrackingEvent
  isNew?: boolean
  compact?: boolean
  onSelect?: (event: TrackingEvent) => void
}

const EventCard = React.memo(React.forwardRef<HTMLDivElement, EventCardProps>(
  ({ className, event, isNew = false, compact = false, onSelect, ...props }, ref) => {
    // Memoize provider variant
    const providerVariant = React.useMemo(() => 
      getProviderBadgeVariant(event.provider), 
      [event.provider]
    );
    
    const formattedTime = React.useMemo(() => 
      formatEventTime(event.timestamp), 
      [event.timestamp]
    );

    // Extract account ID from parameters - memoized to avoid double calls
    const accountId = React.useMemo(() => {
      if (!event.parameters) return null;
      
      // Common account ID parameter names
      const accountKeys = ['tid', 'account_id', 'accountId', 'id', 'ga', 'gtag', 'measurement_id', 'tracking_id'];
      
      for (const key of accountKeys) {
        if (event.parameters[key]) {
          const value = String(event.parameters[key]);
          // Truncate long account IDs
          return value.length > 20 ? value.slice(0, 20) + '...' : value;
        }
      }
      return null;
    }, [event.parameters]);

    const handleClick = React.useCallback(() => {
      onSelect?.(event);
    }, [onSelect, event]);

    // Special rendering for navigation events
    if (event.isNavigationEvent) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center gap-3 px-3 py-2 my-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg",
            isNew && "animate-fade-in",
            className
          )}
          {...props}
        >
          <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Tooltip 
              content={`Page: ${event.parameters?.title || 'Unknown Page'}\nURL: ${event.parameters?.toUrl || event.url}`}
              delay={500}
            >
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100 cursor-help">
                Page Navigation
              </span>
            </Tooltip>
            <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">
            {formattedTime}
          </span>
        </div>
      );
    }

    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-200 hover:shadow-md cursor-pointer",
          isNew && "animate-fade-in event-new",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <CardContent className="p-3">
          {/* Simplified single row layout: [Provider], [Event Name], [Account ID], Timestamp */}
          <div className="flex items-center gap-3">
            {/* Provider */}
            <Badge 
              variant={providerVariant} 
              className="text-xs font-medium shrink-0"
            >
              {event.providerName}
            </Badge>
            
            {/* Event Name */}
            {event.eventType && (
              <Badge variant="outline" className="text-xs font-medium shrink-0">
                {event.eventType}
              </Badge>
            )}
            
            {/* Account ID - extract from parameters if available */}
            {accountId && (
              <Badge variant="secondary" className="text-xs font-medium shrink-0">
                {accountId}
              </Badge>
            )}
            
            {/* Spacer */}
            <div className="flex-1 min-w-0" />
            
            {/* Timestamp */}
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {formattedTime}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }
));

EventCard.displayName = "EventCard"

// Helper function to map provider to badge variants - simplified for supported providers only
function getProviderBadgeVariant(provider: string): 'facebook' | 'tiktok' | 'secondary' {
  const providerKey = provider.toLowerCase()
  
  switch (providerKey) {
    case 'facebook':
    case 'meta':
    case 'facebookpixel':
    case 'facebook-pixel':
      return 'facebook'
    case 'tiktok':
    case 'tiktok-pixel':
      return 'tiktok'
    default:
      return 'secondary'
  }
}

export { EventCard }