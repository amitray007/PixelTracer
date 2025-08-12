/**
 * Request Proxy System - High-performance Chrome webRequest integration
 */

import { 
  TrackingEvent, 
  createTrackingEvent,
  throttle,
  createError,
  ErrorSeverity,
  isExtensionContext
} from '@pixeltracer/shared';
import { EventBus } from '../events';

export interface RequestDetails {
  requestId: string;
  url: string;
  method: string;
  tabId: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  statusCode?: number;
}

export interface ProviderMatch {
  provider: string;
  providerName: string;
  confidence: number;
  eventType?: string;
  parameters: Record<string, any>;
}

export type RequestFilter = (details: RequestDetails) => boolean;
export type ProviderMatcher = (details: RequestDetails) => ProviderMatch | null;

/**
 * High-performance RequestProxy for Chrome extension webRequest interception
 * Optimized for handling high-volume tracking requests
 */
export class RequestProxy {
  private isActive = false;
  private filters: RequestFilter[] = [];
  private matchers: ProviderMatcher[] = [];
  private requestCache = new Map<string, RequestDetails>();
  private throttledEmit: (event: TrackingEvent) => void;
  private maxCacheSize = 1000;
  
  constructor(
    private eventBus: EventBus,
    options?: {
      maxCacheSize?: number;
      throttleMs?: number;
    }
  ) {
    if (options?.maxCacheSize) this.maxCacheSize = options.maxCacheSize;
    
    // Throttle event emission to prevent flooding
    this.throttledEmit = throttle(
      (event: TrackingEvent) => this.eventBus.emit('request_processed', event),
      options?.throttleMs || 50
    );
  }

  /**
   * Start intercepting Chrome webRequests
   */
  start(): boolean {
    if (!isExtensionContext()) {
      const error = createError(
        'PROXY_INVALID_CONTEXT',
        'RequestProxy can only be started in Chrome extension context',
        ErrorSeverity.ERROR,
        'RequestProxy'
      );
      this.eventBus.emit('error', error);
      return false;
    }

    if (this.isActive) {
      return true;
    }

    try {
      // Set up webRequest listeners
      chrome.webRequest.onBeforeRequest.addListener(
        this.handleBeforeRequest.bind(this),
        { urls: ['<all_urls>'] },
        ['requestBody']
      );

      chrome.webRequest.onSendHeaders.addListener(
        this.handleSendHeaders.bind(this),
        { urls: ['<all_urls>'] },
        ['requestHeaders']
      );

      chrome.webRequest.onHeadersReceived.addListener(
        this.handleHeadersReceived.bind(this),
        { urls: ['<all_urls>'] },
        ['responseHeaders']
      );

      this.isActive = true;
      this.eventBus.emit('proxy_started', { timestamp: Date.now() });
      
      return true;
    } catch (error) {
      const pixelError = createError(
        'PROXY_START_FAILED',
        `Failed to start RequestProxy: ${error}`,
        ErrorSeverity.CRITICAL,
        'RequestProxy',
        { error: String(error) }
      );
      this.eventBus.emit('error', pixelError);
      return false;
    }
  }

  /**
   * Stop intercepting requests
   */
  stop(): void {
    if (!this.isActive) return;

    if (isExtensionContext()) {
      try {
        // Note: Removing listeners requires the same function reference
        // For now, we'll let them be garbage collected
      } catch (error) {
        // Error removing webRequest listeners
      }
    }

    this.isActive = false;
    this.requestCache.clear();
    this.eventBus.emit('proxy_stopped', { timestamp: Date.now() });
  }

  /**
   * Add request filter to determine which requests to process
   */
  addFilter(filter: RequestFilter): () => void {
    this.filters.push(filter);
    
    return () => {
      const index = this.filters.indexOf(filter);
      if (index > -1) {
        this.filters.splice(index, 1);
      }
    };
  }

  /**
   * Add provider matcher for request analysis
   */
  addMatcher(matcher: ProviderMatcher): () => void {
    this.matchers.push(matcher);
    
    return () => {
      const index = this.matchers.indexOf(matcher);
      if (index > -1) {
        this.matchers.splice(index, 1);
      }
    };
  }

