"use client";

import React, { useState } from "react";
import {
  X,
  Bell,
  Moon,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import { useNotifications } from "../context/notification-context";
import { Button } from "@/components/ui/button";

interface NotificationPreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferencesDialog({
  isOpen,
  onClose,
}: NotificationPreferencesDialogProps) {
  const { preferences, updatePreferences, requestBrowserPermission } = useNotifications();

  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestBrowserPermission();
    setPermissionStatus(res);
  };

  const handleToggleCategory = (categoryKey: keyof typeof preferences.categories) => {
    updatePreferences({
      categories: {
        ...preferences.categories,
        [categoryKey]: !preferences.categories[categoryKey],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Notification Preferences</h2>
              <p className="text-xs text-muted-foreground">
                Configure smart reminders, quiet hours, and browser desktop alerts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs minddesk-scrollbar">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3.5">
            <div>
              <span className="font-bold text-foreground text-xs">Enable Smart Reminders</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Evaluates tasks, meetings, time blocks, and habits in real time.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Browser Notification Banner & Disclaimer */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <Laptop size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground text-xs">Browser Desktop Alerts</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Receive system alerts when MindDesk is in another background tab.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Permission: <strong className="text-foreground capitalize">{permissionStatus}</strong>
              </span>

              {permissionStatus === "granted" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Allowed
                </span>
              ) : permissionStatus === "denied" ? (
                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                  Permission denied in browser settings
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestPermission}
                  className="rounded-xl text-xs font-semibold"
                >
                  Enable Browser Alerts
                </Button>
              )}
            </div>

            {/* Architecture limitation note */}
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground leading-relaxed border border-border/60">
              <span className="font-semibold text-foreground">Local Prototype Architecture:</span>{" "}
              Alerts trigger reliably while MindDesk is open in your browser. Closed-browser push, email, and cross-device sync will be handled in the upcoming Hostinger MySQL backend phase.
            </div>
          </div>

          {/* Category Toggles */}
          <div className="space-y-2">
            <span className="font-bold text-foreground text-xs">Reminder Categories</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: "tasks" as const, label: "Tasks (Due soon & overdue)" },
                { key: "calendar" as const, label: "Calendar (Meetings & events)" },
                { key: "time_blocks" as const, label: "Time Blocks (Focus sessions)" },
                { key: "habits" as const, label: "Habits (Scheduled cues)" },
                { key: "routines" as const, label: "Routines (Morning & evening)" },
                { key: "summary" as const, label: "Daily Summary Review" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground text-xs">{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences.categories[key]}
                    onChange={() => handleToggleCategory(key)}
                    className="rounded border-input text-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon size={15} className="text-primary" />
                <span className="font-bold text-foreground text-xs">Quiet Hours</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) => updatePreferences({ quietHoursEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-4.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Suppress all non-urgent sound and banner alerts during sleep or deep recovery.
            </p>

            {preferences.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Quiet Starts
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Quiet Ends
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Timing Offsets & Daily Review */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block text-xs">
                Default Alert Offset
              </label>
              <select
                value={preferences.defaultReminderOffsetMinutes}
                onChange={(e) =>
                  updatePreferences({ defaultReminderOffsetMinutes: parseInt(e.target.value) || 10 })
                }
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="0">At scheduled time</option>
                <option value="5">5 minutes before</option>
                <option value="10">10 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block text-xs">
                Daily Review Time
              </label>
              <input
                type="time"
                value={preferences.dailySummaryTime}
                onChange={(e) => updatePreferences({ dailySummaryTime: e.target.value })}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end">
          <Button onClick={onClose} className="rounded-xl text-xs font-semibold px-5">
            Save & Close
          </Button>
        </div>
      </div>
    </div>
  );
}
