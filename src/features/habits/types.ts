export type HabitType = "checkbox" | "duration" | "quantity";

export type HabitFrequencyType =
  | "daily"
  | "weekdays"
  | "specific_days"
  | "every_n_days"
  | "times_per_week"
  | "monthly";

export interface HabitSchedule {
  frequency: HabitFrequencyType;
  interval?: number; // for every_n_days e.g. every 2 days
  daysOfWeek?: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat for specific_days
  timesPerWeek?: number; // target occurrences per week
  dayOfMonth?: number; // 1-31 for monthly
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  color: string; // e.g. #3b82f6 or emerald, indigo, amber, rose, cyan
  category: string;
  type: HabitType;
  target?: number; // e.g. 30 mins, 8 glasses, 20 pages
  unit?: string; // e.g. "mins", "glasses", "pages", "reps", "steps"
  startDate: string; // YYYY-MM-DD
  schedule: HabitSchedule;
  preferredTime?: string; // HH:mm e.g. "08:00"
  reminderMinutes?: number; // 0, 5, 10, 15, 30
  isPaused: boolean;
  pausedAt?: string; // YYYY-MM-DD when habit was paused
  pausePeriods?: { pausedAt: string; resumedAt?: string }[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HabitOccurrenceStatus =
  | "completed"
  | "partially_completed"
  | "pending"
  | "missed"
  | "skipped"
  | "unscheduled";

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  skipped?: boolean; // explicitly skipped occurrence (protects streak)
  skipReason?: string;
  currentValue?: number; // logged value (e.g. 15 for 15/30 mins)
  targetValue?: number;
  completedAt?: string; // ISO string
  notes?: string;
}

export interface HabitProgressLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  value: number; // delta or new total
  note?: string;
}

export interface HabitStreakStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number; // 0-100 percentage
  weeklyConsistency: number; // percentage in last 4 weeks
  monthlyConsistency: number; // percentage in last 3 months
  totalScheduled: number;
  totalSkipped: number;
}

export interface RoutineStep {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  targetHabitId?: string; // linked habit to complete upon finishing step
  order: number;
}

export interface RoutineSchedule {
  frequency: "daily" | "weekdays" | "specific_days" | "weekly";
  daysOfWeek?: number[]; // 0=Sun..6=Sat
  preferredTime: string; // HH:mm
}

export interface Routine {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  color: string;
  steps: RoutineStep[];
  estimatedMinutes: number;
  schedule?: RoutineSchedule;
  reminderMinutes?: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineStepCompletion {
  stepId: string;
  stepTitle: string;
  completed: boolean;
  skipped: boolean;
  durationSeconds?: number;
}

export interface RoutineSession {
  id: string;
  routineId: string;
  routineTitle: string;
  date: string; // YYYY-MM-DD
  startedAt: string; // ISO string
  completedAt?: string; // ISO string
  status: "in_progress" | "completed" | "abandoned";
  currentStepIndex: number;
  stepCompletions: RoutineStepCompletion[];
  notes?: string;
}
