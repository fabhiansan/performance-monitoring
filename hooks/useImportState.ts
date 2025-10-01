/**
 * Global import state management using Zustand
 * Prevents session switching and other disruptive actions during data import
 */

import { create } from 'zustand';

interface ImportState {
  isImporting: boolean;
  // eslint-disable-next-line no-unused-vars
  setIsImporting: (importing: boolean) => void;
}

export const useImportState = create<ImportState>((set) => ({
  isImporting: false,
  setIsImporting: (importing) => set({ isImporting: importing }),
}));
