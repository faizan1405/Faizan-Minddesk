import type { ScheduledTaskBlock } from "@/features/calendar/types";

export type TimeBlockStatus =
  | "suggested"
  | "confirmed"
  | "active"
  | "completed"
  | "skipped";

export interface PlannerCategory {
  id: string;
  name: string;
  color: string; // Hex color (e.g. #4f46e5)
  isDefault?: boolean;
}

export const DEFAULT_PLANNER_CATEGORIES: PlannerCategory[] = [
  { id: "cat-work-focus", name: "Work & Focus", color: "#4f46e5", isDefault: true },
  { id: "cat-health", name: "Health", color: "#10b981", isDefault: true },
  { id: "cat-personal", name: "Personal", color: "#8b5cf6", isDefault: true },
  { id: "cat-breaks", name: "Breaks", color: "#f59e0b", isDefault: true },
  { id: "cat-sleep", name: "Sleep", color: "#64748b", isDefault: true },
  { id: "cat-general", name: "General", color: "#6b7280", isDefault: true },
];

export const CURATED_CATEGORY_COLORS = [
  { label: "Indigo", value: "#4f46e5" },
  { label: "Blue", value: "#2563eb" },
  { label: "Sky", value: "#0284c7" },
  { label: "Teal", value: "#0d9488" },
  { label: "Emerald", value: "#10b981" },
  { label: "Lime", value: "#84cc16" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Orange", value: "#ea580c" },
  { label: "Rose", value: "#e11d48" },
  { label: "Lavender", value: "#8b5cf6" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Slate", value: "#64748b" },
];

export type PlannerRoutineType = "fixed" | "flexible";
export type RoutineFrequency = "daily" | "weekdays" | "weekly" | "custom";

export interface PlannerRoutine {
  id: string;
  title: string;
  durationMinutes: number; // e.g. 30, 60
  categoryId: string;
  type: PlannerRoutineType; // "fixed" | "flexible"
  frequency: RoutineFrequency;
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat
  // For fixed routines:
  fixedStartTime?: string; // HH:mm e.g. "16:00"
  fixedEndTime?: string; // HH:mm e.g. "17:00"
  // For flexible routines:
  preferredStartTime: string; // HH:mm e.g. "19:00"
  windowStartTime: string; // HH:mm e.g. "18:00"
  windowEndTime: string; // HH:mm e.g. "22:00"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerRoutineException {
  id: string;
  routineId: string;
  date: string; // YYYY-MM-DD
  type: "skip" | "override";
  overrideStartTime?: string;
  overrideEndTime?: string;
  overrideDurationMinutes?: number;
  overrideCategoryId?: string;
  overrideTitle?: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  blockId?: string;
  blockTitle: string;
  date: string; // YYYY-MM-DD
  focusedMinutes: number;
  completedAt: string;
  preset: string;
}

export type PomodoroPreset = "25-5" | "50-10" | "custom";
export type PomodoroPhase = "focus" | "break";
export type PomodoroStatus = "idle" | "running" | "paused" | "completed";

export interface PomodoroState {
  blockId?: string;
  blockTitle: string;
  categoryColor: string;
  phase: PomodoroPhase;
  status: PomodoroStatus;
  preset: PomodoroPreset;
  focusMinutes: number;
  breakMinutes: number;
  targetEndTimeMs?: number; // timestamp for drift-proof accuracy
  remainingSeconds: number;
  sessionCount: number; // number of focus sessions completed
  totalFocusedSeconds: number;
  soundEnabled: boolean;
}

export interface DayMapCube {
  index: number; // 0 to 47
  row: number; // 0: 12am-6am, 1: 6am-12pm, 2: 12pm-6pm, 3: 6pm-12am
  col: number; // 0 to 11
  startMinutes: number; // 0 to 1410
  endMinutes: number; // 30 to 1440
  timeLabel: string; // "00:00", "09:30"
  formattedLabel: string; // "12:00 AM", "9:30 AM"
  blocks: ScheduledTaskBlock[];
  primaryBlock?: ScheduledTaskBlock;
  fillPercent: number; // 0 to 100
  color?: string;
  status?: TimeBlockStatus;
  isSpanningRowStart?: boolean;
  isSpanningRowEnd?: boolean;
}

export interface DailyTimeSummary {
  confirmedMinutes: number;
  suggestedMinutes: number;
  unallocatedMinutes: number;
  focusedMinutes: number;
}

export type ZoomTimeWindow = "night" | "morning" | "afternoon" | "evening" | "all";