  /**
   * Handle onBeforeRequest
   */
  private handleBeforeRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
    try {
      const requestDetails: RequestDetails = {
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        tabId: details.tabId,
        timestamp: Date.now(),
        requestBody: this.extractRequestBody(details.requestBody as any)
      };

      // Cache request for later processing
      this.cacheRequest(requestDetails);

      // Apply filters
      if (!this.shouldProcessRequest(requestDetails)) {
        return;
      }

      // Try to match with providers immediately if we have enough data
      this.processRequest(requestDetails);
    } catch (error) {
      this.handleError('BEFORE_REQUEST_ERROR', error, { url: details.url });
    }
  }

  /**
   * Handle onSendHeaders
   */
  private handleSendHeaders(details: chrome.webRequest.WebRequestHeadersDetails): void {
    try {
      const cached = this.requestCache.get(details.requestId);
      if (cached) {
        cached.requestHeaders = this.parseHeaders(details.requestHeaders);
        this.processRequest(cached);
      }
    } catch (error) {
      this.handleError('SEND_HEADERS_ERROR', error, { url: details.url });
    }
  }

  /**
   * Handle onHeadersReceived
   */
  private handleHeadersReceived(details: chrome.webRequest.WebResponseHeadersDetails): void {
    try {
      const cached = this.requestCache.get(details.requestId);
      if (cached) {
        cached.responseHeaders = this.parseHeaders(details.responseHeaders);
        cached.statusCode = details.statusCode;
        this.processRequest(cached);
      }
    } catch (error) {
      this.handleError('HEADERS_RECEIVED_ERROR', error, { url: details.url });
    }
  }

  /**
   * Cache request details with size management
   */
  private cacheRequest(details: RequestDetails): void {
    // Manage cache size
    if (this.requestCache.size >= this.maxCacheSize) {
      const oldestKey = this.requestCache.keys().next().value;
      if (oldestKey) {
        this.requestCache.delete(oldestKey);
      }
    }

    this.requestCache.set(details.requestId, details);
  }

  /**
   * Check if request should be processed based on filters
   */
  private shouldProcessRequest(details: RequestDetails): boolean {
    if (this.filters.length === 0) return true;
    return this.filters.some(filter => filter(details));
  }

  /**
   * Process request through provider matchers
   */
  private processRequest(details: RequestDetails): void {
    for (const matcher of this.matchers) {
      try {
        const match = matcher(details);
        if (match) {
          const event = createTrackingEvent(
            match.provider,
            match.providerName,
            details.url,
            details.method,
            match.confidence,
            details.tabId,
            match.parameters,
            match.eventType
          );

          // Add request details to event
          event.requestHeaders = details.requestHeaders;
          event.responseHeaders = details.responseHeaders;
          event.requestBody = details.requestBody;
          event.statusCode = details.statusCode;

          this.throttledEmit(event);
          break; // Only match with first successful provider
        }
      } catch (error) {
        this.handleError('MATCHER_ERROR', error, { url: details.url, matcher: matcher.name });
      }
    }
  }

  /**
   * Extract request body from Chrome webRequest format
   */
  private extractRequestBody(requestBody?: chrome.webRequest.UploadData): string | undefined {
    if (!requestBody) return undefined;

    try {
      // Handle form data
      if ('formData' in requestBody && requestBody.formData) {
        const params = new URLSearchParams();
        for (const [key, values] of Object.entries(requestBody.formData)) {
          if (Array.isArray(values)) {
            for (const value of values) {
              params.append(key, String(value));
            }
          }
        }
        return params.toString();
      }

      // Handle raw data
      if ('raw' in requestBody && requestBody.raw && Array.isArray(requestBody.raw)) {
        return requestBody.raw
          .map((data: any) => new TextDecoder().decode(data.bytes))
          .join('');
      }
    } catch (error) {
      // Failed to extract request body
    }

    return undefined;
  }

  /**
   * Parse Chrome headers format to simple object
   */
  private parseHeaders(headers?: chrome.webRequest.HttpHeader[]): Record<string, string> {
    if (!headers) return {};
    
    const result: Record<string, string> = {};
    for (const header of headers) {
      if (header.name && header.value) {
        result[header.name.toLowerCase()] = header.value;
      }
    }
    return result;
  }

  /**
   * Handle errors with proper logging
   */
  private handleError(code: string, error: any, context?: Record<string, any>): void {
    const pixelError = createError(
      code,
      `RequestProxy error: ${error}`,
      ErrorSeverity.ERROR,
      'RequestProxy',
      { ...context, error: String(error) }
    );
    this.eventBus.emit('error', pixelError);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      active: this.isActive,
      filtersCount: this.filters.length,
      matchersCount: this.matchers.length,
      cachedRequests: this.requestCache.size,
      maxCacheSize: this.maxCacheSize
    };
  }

  /**
   * Clear request cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}
