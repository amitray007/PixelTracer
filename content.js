/**
 * Content script for PixelTracer
 * This script runs in the context of web pages
 */

// Connection state monitor
let connectionAlive = true;
let connectionCheckInterval = null;

// Check extension connection on load
checkExtensionConnection();

// Set up periodic connection checks
startConnectionChecks();

/**
 * Check if the connection to the extension is still alive
 * This proactively detects context invalidation
 */
function checkExtensionConnection() {
  try {
    // Try a simple extension API call
    chrome.runtime.sendMessage({ action: 'ping' }, response => {
      // If we get here without an error, connection is good
      connectionAlive = true;
      
      // No need to handle response - we only care if it doesn't throw
      return true;
    });
  } catch (e) {
    // If we get an error, connection is dead (context invalidated)
    connectionAlive = false;
    handleConnectionLost();
  }
}

/**
 * Start periodic connection checks
 */
function startConnectionChecks() {
  // Clear any existing interval
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  // Check connection every 10 seconds
  connectionCheckInterval = setInterval(() => {
    checkExtensionConnection();
  }, 10000);
}

/**
 * Handle lost connection to extension
 */
function handleConnectionLost() {
  console.warn("Extension connection lost - context may be invalidated");
  
  // Stop the connection checks - they'll just keep failing
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
  
  // Clear tracking data state to avoid stale data
  currentTabRequests = [];
  
  // Show the error in the Live View if it's active
  if (liveViewEnabled && liveViewEl) {
    const emptyState = liveViewEl.querySelector('.pixeltracer-empty-state');
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="data-loss-message">
          <i class="fas fa-exclamation-triangle"></i>
          <div>Extension has been updated or reloaded</div>
          <button id="pixeltracer-refresh-page-btn" class="pixeltracer-btn">Refresh Page</button>
        </div>
      `;
      emptyState.style.display = 'flex';
      
      // Add event listener to the refresh button
      const refreshButton = document.getElementById('pixeltracer-refresh-page-btn');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }
  }
}

// State management
let liveViewEnabled = false;
let liveViewEl = null;
let requestsContainer = null;
let requestsList = [];
let isLiveViewMinimized = false; // Track minimized state
let detailWindowEl = null; // Reference to the detail window element
let detailOverlayEl = null; // Reference to the detail overlay element
let currentTabRequests = []; // Store the current tab's requests
let currentTabId = null; // Store the current tab ID
let currentUrl = ''; // Store the current page URL
const MAX_DISPLAYED_REQUESTS = 100; // Increased to keep more requests in live view
let trackingProvidersData = {}; // Will store provider data from background script
let isFirstDataLoad = true; // Flag to track initial data load
let isDarkMode = false; // Track theme mode
let previousRequestCount = 0; // Track previous request count to detect data loss

// Default filter settings
let filterPreferences = {
  filterType: 'all',
  viewMode: 'chronological'
};

// Store for tracking which provider groups are collapsed
let collapsedProviders = {};

// Initialize on content script load
init();

/**
 * Initialize the content script
 */
function init() {
  // Only continue if connection is alive
  if (!connectionAlive) {
    console.warn("Not initializing - extension connection lost");
    return;
  }
  
  // Get current tab ID
  getCurrentTabInfo();
  
  // Check if Live View was previously enabled for this domain
  const hostname = window.location.hostname;
  
  // Load saved collapsed providers state
  try {
    const key = `pixeltracer_collapsed_${hostname}`;
    const savedState = localStorage.getItem(key);
    if (savedState) {
      collapsedProviders = JSON.parse(savedState);
    }
  } catch (e) {
    // If there's an error, just use the default empty object
    collapsedProviders = {};
  }
  
  // Only get tracking providers data if connection is alive
  if (connectionAlive) {
    // Get tracking providers data
    chrome.runtime.sendMessage({ action: 'getProviderInfo', providerId: 'all' }, (response) => {
      if (chrome.runtime.lastError) {
        // Connection might be lost during this call
        connectionAlive = false;
        handleConnectionLost();
        return;
      }
      
      if (response && response.allProviders) {
        trackingProvidersData = response.allProviders;
      }
    });
  }
  
  // Reset tracking data on initialization to avoid stale data
  currentTabRequests = [];
  
  // Load theme preference first
  chrome.storage.local.get(['pixelTracerTheme'], (result) => {
    if (chrome.runtime.lastError) {
      // Connection might be lost during this call
      connectionAlive = false;
      handleConnectionLost();
      return;
    }
    
    isDarkMode = result.pixelTracerTheme === 'dark';
    
    // Then load filter preferences and initialize the UI
    loadFilterPreferences().then(() => {
      // Now initialize the Live View (if enabled)
      chrome.storage.local.get(['liveViewPages', 'liveViewState'], (result) => {
        if (chrome.runtime.lastError) {
          // Connection might be lost during this call
          connectionAlive = false;
          handleConnectionLost();
          return;
        }
        
        const liveViewPages = result.liveViewPages || {};
        const liveViewState = result.liveViewState || {};
        
        // Default to disabled for new sites
        let pageSpecificLiveViewEnabled = false;
        
        // Only enable if we have an explicit setting for this hostname that is true
        if (liveViewPages.hasOwnProperty(hostname)) {
          pageSpecificLiveViewEnabled = !!liveViewPages[hostname]; // Cast to boolean
        }
        // No longer using global fallback - default is always off for new sites
        
        // If Live View is enabled for this domain and not explicitly closed, show it
        if (pageSpecificLiveViewEnabled && liveViewState[hostname] !== 'closed') {
          liveViewEnabled = true;
          isLiveViewMinimized = liveViewState[hostname] === 'minimized';
          createLiveView();
          
          // Load existing tracking data once we have the tab ID
          if (currentTabId) {
            loadTrackingData();
            
            // Add a periodic refresh for Live View to ensure we don't miss any updates
            setInterval(() => {
              if (liveViewEnabled && document.visibilityState === 'visible' && connectionAlive) {
                loadTrackingData();
              }
            }, 5000); // Refresh every 5 seconds while visible
          } else {
            // Wait for tab ID to be available
            const checkTabId = setInterval(() => {
              if (currentTabId) {
                loadTrackingData();
                clearInterval(checkTabId);
                
                // Set up the periodic refresh after we get the tab ID
                setInterval(() => {
                  if (liveViewEnabled && document.visibilityState === 'visible' && connectionAlive) {
                    loadTrackingData();
                  }
                }, 5000);
              }
            }, 100);
          }
        }
      });
    });
  });
  
  // Listen for pageshow event to handle page navigation
  window.addEventListener('pageshow', (event) => {
    // Check if this is a page navigation (not a back-forward cache restore)
    const isNewNavigation = !event.persisted;
    
    // Get the new URL
    const newUrl = window.location.href;
    
    // Clear existing data if URL has changed
    if (newUrl !== currentUrl) {
      // Reset tracking data
      currentTabRequests = [];
      
      // Update the current URL
      currentUrl = newUrl;
      
      // If tab ID not set, get it again
      if (!currentTabId) {
        getCurrentTabInfo();
      }
      
      // Notify background script about navigation to ensure data is cleared there too
      if (currentTabId && connectionAlive) {
        chrome.runtime.sendMessage({
          action: 'dataCleared',
          tabId: currentTabId
        }).catch(error => {
          // If this fails, the connection is likely lost
          connectionAlive = false;
          handleConnectionLost();
        });
      }
    }
    
    // Refresh data after a slight delay
    if (liveViewEnabled && connectionAlive) {
      setTimeout(() => loadTrackingData(), 500);
    }
  });
  
  // Also listen for visibility changes to refresh data when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && liveViewEnabled && connectionAlive) {
      loadTrackingData();
      // Also check extension connection when page becomes visible
      checkExtensionConnection();
    }
  });
  
  // Save collapsed provider state when the page is unloaded
  window.addEventListener('beforeunload', saveCollapsedProviders);
}

/**
 * Get the current tab information
 */
function getCurrentTabInfo() {
  // Skip if connection is lost
  if (!connectionAlive) {
    console.warn("Skipping getCurrentTabInfo - extension connection lost");
    return;
  }

  try {
    chrome.runtime.sendMessage({ action: 'getCurrentTabInfo' }, (response) => {
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.warn("Error getting tab info:", chrome.runtime.lastError.message);
        
        // Check specifically for context invalidation
        if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
          // Update connection status
          connectionAlive = false;
          handleConnectionLost();
        }
        return;
      }
      
      if (response && response.tabId) {
        currentTabId = response.tabId;
        currentUrl = response.url || window.location.href;
      }
    });
  } catch (e) {
    console.error("Error in getCurrentTabInfo:", e);
    
    // Check if the error is related to connection loss
    if (e.message && e.message.includes("Extension context invalidated")) {
      connectionAlive = false;
      handleConnectionLost();
    }
  }
}

/**
 * Load tracking data from the background script
 */
function loadTrackingData() {
  // Skip if connection is lost
  if (!connectionAlive) {
    console.warn("Skipping loadTrackingData - extension connection lost");
    handleConnectionLost();
    return;
  }

  if (!currentTabId) {
    getCurrentTabInfo();
    // If we still don't have a tab ID, retry after a short delay
    if (!currentTabId) {
      setTimeout(() => loadTrackingData(), 200);
      return;
    }
  }
  
  const hostname = new URL(currentUrl || window.location.href).hostname;
  
  // Store the previous count before clearing the array
  previousRequestCount = currentTabRequests.length;
  
  // Reset the requests array to prevent accumulation (but preserve collapsed state)
  currentTabRequests = [];
  
  // Make sure requestsContainer is initialized if Live View is active
  if (liveViewEnabled && liveViewEl && !requestsContainer) {
    requestsContainer = document.getElementById('pixeltracer-requests-container');
  }
  
  // Add loading state to the UI if visible
  if (liveViewEnabled && liveViewEl && requestsContainer) {
    const emptyState = liveViewEl.querySelector('.pixeltracer-empty-state');
    if (emptyState) {
      emptyState.textContent = "Loading tracking data...";
      emptyState.style.display = 'flex';
    }
  }
  
  // Request data from the background script which maintains the central store
  try {
    chrome.runtime.sendMessage({
      action: 'getTrackingData',
      tabId: currentTabId,
      hostname: hostname
    }, (response) => {
      // If this callback executes, the connection is still alive
      
      // Check for Chrome runtime errors, including context invalidation
      if (chrome.runtime.lastError) {
        console.warn("Runtime error in loadTrackingData:", chrome.runtime.lastError.message);
        
        // Check specifically for context invalidation
        if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
          // Update connection status
          connectionAlive = false;
          handleConnectionLost();
          return;
        }
        
        showLoadingError();
        return;
      }
      
      if (response && response.success && response.requests) {
        // Update our local state
        currentTabRequests = response.requests || [];
        
        // Make sure we have the requests container reference
        if (liveViewEnabled && liveViewEl && !requestsContainer) {
          requestsContainer = document.getElementById('pixeltracer-requests-container');
        }
        
        // Only update UI if Live View is visible
        if (liveViewEnabled && liveViewEl) {
          // Update filter options based on new data
          refreshFilters();
          
          updateStats();
          refreshRequestList();
          
          // If we have requests but the UI shows nothing, try forcing a re-render
          if (currentTabRequests.length > 0 && (!requestsList || requestsList.length === 0)) {
            setTimeout(() => {
              refreshRequestList();
            }, 200);
          }
          
          // Check for potential data loss
          if (previousRequestCount > 0 && currentTabRequests.length === 0) {
            showDataLossMessage();
          }
        }
      } else {
        // Try once more after a short delay (may be a timing issue)
        setTimeout(() => retryLoadTrackingData(hostname), 500);
      }
    });
  } catch (error) {
    // Handle other errors gracefully
    console.error("Error in loadTrackingData:", error);
    showLoadingError();
  }
}

/**
 * Show a message that the extension context has been invalidated
 * This happens when the extension is reloaded or updated
 */
function showExtensionContextInvalidatedError() {
  if (liveViewEnabled && liveViewEl) {
    const emptyState = liveViewEl.querySelector('.pixeltracer-empty-state');
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="data-loss-message">
          <i class="fas fa-exclamation-triangle"></i>
          <div>Extension has been updated or reloaded</div>
          <button id="pixeltracer-refresh-page-btn" class="pixeltracer-btn">Refresh Page</button>
        </div>
      `;
      emptyState.style.display = 'flex';
      
      // Add event listener to the refresh button
      const refreshButton = document.getElementById('pixeltracer-refresh-page-btn');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }
  }
}

