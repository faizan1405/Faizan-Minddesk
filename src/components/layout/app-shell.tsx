"use client";

import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { QuickCaptureModal } from "@/components/layout/quick-capture-modal";
import { ShortcutProvider } from "@/components/layout/shortcut-provider";
import { MindDeskProvider, useDeskData } from "@/features/minddesk/store";
import { SyncMigrationBanner } from "@/features/minddesk/components/sync-migration-banner";
import { MindDeskContentSkeleton } from "@/components/layout/minddesk-skeleton";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { HabitsProvider } from "@/features/habits/context/habits-context";
import { NotificationProvider } from "@/features/notifications/context/notification-context";
import { NotificationToastOverlay } from "@/features/notifications/components/notification-toast-overlay";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { AuthUserSummary } from "@/types/domain";

function ShellContent({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: AuthUserSummary | null;
}) {
  const { isLoading, loadError, retryInitialLoad, data } = useDeskData();

  if (isLoading && user?.id) {
    return <MindDeskContentSkeleton />;
  }

  if (loadError && user?.id && data.tasks.length === 0 && data.notes.length === 0) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center p-6 text-center">
        <div className="size-12 rounded-2xl bg-destructive/10 text-destructive grid place-items-center mb-4">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Unable to load workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          {loadError}. Your existing productivity records are safely preserved in MySQL.
        </p>
        <Button
          onClick={retryInitialLoad}
          className="mt-6 gap-2"
          variant="outline"
        >
          <RotateCcw className="size-4" /> Retry Connection
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

export interface AppShellProps {
  children: React.ReactNode;
  user?: AuthUserSummary | null;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <MindDeskProvider user={user}>
      <CalendarProvider>
        <HabitsProvider>
          <NotificationProvider>
            <ShortcutProvider>
              <div className="minddesk-shell flex min-h-screen w-full bg-background text-foreground">
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium focus:text-primary-foreground"
                >
                  Skip to main content
                </a>

                <AppSidebar user={user} />

                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                  <AppHeader />
                  <SyncMigrationBanner user={user} />
                  <main
                    id="main-content"
                    className="minddesk-scrollbar flex-1 overflow-y-auto pb-16 md:pb-0"
                  >
                    <ShellContent user={user}>{children}</ShellContent>
                  </main>
                </div>

                <CommandPalette />
                <QuickCaptureModal />
                <NotificationToastOverlay />
              </div>
            </ShortcutProvider>
          </NotificationProvider>
        </HabitsProvider>
      </CalendarProvider>
    </MindDeskProvider>
  );
}
