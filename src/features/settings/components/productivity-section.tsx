"use client";

import * as React from "react";
import {
  Bell,
  Calendar,
  Clock,
  Flag,
  ListTodo,
  Moon,
} from "lucide-react";
import type {
  NotificationSettings,
  ProductivitySettings,
} from "@/features/settings/types";
import { cn } from "@/lib/utils";

interface ProductivitySectionProps {
  productivity: ProductivitySettings;
  notifications: NotificationSettings;
  onUpdateProductivity: (productivity: Partial<ProductivitySettings>) => Promise<boolean>;
  onUpdateNotifications: (notifications: Partial<NotificationSettings>) => Promise<boolean>;
  isSaving: boolean;
}

export function ProductivitySection({
  productivity,
  notifications,
  onUpdateProductivity,
  onUpdateNotifications,
  isSaving,
}: ProductivitySectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Productivity & Planning
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure calendar scheduling defaults, task priorities, and notification windows.
        </p>
      </div>

      {/* Calendar & Planner Defaults Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-xs">
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <Calendar className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Calendar & Schedule</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Default Calendar View */}
          <div className="space-y-2">
            <label htmlFor="settings-calendar-view" className="text-xs font-semibold text-foreground block">
              Default Calendar View
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted rounded-xl">
              {(["month", "week", "day", "agenda"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onUpdateProductivity({ defaultCalendarView: view })}
                  className={cn(
                    "rounded-lg py-1.5 text-xs font-medium capitalize transition-all cursor-pointer",
                    productivity.defaultCalendarView === view
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Initial layout when opening the calendar or planning board.
            </p>
          </div>

          {/* First Day of the Week */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">First Day of Week</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onUpdateProductivity({ weekStartsOn: 1 })}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
                  productivity.weekStartsOn === 1
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monday (ISO)
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onUpdateProductivity({ weekStartsOn: 0 })}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
                  productivity.weekStartsOn === 0
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sunday (US)
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Determines column arrangement in weekly and monthly calendar grids.
            </p>
          </div>

          {/* Time Display Format */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Time Display Format</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onUpdateProductivity({ timeFormat: "12h" })}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
                  productivity.timeFormat === "12h"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                12-Hour (e.g. 2:30 PM)
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onUpdateProductivity({ timeFormat: "24h" })}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
                  productivity.timeFormat === "24h"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                24-Hour (e.g. 14:30)
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Applies to time block selectors, schedule headers, and reminders.
            </p>
          </div>

          {/* Default Block Duration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Default Event Duration
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted rounded-xl">
              {([15, 30, 45, 60] as const).map((duration) => (
                <button
                  key={duration}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onUpdateProductivity({ defaultDurationMinutes: duration })}
                  className={cn(
                    "rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
                    productivity.defaultDurationMinutes === duration
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {duration}m
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Preselected duration when creating a new calendar event or time block.
            </p>
          </div>
        </div>
      </div>

      {/* Task Preferences Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <ListTodo className="size-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-foreground">Task Creation Defaults</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Default Priority */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Default Task Priority</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl">
              {(["low", "medium", "high"] as const).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onUpdateProductivity({ defaultTaskPriority: priority })}
                  className={cn(
                    "rounded-lg py-1.5 text-xs font-medium capitalize transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    productivity.defaultTaskPriority === priority
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Flag
                    className={cn(
                      "size-3",
                      priority === "high"
                        ? "text-rose-500 fill-rose-500/20"
                        : priority === "medium"
                          ? "text-amber-500 fill-amber-500/20"
                          : "text-blue-500 fill-blue-500/20"
                    )}
                  />
                  {priority}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Applied automatically when creating quick capture tasks without priority.
            </p>
          </div>

          {/* Default Due Date Preset */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Default Due Date Offset</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl">
              {[
                { label: "Today", days: 0 },
                { label: "Tomorrow", days: 1 },
                { label: "+1 Week", days: 7 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onUpdateProductivity({ defaultTaskDueOffsetDays: days })}
                  className={cn(
                    "rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer",
                    productivity.defaultTaskDueOffsetDays === days
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Suggested due date when scheduling from task creation forms.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifications.enabled}
            onClick={() => onUpdateNotifications({ enabled: !notifications.enabled })}
            disabled={isSaving}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              notifications.enabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                notifications.enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        <div className="space-y-3 pt-1">
          {/* Sub-toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/40 transition-colors cursor-pointer">
              <span className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" /> Task Reminders
              </span>
              <input
                type="checkbox"
                checked={notifications.taskReminders}
                onChange={(e) => onUpdateNotifications({ taskReminders: e.target.checked })}
                disabled={!notifications.enabled || isSaving}
                className="size-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/40 transition-colors cursor-pointer">
              <span className="flex items-center gap-2">
                <Calendar className="size-3.5 text-muted-foreground" /> Calendar Reminders
              </span>
              <input
                type="checkbox"
                checked={notifications.calendarReminders}
                onChange={(e) => onUpdateNotifications({ calendarReminders: e.target.checked })}
                disabled={!notifications.enabled || isSaving}
                className="size-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Moon className="size-3.5 text-indigo-400" /> Quiet Hours (Do Not Disturb)
              </span>
              <input
                type="checkbox"
                checked={notifications.quietHoursEnabled}
                onChange={(e) => onUpdateNotifications({ quietHoursEnabled: e.target.checked })}
                disabled={!notifications.enabled || isSaving}
                className="size-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
            </div>
            {notifications.quietHoursEnabled && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                <span className="text-[11px]">Mute alerts from</span>
                <input
                  type="time"
                  value={notifications.quietHoursStart}
                  onChange={(e) => onUpdateNotifications({ quietHoursStart: e.target.value })}
                  disabled={!notifications.enabled || isSaving}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground font-mono"
                />
                <span className="text-[11px]">until</span>
                <input
                  type="time"
                  value={notifications.quietHoursEnd}
                  onChange={(e) => onUpdateNotifications({ quietHoursEnd: e.target.value })}
                  disabled={!notifications.enabled || isSaving}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
