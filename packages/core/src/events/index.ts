/**
 * Event Bus System - High-performance event-driven architecture
 */

import { 
  EventBusEvent, 
  EventBusHandler, 
  EventPriority,
  createError,
  ErrorSeverity
} from '@pixeltracer/shared';

/**
 * High-performance EventBus with priority queuing and batch processing
 * Based on Omnibug's event-driven architecture but with enhanced performance
 */
export class EventBus {
  private handlers: Map<string, Set<EventBusHandler>> = new Map();
  private priorityQueues: Map<EventPriority, EventBusEvent[]> = new Map();
  private processing = false;
  private batchSize = 50;
  private maxListeners = 100;

  constructor(options?: {
    batchSize?: number;
    maxListeners?: number;
  }) {
    if (options?.batchSize) this.batchSize = options.batchSize;
    if (options?.maxListeners) this.maxListeners = options.maxListeners;

    // Initialize priority queues
    Object.values(EventPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.priorityQueues.set(priority, []);
      }
    });
  }

  /**
   * Subscribe to events with optional handler
   */
  on<T = any>(eventType: string, handler: EventBusHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    
    // Check listener limit
    if (handlers.size >= this.maxListeners) {
      return () => {}; // Return no-op unsubscribe
    }

    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  /**
   * Subscribe to events once - auto-unsubscribe after first call
   */
  once<T = any>(eventType: string, handler: EventBusHandler<T>): () => void {
    const onceHandler = (event: EventBusEvent<T>) => {
      unsubscribe();
      return handler(event);
    };

    const unsubscribe = this.on(eventType, onceHandler);
    return unsubscribe;
  }

  /**
   * Emit event with priority queuing
   */
  emit<T = any>(
    eventType: string,
    payload: T,
    priority: EventPriority = EventPriority.NORMAL,
    source = 'unknown'
  ): void {
    const event: EventBusEvent<T> = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source,
      priority
    };

    // Add to priority queue
    const queue = this.priorityQueues.get(priority);
    if (queue) {
      queue.push(event);
    }

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process queued events with priority and batching
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.hasEvents()) {
        const batch = this.getNextBatch();
        await this.processBatch(batch);
        
        // Yield to prevent blocking
        if (batch.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Check if there are events to process
   */
  private hasEvents(): boolean {
    return Array.from(this.priorityQueues.values()).some(queue => queue.length > 0);
  }

  /**
   * Get next batch of events by priority
   */
  private getNextBatch(): EventBusEvent[] {
    const batch: EventBusEvent[] = [];
    const priorities = [EventPriority.CRITICAL, EventPriority.HIGH, EventPriority.NORMAL, EventPriority.LOW];

    for (const priority of priorities) {
      const queue = this.priorityQueues.get(priority);
      if (queue && queue.length > 0) {
        const available = Math.min(this.batchSize - batch.length, queue.length);
        batch.push(...queue.splice(0, available));
        
        if (batch.length >= this.batchSize) break;
      }
    }

    return batch;
  }

  /**
   * Process a batch of events
   */
  private async processBatch(events: EventBusEvent[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const event of events) {
      const handlers = this.handlers.get(event.type);
      if (!handlers || handlers.size === 0) continue;

      for (const handler of handlers) {
        promises.push(this.safeHandlerCall(handler, event));
      }
    }

    // Wait for all handlers in batch
    await Promise.allSettled(promises);
  }

  /**
   * Safely call event handler with error handling
   */
  private async safeHandlerCall(handler: EventBusHandler, event: EventBusEvent): Promise<void> {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      const pixelError = createError(
        'HANDLER_ERROR',
        `Event handler failed for ${event.type}: ${error}`,
        ErrorSeverity.ERROR,
        'EventBus',
        { eventType: event.type, error: String(error) }
      );
      
      // Emit error event (but don't process it if it would cause infinite loop)
      if (event.type !== 'error') {
        this.emit('error', pixelError, EventPriority.HIGH, 'EventBus');
      }
    }
  }

  /**
   * Get current stats for monitoring
   */
  getStats() {
    const queueSizes: Record<string, number> = {};
    let totalQueued = 0;
    
    this.priorityQueues.forEach((queue, priority) => {
      const size = queue.length;
      queueSizes[EventPriority[priority]] = size;
      totalQueued += size;
    });

    return {
      totalHandlers: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.size, 0),
      eventTypes: this.handlers.size,
      totalQueued,
      queueSizes,
      processing: this.processing
    };
  }

  /**
   * Clear all handlers and queues
   */
  destroy(): void {
    this.handlers.clear();
    this.priorityQueues.forEach(queue => queue.length = 0);
    this.processing = false;
  }
}

// Singleton instance for global use
export const eventBus = new EventBus();
