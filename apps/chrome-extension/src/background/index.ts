/**
 * Chrome Extension Background Script (Service Worker)
 * 
 * Similar to Omnibug's serviceWorker.js but focused on sidepanel communication.
 * Handles:
 * - Network request interception and filtering
 * - Provider matching and parsing  
 * - Real-time communication with sidepanel
 * - Tab-based event storage
 */

import { CoreEngine, AdvancedFilters, PerformanceMonitor } from '@pixeltracer/core'
import { initializeDefaultProviders, analyzeRequest } from '@pixeltracer/providers'
// import { OmnibugProviderRegistry } from '@pixeltracer/providers' // Temporarily disabled due to build issues
import type { RequestData } from '@pixeltracer/shared'
import { TrackingEvent } from '@pixeltracer/shared'

// Tab-based event storage (similar to Omnibug's tabs object)
const tabEvents: Map<number, TrackingEvent[]> = new Map();
const trackingState: Map<number, boolean> = new Map(); // Per-tab tracking state
const processedRequests: Map<string, number> = new Map(); // Request deduplication
const sidePanelOpenForTab: Map<number, boolean> = new Map(); // Track which tabs have side panel open

// Persistence setting
let persistEventsAcrossPages = true; // Default to true

// Health monitoring
let lastRequestTime = Date.now();
let healthCheckInterval: number | null = null;
let requestCounter = 0;
let lastHealthCheckTime = Date.now();

// Initialize the core engine and advanced processing systems
let engine: CoreEngine | null = null;
// Processing engine disabled in service worker due to Worker limitations
let advancedFilters: AdvancedFilters | null = null;
let performanceMonitor: PerformanceMonitor | null = null;
let providersInitialized = false;
let isInitializing = false;
let networkInterceptionSetup = false;

// Keep service worker alive
function keepAlive() {
  // Chrome kills service workers after 30s of inactivity
  // This sends a message to keep it alive
  setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just accessing the API keeps the worker alive
    });
  }, 20000); // Every 20 seconds
}

// Initialize on extension startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeEngine();
  keepAlive();
});

// Initialize on extension install
chrome.runtime.onInstalled.addListener(async () => {
  
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    // Could not set panel behavior
  }
  
  await initializeEngine();
  keepAlive();
});

async function initializeEngine(): Promise<void> {
  // Prevent multiple initialization
  if (isInitializing || providersInitialized) {
    return;
  }
  
  isInitializing = true;
  
  try {
    // Initialize core engine
    engine = new CoreEngine();
    
    // Initialize providers
    await initializeDefaultProviders();
    
    providersInitialized = true;
    
    // Initialize advanced filters
    advancedFilters = new AdvancedFilters();
    
    // Initialize performance monitor
    performanceMonitor = new PerformanceMonitor();
    performanceMonitor.startMonitoring(10000); // Monitor every 10 seconds
    
    // Load persistence setting
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      try {
        chrome.storage.sync.get(['persistEventsAcrossPages'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('Failed to load persistence setting:', chrome.runtime.lastError);
            return;
          }
          if (result.persistEventsAcrossPages !== undefined) {
            persistEventsAcrossPages = result.persistEventsAcrossPages;
          }
        });
      } catch (error) {
        console.warn('Chrome storage not available:', error);
      }
    }
    
  } catch (error) {
    providersInitialized = false;
    isInitializing = false;
    return;
  }
  
  // Setup network interception after successful initialization
  setupNetworkInterception();
  
  // Mark initialization as complete
  isInitializing = false;
}

function setupNetworkInterception(): void {
  // Prevent duplicate listeners
  if (networkInterceptionSetup) {
    return;
  }
  
  // Remove any existing listeners first (cleanup)
  chrome.webRequest.onBeforeRequest.removeListener(handleRequest);
  
  // Listen for network requests (similar to Omnibug's approach)
  chrome.webRequest.onBeforeRequest.addListener(
    handleRequest,
    { urls: ['<all_urls>'] },
    ['requestBody']
  );
  
  networkInterceptionSetup = true;
  
  // Start health monitoring
  startHealthMonitoring();
}

function handleRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
  // Update health metrics
  lastRequestTime = Date.now();
  requestCounter++;
  
  // Handle async analysis in a non-blocking way
  handleRequestAsync(details);
}

function startHealthMonitoring(): void {
  // Clear any existing interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  // Check health every 30 seconds
  healthCheckInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const timeSinceLastCheck = now - lastHealthCheckTime;
    
    // If no requests in 60 seconds and we've been checking for at least 60 seconds
    if (timeSinceLastRequest > 60000 && timeSinceLastCheck > 60000) {
      attemptRecovery();
    }
    
    lastHealthCheckTime = now;
  }, 30000) as unknown as number;
}

