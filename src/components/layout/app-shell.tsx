"use client";

import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { QuickCaptureModal } from "@/components/layout/quick-capture-modal";
import { ShortcutProvider } from "@/components/layout/shortcut-provider";
import type { AuthUserSummary } from "@/types/domain";

export interface AppShellProps {
  children: React.ReactNode;
  user?: AuthUserSummary | null;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <ShortcutProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium focus:text-primary-foreground"
        >
          Skip to main content
        </a>

        <AppSidebar user={user} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto pb-16 lg:pb-0"
          >
            {children}
          </main>
        </div>

        <CommandPalette />
        <QuickCaptureModal />
      </div>
    </ShortcutProvider>
  );
}
