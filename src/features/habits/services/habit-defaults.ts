import { format, subDays } from "date-fns";
import type { Habit, HabitCompletion, Routine } from "../types";

/**
 * Returns clean initial habits for a newly provisioned account.
 * New accounts start with zero sample habits or fake streaks.
 */
export function getInitialDefaultHabits(): Habit[] {
  return [];
}

/**
 * Returns clean initial completions for a newly provisioned account.
 * New accounts start with zero preloaded completions or fake history.
 */
export function getInitialDefaultCompletions(): HabitCompletion[] {
  return [];
}

/**
 * Returns clean initial routines for a newly provisioned account.
 * New accounts start with zero sample routines.
 */
export function getInitialDefaultRoutines(): Routine[] {
  return [];
}

/**
 * Test fixture generators used exclusively in automated test suites
 * to test habit toggling, routine navigation, and consistency metrics.
 */
export function getSampleTestHabits(): Habit[] {
  const today = new Date();
  const startDate = format(subDays(today, 14), "yyyy-MM-dd");

  return [
    {
      id: "habit-water",
      name: "Drink 8 Glasses of Water",
      description: "Stay hydrated throughout the workday for sustained mental clarity.",
      emoji: "💧",
      color: "#0ea5e9",
      category: "Health & Wellness",
      type: "quantity",
      target: 8,
      unit: "glasses",
      startDate,
      schedule: {
        frequency: "daily",
      },
      preferredTime: "09:00",
      reminderMinutes: 0,
      isPaused: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "habit-reading",
      name: "Read 20 Minutes",
      description: "Deep reading from non-fiction books or technical literature.",
      emoji: "📖",
      color: "#8b5cf6",
      category: "Learning",
      type: "duration",
      target: 20,
      unit: "mins",
      startDate,
      schedule: {
        frequency: "daily",
      },
      preferredTime: "20:00",
      reminderMinutes: 15,
      isPaused: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "habit-workout",
      name: "Exercise & Movement",
      description: "Strength training, cardio run, or dynamic bodyweight workout.",
      emoji: "🏃",
      color: "#10b981",
      category: "Health & Wellness",
      type: "checkbox",
      target: 1,
      unit: "session",
      startDate,
      schedule: {
        frequency: "specific_days",
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      },
      preferredTime: "07:30",
      reminderMinutes: 30,
      isPaused: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "habit-plan-day",
      name: "Evening Daily Review",
      description: "Review today's accomplishments and set top 3 priorities for tomorrow.",
      emoji: "✨",
      color: "#f59e0b",
      category: "Productivity",
      type: "checkbox",
      target: 1,
      unit: "session",
      startDate,
      schedule: {
        frequency: "weekdays",
      },
      preferredTime: "21:00",
      reminderMinutes: 10,
      isPaused: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function getSampleTestCompletions(): HabitCompletion[] {
  const completions: HabitCompletion[] = [];
  const today = new Date();

  for (let i = 7; i >= 1; i--) {
    const dStr = format(subDays(today, i), "yyyy-MM-dd");
    completions.push({
      id: `comp-water-${dStr}`,
      habitId: "habit-water",
      date: dStr,
      completed: true,
      currentValue: 8,
      targetValue: 8,
      completedAt: new Date().toISOString(),
    });
    completions.push({
      id: `comp-reading-${dStr}`,
      habitId: "habit-reading",
      date: dStr,
      completed: true,
      currentValue: 20,
      targetValue: 20,
      completedAt: new Date().toISOString(),
    });
    const dayOfWeek = subDays(today, i).getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      completions.push({
        id: `comp-plan-${dStr}`,
        habitId: "habit-plan-day",
        date: dStr,
        completed: true,
        currentValue: 1,
        targetValue: 1,
        completedAt: new Date().toISOString(),
      });
    }
  }

  return completions;
}

export function getSampleTestRoutines(): Routine[] {
  return [
    {
      id: "routine-morning",
      title: "Morning Focus Kickstart",
      description: "Prime your brain and body for high-output focus before checking messages.",
      emoji: "☀️",
      color: "#3b82f6",
      estimatedMinutes: 25,
      schedule: {
        frequency: "weekdays",
        preferredTime: "07:30",
      },
      reminderMinutes: 10,
      steps: [
        {
          id: "step-1",
          title: "Drink 500ml Water & Hydrate",
          description: "Rehydrate nervous system after 7-8 hours of sleep.",
          durationMinutes: 2,
          targetHabitId: "habit-water",
          order: 0,
        },
        {
          id: "step-2",
          title: "10-Minute Morning Stretch & Mobility",
          description: "Full body limbering, hip openers, and spine awakening.",
          durationMinutes: 10,
          targetHabitId: "habit-workout",
          order: 1,
        },
        {
          id: "step-3",
          title: "3-Minute Box Breathing Focus",
          description: "4s inhale, 4s hold, 4s exhale, 4s hold for mental grounding.",
          durationMinutes: 3,
          order: 2,
        },
        {
          id: "step-4",
          title: "Align Today's Top 3 Priorities in MindDesk",
          description: "Open Plan Your Day and lock in your key focus blocks.",
          durationMinutes: 10,
          order: 3,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "routine-evening",
      title: "Evening Wind-Down & Closure",
      description: "Transition smoothly from high-intensity work mode into restful recovery.",
      emoji: "🌙",
      color: "#6366f1",
      estimatedMinutes: 20,
      schedule: {
        frequency: "daily",
        preferredTime: "21:30",
      },
      reminderMinutes: 15,
      steps: [
        {
          id: "step-e1",
          title: "Shut Down Work Tabs & Notes Review",
          description: "Clear browser workspaces and review unfinished tasks.",
          durationMinutes: 5,
          targetHabitId: "habit-plan-day",
          order: 0,
        },
        {
          id: "step-e2",
          title: "Prepare Desk & Tomorrow's Clothes",
          description: "Remove morning decision friction for a seamless start.",
          durationMinutes: 5,
          order: 1,
        },
        {
          id: "step-e3",
          title: "10 Minutes of Book Reading",
          description: "Read physical book or Kindle under warm ambient light.",
          durationMinutes: 10,
          targetHabitId: "habit-reading",
          order: 2,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
