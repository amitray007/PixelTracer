// Get tracking providers from background script
let trackingProviders = {};

/**
 * Helper function to safely get DOM elements with null checks
 * @param {string} id - Element ID to find
 * @returns {HTMLElement|null} - The element or null if not found
 */
function safeGetElement(id) {
  return document.getElementById(id);
}

// DOM elements - get them safely
const totalRequestsElement = safeGetElement('total-requests');
const uniqueProvidersElement = safeGetElement('unique-providers');
const providersContainer = safeGetElement('providers-container');
const requestsContainer = safeGetElement('requests-container');
const clearDataButton = safeGetElement('clear-data');
const exportDataButton = safeGetElement('export-data');
const liveViewButton = safeGetElement('live-view-btn');
const reportsButton = safeGetElement('reports-btn');
const themeToggleButton = safeGetElement('theme-toggle-btn');
const detailWindow = safeGetElement('detail-window');
const reportsWindow = safeGetElement('reports-window');
const detailOverlay = safeGetElement('detail-overlay');
const detailTitle = safeGetElement('detail-title');
const detailCloseBtn = safeGetElement('detail-close');
const reportsCloseBtn = safeGetElement('reports-close');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const collapseAllRequestsButton = safeGetElement('collapse-all-requests');
const expandAllRequestsButton = safeGetElement('expand-all-requests');

// State management
let isLiveViewEnabled = false;
let currentTabRequests = [];
let currentPageUrl = '';
let isDarkMode = false;
let previousRequestCount = 0; // Track previous request count to detect data loss

// Connection status monitor
let extensionConnected = true;

/**
 * Check if content script is properly connected
 * @param {number} tabId - The tab ID to check
 * @returns {Promise<boolean>} - Whether connection is active
 */
async function checkContentScriptConnection(tabId) {
  if (!tabId) return false;
  
  try {
    // Try to send a ping message to the content script
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return response && response.alive;
  } catch (e) {
    // If there's an error, consider the content script not connected
    console.warn("Content script connection check failed:", e.message);
    return false;
  }
}

/**
 * Handle content script connection issues
 */
function handleContentScriptDisconnection(tabId) {
  extensionConnected = false;
  
  // Safely update UI elements
  if (totalRequestsElement) {
    totalRequestsElement.textContent = "!";
  }
  
  if (uniqueProvidersElement) {
    uniqueProvidersElement.textContent = "!";
  }
  
  if (providersContainer) {
    providersContainer.innerHTML = 
      `<div class="data-loss-message">
        <i class="fas fa-exclamation-triangle"></i>
        <div>Extension connection issue detected.</div>
        <button id="refresh-page-btn" class="refresh-btn">Refresh Page</button>
        <button id="reload-extension-btn" class="refresh-btn">Reload Extension</button>
      </div>`;
  }
  
  if (requestsContainer) {
    requestsContainer.innerHTML = 
      `<div class="data-loss-message">
        <i class="fas fa-info-circle"></i>
        <div>This can happen after the extension is updated.</div>
        <div>Refreshing the page should resolve this issue.</div>
      </div>`;
  }
  
  // Add event listeners for buttons
  setTimeout(() => {
    const refreshPageBtn = document.getElementById('refresh-page-btn');
    const reloadExtBtn = document.getElementById('reload-extension-btn');
    
    if (refreshPageBtn) {
      refreshPageBtn.addEventListener('click', () => {
        if (tabId) {
          chrome.tabs.reload(tabId);
          window.close();
        }
      });
    }
    
    if (reloadExtBtn) {
      reloadExtBtn.addEventListener('click', () => {
        chrome.runtime.reload();
      });
    }
  }, 0);
}

// Get tracking providers data from the background script
async function loadTrackingProviders() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getProviderInfo', providerId: 'all' }, (response) => {
      if (response && response.success && response.allProviders) {
        trackingProviders = response.allProviders;
        resolve(trackingProviders);
      } else {
        resolve({});
      }
    });
  });
}

// Get the current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Setup reports tab events
function setupReportsTabEvents() {
  const reportsTabButtons = document.querySelectorAll('#reports-window .tab-button');
  
  reportsTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      setActiveTab(tabName);
    });
  });
}

// Initialize the popup
async function initPopup() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.url) {
      handleDataLoadError('Cannot access current tab information');
      return;
    }
    
    currentPageUrl = currentTab.url;
    
    // Extract hostname for page-specific settings
    let hostname = '';
    try {
      hostname = new URL(currentTab.url).hostname;
    } catch (e) {
      console.error("Error parsing URL:", e);
    }
    
    // Check if content script is connected properly
    const isConnected = await checkContentScriptConnection(currentTab.id);
    if (!isConnected) {
      console.warn("Content script connection test failed - extension may have been updated");
      handleContentScriptDisconnection(currentTab.id);
      return;
    }
    
    // Load tracking providers first
    await loadTrackingProviders();
    
    // Load theme preference
    await loadThemePreference();
    
    // Setup all button event listeners
    setupEventListeners();
    
    // Setup tab buttons in both windows
    setupDetailTabEvents();
    setupReportsTabEvents();
    
    // Load settings from storage - check page-specific Live View settings
    chrome.storage.local.get(['pixelTracerSettings', 'liveViewPages'], (result) => {
      const settings = result.pixelTracerSettings || {};
      const liveViewPages = result.liveViewPages || {};
      
      // Default to disabled for new sites
      isLiveViewEnabled = false;
      
      // Only enable if we have an explicit setting for this hostname that is true
      if (hostname && liveViewPages.hasOwnProperty(hostname)) {
        isLiveViewEnabled = !!liveViewPages[hostname]; // Cast to boolean
      } 
      // Don't use global setting - default is always off for new sites
      
      // Update Live View button state
      updateLiveViewButtonState();
      
      // Initialize Live View if it's enabled
      if (isLiveViewEnabled) {
        enableLiveView(currentTab.id);
      }
      
      // Load tracking data with retry support
      loadTrackingDataWithRetry(currentTab.id);
    });
    
    // Get page info from the content script with error handling
    try {
      chrome.tabs.sendMessage(currentTab.id, { action: 'getPageInfo' }, (response) => {
        if (chrome.runtime.lastError) {
          // This is expected if the content script isn't loaded
          // No need to handle the error here
          return;
        }
        
        if (response) {
          // Could store page info here if needed
        }
      });
    } catch (error) {
      // Continue execution - this is not a critical error
    }
  } catch (error) {
    console.error("Popup initialization error:", error);
    handleDataLoadError('Extension initialization error');
  }
}

// Load theme preference from storage
async function loadThemePreference() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pixelTracerTheme'], (result) => {
      isDarkMode = result.pixelTracerTheme === 'dark';
      applyTheme();
      resolve();
    });
  });
}

// Apply the current theme
function applyTheme() {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    if (themeToggleButton) {
      themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    }
  } else {
    document.body.classList.remove('dark-mode');
    if (themeToggleButton) {
      themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }
}

// Toggle the theme
async function toggleTheme() {
  isDarkMode = !isDarkMode;
  
  // Update theme in storage
  chrome.storage.local.set({ pixelTracerTheme: isDarkMode ? 'dark' : 'light' });
  
  // Apply the theme
  applyTheme();
  
  // Notify active tabs about the theme change
  const currentTab = await getCurrentTab();
  if (currentTab) {
    chrome.tabs.sendMessage(currentTab.id, { 
      action: 'themeChanged',
      theme: isDarkMode ? 'dark' : 'light'
    }).catch(err => {
      // Ignore errors - content script may not be loaded
    });
  }
}

// Setup all event listeners
function setupEventListeners() {
  
  // Check if all required elements exist
  if (!clearDataButton) return;
  if (!exportDataButton) return;
  if (!liveViewButton) return;
  if (!reportsButton) return;
  if (!themeToggleButton) return;
  if (!detailCloseBtn) return;
  if (!reportsCloseBtn) return;
  if (!detailOverlay) return;
  if (!collapseAllRequestsButton) return;
  if (!expandAllRequestsButton) return;
  
  // Attach button event listeners
  if (clearDataButton) clearDataButton.addEventListener('click', clearData);
  if (exportDataButton) {
    exportDataButton.addEventListener('click', exportData);
  }
  if (liveViewButton) liveViewButton.addEventListener('click', toggleLiveView);
  if (reportsButton) reportsButton.addEventListener('click', showReports);
  if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
  if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetailWindow);
  if (reportsCloseBtn) reportsCloseBtn.addEventListener('click', closeReports);
  if (detailOverlay) {
    detailOverlay.addEventListener('click', () => {
      closeDetailWindow();
      closeReports();
    });
  }
  if (collapseAllRequestsButton) collapseAllRequestsButton.addEventListener('click', collapseAllRequests);
  if (expandAllRequestsButton) expandAllRequestsButton.addEventListener('click', expandAllRequests);
  
}

