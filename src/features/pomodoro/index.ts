/**
 * MINDDESK — POMODORO & FOCUS SUBSYSTEM
 * Public API & Module Exports
 */

// Types & Integration Contracts
export * from "./types";

// Engine & State Management
export { usePomodoroStore, initializePomodoroSubsystem } from "./engine/pomodoro-engine";
export { usePomodoro, formatTime } from "./engine/use-pomodoro";

// Storage & Services
export {
  POMODORO_STORAGE_KEYS,
  DEFAULT_POMODORO_SETTINGS,
  DEFAULT_ACTIVE_TIMER,
  loadPomodoroSettings,
  savePomodoroSettings,
  loadActiveTimerSnapshot,
  saveActiveTimerSnapshot,
  clearActiveTimerSnapshot,
  loadFocusHistory,
  appendFocusSessionRecord,
  getBlockFocusSummary,
  enrichBlockWithActualFocus,
  registerFocusSessionPersistenceHandler,
  notifyFocusSessionPersistence,
} from "./services/pomodoro-storage";

export { soundService } from "./services/sound-service";
export { notificationService } from "./services/notification-service";
export { crossTabSyncBus } from "./services/cross-tab-sync";

// UI Components
export { PomodoroTimer } from "./components/pomodoro-timer";
export { FocusModeView } from "./components/focus-mode-view";
export { MiniTimer } from "./components/mini-timer";
export { CircularProgress } from "./components/circular-progress";
export { PomodoroSettingsDialog } from "./components/pomodoro-settings-dialog";
export { FocusHistoryModal } from "./components/focus-history-modal";

// Adapter & Integration with Agent 2's Planner
export {
  useTimeBlockFocus,
  TimeBlockFocusButton,
  TimeBlockFocusBadge,
  type TimeBlockFocusHookResult,
} from "./components/time-block-focus-adapter";
