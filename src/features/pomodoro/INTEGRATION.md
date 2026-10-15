# MINDDESK — POMODORO & FOCUS SUBSYSTEM INTEGRATION GUIDE

This document defines the integration interfaces, component contracts, and usage patterns for connecting Agent 3's Pomodoro and Focus System with Agent 2's 24-hour visual time-blocking planner and Agent 4's dashboard.

---

## 1. Core Principles

1. **Strict Separation of Planned vs Actual Time**:
   - Time blocks created in Agent 2's visual planner specify **planned duration** (e.g. 120 minutes).
   - Pomodoro sessions record **actual focused minutes** (e.g. two 25-minute Pomodoros = 50 minutes focused).
   - Completing a Pomodoro **never** alters the block's planned duration, and **never** auto-completes the visual block.
2. **Zero Duplicate Tasks or Events**:
   - The Pomodoro engine references `blockId`, `blockTitle`, and `plannedDurationMinutes` by value/id.
   - It never creates duplicate task lists, calendar events, or habit instances.
3. **Drift-Free Timing Engine**:
   - Uses real-time timestamps (`targetEndTimestamp = Date.now() + remainingSeconds * 1000`).
   - Handles tab backgrounding, minimization, device sleep/wake, and page refreshes automatically.
4. **Cross-Tab Synchronization**:
   - Uses a dedicated `BroadcastChannel` with `storage` event fallback.
   - All open browser tabs reflect the same active countdown, play, pause, and break states.

---

## 2. Integration with Agent 2's Visual Planner

### A. Drop-in Focus Button for Visual Time Blocks

Import `TimeBlockFocusButton` and place it inside your time block card or inspector dialog:

```tsx
import { TimeBlockFocusButton, TimeBlockRef } from "@/features/pomodoro";

// Example inside your 48-cube time block card or inspector:
export function MyTimeBlockCard({ block }: { block: any }) {
  const blockRef: TimeBlockRef = {
    id: block.id,
    title: block.title,
    color: block.color,
    plannedDurationMinutes: block.durationMinutes,
  };

  return (
    <div className="relative group">
      <h3>{block.title}</h3>
      {/* Start Focus / Focusing Button */}
      <TimeBlockFocusButton block={blockRef} size="sm" />
    </div>
  );
}
```

### B. Displaying Actual Focused Minutes Badge

Show how many minutes the user has actually focused on a time block:

```tsx
import { TimeBlockFocusBadge } from "@/features/pomodoro";

<TimeBlockFocusBadge
  blockId={block.id}
  plannedDurationMinutes={block.durationMinutes}
/>
// Renders: "50m / 120m" with an icon when focus history exists.
```

### C. Direct Hook Integration (`useTimeBlockFocus`)

For custom UI controls inside block inspector modals:

```tsx
import { useTimeBlockFocus } from "@/features/pomodoro";

const {
  isCurrentBlock,
  isActive,
  isPaused,
  actualFocusedMinutes,
  startFocus,
  pauseFocus,
  openFocusMode,
  history,
} = useTimeBlockFocus({
  id: block.id,
  title: block.title,
  color: block.color,
  plannedDurationMinutes: block.durationMinutes,
});
```

---

## 3. Global Mini Timer Mount (Agent 4 or Root Layout)

The Mini Timer floats discreetly in the bottom-right corner when active or collapsed.

To mount it globally across MindDesk:

```tsx
import { MiniTimer, FocusModeView } from "@/features/pomodoro";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {children}
      {/* Floating Pomodoro Mini Timer & Focus Mode Overlay */}
      <MiniTimer />
      <FocusModeView />
    </div>
  );
}
```

---

## 4. Standalone Pomodoro Tab / Panel Mount

To render the full Pomodoro timer widget inside a dashboard widget, sidebar panel, or planner view:

```tsx
import { PomodoroTimer, FocusModeView } from "@/features/pomodoro";

export function PomodoroView() {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <PomodoroTimer />
      <FocusModeView />
    </div>
  );
}
```

---

## 5. Storage Keys Reference

| Key | Description | Type |
|---|---|---|
| `minddesk:pomodoro-active-v1` | Active timer snapshot & elapsed counters | `ActiveTimerSnapshot` |
| `minddesk:pomodoro-settings-v1` | User preferences & duration presets | `PomodoroSettings` |
| `minddesk:pomodoro-history-v1` | Persisted session completion records | `FocusSessionRecord[]` |
| `minddesk_pomodoro_sync_channel` | Cross-tab broadcast channel name | `BroadcastChannel` |

---

## 6. Database Migration (When Approved)

A production-ready MariaDB SQL migration script is located at:
`src/features/pomodoro/schema-migration.sql`

Prisma model definitions are documented at:
`src/features/pomodoro/schema-addition.prisma`
