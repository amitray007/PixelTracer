/**
 * Content script for PixelTracer
 * This script runs in the context of web pages
 */

// State management
let liveViewEnabled = false;
let liveViewEl = null;
let requestsContainer = null;
let requestsList = [];
let isLiveViewMinimized = false; // Track minimized state
let detailWindowEl = null; // Reference to the detail window element
let currentTabRequests = []; // Store the current tab's requests
let currentTabId = null; // Store the current tab ID
let currentUrl = ''; // Store the current page URL
const MAX_DISPLAYED_REQUESTS = 100; // Increased to keep more requests in live view
let trackingProvidersData = {}; // Will store provider data from background script
let isFirstDataLoad = true; // Flag to track initial data load

// Default filter settings
let filterPreferences = {
  filterType: 'all',
  viewMode: 'chronological'
};

// Initialize on content script load
init();

/**
 * Initialize the content script
 */
function init() {
  // Get current tab ID
  getCurrentTabInfo();
  
  // Check if Live View was previously enabled for this domain
  const hostname = window.location.hostname;
  
  // Get tracking providers data
  chrome.runtime.sendMessage({ action: 'getProviderInfo', providerId: 'all' }, (response) => {
    if (response && response.allProviders) {
      trackingProvidersData = response.allProviders;
    }
  });
  
  // First load filter preferences, then initialize the UI
  loadFilterPreferences().then(() => {
    // Now initialize the Live View (if enabled)
    chrome.storage.local.get(['pixelTracerSettings', 'liveViewState'], (result) => {
      const settings = result.pixelTracerSettings || {};
      const liveViewState = result.liveViewState || {};
      
      // If Live View is globally enabled and not explicitly closed for this domain, show it
      if (settings.liveViewEnabled && liveViewState[hostname] !== 'closed') {
        liveViewEnabled = true;
        isLiveViewMinimized = liveViewState[hostname] === 'minimized';
        createLiveView();
        
        // Load existing tracking data once we have the tab ID
        if (currentTabId) {
          loadTrackingData();
        } else {
          // Wait for tab ID to be available
          const checkTabId = setInterval(() => {
            if (currentTabId) {
              loadTrackingData();
              clearInterval(checkTabId);
            }
          }, 100);
        }
      }
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
      console.log('Page navigation detected - clearing local tracking data');
      
      // Reset tracking data
      currentTabRequests = [];
      
      // Update the current URL
      currentUrl = newUrl;
      
      // If tab ID not set, get it again
      if (!currentTabId) {
        getCurrentTabInfo();
      }
      
      // Notify background script about navigation to ensure data is cleared there too
      if (currentTabId) {
        const hostname = new URL(currentUrl).hostname;
        chrome.runtime.sendMessage({
          action: 'dataCleared',
          tabId: currentTabId
        });
      }
    }
    
    // Refresh data after a slight delay
    if (liveViewEnabled) {
      setTimeout(() => loadTrackingData(), 500);
    }
  });
}

/**
 * Get the current tab information
 */
function getCurrentTabInfo() {
  try {
    chrome.runtime.sendMessage({ action: 'getCurrentTabInfo' }, (response) => {
      if (response && response.tabId) {
        currentTabId = response.tabId;
        currentUrl = response.url || window.location.href;
      }
    });
  } catch (e) {
    console.error('Error getting tab info:', e);
  }
}

/**
 * Load tracking data from the background script
 */
function loadTrackingData() {
  if (!currentTabId) {
    getCurrentTabInfo();
    return;
  }
  
  const hostname = new URL(currentUrl || window.location.href).hostname;
  
  // Reset the requests array to prevent accumulation
  currentTabRequests = [];
  
  // Request data from the background script which maintains the central store
  chrome.runtime.sendMessage({
    action: 'getTrackingData',
    tabId: currentTabId,
    hostname: hostname
  }, (response) => {
    if (response && response.success && response.requests) {
      // Update our local state
      currentTabRequests = response.requests;
      
      // Only update UI if Live View is visible
      if (liveViewEnabled && liveViewEl) {
        updateStats();
        refreshRequestList();
      }
    }
  });
}

/**
 * Refresh the request list in the UI
 */
function refreshRequestList() {
  if (!liveViewEl || !requestsContainer) return;
  
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
  
  // Sort by timestamp descending (newest first)
  const sortedRequests = [...requests].sort((a, b) => b.timestamp - a.timestamp);
  
  // Add requests to the UI (limited to prevent performance issues)
  sortedRequests.slice(0, MAX_DISPLAYED_REQUESTS).forEach(request => {
    addRequestItemToUI(request);
  });
}

/**
 * Display requests grouped by provider
 * @param {Array} requests - The filtered requests to display
 */
function displayGroupedRequests(requests) {
  // Clear existing requests first
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
    
    // Create header for the group
    const header = document.createElement('div');
    header.className = 'pixeltracer-provider-header';
    header.innerHTML = `
      <span>${providerName}</span>
      <span class="pixeltracer-provider-count">${providerRequests.length}</span>
    `;
    
    groupContainer.appendChild(header);
    
    // Add request items to the group
    const requestsContainer = document.createElement('div');
    requestsContainer.className = 'pixeltracer-provider-requests';
    
    // Sort by timestamp (newest first) and limit the number of displayed requests
    providerRequests
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, Math.min(5, providerRequests.length))
      .forEach(request => {
        const requestEl = createRequestElement(request);
        requestsContainer.appendChild(requestEl);
        requestsList.push(requestEl);
      });
    
    groupContainer.appendChild(requestsContainer);
    
    // Add to main container
    document.getElementById('pixeltracer-requests-container').appendChild(groupContainer);
  });
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    loadTrackingData();
    saveLiveViewState('open');
    sendResponse({ success: true });
  } else if (message.action === 'disableLiveView') {
    removeLiveView();
    liveViewEnabled = false;
    saveLiveViewState('closed');
    sendResponse({ success: true });
  } else if (message.action === 'refreshTracking') {
    loadTrackingData();
    sendResponse({ success: true });
  } else if (message.action === 'trackingRequestDetected' && liveViewEnabled) {
    // New tracking request detected
    processNewTrackingRequest(message.request);
    sendResponse({ success: true });
  } else if (message.action === 'trackingDataCleared') {
    // Tracking data was cleared by the popup
    currentTabRequests = [];
    refreshRequestList();
    updateStats();
    sendResponse({ success: true });
  } else if (message.action === 'pageRefreshed') {
    // Handle page refresh event from background script
    console.log('Page refresh detected - clearing local tracking data');
    
    // Clear our local data for the refreshed hostname
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
    
    sendResponse({ success: true });
  }
  
  return true; // Required for async response
});

