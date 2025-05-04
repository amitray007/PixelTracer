import { trackingProviders } from './trackingProviders.js';

// DOM elements
const totalRequestsElement = document.getElementById('total-requests');
const uniqueProvidersElement = document.getElementById('unique-providers');
const providersContainer = document.getElementById('providers-container');
const requestsContainer = document.getElementById('requests-container');
const clearDataButton = document.getElementById('clear-data');
const exportDataButton = document.getElementById('export-data');

// Get the current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Initialize the popup
async function initPopup() {
  const currentTab = await getCurrentTab();
  loadTrackingData(currentTab.id);
  
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
}

// Load tracking data for the current tab
function loadTrackingData(tabId) {
  chrome.storage.local.get(['trackedRequests'], (result) => {
    const trackedRequests = result.trackedRequests || {};
    const tabRequests = trackedRequests[tabId] || [];
    
    // Update stats
    totalRequestsElement.textContent = tabRequests.length;
    
    // Get unique providers
    const uniqueProviders = new Set();
    tabRequests.forEach(request => {
      request.providers.forEach(provider => uniqueProviders.add(provider));
    });
    
    uniqueProvidersElement.textContent = uniqueProviders.size;
    
    // Render providers
    renderProviders(uniqueProviders);
    
    // Render recent requests
    renderRequests(tabRequests);
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
    providerElement.className = `provider-item category-${provider.category}`;
    
    providerElement.innerHTML = `
      <div class="provider-info">
        <div class="provider-name">${provider.name}</div>
        <div class="provider-description">${provider.description}</div>
      </div>
      <div class="provider-category">${provider.category}</div>
    `;
    
    providersContainer.appendChild(providerElement);
  });
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
  
  // Take only the most recent 10 requests
  const recentRequests = sortedRequests.slice(0, 10);
  
  recentRequests.forEach(request => {
    const requestElement = document.createElement('div');
    requestElement.className = 'request-item';
    
    const time = new Date(request.timestamp);
    const timeString = time.toLocaleTimeString();
    
    const url = new URL(request.url);
    const displayUrl = `${url.hostname}${url.pathname}`;
    
    requestElement.innerHTML = `
      <div class="request-url" title="${request.url}">${displayUrl}</div>
      <div class="provider-badges">
        ${request.providers.map(provider => 
          `<span class="provider-badge">${trackingProviders[provider]?.name || provider}</span>`
        ).join('')}
      </div>
      <div class="request-time">${timeString}</div>
    `;
    
    requestsContainer.appendChild(requestElement);
  });
}

// Clear tracked data for the current tab
async function clearData() {
  const currentTab = await getCurrentTab();
  
  chrome.storage.local.get(['trackedRequests'], (result) => {
    const trackedRequests = result.trackedRequests || {};
    
    // Remove only the current tab's data
    delete trackedRequests[currentTab.id];
    
    chrome.storage.local.set({ trackedRequests }, () => {
      loadTrackingData(currentTab.id);
    });
  });
}

// Export tracking data as JSON
async function exportData() {
  const currentTab = await getCurrentTab();
  
  chrome.storage.local.get(['trackedRequests'], (result) => {
    const trackedRequests = result.trackedRequests || {};
    const tabRequests = trackedRequests[currentTab.id] || [];
    
    const exportData = {
      url: currentTab.url,
      title: currentTab.title,
      timestamp: Date.now(),
      trackedRequests: tabRequests
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixeltracer-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', initPopup);
clearDataButton.addEventListener('click', clearData);
exportDataButton.addEventListener('click', exportData); 