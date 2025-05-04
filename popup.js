import { trackingProviders } from './trackingProviders.js';

// DOM elements
const totalRequestsElement = document.getElementById('total-requests');
const uniqueProvidersElement = document.getElementById('unique-providers');
const providersContainer = document.getElementById('providers-container');
const requestsContainer = document.getElementById('requests-container');
const clearDataButton = document.getElementById('clear-data');
const exportDataButton = document.getElementById('export-data');
const liveViewButton = document.getElementById('live-view-btn');
const reportsButton = document.getElementById('reports-btn');
const detailWindow = document.getElementById('detail-window');
const reportsWindow = document.getElementById('reports-window');
const detailOverlay = document.getElementById('detail-overlay');
const detailTitle = document.getElementById('detail-title');
const detailCloseBtn = document.getElementById('detail-close');
const reportsCloseBtn = document.getElementById('reports-close');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const collapseAllRequestsButton = document.getElementById('collapse-all-requests');
const expandAllRequestsButton = document.getElementById('expand-all-requests');

// State management
let isLiveViewEnabled = false;
let currentTabRequests = [];
let currentPageUrl = '';

// Get the current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Initialize the popup
async function initPopup() {
  console.log('Initializing popup');
  try {
    const currentTab = await getCurrentTab();
    currentPageUrl = currentTab.url;
    console.log('Current page URL:', currentPageUrl);
    
    // Setup all button event listeners
    setupEventListeners();
    
    // Load settings from storage
    chrome.storage.local.get(['pixelTracerSettings'], (result) => {
      const settings = result.pixelTracerSettings || {};
      isLiveViewEnabled = settings.liveViewEnabled || false;
      
      // Update Live View button state
      updateLiveViewButtonState();
      
      // Initialize Live View if it's enabled
      if (isLiveViewEnabled) {
        enableLiveView(currentTab.id);
      }
      
      // Load tracking data
      loadTrackingData(currentTab.id);
    });
    
    // Get page info from the content script
    chrome.tabs.sendMessage(currentTab.id, { action: 'getPageInfo' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Error getting page info: ', chrome.runtime.lastError);
        return;
      }
      
      if (response) {
        console.log('Page info:', response);
      }
    });
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

// Setup all event listeners
function setupEventListeners() {
  console.log('Setting up event listeners');
  
  // Check if all required elements exist
  if (!clearDataButton) console.error('Clear data button not found');
  if (!exportDataButton) console.error('Export data button not found');
  if (!liveViewButton) console.error('Live view button not found');
  if (!reportsButton) console.error('Reports button not found');
  if (!detailCloseBtn) console.error('Detail close button not found');
  if (!reportsCloseBtn) console.error('Reports close button not found');
  if (!detailOverlay) console.error('Detail overlay not found');
  if (!collapseAllRequestsButton) console.error('Collapse all button not found');
  if (!expandAllRequestsButton) console.error('Expand all button not found');
  
  // Attach button event listeners
  if (clearDataButton) clearDataButton.addEventListener('click', clearData);
  if (exportDataButton) {
    console.log('Adding click listener to export button');
    exportDataButton.addEventListener('click', exportData);
  }
  if (liveViewButton) liveViewButton.addEventListener('click', toggleLiveView);
  if (reportsButton) reportsButton.addEventListener('click', showReports);
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
  
  console.log('Event listeners setup complete');
}

// Update the Live View button state
function updateLiveViewButtonState() {
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
  isLiveViewEnabled = !isLiveViewEnabled;
  
  // Update button state
  updateLiveViewButtonState();
  
  // Save setting
  chrome.storage.local.get(['pixelTracerSettings'], (result) => {
    const settings = result.pixelTracerSettings || {};
    settings.liveViewEnabled = isLiveViewEnabled;
    chrome.storage.local.set({ pixelTracerSettings: settings });
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
      console.log('Error enabling Live View: ', chrome.runtime.lastError);
      return;
    }
    
    if (response && response.success) {
      console.log('Live View enabled');
    }
  });
}

// Disable Live View by sending a message to the content script
function disableLiveView(tabId) {
  chrome.tabs.sendMessage(tabId, { 
    action: 'disableLiveView'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Error disabling Live View: ', chrome.runtime.lastError);
      return;
    }
    
    if (response && response.success) {
      console.log('Live View disabled');
    }
  });
}

