/**
 * Custom tracking provider implementations
 * This file contains custom tracking provider implementations
 * that can be imported and used in the main application
 */

/**
 * TikTok Tracking Provider
 * Detects and analyzes TikTok tracking pixel events
 */
export const tikTokProvider = {
  name: 'TikTok',
  description: 'TikTok Tracking Events',
  patterns: [
    /https:\/\/analytics\.tiktok\.com\/api\/v[0-9]\/(?:track|pixel)/
  ],
  category: 'marketing',
  schema: {
    eventTypes: {
      'page_view': 'Page View',
      'ViewContent': 'View Content',
      'ClickButton': 'Click Button',
      'AddToCart': 'Add to Cart',
      'Purchase': 'Purchase',
      'CompletePayment': 'Complete Payment',
      'Subscribe': 'Subscribe'
    },
    groups: {
      'event': {
        title: 'Event',
        fields: [
          { key: 'event', label: 'Event' },
          { key: 'sdkid', label: 'SDK ID' },
          { key: 'analytics_uniq_id', label: 'Analytics Unique ID' },
          { key: 'timestamp', label: 'Timestamp' }
        ]
      },
      'context': {
        title: 'Context',
        fields: [
          { key: 'context.ad.ad_id', label: 'Ad ID' },
          { key: 'context.ad.callback', label: 'Ad Callback' },
          { key: 'context.ad.convert_id', label: 'Ad Conversion ID' },
          { key: 'context.ad.creative_id', label: 'Ad Creative ID' },
          { key: 'context.ad.idc', label: 'Ad IDC' },
          { key: 'context.ad.log_extra', label: 'Ad Log Extra' },
          { key: 'context.ad.req_id', label: 'Ad Request ID' },
          { key: 'context.library.name', label: 'Library Name' },
          { key: 'context.library.version', label: 'Library Version' },
          { key: 'context.page.referrer', label: 'Page Referrer' },
          { key: 'context.page.url', label: 'Page URL' },
          { key: 'context.pixel.code', label: 'Pixel Code' },
          { key: 'context.user.device_id', label: 'Device ID' },
          { key: 'context.user.user_id', label: 'User ID' }
        ]
      }
    },
    // Custom parsing functions for TikTok data
    parseAccount: (params, payload) => {
      if (payload && payload.context && payload.context.pixel && payload.context.pixel.code) {
        return payload.context.pixel.code;
      }
      return '';
    },
    parseEventType: (params, payload) => {
      if (payload && payload.event) {
        return payload.event;
      }
      return 'Unknown';
    }
  }
};

/**
 * Google Ads Provider
 * Detects and analyzes Google Ads conversion tracking
 */
export const googleAdsProvider = {
  name: 'Google Ads',
  description: 'Google\'s advertising platform tracking',
  patterns: [
    /\/pagead\/(?:viewthrough)conversion/
  ],
  category: 'marketing',
  schema: {
    eventTypes: {
      'conversion': 'Conversion',
      'remarketing': 'Remarketing',
      'viewthroughconversion': 'View Through Conversion'
    },
    groups: {
      'general': {
        title: 'General',
        fields: [
          { key: 'url', label: 'Page URL' },
          { key: 'tiba', label: 'Page Title' },
          { key: 'data', label: 'Event Data' },
          { key: 'label', label: 'Conversion Label' }
        ]
      }
    },
    // Custom parsing functions for Google Ads data
    parseAccount: (params, url) => {
      const pathParts = url.pathname.match(/\/([^/]+)\/(?:AW-)?(\d+)\/?$/);
      if (pathParts && pathParts[2]) {
        let account = "AW-" + pathParts[2];
        
        // Add the conversion label if available
        if (params.get('label')) {
          account += "/" + params.get('label');
        }
        
        return account;
      }
      return '';
    },
    parseEventType: (params, url) => {
      const pathParts = url.pathname.match(/\/([^/]+)\/(?:AW-)?(\d+)\/?$/);
      let requestType = '';
      
      const data = params.get('data') || '';
      const dataEvent = data.match(/event=([^;]+)(?:$|;)/);
      
      if (dataEvent && dataEvent.length) {
        if (dataEvent[1] === 'gtag.config') {
          requestType = 'Page View';
        } else {
          requestType = dataEvent[1];
        }
      } else if (pathParts && pathParts[1]) {
        requestType = (pathParts[1] === 'viewthroughconversion') ? 'Conversion' : pathParts[1].replace('viewthrough', '');
      }
      
      return requestType;
    }
  }
};

