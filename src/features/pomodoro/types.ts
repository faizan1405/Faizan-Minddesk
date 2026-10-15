/**
 * MINDDESK — POMODORO & FOCUS SUBSYSTEM
 * Core Type Definitions & Contracts
 */

export type PomodoroState =
  | "idle"
  | "focusing"
  | "paused"
  | "short_break"
  | "long_break"
  | "completed";

export type PomodoroSessionType = "focus" | "short_break" | "long_break";

export type PomodoroPreset = "25_5" | "50_10" | "custom";

export interface PomodoroSettings {
  focusDurationMinutes: number; // default: 25
  shortBreakDurationMinutes: number; // default: 5
  longBreakDurationMinutes: number; // default: 15
  longBreakInterval: number; // sessions before long break, default: 4
  autoStartBreaks: boolean; // default: false
  autoStartFocus: boolean; // default: false
  soundEnabled: boolean; // default: true
  soundVolume: number; // 0.0 to 1.0, default: 0.7
  notificationsEnabled: boolean; // default: false
}

/**
 * Reference to an external visual time block from Agent 2's planner.
 * Adheres strictly to the integration contract:
 * - Does not alter original block duration
 * - Does not auto-complete the block
 * - Separates planned time from actual focused time
 */
export interface TimeBlockRef {
  id: string;
  title: string;
  color?: string;
  plannedDurationMinutes: number;
  actualFocusedMinutes?: number;
  taskId?: string;
  date?: string;
}

/**
 * Persisted record of a single completed or logged focus session.
 */
export interface FocusSessionRecord {
  id: string;
  sessionId: string;
  blockId?: string | null;
  blockTitle: string;
  categoryColor?: string;
  sessionType: PomodoroSessionType;
  plannedDurationMinutes: number;
  actualDurationSeconds: number;
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
  completed: boolean; // true if timer ran to completion; false if stopped early
  notes?: string;
}

/**
 * Timestamp-based snapshot for active timer engine.
 * Ensures drift-free calculation across tab backgrounding, minimization, sleep/resume, and refreshes.
 */
export interface ActiveTimerSnapshot {
  state: PomodoroState;
  sessionType: PomodoroSessionType;
  preset: PomodoroPreset;
  targetSeconds: number;
  remainingSeconds: number;
  startTimestamp: number | null; // Date.now() when active cycle started/resumed
  targetEndTimestamp: number | null; // Date.now() + remainingSeconds * 1000
  pausedAtTimestamp: number | null; // Date.now() when pause occurred
  elapsedBeforePauseSeconds: number; // accumulated elapsed seconds prior to current pause
  completedSessionsCount: number; // count of completed focus sessions in current cycle
  currentBlock: TimeBlockRef | null;
  sessionId: string; // unique ID for active session cycle to prevent duplicate logging
  lastTickTimestamp: number;
}

/**
 * Summary of focused time metrics per time block or overall day.
 */
export interface BlockFocusSummary {
  blockId: string;
  totalFocusedSeconds: number;
  totalFocusedMinutes: number;
  completedSessions: number;
  history: FocusSessionRecord[];
}

export type CrossTabSyncBroadcast =
  | { type: "TIMER_STATE_SYNC"; payload: ActiveTimerSnapshot }
  | { type: "TIMER_COMMAND"; command: "start" | "pause" | "resume" | "reset" | "skip_break" }
  | { type: "SESSION_RECORD_ADDED"; payload: FocusSessionRecord }
  | { type: "SETTINGS_UPDATED"; payload: PomodoroSettings };

export type CrossTabSyncMessage = CrossTabSyncBroadcast & { senderId: string };
