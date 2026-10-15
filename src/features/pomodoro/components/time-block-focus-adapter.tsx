"use client";

import React from "react";
import { Play, Pause, Brain, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePomodoro } from "../engine/use-pomodoro";
import { TimeBlockRef, FocusSessionRecord } from "../types";
import { getBlockFocusSummary } from "../services/pomodoro-storage";

export interface TimeBlockFocusHookResult {
  isCurrentBlock: boolean;
  isActive: boolean;
  isPaused: boolean;
  actualFocusedMinutes: number;
  plannedDurationMinutes: number;
  history: FocusSessionRecord[];
  startFocus: () => void;
  pauseFocus: () => void;
  openFocusMode: () => void;
}

/**
 * Adapter hook for Agent 2's visual planner time blocks.
 * Seamlessly connects any visual block to the Pomodoro engine.
 */
export function useTimeBlockFocus(block: TimeBlockRef | null): TimeBlockFocusHookResult {
  const {
    currentBlock,
    state,
    isRunning,
    history,
    selectTimeBlock,
    start,
    pause,
    resume,
    setFocusModeOpen,
  } = usePomodoro();

  const isCurrentBlock = Boolean(block && currentBlock?.id === block.id);
  const isActive = isCurrentBlock && isRunning;
  const isPaused = isCurrentBlock && state === "paused";

  const blockSummary = block ? getBlockFocusSummary(block.id, history) : null;
  const actualFocusedMinutes = blockSummary ? blockSummary.totalFocusedMinutes : 0;
  const blockHistory = blockSummary ? blockSummary.history : [];

  const startFocus = () => {
    if (!block) return;
    if (isCurrentBlock && isPaused) {
      resume();
    } else {
      selectTimeBlock(block);
      start(block);
    }
  };

  const pauseFocus = () => {
    if (isActive) {
      pause();
    }
  };

  const openFocusMode = () => {
    if (!block) return;
    if (!isCurrentBlock) {
      selectTimeBlock(block);
    }
    setFocusModeOpen(true);
  };

  return {
    isCurrentBlock,
    isActive,
    isPaused,
    actualFocusedMinutes,
    plannedDurationMinutes: block?.plannedDurationMinutes || 0,
    history: blockHistory,
    startFocus,
    pauseFocus,
    openFocusMode,
  };
}

/**
 * Drop-in button component for Agent 2's 24-hour visual time block cards or popovers.
 */
export function TimeBlockFocusButton({
  block,
  variant = "default",
  size = "sm",
  className,
}: {
  block: TimeBlockRef;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}) {
  const { isActive, isPaused, startFocus, pauseFocus, openFocusMode } = useTimeBlockFocus(block);

  if (isActive) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          size={size}
          onClick={(e) => {
            e.stopPropagation();
            pauseFocus();
          }}
          className={`gap-1.5 text-xs font-medium text-primary ${className || ""}`}
          title="Pause Focus Session"
        >
          <Pause size={13} fill="currentColor" />
          <span>Focusing...</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            openFocusMode();
          }}
          className="size-7 text-muted-foreground hover:text-foreground"
          title="Open Focus Mode"
        >
          <Maximize2 size={13} />
        </Button>
      </div>
    );
  }

  if (isPaused) {
    return (
      <Button
        type="button"
        variant="secondary"
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          startFocus();
        }}
        className={`gap-1.5 text-xs font-medium ${className || ""}`}
        title="Resume Focus Session"
      >
        <Play size={13} fill="currentColor" />
        <span>Resume</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        startFocus();
      }}
      className={`gap-1.5 text-xs font-medium ${className || ""}`}
      title="Start Pomodoro Focus"
    >
      <Brain size={13} />
      <span>Start Focus</span>
    </Button>
  );
}

/**
 * Drop-in badge displaying actual focused minutes vs planned block duration.
 */
export function TimeBlockFocusBadge({
  blockId,
  plannedDurationMinutes,
  className,
}: {
  blockId: string;
  plannedDurationMinutes: number;
  className?: string;
}) {
  const { history } = usePomodoro();
  const summary = getBlockFocusSummary(blockId, history);

  if (summary.totalFocusedMinutes <= 0) return null;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-mono gap-1 px-1.5 py-0 border-border/80 bg-background/50 text-muted-foreground ${
        className || ""
      }`}
      title={`Actual focused: ${summary.totalFocusedMinutes}m of planned ${plannedDurationMinutes}m`}
    >
      <Brain size={10} className="text-primary" />
      <span>
        {summary.totalFocusedMinutes}m / {plannedDurationMinutes}m
      </span>
    </Badge>
  );
}