/**
 * Show a message that data may have been lost with a refresh button
 */
function showDataLossMessage() {
  if (liveViewEnabled && liveViewEl) {
    const emptyState = liveViewEl.querySelector('.pixeltracer-empty-state');
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="data-loss-message">
          <i class="fas fa-exclamation-triangle"></i>
          <div>Tracking data may have been lost</div>
          <button id="pixeltracer-refresh-page-btn" class="pixeltracer-btn">Refresh Page</button>
        </div>
      `;
      emptyState.style.display = 'flex';
      
      // Add event listener to the refresh button
      const refreshButton = document.getElementById('pixeltracer-refresh-page-btn');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }
  }
}

/**
 * Show loading error in the Live View
 */
function showLoadingError() {
  if (liveViewEnabled && liveViewEl) {
    const emptyState = liveViewEl.querySelector('.pixeltracer-empty-state');
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="data-loss-message">
          <i class="fas fa-exclamation-triangle"></i>
          <div>Failed to load tracking data</div>
          <button id="pixeltracer-refresh-page-btn" class="pixeltracer-btn">Refresh Page</button>
        </div>
      `;
      emptyState.style.display = 'flex';
      
      // Add event listener to the refresh button
      const refreshButton = document.getElementById('pixeltracer-refresh-page-btn');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }
  }
}

