"use client";

import React, { useState } from "react";
import {
  Plus,
  Play,
  RotateCcw,
  Calendar,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import type { Routine } from "../types";
import { useHabits } from "../context/habits-context";
import { RoutineModal } from "./routine-modal";
import { RoutineExecutionModal } from "./routine-execution-modal";
import { ScheduleHabitDialog } from "./schedule-habit-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function RoutinesView() {
  const { activeRoutines, routineSessions, deleteRoutine, startRoutineSession } = useHabits();

  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [routineToExecute, setRoutineToExecute] = useState<Routine | null>(null);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [routineToSchedule, setRoutineToSchedule] = useState<Routine | null>(null);

  const handleStartRoutine = (routine: Routine) => {
    const inProgress = routineSessions.find(
      (s) => s.routineId === routine.id && s.status === "in_progress"
    );
    if (!inProgress) {
      startRoutineSession(routine.id);
    }
    setRoutineToExecute(routine);
    setExecutionModalOpen(true);
  };

  const handleScheduleRoutine = (routine: Routine) => {
    setRoutineToSchedule(routine);
    setScheduleDialogOpen(true);
  };

  const handleEditRoutine = (routine: Routine) => {
    setRoutineToEdit(routine);
    setRoutineModalOpen(true);
  };

  // Find if there is an active in-progress session
  const inProgressSession = routineSessions.find((s) => s.status === "in_progress");
  const inProgressRoutine = inProgressSession
    ? activeRoutines.find((r) => r.id === inProgressSession.routineId)
    : null;

  return (
    <div className="space-y-6">
      {/* Resume In-Progress Banner */}
      {inProgressSession && inProgressRoutine && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl text-xl animate-pulse"
              style={{
                backgroundColor: `${inProgressRoutine.color}20`,
                border: `1px solid ${inProgressRoutine.color}40`,
              }}
            >
              {inProgressRoutine.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                  In Progress
                </span>
                <h4 className="text-sm font-bold text-foreground">{inProgressRoutine.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Session paused at Step {(inProgressSession.currentStepIndex || 0) + 1} of{" "}
                {inProgressRoutine.steps.length}. Ready to resume?
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => handleStartRoutine(inProgressRoutine)}
            className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 text-xs cursor-pointer"
          >
            <RotateCcw size={14} className="mr-1.5" /> Resume Session
          </Button>
        </div>
      )}

      {/* Routines Grid Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Personal Routines</h2>
          <p className="text-xs text-muted-foreground">
            Execute recurring daily routines step-by-step with guided countdowns.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setRoutineToEdit(null);
            setRoutineModalOpen(true);
          }}
          className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs cursor-pointer"
        >
          <Plus size={14} className="mr-1.5" /> New Routine
        </Button>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeRoutines.map((routine) => {
          const totalMins = routine.steps.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
          const sessionsForRoutine = routineSessions.filter((s) => s.routineId === routine.id);
          const completedSessions = sessionsForRoutine.filter((s) => s.status === "completed").length;

          return (
            <div
              key={routine.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-border/80 hover:shadow-xs transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex size-11 items-center justify-center rounded-xl text-xl shadow-xs"
                      style={{
                        backgroundColor: `${routine.color}15`,
                        border: `1px solid ${routine.color}35`,
                      }}
                    >
                      {routine.emoji}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{routine.title}</h3>
                      {routine.description && (
                        <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5">
                          {routine.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Clock size={11} /> {totalMins} mins
                        </span>
                        <span>•</span>
                        <span>{routine.steps.length} steps</span>
                        {routine.schedule && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{routine.schedule.frequency} at {routine.schedule.preferredTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs">
                      <DropdownMenuItem onClick={() => handleEditRoutine(routine)}>
                        <Edit className="mr-2 size-3.5" /> Edit Routine
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleScheduleRoutine(routine)}>
                        <Calendar className="mr-2 size-3.5" /> Schedule in Calendar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteRoutine(routine.id)}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Delete Routine
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Steps List Preview */}
                <div className="mt-4 space-y-1.5 border-t border-border/50 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sequence Steps
                  </span>
                  <div className="space-y-1">
                    {routine.steps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="size-4 rounded-full bg-muted text-[10px] font-bold text-muted-foreground flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="truncate text-foreground font-medium">{step.title}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                          {step.durationMinutes}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer: Action Buttons */}
              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {completedSessions} {completedSessions === 1 ? "session" : "sessions"} finished
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScheduleRoutine(routine)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <Calendar size={13} className="mr-1" /> Schedule
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleStartRoutine(routine)}
                    className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
                  >
                    <Play size={13} className="mr-1 fill-current" /> Start Routine
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Routine Modals */}
      <RoutineModal
        isOpen={routineModalOpen}
        routineToEdit={routineToEdit}
        onClose={() => setRoutineModalOpen(false)}
      />

      <RoutineExecutionModal
        isOpen={executionModalOpen}
        routine={routineToExecute}
        onClose={() => setExecutionModalOpen(false)}
      />

      <ScheduleHabitDialog
        isOpen={scheduleDialogOpen}
        routine={routineToSchedule}
        onClose={() => setScheduleDialogOpen(false)}
      />
    </div>
  );
}
