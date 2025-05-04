import { trackingProviders } from './trackingProviders.js';

// Listen for network requests
chrome.webRequest.onBeforeRequest.addListener(
  analyzeRequest,
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  analyzeResponse,
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

/**
 * Analyzes a network request to identify tracking providers
 * @param {object} details - Request details from the webRequest API
 */
function analyzeRequest(details) {
  const url = details.url;
  const method = details.method;
  const tabId = details.tabId;
  
  if (tabId < 0) return; // Ignore requests not associated with a tab
  
  const matchedProviders = identifyTrackingProviders(url);
  
  if (matchedProviders.length > 0) {
    console.log(`[PixelTracer] Request detected:`, {
      url,
      method,
      tabId,
      providers: matchedProviders
    });
    
    // Store the detected tracking in storage for the popup to access
    storeTrackingData(tabId, url, matchedProviders);
  }
}

/**
 * Analyzes a network response
 * @param {object} details - Response details from the webRequest API
 */
function analyzeResponse(details) {
  // We could analyze response headers here if needed
  // For now, we'll focus on the URLs in the request phase
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
 */
function storeTrackingData(tabId, url, providers) {
  chrome.storage.local.get(['trackedRequests'], (result) => {
    const trackedRequests = result.trackedRequests || {};
    
    if (!trackedRequests[tabId]) {
      trackedRequests[tabId] = [];
    }
    
    trackedRequests[tabId].push({
      timestamp: Date.now(),
      url,
      providers
    });
    
    chrome.storage.local.set({ trackedRequests });
  });
} 