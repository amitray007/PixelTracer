# CLAUDE.md - Chrome Extension

This file provides guidance to Claude Code (claude.ai/code) when working with the Chrome extension application.

## Application Overview

Chrome Extension using Manifest V3, React, and the Chrome Side Panel API for monitoring web tracking requests.

## Extension Architecture

### Manifest Configuration (`manifest.json`)

Key permissions required:
- `tabs`: Access tab information
- `webRequest`: Intercept network requests
- `webRequestBlocking`: Modify requests (for filtering)
- `storage`: Store user preferences
- `sidePanel`: Use side panel API (Chrome 114+)

Host permissions:
- `<all_urls>`: Monitor all websites
- Or specific domains for limited scope

### Service Worker (`background/index.ts`)

**Core Responsibilities**:
1. Network request interception via `chrome.webRequest`
2. Provider matching and event extraction
3. Per-tab event storage management
4. Message routing between UI and backend
5. Health monitoring and recovery

**Key Functions**:
```typescript
// Initialize providers and engine
async function initializeEngine()

// Handle network requests
function handleRequest(details: WebRequestDetails)

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch(message.type) {
    case 'START_TRACKING': // Start tracking for tab
    case 'STOP_TRACKING':  // Stop tracking
    case 'GET_EVENTS':     // Retrieve events
    case 'CLEAR_EVENTS':   // Clear event data
  }
})
```

**Tab Management**:
```typescript
// Per-tab storage
const tabEvents: Map<number, TrackingEvent[]> = new Map()
const trackingState: Map<number, boolean> = new Map()

// Cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabEvents.delete(tabId)
  trackingState.delete(tabId)
})
```

### Side Panel (`sidepanel/`)

**Main UI Components**:
- **SidepanelApp.tsx**: Root component, manages state
- **index.tsx**: Entry point, renders React app
- **index.html**: HTML template

**State Management**:
```typescript
// Track current tab
const [activeTab, setActiveTab] = useState<chrome.tabs.Tab>()

// Tracking state
const [isTracking, setIsTracking] = useState(false)
const [hasStartedTracking, setHasStartedTracking] = useState(false)

// Event data
const [events, setEvents] = useState<TrackingEvent[]>([])
```

**Message Communication**:
```typescript
// Send message to background
chrome.runtime.sendMessage({
  type: 'START_TRACKING',
  tabId: activeTab.id
})

// Receive events
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NEW_TRACKING_EVENT') {
    addEvent(message.event)
  }
})
```

### Popup (`popup/`)

Quick access controls:
- Start/stop tracking toggle
- Open side panel button
- Basic statistics display

## Build Configuration

### Vite Configuration (`vite.config.ts`)

**Multiple Entry Points**:
```typescript
build: {
  rollupOptions: {
    input: {
      background: 'src/background/index.ts',
      sidepanel: 'src/sidepanel/index.html',
      popup: 'src/popup/index.html'
    }
  }
}
```

**Static Asset Copying**:
- Manifest.json → dist/
- Icons → dist/icons/
- CSS → dist/

### Tailwind Configuration

- JIT mode for optimal CSS size
- Custom color scheme via CSS variables
- Dark mode support
- Component-specific styles

## Development Workflow

```bash
# Start development (watch mode)
pnpm --filter chrome-extension dev

# Build for production
pnpm --filter chrome-extension build

# Output in apps/chrome-extension/dist/
```

**Loading in Chrome**:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/chrome-extension/dist`

**Reload After Changes**:
1. Click refresh icon in chrome://extensions
2. Or use Extensions Reloader extension
3. Close and reopen side panel for UI changes

## Chrome API Usage

### Side Panel API
```typescript
// Set panel behavior
chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
})

// Open panel programmatically (requires user gesture)
chrome.sidePanel.open({ tabId })
```

### Web Request API
```typescript
chrome.webRequest.onBeforeRequest.addListener(
  handleRequest,
  { urls: ['<all_urls>'] },
  ['requestBody'] // Access POST data
)
```

### Tab API
```typescript
// Get current tab
const [tab] = await chrome.tabs.query({
  active: true,
  currentWindow: true
})

// Monitor tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Handle tab switch
})
```

## Performance Considerations

1. **Service Worker Lifecycle**: 
   - Terminates after 30s idle
   - Use chrome.alarms for periodic tasks
   - Persist state in chrome.storage

2. **Memory Management**:
   - Limit events per tab (MAX_EVENTS = 1000)
   - Clean up on tab close
   - Use WeakMap where appropriate

3. **Message Passing**:
   - Batch messages when possible
   - Use ports for high-frequency communication
   - Avoid large payloads

## Common Issues

1. **Side Panel Not Opening**:
   - Check Chrome version (needs 114+)
   - Verify sidePanel permission in manifest
   - Must be user-initiated or via action click

2. **Service Worker Stopping**:
   - Normal behavior after 30s
   - Use keepalive techniques if needed
   - Store critical state persistently

3. **Events Not Captured**:
   - Check tracking state for tab
   - Verify provider patterns match
   - Check network request filters

4. **Extension Not Updating**:
   - Manual reload required
   - Clear extension cache
   - Check for manifest errors

## Testing

```bash
# Manual testing checklist
1. Load extension in Chrome
2. Open side panel
3. Navigate to test sites
4. Verify event capture
5. Test filtering
6. Test export
7. Switch tabs
8. Close and reopen panel
```

## Security Considerations

1. **Content Security Policy**: Defined in manifest
2. **Host Permissions**: Minimize scope when possible
3. **Message Validation**: Verify sender and content
4. **Storage**: No sensitive data in chrome.storage
5. **Network Requests**: Only intercept, don't modify