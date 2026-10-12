"use client";

import * as React from "react";
import { CheckSquare, FileText, Info, Network, X } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CaptureType = "task" | "note" | "map";

export function QuickCaptureModal() {
  const isOpen = useUIStore((state) => state.isQuickCaptureOpen);
  const setOpen = useUIStore((state) => state.setQuickCaptureOpen);
  const [captureType, setCaptureType] = React.useState<CaptureType>("task");
  const [title, setTitle] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  function handleClose() {
    setNotice(null);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    // Honest feedback: do not claim a database write has occurred in Phase 2
    setNotice(
      `Draft "${title.trim()}" staged in memory. Database persistence for ${captureType}s activates in Phases 3–5.`
    );
    setTitle("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[16vh] backdrop-blur-[2px] overscroll-contain"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick Capture"
      data-testid="quick-capture-dialog"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCaptureType("task")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                captureType === "task"
                  ? "bg-domain-task/15 text-domain-task"
                  : "text-foreground-muted hover:bg-surface-muted"
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Task
            </button>
            <button
              type="button"
              onClick={() => setCaptureType("note")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                captureType === "note"
                  ? "bg-domain-note/15 text-domain-note"
                  : "text-foreground-muted hover:bg-surface-muted"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Note
            </button>
            <button
              type="button"
              onClick={() => setCaptureType("map")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                captureType === "map"
                  ? "bg-domain-map/15 text-domain-map"
                  : "text-foreground-muted hover:bg-surface-muted"
              )}
            >
              <Network className="h-3.5 w-3.5" />
              Mind Map Node
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close quick capture"
            className="rounded p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {notice && (
          <div
            role="status"
            className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-surface-muted/60 p-2.5 text-xs text-foreground-muted"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              captureType === "task"
                ? "What needs to be done?"
                : captureType === "note"
                  ? "Note title or quick thought..."
                  : "Central idea or node concept..."
            }
            className="w-full rounded-md border border-border bg-surface-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              Close
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Stage Draft
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
