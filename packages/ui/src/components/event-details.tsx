import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { 
  cn, 
  getConfidenceText, 
  formatParameterValue 
} from "../utils"
import { Copy, ExternalLink, Eye, EyeOff } from "lucide-react"

export interface EventDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
  event: TrackingEvent | null
  onClose?: () => void
}

const EventDetails = React.forwardRef<HTMLDivElement, EventDetailsProps>(
  ({ className, event, onClose, ...props }, ref) => {
    const [showRawData, setShowRawData] = React.useState(false)
    const [copiedField, setCopiedField] = React.useState<string | null>(null)

    const handleCopy = async (text: string, field: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
      } catch (error) {
        // Failed to copy
      }
    }

    if (!event) {
      return (
        <div className={cn("flex items-center justify-center p-8 text-center", className)}>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Select an event to view details</div>
            <div className="text-xs text-muted-foreground">
              Click on any event in the list to see its full information
            </div>
          </div>
        </div>
      )
    }

    const confidenceText = getConfidenceText(event.confidence)

    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {/* Remove Card wrapper - modal already provides container */}
        <div className="space-y-6">
          {/* Event header info - enhanced layout */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={getProviderBadgeVariant(event.provider)} className="text-sm font-medium">
                {event.providerName}
              </Badge>
              <Badge variant={getConfidenceBadgeVariant(event.confidence)} className="text-sm font-medium">
                {confidenceText} ({Math.round(event.confidence * 100)}%)
              </Badge>
              {event.eventType && (
                <Badge variant="outline" className="text-sm font-medium">
                  {event.eventType}
                </Badge>
              )}
            </div>
          </div>

          {/* Content with optimized spacing */}
          <div className="space-y-6">
                {/* Basic Information */}
                <Section title="Basic Information">
                  <InfoRow
                    label="URL"
                    value={event.url}
                    onCopy={() => handleCopy(event.url, 'url')}
                    copied={copiedField === 'url'}
                    allowExternal
                  />
                  <InfoRow
                    label="Method"
                    value={event.method.toUpperCase()}
                  />
                  <InfoRow
                    label="Timestamp"
                    value={new Date(event.timestamp).toLocaleString()}
                  />
                  <InfoRow
                    label="Tab ID"
                    value={(event.tabId ?? 0).toString()}
                  />
                </Section>

                {/* Request Headers */}
                {event.requestHeaders && Object.keys(event.requestHeaders).length > 0 && (
                  <Section title="Request Headers">
                    {Object.entries(event.requestHeaders).map(([key, value]) => (
                      <InfoRow
                        key={key}
                        label={key}
                        value={value}
                        onCopy={() => handleCopy(value, `req-header-${key}`)}
                        copied={copiedField === `req-header-${key}`}
                        mono
                      />
                    ))}
                  </Section>
                )}

                {/* Response Headers */}
                {event.responseHeaders && Object.keys(event.responseHeaders).length > 0 && (
                  <Section title="Response Headers">
                    {Object.entries(event.responseHeaders).map(([key, value]) => (
                      <InfoRow
                        key={key}
                        label={key}
                        value={value}
                        onCopy={() => handleCopy(value, `res-header-${key}`)}
                        copied={copiedField === `res-header-${key}`}
                        mono
                      />
                    ))}
                  </Section>
                )}

                {/* Status Code */}
                {event.statusCode && (
                  <Section title="Response">
                    <InfoRow
                      label="Status Code"
                      value={event.statusCode.toString()}
                    />
                  </Section>
                )}

                {/* Parameters */}
                {Object.keys(event.parameters).length > 0 && (
                  <Section title="Parameters">
                    {Object.entries(event.parameters).map(([key, value]) => (
                      <InfoRow
                        key={key}
                        label={key}
                        value={showRawData ? JSON.stringify(value, null, 2) : formatParameterValue(value)}
                        onCopy={() => handleCopy(JSON.stringify(value), `param-${key}`)}
                        copied={copiedField === `param-${key}`}
                        mono={showRawData}
                        multiline={showRawData && typeof value === 'object'}
                      />
                    ))}
                  </Section>
                )}

                {/* Request Body */}
                {event.requestBody && (
                  <Section title="Request Body">
                    <InfoRow
                      label="Body"
                      value={event.requestBody}
                      onCopy={() => handleCopy(event.requestBody || '', 'request-body')}
                      copied={copiedField === 'request-body'}
                      mono
                      multiline
                    />
                  </Section>
                )}

                {/* Toggle raw data view */}
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRawData(!showRawData)}
                    className="gap-2"
                  >
                    {showRawData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
                  </Button>
                </div>
              </div>
        </div>
      </div>
    )
  }
)

// Helper Components
interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-primary rounded-full" />
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
      </div>
      <div className="space-y-3 pl-5">
        {children}
      </div>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
  onCopy?: () => void
  copied?: boolean
  mono?: boolean
  multiline?: boolean
  allowExternal?: boolean
}

function InfoRow({ label, value, onCopy, copied, mono, multiline, allowExternal }: InfoRowProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm font-semibold text-foreground flex-shrink-0">{label}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {allowExternal && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(value, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          {onCopy && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onCopy}
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className={cn(
        "text-sm leading-relaxed break-all word-wrap overflow-wrap-anywhere",
        mono && "font-mono bg-background border p-3 rounded text-xs overflow-x-auto",
        multiline && "whitespace-pre-wrap",
        !mono && "text-muted-foreground"
      )}>
        {value}
      </div>
      {copied && (
        <div className="text-xs text-green-600 mt-2 font-medium">✓ Copied to clipboard!</div>
      )}
    </div>
  )
}

// Helper functions to map provider/confidence to badge variants - simplified for supported providers only
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

function getConfidenceBadgeVariant(confidence: number): 'confidence-perfect' | 'confidence-high' | 'confidence-medium' | 'confidence-low' {
  if (confidence >= 0.95) return 'confidence-perfect'
  if (confidence >= 0.8) return 'confidence-high'
  if (confidence >= 0.6) return 'confidence-medium'
  return 'confidence-low'
}

EventDetails.displayName = "EventDetails"

export { EventDetails }