// Update the Live View button state
function updateLiveViewButtonState() {
  if (!liveViewButton) return;
  
  if (isLiveViewEnabled) {
    liveViewButton.classList.add('active');
    liveViewButton.innerHTML = '<i class="fas fa-eye-slash"></i> Live View (On)';
  } else {
    liveViewButton.classList.remove('active');
    liveViewButton.innerHTML = '<i class="fas fa-eye"></i> Live View';
  }
}

// Toggle Live View state
async function toggleLiveView() {
  const currentTab = await getCurrentTab();
  
  // Extract hostname from URL for page-specific settings
  let hostname = '';
  try {
    hostname = new URL(currentTab.url).hostname;
  } catch (e) {
    console.error("Error parsing URL:", e);
    return;
  }
  
  // Toggle the current state
  isLiveViewEnabled = !isLiveViewEnabled;
  
  // Update button state
  updateLiveViewButtonState();
  
  // Save setting for this specific hostname only
  chrome.storage.local.get(['liveViewPages'], (result) => {
    const liveViewPages = result.liveViewPages || {};
    
    // Update setting for this specific hostname
    liveViewPages[hostname] = isLiveViewEnabled;
    
    // Save back to storage
    chrome.storage.local.set({ liveViewPages });
    
    // No longer maintaining global setting - each page has its own setting
  });
  
  // Enable or disable Live View on the page
  if (isLiveViewEnabled) {
    enableLiveView(currentTab.id);
  } else {
    disableLiveView(currentTab.id);
  }
}

// Enable Live View by sending a message to the content script
function enableLiveView(tabId) {
  chrome.tabs.sendMessage(tabId, { 
    action: 'enableLiveView'
  }, (response) => {
    if (chrome.runtime.lastError) {
      return;
    }
    
    if (response && response.success) {
    }
  });
}

// Disable Live View by sending a message to the content script
function disableLiveView(tabId) {
  chrome.tabs.sendMessage(tabId, { 
    action: 'disableLiveView'
  }, (response) => {
    if (chrome.runtime.lastError) {
      return;
    }
    
    if (response && response.success) {
    }
  });
}

// Load tracking data with retry mechanism
function loadTrackingDataWithRetry(tabId, retryCount = 0) {
  
  // Show loading state
  totalRequestsElement.textContent = "...";
  uniqueProvidersElement.textContent = "...";
  
  // Add a loading indicator to the containers
  providersContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i>Loading data...</div>';
  requestsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i>Loading data...</div>';
  
  // Load the data
  try {
    loadTrackingData(tabId);
  } catch (error) {
    
    // Retry up to 2 times with increasing delay
    if (retryCount < 2) {
      const delay = (retryCount + 1) * 500; // 500ms, then 1000ms
      
      setTimeout(() => {
        loadTrackingDataWithRetry(tabId, retryCount + 1);
      }, delay);
    } else {
      handleDataLoadError('Failed to load data after multiple attempts');
    }
  }
}

// Load tracking data from the background script
async function loadTrackingData(tabId) {
  // Get the current tab
  const tab = await getCurrentTab();
  if (!tab) {
    handleDataLoadError('Could not determine current tab');
    return;
  }
  
  // Make sure the connection is still active
  if (!extensionConnected) {
    console.warn("Not loading tracking data - extension connection issues detected");
    handleContentScriptDisconnection(tab.id);
    return;
  }
  
  // Store the previous count before clearing
  previousRequestCount = currentTabRequests.length;
  
  // Add a loading state
  providersContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading tracking data...</div>';
  requestsContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading tracking data...</div>';
  
  try {
    // Double-check connection with content script
    const isConnected = await checkContentScriptConnection(tab.id);
    if (!isConnected) {
      console.warn("Content script connection check failed before data load");
      handleContentScriptDisconnection(tab.id);
      return;
    }
    
    // Request tracking data from the background script
    const hostname = new URL(tab.url).hostname;
    
    chrome.runtime.sendMessage({
      action: 'getTrackingData',
      tabId: tab.id,
      hostname: hostname
    }, (response) => {
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.warn("Runtime error:", chrome.runtime.lastError.message);
        
        // Check specifically for context invalidation
        if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
          // Extension was reloaded or updated - show a specific message
          handleExtensionContextInvalidated();
          return;
        }
        
        handleDataLoadError('Communication error');
        return;
      }
      
      // Check for invalid response
      if (!response || !response.success) {
        handleDataLoadError('No data received');
        return;
      }
      
      // Process the data
      currentTabRequests = response.requests || [];
      
      // Update UI with results
      totalRequestsElement.textContent = currentTabRequests.length;
      
      const uniqueProviders = new Set();
      currentTabRequests.forEach(request => {
        if (request && request.providers) {
          request.providers.forEach(provider => uniqueProviders.add(provider));
        }
      });
      
      uniqueProvidersElement.textContent = uniqueProviders.size;
      
      if (currentTabRequests.length === 0) {
        // Check if we potentially lost data
        if (previousRequestCount > 0) {
          // We had data before but now it's gone - show lost data message
          showDataLossMessage();
        } else {
          // Regular empty state
          providersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-satellite-dish"></i> No tracking providers detected yet</div>';
          requestsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i> No tracking requests detected yet</div>';
        }
      } else {
        // We have data, render it
        renderProviders(uniqueProviders);
        renderRequests(currentTabRequests);
      }
    });
  } catch (error) {
    console.error("Error in loadTrackingData:", error);
    
    // Check for connection issues
    if (error.message && error.message.includes("Extension context invalidated")) {
      handleContentScriptDisconnection(tab.id);
    } else {
      handleDataLoadError('Error loading data');
    }
  }
}

// Handle extension context invalidation specifically
function handleExtensionContextInvalidated() {
  totalRequestsElement.textContent = "!";
  uniqueProvidersElement.textContent = "!";
  providersContainer.innerHTML = '<div class="data-loss-message"><i class="fas fa-exclamation-triangle"></i> Extension has been updated or reloaded. <button id="refresh-extension-btn" class="refresh-btn">Reload Extension</button></div>';
  requestsContainer.innerHTML = '<div class="data-loss-message"><i class="fas fa-exclamation-triangle"></i> Please refresh the page to continue. <button id="refresh-page-btn" class="refresh-btn">Refresh Page</button></div>';
  
  // Add event listeners to refresh buttons
  setTimeout(() => {
    const refreshExtBtn = document.getElementById('refresh-extension-btn');
    const refreshPageBtn = document.getElementById('refresh-page-btn');
    
    if (refreshExtBtn) {
      refreshExtBtn.addEventListener('click', () => {
        chrome.runtime.reload();
      });
    }
    
    if (refreshPageBtn) {
      refreshPageBtn.addEventListener('click', refreshCurrentPage);
    }
  }, 0);
}

// Retry loading data once
function retryLoadingData(tabId, hostname) {
  try {
    chrome.runtime.sendMessage({
      action: 'getTrackingData',
      tabId: tabId,
      hostname: hostname
    }, (response) => {
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.log("Runtime error on retry:", chrome.runtime.lastError.message);
        
        // Check specifically for context invalidation
        if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
          // Extension was reloaded or updated - show a specific message
          handleExtensionContextInvalidated();
          return;
        }
        
        handleDataLoadError('Communication error during retry');
        return;
      }
      
      // Check for invalid response
      if (!response || !response.success) {
        handleDataLoadError('Failed to retrieve data');
        return;
      }
      
      // Process the data
      currentTabRequests = response.requests || [];
      
      // Update UI with results
      totalRequestsElement.textContent = currentTabRequests.length;
      
      const uniqueProviders = new Set();
      currentTabRequests.forEach(request => {
        if (request && request.providers) {
          request.providers.forEach(provider => uniqueProviders.add(provider));
        }
      });
      
      uniqueProvidersElement.textContent = uniqueProviders.size;
      
      if (currentTabRequests.length === 0) {
        // Check if we potentially lost data
        if (previousRequestCount > 0) {
          // We had data before but now it's gone - show lost data message
          showDataLossMessage();
        } else {
          // Still no data, show proper empty state (this is likely a valid empty state, not an error)
          providersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-satellite-dish"></i> No tracking providers detected yet</div>';
          requestsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i> No tracking requests detected yet</div>';
        }
      } else {
        // We have data, render it
        renderProviders(uniqueProviders);
        renderRequests(currentTabRequests);
      }
    });
  } catch (error) {
    console.error("Error during retry:", error);
    handleDataLoadError('Error during data retry');
  }
}

