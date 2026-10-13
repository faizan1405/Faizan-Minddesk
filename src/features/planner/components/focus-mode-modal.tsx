"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
  Plus,
  Maximize2,
  Minimize2,
  Brain,
} from "lucide-react";
import { ScheduledTaskBlock } from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";

interface FocusModeModalProps {
  isOpen: boolean;
  block: ScheduledTaskBlock | null;
  onClose: () => void;
}

export function FocusModeModal({ isOpen, block, onClose }: FocusModeModalProps) {
  const { toggleTaskComplete, updateTaskBlock, tasks } = useCalendar();

  const linkedTask = block?.taskId ? tasks.find((t) => t.id === block.taskId) : null;
  const isCompleted = block?.completed || linkedTask?.completed || false;

  const initialSeconds = (block?.durationMinutes || 60) * 60;
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when block changes
  useEffect(() => {
    if (block && isOpen) {
      const secs = (block.durationMinutes || 60) * 60;
      setTotalSeconds(secs);
      setRemainingSeconds(secs);
      setIsRunning(false);
    }
  }, [block, isOpen]);

  // Real countdown timer
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, remainingSeconds]);

  if (!isOpen || !block) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
  };

  const handleAddMinutes = (mins: number) => {
    const additional = mins * 60;
    setTotalSeconds((prev) => prev + additional);
    setRemainingSeconds((prev) => prev + additional);
  };

  const handleCompleteTask = () => {
    if (block.taskId) {
      toggleTaskComplete(block.taskId);
    } else {
      updateTaskBlock(block.id, { completed: !block.completed });
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-md transition-all ${
        isFullscreen ? "p-0" : "p-4 sm:p-6"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl transition-all ${
          isFullscreen
            ? "h-full w-full rounded-none border-none p-6 sm:p-12"
            : "w-full max-w-lg p-6 sm:p-8"
        }`}
      >
        {/* Subtle Ambient Background Gradient */}
        <div
          className="pointer-events-none absolute -top-40 -right-40 size-80 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: block.color || "#6366f1" }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 size-80 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: block.color || "#3b82f6" }}
        />

        {/* Top Control Bar */}
        <div className="relative z-10 flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span
              className="flex size-7 items-center justify-center rounded-lg text-white shadow-2xs"
              style={{ backgroundColor: block.color || "#6366f1" }}
            >
              <Brain size={15} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Focus Mode
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              {block.durationMinutes}m Session
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Return to Planner"
              aria-label="Return to Planner"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Center Content: Title & Countdown */}
        <div className="relative z-10 my-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="max-w-md space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {block.title}
            </h1>
            {block.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {block.description}
              </p>
            )}
          </div>

          {/* Large Countdown Display */}
          <div className="relative flex size-56 sm:size-64 items-center justify-center rounded-full border-4 border-muted/50 bg-muted/10 shadow-inner">
            {/* SVG circular progress ring */}
            <svg className="absolute inset-0 size-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="stroke-primary/20 fill-none"
                strokeWidth="6"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="transition-all duration-1000 ease-linear fill-none"
                stroke={block.color || "var(--primary)"}
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * progressPercent) / 100}
                strokeLinecap="round"
              />
            </svg>

            <div className="flex flex-col items-center justify-center z-10">
              <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-foreground tabular-nums">
                {formattedTime}
              </span>
              <span className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isRunning ? "Session Active" : remainingSeconds === 0 ? "Completed!" : "Paused"}
              </span>
            </div>
          </div>

          {/* Quick Adjustment Presets */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddMinutes(5)}
              className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Plus size={12} />
              <span>5 min</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddMinutes(15)}
              className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Plus size={12} />
              <span>15 min</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset Timer"
              aria-label="Reset Timer"
              className="rounded-xl border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={handleCompleteTask}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              isCompleted
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground shadow-2xs"
            }`}
          >
            <CheckCircle2 size={16} className={isCompleted ? "text-emerald-500" : ""} />
            <span>{isCompleted ? "Marked as Done" : "Mark Task Complete"}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleToggleTimer}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                isRunning
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-primary hover:opacity-90"
              }`}
            >
              {isRunning ? <Pause size={15} /> : <Play size={15} className="fill-white" />}
              <span>{isRunning ? "Pause Focus" : "Start Focus"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            >
              Back to Planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
