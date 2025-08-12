/**
 * Core Engine for PixelTracer
 * 
 * Orchestrates all core systems: EventBus, RequestProxy, StorageEngine, and Logger
 * Based on Omnibug analysis but enhanced with performance and reliability features
 */

import { 
  PixelTracerSettings,
  DEFAULT_UI_SETTINGS,
  DEFAULT_PERFORMANCE_SETTINGS,
  TrackingEvent,
  EventBusEvent
} from '@pixeltracer/shared';
import { EventBus } from '../events';
import { RequestProxy, ProviderMatcher } from '../proxy';
import { StorageEngine } from '../storage';
import { Logger, globalLogger } from '../logging';

export interface CoreEngineStats {
  eventBus: ReturnType<EventBus['getStats']>;
  requestProxy: ReturnType<RequestProxy['getStats']>;
  storage: ReturnType<StorageEngine['getStats']>;
  performance: ReturnType<Logger['getPerformanceStats']>;
  uptime: number;
  version: string;
}

/**
 * Main orchestrator for all PixelTracer core systems
 */
export class CoreEngine {
  private eventBus: EventBus;
  private requestProxy: RequestProxy;
  private storage: StorageEngine;
  private logger: Logger;
  private startTime: number;
  private isRunning = false;

  private settings: PixelTracerSettings = {
    enabled: true,
    maxEventsPerTab: 1000,
    enabledProviders: [],
    uiSettings: DEFAULT_UI_SETTINGS,
    performanceSettings: DEFAULT_PERFORMANCE_SETTINGS
  };

  constructor(options?: {
    customEventBus?: EventBus;
    customLogger?: Logger;
    initialSettings?: Partial<PixelTracerSettings>;
  }) {
    this.startTime = Date.now();
    
    // Initialize systems
    this.logger = options?.customLogger || globalLogger;
    this.eventBus = options?.customEventBus || new EventBus();
    this.requestProxy = new RequestProxy(this.eventBus);
    this.storage = new StorageEngine(this.eventBus);

    // Apply initial settings
    if (options?.initialSettings) {
      this.updateSettings(options.initialSettings);
    }

    this.setupEventHandlers();
    this.logger.info('CoreEngine initialized', 'CoreEngine', { version: '2.0.0' });
  }

  /**
   * Start the core engine and all subsystems
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      this.logger.warn('CoreEngine already running', 'CoreEngine');
      return true;
    }

    try {
      this.logger.info('Starting CoreEngine', 'CoreEngine');

      // Start request proxy
      const proxyStarted = this.requestProxy.start();
      if (!proxyStarted) {
        throw new Error('Failed to start RequestProxy');
      }

      this.isRunning = true;
      this.eventBus.emit('core_engine_started', { timestamp: Date.now() });
      
      this.logger.info('CoreEngine started successfully', 'CoreEngine');
      return true;

    } catch (error) {
      this.logger.error('Failed to start CoreEngine', 'CoreEngine', {}, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Stop the core engine and cleanup
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.logger.info('Stopping CoreEngine', 'CoreEngine');

      // Stop request proxy
      this.requestProxy.stop();

      // Destroy storage engine
      this.storage.destroy();

      this.isRunning = false;
      this.eventBus.emit('core_engine_stopped', { timestamp: Date.now() });
      
      this.logger.info('CoreEngine stopped successfully', 'CoreEngine');

    } catch (error) {
      this.logger.error('Error stopping CoreEngine', 'CoreEngine', {}, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Add a provider matcher to the request proxy
   */
  addProviderMatcher(matcher: ProviderMatcher): () => void {
    this.logger.debug('Adding provider matcher', 'CoreEngine');
    return this.requestProxy.addMatcher(matcher);
  }

  /**
   * Get events for a specific tab
   */
  getEvents(tabId: number, options?: Parameters<StorageEngine['getEvents']>[1]): TrackingEvent[] {
    return this.storage.getEvents(tabId, options);
  }

  /**
   * Get all events across all tabs
   */
  getAllEvents(options?: Parameters<StorageEngine['getAllEvents']>[0]): TrackingEvent[] {
    return this.storage.getAllEvents(options);
  }

  /**
   * Clear events for a specific tab
   */
  clearTab(tabId: number): void {
    this.storage.clearTab(tabId);
    this.logger.info(`Cleared events for tab ${tabId}`, 'CoreEngine');
  }

  /**
   * Clear all events
   */
  clearAll(): void {
    this.storage.clearAll();
    this.logger.info('Cleared all events', 'CoreEngine');
  }

  /**
   * Update engine settings
   */
  updateSettings(newSettings: Partial<PixelTracerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.logger.info('Settings updated', 'CoreEngine', { settings: newSettings });
    this.eventBus.emit('settings_updated', this.settings);
  }

  /**
   * Get current settings
   */
  getSettings(): PixelTracerSettings {
    return { ...this.settings };
  }

