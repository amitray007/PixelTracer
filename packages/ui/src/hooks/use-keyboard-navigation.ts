import { useEffect, useCallback, useState } from 'react';

export interface KeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onCopy?: () => void;
  onExport?: () => void;
  onClear?: () => void;
  onToggleTracking?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
}

export interface KeyboardShortcutMap {
  'ArrowUp': 'Navigate up';
  'ArrowDown': 'Navigate down';
  'Enter': 'Select/Open';
  'Escape': 'Close/Cancel';
  'ctrl+c': 'Copy selection';
  'ctrl+e': 'Export events';
  'ctrl+shift+c': 'Clear events';
  'space': 'Toggle tracking';
  'ctrl+f': 'Search events';
  '/': 'Focus search';
}

/**
 * Keyboard navigation hook for PixelTracer accessibility
 * Provides comprehensive keyboard shortcuts for power users
 */
export function useKeyboardNavigation({
  onArrowUp,
  onArrowDown,
  onEnter,
  onEscape,
  onCopy,
  onExport,
  onClear,
  onToggleTracking,
  onSearch,
  enabled = true
}: KeyboardNavigationOptions) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't interfere with input fields
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      // Only allow specific shortcuts in input fields
      if (event.key === 'Escape') {
        (event.target as HTMLElement).blur();
        onEscape?.();
        event.preventDefault();
      }
      return;
    }

    const { key, ctrlKey, shiftKey, metaKey } = event;
    const isModKey = ctrlKey || metaKey; // Support both Ctrl (Windows) and Cmd (Mac)

    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        onArrowUp?.();
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        onArrowDown?.();
        break;
        
      case 'Enter':
        event.preventDefault();
        onEnter?.();
        break;
        
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
        
      case ' ':
        // Space to toggle tracking
        event.preventDefault();
        onToggleTracking?.();
        break;
        
      case '/':
        // Focus search
        event.preventDefault();
        onSearch?.();
        break;
        
      case 'c':
        if (isModKey && !shiftKey) {
          // Ctrl+C to copy
          event.preventDefault();
          onCopy?.();
        } else if (isModKey && shiftKey) {
          // Ctrl+Shift+C to clear
          event.preventDefault();
          onClear?.();
        }
        break;
        
      case 'e':
        if (isModKey) {
          // Ctrl+E to export
          event.preventDefault();
          onExport?.();
        }
        break;
        
      case 'f':
        if (isModKey) {
          // Ctrl+F to search
          event.preventDefault();
          onSearch?.();
        }
        break;
        
      case '?':
        if (shiftKey) {
          // Show keyboard shortcuts help
          event.preventDefault();
          setShowShortcuts(prev => !prev);
        }
        break;
    }
  }, [
    enabled,
    onArrowUp,
    onArrowDown,
    onEnter,
    onEscape,
    onCopy,
    onExport,
    onClear,
    onToggleTracking,
    onSearch
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const getShortcutDescription = useCallback((): KeyboardShortcutMap => ({
    'ArrowUp': 'Navigate up',
    'ArrowDown': 'Navigate down',
    'Enter': 'Select/Open',
    'Escape': 'Close/Cancel',
    'ctrl+c': 'Copy selection',
    'ctrl+e': 'Export events',
    'ctrl+shift+c': 'Clear events',
    'space': 'Toggle tracking',
    'ctrl+f': 'Search events',
    '/': 'Focus search'
  }), []);

  return {
    showShortcuts,
    setShowShortcuts,
    shortcuts: getShortcutDescription(),
    isEnabled: enabled
  };
}