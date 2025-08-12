/**
 * Comprehensive Logging and Error Handling System
 */

import { 
  PixelTracerError, 
  ErrorSeverity, 
  PerformanceMetrics
} from '@pixeltracer/shared';
import { EventBus } from '../events';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  source: string;
  context?: Record<string, any>;
  error?: Error;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * Centralized logging system with performance monitoring
 */
export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel = LogLevel.INFO;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(
    private eventBus: EventBus,
    options?: {
      maxLogs?: number;
      logLevel?: LogLevel;
    }
  ) {
    if (options?.maxLogs) this.maxLogs = options.maxLogs;
    if (options?.logLevel !== undefined) this.logLevel = options.logLevel;

    // Subscribe to error events
    this.eventBus.on('error', this.handleErrorEvent.bind(this));
  }

  /**
   * Debug level logging
   */
  debug(message: string, source = 'Unknown', context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, source, context);
  }

  /**
   * Info level logging
   */
  info(message: string, source = 'Unknown', context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, source, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, source = 'Unknown', context?: Record<string, any>): void {
    this.log(LogLevel.WARNING, message, source, context);
  }

  /**
   * Error level logging
   */
  error(message: string, source = 'Unknown', context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, source, context, error);
  }

  /**
   * Critical level logging
   */
  critical(message: string, source = 'Unknown', context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, source, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel, 
    message: string, 
    source: string, 
    context?: Record<string, any>, 
    error?: Error
  ): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      message,
      source,
      context,
      error
    };

    // Add to memory log
    this.logs.push(entry);

    // Manage memory usage
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output for development
    this.outputToConsole(entry);

    // Emit log event
    this.eventBus.emit('log_entry', entry);

    // For critical errors, also emit a separate critical event
    if (level === LogLevel.CRITICAL) {
      this.eventBus.emit('critical_error', {
        entry,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle error events from EventBus
   */
  private handleErrorEvent(event: any): void {
    const error: PixelTracerError = event.payload;
    
    const severity = this.mapErrorSeverityToLogLevel(error.severity);
    this.log(
      severity,
      error.message,
      error.source,
      { code: error.code, ...error.context },
      error instanceof Error ? error : undefined
    );
  }

  /**
   * Map error severity to log level
   */
  private mapErrorSeverityToLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.DEBUG: return LogLevel.DEBUG;
      case ErrorSeverity.INFO: return LogLevel.INFO;
      case ErrorSeverity.WARNING: return LogLevel.WARNING;
      case ErrorSeverity.ERROR: return LogLevel.ERROR;
      case ErrorSeverity.CRITICAL: return LogLevel.CRITICAL;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Output log entry to console with appropriate formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${time}] [${LogLevel[entry.level]}] [${entry.source}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context || '');
        break;
      case LogLevel.WARNING:
        console.warn(prefix, entry.message, entry.context || '', entry.error || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.context || '', entry.error || '');
        break;
      case LogLevel.CRITICAL:
        console.error(
          `🚨 ${prefix}`, 
          entry.message, 
          entry.context || '', 
          entry.error || ''
        );
        break;
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.performanceMetrics.push(fullMetrics);

    // Keep only recent metrics (last 100 entries)
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics.shift();
    }

    // Log performance warnings
    if (metrics.processingTime > 100) { // > 100ms
      this.warn('Slow processing detected', 'PerformanceMonitor', {
        processingTime: metrics.processingTime,
        eventCount: metrics.eventCount
      });
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) { // > 50MB
      this.warn('High memory usage detected', 'PerformanceMonitor', {
        memoryUsage: metrics.memoryUsage,
        eventCount: metrics.eventCount
      });
    }

    this.eventBus.emit('performance_recorded', fullMetrics);
  }

  /**
   * Get recent log entries
   */
  getLogs(options?: {
    level?: LogLevel;
    source?: string;
    limit?: number;
    since?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    // Apply filters
    if (options?.level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= options.level!);
    }

    if (options?.source) {
      filteredLogs = filteredLogs.filter(log => 
        log.source.toLowerCase().includes(options.source!.toLowerCase())
      );
    }

    if (options?.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.since!);
    }

    // Apply limit
    if (options?.limit) {
      filteredLogs = filteredLogs.slice(-options.limit);
    }

    return filteredLogs;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(limit?: number): PerformanceMetrics[] {
    return limit ? this.performanceMetrics.slice(-limit) : [...this.performanceMetrics];
  }

  /**
   * Get aggregated performance stats
   */
  getPerformanceStats(): {
    avgProcessingTime: number;
    maxProcessingTime: number;
    avgMemoryUsage: number;
    maxMemoryUsage: number;
    totalEvents: number;
    totalErrors: number;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        avgProcessingTime: 0,
        maxProcessingTime: 0,
        avgMemoryUsage: 0,
        maxMemoryUsage: 0,
        totalEvents: 0,
        totalErrors: 0
      };
    }

    const processingTimes = this.performanceMetrics.map(m => m.processingTime);
    const memoryUsages = this.performanceMetrics.map(m => m.memoryUsage);
    const eventCounts = this.performanceMetrics.map(m => m.eventCount);
    const errorCounts = this.performanceMetrics.map(m => m.errorCount);

    return {
      avgProcessingTime: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
      maxProcessingTime: Math.max(...processingTimes),
      avgMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      maxMemoryUsage: Math.max(...memoryUsages),
      totalEvents: eventCounts.reduce((a, b) => a + b, 0),
      totalErrors: errorCounts.reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Clear logs and metrics
   */
  clear(): void {
    this.logs.length = 0;
    this.performanceMetrics.length = 0;
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${LogLevel[level]}`, 'Logger');
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

/**
 * Error boundary decorator for methods
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  originalMethod: T,
  source: string,
  logger?: Logger
): T {
  const log = logger || globalLogger;
  
  return (function(this: any, ...args: any[]) {
    try {
      const result = originalMethod.apply(this, args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch(error => {
          log.error(
            `Async method ${originalMethod.name} failed`,
            source,
            { args: args.length },
            error
          );
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      log.error(
        `Method ${originalMethod.name} failed`,
        source,
        { args: args.length },
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }) as any as T;
}

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  originalMethod: T,
  _source: string,
  logger?: Logger
): T {
  const log = logger || globalLogger;
  
  return (function(this: any, ...args: any[]) {
    const startTime = performance.now();
    
    try {
      const result = originalMethod.apply(this, args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
          
          log.recordPerformance({
            processingTime: endTime - startTime,
            memoryUsage: endMemory,
            eventCount: 1,
            errorCount: 0
          });
        });
      }
      
      // Handle sync functions
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      log.recordPerformance({
        processingTime: endTime - startTime,
        memoryUsage: endMemory,
        eventCount: 1,
        errorCount: 0
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      log.recordPerformance({
        processingTime: endTime - startTime,
        memoryUsage: endMemory,
        eventCount: 1,
        errorCount: 1
      });
      
      throw error;
    }
  }) as any as T;
}

// Global logger instance - initialized with dummy EventBus for now
const dummyEventBus = {
  on: () => () => {},
  emit: () => {}
} as any as EventBus;

export const globalLogger = new Logger(dummyEventBus);