// Add styles for the refresh button
function addRefreshButtonStyles() {
  // Check if styles are already added
  if (document.getElementById('pixeltracer-refresh-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'pixeltracer-refresh-styles';
  styleElement.textContent = `
    .pixeltracer-btn {
      background-color: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      margin-top: 10px;
      transition: background-color 0.2s;
    }
    
    .pixeltracer-btn:hover {
      background-color: #3a80d2;
    }
    
    .data-loss-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .data-loss-message i {
      font-size: 24px;
      color: #f39c12;
      margin-bottom: 8px;
    }
    
    body.dark-theme .pixeltracer-btn {
      background-color: #5a6af2;
    }
    
    body.dark-theme .pixeltracer-btn:hover {
      background-color: #4a5ae2;
    }
  `;
  
  document.head.appendChild(styleElement);
}

/**
 * Retry loading tracking data once
 */
function retryLoadTrackingData(hostname) {
  // Make sure requestsContainer is initialized if needed
  if (liveViewEnabled && liveViewEl && !requestsContainer) {
    requestsContainer = document.getElementById('pixeltracer-requests-container');
  }
  
  try {
    chrome.runtime.sendMessage({
      action: 'getTrackingData',
      tabId: currentTabId,
      hostname: hostname
    }, (response) => {
      // Check for Chrome runtime errors - including context invalidation
      if (chrome.runtime.lastError) {
        console.log("Runtime error in retry:", chrome.runtime.lastError.message);
        
        // Check specifically for context invalidation
        if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
          // Extension was reloaded or updated - show a refresh option to the user
          showExtensionContextInvalidatedError();
          return;
        }
        
        showLoadingError();
        return;
      }
      
      if (response && response.success) {
        // Update our local state
        currentTabRequests = response.requests || [];
        
        // Make sure we have the requests container reference
        if (liveViewEnabled && liveViewEl && !requestsContainer) {
          requestsContainer = document.getElementById('pixeltracer-requests-container');
        }
        
        // Only update UI if Live View is visible
        if (liveViewEnabled && liveViewEl) {
          // Update filter options based on new data
          refreshFilters();
          
          updateStats();
          refreshRequestList();
        }
      } else {
        showLoadingError();
      }
    });
  } catch (error) {
    // Handle other errors gracefully
    console.error("Error in retryLoadTrackingData:", error);
    showLoadingError();
  }
}

/**
 * Refresh the request list in the UI
 */
function refreshRequestList() {
  if (!liveViewEl || !requestsContainer) {
    return;
  }
  
  // Get filter values from the UI elements
  const filterTypeElement = document.getElementById('pixeltracer-filter-type');
  const viewModeElement = document.getElementById('pixeltracer-view-mode');
  
  // Only update preferences if both elements exist and have values
  if (filterTypeElement && viewModeElement) {
    const filterType = filterTypeElement.value;
    const viewMode = viewModeElement.value;
    
    // Store previous values
    const previousFilterType = filterPreferences.filterType;
    const previousViewMode = filterPreferences.viewMode;
    
    // Update only the values that have changed
    let preferencesChanged = false;
    
    if (previousFilterType !== filterType) {
      filterPreferences.filterType = filterType;
      preferencesChanged = true;
    }
    
    if (previousViewMode !== viewMode) {
      filterPreferences.viewMode = viewMode;
      preferencesChanged = true;
    }
    
    // Save preferences only if they changed
    if (preferencesChanged) {
      saveFilterPreferences();
    }
  }
  
  // Clear existing requests
  requestsContainer.innerHTML = '';
  requestsList = [];
  
  // Hide or show empty state
  const emptyState = liveViewEl.querySelector('.pixeltracer-empty-state');
  
  // Filter requests based on selected filter type
  let filteredRequests = currentTabRequests;
  if (filterPreferences.filterType !== 'all') {
    filteredRequests = currentTabRequests.filter(req => req.category === filterPreferences.filterType);
  }
  
  if (filteredRequests.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    return;
  } else {
    if (emptyState) emptyState.style.display = 'none';
  }
  
  // Choose display mode
  if (filterPreferences.viewMode === 'grouped') {
    displayGroupedRequests(filteredRequests);
  } else {
    displayChronologicalRequests(filteredRequests);
  }
}

/**
 * Display requests in chronological order (most recent first)
 * @param {Array} requests - The filtered requests to display
 */
function displayChronologicalRequests(requests) {
  // Clear existing requests first
  requestsContainer.innerHTML = '';
  requestsList = [];
  
  // Make sure we have actual requests to display
  if (!requests || !Array.isArray(requests) || requests.length === 0) {
    return;
  }
  
  // Sort by timestamp descending (newest first)
  const sortedRequests = [...requests].sort((a, b) => b.timestamp - a.timestamp);
  
  // Add requests to the UI (limited to prevent performance issues)
  const requestsToDisplay = sortedRequests.slice(0, MAX_DISPLAYED_REQUESTS);
  
  // Debug logging to help troubleshoot
  console.debug(`Displaying ${requestsToDisplay.length} requests in chronological view`);
  
  // Make sure each request has the minimum required fields and add to the UI
  requestsToDisplay.forEach(request => {
    if (request && request.providers && request.providers.length > 0) {
      // Create element with proper ID tracking
      const requestEl = createRequestElement(request);
      
      // Add to DOM and tracking list
      requestsContainer.appendChild(requestEl);
      requestsList.push(requestEl);
    }
  });
  
  // Log the final count for verification
  console.debug(`${requestsList.length} requests rendered in chronological view`);
}

/**
 * Display requests grouped by provider
 * @param {Array} requests - The filtered requests to display
 */
function displayGroupedRequests(requests) {
  // Clear existing requests first, but remember which providers were collapsed
  if (requestsContainer) {
    // Save collapsed state before clearing
    const providerGroups = requestsContainer.querySelectorAll('.pixeltracer-provider-group');
    providerGroups.forEach(group => {
      const providerId = group.dataset.providerId;
      if (providerId) {
        collapsedProviders[providerId] = group.classList.contains('collapsed');
      }
    });
  }
  
  requestsContainer.innerHTML = '';
  requestsList = [];
  
  // Group requests by provider
  const groupedByProvider = {};
  
  requests.forEach(request => {
    const providerId = request.providers[0] || 'unknown';
    if (!groupedByProvider[providerId]) {
      groupedByProvider[providerId] = [];
    }
    groupedByProvider[providerId].push(request);
  });
  
  // Sort provider groups by count (most requests first)
  const sortedProviders = Object.keys(groupedByProvider).sort((a, b) => 
    groupedByProvider[b].length - groupedByProvider[a].length
  );
  
  // Create UI for each group
  sortedProviders.forEach(providerId => {
    const providerRequests = groupedByProvider[providerId];
    const providerName = formatProviderName(providerId);
    
    // Create provider group container
    const groupContainer = document.createElement('div');
    groupContainer.className = 'pixeltracer-provider-group';
    groupContainer.dataset.providerId = providerId;
    
    // Restore collapsed state if it was previously set
    if (collapsedProviders[providerId]) {
      groupContainer.classList.add('collapsed');
    }
    
    // Create header for the group with toggle indicator
    const header = document.createElement('div');
    header.className = 'pixeltracer-provider-header';
    
    // Set the correct chevron icon based on collapsed state
    const chevronClass = collapsedProviders[providerId] ? 'fa-chevron-right' : 'fa-chevron-down';
    
    header.innerHTML = `
      <div class="pixeltracer-provider-header-left">
        <span class="pixeltracer-toggle-indicator">
          <i class="fas ${chevronClass}"></i>
        </span>
        <span class="pixeltracer-provider-name">${providerName}</span>
      </div>
      <span class="pixeltracer-provider-count">${providerRequests.length}</span>
    `;
    
    groupContainer.appendChild(header);
    
    // Add request items to the group
    const requestsContainer = document.createElement('div');
    requestsContainer.className = 'pixeltracer-provider-requests';
    
    // Sort by timestamp (newest first) and display all requests
    providerRequests
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach(request => {
        const requestEl = createRequestElement(request);
        requestsContainer.appendChild(requestEl);
        requestsList.push(requestEl);
      });
    
    groupContainer.appendChild(requestsContainer);
    
    // Add to main container
    document.getElementById('pixeltracer-requests-container').appendChild(groupContainer);
    
    // Add click handler to toggle visibility of request details
    header.addEventListener('click', (e) => {
      // Don't trigger if clicking on a request item
      if (e.target.closest('.pixeltracer-request-item')) {
        return;
      }
      
      // Toggle expanded/collapsed state
      groupContainer.classList.toggle('collapsed');
      
      // Update the toggle indicator
      const indicator = header.querySelector('.pixeltracer-toggle-indicator i');
      if (indicator) {
        if (groupContainer.classList.contains('collapsed')) {
          indicator.className = 'fas fa-chevron-right';
          // Save collapsed state
          collapsedProviders[providerId] = true;
        } else {
          indicator.className = 'fas fa-chevron-down';
          // Save expanded state
          collapsedProviders[providerId] = false;
        }
        
        // Save to localStorage
        try {
          const hostname = window.location.hostname;
          const key = `pixeltracer_collapsed_${hostname}`;
          localStorage.setItem(key, JSON.stringify(collapsedProviders));
        } catch (e) {
          // Ignore storage errors
        }
      }
    });
  });
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Skip handling messages if connection is lost
  if (!connectionAlive && message.action !== 'ping') {
    console.warn("Skipping message handling - extension connection lost");
    
    try {
      // Try to respond if possible
      sendResponse({ success: false, error: "Extension connection lost" });
    } catch (e) {
      // Cannot respond, context likely already invalid
    }
    return false; // Don't keep the channel open
  }
  
  // Allow handling ping messages even if not otherwise processing messages
  if (message.action === 'ping') {
    // Update our connection status to alive
    connectionAlive = true;
    sendResponse({ success: true, alive: true });
    return false; // No need to keep the messaging channel open
  }
  
  // Wrap in try-catch to handle extension context invalidation
  try {
    if (message.action === 'getPageInfo') {
      // Collect information about the current page that might be relevant
      const pageInfo = {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now()
      };
      
      sendResponse(pageInfo);
    } else if (message.action === 'enableLiveView') {
      createLiveView();
      liveViewEnabled = true;
      // Force data reload when enabling Live View
      loadTrackingData();
      saveLiveViewState('open');
      sendResponse({ success: true });
    } else if (message.action === 'disableLiveView') {
      removeLiveView();
      liveViewEnabled = false;
      saveLiveViewState('closed');
      sendResponse({ success: true });
    } else if (message.action === 'themeChanged') {
      // Update the theme for the Live View
      isDarkMode = message.theme === 'dark';
      updateLiveViewTheme();
      sendResponse({ success: true });
    } else if (message.action === 'refreshTracking') {
      // Immediately refresh the tracking data
      loadTrackingData();
      sendResponse({ success: true });
    } else if (message.action === 'trackingRequestDetected') {
      // Make sure we have a valid request object
      if (!message.request) {
        sendResponse({ success: false, error: 'No request data' });
        return true;
      }
      
      // Ensure we have a valid tab ID
      if (!currentTabId) {
        getCurrentTabInfo();
        // If we still don't have a tab ID after trying, store the request temporarily
        if (!currentTabId) {
          // Try once more after getting tab info
          setTimeout(() => {
            if (currentTabId && liveViewEnabled && connectionAlive) {
              processNewTrackingRequest(message.request);
            }
          }, 200);
          sendResponse({ success: true });
          return true;
        }
      }
      
      // If Live View is enabled, process the request
      if (liveViewEnabled) {
        processNewTrackingRequest(message.request);
      } else {
        // Even if Live View is not enabled, store the request so it's available
        // if Live View gets enabled later
        addNewRequestToLocalStore(message.request);
      }
      
      sendResponse({ success: true });
    } else if (message.action === 'trackingDataCleared') {
      // Tracking data was cleared by the popup
      currentTabRequests = [];
      
      // Keep collapsedProviders state intact - just refresh the data display
      refreshRequestList();
      updateStats();
      sendResponse({ success: true });
    } else if (message.action === 'pageRefreshed') {
      // Handle page refresh event from background script
      
      // Perform a complete reset of tracking data
      if (message.completeReset) {
        // Reset tracking data but preserve collapsed providers state
        currentTabRequests = [];
        
        // Update UI
        if (liveViewEnabled && liveViewEl) {
          updateStats();
          refreshRequestList();
          
          // Show empty state
          const emptyState = liveViewEl.querySelector('.pixeltracer-empty-state');
          if (emptyState) {
            emptyState.textContent = "Waiting for tracking requests...";
            emptyState.style.display = 'flex';
          }
        }
      } else {
        // Fallback to hostname-based filtering if completeReset is not specified
        const hostname = message.hostname;
        if (hostname) {
          // Filter out requests from the refreshed hostname
          currentTabRequests = currentTabRequests.filter(req => req.host !== hostname);
          
          // Update UI
          if (liveViewEnabled && liveViewEl) {
            updateStats();
            refreshRequestList();
          }
        }
      }
      
      sendResponse({ success: true });
    } else if (message.action === 'forceRefreshLiveView') {
      // Force a complete refresh of the Live View
      if (liveViewEnabled) {
        // Reset the current tracking data but preserve collapsed state
        currentTabRequests = [];
        
        // Force reload data
        loadTrackingData();
      }
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    
    // Check for extension context invalidation
    if (error.message && error.message.includes("Extension context invalidated")) {
      connectionAlive = false;
      handleConnectionLost();
    }
    
    // Try to send a response if possible
    try {
      sendResponse({ success: false, error: error.message });
    } catch (e) {
      // Cannot send response, context is likely already invalid
    }
  }
  
  return true; // Required for async response
});

/**
 * Process a new tracking request
 * @param {Object} request - The tracking request object
 */
function processNewTrackingRequest(request) {
  // Skip if connection is lost
  if (!connectionAlive) {
    console.warn("Skipping processNewTrackingRequest - extension connection lost");
    return;
  }
  
  // Skip if no request data
  if (!request) {
    return;
  }
  
  // Check if this is for our tab and is new
  if (!currentTabId) {
    getCurrentTabInfo();
    // If we still don't have tab ID, store request and process later when we get tab ID
    if (!currentTabId) {
      return;
    }
  }
  
  if (request.tabId !== currentTabId) {
    return;
  }
  
  try {
    // Add to our local array
    addNewRequestToLocalStore(request);
    
    // Update the UI stats
    updateStats();
    
    // Check if this request introduces a new category that might need a filter option
    const filterTypeSelect = document.getElementById('pixeltracer-filter-type');
    if (filterTypeSelect && request.category) {
      // Check if we need to add a new filter option
      const needToAddFilter = !Array.from(filterTypeSelect.options).some(
        option => option.value === request.category
      );
      
      if (needToAddFilter) {
        refreshFilters();
      }
    }
    
    // Add to UI only if Live View is visible and not minimized
    if (liveViewEnabled && liveViewEl && !isLiveViewMinimized) {
      // If we're in grouped view or if the filter would exclude this request,
      // we need to refresh the entire list to maintain consistency
      if (filterPreferences.viewMode === 'grouped' || 
          (filterPreferences.filterType !== 'all' && request.category !== filterPreferences.filterType)) {
        refreshRequestList();
      } else {
        // In chronological view with matching filter, simply add the new item
        addRequestItemToUI(request);
      }
    }
  } catch (error) {
    console.error("Error processing tracking request:", error);
    
    // Check if the error is related to connection loss
    if (error.message && error.message.includes("Extension context invalidated")) {
      connectionAlive = false;
      handleConnectionLost();
    }
  }
}

/**
 * Add a new request to the local store
 * @param {Object} request - The tracking request object
 */
function addNewRequestToLocalStore(request) {
  // Ensure request has required fields
  if (!request.requestId || !request.url) {
    return;
  }
  
  // Check if we already have this request (based on requestId)
  const existingIndex = currentTabRequests.findIndex(r => r.requestId === request.requestId);
  
  if (existingIndex >= 0) {
    // Update existing request
    currentTabRequests[existingIndex] = request;
  } else {
    // Add new request to the beginning of the array
    currentTabRequests.unshift(request);
  }
}

// Save Live View state for this domain
function saveLiveViewState(state) {
  const hostname = window.location.hostname;
  
  chrome.storage.local.get(['liveViewState'], (result) => {
    const liveViewState = result.liveViewState || {};
    liveViewState[hostname] = state;
    chrome.storage.local.set({ liveViewState });
  });
}

// Helper function to determine initial position for Live View
function getInitialPosition() {
  // Try to get the stored position first
  return new Promise((resolve) => {
    chrome.storage.local.get(['pixelTracerWindowPosition'], (result) => {
      if (result.pixelTracerWindowPosition) {
        resolve(result.pixelTracerWindowPosition);
      } else {
        // Default to bottom right if no position is stored
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const width = 450; // Same as in CSS
        
        resolve({
          top: windowHeight - 570 + 'px', // Leaving some space at the bottom
          left: windowWidth - width - 20 + 'px', // 20px from right edge
          right: 'auto',
          bottom: 'auto'
        });
      }
    });
  });
}

// Save the window position to storage
function saveWindowPosition(position) {
  chrome.storage.local.set({ pixelTracerWindowPosition: position });
}

// Function to remove the Live View
function removeLiveView() {
  if (liveViewEl) {
    liveViewEl.style.display = 'none';
    liveViewEnabled = false;
    saveLiveViewState('closed');
    
    // Notify the popup that Live View was closed
    chrome.runtime.sendMessage({
      action: 'liveViewClosed'
    });
  }
}

// Function to toggle minimized state
function toggleMinimize() {
  if (liveViewEl) {
    isLiveViewMinimized = !isLiveViewMinimized;
    liveViewEl.classList.toggle('minimized');
    
    // Save minimized state
    saveLiveViewState(isLiveViewMinimized ? 'minimized' : 'open');
  }
}

// Make an element draggable
function makeDraggable(element, handle) {
  if (!handle || !element) return;
  
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let isDragging = false;
  let initialTransform = '';
  let rafId = null;
  
  // Add draggable class to element
  element.classList.add('pixeltracer-draggable');
  
  handle.onmousedown = dragMouseDown;
  handle.ontouchstart = dragTouchStart;
  
  // Add styles for better performance
  const dragStyle = document.createElement('style');
  dragStyle.textContent = `
    .pixeltracer-draggable {
      will-change: transform;
      transform: translate3d(0, 0, 0);
      transition: none;
    }
    .pixeltracer-draggable.dragging {
      transition: none !important;
      user-select: none;
    }
    .pixeltracer-draggable.dragging * {
      pointer-events: none;
    }
    .pixeltracer-header.draggable {
      cursor: grab;
    }
    .pixeltracer-header.dragging {
      cursor: grabbing !important;
    }
  `;
  document.head.appendChild(dragStyle);
  
  // Make the handle look draggable
  handle.classList.add('draggable');
  
  function dragMouseDown(e) {
    e = e || window.event;
    
    // Prevent dragging if clicking on a button or control
    if (e.target.tagName === 'BUTTON' || e.target.closest('.pixeltracer-controls')) {
      return;
    }
    
    e.preventDefault();
    
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Store initial element position
    const rect = element.getBoundingClientRect();
    element.dataset.startX = rect.left;
    element.dataset.startY = rect.top;
    
    // Save initial transform
    initialTransform = element.style.transform || '';
    
    // Add dragging class
    element.classList.add('dragging');
    handle.classList.add('dragging');
    isDragging = true;
    
    // Setup event listeners
    document.addEventListener('mouseup', closeDragElement);
    document.addEventListener('mousemove', elementDrag);
  }
  
  function dragTouchStart(e) {
    // Prevent dragging if touching a button or control
    if (e.target.tagName === 'BUTTON' || e.target.closest('.pixeltracer-controls')) {
      return;
    }
    
    const touch = e.touches[0];
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    
    // Store initial element position
    const rect = element.getBoundingClientRect();
    element.dataset.startX = rect.left;
    element.dataset.startY = rect.top;
    
    // Save initial transform
    initialTransform = element.style.transform || '';
    
    // Add dragging class
    element.classList.add('dragging');
    handle.classList.add('dragging');
    isDragging = true;
    
    // Setup event listeners
    document.addEventListener('touchend', closeTouchDrag);
    document.addEventListener('touchmove', elementTouchDrag);
  }
  
  function elementDrag(e) {
    if (!isDragging) return;
    
    e = e || window.event;
    e.preventDefault();
    
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Cancel previous frame if it hasn't executed yet
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    // Use requestAnimationFrame for smoother animation
    rafId = requestAnimationFrame(() => updateElementPosition(pos1, pos2));
  }
  
  function elementTouchDrag(e) {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    pos1 = pos3 - touch.clientX;
    pos2 = pos4 - touch.clientY;
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    
    // Cancel previous frame if it hasn't executed yet
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    // Use requestAnimationFrame for smoother animation
    rafId = requestAnimationFrame(() => updateElementPosition(pos1, pos2));
  }
  
  function updateElementPosition(dx, dy) {
    rafId = null;
    
    // Get the current position from the element's transform or position
    let currentX = parseFloat(element.dataset.startX) || element.offsetLeft;
    let currentY = parseFloat(element.dataset.startY) || element.offsetTop;
    
    // Update with movement deltas
    currentX = currentX - dx;
    currentY = currentY - dy;
    
    // Update dataset for next frame
    element.dataset.startX = currentX;
    element.dataset.startY = currentY;
    
    // Calculate boundaries to keep window visible
    const minVisible = 20;
    const maxTop = window.innerHeight - minVisible;
    const maxLeft = window.innerWidth - minVisible;
    
    // Apply boundaries
    currentX = Math.max(0, Math.min(maxLeft, currentX));
    currentY = Math.max(0, Math.min(maxTop, currentY));
    
    // Use transform for better performance
    element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.left = '0';
    element.style.top = '0';
  }
  
  function closeDragElement() {
    if (!isDragging) return;
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
    
    // Finalize position (saves to storage)
    finalizePosition();
  }
  
  function closeTouchDrag() {
    if (!isDragging) return;
    document.removeEventListener('touchend', closeTouchDrag);
    document.removeEventListener('touchmove', elementTouchDrag);
    
    // Finalize position (saves to storage)
    finalizePosition();
  }
  
  function finalizePosition() {
    if (!isDragging) return;
    
    isDragging = false;
    element.classList.remove('dragging');
    handle.classList.remove('dragging');
    
    // Save the final position
    const rect = element.getBoundingClientRect();
    const position = {
      top: rect.top + 'px',
      left: rect.left + 'px',
      right: 'auto',
      bottom: 'auto'
    };
    
    // Save to storage
    saveWindowPosition(position);
  }
}

// Fill the General tab with request information
function fillGeneralTab(providerId, request) {
  const content = document.getElementById('pixeltracer-general-content');
  if (!content) {
    return;
  }
  
  // Get provider information from stored data or request from background
  let provider = trackingProvidersData[providerId];
  
  if (!provider) {
    chrome.runtime.sendMessage({ action: 'getProviderInfo', providerId }, (response) => {
      if (response && response.provider) {
        provider = response.provider;
        trackingProvidersData[providerId] = provider;
        fillGeneralTabContent(provider, request, content);
      } else {
        fillGeneralTabContent(null, request, content);
      }
    });
  } else {
    fillGeneralTabContent(provider, request, content);
  }
}

function fillGeneralTabContent(provider, request, content) {
  let providerName = formatProviderName(request.providers[0] || 'Unknown');
  let categoryName = request.category || 'Unknown';
  
  // Format category name
  categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
  
  if (provider) {
    categoryName = provider.category || categoryName;
    categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
  }
  
  let html = `
    <div class="pixeltracer-details-group">
      <div class="pixeltracer-details-group-title">
        <i class="fas fa-info-circle"></i> Request Overview
      </div>
      <div class="pixeltracer-details-item">
        <div class="pixeltracer-details-key">Provider</div>
        <div class="pixeltracer-details-value">${providerName}</div>
      </div>
      <div class="pixeltracer-details-item">
        <div class="pixeltracer-details-key">Category</div>
        <div class="pixeltracer-details-value">${categoryName}</div>
      </div>
      <div class="pixeltracer-details-item">
        <div class="pixeltracer-details-key">Event Type</div>
        <div class="pixeltracer-details-value">${request.eventType || 'Unknown'}</div>
      </div>
      <div class="pixeltracer-details-item">
        <div class="pixeltracer-details-key">Timestamp</div>
        <div class="pixeltracer-details-value">${new Date(request.timestamp).toLocaleString()}</div>
      </div>
    </div>
    
    <div class="pixeltracer-details-group">
      <div class="pixeltracer-details-group-title">
        <i class="fas fa-link"></i> URL Details
      </div>
      <div class="pixeltracer-details-item">
        <div class="pixeltracer-details-key">Full URL</div>
        <div class="pixeltracer-details-value">${request.url}</div>
      </div>
      <div class="pixeltracer-details-item">
        <div class="pixeltracer-details-key">Host</div>
        <div class="pixeltracer-details-value">${request.host || 'Unknown'}</div>
      </div>
      <div class="pixeltracer-details-item">
        <div class="pixeltracer-details-key">Path</div>
        <div class="pixeltracer-details-value">${request.path || 'Unknown'}</div>
      </div>
    </div>
  `;
  
  content.innerHTML = html;
}

// Fill the Event tab with event-specific details
function fillEventTab(providerId, request) {
  const content = document.getElementById('pixeltracer-event-content');
  if (!content) {
    return;
  }
  
  // Add styles for event cards if they don't exist
  if (!document.getElementById('pixeltracer-event-card-styles')) {
    const style = document.createElement('style');
    style.id = 'pixeltracer-event-card-styles';
    style.textContent = `
      .pixeltracer-event-card {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        margin-bottom: 16px;
        overflow: hidden;
      }
      .pixeltracer-event-card-header {
        background-color: #f5f5f5;
        padding: 8px 12px;
        font-weight: 600;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .pixeltracer-event-card-badge {
        background-color: #4a90e2;
        color: white;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        text-transform: uppercase;
      }
      .pixeltracer-event-section {
        background-color: #f9f9f9;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 500;
        border-top: 1px solid #eaeaea;
        border-bottom: 1px solid #eaeaea;
        color: #555;
      }
      .pixeltracer-event-card .pixeltracer-details-item:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      /* Dark mode styles */
      body.dark-mode .pixeltracer-event-card {
        border-color: #444;
      }
      body.dark-mode .pixeltracer-event-card-header {
        background-color: #333;
        border-color: #444;
      }
      body.dark-mode .pixeltracer-event-section {
        background-color: #2a2a2a;
        border-color: #444;
        color: #ccc;
      }
      body.dark-mode .pixeltracer-event-card .pixeltracer-details-item:nth-child(even) {
        background-color: #2a2a2a;
      }
    `;
    document.head.appendChild(style);
  }
  
  chrome.runtime.sendMessage({ action: 'getProviderInfo', providerId }, (response) => {
    if (!response || !response.provider) {
      content.innerHTML = '<div class="pixeltracer-empty-state">No event details available</div>';
      return;
    }
    
    const provider = response.provider;
    
    // Get the schema for this provider
    const schema = provider.schema || {};
    
    // For AdNabu provider with array-based payloads, create a card for each event
    if (providerId === 'adnabu-google-ads' && request.payload && Array.isArray(request.payload) && request.payload.length > 0) {
      let html = '';
      
      // Process each event in the payload
      request.payload.forEach((event, index) => {
        const eventName = event.event_name || 'Unknown';
        const conversionId = event.conversion_id || '';
        
        html += `
          <div class="pixeltracer-event-card">
            <div class="pixeltracer-event-card-header">
              <span>Event ${index + 1}: ${eventName}</span>
              ${conversionId ? `<span class="pixeltracer-event-card-badge">${conversionId}</span>` : ''}
            </div>
        `;
        
        // Main properties
        const keyProperties = [
          { key: 'event_id', label: 'Event ID' },
          { key: 'event_name', label: 'Event Type' },
          { key: 'conversion_id', label: 'Conversion ID' },
          { key: 'conversion_label', label: 'Conversion Label' },
          { key: 'value', label: 'Value' },
          { key: 'currency', label: 'Currency' }
        ];
        
        keyProperties.forEach(prop => {
          if (event[prop.key] !== undefined && event[prop.key] !== null) {
            html += `
              <div class="pixeltracer-details-item">
                <div class="pixeltracer-details-key">${prop.label}</div>
                <div class="pixeltracer-details-value">${event[prop.key]}</div>
              </div>
            `;
          }
        });
        
        // Other properties in a separate section
        const otherProps = [];
        Object.entries(event).forEach(([key, value]) => {
          // Skip already added key properties
          if (keyProperties.some(p => p.key === key)) return;
          
          // Skip null/undefined values
          if (value === null || value === undefined) return;
          
          // Skip complex objects that aren't arrays
          if (typeof value === 'object' && !Array.isArray(value)) return;
          
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          otherProps.push({ 
            key: formattedKey, 
            value: Array.isArray(value) ? JSON.stringify(value) : value 
          });
        });
        
        if (otherProps.length > 0) {
          html += `<div class="pixeltracer-event-section">Additional Properties</div>`;
          
          otherProps.forEach(prop => {
            html += `
              <div class="pixeltracer-details-item">
                <div class="pixeltracer-details-key">${prop.key}</div>
                <div class="pixeltracer-details-value">${prop.value}</div>
              </div>
            `;
          });
        }
        
        // Handle items array if present
        if (event.items && Array.isArray(event.items) && event.items.length > 0) {
          html += `<div class="pixeltracer-event-section">Items (${event.items.length})</div>`;
          
          event.items.forEach((item, itemIndex) => {
            html += `
              <div class="pixeltracer-details-item" style="background-color: #f0f0f0;">
                <div class="pixeltracer-details-key" style="font-weight: 600;">Item ${itemIndex + 1}</div>
                <div class="pixeltracer-details-value"></div>
              </div>
            `;
            
            Object.entries(item).forEach(([key, value]) => {
              if (value === null || value === undefined) return;
              
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              html += `
                <div class="pixeltracer-details-item">
                  <div class="pixeltracer-details-key" style="padding-left: 24px;">${formattedKey}</div>
                  <div class="pixeltracer-details-value">${value}</div>
                </div>
              `;
            });
          });
        }
        
        html += `</div>`;
      });
      
      // Add additional events from customData if they exist
      if (request.customData && request.customData.events && request.customData.events.length > 0) {
        // Group events by their event number
        const eventGroups = {};
        
        request.customData.events.forEach(event => {
          // Extract event number from field name (e.g. "Event 2 Type" -> 2)
          const match = event.field.match(/Event (\d+)/);
          if (match && match[1]) {
            const eventNum = match[1];
            if (!eventGroups[eventNum]) {
              eventGroups[eventNum] = [];
            }
            eventGroups[eventNum].push(event);
          }
        });
        
        // Create a card for each event group if not already created from the payload
        const payloadEventCount = request.payload.length;
        
        Object.entries(eventGroups).forEach(([eventNum, events]) => {
          // Skip if this event was already in the payload
          if (parseInt(eventNum) <= payloadEventCount) return;
          
          // Find type and conversion ID
          const eventType = events.find(e => e.field.includes('Type'))?.value || 'Unknown';
          const conversionId = events.find(e => e.field.includes('Conversion ID'))?.value || '';
          
          html += `
            <div class="pixeltracer-event-card">
              <div class="pixeltracer-event-card-header">
                <span>Event ${eventNum}: ${eventType}</span>
                ${conversionId ? `<span class="pixeltracer-event-card-badge">${conversionId}</span>` : ''}
              </div>
          `;
          
          events.forEach(event => {
            html += `
              <div class="pixeltracer-details-item">
                <div class="pixeltracer-details-key">${event.field.replace(`Event ${eventNum} `, '')}</div>
                <div class="pixeltracer-details-value">${event.value}</div>
              </div>
            `;
          });
          
          html += `</div>`;
        });
      }
      
      content.innerHTML = html;
    } else {
      // Standard display for other providers
      // Display formatted event type
      let formattedEventType = formatEventType(request.eventType) || 'Unknown';
      if (schema.eventTypes && schema.eventTypes[request.eventType]) {
        formattedEventType = schema.eventTypes[request.eventType];
      }
      
      let html = `
        <div class="pixeltracer-details-group">
          <div class="pixeltracer-details-group-title">
            <i class="fas fa-bolt"></i> Event Information
          </div>
          <div class="pixeltracer-details-item">
            <div class="pixeltracer-details-key">Event Type</div>
            <div class="pixeltracer-details-value">${formattedEventType}</div>
          </div>
      `;
      
      // Check if we have event parameters for this provider
      const params = request.params || {};
      
      if (schema.groups && schema.groups.event) {
        const eventFields = schema.groups.event.fields || [];
        
        eventFields.forEach(field => {
          if (params[field.key]) {
            html += `
              <div class="pixeltracer-details-item">
                <div class="pixeltracer-details-key">${field.label}</div>
                <div class="pixeltracer-details-value">${params[field.key]}</div>
              </div>
            `;
          }
        });
      }
      
      // Handle custom data if available (e.g., Facebook Pixel contents)
      if (request.customData && request.customData.contents) {
        html += `
          <div class="pixeltracer-details-group-title">
            <i class="fas fa-shopping-cart"></i> Product Information
          </div>
        `;
        
        request.customData.contents.forEach(item => {
          html += `
            <div class="pixeltracer-details-item">
              <div class="pixeltracer-details-key">${item.field}</div>
              <div class="pixeltracer-details-value">${item.value}</div>
            </div>
          `;
        });
      }
      
      html += '</div>';
      
      content.innerHTML = html;
    }
  });
}

// Fill the Parameters tab with URL parameters
function fillParamsTab(request) {
  const content = document.getElementById('pixeltracer-params-content');
  if (!content) {
    return;
  }
  
  const params = request.params || {};
  const paramKeys = Object.keys(params);
  
  if (paramKeys.length === 0) {
    content.innerHTML = '<div class="pixeltracer-empty-state">No parameters found</div>';
    return;
  }
  
  let html = `
    <table class="pixeltracer-param-table">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  paramKeys.sort().forEach(key => {
    html += `
      <tr>
        <td class="pixeltracer-param-name">${key}</td>
        <td class="pixeltracer-param-value">${params[key]}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  content.innerHTML = html;
}

// Fill the Headers tab with request headers
function fillHeadersTab(request) {
  const content = document.getElementById('pixeltracer-headers-content');
  
  if (!content) {
    // Try looking for the parent tab and add the content div if needed
    const headerTab = document.getElementById('pixeltracer-headers-tab');
    if (headerTab) {
      const contentDiv = document.createElement('div');
      contentDiv.id = 'pixeltracer-headers-content';
      headerTab.appendChild(contentDiv);
      return fillHeadersTab(request); // Retry after creating the element
    }
    return;
  }
  
  const headers = request.headers || {};
  const headerKeys = Object.keys(headers);
  
  if (headerKeys.length === 0) {
    content.innerHTML = '<div class="pixeltracer-empty-state">No headers found</div>';
    return;
  }
  
  let html = `
    <table class="pixeltracer-param-table">
      <thead>
        <tr>
          <th>Header</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  headerKeys.sort().forEach(key => {
    html += `
      <tr>
        <td class="pixeltracer-param-name">${key}</td>
        <td class="pixeltracer-param-value">${headers[key]}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  content.innerHTML = html;
}

// Fill the Payload tab with request payload
function fillPayloadTab(request) {
  const content = document.getElementById('pixeltracer-payload-content');
  
  if (!content) {
    // Try looking for the parent tab and add the content div if needed
    const payloadTab = document.getElementById('pixeltracer-payload-tab');
    if (payloadTab) {
      const contentDiv = document.createElement('div');
      contentDiv.id = 'pixeltracer-payload-content';
      payloadTab.appendChild(contentDiv);
      return fillPayloadTab(request); // Retry after creating the element
    }
    return;
  }
  
  if (!request.payload) {
    content.innerHTML = '<div class="pixeltracer-empty-state">No payload data available</div>';
    return;
  }
  
  let payloadStr = '';
  
  try {
    if (typeof request.payload === 'object') {
      payloadStr = JSON.stringify(request.payload, null, 2);
    } else {
      payloadStr = request.payload;
    }
  } catch (e) {
    payloadStr = 'Error formatting payload: ' + e.message;
  }
  
  content.innerHTML = `<pre>${payloadStr}</pre>`;
}

// Format provider ID to a display name
function formatProviderName(providerId) {
  // If we have the provider info, use its name
  if (trackingProvidersData[providerId] && trackingProvidersData[providerId].name) {
    return trackingProvidersData[providerId].name;
  }
  
  // Otherwise format the ID
  return providerId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format event type for better display
function formatEventType(eventType) {
  if (!eventType || eventType === 'Unknown') return 'Unknown';
  
  // Common event type replacements for better readability
  const replacements = {
    'pageview': 'Page View',
    'PageView': 'Page View',
    'addtocart': 'Add to Cart',
    'AddToCart': 'Add to Cart',
    'purchase': 'Purchase',
    'conversion': 'Conversion',
    'lead': 'Lead',
    'signup': 'Sign Up',
    'ViewContent': 'View Content',
    'CompleteRegistration': 'Registration'
  };
  
  return replacements[eventType] || eventType;
}

// Format Account ID for better display
function formatAccountId(accountId, providerId) {
  if (!accountId) return '';
  
  // Format based on provider
  if (providerId === 'google-analytics') {
    // For GA4 (G-XXXXXXXX) or Universal Analytics (UA-XXXXXX-X)
    if (accountId.length > 8) {
      return accountId.substring(0, 8) + '...';
    }
  } else if (providerId === 'facebook-pixel') {
    // Facebook pixels are usually numeric and long
    if (accountId.length > 8) {
      return accountId.substring(0, 8) + '...';
    }
  }
  
  // Default formatting for other providers
  if (accountId.length > 10) {
    return accountId.substring(0, 10) + '...';
  }
  
  return accountId;
}

// Get description for event types to use in tooltips
function getEventTypeDescription(eventType) {
  const descriptions = {
    'Page View': 'Records a user viewing a page',
    'View Content': 'User viewed specific content',
    'Add to Cart': 'User added an item to shopping cart',
    'Purchase': 'User completed a purchase',
    'Conversion': 'User completed a goal or conversion',
    'Lead': 'User submitted contact information',
    'Sign Up': 'User registered for an account',
    'Registration': 'User completed registration process'
  };
  
  return descriptions[eventType] || 'Tracking event';
}

/**
 * Create a request element without adding it to the DOM
 * @param {Object} request - The tracking request object
 * @returns {HTMLElement} - The created element
 */
function createRequestElement(request) {
  if (!request || !request.providers || !request.providers.length) {
    return document.createElement('div'); // Return empty element for invalid requests
  }

  // Create request element
  const requestEl = document.createElement('div');
  requestEl.className = `pixeltracer-request-item pixeltracer-category-${request.category || 'analytics'}`;
  
  // Add request ID to dataset for better tracking
  const providerId = request.providers[0] || 'unknown';
  requestEl.dataset.requestId = request.requestId || `req-${request.timestamp}-${providerId}`;
  
  // Format time
  const time = new Date(request.timestamp);
  const timeString = time.toLocaleTimeString();
  
  // Get provider display name and account ID
  let providerName = formatProviderName(providerId);
  
  let accountId = '';
  
  // Extract account ID if available
  if (request.params) {
    if (request.params.tid) { // Google Analytics
      accountId = request.params.tid;
    } else if (request.params.id) { // Facebook, etc.
      accountId = request.params.id;
    }
  }
  
  // Format account ID for display
  let displayAccountId = '';
  if (accountId) {
    let formattedAccountId = formatAccountId(accountId, providerId);
    displayAccountId = `<span class="pixeltracer-account-id" title="${accountId}">(${formattedAccountId})</span>`;
  }
  
  // Get event type and format for display
  let eventType = request.eventType || 'Unknown';
  let formattedEventType = formatEventType(eventType);
  let eventDescription = getEventTypeDescription(formattedEventType);
  
  requestEl.innerHTML = `
    <div class="pixeltracer-request-header">
      <div class="pixeltracer-request-title">
        <span class="pixeltracer-event-badge" data-type="${eventType}" title="${eventDescription}">${formattedEventType}</span>
        ${providerName} ${displayAccountId}
      </div>
      <div class="pixeltracer-event-time">${timeString}</div>
    </div>
  `;
  
  // Add click handler to show details
  requestEl.addEventListener('click', (e) => {
    e.stopPropagation();
    showDetailWindow(providerName, providerId, request);
  });
  
  return requestEl;
}

/**
 * Add a request item to the UI
 * @param {Object} request - The tracking request object
 */
function addRequestItemToUI(request) {
  if (!liveViewEl || !requestsContainer) return;
  
  // First check if the request passes the current filter
  if (filterPreferences.filterType !== 'all' && request.category !== filterPreferences.filterType) {
    // Request doesn't match the current filter, don't add it
    return;
  }
  
  // Verify the request has necessary data
  if (!request || !request.providers || !request.providers[0]) {
    return;
  }
  
  // Create the request element
  const requestEl = createRequestElement(request);
  
  // If we're in grouped view, we need to refresh the entire view to maintain grouping
  if (filterPreferences.viewMode === 'grouped') {
    // Rather than trying to update a single item in grouped view, refresh the entire list
    refreshRequestList();
    return;
  }
  
  // Use requestId for duplicate detection instead of trying to compare DOM elements
  // This is more reliable and less prone to errors
  const requestExists = requestsList.some(existingEl => {
    const requestId = existingEl.dataset.requestId;
    return requestId && requestId === request.requestId;
  });
  
  // Skip if this is a duplicate
  if (requestExists) {
    return;
  }
  
  // In chronological view, add at the top
  requestsContainer.prepend(requestEl);
  requestsList.unshift(requestEl);
  
  // Remove oldest request from DOM if we have too many
  if (requestsList.length > MAX_DISPLAYED_REQUESTS) {
    const oldestRequest = requestsList.pop();
    if (oldestRequest && oldestRequest.parentNode) {
      oldestRequest.parentNode.removeChild(oldestRequest);
    }
  }
}

// Update stats in the Live View
function updateStats() {
  if (!liveViewEl) return;
  
  const totalRequestsEl = document.getElementById('pixeltracer-total-requests');
  const uniqueProvidersEl = document.getElementById('pixeltracer-unique-providers');
  
  if (!totalRequestsEl || !uniqueProvidersEl) return;
  
  // Count total requests
  totalRequestsEl.textContent = currentTabRequests.length;
  
  // Count unique providers
  const uniqueProviders = new Set();
  currentTabRequests.forEach(request => {
    request.providers.forEach(provider => uniqueProviders.add(provider));
  });
  
  uniqueProvidersEl.textContent = uniqueProviders.size;
}

// Function to detect inline tracking scripts
function detectInlineTrackingScripts() {
  const scripts = document.querySelectorAll('script');
  const trackingKeywords = [
    'gtag', 'ga', 'fbq', 'twq', 'linkedin', 
    'hotjar', 'mixpanel', 'segment', 'amplitude'
  ];
  
  const detectedScripts = [];
  
  scripts.forEach(script => {
    const content = script.textContent || '';
    
    trackingKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        detectedScripts.push({
          keyword,
          snippet: content.substring(
            Math.max(0, content.indexOf(keyword) - 40),
            Math.min(content.length, content.indexOf(keyword) + 100)
          )
        });
      }
    });
  });
  
  if (detectedScripts.length > 0) {
    chrome.runtime.sendMessage({
      action: 'inlineScriptsDetected',
      scripts: detectedScripts
    });
  }
}