/**
 * Process a new tracking request
 * @param {Object} request - The tracking request object
 */
function processNewTrackingRequest(request) {
  // Check if this is for our tab and is new
  if (!request || !currentTabId || request.tabId !== currentTabId) return;
  
  // Add to our local array
  addNewRequestToLocalStore(request);
  
  // Update the UI stats
  updateStats();
  
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
}

/**
 * Add a new request to the local store
 * @param {Object} request - The tracking request object
 */
function addNewRequestToLocalStore(request) {
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
  
  chrome.runtime.sendMessage({ action: 'getProviderInfo', providerId }, (response) => {
    if (!response || !response.provider) {
      content.innerHTML = '<div class="pixeltracer-empty-state">No event details available</div>';
      return;
    }
    
    const provider = response.provider;
    
    // Get the schema for this provider
    const schema = provider.schema || {};
    
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
    
    html += '</div>';
    
    content.innerHTML = html;
  });
}

// Fill the Parameters tab with URL parameters
function fillParamsTab(request) {
  const content = document.getElementById('pixeltracer-params-content');
  
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
  const content = document.getElementById('pixeltracer-headers-tab');
  
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
  const content = document.getElementById('pixeltracer-payload-tab');
  
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
  // Create request element
  const requestEl = document.createElement('div');
  requestEl.className = `pixeltracer-request-item pixeltracer-category-${request.category || 'analytics'}`;
  
  // Format time
  const time = new Date(request.timestamp);
  const timeString = time.toLocaleTimeString();
  
  // Get provider display name and account ID
  const providerId = request.providers[0] || 'unknown';
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
  requestEl.addEventListener('click', () => {
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
  
  // Create the request element
  const requestEl = createRequestElement(request);
  
  // If we're in grouped view, we need to refresh the entire view to maintain grouping
  if (filterPreferences.viewMode === 'grouped') {
    // Rather than trying to update a single item in grouped view, refresh the entire list
    refreshRequestList();
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
    console.log('[PixelTracer] Detected inline tracking scripts:', detectedScripts);
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

// Create the detail window for viewing request details
function createDetailWindow() {
  if (detailWindowEl) {
    return;
  }
  
  detailWindowEl = document.createElement('div');
  detailWindowEl.id = 'pixeltracer-detail-window';
  detailWindowEl.className = 'pixeltracer-detail-window';
  
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
  
  // Add styles for detail window
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
    
    .pixeltracer-detail-window {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 90%;
      max-width: 650px;
      max-height: 80vh;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    
    .pixeltracer-detail-window.visible {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }
    
    .pixeltracer-detail-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999998;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    
    .pixeltracer-detail-overlay.visible {
      opacity: 1;
      visibility: visible;
    }
    
    .pixeltracer-detail-header {
      background-color: #2c3e50;
      color: white;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .pixeltracer-detail-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      display: flex;
      align-items: center;
    }
    
    .pixeltracer-detail-header h3 i {
      margin-right: 8px;
      color: #3498db;
    }
    
    #pixeltracer-detail-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    #pixeltracer-detail-close:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .pixeltracer-detail-content {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }
    
    .pixeltracer-detail-tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      background-color: #f5f5f5;
      overflow-x: auto;
      flex-shrink: 0;
    }
    
    .pixeltracer-tab-button {
      padding: 12px 16px;
      border: none;
      background: none;
      font-size: 14px;
      color: #7f8c8d;
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
    }
    
    .pixeltracer-tab-button i {
      margin-right: 6px;
    }
    
    .pixeltracer-tab-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    .pixeltracer-tab-button.active {
      color: #3498db;
      border-bottom: 2px solid #3498db;
      font-weight: 500;
    }
    
    .pixeltracer-tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }
    
    .pixeltracer-tab-pane {
      display: none;
      padding: 16px;
      animation: pixeltracer-fade-in 0.3s ease;
    }
    
    .pixeltracer-tab-pane.active {
      display: block;
    }
    
    @keyframes pixeltracer-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .pixeltracer-param-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    .pixeltracer-param-table th, .pixeltracer-param-table td {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
    }
    
    .pixeltracer-param-table th {
      background-color: #f5f5f5;
      font-weight: 600;
      color: #34495e;
    }
    
    .pixeltracer-param-table td {
      color: #333;
    }
    
    .pixeltracer-param-name {
      font-weight: 500;
    }
    
    .pixeltracer-param-value {
      font-family: monospace;
    }
    
    .pixeltracer-param-table tr:hover td {
      background-color: #f9f9f9;
    }
    
    .pixeltracer-request-item {
      background-color: white;
      border-radius: 6px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      animation: pixeltracer-slide-in 0.3s ease;
      cursor: pointer;
      transition: all 0.2s ease;
      border-left: 3px solid #3498db;
      margin-bottom: 8px;
    }
    
    .pixeltracer-request-item:hover {
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
      border-left-width: 5px;
    }
    
    .pixeltracer-request-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .pixeltracer-request-title {
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }
    
    .pixeltracer-event-badge {
      display: inline-block;
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 12px;
      background-color: #e0f7fa;
      color: #0097a7;
      position: relative;
      font-weight: 500;
      letter-spacing: 0.2px;
      white-space: nowrap;
      cursor: help;
    }
    
    /* Event badge variations by type */
    .pixeltracer-event-badge[data-type="pageview"],
    .pixeltracer-event-badge[data-type="PageView"] {
      background-color: #e3f2fd;
      color: #1976d2;
    }
    
    .pixeltracer-event-badge[data-type="event"],
    .pixeltracer-event-badge[data-type="Event"] {
      background-color: #e0f7fa;
      color: #0097a7;
    }
    
    .pixeltracer-event-badge[data-type="purchase"],
    .pixeltracer-event-badge[data-type="Purchase"] {
      background-color: #e8f5e9;
      color: #388e3c;
    }
    
    .pixeltracer-event-badge[data-type="conversion"] {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }
    
    .pixeltracer-event-badge[data-type="AddToCart"] {
      background-color: #fff8e1;
      color: #ff8f00;
    }
    
    .pixeltracer-event-time {
      font-size: 12px;
      color: #95a5a6;
      display: flex;
      align-items: center;
    }
    
    .pixeltracer-event-time::before {
      content: "\f017";
      font-family: "Font Awesome 6 Free";
      margin-right: 5px;
      opacity: 0.7;
    }
    
    .pixeltracer-account-id {
      font-size: 12px;
      color: #95a5a6;
      margin-left: 4px;
      font-weight: 400;
      cursor: help;
    }
    
    /* Custom styling for event types by provider */
    .pixeltracer-category-analytics { border-left-color: #3498db; }
    .pixeltracer-category-ads { border-left-color: #e74c3c; }
    .pixeltracer-category-remarketing { border-left-color: #f39c12; }
    .pixeltracer-category-social { border-left-color: #9b59b6; }
    
    /* Styles for the details section */
    .pixeltracer-details-group {
      margin-bottom: 16px;
      border: 1px solid #eee;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .pixeltracer-details-group-title {
      background-color: #f5f5f5;
      padding: 12px 15px;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
    }
    
    .pixeltracer-details-group-title i {
      margin-right: 8px;
      color: #3498db;
    }
    
    .pixeltracer-details-item {
      padding: 10px 15px;
      display: flex;
      border-bottom: 1px solid #eee;
    }
    
    .pixeltracer-details-item:last-child {
      border-bottom: none;
    }
    
    .pixeltracer-details-key {
      width: 40%;
      font-weight: 500;
      color: #34495e;
    }
    
    .pixeltracer-details-value {
      width: 60%;
      word-break: break-all;
    }
    
    /* Styles for empty state */
    .pixeltracer-empty-state {
      text-align: center;
      color: #95a5a6;
      padding: 30px 20px;
      font-style: italic;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 120px;
      flex-direction: column;
    }
    
    .pixeltracer-empty-state:before {
      content: '\f254';
      font-family: 'Font Awesome 6 Free';
      font-weight: 900;
      font-size: 24px;
      margin-bottom: 10px;
      color: #bdc3c7;
    }
  `;
  
  document.head.appendChild(style);
  
  // Create overlay for the detail window
  const overlay = document.createElement('div');
  overlay.className = 'pixeltracer-detail-overlay';
  document.body.appendChild(overlay);
  
  document.body.appendChild(detailWindowEl);
  
  // Add event listeners
  document.getElementById('pixeltracer-detail-close').addEventListener('click', closeDetailWindow);
  overlay.addEventListener('click', closeDetailWindow);
  
  // Add tab functionality
  const tabButtons = document.querySelectorAll('.pixeltracer-tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      setActiveTab(tabName);
    });
  });
}

// Set the active tab in the detail window
function setActiveTab(tabName) {
  const tabButtons = document.querySelectorAll('.pixeltracer-tab-button');
  const tabPanes = document.querySelectorAll('.pixeltracer-tab-pane');
  
  // Remove active class from all buttons and panes
  tabButtons.forEach(button => button.classList.remove('active'));
  tabPanes.forEach(pane => pane.classList.remove('active'));
  
  // Add active class to the selected button and pane
  document.querySelector(`.pixeltracer-tab-button[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`pixeltracer-${tabName}-tab`).classList.add('active');
}

// Show the detail window
function showDetailWindow(providerName, providerId, request) {
  if (!detailWindowEl) return;
  
  // Set title
  document.getElementById('pixeltracer-detail-title').textContent = `${providerName} Request Details`;
  
  // Fill tab content
  fillGeneralTab(providerId, request);
  fillEventTab(providerId, request);
  fillParamsTab(request);
  fillHeadersTab(request);
  fillPayloadTab(request);
  
  // Show the window and overlay
  detailWindowEl.classList.add('visible');
  document.querySelector('.pixeltracer-detail-overlay').classList.add('visible');
  
  // Set first tab as active
  setActiveTab('general');
}

// Close the detail window
function closeDetailWindow() {
  if (!detailWindowEl) return;
  
  detailWindowEl.classList.remove('visible');
  document.querySelector('.pixeltracer-detail-overlay').classList.remove('visible');
}

/**
 * Load filter preferences from storage
 */
function loadFilterPreferences() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pixelTracerFilterPreferences'], (result) => {
      if (result.pixelTracerFilterPreferences) {
        console.log('Loaded filter preferences:', result.pixelTracerFilterPreferences);
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

// Function to create and show the Live View floating window
function createLiveView() {
  // If it already exists, just show it
  if (liveViewEl) {
    liveViewEl.style.display = 'block';
    
    // Restore minimized state if needed
    if (isLiveViewMinimized) {
      liveViewEl.classList.add('minimized');
    } else {
      liveViewEl.classList.remove('minimized');
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
            <option value="analytics">Analytics</option>
            <option value="ads">Ads</option>
            <option value="remarketing">Remarketing</option>
            <option value="social">Social</option>
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

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
    
    #pixeltracer-live-view {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 450px;
      max-height: 550px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s ease;
      border: 1px solid #e0e0e0;
      cursor: default;
    }
    
    #pixeltracer-live-view.minimized {
      height: 40px;
      overflow: hidden;
    }
    
    .pixeltracer-header {
      background-color: #2c3e50;
      color: white;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
      position: relative;
    }
    
    .pixeltracer-header:before {
      content: '';
      display: block;
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      height: 6px;
      width: 20px;
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.5) 1px,
        transparent 1px,
        transparent 2px,
        rgba(255, 255, 255, 0.5) 2px,
        transparent 2px,
        transparent 3px,
        rgba(255, 255, 255, 0.5) 3px
      );
    }
    
    .pixeltracer-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      margin-left: 30px;
    }
    
    .pixeltracer-header h3 i {
      margin-right: 8px;
      color: #3498db;
    }
    
    .pixeltracer-controls {
      display: flex;
      gap: 5px;
    }
    
    .pixeltracer-controls button {
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      padding: 0;
    }
    
    .pixeltracer-controls button:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .pixeltracer-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      max-height: 510px;
      background-color: #f5f5f5;
      display: flex;
      flex-direction: column;
    }
    
    .pixeltracer-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .pixeltracer-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      position: relative;
    }
    
    .pixeltracer-stat-item:first-child::after {
      content: '';
      position: absolute;
      right: 0;
      top: 10%;
      height: 80%;
      width: 1px;
      background-color: #e0e0e0;
    }
    
    .pixeltracer-stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #16a085;
    }
    
    .pixeltracer-stat-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .pixeltracer-filter-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .pixeltracer-filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .pixeltracer-filter-group label {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 500;
    }
    
    .pixeltracer-filter-group select {
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      background-color: white;
      font-size: 12px;
      color: #34495e;
      cursor: pointer;
    }
    
    .pixeltracer-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .pixeltracer-section-header h2 {
      font-size: 16px;
      margin: 0;
      color: #34495e;
      font-weight: 600;
      display: flex;
      align-items: center;
    }
    
    .pixeltracer-section-header h2 i {
      margin-right: 6px;
      color: #3498db;
      font-size: 18px;
    }
    
    #pixeltracer-requests-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      min-height: 0;
      max-height: calc(100% - 70px);
    }
    
    .pixeltracer-empty-state {
      text-align: center;
      color: #95a5a6;
      padding: 20px;
      font-style: italic;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
    }
    
    .pixeltracer-provider-group {
      margin-bottom: 15px;
    }
    
    .pixeltracer-provider-header {
      background-color: #f1f1f1;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      font-weight: 600;
      color: #34495e;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .pixeltracer-provider-count {
      background-color: #3498db;
      color: white;
      font-size: 11px;
      border-radius: 12px;
      padding: 2px 8px;
      font-weight: normal;
    }
    
    @keyframes pixeltracer-slide-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(liveViewEl);
  
  // Set initial position based on stored position or default
  getInitialPosition().then(position => {
    liveViewEl.style.left = position.left;
    liveViewEl.style.top = position.top;
    liveViewEl.style.right = position.right;
    liveViewEl.style.bottom = position.bottom;
    
    // Make the window draggable
    const headerEl = liveViewEl.querySelector('.pixeltracer-header');
    makeDraggable(liveViewEl, headerEl);
    
    // Add event listeners
    const minimizeButton = liveViewEl.querySelector('#pixeltracer-minimize');
    const closeButton = liveViewEl.querySelector('#pixeltracer-close');
    
    minimizeButton.addEventListener('click', toggleMinimize);
    closeButton.addEventListener('click', removeLiveView);
    
    // Get reference to the requests container
    requestsContainer = document.getElementById('pixeltracer-requests-container');
    
    // Apply filter and view mode from saved preferences
    const filterTypeSelect = document.getElementById('pixeltracer-filter-type');
    const viewModeSelect = document.getElementById('pixeltracer-view-mode');
    
    console.log('Applying filter preferences:', filterPreferences);
    
    // Set the select elements to match the stored preferences
    if (filterTypeSelect) {
      // Make sure we set a valid value
      if (filterPreferences.filterType && 
          Array.from(filterTypeSelect.options).some(opt => opt.value === filterPreferences.filterType)) {
        filterTypeSelect.value = filterPreferences.filterType;
      } else {
        // Default to "all" if the stored value is invalid
        filterTypeSelect.value = 'all';
        filterPreferences.filterType = 'all';
      }
    }
    
    if (viewModeSelect) {
      // Make sure we set a valid value
      if (filterPreferences.viewMode && 
          Array.from(viewModeSelect.options).some(opt => opt.value === filterPreferences.viewMode)) {
        viewModeSelect.value = filterPreferences.viewMode;
      } else {
        // Default to "chronological" if the stored value is invalid
        viewModeSelect.value = 'chronological';
        filterPreferences.viewMode = 'chronological';
      }
    }
    
    // Add event listeners for filter changes
    if (filterTypeSelect) {
      filterTypeSelect.addEventListener('change', (e) => {
        // Only update the filter type, keep the view mode unchanged
        filterPreferences.filterType = e.target.value;
        saveFilterPreferences();
        refreshRequestList();
      });
    }
    
    if (viewModeSelect) {
      viewModeSelect.addEventListener('change', (e) => {
        // Only update the view mode, keep the filter type unchanged
        filterPreferences.viewMode = e.target.value;
        saveFilterPreferences();
        refreshRequestList();
      });
    }
    
    // Create detail window
    createDetailWindow();
    
    // Check for inline tracking scripts after the page is loaded
    setTimeout(detectInlineTrackingScripts, 1000);
  });
} 