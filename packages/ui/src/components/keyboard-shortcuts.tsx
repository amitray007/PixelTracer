import * as React from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { cn } from "../utils"
import { Keyboard, X } from "lucide-react"

export interface KeyboardShortcutsProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
  shortcuts?: Record<string, string>
}

const KeyboardShortcuts = React.forwardRef<HTMLDivElement, KeyboardShortcutsProps>(
  ({ className, onClose, shortcuts, ...props }, ref) => {
    const defaultShortcuts = React.useMemo(() => ({
      'ArrowUp': 'Navigate up in list',
      'ArrowDown': 'Navigate down in list', 
      'Enter': 'Select/Open event',
      'Escape': 'Close dialog or clear selection',
      'Space': 'Toggle tracking on/off',
      '/': 'Focus search input',
      'Ctrl+C': 'Copy selected event',
      'Ctrl+E': 'Export events',
      'Ctrl+Shift+C': 'Clear all events',
      'Ctrl+F': 'Focus search',
      '?': 'Show this help dialog'
    }), []);

    const displayShortcuts = shortcuts || defaultShortcuts;

    const parseShortcut = React.useCallback((shortcut: string) => {
      const parts = shortcut.split('+').map(part => part.trim());
      return parts.map((part, index) => {
        const isModifier = ['Ctrl', 'Shift', 'Alt', 'Meta', 'Cmd'].includes(part);
        const isSpecial = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Space'].includes(part);
        
        let displayText = part;
        
        // Replace with prettier names
        if (part === 'ArrowUp') displayText = '↑';
        if (part === 'ArrowDown') displayText = '↓';
        if (part === 'Enter') displayText = '⏎';
        if (part === 'Escape') displayText = 'Esc';
        if (part === 'Space') displayText = 'Space';
        if (part === 'Ctrl') displayText = '⌃';
        if (part === 'Shift') displayText = '⇧';
        if (part === 'Alt') displayText = '⌥';
        if (part === 'Meta' || part === 'Cmd') displayText = '⌘';

        return (
          <React.Fragment key={index}>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-mono px-2 py-1",
                isModifier && "bg-muted",
                isSpecial && "bg-primary/10"
              )}
            >
              {displayText}
            </Badge>
            {index < parts.length - 1 && (
              <span className="mx-1 text-muted-foreground">+</span>
            )}
          </React.Fragment>
        );
      });
    }, []);

    const shortcutGroups = React.useMemo(() => {
      const groups = {
        'Navigation': ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'],
        'Actions': ['Space', 'Ctrl+C', 'Ctrl+E', 'Ctrl+Shift+C'],
        'Search': ['/', 'Ctrl+F'],
        'Help': ['?']
      };

      return Object.entries(groups).map(([groupName, shortcuts]) => ({
        name: groupName,
        shortcuts: shortcuts.filter(shortcut => shortcut in displayShortcuts)
          .map(shortcut => ({
            key: shortcut,
            description: displayShortcuts[shortcut as keyof typeof displayShortcuts] || ''
          }))
      })).filter(group => group.shortcuts.length > 0);
    }, [displayShortcuts]);

    return (
      <Card ref={ref} className={cn("w-full max-w-lg", className)} {...props}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Use these shortcuts to navigate PixelTracer efficiently
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.name} className="space-y-3">
              <div className="text-sm font-medium text-primary">
                {group.name}
              </div>
              <div className="space-y-2">
                {group.shortcuts.map(({ key, description }) => (
                  <div 
                    key={key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {parseShortcut(key)}
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      {description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Platform-specific note */}
          <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
            <div className="font-medium mb-1">Platform Notes:</div>
            <div>• On Mac, use ⌘ (Cmd) instead of ⌃ (Ctrl)</div>
            <div>• Some shortcuts may conflict with browser shortcuts</div>
            <div>• Press Shift+? anywhere to show this dialog</div>
          </div>

          {/* Close button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={onClose} 
              className="w-full"
              variant="outline"
            >
              Got it!
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

KeyboardShortcuts.displayName = "KeyboardShortcuts";

export { KeyboardShortcuts }