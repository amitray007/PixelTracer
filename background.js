import { trackingProviders } from './trackingProviders.js';

// In-memory tracking data store to ensure consistency between popup and content script
const trackingDataStore = {
  // Tabs data indexed by tabId
  tabs: {},
  
  // Add a new tracking request
  addRequest(tabId, request) {
    if (!this.tabs[tabId]) {
      this.tabs[tabId] = [];
    }
    
    // Add the request to the array
    this.tabs[tabId].unshift(request);
    
    // Also update the storage for persistence
    this.saveToStorage();
    
    return request;
  },
  
  // Get all requests for a tab
  getTabRequests(tabId) {
    // First check if we have data in memory
    if (!this.tabs[tabId] || this.tabs[tabId].length === 0) {
      // If not, try to load from storage directly in a synchronous way
      // We'll return the cached data but initiate a refresh for next time
      this.loadFromStorage();
    }
    return this.tabs[tabId] || [];
  },
  
  // Get requests for a tab filtered by current page load time
  getCurrentPageRequests(tabId, hostname) {
    // Ensure we have the latest data
    return new Promise((resolve) => {
      // Try to get data synchronously first
      const requests = this.getTabRequests(tabId);
      
      // If no requests, return empty array
      if (requests.length === 0) {
        // Try to load data from storage directly for this specific tab
        chrome.storage.local.get(['trackedRequests'], (result) => {
          if (result.trackedRequests && result.trackedRequests[tabId]) {
            this.tabs[tabId] = result.trackedRequests[tabId];
            const reloadedRequests = this.tabs[tabId];
            const pageLoadTime = this.findPageOpenTime(reloadedRequests, hostname) || (Date.now() - 60000);
            resolve(reloadedRequests.filter(req => req.timestamp >= pageLoadTime));
          } else {
            resolve([]);
          }
        });
      } else {
        const pageLoadTime = this.findPageOpenTime(requests, hostname) || (Date.now() - 60000);
        resolve(requests.filter(req => req.timestamp >= pageLoadTime));
      }
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
      this.saveToStorage();
      return true;
    }
    return false;
  },
  
  // Clear data for a tab and specific hostname (useful for page refreshes)
  clearTabDataForHostname(tabId, hostname) {
    if (!this.tabs[tabId]) return false;
    
    // Completely reset the tab data for this hostname to ensure clean start
    // This is more thorough than filtering out requests from the hostname
    this.tabs[tabId] = [];
    
    // Save changes
    this.saveToStorage();
    return true;
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
      
      // Clear data for this hostname in this tab
      if (hostname) {
        const cleared = trackingDataStore.clearTabDataForHostname(tabId, hostname);
        
        // Notify content script if it's already loaded
        chrome.tabs.sendMessage(tabId, { 
          action: 'pageRefreshed',
          hostname: hostname
        }).catch(() => {
          // Ignore errors - content script may not be loaded yet
        });
      }
    } catch (e) {
      // Invalid URL or other error, ignore
    }
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
      // Clear data in our store
      trackingDataStore.clearTabData(tabId);
      
      // Notify content script
      chrome.tabs.sendMessage(tabId, { action: 'trackingDataCleared' });
      
      sendResponse({ success: true });
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
  
  const matchedProviders = identifyTrackingProviders(url);
  
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
    
    // Check various query parameters based on provider patterns
    if (params.t) eventType = params.t; // Google Analytics
    if (params.en) eventType = params.en; // Facebook
    if (params.ev) eventType = params.ev; // Generic event
    if (params.tid) accountId = params.tid; // GA4 tracking ID
    if (params.id) accountId = params.id; // Facebook pixel ID

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
 * @returns {string[]} - Array of matching provider names
 */
function identifyTrackingProviders(url) {
  const matchedProviders = [];
  
  for (const [providerName, provider] of Object.entries(trackingProviders)) {
    if (provider.patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(url);
      }
      return false;
    })) {
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
  
  // Create the tracking request object
  const trackingRequest = {
    timestamp: Date.now(),
    url,
    host,
    path,
    providers,
    eventType: details.eventType || 'Unknown',
    accountId: details.accountId || '',
    method: details.method || 'GET',
    requestId: details.requestId || '',
    params: details.params || {},
    payload: details.payload || null,
    headers: details.headers || [],
    responseHeaders: [],
    statusCode: 0,
    tabId,
    // Add category based on first provider
    category: providers.length > 0 ? (trackingProviders[providers[0]]?.category || 'analytics') : 'analytics'
  };
  
  // Add to our central tracking data store
  trackingDataStore.addRequest(tabId, trackingRequest);
  
  // Notify the content script for Live View
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
  
  // Send message to content script in the tab
  chrome.tabs.sendMessage(tabId, {
    action: 'trackingRequestDetected',
    request: request
  }, (response) => {
    // Don't need to handle response, but check for error
    if (chrome.runtime.lastError) {
      // Content script may not be active, that's ok
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