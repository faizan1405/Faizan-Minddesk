"use client";

import * as React from "react";
import { Check, Laptop, Moon, Sun, Sliders, Eye } from "lucide-react";
import type { AppearanceSettings } from "@/features/settings/types";
import { cn } from "@/lib/utils";

interface AppearanceSectionProps {
  appearance: AppearanceSettings;
  onUpdate: (appearance: Partial<AppearanceSettings>) => Promise<boolean>;
  isSaving: boolean;
}

export function AppearanceSection({
  appearance,
  onUpdate,
  isSaving,
}: AppearanceSectionProps) {
  const currentTheme = appearance.theme || "light";

  const handleSelectTheme = (theme: "light" | "dark" | "system") => {
    if (theme === currentTheme) return;
    onUpdate({ theme });
  };

  const handleToggleCompact = () => {
    onUpdate({ compactMode: !appearance.compactMode });
  };

  const handleToggleReducedMotion = () => {
    onUpdate({ reducedMotion: !appearance.reducedMotion });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Appearance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Customize color themes, layout density, and animations for your workspace.
        </p>
      </div>

      {/* Theme Cards */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-foreground block">Workspace Theme</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => handleSelectTheme("light")}
            disabled={isSaving}
            className={cn(
              "group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all cursor-pointer",
              currentTheme === "light"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="grid size-9 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sun className="size-4" />
              </div>
              {currentTheme === "light" && (
                <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground text-xs shadow-xs">
                  <Check className="size-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div className="mt-3.5">
              <span className="text-sm font-semibold text-foreground block">Light Theme</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Crisp contrast and airy daylight tone designed for daytime focus.
              </span>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => handleSelectTheme("dark")}
            disabled={isSaving}
            className={cn(
              "group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all cursor-pointer",
              currentTheme === "dark"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="grid size-9 place-items-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500">
                <Moon className="size-4" />
              </div>
              {currentTheme === "dark" && (
                <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground text-xs shadow-xs">
                  <Check className="size-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div className="mt-3.5">
              <span className="text-sm font-semibold text-foreground block">Dark Theme</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Deep obsidian and slate backgrounds that reduce eye strain at night.
              </span>
            </div>
          </button>

          {/* System Theme */}
          <button
            type="button"
            onClick={() => handleSelectTheme("system")}
            disabled={isSaving}
            className={cn(
              "group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all cursor-pointer",
              currentTheme === "system"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="grid size-9 place-items-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Laptop className="size-4" />
              </div>
              {currentTheme === "system" && (
                <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground text-xs shadow-xs">
                  <Check className="size-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div className="mt-3.5">
              <span className="text-sm font-semibold text-foreground block">System Match</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Automatically synchronize with your operating system light/dark mode.
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Layout & Accessibility Preferences */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-xs">
        <div className="flex items-center justify-between p-5">
          <div className="space-y-0.5 pr-4">
            <div className="flex items-center gap-2">
              <Sliders className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Compact Interface</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Reduce row padding and vertical spacing in task lists and calendar views for high-density screens.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={appearance.compactMode}
            onClick={handleToggleCompact}
            disabled={isSaving}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              appearance.compactMode ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                appearance.compactMode ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-5">
          <div className="space-y-0.5 pr-4">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Reduced Motion</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimize layout animations, drawer transitions, and pulse effects for users sensitive to motion.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={appearance.reducedMotion}
            onClick={handleToggleReducedMotion}
            disabled={isSaving}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              appearance.reducedMotion ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                appearance.reducedMotion ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
