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