  /**
   * Get comprehensive engine statistics
   */
  getStats(): CoreEngineStats {
    return {
      eventBus: this.eventBus.getStats(),
      requestProxy: this.requestProxy.getStats(),
      storage: this.storage.getStats(),
      performance: this.logger.getPerformanceStats(),
      uptime: Date.now() - this.startTime,
      version: '2.0.0'
    };
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const stats = this.getStats();

    // Check memory usage
    if (stats.storage.memoryUsage > 50 * 1024 * 1024) { // > 50MB
      issues.push('High memory usage detected');
      recommendations.push('Consider clearing old events or reducing retention time');
    }

    // Check error rate
    if (stats.performance.totalErrors > stats.performance.totalEvents * 0.05) { // > 5% error rate
      issues.push('High error rate detected');
      recommendations.push('Check browser console for error details');
    }

    // Check processing performance
    if (stats.performance.avgProcessingTime > 100) { // > 100ms average
      issues.push('Slow processing performance');
      recommendations.push('Consider enabling performance optimizations in settings');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'degraded';
    }

    return { status, issues, recommendations };
  }

  /**
   * Export events for debugging or analysis
   */
  exportEvents(options?: {
    tabId?: number;
    format?: 'json' | 'csv';
    includeHeaders?: boolean;
  }): string {
    const events = options?.tabId 
      ? this.storage.getEvents(options.tabId)
      : this.storage.getAllEvents();

    if (options?.format === 'csv') {
      return this.exportToCsv(events, options.includeHeaders);
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Setup event handlers for system coordination
   */
  private setupEventHandlers(): void {
    // Handle processed requests from proxy
    this.eventBus.on('request_processed', (event: EventBusEvent) => {
      const trackingEvent = event.payload as TrackingEvent;
      
      // Store event if tracking is enabled
      if (this.settings.enabled) {
        this.storage.storeEvent(trackingEvent);
      }
      
      // Record performance metrics
      this.logger.recordPerformance({
        processingTime: Date.now() - trackingEvent.timestamp,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        eventCount: 1,
        errorCount: 0
      });
    });

    // Handle storage events
    this.eventBus.on('event_stored', (event: EventBusEvent) => {
      this.logger.debug('Event stored', 'CoreEngine', event.payload);
    });

    // Handle errors
    this.eventBus.on('error', (event: EventBusEvent) => {
      this.logger.error('System error', 'CoreEngine', event.payload);
    });

    // Handle memory warnings
    this.eventBus.on('memory_warning', (event: EventBusEvent) => {
      this.logger.warn('Memory warning', 'CoreEngine', event.payload);
      
      // Auto-cleanup if memory optimization is enabled
      if (this.settings.performanceSettings.enableMemoryOptimization) {
        this.performEmergencyCleanup();
      }
    });
  }

  /**
   * Perform emergency cleanup to free memory
   */
  private performEmergencyCleanup(): void {
    this.logger.info('Performing emergency cleanup', 'CoreEngine');
    
    // Clear old events
    const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
    const allTabInfos = this.storage.getAllTabInfos();
    
    for (const tabInfo of allTabInfos) {
      if (tabInfo.lastActivity < cutoffTime) {
        this.storage.clearTab(tabInfo.id);
      }
    }

    // Clear request proxy cache
    this.requestProxy.clearCache();
    
    // Clear old logs
    this.logger.clear();

    this.eventBus.emit('emergency_cleanup_performed', { timestamp: Date.now() });
  }

  /**
   * Export events to CSV format
   */
  private exportToCsv(events: TrackingEvent[], includeHeaders = true): string {
    if (events.length === 0) return '';

    const headers = [
      'timestamp', 'provider', 'providerName', 'url', 'method', 
      'eventType', 'confidence', 'tabId', 'parameters'
    ];

    const rows: string[] = [];
    
    if (includeHeaders) {
      rows.push(headers.join(','));
    }

    for (const event of events) {
      const row = [
        new Date(event.timestamp).toISOString(),
        `"${event.provider}"`,
        `"${event.providerName}"`,
        `"${event.url}"`,
        `"${event.method}"`,
        `"${event.eventType || ''}"`,
        event.confidence.toString(),
        (event.tabId ?? 0).toString(),
        `"${JSON.stringify(event.parameters).replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Get the EventBus instance for direct access
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get the Logger instance for direct access
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Check if engine is running
   */
  isEngineRunning(): boolean {
    return this.isRunning;
  }
}

// Global engine instance for convenience
export let coreEngine: CoreEngine | null = null;

/**
 * Initialize global core engine
 */
export function initializeCoreEngine(options?: ConstructorParameters<typeof CoreEngine>[0]): CoreEngine {
  if (coreEngine) {
    return coreEngine;
  }

  coreEngine = new CoreEngine(options);
  return coreEngine;
}

/**
 * Get global core engine instance
 */
export function getCoreEngine(): CoreEngine {
  if (!coreEngine) {
    throw new Error('CoreEngine not initialized. Call initializeCoreEngine() first.');
  }
  return coreEngine;
}
