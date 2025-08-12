/**
 * Shared constants for PixelTracer
 */

// Extension configuration
export const EXTENSION_NAME = 'PixelTracer';
export const EXTENSION_VERSION = '2.0.0';

// Performance limits
export const DEFAULT_MAX_EVENTS_PER_TAB = 1000;
export const DEFAULT_RETENTION_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MEMORY_WARNING_THRESHOLD_MB = 50;
export const BATCH_PROCESSING_SIZE = 50;
export const THROTTLE_DELAY_MS = 100;

// Event system
export const EVENT_BUS_MAX_LISTENERS = 100;
export const EVENT_QUEUE_SIZE = 1000;

// Provider confidence levels
export const CONFIDENCE_THRESHOLD = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.8,
  PERFECT: 0.95
} as const;

// Common provider domains
export const PROVIDER_DOMAINS = {
  GOOGLE: ['google.com', 'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com', 'googleadservices.com'],
  FACEBOOK: ['facebook.com', 'facebook.net', 'connect.facebook.net'],
  TIKTOK: ['tiktok.com', 'tiktokcdn.com', 'analytics.tiktok.com'],
  LINKEDIN: ['linkedin.com', 'licdn.com'],
  TWITTER: ['twitter.com', 't.co', 'ads-twitter.com'],
} as const;

// Default UI settings
export const DEFAULT_UI_SETTINGS = {
  theme: 'auto' as const,
  compactMode: false,
  showTimestamps: true,
  groupSimilarEvents: false,
  highlightNewEvents: true
};

// Default performance settings
export const DEFAULT_PERFORMANCE_SETTINGS = {
  enableMemoryOptimization: true,
  enableBackgroundProcessing: true,
  batchSize: BATCH_PROCESSING_SIZE,
  throttleMs: THROTTLE_DELAY_MS
};
