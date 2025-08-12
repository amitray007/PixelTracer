import * as React from "react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { cn, formatBytes } from "../utils"
import { 
  Database, 
  AlertTriangle, 
  Zap,
  Info
} from "lucide-react"

export interface MemoryIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  currentUsage: number
  maxUsage?: number
  threshold?: number
  warningThreshold?: number
  onOptimize?: () => void
  onClear?: () => void
  compact?: boolean
  showDetails?: boolean
}

const MemoryIndicator = React.forwardRef<HTMLDivElement, MemoryIndicatorProps>(
  ({ 
    className, 
    currentUsage,
    maxUsage,
    threshold = 100 * 1024 * 1024, // 100MB default threshold
    warningThreshold = 50 * 1024 * 1024, // 50MB warning threshold
    onOptimize,
    onClear,
    compact = false,
    showDetails = true,
    ...props 
  }, ref) => {
    // Calculate usage percentage if maxUsage is provided
    const usagePercentage = React.useMemo(() => {
      if (!maxUsage) return null;
      return Math.min(100, (currentUsage / maxUsage) * 100);
    }, [currentUsage, maxUsage]);

    // Determine status based on usage
    const status = React.useMemo(() => {
      if (currentUsage >= threshold) {
        return { level: 'critical', color: 'error', icon: AlertTriangle };
      }
      if (currentUsage >= warningThreshold) {
        return { level: 'warning', color: 'warning', icon: AlertTriangle };
      }
      return { level: 'normal', color: 'success', icon: Database };
    }, [currentUsage, threshold, warningThreshold]);

    // Get appropriate variant for badge
    const badgeVariant = React.useMemo(() => {
      switch (status.color) {
        case 'error': return 'error';
        case 'warning': return 'warning';
        case 'success': return 'success';
        default: return 'secondary';
      }
    }, [status.color]);

    // Memory usage recommendations
    const recommendations = React.useMemo(() => {
      const recs = [];
      
      if (currentUsage >= threshold) {
        recs.push('Critical: Clear events or restart extension');
        recs.push('Consider reducing event retention time');
      } else if (currentUsage >= warningThreshold) {
        recs.push('High usage: Consider optimizing memory');
        recs.push('Clear old events if not needed');
      }
      
      return recs;
    }, [currentUsage, threshold, warningThreshold]);

    const StatusIcon = status.icon;

    if (compact) {
      return (
        <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
          <StatusIcon className="w-4 h-4 text-muted-foreground" />
          <Badge variant={badgeVariant} className="text-xs">
            {formatBytes(currentUsage)}
          </Badge>
          {status.level !== 'normal' && onOptimize && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOptimize}
              className="h-6 w-6 p-0"
              title="Optimize memory"
            >
              <Zap className="w-3 h-3" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn(
              "w-4 h-4",
              status.color === 'error' && "text-red-500",
              status.color === 'warning' && "text-yellow-500",
              status.color === 'success' && "text-green-500"
            )} />
            <span className="text-sm font-medium">Memory Usage</span>
          </div>
          
          <Badge variant={badgeVariant} className="text-xs">
            {formatBytes(currentUsage)}
          </Badge>
        </div>

        {/* Usage Bar */}
        {usagePercentage !== null && (
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  status.color === 'error' && "bg-red-500",
                  status.color === 'warning' && "bg-yellow-500",
                  status.color === 'success' && "bg-green-500"
                )}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{usagePercentage.toFixed(1)}%</span>
              <span>{formatBytes(maxUsage!)}</span>
            </div>
          </div>
        )}

        {/* Details */}
        {showDetails && (
          <div className="space-y-2">
            {/* Thresholds */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Warning: </span>
                <span className="font-medium">{formatBytes(warningThreshold)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Critical: </span>
                <span className="font-medium">{formatBytes(threshold)}</span>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span>Recommendations:</span>
                </div>
                {recommendations.map((rec, index) => (
                  <div key={index} className="text-xs text-muted-foreground ml-4">
                    • {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {(onOptimize || onClear) && status.level !== 'normal' && (
              <div className="flex gap-2 pt-2">
                {onOptimize && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOptimize}
                    className="flex-1 gap-1 text-xs"
                  >
                    <Zap className="w-3 h-3" />
                    Optimize
                  </Button>
                )}
                
                {onClear && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

MemoryIndicator.displayName = "MemoryIndicator";

export { MemoryIndicator }