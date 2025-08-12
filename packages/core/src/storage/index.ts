/**
 * Storage Engine - Multi-tier storage with smart memory management
 */

import { 
  TrackingEvent, 
  StorageConfig, 
  StorageStats,
  TabInfo,
  DEFAULT_MAX_EVENTS_PER_TAB,
  DEFAULT_RETENTION_TIME_MS,
  deepClone,
  createError,
  ErrorSeverity
} from '@pixeltracer/shared';
import { EventBus } from '../events';

/**
 * Multi-tier storage strategy:
 * 1. Memory - Fast access for recent events (1000 events max per tab)
 * 2. Session Storage - Medium-term storage for current session
 * 3. IndexedDB - Long-term persistence (optional, configurable)
 */
export class StorageEngine {
  private memoryStorage = new Map<number, TrackingEvent[]>(); // tabId -> events
  private tabInfos = new Map<number, TabInfo>(); // tabId -> tab info
  private config: Required<StorageConfig>;
  private cleanupIntervalId?: NodeJS.Timeout;
  private totalMemoryUsage = 0;

  constructor(
    private eventBus: EventBus,
    config?: Partial<StorageConfig>
  ) {
    this.config = {
      maxEvents: config?.maxEvents || DEFAULT_MAX_EVENTS_PER_TAB,
      retentionTime: config?.retentionTime || DEFAULT_RETENTION_TIME_MS,
      enablePersistence: config?.enablePersistence ?? false,
      compressionEnabled: config?.compressionEnabled ?? false
    };

    this.startCleanupTimer();
  }

  /**
   * Store a tracking event with automatic tier management
   */
  async storeEvent(event: TrackingEvent): Promise<void> {
    try {
      const tabId = event.tabId ?? 0;
      
      // Get or create tab events array
      if (!this.memoryStorage.has(tabId)) {
        this.memoryStorage.set(tabId, []);
        this.tabInfos.set(tabId, this.createTabInfo(tabId));
      }

      const tabEvents = this.memoryStorage.get(tabId)!;
      const tabInfo = this.tabInfos.get(tabId)!;

      // Add event to memory storage
      tabEvents.push(event);
      tabInfo.eventCount++;
      tabInfo.lastActivity = event.timestamp;

      // Update memory usage estimate
      this.totalMemoryUsage += this.estimateEventSize(event);

      // Manage memory limits
      await this.manageLimits(tabId, tabEvents);

      // Emit storage event
      this.eventBus.emit('event_stored', { tabId, eventId: event.id });

    } catch (error) {
      const pixelError = createError(
        'STORAGE_STORE_ERROR',
        `Failed to store event: ${error}`,
        ErrorSeverity.ERROR,
        'StorageEngine',
        { eventId: event.id, tabId: event.tabId ?? 0, error: String(error) }
      );
      this.eventBus.emit('error', pixelError);
    }
  }

