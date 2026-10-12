"use client";

import * as React from "react";
import { useUIStore } from "@/stores/ui-store";

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette);
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen);
  const setCommandPaletteOpen = useUIStore(
    (state) => state.setCommandPaletteOpen
  );

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;

      // Cmd/Ctrl + \ -> Toggle Sidebar
      if (isMod && event.key === "\\") {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      // Cmd/Ctrl + K -> Toggle Command Palette
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Cmd/Ctrl + J -> Open Quick Capture (Lovable shortcut)
      if (isMod && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setQuickCaptureOpen(true);
        return;
      }

      // Alt + C -> Open Quick Capture (when not inside a text field)
      if (
        event.altKey &&
        !isMod &&
        event.key.toLowerCase() === "c" &&
        !isEditableElement(event.target)
      ) {
        event.preventDefault();
        setQuickCaptureOpen(true);
        return;
      }

      // Escape -> Close active overlays
      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
        setQuickCaptureOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    toggleSidebar,
    toggleCommandPalette,
    setQuickCaptureOpen,
    setCommandPaletteOpen,
  ]);

  return <>{children}</>;
}
