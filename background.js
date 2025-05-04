// Define providers directly in the background script
// rather than using ES module imports
const trackingProviders = {
  // TikTok Provider
  'tiktok': {
    name: 'TikTok',
    description: 'TikTok Tracking Events',
    patterns: [
      /https:\/\/analytics\.tiktok\.com\/api\/v[0-9]\/(?:track|pixel)/
    ],
    methods: ['POST'],
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
  },

  // Google Ads Provider
  'google-ads': {
    name: 'Google Ads',
    description: 'Google\'s advertising platform tracking',
    patterns: [
      /\/pagead\/(?:viewthrough)conversion/
    ],
    methods: ['GET', 'POST'],
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
  },

  // Facebook Pixel Provider
  'facebook-pixel': {
    name: 'Facebook Pixel',
    description: 'Facebook\'s tracking pixel',
    patterns: [
      /facebook\.com\/tr\/?(?!.*&ev=microdata)\?/i
    ],
    methods: ['GET', 'POST'],
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
  },

  // Standard Google Analytics
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
    methods: ['GET', 'POST'],
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
        }
      }
    }
  },

  // AdNabu (Google Ads) Provider
  'adnabu-google-ads': {
    name: 'AdNabu (Google Ads)',
    description: 'AdNabu\'s Google Ads server-side tracking',
    patterns: [
      /https?:\/\/gcads-event-relay\.adnabu\.com\/.*/
    ],
    methods: ['POST'],
    category: 'marketing',
    schema: {
      eventTypes: {
        'add_to_cart': 'Add to Cart',
        'purchase': 'Purchase',
        'initiate_checkout': 'Begin Checkout',
        'page_view': 'Page View',
      },
      groups: {
        'event': {
          title: 'Event',
          fields: [
            { key: 'event_id', label: 'Event ID' },
            { key: 'event_name', label: 'Event Name' },
            { key: 'conversion_id', label: 'Conversion ID' },
            { key: 'conversion_label', label: 'Conversion Label' },
            { key: 'value', label: 'Value' },
            { key: 'currency', label: 'Currency' }
          ]
        },
        'page': {
          title: 'Page Data',
          fields: [
            { key: 'page_hostname', label: 'Hostname' },
            { key: 'page_location', label: 'Page URL' },
            { key: 'page_path', label: 'Page Path' },
            { key: 'page_title', label: 'Page Title' },
            { key: 'page_referrer', label: 'Referrer' }
          ]
        },
        'user': {
          title: 'User Data',
          fields: [
            { key: 'client_id', label: 'Client ID' },
            { key: 'language', label: 'Language' },
            { key: 'ip_override', label: 'IP Address' },
            { key: 'user_agent', label: 'User Agent' },
            { key: 'viewport_size', label: 'Viewport Size' },
            { key: 'screen_resolution', label: 'Screen Resolution' }
          ]
        },
        'shop': {
          title: 'Shop Data',
          fields: [
            { key: 'shopify_shop', label: 'Shopify Shop' }
          ]
        }
      },
      // Custom parsing functions for AdNabu data
      parseAccount: (params, url, payload) => {
        if (payload && Array.isArray(payload) && payload.length > 0) {
          const firstEvent = payload[0];
          if (firstEvent.conversion_id && firstEvent.conversion_label) {
            return `${firstEvent.conversion_id}/${firstEvent.conversion_label}`;
          } else if (firstEvent.conversion_id) {
            return firstEvent.conversion_id;
          }
        }
        return '';
      },
      parseEventType: (params, url, payload) => {
        if (payload && Array.isArray(payload) && payload.length > 0) {
          return payload[0].event_name || 'Unknown';
        }
        return 'Unknown';
      },
      // Special parsing function to handle the array of events
      parsePayloadEvents: (payload) => {
        if (!payload || !Array.isArray(payload)) return [];
        
        // We'll extract all events and their data
        const eventData = [];
        
        payload.forEach((event, index) => {
          if (index === 0) return; // First event is already handled by main display
          
          // Create a title for this additional event
          eventData.push({
            key: `event_${index}_title`,
            field: `Event ${index+1}`,
            value: `${event.event_name || 'Unknown'} (${event.conversion_id || 'Unknown ID'})`,
            group: 'event'
          });
          
          // Add more detailed information for each event
          if (event.event_name) {
            eventData.push({
              key: `event_${index}_name`,
              field: `Event ${index+1} Type`,
              value: event.event_name,
              group: 'event'
            });
          }
          
          if (event.event_id) {
            eventData.push({
              key: `event_${index}_id`,
              field: `Event ${index+1} ID`,
              value: event.event_id,
              group: 'event'
            });
          }
          
          if (event.conversion_id) {
            eventData.push({
              key: `event_${index}_conversion_id`,
              field: `Event ${index+1} Conversion ID`,
              value: event.conversion_id,
              group: 'event'
            });
          }
          
          if (event.conversion_label) {
            eventData.push({
              key: `event_${index}_conversion_label`,
              field: `Event ${index+1} Conversion Label`,
              value: event.conversion_label,
              group: 'event'
            });
          }
          
          if (event.value) {
            eventData.push({
              key: `event_${index}_value`,
              field: `Event ${index+1} Value`,
              value: event.value,
              group: 'event'
            });
          }
          
          if (event.currency) {
            eventData.push({
              key: `event_${index}_currency`,
              field: `Event ${index+1} Currency`,
              value: event.currency,
              group: 'event'
            });
          }
          
          // Add ecommerce data if present
          if (event.items && Array.isArray(event.items) && event.items.length > 0) {
            // Add a header for items
            eventData.push({
              key: `event_${index}_items_header`,
              field: `Event ${index+1} Items`,
              value: `${event.items.length} item(s)`,
              group: 'event'
            });
            
            // Add details for each item
            event.items.forEach((item, itemIndex) => {
              if (item.item_id || item.id) {
                eventData.push({
                  key: `event_${index}_item_${itemIndex}_id`,
                  field: `Event ${index+1} Item ${itemIndex+1} ID`,
                  value: item.item_id || item.id,
                  group: 'event'
                });
              }
              
              if (item.item_name) {
                eventData.push({
                  key: `event_${index}_item_${itemIndex}_name`,
                  field: `Event ${index+1} Item ${itemIndex+1} Name`,
                  value: item.item_name,
                  group: 'event'
                });
              }
              
              if (item.price) {
                eventData.push({
                  key: `event_${index}_item_${itemIndex}_price`,
                  field: `Event ${index+1} Item ${itemIndex+1} Price`,
                  value: item.price,
                  group: 'event'
                });
              }
              
              if (item.quantity) {
                eventData.push({
                  key: `event_${index}_item_${itemIndex}_quantity`,
                  field: `Event ${index+1} Item ${itemIndex+1} Quantity`,
                  value: item.quantity,
                  group: 'event'
                });
              }
            });
          }
          
          // Add any additional custom parameters for this event
          Object.entries(event).forEach(([key, value]) => {
            // Skip the properties we've already explicitly added
            if (['event_name', 'event_id', 'conversion_id', 'conversion_label', 'value', 'currency', 'items'].includes(key)) {
              return;
            }
            
            // Skip empty, null, or undefined values
            if (value === null || value === undefined || value === '') {
              return;
            }
            
            // Skip object values that we can't display properly
            if (typeof value === 'object' && !Array.isArray(value)) {
              return;
            }
            
            // Add this parameter to the event data
            eventData.push({
              key: `event_${index}_param_${key}`,
              field: `Event ${index+1} ${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
              value: Array.isArray(value) ? JSON.stringify(value) : value,
              group: 'event'
            });
          });
        });
        
        return eventData;
      }
    }
  },
};

// In-memory tracking data store to ensure consistency between popup and content script
const trackingDataStore = {
  // Tabs data indexed by tabId
  tabs: {},
  
  // Flag to track if data has been loaded from storage
  dataLoaded: false,
  
  // Add a new tracking request
  addRequest(tabId, request) {
    // Make sure we've loaded data from storage first
    if (!this.dataLoaded) {
      this.loadFromStorage();
    }
    
    if (!this.tabs[tabId]) {
      this.tabs[tabId] = [];
    }
    
    // Check if this request already exists (based on requestId)
    const existingIndex = this.tabs[tabId].findIndex(r => r.requestId === request.requestId);
    
    if (existingIndex >= 0) {
      // Update existing request
      this.tabs[tabId][existingIndex] = request;
    } else {
      // Add the request to the array (at the beginning for chronological order)
      this.tabs[tabId].unshift(request);
    }
    
    // Also update the storage for persistence
    this.saveToStorage();
    
    return request;
  },
  
  // Get all requests for a tab
  getTabRequests(tabId) {
    // First make sure we've loaded data from storage
    if (!this.dataLoaded) {
      this.loadFromStorage();
    }
    
    // If still no data, return empty array
    if (!this.tabs[tabId] || this.tabs[tabId].length === 0) {
      this.tabs[tabId] = [];
      
      // Try to load data directly from storage as a fallback
      chrome.storage.local.get(['trackedRequests'], (result) => {
        if (result.trackedRequests && result.trackedRequests[tabId]) {
          this.tabs[tabId] = result.trackedRequests[tabId];
        }
      });
    }
    return this.tabs[tabId] || [];
  },
  
  // Get requests for a tab filtered by current page load time
  getCurrentPageRequests(tabId, hostname) {
    // Ensure we have the latest data
    return new Promise((resolve) => {
      // Force a fresh load from storage to ensure we have the latest data
      chrome.storage.local.get(['trackedRequests'], (result) => {
        if (result.trackedRequests) {
          this.tabs = result.trackedRequests;
          this.dataLoaded = true;
        }
        
        // Try to get data for this tab
        const requests = this.tabs[tabId] || [];
        
        if (requests.length === 0) {
          resolve([]);
          return;
        }
        
        // Get the appropriate page load time
        const pageLoadTime = this.findPageOpenTime(requests, hostname) || (Date.now() - 60000);
        
        // Filter requests by page load time
        const filteredRequests = requests.filter(req => req.timestamp >= pageLoadTime);
        resolve(filteredRequests);
      });
    });
  },
  
  // Find the page load time using the same logic used in the popup and content script
  findPageOpenTime(requests, hostname) {
    if (requests.length === 0) return null;
    
    // Sort by timestamp (oldest first)
    const sortedRequests = [...requests].sort((a, b) => a.timestamp - b.timestamp);
    
    // Try to find a page navigation request
    for (const request of sortedRequests) {
      if (request.host === hostname && 
          (request.path === '/' || request.url.includes('html') || request.url.includes('htm'))) {
        return request.timestamp;
      }
    }
    
    // Look for gaps in timestamps
    let lastTime = 0;
    for (let i = 0; i < sortedRequests.length; i++) {
      const request = sortedRequests[i];
      if (request.host === hostname) {
        if (lastTime > 0 && (request.timestamp - lastTime > 30000)) {
          return request.timestamp;
        }
        lastTime = request.timestamp;
      }
    }
    
    // Default to first request for this hostname
    for (const request of sortedRequests) {
      if (request.host === hostname) {
        return request.timestamp;
      }
    }
    
    return null;
  },
  
  // Clear data for a specific tab
  clearTabData(tabId) {
    if (this.tabs[tabId]) {
      delete this.tabs[tabId];
      // Immediately save changes to storage to ensure persistence
      this.saveToStorage();
      return true;
    }
    return false;
  },
  
  // Clear data for a tab and specific hostname (useful for page refreshes)
  clearTabDataForHostname(tabId, hostname) {
    if (!this.tabs[tabId]) return false;
    
    // Filter out requests from the specified hostname
    this.tabs[tabId] = this.tabs[tabId].filter(req => req.host !== hostname);
    
    // Save changes immediately
    this.saveToStorage();
    return true;
  },
  
  // Handle data cleared event
  handleDataCleared(tabId) {
    if (tabId) {
      this.clearTabData(tabId);
      return true;
    }
    return false;
  },
  
  // Clear all tracking data
  clearAllData() {
    this.tabs = {};
    this.saveToStorage();
    return true;
  },
  
  // Load data from storage (called at extension startup)
  loadFromStorage() {
    chrome.storage.local.get(['trackedRequests'], (result) => {
      if (result.trackedRequests) {
        this.tabs = result.trackedRequests;
        this.dataLoaded = true;
      } else {
        this.tabs = {};
        this.dataLoaded = true;
      }
    });
  },
  
  // Save data to storage
  saveToStorage() {
    chrome.storage.local.set({ trackedRequests: this.tabs });
  }
};

// Default settings initialization
function initializeDefaultSettings() {
  chrome.storage.local.get(['pixelTracerSettings', 'pixelTracerTheme'], (result) => {
    // Initialize settings if they don't exist
    if (!result.pixelTracerSettings) {
      chrome.storage.local.set({
        pixelTracerSettings: {
          liveViewEnabled: false
        }
      });
    }
    
    // Initialize theme if it doesn't exist (default to light)
    if (!result.pixelTracerTheme) {
      chrome.storage.local.set({
        pixelTracerTheme: 'light'
      });
    }
  });
}

// Add an event listener for when the extension is activated (e.g., popup opened)
chrome.runtime.onStartup.addListener(() => {
  trackingDataStore.loadFromStorage();
});

// Load tracking data when extension starts
trackingDataStore.loadFromStorage();
initializeDefaultSettings();

// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(() => {
  trackingDataStore.clearAllData();
  initializeDefaultSettings();
});

// Listen for tab updates (including refreshes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If the page is refreshed (loading started)
  if (changeInfo.status === 'loading' && tab.url) {
    try {
      // Get the hostname
      const hostname = new URL(tab.url).hostname;
      
      // Clear data for this tab completely on refresh/navigation
      trackingDataStore.clearTabData(tabId);
      
      // Notify content script if it's already loaded
      chrome.tabs.sendMessage(tabId, { 
        action: 'pageRefreshed',
        hostname: hostname,
        completeReset: true
      }).catch(() => {
        // Ignore errors - content script may not be loaded yet
      });
    } catch (e) {
      // Invalid URL or other error, ignore
    }
  } 
  
  // When content is fully loaded, check if we need to wake up the content script
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    
    // Check if Live View is enabled globally
    chrome.storage.local.get(['pixelTracerSettings'], (result) => {
      const settings = result.pixelTracerSettings || {};
      
      // If Live View is enabled, make sure content script is aware
      if (settings.liveViewEnabled) {
        // First make sure we have the latest data loaded
        trackingDataStore.loadFromStorage();
        
        // Send a wake-up message to the content script
        setTimeout(() => {
          // Force a complete refresh of Live View data
          chrome.tabs.sendMessage(tabId, {
            action: 'forceRefreshLiveView'
          }).catch(() => {
            // If we can't send the message directly, try sending a regular refresh
            chrome.tabs.sendMessage(tabId, {
              action: 'refreshTracking'
            }).catch(() => {
              // Ignore errors - content script may just not be ready
            });
          });
        }, 1000); // Wait 1 second to ensure content script is fully loaded
      }
    });
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  // Clear data for the closed tab
  trackingDataStore.clearTabData(tabId);
});

// Listen for network requests
chrome.webRequest.onBeforeRequest.addListener(
  analyzeRequest,
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onSendHeaders.addListener(
  captureRequestHeaders,
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

chrome.webRequest.onCompleted.addListener(
  analyzeResponse,
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Add a message listener for ping messages (used by content scripts to check connection)
  if (message.action === 'ping') {
    sendResponse({ success: true, alive: true });
    return false; // Don't need to keep the messaging channel open
  }
  
  // Handle getProviderInfo request
  if (message.action === 'getProviderInfo') {
    const providerId = message.providerId;
    
    // If requesting all providers, send the entire object
    if (providerId === 'all') {
      sendResponse({ success: true, allProviders: trackingProviders });
      return true;
    }
    
    // Otherwise send just the requested provider
    const provider = trackingProviders[providerId];
    
    if (provider) {
      sendResponse({ success: true, provider });
    } else {
      sendResponse({ success: false, error: 'Provider not found' });
    }
    
    return true; // Keep the message channel open for asynchronous response
  }
  
  // Handle getCurrentTabInfo request from content script
  if (message.action === 'getCurrentTabInfo') {
    // If the message came from a content script, we can use sender.tab
    if (sender.tab) {
      sendResponse({
        tabId: sender.tab.id,
        url: sender.tab.url,
        title: sender.tab.title
      });
      return true;
    }
    
    // If it came from popup or elsewhere, we need to query for the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        sendResponse({
          tabId: tabs[0].id,
          url: tabs[0].url,
          title: tabs[0].title
        });
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    
    return true; // Keep the message channel open for asynchronous response
  }
  
  // Handle getTrackingData request
  if (message.action === 'getTrackingData') {
    const tabId = message.tabId;
    const hostname = message.hostname;
    
    if (tabId && hostname) {
      // Get filtered requests for the current page load
      trackingDataStore.getCurrentPageRequests(tabId, hostname).then(requests => {
        sendResponse({ success: true, requests });
      });
      return true; // indicate we will respond asynchronously
    } else {
      sendResponse({ success: false, error: 'Invalid parameters' });
      return true;
    }
  }
  
  // Handle dataCleared event
  if (message.action === 'dataCleared') {
    const tabId = message.tabId;
    
    if (tabId) {
      // Use the new helper method to clear tab data
      const cleared = trackingDataStore.handleDataCleared(tabId);
      
      // Notify content script
      chrome.tabs.sendMessage(tabId, { 
        action: 'trackingDataCleared',
        complete: true
      }).catch(() => {
        // Ignore errors - content script may not be ready
      });
      
      sendResponse({ success: cleared });
    } else {
      sendResponse({ success: false, error: 'Invalid tab ID' });
    }
    
    return true;
  }
  
  // Handle liveViewClosed event
  if (message.action === 'liveViewClosed') {
    // Update global setting
    chrome.storage.local.get(['pixelTracerSettings'], (result) => {
      const settings = result.pixelTracerSettings || {};
      settings.liveViewEnabled = false;
      chrome.storage.local.set({ pixelTracerSettings: settings });
    });
    
    return true;
  }
  
  // Handle exportToCSV event
  if (message.action === 'exportToCSV') {
    const tabId = message.tabId;
    const hostname = message.hostname;
    
    if (tabId && hostname) {
      // Get filtered requests for the current page load
      const requests = trackingDataStore.getCurrentPageRequests(tabId, hostname);
      
      if (requests && requests.length > 0) {
        // Generate CSV
        const csvData = generateCSV(requests);
        sendResponse({ success: true, csvData });
      } else {
        sendResponse({ success: false, error: 'No tracking data to export' });
      }
    } else {
      sendResponse({ success: false, error: 'Invalid parameters' });
    }
    
    return true;
  }
  
  // Handle themeChanged message from popup
  if (message.action === 'themeChanged') {
    // Store the theme preference
    chrome.storage.local.set({ pixelTracerTheme: message.theme });
    
    // Notify all tabs about the theme change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        // Skip the sender tab as it already knows
        if (sender.tab && sender.tab.id === tab.id) return;
        
        // Only send to http/https pages
        if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'themeChanged',
            theme: message.theme
          }).catch(() => {
            // Ignore errors - content script may not be loaded on this tab
          });
        }
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  return false; // No async response needed
});

// Store headers temporarily until we can associate them with a request
const headersCache = new Map();

/**
 * Captures request headers for later analysis
 * @param {object} details - Request details including headers
 */
function captureRequestHeaders(details) {
  if (details.tabId < 0) return; // Ignore requests not associated with a tab
  
  // Store headers in cache with requestId as key
  headersCache.set(details.requestId, {
    requestId: details.requestId,
    headers: details.requestHeaders,
    timestamp: Date.now()
  });
  
  // Clean up old entries (older than 1 minute)
  const cutoff = Date.now() - 60000;
  for (const [key, value] of headersCache.entries()) {
    if (value.timestamp < cutoff) {
      headersCache.delete(key);
    }
  }
}

/**
 * Analyzes a network request to identify tracking providers
 * @param {object} details - Request details from the webRequest API
 */
function analyzeRequest(details) {
  const url = details.url;
  const method = details.method;
  const tabId = details.tabId;
  const requestId = details.requestId;
  
  if (tabId < 0) return; // Ignore requests not associated with a tab
  
  const matchedProviders = identifyTrackingProviders(url, method);
  
  if (matchedProviders.length > 0) {
    // Parse URL and extract parameters
    const parsedUrl = new URL(url);
    const params = {};
    parsedUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Extract event type and account ID if available
    let eventType = 'Unknown';
    let accountId = '';
    
    // Check if we have a custom provider with custom parsing functions
    const firstProvider = matchedProviders[0];
    const provider = trackingProviders[firstProvider];
    
    // Extract the payload/post data if available
    let payload = null;
    if (details.requestBody) {
      if (details.requestBody.raw) {
        // For raw data (ArrayBuffer)
        const decoder = new TextDecoder();
        payload = details.requestBody.raw.map(chunk => {
          return decoder.decode(new Uint8Array(chunk.bytes));
        }).join('');
        
        // Try to parse JSON payload
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          // Not JSON, leave as is
        }
      } else if (details.requestBody.formData) {
        // For form data
        payload = details.requestBody.formData;
      }
    }
    
    // Create a params object with a get method to mimic URLSearchParams behavior
    // for our custom provider functions
    const paramsObj = {
      get: (key) => params[key]
    };
    
    // Use custom parsing functions if available
    if (provider && provider.schema) {
      if (provider.schema.parseEventType) {
        try {
          // For the AdNabu provider, we need to pass all three parameters
          if (firstProvider === 'adnabu-google-ads') {
            eventType = provider.schema.parseEventType(paramsObj, parsedUrl, payload);
          } else {
            eventType = provider.schema.parseEventType(paramsObj, parsedUrl);
          }
        } catch (e) {
          console.error('Error parsing event type:', e);
          eventType = 'Unknown';
        }
      }
      
      if (provider.schema.parseAccount) {
        try {
          // For the AdNabu provider, we need to pass all three parameters
          if (firstProvider === 'adnabu-google-ads') {
            accountId = provider.schema.parseAccount(paramsObj, parsedUrl, payload);
          } else {
            accountId = provider.schema.parseAccount(paramsObj, parsedUrl);
          }
        } catch (e) {
          console.error('Error parsing account ID:', e);
          accountId = '';
        }
      }
    }
    
    // Fallback to general extraction method for standard patterns
    if (eventType === 'Unknown') {
      // Check various query parameters based on provider patterns
      if (params.t) eventType = params.t; // Google Analytics
      if (params.en) eventType = params.en; // Facebook
      if (params.ev) eventType = params.ev; // Generic event
    }
    
    if (!accountId) {
      // Try to extract from common parameters
      if (params.tid) accountId = params.tid; // GA4 tracking ID
      if (params.id) accountId = params.id; // Facebook pixel ID
    }
    
    // Get request headers from cache
    const headerData = headersCache.get(requestId);
    const headers = headerData ? headerData.headers : [];
    
    // Store the detected tracking in storage for the popup to access
    storeTrackingData(tabId, url, matchedProviders, {
      eventType,
      accountId,
      params,
      payload,
      headers,
      method,
      timestamp: Date.now(),
      requestId
    });
  }
}

/**
 * Analyzes a network response
 * @param {object} details - Response details from the webRequest API
 */
function analyzeResponse(details) {
  // Currently just used to capture response headers if needed
  // We could store these with the request data for a complete picture
  if (details.tabId < 0) return;
  
  // Update existing tracking data with response info if it exists
  chrome.storage.local.get(['trackedRequests'], (result) => {
    const trackedRequests = result.trackedRequests || {};
    const tabRequests = trackedRequests[details.tabId] || [];
    
    // Find the request in our tracked requests
    const requestIndex = tabRequests.findIndex(r => r.requestId === details.requestId);
    
    if (requestIndex >= 0) {
      // Add response headers and status code
      tabRequests[requestIndex].responseHeaders = details.responseHeaders;
      tabRequests[requestIndex].statusCode = details.statusCode;
      
      // Update storage
      chrome.storage.local.set({ trackedRequests });
    }
  });
}

/**
 * Identifies which tracking providers match a given URL
 * @param {string} url - The URL to check
 * @param {string} method - The HTTP method (GET, POST, etc.)
 * @returns {string[]} - Array of matching provider names
 */
function identifyTrackingProviders(url, method) {
  const matchedProviders = [];
  
  for (const [providerName, provider] of Object.entries(trackingProviders)) {
    // Check if the URL pattern matches
    const urlMatches = provider.patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(url);
      }
      return false;
    });
    
    // If URL matches and either no methods are specified or the method matches, add the provider
    if (urlMatches && (!provider.methods || provider.methods.includes(method))) {
      matchedProviders.push(providerName);
    }
  }
  
  return matchedProviders;
}

/**
 * Stores tracking data for a specific tab
 * @param {number} tabId - Chrome tab ID
 * @param {string} url - Request URL
 * @param {string[]} providers - Detected tracking providers
 * @param {object} details - Additional request details
 */
function storeTrackingData(tabId, url, providers, details = {}) {
  // Extract host and path for cleaner display
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;
  const path = parsedUrl.pathname;
  
  // Get the first provider for enhanced data processing
  const firstProvider = providers.length > 0 ? providers[0] : null;
  const provider = firstProvider ? trackingProviders[firstProvider] : null;
  
  // Process any custom data for specific providers
  let customData = {};
  
  // Handle Facebook Pixel contents data
  if (firstProvider === 'facebook-pixel' && provider && provider.schema.parseContents) {
    const paramsObj = {
      get: (key) => details.params[key]
    };
    
    const contentsData = provider.schema.parseContents(paramsObj);
    
    if (contentsData && contentsData.length > 0) {
      customData.contents = contentsData;
    }
  }
  
  // Handle AdNabu data which may have multiple events in an array
  if (firstProvider === 'adnabu-google-ads' && provider && provider.schema.parsePayloadEvents) {
    if (details.payload && Array.isArray(details.payload) && details.payload.length > 0) {
      // Extract additional events from payload
      const payloadEvents = provider.schema.parsePayloadEvents(details.payload);
      
      if (payloadEvents && payloadEvents.length > 0) {
        customData.events = payloadEvents;
      }
      
      // For AdNabu, set event category based on first event
      if (details.payload[0] && details.payload[0].event_name) {
        // Standard e-commerce event categories
        const commerceEvents = ['add_to_cart', 'purchase', 'view_item', 'begin_checkout'];
        details.category = commerceEvents.includes(details.payload[0].event_name) ? 'ecommerce' : 'marketing';
      }
    }
  }
  
  // Create the request object
  const trackingRequest = {
    url,
    host,
    path,
    providers,
    eventType: details.eventType || 'Unknown',
    accountId: details.accountId || '',
    params: details.params || {},
    headers: details.headers || [],
    payload: details.payload || null,
    customData,
    method: details.method || 'GET',
    timestamp: details.timestamp || Date.now(),
    requestId: details.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category: details.category || (provider ? provider.category : 'analytics')
  };
  
  // Store in the tracking data store
  trackingDataStore.addRequest(tabId, trackingRequest);
  
  // Notify any content scripts
  notifyContentScriptOfRequest(tabId, trackingRequest);
}

/**
 * Sends a tracking request to the content script for Live View
 * @param {number} tabId - Chrome tab ID
 * @param {object} request - The tracking request object
 */
function notifyContentScriptOfRequest(tabId, request) {
  // Add tabId to the request object to help content script validate
  request.tabId = tabId;
  
  // Make sure the tab exists and is a valid tab before sending
  chrome.tabs.get(tabId, (tab) => {
    // If the tab doesn't exist or there's an error, we can't send the message
    if (chrome.runtime.lastError) {
      return;
    }
    
    // Only send to http/https pages
    if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      return;
    }
    
    // Send message to content script in the tab with proper error handling
    try {
      chrome.tabs.sendMessage(tabId, {
        action: 'trackingRequestDetected',
        request: request
      }, (response) => {
        // Don't need to handle response, but check for error
        if (chrome.runtime.lastError) {
          // Content script may not be loaded yet, which is fine
          // We'll store the data anyway and it will be available when the live view loads
          
          // Set a flag to track if we should retry
          let shouldRetry = true;
          
          // Try to check if Live View is generally enabled
          chrome.storage.local.get(['pixelTracerSettings'], (result) => {
            const settings = result.pixelTracerSettings || {};
            
            // Only retry if Live View is globally enabled
            if (settings.liveViewEnabled && shouldRetry) {
              // Retry once after a short delay - content script might be loading
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                  action: 'trackingRequestDetected',
                  request: request
                }).catch(() => {
                  // Ignore errors on retry
                });
              }, 1000);
              
              // Prevent multiple retries
              shouldRetry = false;
            }
          });
        }
      });
    } catch (e) {
      // Ignore errors, data is stored already
    }
  });
}

/**
 * Generates a CSV string from tracking request data
 * @param {Array} requests - Array of tracking requests
 * @returns {string} - CSV formatted string
 */
function generateCSV(requests) {
  // Define the fields we want to include in the CSV
  const fields = [
    'timestamp', 
    'providers', 
    'eventType', 
    'category', 
    'host', 
    'path', 
    'accountId',
    'method'
  ];
  
  // Create header row
  const header = [
    'Timestamp',
    'Provider',
    'Event Type',
    'Category',
    'Host',
    'Path',
    'Account ID',
    'Method'
  ].join(',');
  
  // Create data rows
  const rows = requests.map(req => {
    // Format timestamp as ISO date string
    const timestamp = new Date(req.timestamp).toISOString();
    
    // Format providers as comma-joined string
    const providers = req.providers.join('|');
    
    // Build the row values in the same order as the header
    const rowValues = [
      `"${timestamp}"`,
      `"${providers}"`,
      `"${req.eventType || ''}"`,
      `"${req.category || ''}"`,
      `"${req.host || ''}"`,
      `"${req.path || ''}"`,
      `"${req.accountId || ''}"`,
      `"${req.method || ''}"`
    ];
    
    return rowValues.join(',');
  });
  
  // Combine header and rows
  return header + '\n' + rows.join('\n');
} 