// Run once when the page loads
detectInlineTrackingScripts();

// Also run when the DOM content changes significantly
const observer = new MutationObserver(mutations => {
  let shouldScan = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && 
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(node => 
          node.tagName === 'SCRIPT' || node.tagName === 'IFRAME')) {
      shouldScan = true;
      break;
    }
  }
  
  if (shouldScan) {
    detectInlineTrackingScripts();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Show the detail window
function showDetailWindow(providerName, providerId, request) {
  
  // Create the detail window if it doesn't exist yet
  if (!detailWindowEl) {
    createDetailWindow();
  }
  
  // Make sure we have a valid reference before proceeding
  if (!detailWindowEl) {
    return;
  }
  
  // Set title
  const titleEl = document.getElementById('pixeltracer-detail-title');
  if (titleEl) {
    titleEl.textContent = `${providerName} Request Details`;
  }
  
  // Fill tab content
  fillGeneralTab(providerId, request);
  fillEventTab(providerId, request);
  fillParamsTab(request);
  fillHeadersTab(request);
  fillPayloadTab(request);
  
  // Show the window and overlay
  detailWindowEl.classList.add('visible');
  if (detailOverlayEl) {
    detailOverlayEl.classList.add('visible');
  }
  
  // Set first tab as active
  setActiveTab('general');
}

// Function to create the detail window for viewing request details
function createDetailWindow() {
  // Remove any existing detail window first
  if (detailWindowEl) {
    detailWindowEl.remove();
  }
  if (detailOverlayEl) {
    detailOverlayEl.remove();
  }
  
  // Create new window
  detailWindowEl = document.createElement('div');
  detailWindowEl.id = 'pixeltracer-detail-window';
  detailWindowEl.className = 'pixeltracer-detail-window';
  
  // Apply dark mode if enabled
  if (isDarkMode) {
    detailWindowEl.classList.add('dark-mode');
  }
  
  detailWindowEl.innerHTML = `
    <div class="pixeltracer-detail-header">
      <h3><i class="fas fa-info-circle"></i> <span id="pixeltracer-detail-title">Request Details</span></h3>
      <button id="pixeltracer-detail-close">&times;</button>
    </div>
    <div class="pixeltracer-detail-content">
      <div class="pixeltracer-detail-tabs">
        <button class="pixeltracer-tab-button active" data-tab="general"><i class="fas fa-globe"></i> General</button>
        <button class="pixeltracer-tab-button" data-tab="event"><i class="fas fa-bolt"></i> Event Details</button>
        <button class="pixeltracer-tab-button" data-tab="params"><i class="fas fa-list-ul"></i> Parameters</button>
        <button class="pixeltracer-tab-button" data-tab="headers"><i class="fas fa-tags"></i> Headers</button>
        <button class="pixeltracer-tab-button" data-tab="payload"><i class="fas fa-code"></i> Payload</button>
      </div>
      <div class="pixeltracer-tab-content">
        <div class="pixeltracer-tab-pane active" id="pixeltracer-general-tab">
          <div id="pixeltracer-general-content"></div>
        </div>
        <div class="pixeltracer-tab-pane" id="pixeltracer-event-tab">
          <div id="pixeltracer-event-content"></div>
        </div>
        <div class="pixeltracer-tab-pane" id="pixeltracer-params-tab">
          <div id="pixeltracer-params-content"></div>
        </div>
        <div class="pixeltracer-tab-pane" id="pixeltracer-headers-tab">
          <div id="pixeltracer-headers-content"></div>
        </div>
        <div class="pixeltracer-tab-pane" id="pixeltracer-payload-tab">
          <div id="pixeltracer-payload-content"></div>
        </div>
      </div>
    </div>
  `;
  
  // Add font awesome if needed
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }
  
  // Create and add the overlay
  detailOverlayEl = document.createElement('div');
  detailOverlayEl.className = 'pixeltracer-detail-overlay';
  document.body.appendChild(detailOverlayEl);
  document.body.appendChild(detailWindowEl);
  
  // Add event listeners for tabs
  const tabButtons = detailWindowEl.querySelectorAll('.pixeltracer-tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      setActiveTab(tabName);
    });
  });
  
  // Add close button event listener
  const closeButton = detailWindowEl.querySelector('#pixeltracer-detail-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeDetailWindow);
  }
  
  // Click on overlay to close
  detailOverlayEl.addEventListener('click', closeDetailWindow);
}

