"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";
import { format } from "date-fns";
import type {
  Habit,
  HabitCompletion,
  HabitProgressLog,
  Routine,
  RoutineSession,
} from "../types";
import { useCalendar } from "@/features/calendar/calendar-context";
import { useOptionalDeskData } from "@/features/minddesk/store";
import {
  loadMindDeskStore,
  saveMindDeskStore,
  exportHabitsAndRoutinesBackup,
  STORAGE_EVENT_NAME,
} from "@/features/calendar/services/calendar-storage";
import {
  getInitialDefaultHabits,
  getInitialDefaultCompletions,
  getInitialDefaultRoutines,
} from "../services/habit-defaults";
import {
  checkScheduleConflict,
  type ConflictCheckResult,
} from "../services/conflict-detector";
import type { ScheduledTaskBlock } from "@/features/calendar/types";

export interface HabitsContextType {
  habits: Habit[];
  activeHabits: Habit[];
  habitCompletions: HabitCompletion[];
  habitProgressLogs: HabitProgressLog[];
  routines: Routine[];
  activeRoutines: Routine[];
  routineSessions: RoutineSession[];
  activeRoutineSession: RoutineSession | null;
  archivedRoutines: Routine[];

  // Habit operations
  createHabit: (habit: Omit<Habit, "id" | "createdAt" | "updatedAt">) => Habit;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  unarchiveHabit: (id: string) => void;
  pauseHabit: (id: string) => void;
  resumeHabit: (id: string) => void;
  markHabitComplete: (habitId: string, dateStr?: string) => void;
  toggleHabitComplete: (habitId: string, dateStr?: string) => void;
  undoHabitComplete: (habitId: string, dateStr?: string) => void;
  skipHabitOccurrence: (habitId: string, dateStr?: string, reason?: string) => void;
  logHabitProgress: (habitId: string, value: number, dateStr?: string, note?: string) => void;

  // Routine operations
  createRoutine: (routine: Omit<Routine, "id" | "createdAt" | "updatedAt">) => Routine;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  archiveRoutine: (id: string) => void;
  unarchiveRoutine: (id: string) => void;
  startRoutineSession: (routineId: string) => RoutineSession;
  updateRoutineSessionStep: (
    sessionId: string,
    stepIndex: number,
    completed: boolean,
    skipped?: boolean,
    durationSeconds?: number,
    targetStepIndex?: number
  ) => void;
  completeRoutineSession: (sessionId: string, notes?: string) => void;
  abandonRoutineSession: (sessionId: string) => void;

  // Schedule Integration
  scheduleHabitAsBlock: (
    habitId: string,
    date: string,
    startTime: string,
    durationMinutes?: number,
    allowConflict?: boolean
  ) => { success: boolean; conflictResult?: ConflictCheckResult; block?: ScheduledTaskBlock };
  scheduleRoutineAsBlock: (
    routineId: string,
    date: string,
    startTime: string,
    durationMinutes?: number,
    allowConflict?: boolean
  ) => { success: boolean; conflictResult?: ConflictCheckResult; block?: ScheduledTaskBlock };

  // Data export
  exportHabitsData: () => void;
}

const HabitsContext = createContext<HabitsContextType | null>(null);