  /**
   * Get events for a specific tab with optional filtering
   */
  getEvents(
    tabId: number,
    options?: {
      limit?: number;
      offset?: number;
      provider?: string;
      since?: number;
    }
  ): TrackingEvent[] {
    const tabEvents = this.memoryStorage.get(tabId) || [];
    let filteredEvents = tabEvents;

    // Apply filters
    if (options?.provider) {
      filteredEvents = filteredEvents.filter(e => e.provider === options.provider);
    }

    if (options?.since) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= options.since!);
    }

    // Apply pagination
    const start = options?.offset || 0;
    const end = options?.limit ? start + options.limit : undefined;

    return filteredEvents.slice(start, end).map(event => deepClone(event));
  }

  /**
   * Get all events across all tabs
   */
  getAllEvents(options?: {
    limit?: number;
    provider?: string;
    since?: number;
  }): TrackingEvent[] {
    const allEvents: TrackingEvent[] = [];
    
    for (const tabEvents of this.memoryStorage.values()) {
      allEvents.push(...tabEvents);
    }

    // Sort by timestamp (newest first)
    allEvents.sort((a, b) => b.timestamp - a.timestamp);

    let filteredEvents = allEvents;

    // Apply filters
    if (options?.provider) {
      filteredEvents = filteredEvents.filter(e => e.provider === options.provider);
    }

    if (options?.since) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= options.since!);
    }

    // Apply limit
    if (options?.limit) {
      filteredEvents = filteredEvents.slice(0, options.limit);
    }

    return filteredEvents.map(event => deepClone(event));
  }

  /**
   * Clear events for a specific tab
   */
  clearTab(tabId: number): void {
    const tabEvents = this.memoryStorage.get(tabId);
    if (tabEvents) {
      // Update memory usage
      for (const event of tabEvents) {
        this.totalMemoryUsage -= this.estimateEventSize(event);
      }

      this.memoryStorage.delete(tabId);
      this.tabInfos.delete(tabId);

      this.eventBus.emit('tab_cleared', { tabId });
    }
  }

  /**
   * Clear all events
   */
  clearAll(): void {
    this.memoryStorage.clear();
    this.tabInfos.clear();
    this.totalMemoryUsage = 0;
    this.eventBus.emit('storage_cleared', { timestamp: Date.now() });
  }

  /**
   * Get storage statistics
   */
  getStats(): StorageStats {
    let totalEvents = 0;
    let oldestEvent: number | undefined;
    let newestEvent: number | undefined;

    for (const tabEvents of this.memoryStorage.values()) {
      totalEvents += tabEvents.length;

      if (tabEvents.length > 0) {
        const firstEvent = tabEvents[0].timestamp;
        const lastEvent = tabEvents[tabEvents.length - 1].timestamp;

        oldestEvent = oldestEvent ? Math.min(oldestEvent, firstEvent) : firstEvent;
        newestEvent = newestEvent ? Math.max(newestEvent, lastEvent) : lastEvent;
      }
    }

    return {
      totalEvents,
      memoryUsage: this.totalMemoryUsage,
      oldestEvent,
      newestEvent
    };
  }

  /**
   * Get tab information
   */
  getTabInfo(tabId: number): TabInfo | undefined {
    return this.tabInfos.get(tabId);
  }

  /**
   * Get all tab information
   */
  getAllTabInfos(): TabInfo[] {
    return Array.from(this.tabInfos.values());
  }

  /**
   * Update tab information
   */
  updateTabInfo(tabId: number, updates: Partial<TabInfo>): void {
    const tabInfo = this.tabInfos.get(tabId);
    if (tabInfo) {
      Object.assign(tabInfo, updates);
    }
  }

  /**
   * Manage storage limits and cleanup
   */
  private async manageLimits(tabId: number, tabEvents: TrackingEvent[]): Promise<void> {
    // Limit events per tab
    while (tabEvents.length > this.config.maxEvents) {
      const removedEvent = tabEvents.shift();
      if (removedEvent) {
        this.totalMemoryUsage -= this.estimateEventSize(removedEvent);
      }
    }

    // Move old events to session storage if persistence is enabled
    if (this.config.enablePersistence) {
      await this.moveToSessionStorage(tabId, tabEvents);
    }
  }

  /**
   * Move events to session storage for longer retention
   */
  private async moveToSessionStorage(tabId: number, tabEvents: TrackingEvent[]): Promise<void> {
    if (!this.isStorageAvailable()) return;

    try {
      const cutoffTime = Date.now() - (this.config.retentionTime / 2); // Move older events
      const eventsToMove = tabEvents.filter(e => e.timestamp < cutoffTime);

      if (eventsToMove.length > 0) {
        const sessionKey = `pixeltracer_events_${tabId}`;
        const existingData = sessionStorage.getItem(sessionKey);
        const existingEvents: TrackingEvent[] = existingData ? JSON.parse(existingData) : [];

        // Add new events and sort by timestamp
        const allEvents = [...existingEvents, ...eventsToMove].sort((a, b) => a.timestamp - b.timestamp);

        // Store in session storage
        sessionStorage.setItem(sessionKey, JSON.stringify(allEvents));

        // Remove from memory
        for (let i = tabEvents.length - 1; i >= 0; i--) {
          if (eventsToMove.includes(tabEvents[i])) {
            const removed = tabEvents.splice(i, 1)[0];
            this.totalMemoryUsage -= this.estimateEventSize(removed);
          }
        }
      }
    } catch (error) {
      // Failed to move events to session storage
    }
  }

  /**
   * Start cleanup timer for old events
   */
  private startCleanupTimer(): void {
    // Run cleanup every 5 minutes
    this.cleanupIntervalId = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Perform cleanup of old events
   */
  private performCleanup(): void {
    const cutoffTime = Date.now() - this.config.retentionTime;
    let cleanedCount = 0;

    for (const [tabId, tabEvents] of this.memoryStorage.entries()) {
      for (let i = tabEvents.length - 1; i >= 0; i--) {
        if (tabEvents[i].timestamp < cutoffTime) {
          const removed = tabEvents.splice(i, 1)[0];
          this.totalMemoryUsage -= this.estimateEventSize(removed);
          cleanedCount++;
        }
      }

      // Remove empty tabs
      if (tabEvents.length === 0) {
        this.memoryStorage.delete(tabId);
        this.tabInfos.delete(tabId);
      }
    }

    // Clean session storage as well
    this.cleanupSessionStorage();

    if (cleanedCount > 0) {
      this.eventBus.emit('cleanup_performed', { 
        cleanedEvents: cleanedCount, 
        timestamp: Date.now() 
      });
    }
  }

  /**
   * Clean up old session storage data
   */
  private cleanupSessionStorage(): void {
    if (!this.isStorageAvailable()) return;

    try {
      const cutoffTime = Date.now() - this.config.retentionTime;

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('pixeltracer_events_')) {
          const data = sessionStorage.getItem(key);
          if (data) {
            const events: TrackingEvent[] = JSON.parse(data);
            const filteredEvents = events.filter(e => e.timestamp >= cutoffTime);

            if (filteredEvents.length !== events.length) {
              if (filteredEvents.length === 0) {
                sessionStorage.removeItem(key);
              } else {
                sessionStorage.setItem(key, JSON.stringify(filteredEvents));
              }
            }
          }
        }
      }
    } catch (error) {
      // Failed to cleanup session storage
    }
  }

  /**
   * Estimate memory usage of an event
   */
  private estimateEventSize(event: TrackingEvent): number {
    // Rough estimate: JSON size + object overhead
    return JSON.stringify(event).length * 2 + 200; // bytes
  }

  /**
   * Create tab info object
   */
  private createTabInfo(tabId: number): TabInfo {
    return {
      id: tabId,
      url: '',
      title: '',
      active: false,
      eventCount: 0,
      lastActivity: Date.now()
    };
  }

  /**
   * Check if storage APIs are available
   */
  private isStorageAvailable(): boolean {
    try {
      return typeof Storage !== 'undefined' && !!sessionStorage;
    } catch {
      return false;
    }
  }

  /**
   * Destroy storage engine and cleanup
   */
  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    this.clearAll();
  }
}
