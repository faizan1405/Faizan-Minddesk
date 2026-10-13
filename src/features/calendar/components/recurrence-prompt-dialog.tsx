"use client";

import { X, AlertCircle } from "lucide-react";

interface RecurrencePromptDialogProps {
  isOpen: boolean;
  actionType: "edit" | "delete";
  onSelectScope: (scope: "this" | "series") => void;
  onClose: () => void;
}

export function RecurrencePromptDialog({
  isOpen,
  actionType,
  onSelectScope,
  onClose,
}: RecurrencePromptDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card text-card-foreground p-5 shadow-2xl motion-safe:animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-prompt-title"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AlertCircle size={16} />
            </span>
            <h2 id="rec-prompt-title" className="text-base font-bold">
              {actionType === "edit" ? "Edit recurring event" : "Delete recurring event"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          {actionType === "edit"
            ? "Do you want to apply these changes to only this occurrence, or to all events in this recurring series?"
            : "Do you want to delete only this specific occurrence, or all occurrences in this recurring series?"}
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => onSelectScope("this")}
            className="flex w-full items-center justify-center rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/50 hover:text-primary hover:shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            This event only
          </button>
          <button
            type="button"
            onClick={() => onSelectScope("series")}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            All events in series
          </button>
        </div>
      </div>
    </div>
  );
}
