import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { cn, formatBytes } from "../utils"
import { 
  Activity, 
  Clock, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap
} from "lucide-react"

export interface PerformanceMetrics {
  memoryUsage: number
  eventCount: number
  processingTime: number
  errorCount: number
  timestamp: number
}

export interface PerformanceStats {
  avgProcessingTime: number
  maxProcessingTime: number
  avgMemoryUsage: number
  maxMemoryUsage: number
  totalEvents: number
  totalErrors: number
  errorRate: number
  uptime: number
}

export interface PerformanceDashboardProps extends React.HTMLAttributes<HTMLDivElement> {
  metrics: PerformanceMetrics[]
  stats: PerformanceStats
  onRefresh?: () => void
  onClearMetrics?: () => void
  onOptimizeMemory?: () => void
  compact?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const PerformanceDashboard = React.forwardRef<HTMLDivElement, PerformanceDashboardProps>(
  ({ 
    className, 
    metrics, 
    stats,
    onRefresh,
    onClearMetrics,
    onOptimizeMemory,
    compact = false,
    autoRefresh = false,
    refreshInterval = 5000,
    ...props 
  }, ref) => {
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    // Auto-refresh functionality
    React.useEffect(() => {
      if (!autoRefresh || !onRefresh) return;

      const interval = setInterval(() => {
        onRefresh();
      }, refreshInterval);

      return () => clearInterval(interval);
    }, [autoRefresh, onRefresh, refreshInterval]);

    // Manual refresh handler
    const handleRefresh = React.useCallback(async () => {
      if (!onRefresh) return;
      
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }, [onRefresh]);

    // Performance status calculation
    const performanceStatus = React.useMemo(() => {
      const issues = [];
      
      if (stats.avgMemoryUsage > 50 * 1024 * 1024) { // > 50MB
        issues.push('High memory usage');
      }
      
      if (stats.errorRate > 0.05) { // > 5% error rate
        issues.push('High error rate');
      }
      
      if (stats.avgProcessingTime > 100) { // > 100ms
        issues.push('Slow processing');
      }
      
      if (issues.length === 0) return { status: 'healthy', issues: [], color: 'success' };
      if (issues.length === 1) return { status: 'warning', issues, color: 'warning' };
      return { status: 'critical', issues, color: 'error' };
    }, [stats]);

    // Recent metrics for trends
    const recentMetrics = React.useMemo(() => {
      return metrics.slice(-10); // Last 10 metrics
    }, [metrics]);

    // Trend calculation
    const getTrend = React.useCallback((values: number[]) => {
      if (values.length < 2) return 'stable';
      
      const recent = values.slice(-3); // Last 3 values
      const older = values.slice(-6, -3); // Previous 3 values
      
      if (recent.length === 0 || older.length === 0) return 'stable';
      
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      
      const change = (recentAvg - olderAvg) / olderAvg;
      
      if (change > 0.1) return 'up';
      if (change < -0.1) return 'down';
      return 'stable';
    }, []);

    const memoryTrend = getTrend(recentMetrics.map(m => m.memoryUsage));
    const processingTrend = getTrend(recentMetrics.map(m => m.processingTime));

    const formatUptime = React.useCallback((uptime: number) => {
      const hours = Math.floor(uptime / (1000 * 60 * 60));
      const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
      
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    }, []);

    const TrendIcon = ({ trend }: { trend: string }) => {
      switch (trend) {
        case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
        case 'down': return <TrendingDown className="w-3 h-3 text-green-500" />;
        default: return <Minus className="w-3 h-3 text-muted-foreground" />;
      }
    };

    return (
      <Card ref={ref} className={cn("", className)} {...props}>
        <CardHeader className={cn("pb-3", compact && "p-3 pb-2")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Performance
              <Badge 
                variant={
                  performanceStatus.color === 'success' ? 'success' :
                  performanceStatus.color === 'warning' ? 'warning' : 'error'
                }
                className="text-xs"
              >
                {performanceStatus.status}
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-1">
              {onOptimizeMemory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOptimizeMemory}
                  className="text-xs gap-1"
                  title="Optimize memory usage"
                >
                  <Zap className="w-3 h-3" />
                  Optimize
                </Button>
              )}
              
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="gap-1"
                >
                  <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                  {!compact && 'Refresh'}
                </Button>
              )}
            </div>
          </div>
          
          {/* Overall Status */}
          <div className="flex items-center gap-2 text-xs">
            {performanceStatus.status === 'healthy' && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {performanceStatus.status === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            {performanceStatus.status === 'critical' && (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-muted-foreground">
              {performanceStatus.issues.length === 0 
                ? 'All systems operating normally'
                : performanceStatus.issues.join(', ')
              }
            </span>
          </div>
        </CardHeader>

        <CardContent className={cn("space-y-4", compact && "p-3 pt-0 space-y-3")}>
          {/* Key Metrics Grid - Enhanced alignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Memory Usage */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Database className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Memory Usage</span>
                </div>
                <TrendIcon trend={memoryTrend} />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-foreground">
                  {formatBytes(stats.avgMemoryUsage)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Peak: {formatBytes(stats.maxMemoryUsage)}
                </div>
              </div>
            </div>

            {/* Processing Time */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Clock className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Processing Time</span>
                </div>
                <TrendIcon trend={processingTrend} />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-foreground">
                  {stats.avgProcessingTime.toFixed(1)}ms
                </div>
                <div className="text-xs text-muted-foreground">
                  Peak: {stats.maxProcessingTime.toFixed(1)}ms
                </div>
              </div>
            </div>
          </div>

          {/* Events and Errors - Enhanced grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/20 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <div className="text-sm font-medium text-muted-foreground">Total Events</div>
              </div>
              <div className="text-xl font-bold text-foreground">{stats.totalEvents.toLocaleString()}</div>
            </div>
            
            <div className="bg-muted/20 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <div className="text-sm font-medium text-muted-foreground">Errors</div>
              </div>
              <div className="text-xl font-bold text-red-500">{stats.totalErrors}</div>
            </div>
            
            <div className="bg-muted/20 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="text-sm font-medium text-muted-foreground">Uptime</div>
              </div>
              <div className="text-xl font-bold text-foreground">{formatUptime(stats.uptime)}</div>
            </div>
          </div>

          {/* Performance Issues */}
          {performanceStatus.issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Issues</div>
              <div className="space-y-1">
                {performanceStatus.issues.map((issue, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Metrics Chart (Simple) */}
          {!compact && recentMetrics.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Recent Activity</div>
              <div className="h-8 flex items-end gap-1">
                {recentMetrics.map((metric, index) => {
                  const height = Math.max(2, (metric.memoryUsage / stats.maxMemoryUsage) * 32);
                  return (
                    <div
                      key={index}
                      className="bg-primary/20 rounded-sm flex-1"
                      style={{ height: `${height}px` }}
                      title={`Memory: ${formatBytes(metric.memoryUsage)} | Time: ${metric.processingTime}ms`}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Memory usage over time
              </div>
            </div>
          )}

          {/* Actions */}
          {(onClearMetrics || onOptimizeMemory) && (
            <div className="pt-2 border-t">
              <div className="flex gap-2">
                {onOptimizeMemory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOptimizeMemory}
                    className="flex-1 gap-1 text-xs"
                  >
                    <Zap className="w-3 h-3" />
                    Optimize Memory
                  </Button>
                )}
                
                {onClearMetrics && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearMetrics}
                    className="text-xs"
                  >
                    Clear History
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

PerformanceDashboard.displayName = "PerformanceDashboard";

export { PerformanceDashboard }