function attemptRecovery(): void {
  // Reset the network interception
  networkInterceptionSetup = false;
  chrome.webRequest.onBeforeRequest.removeListener(handleRequest);
  
  // Wait a moment then re-setup
  setTimeout(() => {
    setupNetworkInterception();
  }, 100);
  
  // Send recovery notification to UI
  chrome.runtime.sendMessage({
    type: 'TRACKING_RECOVERED',
    timestamp: Date.now()
  }).catch(() => {
    // Sidepanel not open, ignore
  });
}

async function handleRequestAsync(details: chrome.webRequest.WebRequestBodyDetails): Promise<void> {
  // Skip non-main frame requests from non-tracked tabs
  const tabId = details.tabId;
  
  // Debug logging for tracking issues
  if (tabId < 0) {
    // System requests, ignore
    return;
  }
  
  const isTracked = trackingState.get(tabId);
  if (!isTracked) {
    // Tab not being tracked, but don't log to reduce noise
    return;
  }
  
  if (!providersInitialized) {
    return;
  }
  
  // Deduplication: Check if we've already processed this exact request
  const requestKey = `${tabId}-${details.url}-${details.method}-${details.timeStamp}`;
  if (processedRequests.has(requestKey)) {
    // Already processed, skip
    return;
  }
  
  // Mark as processed (keep for 5 seconds to handle potential duplicates)
  processedRequests.set(requestKey, Date.now());
  
  // Clean old processed requests (older than 5 seconds)
  const now = Date.now();
  for (const [key, timestamp] of processedRequests.entries()) {
    if (now - timestamp > 5000) {
      processedRequests.delete(key);
    }
  }
  
  // Processing engine not available in service workers, we'll use direct analysis
  
  const url = details.url;
  const method = details.method;
  const startTime = performance.now();
  
  
  try {
    // Convert Chrome webRequest to RequestData format
    const requestData: RequestData = {
      url,
      method,
      headers: {} as Record<string, string>, // Headers not available in onBeforeRequest
      body: details.requestBody?.raw ? extractRequestBody(details.requestBody.raw) : '',
      query: extractQueryParams(url),
      parsedUrl: parseUrl(url),
      timestamp: Date.now()
    };
    
    // Record request for performance monitoring
    if (performanceMonitor) {
      performanceMonitor.recordRequest();
    }
    
    let trackingEvent: TrackingEvent | null = null;
    
    {
      const analysisResult = await analyzeRequest(requestData);
      
      if (analysisResult.matches.length > 0) {
        // Use the highest confidence match
        const bestMatch = analysisResult.matches[0];
        
        trackingEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          provider: bestMatch.providerId,
          providerName: bestMatch.providerName,
          url,
          method,
          eventType: bestMatch.event.eventType,
          accountId: bestMatch.event.accountId,
          parameters: bestMatch.event.parameters,
          confidence: bestMatch.confidence,
          tabId
        };
      }
    }
    
    if (trackingEvent) {
      
      // Store event for tab
      if (!tabEvents.has(tabId)) {
        tabEvents.set(tabId, []);
      }
      tabEvents.get(tabId)!.unshift(trackingEvent);
      
      // Keep only last 1000 events per tab
      if (tabEvents.get(tabId)!.length > 1000) {
        tabEvents.get(tabId)!.splice(1000);
      }
      
      // Send to sidepanel if open (with tab information for filtering)
      chrome.runtime.sendMessage({
        type: 'NEW_TRACKING_EVENT',
        event: trackingEvent,
        tabId: tabId // Include tab ID for filtering
      }).catch(() => {
        // Sidepanel not open, ignore
      });
      
    }
    
    // Record processing time for performance monitoring
    const processingTime = performance.now() - startTime;
    if (performanceMonitor) {
      performanceMonitor.recordProcessingTime(processingTime);
    }
    
  } catch (error) {
    if (performanceMonitor) {
      performanceMonitor.recordError();
    }
  }
}

// Note: Chrome doesn't provide an API to programmatically close the side panel
// The panel stays open but shows a warning when viewing from a different tab