// Set the active tab in the detail window
function setActiveTab(tabName) {
  if (!detailWindowEl) return;
  
  const tabButtons = detailWindowEl.querySelectorAll('.pixeltracer-tab-button');
  const tabPanes = detailWindowEl.querySelectorAll('.pixeltracer-tab-pane');
  
  // Remove active class from all buttons and panes
  tabButtons.forEach(button => button.classList.remove('active'));
  tabPanes.forEach(pane => pane.classList.remove('active'));
  
  // Add active class to the selected button and pane
  const selectedButton = detailWindowEl.querySelector(`.pixeltracer-tab-button[data-tab="${tabName}"]`);
  const selectedPane = document.getElementById(`pixeltracer-${tabName}-tab`);
  
  if (selectedButton) selectedButton.classList.add('active');
  if (selectedPane) selectedPane.classList.add('active');
}

// Close the detail window
function closeDetailWindow() {
  if (!detailWindowEl) return;
  
  detailWindowEl.classList.remove('visible');
  
  if (detailOverlayEl) {
    detailOverlayEl.classList.remove('visible');
  }
}

/**
 * Load filter preferences from storage
 */
function loadFilterPreferences() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pixelTracerFilterPreferences'], (result) => {
      if (result.pixelTracerFilterPreferences) {
        // Make sure we're not getting null or undefined values
        const savedPrefs = result.pixelTracerFilterPreferences;
        
        if (savedPrefs.filterType) {
          filterPreferences.filterType = savedPrefs.filterType;
        }
        
        if (savedPrefs.viewMode) {
          filterPreferences.viewMode = savedPrefs.viewMode;
        }
      }
      resolve(filterPreferences);
    });
  });
}

