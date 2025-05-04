/**
 * Configuration for tracking providers
 * Each provider has:
 * - name: Display name
 * - description: Brief description of the tracking service
 * - patterns: Array of URL patterns (strings or RegExp) to match
 * - category: Type of tracking (analytics, ads, remarketing, etc.)
 * - schema: Configuration for how to display data in the UI
 */

// Import custom provider implementations
import { tikTokProvider, googleAdsProvider, facebookPixelProvider, googleDoubleClickProvider, googleTagManagerProvider, googleAnalyticsProvider, googleAnalytics4Provider } from './providers/customProviders.js';

export const trackingProviders = {
  // Add our custom providers
  'tiktok': tikTokProvider,
  'google-ads': googleAdsProvider,
  'facebook-pixel': facebookPixelProvider,
  'google-doubleclick': googleDoubleClickProvider,
  'google-tag-manager': googleTagManagerProvider,
  'google-analytics': googleAnalyticsProvider,
  'google-analytics-4': googleAnalytics4Provider
}; 