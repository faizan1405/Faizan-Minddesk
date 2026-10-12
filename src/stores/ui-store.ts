import { create } from "zustand";
import type { SaveStatus } from "@/types/domain";

const SIDEBAR_STORAGE_KEY = "minddesk:sidebar-open";

function getInitialSidebarState(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  } catch {
    return true;
  }
}

function persistSidebarState(isOpen: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
  } catch {
    // Ignore storage write errors in restricted environments
  }
}

export interface UIState {
  isSidebarOpen: boolean;
  isMobileNavOpen: boolean;
  isCommandPaletteOpen: boolean;
  isQuickCaptureOpen: boolean;
  saveStatus: SaveStatus;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickCaptureOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: getInitialSidebarState(),
  isMobileNavOpen: false,
  isCommandPaletteOpen: false,
  isQuickCaptureOpen: false,
  saveStatus: "idle",

  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarOpen;
      persistSidebarState(next);
      return { isSidebarOpen: next };
    }),

  setSidebarOpen: (open) =>
    set(() => {
      persistSidebarState(open);
      return { isSidebarOpen: open };
    }),

  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),

  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  setQuickCaptureOpen: (open) => set({ isQuickCaptureOpen: open }),

  setSaveStatus: (status) => set({ saveStatus: status }),
}));