/**
 * Save filter preferences to storage
 */
function saveFilterPreferences() {
  chrome.storage.local.set({ pixelTracerFilterPreferences: filterPreferences });
}

/**
 * Refreshes the filter options based on detected tracking data
 */
function refreshFilters() {
  const filterTypeSelect = document.getElementById('pixeltracer-filter-type');
  if (!filterTypeSelect) return;
  
  // Keep the currently selected option
  const currentValue = filterTypeSelect.value || 'all';
  
  // Clear existing options (except "All Requests")
  while (filterTypeSelect.options.length > 1) {
    filterTypeSelect.remove(1);
  }
  
  // Get unique categories from current tab requests
  const categories = new Set();
  currentTabRequests.forEach(request => {
    if (request.category) {
      categories.add(request.category);
    }
  });
  
  // Add provider-based options
  const uniqueProviders = new Set();
  currentTabRequests.forEach(request => {
    request.providers.forEach(provider => uniqueProviders.add(provider));
  });
  
  // Add category filters
  Array.from(categories).sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    
    // Format category name (e.g., 'analytics' -> 'Analytics')
    const displayName = category.charAt(0).toUpperCase() + category.slice(1);
    option.textContent = displayName;
    
    filterTypeSelect.appendChild(option);
  });
  
  // Special provider-based filters can be added here if needed
  
  // Restore previously selected value if it still exists
  for (let i = 0; i < filterTypeSelect.options.length; i++) {
    if (filterTypeSelect.options[i].value === currentValue) {
      filterTypeSelect.selectedIndex = i;
      break;
    }
  }
}

