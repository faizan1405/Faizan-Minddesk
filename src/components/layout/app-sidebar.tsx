"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Network,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { UserMenu } from "@/features/auth/components/user-menu";
import { useUIStore } from "@/stores/ui-store";
import { Kbd } from "@/components/ui/kbd";
import type { AuthUserSummary } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface NavItemConfig {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass?: string;
}

export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    accentClass: "text-domain-task",
  },
  {
    title: "Notes",
    href: "/notes",
    icon: FileText,
    accentClass: "text-domain-note",
  },
  {
    title: "Mind Maps",
    href: "/mind-maps",
    icon: Network,
    accentClass: "text-domain-map",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const STARTER_PROJECTS = [
  { id: "proj-product", name: "Product Strategy", color: "bg-domain-map" },
  { id: "proj-research", name: "Knowledge Base", color: "bg-domain-note" },
  { id: "proj-sprint", name: "Q4 Deliverables", color: "bg-domain-task" },
];

export interface AppSidebarProps {
  user?: AuthUserSummary | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const setCommandPaletteOpen = useUIStore(
    (state) => state.setCommandPaletteOpen
  );
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen);

  function isActiveRoute(href: string): boolean {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-surface-muted/70 text-foreground select-none">
      <div className="space-y-4 overflow-y-auto p-3">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 py-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
            onClick={() => setMobileNavOpen(false)}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">MindDesk</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close mobile navigation"
            className="rounded-md p-1 text-foreground-muted hover:bg-surface hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Search Trigger */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              setCommandPaletteOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground-muted shadow-2xs transition-colors hover:border-foreground-muted/40 hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Search & Commands
            </span>
            <Kbd keys={["Ctrl", "K"]} />
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              setQuickCaptureOpen(true);
            }}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              Quick Capture
            </span>
            <Kbd keys={["Alt", "C"]} />
          </button>
        </div>

        {/* Main Workspace Navigation */}
        <nav aria-label="Primary Workspace Navigation" className="space-y-0.5">
          <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-foreground-muted uppercase">
            Workspace
          </div>
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface text-foreground shadow-2xs border border-border/80"
                    : "text-foreground-muted hover:bg-surface/60 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active
                      ? item.accentClass || "text-primary"
                      : item.accentClass || "text-foreground-muted"
                  )}
                />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Projects Section */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] font-semibold tracking-wider text-foreground-muted uppercase">
              Projects
            </span>
            <Link
              href="/projects"
              onClick={() => setMobileNavOpen(false)}
              className="text-xs text-foreground-muted hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <div className="space-y-0.5">
            {STARTER_PROJECTS.map((project) => (
              <Link
                key={project.id}
                href={`/projects`}
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface/60 hover:text-foreground"
              >
                <span
                  className={cn("h-2 w-2 rounded-full shrink-0", project.color)}
                />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer User Profile Dropdown & Keyboard Hint */}
      <div className="space-y-2.5 border-t border-border p-3">
        <UserMenu user={user} onNavigate={() => setMobileNavOpen(false)} />

        <div className="flex items-center justify-between px-1 text-xs text-foreground-muted">
          <span>Toggle Sidebar</span>
          <Kbd keys={["Ctrl", "\\"]} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        aria-label="Desktop Sidebar"
        data-testid="desktop-sidebar"
        data-state={isSidebarOpen ? "open" : "collapsed"}
        className={cn(
          "hidden lg:block shrink-0 border-r border-border transition-[width] duration-150 ease-out overflow-hidden",
          isSidebarOpen ? "w-60" : "w-0 border-r-0"
        )}
      >
        <div className="h-full w-60">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-50 h-full w-64 border-r border-border bg-surface shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-surface/95 px-2 backdrop-blur-md lg:hidden"
      >
        {PRIMARY_NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
