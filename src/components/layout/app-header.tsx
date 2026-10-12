"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, PanelLeft, Plus, Search, Sun } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { SaveStatusBadge } from "@/components/layout/save-status-badge";
import { useDeskData } from "@/features/minddesk/store";
import {
  pathnameToWorkspaceView,
  workspaceTitles,
} from "@/features/minddesk/workspace-types";

export function AppHeader() {
  const pathname = usePathname() || "/dashboard";
  const { data, update } = useDeskData();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const setCommandPaletteOpen = useUIStore(
    (state) => state.setCommandPaletteOpen
  );
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen);

  const view = pathnameToWorkspaceView(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[64px] shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-7">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex shrink-0"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar (Ctrl + \)"
        data-testid="toggle-sidebar-button"
      >
        <PanelLeft />
      </Button>

      <div className="min-w-0 flex-1 flex items-center gap-3">
        <h2 className="truncate text-sm font-semibold">
          {workspaceTitles[view]}
        </h2>
        <SaveStatusBadge />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="hidden min-w-0 justify-start gap-2 text-muted-foreground sm:flex sm:w-56"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search className="size-4" />
        <span className="min-w-0 flex-1 truncate text-left">
          Search anything…
        </span>
        <span className="rounded border border-border px-1 text-[10px]">
          ⌘ K
        </span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="Search"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle light or dark theme"
        title="Toggle appearance"
        onClick={() =>
          update((current) => ({
            ...current,
            theme: current.theme === "dark" ? "light" : "dark",
          }))
        }
      >
        {data.theme === "dark" ? <Sun /> : <Moon />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Quick capture"
        title="Quick capture"
        onClick={() => setQuickCaptureOpen(true)}
      >
        <Plus />
      </Button>
    </header>
  );
}