// Function to handle error loading data
function handleDataLoadError(errorMessage = 'Failed to load tracking data') {
  if (totalRequestsElement) {
    totalRequestsElement.textContent = "0";
  }
  
  if (uniqueProvidersElement) {
    uniqueProvidersElement.textContent = "0";
  }
  
  if (providersContainer) {
    providersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i> Could not load tracking data. <button id="refresh-page-btn" class="refresh-btn">Refresh Page</button></div>';
  }
  
  if (requestsContainer) {
    requestsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i> Could not load tracking data. <button id="refresh-page-btn-2" class="refresh-btn">Refresh Page</button></div>';
  }
  
  // Add event listeners to refresh buttons
  setTimeout(() => {
    const refreshBtn1 = document.getElementById('refresh-page-btn');
    const refreshBtn2 = document.getElementById('refresh-page-btn-2');
    
    if (refreshBtn1) {
      refreshBtn1.addEventListener('click', refreshCurrentPage);
    }
    
    if (refreshBtn2) {
      refreshBtn2.addEventListener('click', refreshCurrentPage);
    }
  }, 0);
}

// Show data loss message with refresh option
function showDataLossMessage() {
  if (totalRequestsElement) {
    totalRequestsElement.textContent = "0";
  }
  
  if (uniqueProvidersElement) {
    uniqueProvidersElement.textContent = "0";
  }
  
  if (providersContainer) {
    providersContainer.innerHTML = '<div class="data-loss-message"><i class="fas fa-exclamation-triangle"></i> Tracking data may have been lost. <button id="refresh-page-btn" class="refresh-btn">Refresh Page</button></div>';
  }
  
  if (requestsContainer) {
    requestsContainer.innerHTML = '<div class="data-loss-message"><i class="fas fa-exclamation-triangle"></i> Tracking data may have been lost. <button id="refresh-page-btn-2" class="refresh-btn">Refresh Page</button></div>';
  }
  
  // Add event listeners to refresh buttons
  setTimeout(() => {
    const refreshBtn1 = document.getElementById('refresh-page-btn');
    const refreshBtn2 = document.getElementById('refresh-page-btn-2');
    
    if (refreshBtn1) {
      refreshBtn1.addEventListener('click', refreshCurrentPage);
    }
    
    if (refreshBtn2) {
      refreshBtn2.addEventListener('click', refreshCurrentPage);
    }
  }, 0);
}

// Function to refresh the current page
async function refreshCurrentPage() {
  const tab = await getCurrentTab();
  if (tab) {
    chrome.tabs.reload(tab.id);
    window.close(); // Close the popup as the page refreshes
  }
}

