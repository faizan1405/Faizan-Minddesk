"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft, Plus, Search } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { SaveStatusBadge } from "@/components/layout/save-status-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Daily focus across tasks, notes, and mind maps",
  },
  "/tasks": {
    title: "Tasks",
    subtitle: "Fast, structured to-do lists & recurring schedules",
  },
  "/notes": {
    title: "Notes",
    subtitle: "Rich-text documents & connected knowledge",
  },
  "/mind-maps": {
    title: "Mind Maps",
    subtitle: "Visual idea mapping & linked concept graphs",
  },
  "/projects": {
    title: "Projects",
    subtitle: "Cross-domain organization for tasks, notes, and maps",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Appearance, keyboard shortcuts, and data export",
  },
};

export function AppHeader() {
  const pathname = usePathname() || "/dashboard";
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const setCommandPaletteOpen = useUIStore(
    (state) => state.setCommandPaletteOpen
  );
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen);

  const matchedKey =
    Object.keys(ROUTE_TITLES).find(
      (key) => pathname === key || pathname.startsWith(`${key}/`)
    ) || "/dashboard";
  const currentMeta = ROUTE_TITLES[matchedKey];

  return (
    <header className="sticky top-0 z-20 flex h-13 shrink-0 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        {/* Mobile Drawer Trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Desktop Sidebar Collapse Trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar (Ctrl + \)"
          data-testid="toggle-sidebar-button"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* Breadcrumb / Route Heading */}
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-sm font-semibold text-foreground">
            {currentMeta.title}
          </h1>
          <span className="hidden text-xs text-foreground-muted md:inline">
            {currentMeta.subtitle}
          </span>
        </div>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-2">
        <SaveStatusBadge />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Open search and command palette"
          title="Search & Commands (Ctrl + K)"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setQuickCaptureOpen(true)}
          className="hidden sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Capture</span>
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
}