// Function to create and show the Live View floating window
function createLiveView() {
  // Add refresh button styles
  addRefreshButtonStyles();
  
  // If it already exists, just show it
  if (liveViewEl) {
    liveViewEl.style.display = 'block';
    
    // Restore minimized state if needed
    if (isLiveViewMinimized) {
      liveViewEl.classList.add('minimized');
    } else {
      liveViewEl.classList.remove('minimized');
    }
    
    // Ensure we have the references to important elements
    if (!requestsContainer) {
      requestsContainer = document.getElementById('pixeltracer-requests-container');
    }
    
    return;
  }
  
  // Create the container element
  liveViewEl = document.createElement('div');
  liveViewEl.id = 'pixeltracer-live-view';
  liveViewEl.innerHTML = `
    <div class="pixeltracer-header">
      <h3><i class="fas fa-radar"></i> PixelTracer Live View</h3>
      <div class="pixeltracer-controls">
        <button id="pixeltracer-minimize">−</button>
        <button id="pixeltracer-close">×</button>
      </div>
    </div>
    <div class="pixeltracer-body">
      <div class="pixeltracer-stats">
        <div class="pixeltracer-stat-item">
          <span class="pixeltracer-stat-value" id="pixeltracer-total-requests">0</span>
          <span class="pixeltracer-stat-label">Requests</span>
        </div>
        <div class="pixeltracer-stat-item">
          <span class="pixeltracer-stat-value" id="pixeltracer-unique-providers">0</span>
          <span class="pixeltracer-stat-label">Providers</span>
        </div>
      </div>
      <div class="pixeltracer-filter-bar">
        <div class="pixeltracer-filter-group">
          <label for="pixeltracer-filter-type">Filter:</label>
          <select id="pixeltracer-filter-type">
            <option value="all">All Requests</option>
            <!-- Additional options will be populated dynamically -->
          </select>
        </div>
        <div class="pixeltracer-filter-group">
          <label for="pixeltracer-view-mode">View:</label>
          <select id="pixeltracer-view-mode">
            <option value="chronological">Chronological</option>
            <option value="grouped">Grouped by Provider</option>
          </select>
        </div>
      </div>
      <div class="pixeltracer-section-header">
        <h2><i class="fas fa-exchange-alt"></i> Recent Requests</h2>
      </div>
      <div id="pixeltracer-requests-container"></div>
      <div class="pixeltracer-empty-state">
        Waiting for tracking requests...
      </div>
    </div>
  `;

  // Apply dark mode if enabled
  if (isDarkMode && liveViewEl) {
    liveViewEl.classList.add('dark-mode');
  }
  
  // Add font awesome if needed
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }
  
  // Set initial position from saved settings or defaults
  getInitialPosition().then(position => {
    if (position) {
      // Apply correct positioning with top/left instead of transform
      liveViewEl.style.top = position.top;
      liveViewEl.style.left = position.left;
      liveViewEl.style.bottom = position.bottom;
      liveViewEl.style.right = position.right;
    }
  });
  
  document.body.appendChild(liveViewEl);
  
  // Make it draggable
  const handle = liveViewEl.querySelector('.pixeltracer-header');
  makeDraggable(liveViewEl, handle);
  
  // Add event listeners for controls
  const minimizeButton = liveViewEl.querySelector('#pixeltracer-minimize');
  minimizeButton.addEventListener('click', toggleMinimize);
  
  const closeButton = liveViewEl.querySelector('#pixeltracer-close');
  closeButton.addEventListener('click', removeLiveView);
  
  // Get reference to the requests container for later use
  requestsContainer = document.getElementById('pixeltracer-requests-container');
  
  // Add event listeners for filters
  const filterTypeSelect = liveViewEl.querySelector('#pixeltracer-filter-type');
  const viewModeSelect = liveViewEl.querySelector('#pixeltracer-view-mode');
  
  // Set initial values from saved preferences
  viewModeSelect.value = filterPreferences.viewMode;
  
  // Populate filter options based on existing data
  refreshFilters();
  
  // Set filter value after options are populated
  if (filterTypeSelect) {
    filterTypeSelect.value = filterPreferences.filterType;
  }
  
  filterTypeSelect.addEventListener('change', (e) => {
    filterPreferences.filterType = e.target.value;
    saveFilterPreferences();
    refreshRequestList();
  });
  
  viewModeSelect.addEventListener('change', (e) => {
    filterPreferences.viewMode = e.target.value;
    saveFilterPreferences();
    refreshRequestList();
  });
  
  // Initial refresh of requests
  refreshRequestList();
  
  // Update the live view enabled state
  saveLiveViewState(true);
  
  return liveViewEl;
}

