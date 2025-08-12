/**
 * PixelTracer Sidepanel App
 * 
 * Advanced real-time dashboard integrating all backend capabilities:
 * - Live event tracking with comprehensive analytics
 * - Provider performance monitoring 
 * - Revenue analytics and business insights
 * - Advanced filtering and search functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { TrackingEvent } from '@pixeltracer/shared';
import { RealTimeDashboard } from '@pixeltracer/ui';

interface AppState {
  events: TrackingEvent[];
  isTracking: boolean;
  currentTab?: chrome.tabs.Tab;
  selectedEvent?: TrackingEvent;
}

export function SidepanelApp() {
  const [state, setState] = useState<AppState>({
    events: [],
    isTracking: false
  });
  const [currentTabId, setCurrentTabId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | undefined>();
  const [hasStartedTracking, setHasStartedTracking] = useState<boolean>(false);

  // Function to load events for a specific tab
  const loadTabData = useCallback((tab: chrome.tabs.Tab, startTracking: boolean = false) => {
    
    if (tab.id) {
      setCurrentTabId(tab.id);
      setActiveTab(tab);
      
      // Clear previous events and update current tab
      setState(prev => ({ 
        ...prev, 
        currentTab: tab,
        events: [],
        selectedEvent: undefined 
      }));
      
      if (startTracking) {
        // Start tracking for this tab
        chrome.runtime.sendMessage({
          type: 'START_TRACKING',
          tabId: tab.id
        });
        
        setState(prev => ({ ...prev, isTracking: true }));
      }
      
      // Get existing events for this tab
      chrome.runtime.sendMessage({
        type: 'GET_EVENTS',
        tabId: tab.id
      }, (response) => {
        if (response && response.events) {
          setState(prev => ({ 
            ...prev, 
            events: response.events 
          }));
          // If there are existing events, this tab has been tracked before
          if (response.events.length > 0) {
            setHasStartedTracking(true);
          }
        }
      });
      
      // Get tracking state for this tab
      chrome.runtime.sendMessage({
        type: 'GET_TRACKING_STATE',
        tabId: tab.id
      }, (response) => {
        if (response) {
          setState(prev => ({ 
            ...prev, 
            isTracking: response.isTracking 
          }));
          // If this tab has tracking state, it means it has been tracked before
          if (response.isTracking) {
            setHasStartedTracking(true);
          }
        }
      });
    }
  }, []);

  // Initialize and follow tab switches
  useEffect(() => {
    // Get initial active tab when side panel opens
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        loadTabData(tabs[0]);
      }
    });

    // Listen for tab switches to load new tab data
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      // Reset tracking state for new tab
      setHasStartedTracking(false);
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab) {
          loadTabData(tab);
        }
      });
    };

    // Listen for URL changes in the current tab
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.url && tabId === currentTabId) {
        loadTabData(tab);
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    // Cleanup on unmount
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [currentTabId, loadTabData]);

  // Listen for new tracking events
  useEffect(() => {
    const handleMessage = (message: any, _sender: any) => {
      // Only add events for the current tab
      if (message.type === 'NEW_TRACKING_EVENT' && message.tabId === currentTabId) {
        setState(prev => ({
          ...prev,
          events: [message.event, ...prev.events].slice(0, 1000)
        }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [currentTabId]);

  const clearEvents = useCallback(() => {
    setState(prev => ({ ...prev, events: [] }));
    if (state.currentTab?.id) {
      chrome.runtime.sendMessage({ 
        type: 'CLEAR_EVENTS',
        tabId: state.currentTab.id 
      });
    }
  }, [state.currentTab?.id]);

  const toggleTracking = useCallback(() => {
    const newTracking = !state.isTracking;
    setState(prev => ({ ...prev, isTracking: newTracking }));
    
    chrome.runtime.sendMessage({
      type: newTracking ? 'START_TRACKING' : 'STOP_TRACKING',
      tabId: state.currentTab?.id
    });
  }, [state.isTracking, state.currentTab?.id]);

  const selectEvent = useCallback((event: TrackingEvent) => {
    setState(prev => ({ ...prev, selectedEvent: event }));
  }, []);

  const handleExportData = useCallback(() => {
    // Export events as JSON
    const dataStr = JSON.stringify(state.events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixeltracer-events-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.events]);

  const handleApplyFilters = useCallback((_filters: any) => {
    // Filters are handled by the RealTimeDashboard component internally
  }, []);

  // Show "Start tracking" UI only for tabs that have never been tracked
  if (!hasStartedTracking && activeTab) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header with tab info */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl shadow-md overflow-hidden">
              <img 
                src={typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getURL('assets/icons/icon48.png') : '/assets/icons/icon48.png'}
                alt="PixelTracer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">PixelTracer</h1>
              <p className="text-xs text-muted-foreground">Not tracking this tab</p>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Start Tracking This Tab</h2>
              <p className="text-sm text-muted-foreground">
                Track marketing pixels, analytics, and advertising requests on this page
              </p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="text-muted-foreground">Current site:</span>
                <span className="font-medium truncate flex-1">
                  {activeTab.url ? new URL(activeTab.url).hostname : 'Unknown'}
                </span>
              </div>
              {state.events.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {state.events.length} events previously tracked
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                if (activeTab && activeTab.id) {
                  // Mark that tracking has started for this tab
                  setHasStartedTracking(true);
                  
                  // Start tracking
                  loadTabData(activeTab, true);
                  
                  // Refresh the page to capture fresh events
                  chrome.tabs.reload(activeTab.id, { bypassCache: true });
                }
              }}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Tracking
            </button>
            
            <p className="text-xs text-muted-foreground">
              Switch tabs to track different sites simultaneously.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RealTimeDashboard
      events={state.events}
      selectedEvent={state.selectedEvent}
      isTracking={state.isTracking}
      currentTab={state.currentTab}
      onEventSelect={selectEvent}
      onToggleTracking={toggleTracking}
      onClearEvents={clearEvents}
      onExportData={handleExportData}
      onApplyFilters={handleApplyFilters}
      className="h-screen"
    />
  );
}