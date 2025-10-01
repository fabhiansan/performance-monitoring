/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcuts for power users
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) => {
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in an input
    const target = event.target as HTMLElement;
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                        target.isContentEditable;

    if (isInputField) return;

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
      const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.altKey ? event.altKey : !event.altKey;
      const metaMatches = shortcut.metaKey ? event.metaKey : !event.metaKey;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
};

/**
 * Format keyboard shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];

  // Detect OS for proper modifier key display
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  if (shortcut.ctrlKey) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.altKey) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shiftKey) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.metaKey) parts.push('Meta');

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
};

/**
 * Keyboard shortcuts help dialog component
 */
export const getShortcutGroups = (shortcuts: KeyboardShortcut[]) => {
  // Group shortcuts by category (you can extend this)
  return {
    navigation: shortcuts.filter(s => s.description.toLowerCase().includes('navigate') ||
                                      s.description.toLowerCase().includes('go to')),
    actions: shortcuts.filter(s => s.description.toLowerCase().includes('add') ||
                                   s.description.toLowerCase().includes('create') ||
                                   s.description.toLowerCase().includes('export') ||
                                   s.description.toLowerCase().includes('import')),
    views: shortcuts.filter(s => s.description.toLowerCase().includes('view') ||
                                s.description.toLowerCase().includes('show')),
    general: shortcuts.filter(s => !s.description.toLowerCase().match(/navigate|go to|add|create|export|import|view|show/)),
  };
};
