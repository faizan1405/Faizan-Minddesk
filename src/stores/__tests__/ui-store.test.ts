import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "@/stores/ui-store";

describe("T1.1 — UI Store (Sidebar, Overlays & Save Status)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUIStore.setState({
      isSidebarOpen: true,
      isMobileNavOpen: false,
      isCommandPaletteOpen: false,
      isQuickCaptureOpen: false,
      saveStatus: "saved",
    });
  });

  it("toggles isSidebarOpen and persists preference to localStorage", () => {
    expect(useUIStore.getState().isSidebarOpen).toBe(true);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarOpen).toBe(false);
    expect(window.localStorage.getItem("minddesk:sidebar-open")).toBe("false");

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarOpen).toBe(true);
    expect(window.localStorage.getItem("minddesk:sidebar-open")).toBe("true");
  });

  it("toggles Command Palette and Quick Capture modals", () => {
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);

    useUIStore.getState().setCommandPaletteOpen(false);
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);

    useUIStore.getState().setQuickCaptureOpen(true);
    expect(useUIStore.getState().isQuickCaptureOpen).toBe(true);
  });

  it("updates saveStatus accurately across transitions", () => {
    useUIStore.getState().setSaveStatus("saving");
    expect(useUIStore.getState().saveStatus).toBe("saving");

    useUIStore.getState().setSaveStatus("offline");
    expect(useUIStore.getState().saveStatus).toBe("offline");

    useUIStore.getState().setSaveStatus("saved");
    expect(useUIStore.getState().saveStatus).toBe("saved");
  });
});