// Load tracking data for the current tab
function loadTrackingData(tabId) {
  // Get the current hostname from the URL
  const hostname = new URL(currentPageUrl).hostname;
  
  // Reset any cached data
  currentTabRequests = [];
  
  // Show loading state
  totalRequestsElement.textContent = "...";
  uniqueProvidersElement.textContent = "...";
  
  // Get tracking data from the background page
  chrome.runtime.sendMessage({
    action: 'getTrackingData',
    tabId: tabId,
    hostname: hostname
  }, (response) => {
    if (response && response.success && response.requests) {
      // Use the data from the background page
      currentTabRequests = response.requests;
      
      // Update stats
      totalRequestsElement.textContent = currentTabRequests.length;
      
      // Get unique providers
      const uniqueProviders = new Set();
      currentTabRequests.forEach(request => {
        request.providers.forEach(provider => uniqueProviders.add(provider));
      });
      
      uniqueProvidersElement.textContent = uniqueProviders.size;
      
      // Render providers
      renderProviders(uniqueProviders);
      
      // Render recent requests
      renderRequests(currentTabRequests);
    } else {
      // Fallback: Show empty state
      totalRequestsElement.textContent = "0";
      uniqueProvidersElement.textContent = "0";
      providersContainer.innerHTML = '<div class="empty-state">No tracking providers detected yet</div>';
      requestsContainer.innerHTML = '<div class="empty-state">No tracking requests detected yet</div>';
    }
  });
}

// Render the list of detected providers
function renderProviders(uniqueProviders) {
  providersContainer.innerHTML = '';
  
  if (uniqueProviders.size === 0) {
    providersContainer.innerHTML = '<div class="empty-state">No tracking providers detected yet</div>';
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
  detailTitle.textContent = `${provider.name} Summary`;
  detailWindow.classList.add('visible');
  detailOverlay.classList.add('visible');
  
  // Show only the general tab for provider summary
  setActiveTab('general');
  
  // Hide other tabs when showing provider summary
  document.querySelectorAll('.tab-button:not([data-tab="general"])').forEach(btn => {
    btn.style.display = 'none';
  });
  
  const generalContent = document.getElementById('general-content');
  
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
    requestsContainer.innerHTML = '<div class="empty-state">No tracking requests detected yet</div>';
    return;
  }
  
  // Sort by timestamp descending (newest first)
  const sortedRequests = [...requests].sort((a, b) => b.timestamp - a.timestamp);
  
  // Take only the most recent 15 requests
  const recentRequests = sortedRequests.slice(0, 15);
  
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
    requestElement.dataset.requestId = request.requestId;
    
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
  detailTitle.textContent = `${providerName} Request Details`;
  detailWindow.classList.add('visible');
  detailOverlay.classList.add('visible');
  
  // Make sure all tabs are visible when showing request details
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.style.display = '';
  });
  
  // Set active tab to General
  setActiveTab('general');
  
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
  detailWindow.classList.remove('visible');
  detailOverlay.classList.remove('visible');
}

/**
 * Fill the General tab with basic request information
 * @param {string} providerId - ID of the provider
 * @param {object} request - The request data
 */
