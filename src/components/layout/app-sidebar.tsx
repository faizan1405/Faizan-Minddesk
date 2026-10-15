"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck2,
  CalendarDays,
  Clock,
  FileText,
  Flame,
  Focus,
  LayoutGrid,
  ListTodo,
  Map,
  Plus,
  Settings2,
  Star,
  X,
} from "lucide-react";
import { UserMenu } from "@/features/auth/components/user-menu";
import { Button } from "@/components/ui/button";
import { useDeskData } from "@/features/minddesk/store";
import { useUIStore } from "@/stores/ui-store";
import type { AuthUserSummary } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface NavItemConfig {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  {
    id: "tasks",
    title: "My tasks",
    href: "/tasks",
    icon: ListTodo,
  },
  {
    id: "calendar",
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    id: "plan-your-day",
    title: "Plan your day",
    href: "/plan-your-day",
    icon: CalendarCheck2,
  },
  {
    id: "habits",
    title: "Habits",
    href: "/habits",
    icon: Flame,
  },
  {
    id: "notes",
    title: "Notes",
    href: "/notes",
    icon: FileText,
  },
  {
    id: "maps",
    title: "Mind maps",
    href: "/mind-maps",
    icon: Map,
  },
  {
    id: "projects",
    title: "Projects",
    href: "/projects",
    icon: LayoutGrid,
  },
];

export const MOBILE_NAV_ITEMS: NavItemConfig[] = [
  {
    id: "tasks",
    title: "Tasks",
    href: "/tasks",
    icon: ListTodo,
  },
  {
    id: "calendar",
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    id: "habits",
    title: "Habits",
    href: "/habits",
    icon: Flame,
  },
  {
    id: "notes",
    title: "Notes",
    href: "/notes",
    icon: FileText,
  },
  {
    id: "maps",
    title: "Maps",
    href: "/mind-maps",
    icon: Map,
  },
];

export const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
  {
    id: "favorites",
    title: "Favorites",
    href: "/favorites",
    icon: Star,
  },
  {
    id: "recent",
    title: "Recent",
    href: "/recent",
    icon: Clock,
  },
  {
    id: "settings",
    title: "Settings",
    href: "/settings",
    icon: Settings2,
  },
];

export interface AppSidebarProps {
  user?: AuthUserSummary | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, setSelectedItem } = useDeskData();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen);

  function isActiveRoute(href: string): boolean {
    if (!pathname) return false;
    if (href === "/mind-maps" && pathname.startsWith("/maps")) return true;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const openTaskCount = data.tasks.filter((task) => !task.complete).length;

  const sidebarContent = (
    <div className="flex h-full w-[264px] flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border px-5">
        <Link
          href="/tasks"
          className="flex min-w-0 flex-1 items-center gap-3"
          onClick={() => setMobileNavOpen(false)}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Focus className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tracking-tight">Mind Desk</span>
            <span className="text-[11px] text-muted-foreground">A little more in focus</span>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        >
          <X />
        </Button>
      </div>

      <div className="px-4 pt-5">
        <Button
          className="w-full justify-start"
          onClick={() => {
            setMobileNavOpen(false);
            setQuickCaptureOpen(true);
          }}
        >
          <Plus /> Quick capture <span className="ml-auto text-xs opacity-75">⌘ J</span>
        </Button>
      </div>

      <nav
        aria-label="Main navigation"
        className="minddesk-scrollbar flex-1 overflow-y-auto px-3 pt-6"
      >
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <div className="space-y-1">
          {PRIMARY_NAV_ITEMS.map(({ id, title, href, icon: Icon }) => {
            const active = isActiveRoute(href);
            return (
              <React.Fragment key={id}>
                <Link
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">{title}</span>
                {id === "tasks" && (
                  <span className="text-xs text-muted-foreground">{openTaskCount}</span>
                )}
              </Link>
              {id === "tasks" && active && (
                <div className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-2.5 py-1">
                  <Link
                    href="/tasks"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex h-7 items-center justify-between rounded px-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                  >
                    <span>All lists</span>
                    <span className="text-[10px] text-muted-foreground">{openTaskCount}</span>
                  </Link>
                  <Link
                    href="/tasks?filter=Starred"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex h-7 items-center justify-between rounded px-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                  >
                    <span className="flex items-center gap-1.5">
                      <Star className="size-3 text-amber-500 fill-amber-500" /> Starred
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {data.tasks.filter((t) => t.starred && !t.complete).length}
                    </span>
                  </Link>
                  {(data.taskLists && data.taskLists.length > 0) && (
                    <div className="pt-1.5 pb-0.5 px-2 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      Lists
                    </div>
                  )}
                  {(data.taskLists || []).map((list) => {
                    const count = data.tasks.filter(
                      (t) => t.listId === list.id && !t.complete
                    ).length;
                    return (
                      <Link
                        key={list.id}
                        href={`/tasks?list=${list.id}`}
                        onClick={() => setMobileNavOpen(false)}
                        className="flex h-7 items-center justify-between rounded px-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                      >
                        <span className="truncate">{list.title}</span>
                        <span className="text-[10px] text-muted-foreground">{count}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
        </div>

        <p className="mt-8 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your space
        </p>
        <div className="space-y-1">
          {SECONDARY_NAV_ITEMS.map(({ id, title, href, icon: Icon }) => {
            const active = isActiveRoute(href);
            return (
              <Link
                key={id}
                href={href}
                onClick={() => setMobileNavOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{title}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between px-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Create project"
            onClick={() => {
              setMobileNavOpen(false);
              router.push("/projects");
            }}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
        <div className="space-y-1 pb-4">
          {data.projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                setSelectedItem(project.id);
                setMobileNavOpen(false);
                router.push("/projects");
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  project.hue === "mint"
                    ? "bg-sage-ink"
                    : project.hue === "amber"
                      ? "bg-coral-ink"
                      : project.hue === "blue"
                        ? "bg-sky-ink"
                        : "bg-primary"
                )}
              />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <UserMenu user={user} onNavigate={() => setMobileNavOpen(false)} />
      </div>
    </div>
  );

  return (
    <>
      {isMobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-foreground/25 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Desktop Collapsible Sidebar */}
      <aside
        aria-label="Desktop Sidebar"
        data-testid="desktop-sidebar"
        data-state={isSidebarOpen ? "open" : "collapsed"}
        className={cn(
          "hidden md:sticky md:top-0 md:flex md:h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 overflow-hidden",
          isSidebarOpen ? "w-[264px]" : "w-0 border-r-0"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {isMobileNavOpen && (
        <aside
          aria-label="Mobile Sidebar"
          className="fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:hidden"
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden"
      >
        {MOBILE_NAV_ITEMS.map(({ id, title, href, icon: Icon }) => {
          const active = isActiveRoute(href);
          return (
            <Link
              key={id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate">{title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
