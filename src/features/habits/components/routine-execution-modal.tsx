"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronLeft,
  FastForward,
  Sparkles,
  Trophy,
  Save,
} from "lucide-react";
import type { Routine } from "../types";
import { useHabits } from "../context/habits-context";
import { Button } from "@/components/ui/button";

interface RoutineExecutionModalProps {
  routine: Routine | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RoutineExecutionModal({
  routine,
  isOpen,
  onClose,
}: RoutineExecutionModalProps) {
  const {
    routineSessions,
    updateRoutineSessionStep,
    completeRoutineSession,
  } = useHabits();

  // Find in-progress session directly from routineSessions context
  const activeSession = React.useMemo(() => {
    if (!routine) return null;
    return (
      routineSessions.find(
        (s) => s.routineId === routine.id && s.status === "in_progress"
      ) || null
    );
  }, [routine, routineSessions]);

  const currentStepIdx = activeSession?.currentStepIndex || 0;

  // Timer state for current step
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTotalSeconds, setElapsedTotalSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Sound chime ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Reset timer when step index changes
  useEffect(() => {
    if (routine) {
      const step = routine.steps[currentStepIdx];
      const initialSecs = (step?.durationMinutes || 5) * 60;
      setTimerSeconds(initialSecs);
      setIsTimerRunning(false);
    }
  }, [routine, currentStepIdx]);

  // Interval timer for active step countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer completed chime
            playChime();
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
        setElapsedTotalSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const playChime = () => {
    try {
      if (typeof window !== "undefined") {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = audioContextRef.current || new AudioContextClass();
          audioContextRef.current = ctx;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        }
      }
    } catch {
      // Audio not permitted or unsupported, continue silently
    }
  };

  if (!isOpen || !routine) return null;

  const steps = routine.steps;
  const currentStep = steps[currentStepIdx] || steps[0];
  const totalSteps = steps.length;
  const progressPercent = Math.round(((currentStepIdx + 1) / totalSteps) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStepComplete = () => {
    if (activeSession) {
      updateRoutineSessionStep(activeSession.id, currentStepIdx, true, false, elapsedTotalSeconds);
    }

    if (currentStepIdx + 1 >= totalSteps) {
      if (activeSession) {
        completeRoutineSession(activeSession.id);
      }
      setIsFinished(true);
      playChime();
    }
  };

  const handleStepSkip = () => {
    if (activeSession) {
      updateRoutineSessionStep(activeSession.id, currentStepIdx, false, true, elapsedTotalSeconds);
    }

    if (currentStepIdx + 1 >= totalSteps) {
      if (activeSession) {
        completeRoutineSession(activeSession.id);
      }
      setIsFinished(true);
    }
  };

  const handlePrevious = () => {
    if (currentStepIdx > 0 && activeSession) {
      updateRoutineSessionStep(activeSession.id, currentStepIdx - 1, false, false, elapsedTotalSeconds);
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds((currentStep?.durationMinutes || 5) * 60);
  };

  const handleExitAndSave = () => {
    // Current step progress is already saved via updateRoutineSessionStep
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${routine.color}15`, border: `1px solid ${routine.color}35` }}
            >
              {routine.emoji}
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground truncate">{routine.title}</h2>
              <span className="text-[11px] text-muted-foreground font-medium">
                Step {currentStepIdx + 1} of {totalSteps}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExitAndSave}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              title="Pause and resume later"
            >
              <Save size={12} /> Save & Exit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Routine Overall Progress Bar */}
        <div className="h-1.5 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Content Body */}
        {!isFinished ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
            {/* Step Pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles size={12} /> Active Step {currentStepIdx + 1}
            </span>

            {/* Step Title & Description */}
            <div className="space-y-1.5 max-w-md">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {currentStep?.title}
              </h1>
              {currentStep?.description && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {currentStep.description}
                </p>
              )}
            </div>

            {/* Step Countdown Timer Clock */}
            <div className="relative flex flex-col items-center justify-center size-44 sm:size-48 rounded-full border-4 border-primary/20 bg-primary/5 shadow-inner my-2">
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-foreground">
                {formatTime(timerSeconds)}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                {currentStep?.durationMinutes} min allocation
              </span>

              {/* Timer Controls */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer"
                  title={isTimerRunning ? "Pause timer" : "Start timer"}
                >
                  {isTimerRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted cursor-pointer"
                  title="Reset step timer"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            {/* Steps Preview List */}
            <div className="w-full flex items-center justify-center gap-1.5 overflow-x-auto py-1">
              {steps.map((st, i) => (
                <div
                  key={st.id}
                  className={`size-2.5 rounded-full transition-all ${
                    i < currentStepIdx
                      ? "bg-emerald-500 scale-100"
                      : i === currentStepIdx
                      ? "bg-primary ring-2 ring-primary/40 scale-125"
                      : "bg-muted-foreground/30"
                  }`}
                  title={`Step ${i + 1}: ${st.title}`}
                />
              ))}
            </div>

            {/* Step Actions */}
            <div className="w-full flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStepIdx === 0}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                <ChevronLeft size={14} className="mr-1" /> Previous
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleStepSkip}
                  className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <FastForward size={14} className="mr-1" /> Skip Step
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleStepComplete}
                  className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 px-5 text-xs font-bold shadow-md cursor-pointer"
                >
                  <Check size={15} className="mr-1.5 stroke-[3]" />
                  {currentStepIdx + 1 === totalSteps ? "Finish Routine" : "Complete Step"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Finished Celebration Screen */
          <div className="p-8 flex flex-col items-center text-center space-y-5 animate-fade-in">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Trophy size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-foreground">Routine Completed!</h2>
              <p className="text-xs text-muted-foreground max-w-xs">
                Great momentum! All steps and linked habit check-ins have been recorded.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-xs rounded-2xl bg-muted/40 p-4 border border-border text-center text-xs">
              <div>
                <span className="font-black text-foreground text-base">{totalSteps}</span>
                <p className="text-[10px] text-muted-foreground">Steps Done</p>
              </div>
              <div>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                  {Math.round(elapsedTotalSeconds / 60) || 1}m
                </span>
                <p className="text-[10px] text-muted-foreground">Time Invested</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-primary text-primary-foreground px-6 text-xs font-bold"
            >
              Done & Return to Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
