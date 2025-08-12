/**
 * Provider Metadata Registry
 * Central configuration for provider display information and metadata
 */


export interface ProviderMetadata {
  id: string
  name: string
  displayName: string
  category: string
  website?: string
  supported: boolean
  iconType: 'facebook' | 'tiktok' | 'google' | 'default'
}

/**
 * Provider metadata registry
 * Maps provider keys to their display information and configuration
 */
export const PROVIDER_METADATA: Record<string, ProviderMetadata> = {
  // Facebook variants
  'facebook': {
    id: 'facebook',
    name: 'Facebook Pixel',
    displayName: 'Facebook Pixel',
    category: 'advertising',
    website: 'https://developers.facebook.com/docs/facebook-pixel',
    supported: true,
    iconType: 'facebook'
  },
  'meta': {
    id: 'meta',
    name: 'Facebook Pixel',
    displayName: 'Facebook Pixel',
    category: 'advertising',
    website: 'https://developers.facebook.com/docs/facebook-pixel',
    supported: true,
    iconType: 'facebook'
  },
  'facebookpixel': {
    id: 'facebookpixel',
    name: 'Facebook Pixel',
    displayName: 'Facebook Pixel',
    category: 'advertising',
    website: 'https://developers.facebook.com/docs/facebook-pixel',
    supported: true,
    iconType: 'facebook'
  },
  'facebook-pixel': {
    id: 'facebook-pixel',
    name: 'Facebook Pixel',
    displayName: 'Facebook Pixel',
    category: 'advertising',
    website: 'https://developers.facebook.com/docs/facebook-pixel',
    supported: true,
    iconType: 'facebook'
  },

  // TikTok variants
  'tiktok': {
    id: 'tiktok',
    name: 'TikTok Pixel',
    displayName: 'TikTok',
    category: 'advertising',
    website: 'https://ads.tiktok.com/marketing_api/docs',
    supported: true,
    iconType: 'tiktok'
  },
  'tiktok-pixel': {
    id: 'tiktok-pixel',
    name: 'TikTok Pixel',
    displayName: 'TikTok',
    category: 'advertising',
    website: 'https://ads.tiktok.com/marketing_api/docs',
    supported: true,
    iconType: 'tiktok'
  },

  // Google Ads variants
  'google-ads': {
    id: 'google-ads',
    name: 'Google Ads',
    displayName: 'Google Ads',
    category: 'advertising',
    website: 'https://support.google.com/google-ads/answer/1722022',
    supported: true,
    iconType: 'google'
  },
  'googleads': {
    id: 'googleads',
    name: 'Google Ads',
    displayName: 'Google Ads',
    category: 'advertising',
    website: 'https://support.google.com/google-ads/answer/1722022',
    supported: true,
    iconType: 'google'
  },
  'google': {
    id: 'google',
    name: 'Google Ads',
    displayName: 'Google Ads',
    category: 'advertising',
    website: 'https://support.google.com/google-ads/answer/1722022',
    supported: true,
    iconType: 'google'
  }
}

/**
 * Get provider metadata by provider key
 */
export function getProviderMetadata(providerKey: string): ProviderMetadata {
  const normalizedKey = providerKey.toLowerCase().replace(/[-_\s]/g, '')
  
  // Try exact match first
  if (PROVIDER_METADATA[providerKey]) {
    return PROVIDER_METADATA[providerKey]
  }
  
  // Try normalized key
  if (PROVIDER_METADATA[normalizedKey]) {
    return PROVIDER_METADATA[normalizedKey]
  }
  
  // Try partial matches
  for (const [key, metadata] of Object.entries(PROVIDER_METADATA)) {
    if (key.includes(normalizedKey) || normalizedKey.includes(key)) {
      return metadata
    }
  }
  
  // Return default for unknown providers
  return {
    id: providerKey,
    name: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
    displayName: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
    category: 'other',
    supported: false,
    iconType: 'default'
  }
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): ProviderMetadata[] {
  return Object.values(PROVIDER_METADATA)
    .filter(provider => provider.supported)
    .filter((provider, index, self) => 
      // Remove duplicates by displayName
      self.findIndex(p => p.displayName === provider.displayName) === index
    )
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(providerKey: string): string {
  return getProviderMetadata(providerKey).displayName
}

/**
 * Get provider icon type
 */
export function getProviderIconType(providerKey: string): 'facebook' | 'tiktok' | 'google' | 'default' {
  return getProviderMetadata(providerKey).iconType
}

/**
 * Check if provider is supported
 */
export function isProviderSupported(providerKey: string): boolean {
  return getProviderMetadata(providerKey).supported
}