/**
 * Facebook Pixel Provider
 * Detects and analyzes Facebook Pixel tracking events
 */
export const facebookPixelProvider = {
  name: 'Facebook Pixel',
  description: 'Facebook\'s tracking pixel',
  patterns: [
    /facebook\.com\/tr\/?(?!.*&ev=microdata)\?/i
  ],
  category: 'marketing',
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
          { key: 'id', label: 'Account ID' },
          { key: 'ev', label: 'Event Type' },
          { key: 'dl', label: 'Page URL' },
          { key: 'rl', label: 'Referring URL' },
          { key: 'ts', label: 'Timestamp' },
          { key: 'ud[uid]', label: 'User ID' }
        ]
      },
      'custom': {
        title: 'Event Data',
        fields: [
          { key: 'cd[content_name]', label: 'Content Name' },
          { key: 'cd[content_category]', label: 'Content Category' },
          { key: 'cd[content_type]', label: 'Content Type' },
          { key: 'cd[num_items]', label: 'Quantity' },
          { key: 'cd[search_string]', label: 'Search Keyword' },
          { key: 'cd[status]', label: 'Registration Status' },
          { key: 'cd[value]', label: 'Value' },
          { key: 'cd[currency]', label: 'Currency' }
        ]
      },
      'products': {
        title: 'Products',
        fields: [
          { key: 'cd[content_ids]', label: 'Product IDs' }
        ]
      }
    },
    // Custom parsing functions for Facebook Pixel
    parseAccount: (params) => {
      return params.get('id') || '';
    },
    parseEventType: (params) => {
      return params.get('ev') || '';
    },
    // Custom handler for Facebook Contents data
    parseContents: (params) => {
      const content = params.get('cd[contents]');
      if (!content) return [];
      
      let results = [];
      try {
        let jsonData = JSON.parse(content);
        if (jsonData && jsonData.length) {
          let keyMapping = {
            "id": "ID",
            "item_price": "Price",
            "quantity": "Quantity"
          };
          
          jsonData.forEach((product, index) => {
            Object.entries(product).forEach(([key, value]) => {
              results.push({
                key: `cd[contents][${index}][${key}]`,
                field: `Product ${index+1} ${keyMapping[key] || key}`,
                value: value,
                group: 'products'
              });
            });
          });
        }
      } catch(e) {
        // Not valid JSON, add as is
        results.push({
          key: 'cd[contents]',
          field: 'Content',
          value: content,
          group: 'products'
        });
      }
      
      return results;
    }
  }
};

/**
 * Google DoubleClick Provider
 * Detects and analyzes Google DoubleClick tracking events
 */
export const googleDoubleClickProvider = {
  name: 'Google DoubleClick',
  description: 'Google\'s advertising and marketing platform',
  patterns: [
    /(?:fls|ad)\.doubleclick\.net\/activityi(?!.*dc_pre);/
  ],
  category: 'marketing',
  schema: {
    eventTypes: {
      'transactions': 'Transactions',
      'items_sold': 'Items Sold',
      'unique': 'Unique',
      'standard': 'Standard',
      'per_session': 'Per Session'
    },
    groups: {
      'general': {
        title: 'General',
        fields: [
          { key: 'src', label: 'Account ID' },
          { key: 'type', label: 'Activity Group' },
          { key: 'cat', label: 'Activity Tag' },
          { key: 'cost', label: 'Value' },
          { key: 'qty', label: 'Quantity' },
          { key: 'ord', label: 'Transaction ID' },
          { key: 'countingMethod', label: 'Counting Method' },
          { key: '~oref', label: 'Page URL' }
        ]
      },
      'custom': {
        title: 'Custom Fields',
        fields: []
      },
      'other': {
        title: 'Other Settings',
        fields: [
          { key: 'num', label: 'Request Cache Buster' },
          { key: 'dc_lat', label: 'Limit Ad Tracking' },
          { key: 'tag_for_child_directed_treatment', label: 'COPPA Request' },
          { key: 'tfua', label: 'User Underage' },
          { key: 'npa', label: 'Opt-out of Remarketing' }
        ]
      }
    },
    // Custom parsing functions for Google DoubleClick
    parseAccount: (params) => {
      let account = "DC-" + params.get('src');
      // Add the type & category if available
      if (params.get('type') && params.get('cat')) {
        account += "/" + params.get('type') + "/" + params.get('cat');
      }
      return account;
    },
    parseEventType: (params) => {
      const ord = params.get('ord');
      if (params.get('qty')) {
        return 'transactions / items_sold';
      } else if (ord) {
        return (ord === "1") ? 'unique' : 'standard';
      }
      return 'per_session';
    }
  }
};