// Add styles for refresh buttons
function addRefreshButtonStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .refresh-btn {
      background-color: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 10px;
      margin-left: 8px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    }
    
    .refresh-btn:hover {
      background-color: #3a80d2;
    }
    
    .data-loss-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
      color: #e67e22;
    }
    
    .data-loss-message i {
      font-size: 24px;
      margin-bottom: 10px;
    }
    
    .data-loss-message .refresh-btn {
      margin-top: 10px;
    }
    
    body.dark-theme .refresh-btn {
      background-color: #5a6af2;
    }
    
    body.dark-theme .refresh-btn:hover {
      background-color: #4a5ae2;
    }
  `;
  document.head.appendChild(styleEl);
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', async () => {
  // Add refresh button styles
  addRefreshButtonStyles();
  
  // Get current tab information
  const tab = await getCurrentTab();
  
  if (tab) {
    currentPageUrl = tab.url;
    const pageUrlElement = document.getElementById('page-url');
    if (pageUrlElement) {
      try {
        pageUrlElement.textContent = new URL(tab.url).hostname;
      } catch (e) {
        pageUrlElement.textContent = "Unknown";
        console.error("Error parsing URL:", e);
      }
    }
    
    // Extract hostname for page-specific settings
    let hostname = '';
    try {
      hostname = new URL(tab.url).hostname;
    } catch (e) {
      console.error("Error parsing URL:", e);
    }
    
    // Check if Live View is enabled for this specific page
    chrome.storage.local.get(['liveViewPages'], (result) => {
      const liveViewPages = result.liveViewPages || {};
      
      // Default to disabled for new sites
      isLiveViewEnabled = false;
      
      // Only enable if we have an explicit setting for this hostname that is true
      if (hostname && liveViewPages.hasOwnProperty(hostname)) {
        isLiveViewEnabled = !!liveViewPages[hostname]; // Cast to boolean
      }
      
      updateLiveViewButtonState();
    });
    
    // Load theme setting
    chrome.storage.local.get(['pixelTracerTheme'], (result) => {
      isDarkMode = result.pixelTracerTheme === 'dark';
      applyTheme();
    });
    
    // Load tracking providers
    await loadTrackingProviders();
    
    // Load tracking data from the background script
    loadTrackingData(tab.id);
  } else {
    handleDataLoadError('Unable to get current tab information');
  }
  
  // Set up button event listeners - make sure all elements exist before adding listeners
  if (clearDataButton) clearDataButton.addEventListener('click', clearData);
  if (exportDataButton) exportDataButton.addEventListener('click', exportData);
  if (liveViewButton) liveViewButton.addEventListener('click', toggleLiveView);
  if (reportsButton) reportsButton.addEventListener('click', showReports);
  if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
  if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetailWindow);
  if (reportsCloseBtn) reportsCloseBtn.addEventListener('click', closeReports);
  
  if (collapseAllRequestsButton) collapseAllRequestsButton.addEventListener('click', collapseAllRequests);
  if (expandAllRequestsButton) expandAllRequestsButton.addEventListener('click', expandAllRequests);
  
  // Set up tab functionality
  if (tabButtons && tabButtons.length > 0) {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to the selected button and pane
        button.classList.add('active');
        const tabElement = document.getElementById(`tab-${tabName}`);
        if (tabElement) {
          tabElement.classList.add('active');
        }
      });
    });
  }
});

// Render the list of detected providers
function renderProviders(uniqueProviders) {
  providersContainer.innerHTML = '';
  
  if (uniqueProviders.size === 0) {
    providersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-satellite-dish"></i> No tracking providers detected yet</div>';
    return;
  }
  
  const providersArray = Array.from(uniqueProviders);
  
  providersArray.forEach(providerId => {
    const provider = trackingProviders[providerId];
    
    if (!provider) return;
    
    const providerElement = document.createElement('div');
    providerElement.className = 'provider-item';
    
    providerElement.innerHTML = `
      <div class="provider-info">
        <div class="provider-name">${provider.name}</div>
        <div class="provider-description">${provider.description}</div>
      </div>
      <div class="provider-category">${provider.category}</div>
    `;
    
    // Add click handler to show provider summary instead of full request details
    providerElement.addEventListener('click', () => {
      const providerRequests = currentTabRequests.filter(
        request => request.providers.includes(providerId)
      );
      
      if (providerRequests.length > 0) {
        showProviderSummary(provider, providerId, providerRequests);
      }
    });
    
    providersContainer.appendChild(providerElement);
  });
}

/**
 * Show a simple summary of provider activity
 * @param {object} provider - The provider information
 * @param {string} providerId - ID of the provider
 * @param {array} requests - Array of requests for this provider
 */
function showProviderSummary(provider, providerId, requests) {
  if (detailTitle) {
    detailTitle.textContent = `${provider.name} Summary`;
  }
  
  if (detailWindow) {
    detailWindow.classList.add('visible');
  }
  
  if (detailOverlay) {
    detailOverlay.classList.add('visible');
  }
  
  // Show only the general tab for provider summary
  setActiveTab('general');
  
  // Hide other tabs when showing provider summary
  document.querySelectorAll('.tab-button:not([data-tab="general"])').forEach(btn => {
    btn.style.display = 'none';
  });
  
  const generalContent = document.getElementById('general-content');
  if (!generalContent) {
    console.error('General content element not found');
    return;
  }
  
  // Get account IDs from requests
  const accountIds = new Set();
  requests.forEach(req => {
    if (req.accountId) accountIds.add(req.accountId);
  });
  
  // Count event types
  const eventCounts = {};
  requests.forEach(req => {
    const eventType = req.eventType || 'Unknown';
    eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
  });
  
  // Format event types for display
  const formatEventType = (eventType) => {
    if (provider.schema && provider.schema.eventTypes && provider.schema.eventTypes[eventType]) {
      return provider.schema.eventTypes[eventType];
    }
    return eventType;
  };
  
  // Create a summary table
  let summaryHtml = `
    <table class="param-table">
      <tr>
        <th class="param-name">Provider Name</th>
        <td class="param-value">${provider.name}</td>
      </tr>
      <tr>
        <th class="param-name">Category</th>
        <td class="param-value">${provider.category}</td>
      </tr>
      <tr>
        <th class="param-name">Total Requests</th>
        <td class="param-value">${requests.length}</td>
      </tr>
      <tr>
        <th class="param-name">First Detected</th>
        <td class="param-value">${new Date(Math.min(...requests.map(r => r.timestamp))).toLocaleString()}</td>
      </tr>
      <tr>
        <th class="param-name">Latest Detection</th>
        <td class="param-value">${new Date(Math.max(...requests.map(r => r.timestamp))).toLocaleString()}</td>
      </tr>
    </table>
  `;
  
  // Add account IDs if available
  if (accountIds.size > 0) {
    summaryHtml += `<h3 class="summary-section-title">Account IDs</h3>
    <table class="param-table">`;
    
    Array.from(accountIds).forEach(accountId => {
      summaryHtml += `
        <tr>
          <th class="param-name">Account ID</th>
          <td class="param-value">${accountId}</td>
        </tr>`;
    });
    
    summaryHtml += `</table>`;
  }
  
  // Add event type breakdown
  summaryHtml += `<h3 class="summary-section-title">Event Types</h3>
  <table class="param-table">`;
  
  Object.entries(eventCounts).forEach(([eventType, count]) => {
    summaryHtml += `
      <tr>
        <th class="param-name">${formatEventType(eventType)}</th>
        <td class="param-value">${count} requests</td>
      </tr>`;
  });
  
  summaryHtml += `</table>`;
  
  generalContent.innerHTML = summaryHtml;
}

// Render the list of recent tracking requests
function renderRequests(requests) {
  requestsContainer.innerHTML = '';
  
  if (requests.length === 0) {
    requestsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i> No tracking requests detected yet</div>';
    return;
  }
  
  // Sort by timestamp descending (newest first)
  const sortedRequests = [...requests].sort((a, b) => b.timestamp - a.timestamp);
  
  // Take only the most recent 100 requests
  const recentRequests = sortedRequests.slice(0, 100);
  
  recentRequests.forEach(request => {
    // Get the first provider for this request (primary provider)
    const primaryProviderId = request.providers[0];
    const provider = trackingProviders[primaryProviderId];
    
    if (!provider) return;
    
    // Format event type display name
    let eventTypeName = 'Unknown';
    if (provider.schema && provider.schema.eventTypes && provider.schema.eventTypes[request.eventType]) {
      eventTypeName = provider.schema.eventTypes[request.eventType];
    } else {
      eventTypeName = request.eventType;
    }
    
    const requestElement = document.createElement('div');
    requestElement.className = 'request-item';
    // Ensure every request element has a requestId for tracking
    requestElement.dataset.requestId = request.requestId || `req-${request.timestamp}-${primaryProviderId}`;
    
    // Format the account ID display
    const accountDisplay = request.accountId ? ` (${request.accountId})` : '';
    
    const time = new Date(request.timestamp);
    const timeString = time.toLocaleTimeString();
    
    // Create request item HTML
    requestElement.innerHTML = `
      <div class="request-header">
        <div class="request-title">
          <span class="request-badge">${eventTypeName}</span>
          ${provider.name}${accountDisplay}
        </div>
        <span class="request-expand">▼</span>
      </div>
      <div class="request-url" title="${request.url}">${request.host}${request.path}</div>
      <div class="request-time">${timeString}</div>
      <div class="request-details">
        <button class="view-details-btn">View Full Details</button>
      </div>
    `;
    
    // Add event listeners
    const expandIcon = requestElement.querySelector('.request-expand');
    const detailsElement = requestElement.querySelector('.request-details');
    const viewDetailsBtn = requestElement.querySelector('.view-details-btn');
    
    // Toggle expanded details
    expandIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRequestDetails(expandIcon, detailsElement);
    });
    
    // Open full details window
    viewDetailsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDetailWindow(provider.name, primaryProviderId, request);
    });
    
    // Click on request item to toggle it
    requestElement.addEventListener('click', () => {
      toggleRequestDetails(expandIcon, detailsElement);
    });
    
    requestsContainer.appendChild(requestElement);
  });
}

/**
 * Toggle request details visibility
 * @param {Element} expandIcon - The expand/collapse icon
 * @param {Element} detailsElement - The details container
 */
function toggleRequestDetails(expandIcon, detailsElement) {
  expandIcon.classList.toggle('expanded');
  detailsElement.classList.toggle('expanded');
}

/**
 * Collapse all request details
 */
function collapseAllRequests() {
  const expandIcons = requestsContainer.querySelectorAll('.request-expand');
  const detailsElements = requestsContainer.querySelectorAll('.request-details');
  
  expandIcons.forEach(icon => icon.classList.remove('expanded'));
  detailsElements.forEach(details => details.classList.remove('expanded'));
}

/**
 * Expand all request details
 */
function expandAllRequests() {
  const expandIcons = requestsContainer.querySelectorAll('.request-expand');
  const detailsElements = requestsContainer.querySelectorAll('.request-details');
  
  expandIcons.forEach(icon => icon.classList.add('expanded'));
  detailsElements.forEach(details => details.classList.add('expanded'));
}

/**
 * Show the detailed window with all request information
 * @param {string} providerName - Name of the provider
 * @param {string} providerId - ID of the provider
 * @param {object} request - The request data
 */
function showDetailWindow(providerName, providerId, request) {
  if (detailTitle) {
    detailTitle.textContent = `${providerName} Request Details`;
  }
  
  if (detailWindow) {
    detailWindow.classList.add('visible');
  }
  
  if (detailOverlay) {
    detailOverlay.classList.add('visible');
  }
  
  // Make sure all tabs are visible when showing request details
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.style.display = '';
  });
  
  // Set active tab to General
  setActiveTab('general');
  
  // Setup tab button click handlers
  if (detailWindow) {
    const detailTabButtons = detailWindow.querySelectorAll('.tab-button');
    detailTabButtons.forEach(button => {
      // Remove any existing listeners to prevent duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      newButton.addEventListener('click', () => {
        const tabName = newButton.getAttribute('data-tab');
        setActiveTab(tabName);
      });
    });
  }
  
  // Fill tab content
  fillGeneralTab(providerId, request);
  fillEventTab(providerId, request);
  fillParamsTab(request);
  fillHeadersTab(request);
  fillPayloadTab(request);
}

/**
 * Close the detail window
 */
function closeDetailWindow() {
  if (detailWindow) {
    detailWindow.classList.remove('visible');
  }
  
  if (detailOverlay) {
    detailOverlay.classList.remove('visible');
  }
}

/**
 * Fill the General tab with basic request information
 * @param {string} providerId - ID of the provider
 * @param {object} request - The request data
 */
function fillGeneralTab(providerId, request) {
  const provider = trackingProviders[providerId];
  if (!provider) {
    console.error('Provider not found:', providerId);
    return;
  }
  
  const generalContent = document.getElementById('general-content');
  if (!generalContent) {
    console.error('General content element not found');
    return;
  }
  
  // Format event type display name
  let eventTypeName = 'Unknown';
  if (provider.schema && provider.schema.eventTypes && provider.schema.eventTypes[request.eventType]) {
    eventTypeName = provider.schema.eventTypes[request.eventType];
  } else {
    eventTypeName = request.eventType;
  }
  
  // Format time
  const time = new Date(request.timestamp);
  const timeString = time.toLocaleString();
  
  generalContent.innerHTML = `
    <table class="param-table">
      <tr>
        <th class="param-name">Provider</th>
        <td class="param-value">${provider.name}</td>
      </tr>
      <tr>
        <th class="param-name">Event Type</th>
        <td class="param-value">${eventTypeName}</td>
      </tr>
      <tr>
        <th class="param-name">Time</th>
        <td class="param-value">${timeString}</td>
      </tr>
      <tr>
        <th class="param-name">URL</th>
        <td class="param-value">${request.url}</td>
      </tr>
      <tr>
        <th class="param-name">Method</th>
        <td class="param-value">${request.method}</td>
      </tr>
      ${request.accountId ? `
      <tr>
        <th class="param-name">Account ID</th>
        <td class="param-value">${request.accountId}</td>
      </tr>` : ''}
      <tr>
        <th class="param-name">Status</th>
        <td class="param-value">${request.statusCode || 'Pending'}</td>
      </tr>
    </table>
  `;
}

/**
 * Fill the Event tab with event data
 * @param {string} providerId - The provider ID
 * @param {object} request - The request data
 */
function fillEventTab(providerId, request) {
  const provider = trackingProviders[providerId];
  const eventContent = document.getElementById('event-content');
  
  if (!provider || !provider.schema || !provider.schema.groups) {
    eventContent.innerHTML = '<div class="empty-state"><i class="fas fa-bolt"></i> No event data available for this provider</div>';
    return;
  }
  
  // Add styles for event cards if they don't exist
  if (!document.getElementById('event-card-styles')) {
    const style = document.createElement('style');
    style.id = 'event-card-styles';
    style.textContent = `
      .event-card {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        margin-bottom: 16px;
        overflow: hidden;
      }
      .event-card-header {
        background-color: #f5f5f5;
        padding: 8px 12px;
        font-weight: 600;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .event-card-badge {
        background-color: #4a90e2;
        color: white;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        text-transform: uppercase;
      }
      .event-section {
        background-color: #f9f9f9;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 500;
        border-top: 1px solid #eaeaea;
        border-bottom: 1px solid #eaeaea;
        color: #555;
      }
      .event-card .param-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      /* Dark mode styles */
      body.dark-mode .event-card {
        border-color: #444;
      }
      body.dark-mode .event-card-header {
        background-color: #333;
        border-color: #444;
      }
      body.dark-mode .event-section {
        background-color: #2a2a2a;
        border-color: #444;
        color: #ccc;
      }
      body.dark-mode .event-card .param-table tr:nth-child(even) {
        background-color: #2a2a2a;
      }
    `;
    document.head.appendChild(style);
  }
  
  // For AdNabu provider with array-based payloads, create a card for each event
  if (providerId === 'adnabu-google-ads') {
    let html = '';
    
    if (request.payload && Array.isArray(request.payload) && request.payload.length > 0) {
      // Process each event in the payload
      request.payload.forEach((event, index) => {
        const eventName = event.event_name || 'Unknown';
        const conversionId = event.conversion_id || '';
        
        html += `
          <div class="event-card">
            <div class="event-card-header">
              <span>Event ${index + 1}: ${eventName}</span>
              ${conversionId ? `<span class="event-card-badge">${conversionId}</span>` : ''}
            </div>
            <table class="param-table">
        `;
        
        // Main properties in a consistent order
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
              <tr>
                <th class="param-name">${prop.label}</th>
                <td class="param-value">${event[prop.key]}</td>
              </tr>
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
          html += `
            </table>
            <div class="event-section">Additional Properties</div>
            <table class="param-table">
          `;
          
          otherProps.forEach(prop => {
            html += `
              <tr>
                <th class="param-name">${prop.key}</th>
                <td class="param-value">${prop.value}</td>
              </tr>
            `;
          });
        }
        
        // Handle items array if present
        if (event.items && Array.isArray(event.items) && event.items.length > 0) {
          html += `
            </table>
            <div class="event-section">Items (${event.items.length})</div>
            <table class="param-table">
          `;
          
          event.items.forEach((item, itemIndex) => {
            html += `
              <tr>
                <th colspan="2" class="param-name" style="background-color: #f0f0f0;">Item ${itemIndex + 1}</th>
              </tr>
            `;
            
            Object.entries(item).forEach(([key, value]) => {
              if (value === null || value === undefined) return;
              
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              html += `
                <tr>
                  <th class="param-name" style="padding-left: 20px;">${formattedKey}</th>
                  <td class="param-value">${value}</td>
                </tr>
              `;
            });
          });
        }
        
        html += `
            </table>
          </div>
        `;
      });
      
      // Add any additional events from customData
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
        
        // Create a card for each event group if not already created
        const payloadEventCount = request.payload.length;
        
        Object.entries(eventGroups).forEach(([eventNum, events]) => {
          // Skip if this event was already in the payload
          if (parseInt(eventNum) <= payloadEventCount) return;
          
          // Find event name/type and conversion ID
          const eventType = events.find(e => e.field.includes('Type'))?.value || 'Unknown';
          const conversionId = events.find(e => e.field.includes('Conversion ID'))?.value || '';
          
          html += `
            <div class="event-card">
              <div class="event-card-header">
                <span>Event ${eventNum}: ${eventType}</span>
                ${conversionId ? `<span class="event-card-badge">${conversionId}</span>` : ''}
              </div>
              <table class="param-table">
          `;
          
          events.forEach(event => {
            html += `
              <tr>
                <th class="param-name">${event.field.replace(`Event ${eventNum} `, '')}</th>
                <td class="param-value">${event.value}</td>
              </tr>
            `;
          });
          
          html += `
              </table>
            </div>
          `;
        });
      }
    } else {
      html = '<div class="empty-state"><i class="fas fa-bolt"></i> No event data found in this request</div>';
    }
    
    eventContent.innerHTML = html;
  } else {
    // Standard handling for other providers
    let eventData = [];
    
    // Collect event data
    if (provider.schema.groups.event) {
      const eventGroup = provider.schema.groups.event;
      
      for (const field of eventGroup.fields) {
        if (request.params[field.key]) {
          eventData.push({ label: field.label, value: request.params[field.key] });
        }
      }
    }
    
    // Handle custom data for other providers
    if (request.customData && request.customData.events) {
      request.customData.events.forEach(event => {
        eventData.push({ label: event.field, value: event.value });
      });
    }
    
    // If we have no event data, show empty state
    if (eventData.length === 0) {
      eventContent.innerHTML = '<div class="empty-state"><i class="fas fa-bolt"></i> No event data found in this request</div>';
      return;
    }
    
    // For regular providers, use a single card
    let html = `
      <div class="event-card">
        <div class="event-card-header">
          <span>Event Details</span>
          <span class="event-card-badge">${request.eventType || 'Unknown'}</span>
        </div>
        <table class="param-table">
    `;
    
    eventData.forEach(item => {
      html += `
        <tr>
          <th class="param-name">${item.label}</th>
          <td class="param-value">${item.value}</td>
        </tr>
      `;
    });
    
    html += `
        </table>
      </div>
    `;
    
    eventContent.innerHTML = html;
  }
}

/**
 * Fill the Parameters tab with all URL parameters
 * @param {object} request - The request data
 */
function fillParamsTab(request) {
  const paramsContent = document.getElementById('params-content');
  
  if (!request.params || Object.keys(request.params).length === 0) {
    paramsContent.innerHTML = '<div class="empty-state"><i class="fas fa-list-ul"></i> No URL parameters in this request</div>';
    return;
  }
  
  let tableRows = '';
  
  // Sort parameters alphabetically
  const sortedParams = Object.entries(request.params).sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [key, value] of sortedParams) {
    tableRows += `
      <tr>
        <th class="param-name">${key}</th>
        <td class="param-value">${value}</td>
      </tr>`;
  }
  
  paramsContent.innerHTML = `
    <table class="param-table">
      ${tableRows}
    </table>
  `;
}

/**
 * Fill the Headers tab with request headers
 * @param {object} request - The request data
 */
function fillHeadersTab(request) {
  const headersContent = document.getElementById('headers-content');
  
  if (!request.headers || request.headers.length === 0) {
    headersContent.innerHTML = '<div class="empty-state"><i class="fas fa-tags"></i> No headers captured for this request</div>';
    return;
  }
  
  let tableRows = '';
  
  // Sort headers alphabetically by name
  const sortedHeaders = [...request.headers].sort((a, b) => a.name.localeCompare(b.name));
  
  for (const header of sortedHeaders) {
    tableRows += `
      <tr>
        <th class="param-name">${header.name}</th>
        <td class="param-value">${header.value}</td>
      </tr>`;
  }
  
  headersContent.innerHTML = `
    <table class="param-table">
      ${tableRows}
    </table>
  `;
}

/**
 * Fill the Payload tab with request body data
 * @param {object} request - The request data
 */
function fillPayloadTab(request) {
  const payloadContent = document.getElementById('payload-content');
  
  if (!request.payload) {
    payloadContent.innerHTML = '<div class="empty-state"><i class="fas fa-code"></i> No payload data for this request</div>';
    return;
  }
  
  let payloadHtml = '';
  
  if (typeof request.payload === 'object') {
    // Format as JSON for display
    payloadHtml = `<pre>${JSON.stringify(request.payload, null, 2)}</pre>`;
  } else {
    // Raw string payload
    payloadHtml = `<pre>${request.payload}</pre>`;
  }
  
  payloadContent.innerHTML = payloadHtml;
}

/**
 * Set the active tab in the detail window
 * @param {string} tabName - The tab to activate
 */
function setActiveTab(tabName) {
  // Determine which window the tab belongs to
  const isDetailTab = ['general', 'event', 'params', 'headers', 'payload'].includes(tabName);
  const containerSelector = isDetailTab ? '#detail-window' : '#reports-window';
  
  
  // Update tab buttons in the correct container
  const container = document.querySelector(containerSelector);
  const buttons = container.querySelectorAll('.tab-button');
  const panes = container.querySelectorAll('.tab-pane');
  
  // Update buttons
  buttons.forEach(button => {
    if (button.dataset.tab === tabName) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Update tab panes
  panes.forEach(pane => {
    if (pane.id === `${tabName}-tab`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

// Clear tracked data for the current tab
async function clearData() {
  const currentTab = await getCurrentTab();
  
  // Send message to background script to clear data
  chrome.runtime.sendMessage({
    action: 'dataCleared',
    tabId: currentTab.id
  }, (response) => {
    if (response && response.success) {
      // Reload the tracking data
      loadTrackingData(currentTab.id);
      
      // Also notify any open content scripts
      try {
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'trackingDataCleared'
        });
      } catch (e) {
        // Ignore errors if content script not available
      }
    }
  });
}

// Export tracking data as JSON or CSV
async function exportData() {
  const currentTab = await getCurrentTab();
  const hostname = new URL(currentPageUrl).hostname;
  
  // Create export options menu
  const exportMenu = document.createElement('div');
  exportMenu.className = 'export-menu';
  exportMenu.innerHTML = `
    <div class="export-menu-item" data-format="json">
      <i class="fas fa-file-code"></i> Export as JSON
    </div>
    <div class="export-menu-item" data-format="csv">
      <i class="fas fa-file-csv"></i> Export as CSV
    </div>
  `;
  
  // Position the menu near the export button
  const exportButton = document.getElementById('export-data');
  
  if (!exportButton) {
    showErrorMessage('Export failed: Button not found');
    return;
  }
  
  const buttonRect = exportButton.getBoundingClientRect();
  
  // Position calculation - append first to get dimensions
  exportMenu.style.opacity = '0';
  document.body.appendChild(exportMenu);
  const menuRect = exportMenu.getBoundingClientRect();
  
  // Calculate the horizontal position to center the menu arrow on the button
  const buttonCenter = buttonRect.left + (buttonRect.width / 2);
  const leftPos = Math.max(5, Math.min(buttonCenter - (menuRect.width / 2), window.innerWidth - menuRect.width - 5));
  
  // Position vertically ABOVE the button
  exportMenu.style.position = 'fixed';
  exportMenu.style.top = `${buttonRect.top - menuRect.height - 10}px`;
  exportMenu.style.left = `${leftPos}px`;
  
  // Set arrow position to point at button center
  const arrow = document.createElement('style');
  arrow.textContent = `
    .export-menu:after {
      left: ${buttonCenter - leftPos}px;
      transform: translateX(-50%);
    }
  `;
  document.head.appendChild(arrow);
  
  // Add entrance animation
  setTimeout(() => {
    exportMenu.style.opacity = '1';
    exportMenu.style.transform = 'translateY(0)';
  }, 10);
  
  
  // Add event listeners to the menu items
  const jsonExportItem = document.querySelector('.export-menu-item[data-format="json"]');
  if (jsonExportItem) {
    jsonExportItem.addEventListener('click', () => {
      exportAsJSON(currentTab, hostname);
      document.body.removeChild(exportMenu);
      document.head.removeChild(arrow);
    });
  }
  
  const csvExportItem = document.querySelector('.export-menu-item[data-format="csv"]');
  if (csvExportItem) {
    csvExportItem.addEventListener('click', () => {
      exportAsCSV(currentTab, hostname);
      document.body.removeChild(exportMenu);
      document.head.removeChild(arrow);
    });
  }
  
  // Close the menu when clicking outside
  const closeMenuHandler = (e) => {
    if (!exportMenu.contains(e.target) && e.target !== exportButton) {
      document.body.removeChild(exportMenu);
      document.head.removeChild(arrow);
      document.removeEventListener('click', closeMenuHandler);
    }
  };
  
  // Delay adding the click handler to prevent it from triggering immediately
  setTimeout(() => {
    document.addEventListener('click', closeMenuHandler);
  }, 0);
}

// Helper function to show error messages
function showErrorMessage(message) {
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  errorMessage.textContent = message;
  errorMessage.style.position = 'fixed';
  errorMessage.style.top = '10px';
  errorMessage.style.left = '50%';
  errorMessage.style.transform = 'translateX(-50%)';
  errorMessage.style.padding = '8px 12px';
  errorMessage.style.backgroundColor = '#f44336';
  errorMessage.style.color = 'white';
  errorMessage.style.borderRadius = '4px';
  errorMessage.style.zIndex = '1000';
  
  document.body.appendChild(errorMessage);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (document.body.contains(errorMessage)) {
      document.body.removeChild(errorMessage);
    }
  }, 3000);
  
  return errorMessage;
}

// Export tracking data as JSON
async function exportAsJSON(currentTab, hostname) {
  try {
    // Get data from the background script
    chrome.runtime.sendMessage({
      action: 'getTrackingData',
      tabId: currentTab.id,
      hostname: hostname
    }, (response) => {
      if (response && response.success) {
        const exportData = {
          url: currentTab.url,
          title: currentTab.title,
          timestamp: Date.now(),
          trackedRequests: response.requests || []
        };
        
        const jsonData = JSON.stringify(exportData, null, 2);
        
        downloadData(`pixeltracer-export-${Date.now()}.json`, jsonData, 'application/json');
      } else {
        const errorMsg = response?.error || 'Failed to get tracking data';
        showErrorMessage(`Export failed: ${errorMsg}`);
      }
    });
  } catch (error) {
    showErrorMessage(`Export failed: ${error.message}`);
  }
}

// Export tracking data as CSV
async function exportAsCSV(currentTab, hostname) {
  try {
    // Get CSV data from the background script
    chrome.runtime.sendMessage({
      action: 'exportToCSV',
      tabId: currentTab.id,
      hostname: hostname
    }, (response) => {
      if (response && response.success) {
        downloadData(`pixeltracer-export-${Date.now()}.csv`, response.csvData, 'text/csv');
      } else {
        const errorMsg = response?.error || 'Failed to export CSV';
        showErrorMessage(`Export failed: ${errorMsg}`);
      }
    });
  } catch (error) {
    showErrorMessage(`Export failed: ${error.message}`);
  }
}

// Helper function to download data
function downloadData(filename, data, type) {
  
  try {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Directly using the click() method sometimes fails in certain browsers
    // Append the link to the DOM, trigger the click, then remove
    document.body.appendChild(a);
    
    // Trigger the download using a small delay to ensure DOM updates
    setTimeout(() => {
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    
    // Show error notification to user
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = `Download failed: ${error.message}`;
    errorMessage.style.position = 'fixed';
    errorMessage.style.top = '10px';
    errorMessage.style.left = '50%';
    errorMessage.style.transform = 'translateX(-50%)';
    errorMessage.style.padding = '8px 12px';
    errorMessage.style.backgroundColor = '#f44336';
    errorMessage.style.color = 'white';
    errorMessage.style.borderRadius = '4px';
    errorMessage.style.zIndex = '1000';
    
    document.body.appendChild(errorMessage);
    
    // Remove after 3 seconds
    setTimeout(() => {
      document.body.removeChild(errorMessage);
    }, 3000);
  }
}

/**
 * Show the reports window with insights about tracking data
 */
function showReports() {
  reportsWindow.classList.add('visible');
  detailOverlay.classList.add('visible');
  
  // Initialize reports content
  generateReports();
  
  // Setup fresh tab event listeners
  const reportsTabs = reportsWindow.querySelectorAll('.tab-button');
  reportsTabs.forEach(button => {
    // Remove any existing listeners to prevent duplicates
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add fresh click listener
    newButton.addEventListener('click', () => {
      const tabName = newButton.getAttribute('data-tab');
      setActiveTab(tabName);
    });
  });
  
  // Set the initial active tab
  setActiveTab('summary');
}

/**
 * Close the reports window
 */
function closeReports() {
  reportsWindow.classList.remove('visible');
  detailOverlay.classList.remove('visible');
}

/**
 * Generate reports data and populate the reports tabs
 */
function generateReports() {
  generateSummaryReport();
  generateTimelineReport();
  generatePrivacyReport();
}

/**
 * Generate the summary report with counts and statistics
 */
function generateSummaryReport() {
  const summaryContent = document.getElementById('summary-content');
  
  if (currentTabRequests.length === 0) {
    summaryContent.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i> No tracking data available</div>';
    return;
  }
  
  // Count by providers
  const providerCounts = {};
  const categoryCounts = {};
  const eventTypeCounts = {};
  
  currentTabRequests.forEach(req => {
    // Count providers
    req.providers.forEach(provider => {
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    });
    
    // Count categories
    const category = req.category || 'unknown';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    
    // Count event types
    const eventType = req.eventType || 'unknown';
    eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;
  });
  
  // Format the first detected and last detected times
  const firstDetectedTime = new Date(Math.min(...currentTabRequests.map(r => r.timestamp))).toLocaleString();
  const lastDetectedTime = new Date(Math.max(...currentTabRequests.map(r => r.timestamp))).toLocaleString();
  
  // Calculate time span
  const timeSpanMs = Math.max(...currentTabRequests.map(r => r.timestamp)) - 
                     Math.min(...currentTabRequests.map(r => r.timestamp));
  const timeSpanSec = Math.round(timeSpanMs / 1000);
  const timeSpanMin = Math.floor(timeSpanSec / 60);
  const remainingSec = timeSpanSec % 60;
  const timeSpanFormatted = timeSpanMin > 0 ? 
    `${timeSpanMin} min ${remainingSec} sec` : 
    `${timeSpanSec} sec`;
  
  // Get frequency (requests per minute)
  const requestsPerMinute = (currentTabRequests.length / (timeSpanMs / 1000 / 60)).toFixed(1);
  
  // Build the HTML
  let html = `
    <div class="report-section">
      <h3 class="report-section-title">Overview</h3>
      <div class="report-stats">
        <div class="report-stat-item">
          <div class="report-stat-value">${currentTabRequests.length}</div>
          <div class="report-stat-label">Total Requests</div>
        </div>
        <div class="report-stat-item">
          <div class="report-stat-value">${Object.keys(providerCounts).length}</div>
          <div class="report-stat-label">Unique Providers</div>
        </div>
        <div class="report-stat-item">
          <div class="report-stat-value">${Object.keys(categoryCounts).length}</div>
          <div class="report-stat-label">Categories</div>
        </div>
        <div class="report-stat-item">
          <div class="report-stat-value">${requestsPerMinute}</div>
          <div class="report-stat-label">Req/Minute</div>
        </div>
      </div>
      <div class="report-timeline">
        <div class="report-timeline-item">
          <div class="report-timeline-label">First detected:</div>
          <div class="report-timeline-value">${firstDetectedTime}</div>
        </div>
        <div class="report-timeline-item">
          <div class="report-timeline-label">Time span:</div>
          <div class="report-timeline-value">${timeSpanFormatted}</div>
        </div>
        <div class="report-timeline-item">
          <div class="report-timeline-label">Last detected:</div>
          <div class="report-timeline-value">${lastDetectedTime}</div>
        </div>
      </div>
    </div>
    
    <div class="report-section">
      <h3 class="report-section-title">Providers</h3>
      <div class="report-table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Requests</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  // Sort providers by count (descending)
  const sortedProviders = Object.entries(providerCounts)
    .sort((a, b) => b[1] - a[1]);
  
  sortedProviders.forEach(([providerId, count]) => {
    const provider = trackingProviders[providerId];
    const percentage = ((count / currentTabRequests.length) * 100).toFixed(1);
    
    html += `
      <tr>
        <td>${provider ? provider.name : formatProviderNameFromId(providerId)}</td>
        <td>${count}</td>
        <td>${percentage}%</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="report-section">
      <h3 class="report-section-title">Categories</h3>
      <div class="report-table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Requests</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  // Sort categories by count (descending)
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]);
  
  sortedCategories.forEach(([category, count]) => {
    const percentage = ((count / currentTabRequests.length) * 100).toFixed(1);
    const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
    
    html += `
      <tr>
        <td>${formattedCategory}</td>
        <td>${count}</td>
        <td>${percentage}%</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  summaryContent.innerHTML = html;
}

/**
 * Generate the timeline report showing tracking activity over time
 */
function generateTimelineReport() {
  const timelineContent = document.getElementById('timeline-content');
  
  if (currentTabRequests.length === 0) {
    timelineContent.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i> No tracking data available</div>';
    return;
  }
  
  // Group requests by minute
  const groupedByTime = {};
  const startTime = Math.min(...currentTabRequests.map(r => r.timestamp));
  
  currentTabRequests.forEach(req => {
    // Round to the nearest minute
    const minuteBucket = Math.floor((req.timestamp - startTime) / (60 * 1000));
    groupedByTime[minuteBucket] = groupedByTime[minuteBucket] || [];
    groupedByTime[minuteBucket].push(req);
  });
  
  // Get the max requests in a minute for scaling
  const maxRequests = Math.max(...Object.values(groupedByTime).map(reqs => reqs.length));
  
  // Build the HTML
  let html = `
    <div class="report-section">
      <h3 class="report-section-title">Activity Timeline</h3>
      <div class="report-timeline-graph">
  `;
  
  // Get sorted minute keys
  const sortedMinutes = Object.keys(groupedByTime)
    .map(Number)
    .sort((a, b) => a - b);
  
  // Generate the graph
  sortedMinutes.forEach(minute => {
    const requests = groupedByTime[minute];
    const height = (requests.length / maxRequests) * 100;
    const time = new Date(startTime + (minute * 60 * 1000)).toLocaleTimeString();
    
    const providerCounts = {};
    requests.forEach(req => {
      req.providers.forEach(provider => {
        providerCounts[provider] = (providerCounts[provider] || 0) + 1;
      });
    });
    
    let barSegments = '';
    let accumulatedHeight = 0;
    
    Object.entries(providerCounts).forEach(([providerId, count]) => {
      const provider = trackingProviders[providerId];
      const category = provider ? provider.category : 'analytics';
      const segmentHeight = (count / requests.length) * height;
      
      barSegments += `
        <div class="timeline-bar-segment category-${category}" 
             style="height: ${segmentHeight}%;" 
             title="${provider ? provider.name : formatProviderNameFromId(providerId)}: ${count} requests">
        </div>
      `;
    });
    
    html += `
      <div class="timeline-bar-container" title="${requests.length} requests at ${time}">
        <div class="timeline-bar">
          ${barSegments}
        </div>
        <div class="timeline-label">${minute > 0 ? `+${minute}m` : 'Start'}</div>
      </div>
    `;
  });
  
  html += `
      </div>
      <div class="timeline-legend">
        <div class="legend-item">
          <div class="legend-color category-analytics"></div>
          <div class="legend-label">Analytics</div>
        </div>
        <div class="legend-item">
          <div class="legend-color category-ads"></div>
          <div class="legend-label">Ads</div>
        </div>
        <div class="legend-item">
          <div class="legend-color category-remarketing"></div>
          <div class="legend-label">Remarketing</div>
        </div>
        <div class="legend-item">
          <div class="legend-color category-social"></div>
          <div class="legend-label">Social</div>
        </div>
      </div>
    </div>
    
    <div class="report-section">
      <h3 class="report-section-title">Event Sequence</h3>
      <div class="report-event-sequence">
  `;
  
  // Take most recent 10 events
  const recentEvents = [...currentTabRequests]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  
  recentEvents.reverse().forEach(req => {
    const time = new Date(req.timestamp).toLocaleTimeString();
    const providerId = req.providers[0] || 'unknown';
    const provider = trackingProviders[providerId];
    const providerName = provider ? provider.name : formatProviderNameFromId(providerId);
    const eventType = req.eventType || 'Unknown';
    
    html += `
      <div class="event-sequence-item category-${req.category || 'analytics'}">
        <div class="event-time">${time}</div>
        <div class="event-provider">${providerName}</div>
        <div class="event-type">${eventType}</div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  timelineContent.innerHTML = html;
}

/**
 * Generate the privacy report with risk assessment
 */
function generatePrivacyReport() {
  const privacyContent = document.getElementById('privacy-content');
  
  if (currentTabRequests.length === 0) {
    privacyContent.innerHTML = '<div class="empty-state"><i class="fas fa-shield-alt"></i> No tracking data available</div>';
    return;
  }
  
  // Count sensitive tracking methods
  let cookieSync = 0;
  let fingerprinting = 0;
  let locationTracking = 0;
  let userIdTracking = 0;
  
  // Check requests for privacy-sensitive patterns
  currentTabRequests.forEach(req => {
    // Check params for fingerprinting indicators
    const params = req.params || {};
    const url = req.url || '';
    
    // Check for browser fingerprinting
    if (params.sw || params.sh || params.cd || params.sr || 
        url.includes('fingerprint') || url.includes('device_id')) {
      fingerprinting++;
    }
    
    // Check for location tracking
    if (params.lat || params.long || params.geo || 
        params.longitude || params.latitude || url.includes('location')) {
      locationTracking++;
    }
    
    // Check for user ID tracking
    if (params.uid || params.userid || params.user_id || 
        params.fbp || params.em || url.includes('identify')) {
      userIdTracking++;
    }
    
    // Check headers for cookie syncing (shared cookies between domains)
    const headers = req.headers || [];
    const hasCookieHeader = headers.some(h => 
      h.name.toLowerCase() === 'cookie' || h.name.toLowerCase() === 'set-cookie'
    );
    
    if (hasCookieHeader && req.host !== new URL(currentPageUrl).hostname) {
      cookieSync++;
    }
  });
  
  // Calculate overall privacy score (0-100, lower is better for privacy)
  const providerWeight = 4;
  const requestWeight = 0.5;
  const fingerprintingWeight = 10;
  const cookieSyncWeight = 5;
  const locationWeight = 15;
  const userIdWeight = 8;
  
  const uniqueProviders = new Set();
  currentTabRequests.forEach(req => {
    req.providers.forEach(provider => uniqueProviders.add(provider));
  });
  
  let privacyScore = 
    (uniqueProviders.size * providerWeight) + 
    (currentTabRequests.length * requestWeight) +
    (fingerprinting * fingerprintingWeight) +
    (cookieSync * cookieSyncWeight) +
    (locationTracking * locationWeight) +
    (userIdTracking * userIdWeight);
  
  // Cap at 100
  privacyScore = Math.min(100, Math.round(privacyScore));
  
  // Determine risk level
  let riskLevel, riskColor;
  if (privacyScore < 20) {
    riskLevel = 'Low';
    riskColor = '#4caf50';
  } else if (privacyScore < 50) {
    riskLevel = 'Medium';
    riskColor = '#ff9800';
  } else {
    riskLevel = 'High';
    riskColor = '#f44336';
  }
  
  // Build HTML
  let html = `    <div class="report-section">
      <h3 class="report-section-title">Privacy Risk Assessment</h3>
      <div class="privacy-score-container">
        <div class="privacy-score-circle" style="background: conic-gradient(${riskColor} ${privacyScore}%, #e0e0e0 0);">
          <div class="privacy-score-inner">
            <div class="privacy-score-value">${privacyScore}</div>
            <div class="privacy-score-label">Risk Score</div>
          </div>
        </div>
        <div class="privacy-risk-level" style="color: ${riskColor};">
          ${riskLevel} Risk
        </div>
      </div>
      
      <div class="privacy-factors">
        <div class="privacy-factor">
          <div class="privacy-factor-icon ${uniqueProviders.size > 5 ? 'warning' : ''}">
            <i class="fas fa-satellite-dish"></i>
          </div>
          <div class="privacy-factor-content">
            <div class="privacy-factor-title">Tracking Services</div>
            <div class="privacy-factor-value">${uniqueProviders.size} providers</div>
            <div class="privacy-factor-description">
              ${uniqueProviders.size > 5 ? 
                'High number of tracking services detected' : 
                'Number of unique tracking services on this page'}
            </div>
          </div>
        </div>
        
        <div class="privacy-factor">
          <div class="privacy-factor-icon ${fingerprinting > 0 ? 'warning' : ''}">
            <i class="fas fa-fingerprint"></i>
          </div>
          <div class="privacy-factor-content">
            <div class="privacy-factor-title">Device Fingerprinting</div>
            <div class="privacy-factor-value">${fingerprinting > 0 ? `${fingerprinting} requests` : 'Not detected'}</div>
            <div class="privacy-factor-description">
              ${fingerprinting > 0 ? 
                'Fingerprinting techniques used to identify your device' : 
                'No device fingerprinting techniques detected'}
            </div>
          </div>
        </div>
        
        <div class="privacy-factor">
          <div class="privacy-factor-icon ${locationTracking > 0 ? 'warning' : ''}">
            <i class="fas fa-map-marker-alt"></i>
          </div>
          <div class="privacy-factor-content">
            <div class="privacy-factor-title">Location Tracking</div>
            <div class="privacy-factor-value">${locationTracking > 0 ? `${locationTracking} requests` : 'Not detected'}</div>
            <div class="privacy-factor-description">
              ${locationTracking > 0 ? 
                'Attempts to collect your geographical location' : 
                'No location tracking detected'}
            </div>
          </div>
        </div>
        
        <div class="privacy-factor">
          <div class="privacy-factor-icon ${userIdTracking > 0 ? 'warning' : ''}">
            <i class="fas fa-id-card"></i>
          </div>
          <div class="privacy-factor-content">
            <div class="privacy-factor-title">User Identification</div>
            <div class="privacy-factor-value">${userIdTracking > 0 ? `${userIdTracking} requests` : 'Not detected'}</div>
            <div class="privacy-factor-description">
              ${userIdTracking > 0 ? 
                'Attempts to identify you using IDs or hashed personal data' : 
                'No user identification attempts detected'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  privacyContent.innerHTML = html;
}

/**
 * Format provider ID to a display name
 * @param {string} providerId - Provider ID from the tracking data
 * @returns {string} - Formatted provider name
 */
function formatProviderNameFromId(providerId) {
  return providerId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Setup tab events for detail window
function setupDetailTabEvents() {
  const detailTabButtons = document.querySelectorAll('#detail-window .tab-button');
  
  detailTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      setActiveTab(tabName);
    });
  });
}

// Add CSS for the loading spinner
document.addEventListener('DOMContentLoaded', () => {
  // Add spinner styles
  const style = document.createElement('style');
  style.textContent = `
    .loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 80px;
      color: #3498db;
      font-size: 14px;
      position: relative;
      background-color: #f9f9f9;
      border-radius: 6px;
      margin: 10px 0;
      text-align: center;
      padding: 15px;
      flex-direction: column;
    }
    
    .loading-spinner i {
      font-size: 24px;
      margin-bottom: 10px;
    }
    
    @keyframes spinner {
      to {transform: rotate(360deg);}
    }
    
    body.dark-mode .loading-spinner {
      color: #5dade2;
      background-color: #333;
      border: 1px solid #444;
    }
  `;
  document.head.appendChild(style);
});

// Event listeners
document.addEventListener('DOMContentLoaded', initPopup); 
