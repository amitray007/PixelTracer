/**
 * Shared utilities for PixelTracer  
 */

import { TrackingEvent, PixelTracerError, ErrorSeverity } from '../types';

/**
 * Generate a unique ID for tracking events
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a standardized tracking event
 */
export function createTrackingEvent(
  provider: string,
  providerName: string,
  url: string,
  method: string,
  confidence: number,
  tabId: number,
  parameters: Record<string, any> = {},
  eventType?: string
): TrackingEvent {
  return {
    id: generateEventId(),
    timestamp: Date.now(),
    provider,
    providerName,
    url,
    method,
    eventType,
    parameters,
    confidence,
    tabId
  };
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if a URL matches any domain in a list
 */
export function matchesDomain(url: string, domains: readonly string[]): boolean {
  const domain = extractDomain(url);
  return domains.some(d => domain.includes(d) || d.includes(domain));
}

/**
 * Parse query string parameters from URL
 */
export function parseQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  } catch {
    return {};
  }
}

/**
 * Parse URL-encoded form data
 */
export function parseFormData(body: string): Record<string, any> {
  if (!body) return {};
  
  try {
    const params = new URLSearchParams(body);
    const result: Record<string, any> = {};
    
    for (const [key, value] of params.entries()) {
      // Try to parse JSON values
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    }
    
    return result;
  } catch {
    return {};
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(text: string, fallback: any = null): any {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format timestamp to human readable time
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Create a standardized error object
 */
export function createError(
  code: string,
  message: string,
  severity: ErrorSeverity,
  source: string,
  context?: Record<string, any>
): PixelTracerError {
  return {
    code,
    message,
    context,
    timestamp: Date.now(),
    severity,
    source
  };
}

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

/**
 * Check if code is running in Chrome extension context
 */
export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

/**
 * Validate provider confidence score
 */
export function validateConfidence(confidence: number): number {
  return Math.max(0, Math.min(1, confidence));
}