// Add a function to update the Live View theme
function updateLiveViewTheme() {
  if (liveViewEl) {
    if (isDarkMode) {
      liveViewEl.classList.add('dark-mode');
    } else {
      liveViewEl.classList.remove('dark-mode');
    }
  }
  
  if (detailWindowEl) {
    if (isDarkMode) {
      detailWindowEl.classList.add('dark-mode');
    } else {
      detailWindowEl.classList.remove('dark-mode');
    }
  }
}

function onPageNavigation() {
    // Clear tracking data state
    
    currentTabRequests = [];
    
    // Also clear filter state
    clearFilterState();
    
    // Clear the requestsContainer
    if (requestsContainer) {
        requestsContainer.innerHTML = '';
    }
}

/**
 * Save collapsed provider state to localStorage
 */
function saveCollapsedProviders() {
  try {
    const hostname = window.location.hostname;
    const key = `pixeltracer_collapsed_${hostname}`;
    localStorage.setItem(key, JSON.stringify(collapsedProviders));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Load collapsed provider state from localStorage
 */
function loadCollapsedProviders() {
  try {
    const hostname = window.location.hostname;
    const key = `pixeltracer_collapsed_${hostname}`;
    const savedState = localStorage.getItem(key);
    if (savedState) {
      collapsedProviders = JSON.parse(savedState);
    }
  } catch (e) {
    // If there's an error, just use the default empty object
    collapsedProviders = {};
  }
}