chrome.tabs.onRemoved.addListener((tabId) => {
  tabEvents.delete(tabId);
  trackingState.delete(tabId);
  sidePanelOpenForTab.delete(tabId); // Clean up side panel state
  
  const keysToDelete: string[] = [];
  for (const key of processedRequests.keys()) {
    if (key.startsWith(`${tabId}-`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => processedRequests.delete(key));
  
});

// Re-register listeners when tab becomes active (helps with stalled tracking)
chrome.tabs.onActivated.addListener(async (_activeInfo) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  // If tracking seems stalled (no requests in 30s), attempt recovery
  if (timeSinceLastRequest > 30000 && networkInterceptionSetup) {
    // Small delay to let page settle
    setTimeout(() => {
      const currentTime = Date.now();
      if (currentTime - lastRequestTime > 30000) {
        attemptRecovery();
      }
    }, 1000);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && trackingState.has(tabId)) {
    // If persistence is enabled, add a navigation separator event
    if (persistEventsAcrossPages) {
      const existingEvents = tabEvents.get(tabId);
      // Only add navigation event if there are existing events (not the first page load)
      if (existingEvents && existingEvents.length > 0) {
        const navigationEvent: TrackingEvent = {
          id: `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          provider: 'navigation',
          providerName: 'Page Navigation',
          url: changeInfo.url,
          method: 'NAVIGATE',
          eventType: 'navigation',
          parameters: {
            fromUrl: existingEvents.length > 0 ? existingEvents[0].url : 'unknown',
            toUrl: changeInfo.url,
            title: tab?.title || 'Unknown Page'
          },
          confidence: 1.0,
          tabId: tabId,
          isNavigationEvent: true
        };
        
        // Insert navigation event at the beginning (most recent)
        tabEvents.set(tabId, [navigationEvent, ...existingEvents]);
        
        // Notify UI about the navigation event
        if (sidePanelOpenForTab.has(tabId)) {
          chrome.runtime.sendMessage({
            type: 'NEW_TRACKING_EVENT',
            event: navigationEvent,
            tabId: tabId
          });
        }
      }
    } else {
      // Clear events if persistence is disabled
      const existingEvents = tabEvents.get(tabId);
      if (existingEvents && existingEvents.length > 0) {
        tabEvents.set(tabId, []);
      }
    }
    
    // Always clear request deduplication cache for new page
    const keysToDelete: string[] = [];
    for (const key of processedRequests.keys()) {
      if (key.startsWith(`${tabId}-`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => processedRequests.delete(key));
  }
});

// Handle messages from sidepanel and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  switch (message.type) {
    case 'START_TRACKING':
      if (message.tabId) {
        trackingState.set(message.tabId, true);
        sidePanelOpenForTab.set(message.tabId, true); // Mark side panel as open for this tab
      }
      sendResponse({ success: true });
      break;
      
    case 'SIDEPANEL_OPENED':
      if (message.tabId) {
        sidePanelOpenForTab.set(message.tabId, true);
      }
      sendResponse({ success: true });
      break;
      
    case 'SIDEPANEL_CLOSED':
      if (message.tabId) {
        sidePanelOpenForTab.delete(message.tabId);
      }
      sendResponse({ success: true });
      break;
      
    case 'STOP_TRACKING':
      if (message.tabId) {
        trackingState.set(message.tabId, false);
      }
      sendResponse({ success: true });
      break;
      
    case 'GET_EVENTS':
      const tabId = message.tabId || sender.tab?.id;
      const events = tabId ? tabEvents.get(tabId) || [] : [];
      sendResponse({ events });
      break;
      
    case 'GET_TRACKING_STATE':
      const stateTabId = message.tabId || sender.tab?.id;
      const isTracking = stateTabId ? trackingState.get(stateTabId) || false : false;
      sendResponse({ isTracking });
      break;
      
    case 'CLEAR_EVENTS':
      const clearTabId = message.tabId || sender.tab?.id;
      if (clearTabId) {
        tabEvents.delete(clearTabId);
      }
      sendResponse({ success: true });
      break;
      
    case 'SET_PERSISTENCE':
      if (message.payload && message.payload.persistEventsAcrossPages !== undefined) {
        persistEventsAcrossPages = message.payload.persistEventsAcrossPages;
        // Save to storage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          try {
            chrome.storage.sync.set({ persistEventsAcrossPages }, () => {
              if (chrome.runtime.lastError) {
                console.warn('Failed to save persistence setting:', chrome.runtime.lastError);
              }
            });
          } catch (error) {
            console.warn('Chrome storage not available:', error);
          }
        }
      }
      sendResponse({ success: true });
      break;
      
    case 'GET_PERSISTENCE':
      sendResponse({ persistEventsAcrossPages });
      break;
      
    case 'FILTER_EVENTS':
      if (advancedFilters) {
        const { criteria, options } = message;
        const allEvents = Array.from(tabEvents.values()).flat();
        const filterResult = advancedFilters.filterEvents(allEvents, criteria, options);
        sendResponse({ success: true, result: filterResult });
      } else {
        sendResponse({ error: 'Advanced filters not initialized' });
      }
      break;
      
    case 'GET_PERFORMANCE_METRICS':
      if (performanceMonitor) {
        const metrics = performanceMonitor.getMetrics();
        sendResponse({ success: true, metrics });
      } else {
        sendResponse({ error: 'Performance monitor not initialized' });
      }
      break;
      
    case 'RESTART_TRACKING':
      // Manual recovery trigger
      attemptRecovery();
      sendResponse({ success: true });
      break;
      
    case 'GET_HEALTH_STATUS':
      // Provide health status to UI
      const now = Date.now();
      sendResponse({
        success: true,
        health: {
          lastRequestTime,
          timeSinceLastRequest: now - lastRequestTime,
          requestCounter,
          isHealthy: (now - lastRequestTime) < 60000,
          networkInterceptionSetup,
          providersInitialized
        }
      });
      break;
      
    case 'GET_PERFORMANCE_REPORT':
      if (performanceMonitor) {
        const report = performanceMonitor.generateReport();
        sendResponse({ success: true, report });
      } else {
        sendResponse({ error: 'Performance monitor not initialized' });
      }
      break;
      
    case 'GET_OPTIMIZATION_SUGGESTIONS':
      if (performanceMonitor) {
        const suggestions = performanceMonitor.getOptimizationSuggestions();
        sendResponse({ success: true, suggestions });
      } else {
        sendResponse({ error: 'Performance monitor not initialized' });
      }
      break;
      
    case 'GET_FILTER_SUGGESTIONS':
      if (advancedFilters) {
        const allEvents = Array.from(tabEvents.values()).flat();
        const suggestions = advancedFilters.getSuggestedFilters(allEvents);
        sendResponse({ success: true, suggestions });
      } else {
        sendResponse({ error: 'Advanced filters not initialized' });
      }
      break;
      
    case 'EXPORT_DATA':
      if (advancedFilters) {
        const { format, options } = message;
        const allEvents = Array.from(tabEvents.values()).flat();
        try {
          const exportData = advancedFilters.exportData(allEvents, format, options);
          sendResponse({ success: true, data: exportData });
        } catch (error) {
          sendResponse({ error: `Export failed: ${error}` });
        }
      } else {
        sendResponse({ error: 'Advanced filters not initialized' });
      }
      break;
      
    case 'GET_PROCESSING_STATS':
      // Processing engine not available in service worker
      sendResponse({ 
        success: true, 
        stats: {
          totalRequests: 0,
          processedRequests: 0,
          failedRequests: 0,
          duplicateRequests: 0,
          averageProcessingTime: 0,
          activeWorkers: 0,
          queueSize: 0,
          uptime: Date.now() - Date.now()
        }
      });
      break;
      
    case 'CLEAR_CACHES':
      // Only reset performance monitor (processing engine not available)
      if (performanceMonitor) {
        performanceMonitor.reset();
      }
      sendResponse({ success: true });
      break;
      
    case 'REQUEST_REFRESH':
      // Simply return current events for the tab
      const refreshTabId = message.tabId || sender.tab?.id;
      const refreshEvents = refreshTabId ? tabEvents.get(refreshTabId) || [] : [];
      sendResponse({ success: true, events: refreshEvents });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async responses
});

/**
 * Utility functions for converting Chrome webRequest data to RequestData format
 */

function extractQueryParams(url: string): Record<string, any> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, any> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

function parseUrl(url: string): RequestData['parsedUrl'] {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash
    };
  } catch {
    return {
      protocol: '',
      hostname: '',
      pathname: '',
      search: '',
      hash: ''
    };
  }
}

function extractRequestBody(requestBody: chrome.webRequest.UploadData[]): string {
  if (!requestBody || requestBody.length === 0) return '';
  
  try {
    // Combine all upload data parts
    const bodyParts: string[] = [];
    for (const part of requestBody) {
      if (part.bytes) {
        // Convert ArrayBuffer to string
        const decoder = new TextDecoder();
        bodyParts.push(decoder.decode(part.bytes));
      } else if (part.file) {
        // File uploads - we can't read file content in service worker
        bodyParts.push(`[FILE: ${part.file}]`);
      }
    }
    return bodyParts.join('');
  } catch {
    return '';
  }
}

// Cleanup function for extension shutdown
async function cleanup(): Promise<void> {
  try {
    if (performanceMonitor) {
      performanceMonitor.stopMonitoring();
      performanceMonitor = null;
    }
    
    // Processing engine not used in service worker (already null)
    
    if (engine) {
      await engine.stop();
      engine = null;
    }
    
    // Clear all data
    tabEvents.clear();
    trackingState.clear();
    
  } catch (error) {
    // Error during cleanup
  }
}

// Handle extension suspension/unload
chrome.runtime.onSuspend?.addListener(cleanup);


// Initialize immediately only if not already done by startup/install events
setTimeout(() => {
  if (!providersInitialized && !isInitializing) {
    initializeEngine();
  }
}, 100); // Small delay to let startup/install events fire first