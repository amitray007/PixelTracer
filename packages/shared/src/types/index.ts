/**
 * Shared TypeScript interfaces for PixelTracer
 * Based on Omnibug analysis and Chrome Extension architecture
 */

// Core tracking event interface
export interface TrackingEvent {
  id: string;
  timestamp: number;
  provider: string;
  providerName: string;
  providerIcon?: string;
  url: string;
  method: string;
  eventType?: string;
  accountId?: string;
  parameters: Record<string, any>;
  confidence: number;
  tabId?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  statusCode?: number;
  rawData?: Record<string, any>;
}

// Provider system interfaces
export interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  category: ProviderCategory;
  patterns: ProviderPattern[];
  enabled: boolean;
  color?: string;
  icon?: string;
}

export interface ProviderPattern {
  name: string;
  pattern: string | RegExp;
  match: 'url' | 'domain' | 'path' | 'query' | 'body';
  method?: string[];
  confidence: number;
  eventType?: string;
}

export interface ProviderResult {
  provider: string;
  providerName: string;
  confidence: number;
  eventType?: string;
  parameters: Record<string, any>;
  businessContext?: BusinessContext;
}

export interface BusinessContext {
  description: string;
  category: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  documentation?: string;
  warnings?: string[];
}

export enum ProviderCategory {
  ADVERTISING = 'advertising',
  ANALYTICS = 'analytics',
  SOCIAL = 'social',
  ECOMMERCE = 'ecommerce',
  EMAIL = 'email',
  CRM = 'crm',
  OTHER = 'other'
}

// Event Bus system
export interface EventBusEvent<T = any> {
  type: string;
  payload: T;
  timestamp: number;
  source: string;
  priority: EventPriority;
}

export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export type EventBusHandler<T = any> = (event: EventBusEvent<T>) => void | Promise<void>;

// Storage system interfaces
export interface StorageConfig {
  maxEvents: number;
  retentionTime: number; // milliseconds
  enablePersistence: boolean;
  compressionEnabled: boolean;
}

export interface StorageStats {
  totalEvents: number;
  memoryUsage: number;
  oldestEvent?: number;
  newestEvent?: number;
}

// Background-Sidepanel communication
export interface BackgroundMessage {
  type: MessageType;
  payload: any;
  tabId?: number;
  timestamp: number;
}

export enum MessageType {
  // Event streaming
  NEW_EVENT = 'new_event',
  GET_EVENTS = 'get_events',
  CLEAR_EVENTS = 'clear_events',
  
  // Tab management
  TAB_ACTIVATED = 'tab_activated',
  TAB_UPDATED = 'tab_updated',
  TAB_CLOSED = 'tab_closed',
  
  // Provider management
  UPDATE_PROVIDERS = 'update_providers',
  GET_PROVIDERS = 'get_providers',
  
  // Settings
  UPDATE_SETTINGS = 'update_settings',
  GET_SETTINGS = 'get_settings',
  
  // Performance
  GET_STATS = 'get_stats',
  MEMORY_WARNING = 'memory_warning'
}

// Settings and configuration
export interface PixelTracerSettings {
  enabled: boolean;
  maxEventsPerTab: number;
  enabledProviders: string[];
  uiSettings: UISettings;
  performanceSettings: PerformanceSettings;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showTimestamps: boolean;
  groupSimilarEvents: boolean;
  highlightNewEvents: boolean;
}

export interface PerformanceSettings {
  enableMemoryOptimization: boolean;
  enableBackgroundProcessing: boolean;
  batchSize: number;
  throttleMs: number;
}

// Error handling
export interface PixelTracerError {
  code: string;
  message: string;
  context?: Record<string, any>;
  timestamp: number;
  severity: ErrorSeverity;
  source: string;
}

export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Performance monitoring
export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  eventCount: number;
  errorCount: number;
  timestamp: number;
}

// Tab tracking
export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
  eventCount: number;
  lastActivity: number;
}
