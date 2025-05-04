/**
 * Configuration for tracking providers
 * Each provider has:
 * - name: Display name
 * - description: Brief description of the tracking service
 * - patterns: Array of URL patterns (strings or RegExp) to match
 * - category: Type of tracking (analytics, ads, remarketing, etc.)
 */
export const trackingProviders = {
  'google-analytics': {
    name: 'Google Analytics',
    description: 'Google\'s web analytics service',
    patterns: [
      'google-analytics.com',
      'analytics.google.com',
      /collect\?v=\d+(&|$)/,
      /gtag\/js\?id=G-/,
      /gtag\/js\?id=UA-/
    ],
    category: 'analytics'
  },
  'google-ads': {
    name: 'Google Ads',
    description: 'Google\'s advertising platform',
    patterns: [
      'doubleclick.net',
      'googleadservices.com',
      'googlesyndication.com',
      /pagead\/\d+\//,
      /adservice\.google\./
    ],
    category: 'ads'
  },
  'google-ads-remarketing': {
    name: 'Google Ads Remarketing',
    description: 'Google\'s remarketing tags',
    patterns: [
      'googletagmanager.com',
      /google\.com\/pagead\/\d+\/viewthroughconversion/
    ],
    category: 'remarketing'
  },
  'facebook-pixel': {
    name: 'Facebook Pixel',
    description: 'Facebook\'s tracking pixel',
    patterns: [
      'connect.facebook.net/en_US/fbevents.js',
      'facebook.com/tr',
      /facebook\.com\/tr\?id=/
    ],
    category: 'social'
  },
  'twitter-pixel': {
    name: 'Twitter Pixel',
    description: 'Twitter\'s conversion tracking',
    patterns: [
      'static.ads-twitter.com',
      't.co',
      'analytics.twitter.com'
    ],
    category: 'social'
  },
  'linkedin-insight': {
    name: 'LinkedIn Insight',
    description: 'LinkedIn\'s conversion tracking',
    patterns: [
      'linkedin.com/px',
      'linkedin.com/insight',
      'ads.linkedin.com'
    ],
    category: 'social'
  },
  'hotjar': {
    name: 'Hotjar',
    description: 'Heat maps and session recording tool',
    patterns: [
      'hotjar.com',
      'static.hotjar.com'
    ],
    category: 'analytics'
  },
  'mixpanel': {
    name: 'Mixpanel',
    description: 'Product analytics service',
    patterns: [
      'mixpanel.com',
      'api-js.mixpanel.com'
    ],
    category: 'analytics'
  }
}; 