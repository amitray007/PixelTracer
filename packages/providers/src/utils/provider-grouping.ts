/**
 * Provider Grouping Utilities
 * 
 * Utilities to get parameter grouping from providers
 */

import { ParameterGroup, ParameterGroupingProvider, DefaultParameterGrouping } from '../base/parameter-group'
import { FacebookPixelProvider } from '../facebook/facebook-pixel-provider'
// import { GoogleAdsProvider } from '../google/google-ads-provider'
import { TikTokPixelProvider } from '../tiktok/tiktok-pixel-provider'

// Provider instances for grouping
const providerInstances: Record<string, ParameterGroupingProvider> = {
  'facebook-pixel': new FacebookPixelProvider(),
  // 'google-ads': new GoogleAdsProvider(), // TODO: Implement grouping interface
  'tiktok-pixel': new TikTokPixelProvider()
}

// Default grouping fallback
const defaultGrouping = new DefaultParameterGrouping()

/**
 * Get parameter grouping for a specific provider
 */
export function getProviderGrouping(providerId: string, parameters: Record<string, any>): ParameterGroup[] {
  const provider = providerInstances[providerId]
  
  if (provider && 'groupParameters' in provider) {
    return provider.groupParameters(parameters)
  }
  
  // Fallback to default grouping
  return defaultGrouping.groupParameters(parameters)
}

/**
 * Get display name for a parameter from a specific provider
 */
export function getParameterDisplayName(providerId: string, key: string): string {
  const provider = providerInstances[providerId]
  
  if (provider && 'getParameterDisplayName' in provider) {
    return provider.getParameterDisplayName(key)
  }
  
  return defaultGrouping.getParameterDisplayName(key)
}

/**
 * Get parameter description from a specific provider
 */
export function getParameterDescription(providerId: string, key: string): string | undefined {
  const provider = providerInstances[providerId]
  
  if (provider && 'getParameterDescription' in provider) {
    return provider.getParameterDescription?.(key)
  }
  
  return defaultGrouping.getParameterDescription?.(key)
}