function fillGeneralTab(providerId, request) {
  const provider = trackingProviders[providerId];
  const generalContent = document.getElementById('general-content');
  
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
 * Fill the Event tab with event-specific information
 * @param {string} providerId - ID of the provider
 * @param {object} request - The request data
 */
function fillEventTab(providerId, request) {
  const provider = trackingProviders[providerId];
  const eventContent = document.getElementById('event-content');
  
  if (!provider.schema || !provider.schema.groups || !provider.schema.groups.event) {
    eventContent.innerHTML = '<div class="empty-state">No event data available for this provider</div>';
    return;
  }
  
  const eventGroup = provider.schema.groups.event;
  let tableRows = '';
  let hasValues = false;
  
  for (const field of eventGroup.fields) {
    if (request.params[field.key]) {
      hasValues = true;
      tableRows += `
        <tr>
          <th class="param-name">${field.label}</th>
          <td class="param-value">${request.params[field.key]}</td>
        </tr>`;
    }
  }
  
  if (!hasValues) {
    eventContent.innerHTML = '<div class="empty-state">No event data found in this request</div>';
    return;
  }
  
  eventContent.innerHTML = `
    <table class="param-table">
      ${tableRows}
    </table>
  `;
}

/**
 * Fill the Parameters tab with all URL parameters
 * @param {object} request - The request data
 */
function fillParamsTab(request) {
  const paramsContent = document.getElementById('params-content');
  
  if (!request.params || Object.keys(request.params).length === 0) {
    paramsContent.innerHTML = '<div class="empty-state">No URL parameters in this request</div>';
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
    headersContent.innerHTML = '<div class="empty-state">No headers captured for this request</div>';
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
    payloadContent.innerHTML = '<div class="empty-state">No payload data for this request</div>';
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
  // Update tab buttons
  tabButtons.forEach(button => {
    if (button.dataset.tab === tabName) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Update tab panes
  tabPanes.forEach(pane => {
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
  console.log('Export button clicked');
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
    console.error('Export button not found');
    showErrorMessage('Export failed: Button not found');
    return;
  }
  
  const buttonRect = exportButton.getBoundingClientRect();
  console.log('Export button position:', buttonRect);
  
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
  
  console.log('Export menu added to document');
  
  // Add event listeners to the menu items
  const jsonExportItem = document.querySelector('.export-menu-item[data-format="json"]');
  if (jsonExportItem) {
    jsonExportItem.addEventListener('click', () => {
      console.log('JSON export selected');
      exportAsJSON(currentTab, hostname);
      document.body.removeChild(exportMenu);
      document.head.removeChild(arrow);
    });
  }
  
  const csvExportItem = document.querySelector('.export-menu-item[data-format="csv"]');
  if (csvExportItem) {
    csvExportItem.addEventListener('click', () => {
      console.log('CSV export selected');
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
  console.log('Exporting data as JSON');
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
        console.log(`Prepared JSON data (${jsonData.length} characters)`);
        
        downloadData(`pixeltracer-export-${Date.now()}.json`, jsonData, 'application/json');
      } else {
        const errorMsg = response?.error || 'Failed to get tracking data';
        console.error('Export JSON error:', errorMsg);
        showErrorMessage(`Export failed: ${errorMsg}`);
      }
    });
  } catch (error) {
    console.error('Export JSON error:', error);
    showErrorMessage(`Export failed: ${error.message}`);
  }
}

// Export tracking data as CSV
async function exportAsCSV(currentTab, hostname) {
  console.log('Exporting data as CSV');
  try {
    // Get CSV data from the background script
    chrome.runtime.sendMessage({
      action: 'exportToCSV',
      tabId: currentTab.id,
      hostname: hostname
    }, (response) => {
      if (response && response.success) {
        console.log(`Prepared CSV data (${response.csvData.length} characters)`);
        downloadData(`pixeltracer-export-${Date.now()}.csv`, response.csvData, 'text/csv');
      } else {
        const errorMsg = response?.error || 'Failed to export CSV';
        console.error('Export CSV error:', errorMsg);
        showErrorMessage(`Export failed: ${errorMsg}`);
      }
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    showErrorMessage(`Export failed: ${error.message}`);
  }
}

// Helper function to download data
function downloadData(filename, data, type) {
  console.log(`Attempting to download ${filename} (${type})`);
  
  try {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    
    console.log('Blob created, URL:', url);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Directly using the click() method sometimes fails in certain browsers
    // Append the link to the DOM, trigger the click, then remove
    document.body.appendChild(a);
    
    // Trigger the download using a small delay to ensure DOM updates
    setTimeout(() => {
      console.log('Triggering download...');
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('Download triggered and cleanup completed');
    }, 100);
  } catch (error) {
    console.error('Error in downloadData:', error);
    
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
  
  // Set up tab switching for reports
  const reportsTabs = reportsWindow.querySelectorAll('.tab-button');
  reportsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      setReportsActiveTab(tabName);
    });
  });
}

/**
 * Close the reports window
 */
function closeReports() {
  reportsWindow.classList.remove('visible');
  detailOverlay.classList.remove('visible');
}

/**
 * Set the active tab in the reports window
 * @param {string} tabName - The tab to activate
 */
function setReportsActiveTab(tabName) {
  // Update tab buttons
  const tabButtons = reportsWindow.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    if (button.dataset.tab === tabName) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Update tab panes
  const tabPanes = reportsWindow.querySelectorAll('.tab-pane');
  tabPanes.forEach(pane => {
    if (pane.id === `${tabName}-tab`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
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
    summaryContent.innerHTML = '<div class="empty-state">No tracking data available</div>';
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
    timelineContent.innerHTML = '<div class="empty-state">No tracking data available</div>';
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
    privacyContent.innerHTML = '<div class="empty-state">No tracking data available</div>';
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
  let html = `
    <div class="report-section">
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

// Event listeners
document.addEventListener('DOMContentLoaded', initPopup); 