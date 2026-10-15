"use client";

import React, { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Minimize2,
  Maximize2,
  X,
  Brain,
  Coffee,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "./circular-progress";
import { usePomodoro } from "../engine/use-pomodoro";

interface FocusModeViewProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function FocusModeView({ isOpen, onClose }: FocusModeViewProps) {
  const {
    isFocusModeOpen,
    setFocusModeOpen,
    state,
    preset,
    formattedRemaining,
    progressPercent,
    statusLabel,
    isRunning,
    isBreak,
    currentBlock,
    completedSessionsCount,
    settings,
    start,
    pause,
    resume,
    reset,
    skipBreak,
    completeSession,
    setPreset,
    updateSettings,
  } = usePomodoro();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeOpen = isOpen !== undefined ? isOpen : isFocusModeOpen;

  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setFocusModeOpen(false);
    }
  }, [onClose, setFocusModeOpen]);

  // Keyboard shortcut: Esc to exit focus mode, Space to play/pause
  useEffect(() => {
    if (!activeOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.code === "Space") {
        e.preventDefault();
        if (state === "idle") {
          start();
        } else if (isRunning) {
          pause();
        } else if (state === "paused") {
          resume();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeOpen, state, isRunning, start, pause, resume, handleClose]);

  if (!activeOpen) return null;

  const blockColor = currentBlock?.color || (isBreak ? "#10b981" : "#6366f1");

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl transition-all select-none ${
        isFullscreen ? "p-0" : "p-4 sm:p-8"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Distraction-Free Focus Mode"
    >
      {/* Ambient background glow matching the category color */}
      <div
        className="pointer-events-none absolute -top-48 -right-48 size-[500px] rounded-full blur-[120px] opacity-15"
        style={{ backgroundColor: blockColor }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-48 size-[500px] rounded-full blur-[120px] opacity-10"
        style={{ backgroundColor: blockColor }}
      />

      <div
        className={`relative flex flex-col justify-between overflow-hidden border border-border/80 bg-card text-card-foreground shadow-2xl transition-all ${
          isFullscreen
            ? "h-full w-full rounded-none border-none p-6 sm:p-12"
            : "w-full max-w-xl rounded-3xl p-6 sm:p-10 min-h-[580px]"
        }`}
      >
        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-xl text-white shadow-xs"
              style={{ backgroundColor: blockColor }}
            >
              {isBreak ? <Coffee size={16} /> : <Brain size={16} />}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                MindDesk Focus Engine
              </span>
              <span className="text-xs font-medium text-foreground">
                {isBreak ? "Break Mode" : "Focus Mode"} • Session {(completedSessionsCount % settings.longBreakInterval) + 1} of {settings.longBreakInterval}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              title={settings.soundEnabled ? "Mute sounds" : "Unmute sounds"}
              aria-label={settings.soundEnabled ? "Mute sounds" : "Unmute sounds"}
              className="size-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="size-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              title="Exit Focus Mode (Esc)"
              aria-label="Exit Focus Mode"
              className="size-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Center: Large Title & Circular Timer */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center py-6">
          {/* Active Activity Title */}
          <div className="text-center mb-4 max-w-md px-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground line-clamp-2">
              {isBreak ? "Rest & Recharge" : currentBlock?.title || "Deep Focus Session"}
            </h2>
            {currentBlock && (
              <p className="mt-1 text-xs text-muted-foreground">
                Planned: {currentBlock.plannedDurationMinutes}m • Actual focused: {currentBlock.actualFocusedMinutes || 0}m
              </p>
            )}

            {/* Presets selector when idle or paused */}
            {(state === "idle" || state === "paused") && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button
                  type="button"
                  variant={preset === "25_5" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset("25_5")}
                  className="h-8 text-xs rounded-xl"
                >
                  25 / 5m
                </Button>
                <Button
                  type="button"
                  variant={preset === "50_10" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset("50_10")}
                  className="h-8 text-xs rounded-xl"
                >
                  50 / 10m
                </Button>
                <Button
                  type="button"
                  variant={preset === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset("custom")}
                  className="h-8 text-xs rounded-xl"
                >
                  Custom
                </Button>
              </div>
            )}
          </div>

          {/* Big Circular Countdown */}
          <CircularProgress
            progressPercent={progressPercent}
            size={isFullscreen ? 320 : 280}
            strokeWidth={10}
            isBreak={isBreak}
            blockColor={blockColor}
          >
            <div className="flex flex-col items-center">
              <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground select-text">
                {formattedRemaining}
              </span>
              <span className="mt-2 text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                {statusLabel}
              </span>
            </div>
          </CircularProgress>
        </div>

        {/* Bottom Control Bar */}
        <div className="relative z-10 flex flex-col items-center gap-3 border-t border-border/50 pt-5">
          <div className="flex items-center gap-3">
            {state === "idle" ? (
              <Button
                size="lg"
                onClick={() => start()}
                className="gap-2 px-8 h-12 rounded-2xl shadow-md text-base font-semibold"
              >
                <Play size={18} fill="currentColor" />
                {isBreak ? "Start Break" : "Start Focus"}
              </Button>
            ) : isRunning ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={pause}
                  className="gap-2 px-6 h-12 rounded-2xl shadow-xs text-base font-semibold border-border hover:bg-muted"
                >
                  <Pause size={18} fill="currentColor" />
                  Pause
                </Button>

                <Button
                  size="lg"
                  onClick={completeSession}
                  className="gap-2 px-5 h-12 rounded-2xl shadow-sm text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Complete session now"
                >
                  <CheckCircle2 size={18} />
                  Complete
                </Button>
              </>
            ) : state === "paused" ? (
              <>
                <Button
                  size="lg"
                  onClick={resume}
                  className="gap-2 px-8 h-12 rounded-2xl shadow-md text-base font-semibold"
                >
                  <Play size={18} fill="currentColor" />
                  Resume
                </Button>

                <Button
                  size="lg"
                  onClick={completeSession}
                  className="gap-2 px-5 h-12 rounded-2xl shadow-sm text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Complete session now"
                >
                  <CheckCircle2 size={18} />
                  Complete
                </Button>
              </>
            ) : null}

            {/* Break / Reset Controls */}
            {isBreak ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={skipBreak}
                title="Skip Break"
                aria-label="Skip Break"
                className="size-12 rounded-2xl text-muted-foreground hover:text-foreground"
              >
                <SkipForward size={20} />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={reset}
                title="Reset timer"
                aria-label="Reset timer"
                className="size-12 rounded-2xl text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={20} />
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> to toggle, <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to exit
          </p>
        </div>
      </div>
    </div>
  );
}
