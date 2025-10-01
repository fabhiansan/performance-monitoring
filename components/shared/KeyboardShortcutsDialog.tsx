/**
 * Keyboard Shortcuts Dialog
 *
 * Displays available keyboard shortcuts to users
 */

import React from "react";
import { Modal } from "../../design-system/components/Modal/Modal";
import {
  type KeyboardShortcut,
  formatShortcut,
  getShortcutGroups,
} from "../../hooks/useKeyboardShortcuts";

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export const KeyboardShortcutsDialog: React.FC<
  KeyboardShortcutsDialogProps
> = ({ isOpen, onClose, shortcuts }) => {
  const groups = getShortcutGroups(shortcuts);

  const ShortcutGroup: React.FC<{
    title: string;
    shortcuts: KeyboardShortcut[];
  }> = ({ title, shortcuts }) => {
    if (shortcuts.length === 0) return null;

    return (
      <div className="mb-6 last:mb-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
          {title}
        </h3>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <kbd className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 shadow-sm">
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Pintasan Keyboard" size="lg">
      <div className="py-2 max-h-[60vh] overflow-y-auto">
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Tekan{" "}
              <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded text-xs font-mono">
                ?
              </kbd>{" "}
              kapan saja untuk menampilkan bantuan ini
            </span>
          </p>
        </div>

        <ShortcutGroup title="Navigasi" shortcuts={groups.navigation} />
        <ShortcutGroup title="Aksi" shortcuts={groups.actions} />
        <ShortcutGroup title="Tampilan" shortcuts={groups.views} />
        <ShortcutGroup title="Umum" shortcuts={groups.general} />
      </div>
    </Modal>
  );
};
