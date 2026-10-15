"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Coffee,
  Brain,
} from "lucide-react";
import { usePomodoro } from "../pomodoro-context";
import { useCalendar } from "@/features/calendar/calendar-context";
import type { PomodoroPreset } from "../types";

export function PomodoroFocusView() {
  const {
    state,
    isFocusModalOpen,
    pausePomodoro,
    resumePomodoro,
    resetPomodoro,
    skipPhase,
    setPreset,
    toggleSound,
    openFocusModal,
    closeFocusModal,
  } = usePomodoro();

  const { updateTaskBlock } = useCalendar();

  // Custom preset dialog in focus modal
  const [customFocusMins, setCustomFocusMins] = useState(30);
  const [customBreakMins, setCustomBreakMins] = useState(5);
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  // Minutes and seconds formatting
  const minutes = Math.floor(state.remainingSeconds / 60);
  const seconds = state.remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const totalPhaseSeconds =
    (state.phase === "focus" ? state.focusMinutes : state.breakMinutes) * 60;
  const progressPercent =
    totalPhaseSeconds > 0
      ? Math.min(100, Math.max(0, ((totalPhaseSeconds - state.remainingSeconds) / totalPhaseSeconds) * 100))
      : 0;

  const isRunning = state.status === "running";
  const isFocus = state.phase === "focus";

  const handleToggleTimer = () => {
    if (isRunning) {
      pausePomodoro();
    } else {
      resumePomodoro();
    }
  };

  const handleApplyCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    setPreset("custom", customFocusMins, customBreakMins);
    setShowCustomConfig(false);
  };

  const handleCompleteActiveBlock = () => {
    if (state.blockId) {
      updateTaskBlock(state.blockId, { completed: true });
    }
  };

  return (
    <>
      {/* 1. PERSISTENT MINI TIMER WIDGET (Always visible when timer is active or running) */}
      {(state.status === "running" || state.status === "paused" || state.remainingSeconds < totalPhaseSeconds) &&
        !isFocusModalOpen && (
          <aside
            aria-label="Active Pomodoro Timer"
            className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5"
          >
            {/* Phase indicator dot */}
            <div className="flex items-center gap-2">
              <span
                className={`relative flex h-3 w-3 items-center justify-center rounded-full ${
                  isFocus ? "bg-primary" : "bg-emerald-500"
                }`}
              >
                {isRunning && (
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                      isFocus ? "bg-primary" : "bg-emerald-500"
                    }`}
                  />
                )}
              </span>

              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {isFocus ? "Focus" : "Break"}
                </span>
                <span className="font-mono text-sm font-black text-foreground">
                  {timeFormatted}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-border/60" />

            {/* Block title */}
            <div className="max-w-[140px] truncate text-xs font-semibold text-foreground">
              {state.blockTitle}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleTimer}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                title={isRunning ? "Pause" : "Start"}
              >
                {isRunning ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={skipPhase}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                title="Skip to Next Phase"
              >
                <SkipForward size={14} />
              </button>

              <button
                type="button"
                onClick={openFocusModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                title="Expand Full Focus Mode"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </aside>
        )}

      {/* 2. DISTRACTION-FREE FULL FOCUS MODE MODAL */}
      {isFocusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4 animate-in fade-in-0 duration-200">
          <div className="relative flex flex-col items-center justify-between w-full max-w-xl min-h-[520px] rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Top Toolbar */}
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    isFocus ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {isFocus ? <Brain size={18} /> : <Coffee size={18} />}
                </span>
                <div>
                  <span className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">
                    MindDesk Focus Engine
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Session #{state.sessionCount + 1}
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      ({Math.round(state.totalFocusedSeconds / 60)}m focused today)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title={state.soundEnabled ? "Mute sounds" : "Unmute sounds"}
                >
                  {state.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button
                  type="button"
                  onClick={closeFocusModal}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title="Minimize back to workspace"
                >
                  <Minimize2 size={18} />
                </button>
              </div>
            </div>

            {/* Presets Bar */}
            <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 p-1 border border-border">
              {(["25-5", "50-10"] as PomodoroPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    state.preset === p
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "25-5" ? "25 / 5m" : "50 / 10m"}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowCustomConfig(!showCustomConfig)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  state.preset === "custom"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Interval Configuration Drawer */}
            {showCustomConfig && (
              <form
                onSubmit={handleApplyCustomPreset}
                className="flex items-center gap-2 rounded-xl bg-muted/30 p-2.5 border border-border text-xs"
              >
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Focus:</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customFocusMins}
                    onChange={(e) => setCustomFocusMins(Number(e.target.value))}
                    className="w-14 rounded-lg border border-input bg-background p-1 text-center font-bold"
                  />
                  <span className="text-muted-foreground">m</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Break:</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={customBreakMins}
                    onChange={(e) => setCustomBreakMins(Number(e.target.value))}
                    className="w-14 rounded-lg border border-input bg-background p-1 text-center font-bold"
                  />
                  <span className="text-muted-foreground">m</span>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-2.5 py-1 text-2xs font-bold text-primary-foreground"
                >
                  Apply
                </button>
              </form>
            )}

            {/* Centerpiece Timer Display */}
            <div className="relative flex flex-col items-center justify-center my-2">
              {/* Outer Circular Glow Ring */}
              <div
                className={`relative flex h-56 w-56 sm:h-64 sm:w-64 items-center justify-center rounded-full border-4 transition-all duration-500 ${
                  isFocus
                    ? "border-primary/20 bg-primary/5"
                    : "border-emerald-500/20 bg-emerald-500/5"
                }`}
              >
                {/* Visual Progress ring overlay */}
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    className={`stroke-current fill-none transition-all duration-300 ${
                      isFocus ? "text-primary" : "text-emerald-500"
                    }`}
                    strokeWidth="6"
                    strokeDasharray={750}
                    strokeDashoffset={750 - (750 * progressPercent) / 100}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner countdown readout */}
                <div className="relative z-10 flex flex-col items-center">
                  <span
                    className={`text-2xs font-extrabold uppercase tracking-widest ${
                      isFocus ? "text-primary" : "text-emerald-500"
                    }`}
                  >
                    {isFocus ? "Focusing" : "Rest & Recharge"}
                  </span>
                  <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-foreground my-1">
                    {timeFormatted}
                  </span>
                  <span className="text-2xs text-muted-foreground font-medium">
                    {progressPercent.toFixed(0)}% elapsed
                  </span>
                </div>
              </div>

              {/* Active Block Title Banner */}
              <div className="mt-4 text-center max-w-sm">
                <h4 className="text-base font-bold text-foreground truncate">
                  {state.blockTitle}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {isFocus
                    ? "Eliminate distractions. Immerse yourself in single-task execution."
                    : "Step away from the screen, stretch, drink water."}
                </p>
              </div>
            </div>

            {/* Primary Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetPomodoro}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
                title="Reset timer"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={handleToggleTimer}
                className={`flex h-14 px-8 items-center justify-center gap-2 rounded-2xl text-base font-black shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  isFocus
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
                    : "bg-emerald-600 text-white hover:opacity-90 shadow-emerald-600/20"
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause size={20} />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={20} className="ml-0.5" />
                    <span>{state.remainingSeconds < totalPhaseSeconds ? "Resume" : "Start Focus"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={skipPhase}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer shadow-2xs"
                title="Skip to next phase"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Bottom Actions: Mark Task Done */}
            <div className="flex items-center justify-between w-full pt-4 border-t border-border/60 text-xs">
              {state.blockId ? (
                <button
                  type="button"
                  onClick={handleCompleteActiveBlock}
                  className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Mark block as completed</span>
                </button>
              ) : (
                <span className="text-muted-foreground text-2xs">Stand-alone timer</span>
              )}

              <button
                type="button"
                onClick={closeFocusModal}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back to Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
