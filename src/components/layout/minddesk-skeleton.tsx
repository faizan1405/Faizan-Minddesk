import * as React from "react";

export function MindDeskSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading workspace..."
      className="minddesk-shell flex min-h-screen w-full bg-background text-foreground animate-pulse"
    >
      {/* Sidebar Skeleton (matching 264px width on desktop) */}
      <aside className="hidden md:flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar p-4 space-y-6">
        <div className="flex items-center gap-3 py-2 border-b border-sidebar-border pb-4">
          <div className="size-9 rounded-xl bg-muted/60" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-24 bg-muted/70 rounded" />
            <div className="h-2.5 w-16 bg-muted/50 rounded" />
          </div>
        </div>

        {/* Quick capture button placeholder */}
        <div className="h-9 w-full bg-muted/60 rounded-lg" />

        {/* Nav items */}
        <div className="space-y-2 pt-2 flex-1">
          <div className="h-2.5 w-16 bg-muted/40 rounded mb-3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 h-9 px-2 rounded-lg bg-muted/30">
              <div className="size-4 rounded bg-muted/60" />
              <div className="h-3 w-28 bg-muted/50 rounded" />
            </div>
          ))}
        </div>

        {/* User pill skeleton */}
        <div className="flex items-center gap-3 pt-3 border-t border-sidebar-border">
          <div className="size-8 rounded-full bg-muted/70" />
          <div className="space-y-1 flex-1">
            <div className="h-3 w-16 bg-muted/60 rounded" />
            <div className="h-2 w-20 bg-muted/40 rounded" />
          </div>
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Header Skeleton */}
        <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-border bg-background/95 px-6">
          <div className="h-4 w-32 bg-muted/70 rounded" />
          <div className="flex items-center gap-3">
            <div className="hidden sm:block h-8 w-48 bg-muted/40 rounded-lg" />
            <div className="size-8 rounded-full bg-muted/50" />
            <div className="size-8 rounded-full bg-muted/50" />
          </div>
        </header>

        {/* Content Body Skeleton */}
        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-2 max-w-xl">
            <div className="h-7 w-48 bg-muted/60 rounded-lg" />
            <div className="h-4 w-72 bg-muted/40 rounded" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-2xl border border-border/60 bg-card/50 p-5 space-y-3"
              >
                <div className="size-8 rounded-xl bg-muted/60" />
                <div className="h-4 w-3/4 bg-muted/60 rounded" />
                <div className="h-3 w-full bg-muted/40 rounded" />
                <div className="h-3 w-2/3 bg-muted/40 rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export function MindDeskContentSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading workspace content..."
      className="p-6 space-y-6 animate-pulse"
    >
      <div className="space-y-2 max-w-xl">
        <div className="h-7 w-48 bg-muted/60 rounded-lg" />
        <div className="h-4 w-72 bg-muted/40 rounded" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-2xl border border-border/60 bg-card/50 p-5 space-y-3"
          >
            <div className="size-8 rounded-xl bg-muted/60" />
            <div className="h-4 w-3/4 bg-muted/60 rounded" />
            <div className="h-3 w-full bg-muted/40 rounded" />
            <div className="h-3 w-2/3 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
