"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Clock, CheckCircle2, XCircle, Calendar, Sparkles } from "lucide-react";
import { usePomodoro } from "../engine/use-pomodoro";

export function FocusHistoryModal() {
  const { isHistoryOpen, setHistoryOpen, history, currentBlock } = usePomodoro();
  const [filterBlockOnly, setFilterBlockOnly] = useState(false);

  const displayedHistory = filterBlockOnly && currentBlock
    ? history.filter((s) => s.blockId === currentBlock.id)
    : history;

  const totalFocusSeconds = displayedHistory
    .filter((s) => s.sessionType === "focus")
    .reduce((acc, curr) => acc + curr.actualDurationSeconds, 0);

  const totalFocusMinutes = Math.round(totalFocusSeconds / 60);
  const completedFocusCount = displayedHistory.filter((s) => s.sessionType === "focus" && s.completed).length;

  return (
    <Dialog open={isHistoryOpen} onOpenChange={setHistoryOpen}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              Focus Session History
            </DialogTitle>
            {currentBlock && (
              <button
                type="button"
                onClick={() => setFilterBlockOnly(!filterBlockOnly)}
                className="text-xs text-primary hover:underline cursor-pointer font-medium"
              >
                {filterBlockOnly ? "Show All History" : `Filter by "${currentBlock.title}"`}
              </button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {filterBlockOnly && currentBlock
              ? `Showing focus activity for block: ${currentBlock.title}`
              : "Review your actual focused minutes and completed Pomodoro sessions."}
          </DialogDescription>
        </DialogHeader>

        {/* Quick summary stats */}
        <div className="grid grid-cols-3 gap-3 py-3">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
            <span className="text-[11px] text-muted-foreground block font-medium">Actual Focused</span>
            <span className="text-lg font-bold text-foreground font-mono">
              {totalFocusMinutes} <span className="text-xs font-normal text-muted-foreground">mins</span>
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
            <span className="text-[11px] text-muted-foreground block font-medium">Completed</span>
            <span className="text-lg font-bold text-primary font-mono">{completedFocusCount}</span>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
            <span className="text-[11px] text-muted-foreground block font-medium">Total Sessions</span>
            <span className="text-lg font-bold text-foreground font-mono">{displayedHistory.length}</span>
          </div>
        </div>

        {/* Session history list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
          {displayedHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="size-8 mx-auto mb-2 opacity-40 text-primary" />
              <p className="text-sm font-medium">No focus sessions recorded yet</p>
              <p className="text-xs mt-0.5">Start a Pomodoro session to log your productive time.</p>
            </div>
          ) : (
            displayedHistory.map((session) => {
              const minutes = Math.round(session.actualDurationSeconds / 60);
              const dateStr = new Date(session.completedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              const timeStr = new Date(session.completedAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: session.categoryColor || (session.sessionType === "focus" ? "#6366f1" : "#10b981") }}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {session.blockTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="capitalize">{session.sessionType.replace("_", " ")}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {dateStr} at {timeStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <span className="text-sm font-semibold font-mono text-foreground">
                        {minutes}m
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        planned {session.plannedDurationMinutes}m
                      </span>
                    </div>

                    {session.completed ? (
                      <span title="Completed" className="text-emerald-500">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <span title="Ended early" className="text-muted-foreground">
                        <XCircle size={16} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
