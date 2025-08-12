import { providerRegistry } from './provider-registry'
import { FacebookPixelProvider } from '../facebook'
import { GoogleAdsProvider } from '../google'
import { TikTokPixelProvider } from '../tiktok'

/**
 * Default provider initialization
 * Registers all built-in providers with the registry
 */

// Track initialization state
let defaultProvidersInitialized = false;

/**
 * Initialize all default providers
 */
export async function initializeDefaultProviders(): Promise<void> {
  // Prevent multiple initialization
  if (defaultProvidersInitialized) {
    return;
  }
  
  try {
    // Register Facebook Pixel provider
    const facebookPixelProvider = new FacebookPixelProvider()
    await providerRegistry.register(facebookPixelProvider, {
      enabled: true,
      priority: 95 // High priority for Facebook
    })
    
    // Register TikTok Pixel provider
    const tiktokPixelProvider = new TikTokPixelProvider()
    await providerRegistry.register(tiktokPixelProvider, {
      enabled: true,
      priority: 90 // High priority for TikTok
    })
    
    // Register Google Ads provider
    const googleAdsProvider = new GoogleAdsProvider()
    await providerRegistry.register(googleAdsProvider, {
      enabled: true,
      priority: 85 // High priority for Google Ads
    })
    
    // Mark as initialized
    defaultProvidersInitialized = true;
    
  } catch (error) {
    defaultProvidersInitialized = false;
    throw error
  }
}

/**
 * Get all registered provider instances
 */
export function getRegisteredProviders() {
  return providerRegistry.getAllProviders()
}

/**
 * Get provider registry statistics
 */
export function getProviderStats() {
  return providerRegistry.getStats()
}

/**
 * Analyze request with all registered providers
 */
export async function analyzeRequest(request: RequestData) {
  return await providerRegistry.analyze(request)
}

// Import RequestData type
import { RequestData } from '@pixeltracer/shared'