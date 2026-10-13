"use client";

import { useRef } from "react";
import { useCalendar } from "../calendar-context";
import { CalendarViewType } from "../types";
import { X, Download, Upload, CalendarDays } from "lucide-react";

interface CalendarSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalendarSettingsDialog({
  isOpen,
  onClose,
}: CalendarSettingsDialogProps) {
  const { settings, updateSettings, exportBackup, restoreBackup } = useCalendar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        restoreBackup(content);
        alert("Backup successfully restored!");
        onClose();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-2xl motion-safe:animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays size={16} />
            </span>
            <h2 id="settings-dialog-title" className="text-base font-bold text-foreground">
              Calendar Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs sm:text-sm">
          {/* Time format */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border">
            <div>
              <p className="font-semibold text-foreground">Time Format</p>
              <p className="text-xs text-muted-foreground">Choose 12-hour (am/pm) or 24-hour clock</p>
            </div>
            <div className="flex rounded-lg border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => updateSettings({ timeFormat: "12h" })}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  settings.timeFormat === "12h" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                12h
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ timeFormat: "24h" })}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  settings.timeFormat === "24h" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                24h
              </button>
            </div>
          </div>

          {/* Show Tasks on Calendar */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border">
            <div>
              <p className="font-semibold text-foreground">Show Tasks on Calendar</p>
              <p className="text-xs text-muted-foreground">Display tasks with due dates in calendar views</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTasksOnCalendar}
                onChange={(e) => updateSettings({ showTasksOnCalendar: e.target.checked })}
                className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
              />
            </label>
          </div>

          {/* Default View */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border">
            <div>
              <p className="font-semibold text-foreground">Default View</p>
              <p className="text-xs text-muted-foreground">Initial calendar layout on load</p>
            </div>
            <select
              value={settings.defaultView}
              onChange={(e) => updateSettings({ defaultView: e.target.value as CalendarViewType })}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold text-foreground"
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
              <option value="agenda">Agenda</option>
            </select>
          </div>

          {/* Week starts on */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border">
            <div>
              <p className="font-semibold text-foreground">Start of Week</p>
              <p className="text-xs text-muted-foreground">First day in weekly view and month grid</p>
            </div>
            <select
              value={settings.weekStartsOn}
              onChange={(e) => updateSettings({ weekStartsOn: parseInt(e.target.value, 10) as 0 | 1 })}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold text-foreground"
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>

          {/* Backup & Restore */}
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <p className="font-semibold text-foreground text-xs">Backup & Portability</p>
            <p className="text-xs text-muted-foreground">
              Export your full calendar events, time blocks, and priorities to a JSON backup.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={exportBackup}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs transition-colors"
              >
                <Download size={13} />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs transition-colors"
              >
                <Upload size={13} />
                <span>Import JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
