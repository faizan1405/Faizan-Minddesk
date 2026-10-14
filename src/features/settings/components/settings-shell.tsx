"use client";

import * as React from "react";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Database,
  Moon,
  Palette,
  Shield,
  Sun,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTabId = "profile" | "appearance" | "productivity" | "security" | "sync";

export interface SettingsTabItem {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Personal identity and avatar",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme, layout, and contrast",
  },
  {
    id: "productivity",
    label: "Productivity",
    icon: CalendarCheck,
    description: "Calendar, tasks, and notifications",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Sessions and authentication",
  },
  {
    id: "sync",
    label: "Cloud Sync",
    icon: Database,
    description: "MySQL sync and data ownership",
  },
];

interface SettingsShellProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
  children: React.ReactNode;
  successMessage?: string | null;
  errorMessage?: string | null;
  onClearFeedback?: () => void;
  currentTheme?: "light" | "dark" | "system";
  onQuickThemeToggle?: () => void;
}

export function SettingsShell({
  activeTab,
  onTabChange,
  children,
  successMessage,
  errorMessage,
  onClearFeedback,
  currentTheme = "light",
  onQuickThemeToggle,
}: SettingsShellProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-8 sm:pt-9">
      {/* Page Header */}
      <header className="mb-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Palette className="size-3.5" /> Workspace Preferences
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Manage your account profile, visual themes, calendar scheduling, and cloud synchronization.
            </p>
          </div>
          {onQuickThemeToggle && (
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={onQuickThemeToggle}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs"
                aria-label={currentTheme === "dark" ? "Light theme" : "Dark theme"}
              >
                {currentTheme === "dark" ? (
                  <Sun className="size-3.5 text-amber-500" />
                ) : (
                  <Moon className="size-3.5 text-indigo-500" />
                )}
                <span>{currentTheme === "dark" ? "Light" : "Dark"}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Feedback Alerts */}
      {successMessage && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          {onClearFeedback && (
            <button
              type="button"
              onClick={onClearFeedback}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 p-1"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onClearFeedback && (
            <button
              type="button"
              onClick={onClearFeedback}
              className="text-destructive hover:opacity-80 p-1"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Responsive Layout with Nav Tabs and Content Panel */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-8 items-start">
        {/* Navigation Tabs (Horizontal on mobile, vertical sidebar on desktop) */}
        <nav
          aria-label="Settings sections"
          className="flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none border-b md:border-b-0 md:border-r border-border md:pr-4"
        >
          {SETTINGS_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content Panel */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </section>
  );
}
