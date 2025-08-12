/**
 * Chrome Extension Popup Component
 * 
 * Simple launcher that opens the sidepanel for analysis
 */

import { useState, useEffect } from 'react';

export function Popup() {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setCurrentTab(tabs[0]);
      }
    });
  }, []);

  const handleOpenSidePanel = () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    window.close(); // Close popup after opening sidepanel
  };

  return (
    <div style={{ width: '300px', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e5e5'
      }}>
        <div style={{ marginRight: '12px' }}>
          <img 
            src={chrome.runtime.getURL('assets/icons/icon48.png')}
            alt="PixelTracer"
            style={{ width: '40px', height: '40px', borderRadius: '8px' }}
          />
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            PixelTracer
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Privacy-focused tracking analysis
          </div>
        </div>
      </div>
      
      {currentTab && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Current Tab:
          </div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
            {new URL(currentTab.url || '').hostname}
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '16px', fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
        Click below to open the analysis panel and start monitoring tracking requests in real-time.
      </div>
      
      <button 
        onClick={handleOpenSidePanel}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#3b82f6';
        }}
      >
        🔍 Open Analysis Panel
      </button>
      
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '16px',
        borderTop: '1px solid #e5e5e5',
        fontSize: '11px', 
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        Track Facebook Pixel, Google Analytics, TikTok Pixel, and more
      </div>
    </div>
  );
}