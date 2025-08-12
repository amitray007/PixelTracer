import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { getProviderGrouping } from "@pixeltracer/providers"
import type { ParameterGroup, ParameterGroupIcon } from "@pixeltracer/providers"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ProviderIcon } from "./provider-icon"
import { cn } from "../utils"
import { 
  Copy, 
  Check, 
  Code2, 
  Eye, 
  ChevronDown,
  ChevronRight,
  Info,
  Package,
  User,
  Calendar,
  Settings,
  Globe,
  Sparkles
} from "lucide-react"

// UI-specific parameter group with React icon
interface UIParameterGroup extends Omit<ParameterGroup, 'icon'> {
  icon?: React.ReactNode
}

// Map icon identifiers to React components
const iconMap: Record<ParameterGroupIcon | string, React.ReactNode> = {
  'event': <Sparkles className="w-4 h-4" />,
  'user': <User className="w-4 h-4" />,
  'product': <Package className="w-4 h-4" />,
  'custom': <Package className="w-4 h-4" />,
  'context': <Globe className="w-4 h-4" />,
  'technical': <Settings className="w-4 h-4" />,
  'privacy': <Info className="w-4 h-4" />,
  'performance': <Settings className="w-4 h-4" />
}

export interface EventDetailsEnhancedProps {
  event: TrackingEvent | null
  onClose?: () => void
  className?: string
}

// Enhanced grouping function using centralized provider grouping
function groupParameters(event: TrackingEvent): UIParameterGroup[] {
  if (!event.parameters) return []
  
  // Use centralized provider grouping
  const groups = getProviderGrouping(event.provider, event.parameters)
  
  // Map icon strings to React components
  return groups.map(group => ({
    ...group,
    icon: group.icon && iconMap[group.icon] ? iconMap[group.icon] : undefined
  }))
}

export const EventDetailsEnhanced = React.forwardRef<HTMLDivElement, EventDetailsEnhancedProps>(
  ({ event, className }, ref) => {
    const [copiedField, setCopiedField] = React.useState<string | null>(null)
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(['event']))
    const [viewMode, setViewMode] = React.useState<'simplified' | 'technical'>('simplified')
    
    const handleCopy = async (text: string, field: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
      } catch (error) {
        // Failed to copy
      }
    }
    
    const toggleGroup = (groupId: string) => {
      setExpandedGroups(prev => {
        const next = new Set(prev)
        if (next.has(groupId)) {
          next.delete(groupId)
        } else {
          next.add(groupId)
        }
        return next
      })
    }
    
    if (!event) {
      return (
        <div className={cn("flex items-center justify-center p-12", className)}>
          <div className="text-center space-y-3">
            <Info className="w-12 h-12 text-muted-foreground/50 mx-auto" />
            <div className="text-sm text-muted-foreground">No event selected</div>
            <div className="text-xs text-muted-foreground/70">
              Select an event from the list to view its details
            </div>
          </div>
        </div>
      )
    }
    
    const groupedParams = groupParameters(event)
    
    return (
      <div ref={ref} className={cn("", className)}>
        {/* Header */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{event.eventType || 'Unknown Event'}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(event.timestamp).toLocaleString()}
              </div>
            </div>
            <Badge variant="outline" className="font-medium flex items-center gap-1.5">
              <ProviderIcon 
                provider={event.provider} 
                iconUrl={event.providerIcon}
                size="sm" 
                showTooltip={false} 
              />
              {event.providerName}
            </Badge>
          </div>
          
          {/* Quick Stats */}
          {event.accountId && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Account:</span>
                <span className="font-medium font-mono">
                  {typeof event.accountId === 'string' && event.accountId.includes('$/$') 
                    ? event.accountId.split('$/$').join(' / ')
                    : String(event.accountId)
                  }
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="simplified" className="gap-2">
              <Eye className="w-4 h-4" />
              Simplified View
            </TabsTrigger>
            <TabsTrigger value="technical" className="gap-2">
              <Code2 className="w-4 h-4" />
              Technical View
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="simplified" className="space-y-2 mt-0">
            {groupedParams.map(group => (
              <div key={group.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {group.icon}
                    <div className="text-left">
                      <div className="font-medium text-sm">{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-muted-foreground">{group.description}</div>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {group.parameters.length}
                    </Badge>
                  </div>
                  {expandedGroups.has(group.id) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                
                {expandedGroups.has(group.id) && (
                  <div className="p-4 space-y-3 bg-background/50">
                    {group.parameters.map(param => {
                      const formattedValue = formatValue(param.value, param.format)
                      const isLongValue = formattedValue.length > 40
                      const isVeryLongValue = formattedValue.length > 100
                      const isObject = typeof param.value === 'object' && param.value !== null
                      
                      // Use vertical layout for long values or objects
                      if (isLongValue || isObject) {
                        return (
                          <div key={param.key} className="border-l-2 border-muted pl-3 space-y-1.5">
                            <div>
                              <div className="text-sm font-medium">{param.displayName}</div>
                              {param.description && (
                                <div className="text-xs text-muted-foreground mt-0.5">{param.description}</div>
                              )}
                            </div>
                            <div className="flex items-start gap-2">
                              <code className={cn(
                                "text-xs px-2 py-1.5 bg-muted rounded font-mono flex-1",
                                isVeryLongValue || isObject 
                                  ? "break-all whitespace-pre-wrap max-h-[200px] overflow-y-auto" 
                                  : "break-all"
                              )}>
                                {formattedValue}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0"
                                onClick={() => handleCopy(String(param.value), param.key)}
                              >
                                {copiedField === param.key ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )
                      }
                      
                      // Use horizontal layout for short values
                      return (
                        <div key={param.key} className="border-l-2 border-muted pl-3 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{param.displayName}</div>
                            {param.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">{param.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs px-2 py-1.5 bg-muted rounded font-mono max-w-[200px] truncate">
                              {formattedValue}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={() => handleCopy(String(param.value), param.key)}
                            >
                              {copiedField === param.key ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="technical" className="mt-0">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="space-y-2">
                {/* Raw URL */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request URL</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono p-2 bg-background rounded border break-all">
                      {event.url}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => handleCopy(event.url, 'url')}
                    >
                      {copiedField === 'url' ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* All Parameters */}
                <div className="space-y-1 mt-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">All Parameters</div>
                  <div className="rounded border bg-background p-3 max-h-[400px] overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(event.parameters, null, 2)}
                    </pre>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(JSON.stringify(event.parameters, null, 2), 'params')}
                      className="gap-2"
                    >
                      {copiedField === 'params' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy JSON
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }
)

EventDetailsEnhanced.displayName = 'EventDetailsEnhanced'

// Helper function to format values based on their type
function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined) return 'null'
  
  if (format === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }
  
  if (format === 'timestamp' && (typeof value === 'number' || typeof value === 'string')) {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toLocaleString()
    }
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  
  return String(value)
}
