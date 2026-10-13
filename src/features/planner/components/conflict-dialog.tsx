"use client";

import React from "react";
import { AlertTriangle, Clock, X } from "lucide-react";
import { formatTimeDisplay } from "@/features/calendar/services/calendar-layout";
import { useCalendar } from "@/features/calendar/calendar-context";

export interface ConflictDialogProps {
  isOpen: boolean;
  blockTitle: string;
  proposedStartTime: string;
  proposedEndTime: string;
  conflictingItems: Array<{ id: string; title: string; startMinutes: number; endMinutes: number }>;
  onKeepOverlap: () => void;
  onChooseAnotherTime: () => void;
  onCancel: () => void;
}

export function ConflictDialog({
  isOpen,
  blockTitle,
  proposedStartTime,
  proposedEndTime,
  conflictingItems,
  onKeepOverlap,
  onChooseAnotherTime,
  onCancel,
}: ConflictDialogProps) {
  const { settings } = useCalendar();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs motion-safe:animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-300/40 bg-card p-5 sm:p-6 text-card-foreground shadow-2xl motion-safe:animate-fade-in-up space-y-4">
        {/* Header with warning icon */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="conflict-dialog-title" className="text-base font-bold text-foreground">
              Scheduling Conflict Detected
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              The time block you are scheduling overlaps with an existing appointment.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conflict detail card */}
        <div className="rounded-xl border border-amber-200/50 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              New: &ldquo;{blockTitle || "Time Block"}&rdquo;
            </span>
            <span className="font-medium text-foreground flex items-center gap-1">
              <Clock size={11} className="text-muted-foreground" />
              {formatTimeDisplay(proposedStartTime, settings.timeFormat)} – {formatTimeDisplay(proposedEndTime, settings.timeFormat)}
            </span>
          </div>

          <div className="border-t border-amber-200/50 dark:border-amber-900/40 pt-2 space-y-1">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Overlaps With:
            </span>
            {conflictingItems.map((item) => {
              const startStr = `${String(Math.floor(item.startMinutes / 60)).padStart(2, "0")}:${String(item.startMinutes % 60).padStart(2, "0")}`;
              const endStr = `${String(Math.floor(item.endMinutes / 60)).padStart(2, "0")}:${String(item.endMinutes % 60).padStart(2, "0")}`;
              return (
                <div key={item.id} className="flex items-center justify-between font-medium text-foreground">
                  <span className="truncate pr-2 font-semibold">● {item.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatTimeDisplay(startStr, settings.timeFormat)} – {formatTimeDisplay(endStr, settings.timeFormat)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanatory notice */}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          MindDesk never deletes or moves your appointments automatically. Choose whether to allow the overlap or select an open slot.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onChooseAnotherTime}
            className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer text-center"
          >
            Choose Another Time
          </button>
          <button
            type="button"
            onClick={onKeepOverlap}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer text-center"
          >
            Keep Overlap
          </button>
        </div>
      </div>
    </div>
  );
}
