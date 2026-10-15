"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Maximize2,
  ChevronDown,
  Brain,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePomodoro } from "../engine/use-pomodoro";

interface MiniTimerProps {
  className?: string;
  onOpenFocusMode?: () => void;
}

export function MiniTimer({ className, onOpenFocusMode }: MiniTimerProps) {
  const {
    state,
    formattedRemaining,
    isRunning,
    isBreak,
    currentBlock,
    isFocusModeOpen,
    start,
    pause,
    resume,
    setFocusModeOpen,
  } = usePomodoro();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // If focus modal/view is already open, do not duplicate timer UI on screen
  if (isFocusModeOpen) {
    return null;
  }

  // If timer is idle and no active block, don't obstruct the user interface unless expanded
  const hasActiveContent = isRunning || state === "paused" || currentBlock !== null;

  const handleTogglePlay = () => {
    if (state === "idle") {
      start();
    } else if (isRunning) {
      pause();
    } else if (state === "paused") {
      resume();
    }
  };

  const handleOpenFocus = () => {
    if (onOpenFocusMode) {
      onOpenFocusMode();
    } else {
      setFocusModeOpen(true);
    }
  };

  if (!hasActiveContent && isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 shadow-lg backdrop-blur-md text-xs font-medium text-foreground hover:bg-muted transition-all cursor-pointer"
        title="Open Pomodoro Timer"
      >
        <Brain size={14} className="text-primary" />
        <span>Pomodoro</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-2xl border border-border/80 bg-card/95 px-3.5 py-2 shadow-xl backdrop-blur-md transition-all text-card-foreground ${
        className || ""
      }`}
      role="region"
      aria-label="Pomodoro Mini Timer"
    >
      {/* Status dot / Icon */}
      <div className="flex items-center gap-2">
        <span
          className={`flex size-7 items-center justify-center rounded-lg text-white shadow-2xs ${
            isBreak ? "bg-emerald-500" : "bg-primary"
          }`}
          style={currentBlock?.color ? { backgroundColor: currentBlock.color } : undefined}
        >
          {isBreak ? <Coffee size={14} /> : <Brain size={14} />}
        </span>

        {/* Timer Digits & Title */}
        <div className="flex flex-col min-w-[90px] max-w-[140px]">
          <span className="font-mono text-base font-bold tracking-tight text-foreground leading-none">
            {formattedRemaining}
          </span>
          <span className="truncate text-[10px] text-muted-foreground mt-0.5 font-medium">
            {currentBlock?.title || (isBreak ? "Break" : "Deep Focus")}
          </span>
        </div>
      </div>

      {/* Play / Pause Quick Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleTogglePlay}
        title={isRunning ? "Pause" : "Start / Resume"}
        aria-label={isRunning ? "Pause" : "Start / Resume"}
        className="size-8 rounded-xl text-foreground hover:bg-muted"
      >
        {isRunning ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
      </Button>

      {/* Expand to Full Focus Mode */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpenFocus}
        title="Open Focus Mode"
        aria-label="Open Focus Mode"
        className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
      >
        <Maximize2 size={14} />
      </Button>

      {/* Collapse button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(true)}
        title="Minimize"
        aria-label="Minimize"
        className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