/**
 * Google Tag Manager Provider
 * Detects Google Tag Manager implementations
 */
export const googleTagManagerProvider = {
  name: 'Google Tag Manager',
  description: 'Google\'s tag management system',
  patterns: [
    /googletagmanager\.com\/gtm\.js/
  ],
  category: 'tagmanager',
  schema: {
    eventTypes: {
      'Library Load': 'Library Load'
    },
    groups: {
      'general': {
        title: 'General',
        fields: [
          { key: 'id', label: 'Account ID' },
          { key: 'l', label: 'Data Layer Variable' }
        ]
      }
    },
    // Custom parsing functions for GTM
    parseAccount: (params) => {
      return params.get('id') || '';
    },
    parseEventType: () => {
      return 'Library Load';
    }
  }
};

/**
 * Google Universal Analytics Provider
 * Detects and analyzes Google Universal Analytics tracking
 */
export const googleAnalyticsProvider = {
  name: 'Google Universal Analytics',
  description: 'Google\'s web analytics service (Universal Analytics)',
  patterns: [
    /(?:\.google-analytics|analytics\.google)\.com\/([^g]\/)?collect(?:[/#?]+(?!.*consentMode=)|$)/
  ],
  category: 'analytics',
  schema: {
    eventTypes: {
      'pageview': 'Page View',
      'screenview': 'Screen View',
      'event': 'Event',
      'transaction': 'Transaction',
      'item': 'Item',
      'social': 'Social',
      'exception': 'Exception',
      'timing': 'Timing'
    },
    groups: {
      'general': {
        title: 'General',
        fields: [
          { key: 'v', label: 'Protocol Version' },
          { key: 'tid', label: 'Tracking ID' },
          { key: 'aip', label: 'Anonymize IP' },
          { key: 'cid', label: 'Client ID' },
          { key: 'dl', label: 'Document Location URL' },
          { key: 'dh', label: 'Document Host Name' },
          { key: 'dp', label: 'Document Path' },
          { key: 'dt', label: 'Document Title' },
          { key: 'dr', label: 'Document Referrer' },
          { key: 'ul', label: 'User Language' },
          { key: 'sr', label: 'Screen Resolution' },
          { key: 'vp', label: 'Viewport Size' }
        ]
      },
      'events': {
        title: 'Events',
        fields: [
          { key: 'ec', label: 'Event Category' },
          { key: 'ea', label: 'Event Action' },
          { key: 'el', label: 'Event Label' },
          { key: 'ev', label: 'Event Value' },
          { key: 'ni', label: 'Non-Interaction Hit' }
        ]
      },
      'ecommerce': {
        title: 'Ecommerce',
        fields: [
          { key: 'ti', label: 'Transaction ID' },
          { key: 'ta', label: 'Transaction Affiliation' },
          { key: 'tr', label: 'Transaction Revenue' },
          { key: 'ts', label: 'Transaction Shipping' },
          { key: 'tt', label: 'Transaction Tax' },
          { key: 'cu', label: 'Currency Code' },
          { key: 'in', label: 'Item Name' },
          { key: 'ip', label: 'Item Price' },
          { key: 'iq', label: 'Item Quantity' },
          { key: 'ic', label: 'Item Code' },
          { key: 'iv', label: 'Item Category' }
        ]
      },
      'campaign': {
        title: 'Campaign',
        fields: [
          { key: 'cn', label: 'Campaign Name' },
          { key: 'cs', label: 'Campaign Source' },
          { key: 'cm', label: 'Campaign Medium' },
          { key: 'ck', label: 'Campaign Keyword' },
          { key: 'cc', label: 'Campaign Content' },
          { key: 'ci', label: 'Campaign ID' },
          { key: 'gclid', label: 'Google AdWords ID' },
          { key: 'dclid', label: 'Google Display Ads ID' }
        ]
      }
    },
    // Custom parsing functions for UA
    parseAccount: (params) => {
      return params.get('tid') || '';
    },
    parseEventType: (params) => {
      return params.get('t') || params.get('en') || 'pageview';
    }
  }
};

/**
 * Google Analytics 4 Provider
 * Detects and analyzes Google Analytics 4 tracking
 */
export const googleAnalytics4Provider = {
  name: 'Google Analytics 4',
  description: 'Google\'s next generation analytics service (GA4)',
  patterns: [
    /https?:\/\/([^/]+)(?<!(clarity\.ms|transcend\.io)|(\.doubleclick\.net))\/g\/collect(?:[/#?]|$)/
  ],
  category: 'analytics',
  schema: {
    eventTypes: {
      'page_view': 'Page View',
      'screen_view': 'Screen View',
      'event': 'Event',
      'purchase': 'Purchase',
      'refund': 'Refund',
      'add_payment_info': 'Add Payment Info',
      'add_shipping_info': 'Add Shipping Info',
      'add_to_cart': 'Add to Cart',
      'remove_from_cart': 'Remove from Cart',
      'begin_checkout': 'Begin Checkout',
      'view_item': 'View Item',
      'view_item_list': 'View Item List',
      'view_promotion': 'View Promotion',
      'select_promotion': 'Select Promotion',
      'select_item': 'Select Item'
    },
    groups: {
      'general': {
        title: 'General',
        fields: [
          { key: 'v', label: 'Protocol Version' },
          { key: 'tid', label: 'Tracking ID' },
          { key: 'cid', label: 'Client ID' },
          { key: 'dl', label: 'Document Location URL' },
          { key: 'dh', label: 'Document Host Name' },
          { key: 'dp', label: 'Document Path' },
          { key: 'dt', label: 'Document Title' },
          { key: 'dr', label: 'Document Referrer' },
          { key: 'ul', label: 'User Language' },
          { key: 'sr', label: 'Screen Resolution' },
          { key: 'vp', label: 'Viewport Size' }
        ]
      },
      'events': {
        title: 'Events',
        fields: [
          { key: 'ep.event_param_key', label: 'Event Parameter' },
          { key: 'ep.value', label: 'Event Value' },
          { key: 'ni', label: 'Non-Interaction Hit' }
        ]
      },
      'ecommerce': {
        title: 'Ecommerce',
        fields: [
          { key: 'ep.transaction_id', label: 'Transaction ID' },
          { key: 'ep.value', label: 'Transaction Value' },
          { key: 'ep.currency', label: 'Currency Code' },
          { key: 'ep.items', label: 'Items' }
        ]
      },
      'campaign': {
        title: 'Campaign',
        fields: [
          { key: 'cn', label: 'Campaign Name' },
          { key: 'cs', label: 'Campaign Source' },
          { key: 'cm', label: 'Campaign Medium' },
          { key: 'ck', label: 'Campaign Keyword' },
          { key: 'cc', label: 'Campaign Content' },
          { key: 'ci', label: 'Campaign ID' },
          { key: 'gclid', label: 'Google AdWords ID' }
        ]
      }
    },
    // Custom parsing functions for GA4
    parseAccount: (params) => {
      return params.get('tid') || params.get('measurement_id') || '';
    },
    parseEventType: (params, payload) => {
      if (payload && payload.events && payload.events[0] && payload.events[0].name) {
        return payload.events[0].name;
      }
      return params.get('en') || 'page_view';
    }
  }
}; 