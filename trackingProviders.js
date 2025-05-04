/**
 * Configuration for tracking providers
 * Each provider has:
 * - name: Display name
 * - description: Brief description of the tracking service
 * - patterns: Array of URL patterns (strings or RegExp) to match
 * - category: Type of tracking (analytics, ads, remarketing, etc.)
 * - schema: Configuration for how to display data in the UI
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
    category: 'analytics',
    schema: {
      // Maps event types to display names
      eventTypes: {
        'pageview': 'Page View',
        'event': 'Event',
        'transaction': 'Transaction',
        'item': 'Item',
        'social': 'Social',
        'exception': 'Exception',
        'timing': 'Timing',
        'screenview': 'Screen View'
      },
      // Groups to display in the UI
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'tid', label: 'Tracking ID' },
            { key: 'v', label: 'Protocol Version' },
            { key: 'cid', label: 'Client ID' }
          ]
        },
        'event': {
          title: 'Event Details',
          fields: [
            { key: 'ea', label: 'Event Action' },
            { key: 'ec', label: 'Event Category' },
            { key: 'el', label: 'Event Label' },
            { key: 'ev', label: 'Event Value' }
          ]
        },
        'page': {
          title: 'Page Data',
          fields: [
            { key: 'dl', label: 'Document Location' },
            { key: 'dp', label: 'Document Path' },
            { key: 'dt', label: 'Document Title' },
            { key: 'dh', label: 'Document Host' }
          ]
        },
        'user': {
          title: 'User Data',
          fields: [
            { key: 'uid', label: 'User ID' },
            { key: 'uip', label: 'IP Override' },
            { key: 'ua', label: 'User Agent' },
            { key: 'ul', label: 'User Language' }
          ]
        }
      }
    }
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
    category: 'ads',
    schema: {
      eventTypes: {
        'conversion': 'Conversion',
        'remarketing': 'Remarketing',
        'view': 'View',
        'click': 'Click'
      },
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'cv', label: 'Conversion ID' },
            { key: 'guid', label: 'GUID' },
            { key: 'random', label: 'Random' }
          ]
        },
        'conversion': {
          title: 'Conversion Data',
          fields: [
            { key: 'value', label: 'Value' },
            { key: 'currency_code', label: 'Currency' },
            { key: 'label', label: 'Label' }
          ]
        }
      }
    }
  },
  'google-ads-remarketing': {
    name: 'Google Ads Remarketing',
    description: 'Google\'s remarketing tags',
    patterns: [
      'googletagmanager.com',
      /google\.com\/pagead\/\d+\/viewthroughconversion/
    ],
    category: 'remarketing',
    schema: {
      eventTypes: {
        'remarketing': 'Remarketing',
        'view': 'Page View'
      },
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'id', label: 'Conversion ID' },
            { key: 'tag_for_child_directed_treatment', label: 'Child Directed' },
            { key: 'send_to', label: 'Send To' }
          ]
        }
      }
    }
  },
  'facebook-pixel': {
    name: 'Facebook Pixel',
    description: 'Facebook\'s tracking pixel',
    patterns: [
      'connect.facebook.net/en_US/fbevents.js',
      'facebook.com/tr',
      /facebook\.com\/tr\?id=/
    ],
    category: 'social',
    schema: {
      eventTypes: {
        'PageView': 'Page View',
        'ViewContent': 'View Content',
        'AddToCart': 'Add to Cart',
        'Purchase': 'Purchase',
        'Lead': 'Lead',
        'CompleteRegistration': 'Registration'
      },
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'id', label: 'Pixel ID' },
            { key: 'ev', label: 'Event Value' }
          ]
        },
        'event': {
          title: 'Event Data',
          fields: [
            { key: 'cd', label: 'Content IDs' },
            { key: 'em', label: 'Email Hash' },
            { key: 'ph', label: 'Phone Hash' },
            { key: 'fn', label: 'First Name Hash' }
          ]
        }
      }
    }
  },
  'twitter-pixel': {
    name: 'Twitter Pixel',
    description: 'Twitter\'s conversion tracking',
    patterns: [
      'static.ads-twitter.com',
      't.co',
      'analytics.twitter.com'
    ],
    category: 'social',
    schema: {
      eventTypes: {
        'tw-pageview': 'Page View',
        'pageview': 'Page View',
        'purchase': 'Purchase'
      },
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'txn_id', label: 'Transaction ID' },
            { key: 'tw_sale_amount', label: 'Sale Amount' },
            { key: 'tw_order_quantity', label: 'Order Quantity' }
          ]
        }
      }
    }
  },
  'linkedin-insight': {
    name: 'LinkedIn Insight',
    description: 'LinkedIn\'s conversion tracking',
    patterns: [
      'linkedin.com/px',
      'linkedin.com/insight',
      'ads.linkedin.com'
    ],
    category: 'social',
    schema: {
      eventTypes: {
        'pageview': 'Page View',
        'conversion': 'Conversion'
      },
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'pid', label: 'Partner ID' },
            { key: 'conversionId', label: 'Conversion ID' },
            { key: 'fmt', label: 'Format' }
          ]
        }
      }
    }
  },
  'hotjar': {
    name: 'Hotjar',
    description: 'Heat maps and session recording tool',
    patterns: [
      'hotjar.com',
      'static.hotjar.com'
    ],
    category: 'analytics',
    schema: {
      eventTypes: {
        'pageview': 'Page View',
        'recording': 'Recording'
      },
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'site_id', label: 'Site ID' },
            { key: 'rec_value', label: 'Recording' }
          ]
        }
      }
    }
  },
  'mixpanel': {
    name: 'Mixpanel',
    description: 'Product analytics service',
    patterns: [
      'mixpanel.com',
      'api-js.mixpanel.com'
    ],
    category: 'analytics',
    schema: {
      eventTypes: {
        'track': 'Track Event',
        'page': 'Page View',
        'identify': 'Identify'
      },
      groups: {
        'general': {
          title: 'General',
          fields: [
            { key: 'project', label: 'Project ID' },
            { key: 'event', label: 'Event Name' }
          ]
        }
      }
    }
  }
}; 