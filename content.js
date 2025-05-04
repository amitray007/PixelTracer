/**
 * Content script for PixelTracer
 * This script runs in the context of web pages
 */

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
  }
});

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