export function HabitsProvider({
  children,
  initialHabits,
  initialCompletions,
  initialRoutines,
}: {
  children: React.ReactNode;
  initialHabits?: Habit[];
  initialCompletions?: HabitCompletion[];
  initialRoutines?: Routine[];
}) {
  const calendarContext = useCalendar();
  const deskContext = useOptionalDeskData();

  const [localHabits, setLocalHabits] = useState<Habit[]>(() => initialHabits ?? getInitialDefaultHabits());
  const [localCompletions, setLocalCompletions] = useState<HabitCompletion[]>(() => initialCompletions ?? getInitialDefaultCompletions());
  const [localProgressLogs, setLocalProgressLogs] = useState<HabitProgressLog[]>([]);
  const [localRoutines, setLocalRoutines] = useState<Routine[]>(() => initialRoutines ?? getInitialDefaultRoutines());
  const [localSessions, setLocalSessions] = useState<RoutineSession[]>([]);

  // Initialize from localStorage (only if not explicitly provided via props)
  useEffect(() => {
    if (initialHabits !== undefined || initialRoutines !== undefined) {
      return;
    }
    const store = loadMindDeskStore();
    if (store.habits && Array.isArray(store.habits) && store.habits.length > 0) {
      setLocalHabits(store.habits);
    }
    if (store.habitCompletions && Array.isArray(store.habitCompletions)) {
      setLocalCompletions(store.habitCompletions);
    }
    if (store.habitProgressLogs && Array.isArray(store.habitProgressLogs)) {
      setLocalProgressLogs(store.habitProgressLogs);
    }
    if (store.routines && Array.isArray(store.routines) && store.routines.length > 0) {
      setLocalRoutines(store.routines);
    }
    if (store.routineSessions && Array.isArray(store.routineSessions)) {
      setLocalSessions(store.routineSessions);
    }

    const handleStorageChange = () => {
      const updated = loadMindDeskStore();
      if (updated.habits) setLocalHabits(updated.habits);
      if (updated.habitCompletions) setLocalCompletions(updated.habitCompletions);
      if (updated.habitProgressLogs) setLocalProgressLogs(updated.habitProgressLogs);
      if (updated.routines) setLocalRoutines(updated.routines);
      if (updated.routineSessions) setLocalSessions(updated.routineSessions);
    };

    window.addEventListener(STORAGE_EVENT_NAME, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT_NAME, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [initialHabits, initialRoutines]);

  const deskData = deskContext?.data;
  const updateDeskData = deskContext?.update;

  const habits = useMemo(() => {
    if (initialHabits !== undefined) {
      return localHabits;
    }
    if (deskData?.habits && Array.isArray(deskData.habits)) {
      return deskData.habits;
    }
    return localHabits;
  }, [initialHabits, deskData?.habits, localHabits]);

  const habitCompletions = useMemo(() => {
    if (initialCompletions !== undefined) {
      return localCompletions;
    }
    if (deskData?.habitCompletions && Array.isArray(deskData.habitCompletions)) {
      return deskData.habitCompletions;
    }
    return localCompletions;
  }, [initialCompletions, deskData?.habitCompletions, localCompletions]);

  const habitProgressLogs = useMemo(() => {
    if (deskData?.habitProgressLogs && Array.isArray(deskData.habitProgressLogs)) {
      return deskData.habitProgressLogs;
    }
    return localProgressLogs;
  }, [deskData?.habitProgressLogs, localProgressLogs]);

  const routines = useMemo(() => {
    if (initialRoutines !== undefined) {
      return localRoutines;
    }
    if (deskData?.routines && Array.isArray(deskData.routines)) {
      return deskData.routines;
    }
    return localRoutines;
  }, [initialRoutines, deskData?.routines, localRoutines]);

  const routineSessions = useMemo(() => {
    if (deskData?.routineSessions && Array.isArray(deskData.routineSessions)) {
      return deskData.routineSessions;
    }
    return localSessions;
  }, [deskData?.routineSessions, localSessions]);

  const activeHabits = useMemo(() => habits.filter((h) => !h.isArchived), [habits]);
  const activeRoutines = useMemo(() => routines.filter((r) => !r.isArchived), [routines]);
  const archivedRoutines = useMemo(() => routines.filter((r) => r.isArchived), [routines]);

  const activeRoutineSession = useMemo(
    () => routineSessions.find((s) => s.status === "in_progress") || null,
    [routineSessions]
  );

  // Helper to persist updates to DeskContext and localStorage
  const persistHabitsData = useCallback(
    (updates: {
      habits?: Habit[];
      habitCompletions?: HabitCompletion[];
      habitProgressLogs?: HabitProgressLog[];
      routines?: Routine[];
      routineSessions?: RoutineSession[];
    }) => {
      if (updates.habits) setLocalHabits(updates.habits);
      if (updates.habitCompletions) setLocalCompletions(updates.habitCompletions);
      if (updates.habitProgressLogs) setLocalProgressLogs(updates.habitProgressLogs);
      if (updates.routines) setLocalRoutines(updates.routines);
      if (updates.routineSessions) setLocalSessions(updates.routineSessions);

      const store = loadMindDeskStore();
      const updatedStore = {
        ...store,
        habits: updates.habits ?? habits,
        habitCompletions: updates.habitCompletions ?? habitCompletions,
        habitProgressLogs: updates.habitProgressLogs ?? habitProgressLogs,
        routines: updates.routines ?? routines,
        routineSessions: updates.routineSessions ?? routineSessions,
      };
      saveMindDeskStore(updatedStore);

      if (updateDeskData) {
        updateDeskData((current) => ({
          ...current,
          habits: updates.habits ?? current.habits,
          habitCompletions: updates.habitCompletions ?? current.habitCompletions,
          habitProgressLogs: updates.habitProgressLogs ?? current.habitProgressLogs,
          routines: updates.routines ?? current.routines,
          routineSessions: updates.routineSessions ?? current.routineSessions,
        }));
      }
    },
    [habits, habitCompletions, habitProgressLogs, routines, routineSessions, updateDeskData]
  );

  // Create Habit
  const createHabit = useCallback(
    (habitData: Omit<Habit, "id" | "createdAt" | "updatedAt">): Habit => {
      const now = new Date().toISOString();
      const newHabit: Habit = {
        ...habitData,
        id: `habit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      persistHabitsData({ habits: [newHabit, ...habits] });
      return newHabit;
    },
    [habits, persistHabitsData]
  );

  // Update Habit
  const updateHabit = useCallback(
    (id: string, updates: Partial<Habit>) => {
      const updated = habits.map((h) =>
        h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
      );
      persistHabitsData({ habits: updated });
    },
    [habits, persistHabitsData]
  );

  // Delete Habit
  const deleteHabit = useCallback(
    (id: string) => {
      deskContext?.registerDeletedId?.("habit", id);
      persistHabitsData({
        habits: habits.filter((h) => h.id !== id),
        habitCompletions: habitCompletions.filter((c) => c.habitId !== id),
        habitProgressLogs: habitProgressLogs.filter((p) => p.habitId !== id),
      });
    },
    [habits, habitCompletions, habitProgressLogs, persistHabitsData, deskContext]
  );

  // Archive / Unarchive
  const archiveHabit = useCallback((id: string) => updateHabit(id, { isArchived: true }), [updateHabit]);
  const unarchiveHabit = useCallback((id: string) => updateHabit(id, { isArchived: false }), [updateHabit]);

  // Pause / Resume with historical preservation
  const pauseHabit = useCallback(
    (id: string) => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;
      const updatedPeriods = [...(habit.pausePeriods || []), { pausedAt: todayStr }];
      updateHabit(id, {
        isPaused: true,
        pausedAt: todayStr,
        pausePeriods: updatedPeriods,
      });
    },
    [habits, updateHabit]
  );

  const resumeHabit = useCallback(
    (id: string) => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;
      const updatedPeriods = habit.pausePeriods ? [...habit.pausePeriods] : [];
      if (updatedPeriods.length > 0) {
        const lastIdx = updatedPeriods.length - 1;
        if (!updatedPeriods[lastIdx].resumedAt) {
          updatedPeriods[lastIdx] = {
            ...updatedPeriods[lastIdx],
            resumedAt: todayStr,
          };
        }
      }
      updateHabit(id, {
        isPaused: false,
        pausedAt: undefined,
        pausePeriods: updatedPeriods,
      });
    },
    [habits, updateHabit]
  );

  // Idempotent Mark Habit Complete (never toggles an already completed habit back to false)
  const markHabitComplete = useCallback(
    (habitId: string, dateStr: string = format(new Date(), "yyyy-MM-dd")) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const existingIndex = habitCompletions.findIndex(
        (c) => c.habitId === habitId && c.date === dateStr
      );

      const nextCompletions = [...habitCompletions];

      if (existingIndex >= 0) {
        const existing = nextCompletions[existingIndex];
        // If already completed, do not alter
        if (existing.completed) return;

        nextCompletions[existingIndex] = {
          ...existing,
          completed: true,
          skipped: false,
          currentValue: habit.target || 1,
          completedAt: new Date().toISOString(),
        };
      } else {
        nextCompletions.push({
          id: `comp-${habitId}-${dateStr}`,
          habitId,
          date: dateStr,
          completed: true,
          skipped: false,
          currentValue: habit.target || 1,
          targetValue: habit.target || 1,
          completedAt: new Date().toISOString(),
        });
      }

      persistHabitsData({ habitCompletions: nextCompletions });

      if (calendarContext?.scheduledBlocks) {
        const linkedBlock = calendarContext.scheduledBlocks.find(
          (b) => b.habitId === habitId && b.date === dateStr
        );
        if (linkedBlock && !linkedBlock.completed) {
          calendarContext.updateTaskBlock(linkedBlock.id, { completed: true });
        }
      }
    },
    [habits, habitCompletions, persistHabitsData, calendarContext]
  );

  // Toggle Habit Complete
  const toggleHabitComplete = useCallback(
    (habitId: string, dateStr: string = format(new Date(), "yyyy-MM-dd")) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const existingIndex = habitCompletions.findIndex(
        (c) => c.habitId === habitId && c.date === dateStr
      );

      const nextCompletions = [...habitCompletions];
      let isCompletedNow = false;

      if (existingIndex >= 0) {
        const existing = nextCompletions[existingIndex];
        isCompletedNow = !existing.completed;
        nextCompletions[existingIndex] = {
          ...existing,
          completed: isCompletedNow,
          skipped: false,
          currentValue: isCompletedNow ? habit.target || 1 : 0,
          completedAt: isCompletedNow ? new Date().toISOString() : undefined,
        };
      } else {
        isCompletedNow = true;
        nextCompletions.push({
          id: `comp-${habitId}-${dateStr}`,
          habitId,
          date: dateStr,
          completed: true,
          skipped: false,
          currentValue: habit.target || 1,
          targetValue: habit.target || 1,
          completedAt: new Date().toISOString(),
        });
      }

      persistHabitsData({ habitCompletions: nextCompletions });

      // Synchronize any linked scheduled block for this habit on this date
      if (calendarContext?.scheduledBlocks) {
        const linkedBlock = calendarContext.scheduledBlocks.find(
          (b) => b.habitId === habitId && b.date === dateStr
        );
        if (linkedBlock && linkedBlock.completed !== isCompletedNow) {
          calendarContext.updateTaskBlock(linkedBlock.id, { completed: isCompletedNow });
        }
      }
    },
    [habits, habitCompletions, persistHabitsData, calendarContext]
  );

  // Explicit Undo Completion
  const undoHabitComplete = useCallback(
    (habitId: string, dateStr: string = format(new Date(), "yyyy-MM-dd")) => {
      const updated = habitCompletions.map((c) => {
        if (c.habitId === habitId && c.date === dateStr) {
          return {
            ...c,
            completed: false,
            currentValue: 0,
            completedAt: undefined,
          };
        }
        return c;
      });
      persistHabitsData({ habitCompletions: updated });

      if (calendarContext?.scheduledBlocks) {
        const linkedBlock = calendarContext.scheduledBlocks.find(
          (b) => b.habitId === habitId && b.date === dateStr
        );
        if (linkedBlock && linkedBlock.completed) {
          calendarContext.updateTaskBlock(linkedBlock.id, { completed: false });
        }
      }
    },
    [habitCompletions, persistHabitsData, calendarContext]
  );

  // Skip occurrence (protects streak from breaking)
  const skipHabitOccurrence = useCallback(
    (habitId: string, dateStr: string = format(new Date(), "yyyy-MM-dd"), reason?: string) => {
      const existingIndex = habitCompletions.findIndex(
        (c) => c.habitId === habitId && c.date === dateStr
      );

      const nextCompletions = [...habitCompletions];
      if (existingIndex >= 0) {
        nextCompletions[existingIndex] = {
          ...nextCompletions[existingIndex],
          completed: false,
          skipped: true,
          skipReason: reason || "Explicitly skipped",
        };
      } else {
        nextCompletions.push({
          id: `comp-${habitId}-${dateStr}`,
          habitId,
          date: dateStr,
          completed: false,
          skipped: true,
          skipReason: reason || "Explicitly skipped",
        });
      }
      persistHabitsData({ habitCompletions: nextCompletions });
    },
    [habitCompletions, persistHabitsData]
  );

  // Log Habit Progress (for duration / quantity habits)
  const logHabitProgress = useCallback(
    (habitId: string, value: number, dateStr: string = format(new Date(), "yyyy-MM-dd"), note?: string) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const target = habit.target || 1;
      const isMet = value >= target;

      const existingIndex = habitCompletions.findIndex(
        (c) => c.habitId === habitId && c.date === dateStr
      );

      const nextCompletions = [...habitCompletions];
      if (existingIndex >= 0) {
        nextCompletions[existingIndex] = {
          ...nextCompletions[existingIndex],
          currentValue: value,
          completed: isMet,
          skipped: false,
          completedAt: isMet ? new Date().toISOString() : undefined,
          notes: note || nextCompletions[existingIndex].notes,
        };
      } else {
        nextCompletions.push({
          id: `comp-${habitId}-${dateStr}`,
          habitId,
          date: dateStr,
          completed: isMet,
          skipped: false,
          currentValue: value,
          targetValue: target,
          completedAt: isMet ? new Date().toISOString() : undefined,
          notes: note,
        });
      }

      // Record progress log
      const newLog: HabitProgressLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        habitId,
        date: dateStr,
        timestamp: new Date().toISOString(),
        value,
        note,
      };

      persistHabitsData({
        habitCompletions: nextCompletions,
        habitProgressLogs: [newLog, ...habitProgressLogs],
      });

      // Synchronize linked scheduled block if present
      if (calendarContext?.scheduledBlocks) {
        const linkedBlock = calendarContext.scheduledBlocks.find(
          (b) => b.habitId === habitId && b.date === dateStr
        );
        if (linkedBlock && linkedBlock.completed !== isMet) {
          calendarContext.updateTaskBlock(linkedBlock.id, { completed: isMet });
        }
      }
    },
    [habits, habitCompletions, habitProgressLogs, persistHabitsData, calendarContext]
  );

  // Create Routine
  const createRoutine = useCallback(
    (routineData: Omit<Routine, "id" | "createdAt" | "updatedAt">): Routine => {
      const now = new Date().toISOString();
      const newRoutine: Routine = {
        ...routineData,
        id: `routine-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      persistHabitsData({ routines: [newRoutine, ...routines] });
      return newRoutine;
    },
    [routines, persistHabitsData]
  );

  // Update Routine
  const updateRoutine = useCallback(
    (id: string, updates: Partial<Routine>) => {
      const updated = routines.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      );
      persistHabitsData({ routines: updated });
    },
    [routines, persistHabitsData]
  );

  // Delete Routine
  const deleteRoutine = useCallback(
    (id: string) => {
      deskContext?.registerDeletedId?.("routine", id);
      persistHabitsData({
        routines: routines.filter((r) => r.id !== id),
      });
    },
    [routines, persistHabitsData, deskContext]
  );

  // Archive / Unarchive Routine
  const archiveRoutine = useCallback(
    (id: string) => updateRoutine(id, { isArchived: true }),
    [updateRoutine]
  );
  const unarchiveRoutine = useCallback(
    (id: string) => updateRoutine(id, { isArchived: false }),
    [updateRoutine]
  );

  // Start Routine Session
  const startRoutineSession = useCallback(
    (routineId: string): RoutineSession => {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) throw new Error("Routine not found");

      // Check if there is already an unfinished in-progress session for this routine today
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const existingInProgress = routineSessions.find(
        (s) => s.routineId === routineId && s.status === "in_progress"
      );

      if (existingInProgress) {
        return existingInProgress;
      }

      const newSession: RoutineSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        routineId: routine.id,
        routineTitle: routine.title,
        date: todayStr,
        startedAt: new Date().toISOString(),
        status: "in_progress",
        currentStepIndex: 0,
        stepCompletions: routine.steps.map((step) => ({
          stepId: step.id,
          stepTitle: step.title,
          completed: false,
          skipped: false,
          durationSeconds: 0,
        })),
      };

      persistHabitsData({ routineSessions: [newSession, ...routineSessions] });
      return newSession;
    },
    [routines, routineSessions, persistHabitsData]
  );

  // Update Routine Session Step
  const updateRoutineSessionStep = useCallback(
    (
      sessionId: string,
      stepIndex: number,
      completed: boolean,
      skipped = false,
      durationSeconds = 0,
      targetStepIndex?: number
    ) => {
      const session = routineSessions.find((s) => s.id === sessionId);
      if (!session) return;

      const nextSteps = [...session.stepCompletions];
      if (nextSteps[stepIndex]) {
        nextSteps[stepIndex] = {
          ...nextSteps[stepIndex],
          completed,
          skipped,
          durationSeconds,
        };
      }

      // If step links to a habit and was completed, idempotently record habit completion
      // MUST NEVER toggle an already completed habit back to incomplete!
      const routine = routines.find((r) => r.id === session.routineId);
      const targetHabitId = routine?.steps[stepIndex]?.targetHabitId;
      if (completed && targetHabitId) {
        markHabitComplete(targetHabitId, session.date);
      }

      let nextCurrentIndex = session.currentStepIndex;
      if (typeof targetStepIndex === "number") {
        nextCurrentIndex = Math.max(0, Math.min(targetStepIndex, nextSteps.length - 1));
      } else if (completed || skipped) {
        nextCurrentIndex = Math.min(stepIndex + 1, nextSteps.length - 1);
      } else {
        nextCurrentIndex = stepIndex;
      }

      const updated = routineSessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              stepCompletions: nextSteps,
              currentStepIndex: nextCurrentIndex,
            }
          : s
      );

      persistHabitsData({ routineSessions: updated });
    },
    [routineSessions, routines, markHabitComplete, persistHabitsData]
  );

  // Complete Routine Session
  const completeRoutineSession = useCallback(
    (sessionId: string, notes?: string) => {
      const updated = routineSessions.map((s) => {
        if (s.id === sessionId) {
          // Do not duplicate if already completed
          if (s.status === "completed") return s;
          return {
            ...s,
            status: "completed" as const,
            completedAt: new Date().toISOString(),
            notes: notes || s.notes,
          };
        }
        return s;
      });

      persistHabitsData({ routineSessions: updated });

      // If scheduled block exists for this routine today, mark it completed
      const completedSession = routineSessions.find((s) => s.id === sessionId);
      if (completedSession && calendarContext?.scheduledBlocks) {
        const block = calendarContext.scheduledBlocks.find(
          (b) => b.routineId === completedSession.routineId && b.date === completedSession.date
        );
        if (block && !block.completed) {
          calendarContext.updateTaskBlock(block.id, { completed: true });
        }
      }
    },
    [routineSessions, calendarContext, persistHabitsData]
  );

  // Abandon Session
  const abandonRoutineSession = useCallback(
    (sessionId: string) => {
      const updated = routineSessions.map((s) =>
        s.id === sessionId ? { ...s, status: "abandoned" as const } : s
      );
      persistHabitsData({ routineSessions: updated });
    },
    [routineSessions, persistHabitsData]
  );

  // Schedule Habit As Time Block (with Conflict Detection)
  const scheduleHabitAsBlock = useCallback(
    (
      habitId: string,
      date: string,
      startTime: string,
      durationMinutes = 30,
      allowConflict = false
    ) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return { success: false };

      const events = calendarContext?.events || [];
      const blocks = calendarContext?.scheduledBlocks || [];

      const conflictResult = checkScheduleConflict(date, startTime, durationMinutes, events, blocks);

      if (conflictResult.hasConflict && !allowConflict) {
        return { success: false, conflictResult };
      }

      const created = calendarContext.scheduleTaskBlock(undefined, date, startTime, durationMinutes, {
        habitId: habit.id,
        title: `${habit.emoji} ${habit.name}`,
        color: habit.color,
        blockType: "habit",
        description: habit.description || "",
      });

      return { success: true, conflictResult, block: created };
    },
    [habits, calendarContext]
  );

  // Schedule Routine As Time Block (with Conflict Detection)
  const scheduleRoutineAsBlock = useCallback(
    (
      routineId: string,
      date: string,
      startTime: string,
      durationMinutes?: number,
      allowConflict = false
    ) => {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return { success: false };

      const duration = durationMinutes || routine.estimatedMinutes || 30;
      const events = calendarContext?.events || [];
      const blocks = calendarContext?.scheduledBlocks || [];

      const conflictResult = checkScheduleConflict(date, startTime, duration, events, blocks);

      if (conflictResult.hasConflict && !allowConflict) {
        return { success: false, conflictResult };
      }

      const created = calendarContext.scheduleTaskBlock(undefined, date, startTime, duration, {
        routineId: routine.id,
        title: `${routine.emoji} ${routine.title}`,
        color: routine.color,
        blockType: "routine",
        description: routine.description || "",
      });

      return { success: true, conflictResult, block: created };
    },
    [routines, calendarContext]
  );

  // Dedicated JSON export
  const exportHabitsData = useCallback(() => {
    const store = loadMindDeskStore();
    exportHabitsAndRoutinesBackup({
      ...store,
      habits,
      habitCompletions,
      habitProgressLogs,
      routines,
      routineSessions,
    });
  }, [habits, habitCompletions, habitProgressLogs, routines, routineSessions]);

  const value = useMemo(
    () => ({
      habits,
      activeHabits,
      habitCompletions,
      habitProgressLogs,
      routines,
      activeRoutines,
      archivedRoutines,
      routineSessions,
      activeRoutineSession,
      createHabit,
      updateHabit,
      deleteHabit,
      archiveHabit,
      unarchiveHabit,
      pauseHabit,
      resumeHabit,
      markHabitComplete,
      toggleHabitComplete,
      undoHabitComplete,
      skipHabitOccurrence,
      logHabitProgress,
      createRoutine,
      updateRoutine,
      deleteRoutine,
      archiveRoutine,
      unarchiveRoutine,
      startRoutineSession,
      updateRoutineSessionStep,
      completeRoutineSession,
      abandonRoutineSession,
      scheduleHabitAsBlock,
      scheduleRoutineAsBlock,
      exportHabitsData,
    }),
    [
      habits,
      activeHabits,
      habitCompletions,
      habitProgressLogs,
      routines,
      activeRoutines,
      archivedRoutines,
      routineSessions,
      activeRoutineSession,
      createHabit,
      updateHabit,
      deleteHabit,
      archiveHabit,
      unarchiveHabit,
      pauseHabit,
      resumeHabit,
      markHabitComplete,
      toggleHabitComplete,
      undoHabitComplete,
      skipHabitOccurrence,
      logHabitProgress,
      createRoutine,
      updateRoutine,
      deleteRoutine,
      archiveRoutine,
      unarchiveRoutine,
      startRoutineSession,
      updateRoutineSessionStep,
      completeRoutineSession,
      abandonRoutineSession,
      scheduleHabitAsBlock,
      scheduleRoutineAsBlock,
      exportHabitsData,
    ]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error("useHabits must be used within a HabitsProvider");
  }
  return context;
}
