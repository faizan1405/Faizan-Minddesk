"use client";

import React, { useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Settings2,
  Maximize2,
  History,
  X,
  Coffee,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "./circular-progress";
import { usePomodoro } from "../engine/use-pomodoro";
import { PomodoroPreset } from "../types";
import { PomodoroSettingsDialog } from "./pomodoro-settings-dialog";
import { FocusHistoryModal } from "./focus-history-modal";

interface PomodoroTimerProps {
  className?: string;
  onOpenFocusMode?: () => void;
}

export function PomodoroTimer({ className, onOpenFocusMode }: PomodoroTimerProps) {
  const {
    state,
    sessionType,
    preset,
    formattedRemaining,
    progressPercent,
    statusLabel,
    isRunning,
    isBreak,
    completedSessionsCount,
    settings,
    currentBlock,
    start,
    pause,
    resume,
    reset,
    skipBreak,
    endSession,
    completeSession,
    setPreset,
    clearTimeBlock,
    setFocusModeOpen,
    setSettingsOpen,
    setHistoryOpen,
  } = usePomodoro();

  // Keyboard shortcuts (Space: toggle play/pause, R: reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (state === "idle") {
          start();
        } else if (isRunning) {
          pause();
        } else if (state === "paused") {
          resume();
        }
      } else if (e.key === "r" || e.key === "R") {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          reset();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, isRunning, start, pause, resume, reset]);

  const handleOpenFocus = () => {
    if (onOpenFocusMode) {
      onOpenFocusMode();
    } else {
      setFocusModeOpen(true);
    }
  };

  const handlePresetClick = (p: PomodoroPreset) => {
    setPreset(p);
  };

  const currentSessionInCycle = (completedSessionsCount % settings.longBreakInterval) + 1;

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border border-border bg-card p-6 shadow-sm text-card-foreground transition-all ${
        className || ""
      }`}
    >
      {/* Top Header Bar: Mode Badge, Session Count, Utility Actions */}
      <div className="w-full flex items-center justify-between mb-4 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={isBreak ? "secondary" : "default"}
            className={`gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
              isBreak ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : ""
            }`}
          >
            {isBreak ? <Coffee size={13} /> : <Brain size={13} />}
            {statusLabel}
          </Badge>

          {/* Session Progress Dots */}
          <div className="flex items-center gap-1.5 ml-2" title={`Session ${currentSessionInCycle} of ${settings.longBreakInterval} before long break`}>
            {Array.from({ length: settings.longBreakInterval }).map((_, idx) => {
              const isPastCompleted = idx < (completedSessionsCount % settings.longBreakInterval);
              const isCurrent = idx === (completedSessionsCount % settings.longBreakInterval) && !isBreak;
              return (
                <span
                  key={idx}
                  className={`size-2 rounded-full transition-all ${
                    isPastCompleted
                      ? "bg-primary"
                      : isCurrent
                      ? "bg-primary/50 ring-2 ring-primary/20 scale-125"
                      : "bg-muted"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Quick Toolbar (History, Settings, Full Focus Mode) */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            title="Focus Session History"
            aria-label="Focus Session History"
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <History size={15} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            title="Pomodoro Settings"
            aria-label="Pomodoro Settings"
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <Settings2 size={15} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenFocus}
            title="Open Distraction-Free Focus Mode"
            aria-label="Open Distraction-Free Focus Mode"
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <Maximize2 size={15} />
          </Button>
        </div>
      </div>

      {/* Linked Time Block Card (if active) */}
      {currentBlock ? (
        <div className="w-full flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentBlock.color || "#6366f1" }}
            />
            <div className="truncate">
              <p className="text-xs font-semibold text-foreground truncate">
                {currentBlock.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Planned: {currentBlock.plannedDurationMinutes}m • Focused: {currentBlock.actualFocusedMinutes || 0}m
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearTimeBlock}
            title="Detach Time Block"
            aria-label="Detach Time Block"
            className="size-6 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X size={13} />
          </Button>
        </div>
      ) : (
        <div className="text-center mb-3">
          <p className="text-xs text-muted-foreground font-medium">General Deep Focus</p>
        </div>
      )}

      {/* Preset Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl mb-6">
        <Button
          variant={preset === "25_5" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handlePresetClick("25_5")}
          className={`h-7 px-3 text-xs font-medium rounded-lg ${
            preset === "25_5" ? "shadow-xs font-semibold text-foreground bg-background" : "text-muted-foreground"
          }`}
        >
          25 / 5m
        </Button>
        <Button
          variant={preset === "50_10" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handlePresetClick("50_10")}
          className={`h-7 px-3 text-xs font-medium rounded-lg ${
            preset === "50_10" ? "shadow-xs font-semibold text-foreground bg-background" : "text-muted-foreground"
          }`}
        >
          50 / 10m
        </Button>
        <Button
          variant={preset === "custom" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            handlePresetClick("custom");
            setSettingsOpen(true);
          }}
          className={`h-7 px-3 text-xs font-medium rounded-lg ${
            preset === "custom" ? "shadow-xs font-semibold text-foreground bg-background" : "text-muted-foreground"
          }`}
        >
          Custom
        </Button>
      </div>

      {/* Large Circular Countdown Timer */}
      <div className="relative my-2">
        <CircularProgress
          progressPercent={progressPercent}
          size={250}
          strokeWidth={8}
          isBreak={isBreak}
          blockColor={currentBlock?.color}
        >
          <div className="flex flex-col items-center">
            <span className="font-mono text-5xl font-bold tracking-tight text-foreground select-text">
              {formattedRemaining}
            </span>
            <span className="mt-1 text-xs font-medium text-muted-foreground">
              {isBreak ? (sessionType === "long_break" ? "Long Break" : "Short Break") : "Focus Session"}
            </span>
            {currentBlock && (
              <span className="mt-2 max-w-[170px] truncate text-[11px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
                {currentBlock.title}
              </span>
            )}
          </div>
        </CircularProgress>
      </div>

      {/* Primary & Secondary Action Controls */}
      <div className="w-full flex flex-col items-center gap-3 mt-6">
        <div className="flex items-center gap-2">
          {state === "idle" ? (
            <Button
              size="lg"
              onClick={() => start()}
              className="gap-2 px-6 h-11 rounded-xl shadow-sm text-sm font-semibold"
            >
              <Play size={16} fill="currentColor" />
              {isBreak ? "Start Break" : "Start Focus"}
            </Button>
          ) : isRunning ? (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={pause}
                className="gap-2 px-5 h-11 rounded-xl shadow-xs text-sm font-semibold border-border hover:bg-muted"
              >
                <Pause size={16} fill="currentColor" />
                Pause
              </Button>

              <Button
                size="lg"
                onClick={completeSession}
                className="gap-2 px-4 h-11 rounded-xl shadow-sm text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Complete session now"
              >
                <CheckCircle2 size={16} />
                Complete
              </Button>
            </>
          ) : state === "paused" ? (
            <>
              <Button
                size="lg"
                onClick={resume}
                className="gap-2 px-6 h-11 rounded-xl shadow-sm text-sm font-semibold"
              >
                <Play size={16} fill="currentColor" />
                Resume
              </Button>

              <Button
                size="lg"
                onClick={completeSession}
                className="gap-2 px-4 h-11 rounded-xl shadow-sm text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Complete session now"
              >
                <CheckCircle2 size={16} />
                Complete
              </Button>
            </>
          ) : null}

          {/* Reset / Skip Break Button */}
          {isBreak ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={skipBreak}
              title="Skip Break and Return to Focus"
              aria-label="Skip Break and Return to Focus"
              className="size-11 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <SkipForward size={17} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={reset}
              title="Reset Timer (R)"
              aria-label="Reset Timer"
              className="size-11 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={17} />
            </Button>
          )}
        </div>

        {/* End early option when timer is running or paused */}
        {(isRunning || state === "paused") && (
          <button
            type="button"
            onClick={() => endSession(false)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer pt-1"
          >
            End session early and save actual minutes
          </button>
        )}
      </div>

      {/* Mount Modals */}
      <PomodoroSettingsDialog />
      <FocusHistoryModal />
    </div>
  );
}
