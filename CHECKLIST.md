# MindDesk — Development & Verification Checklist

> **Rule:** Never mark a phase or feature complete without running automated tests, typechecks, and build verification.

## Planning & Architecture
- [x] Inspect current workspace (`e:\Work\Faizan\Faizan Document website`)
- [x] Prepare complete system architecture & implementation plan
- [x] Define modular folder structure and App Router routes
- [x] Define 13-table MySQL schema, Prisma models, relationships, indexes, and server-side authorization guards
- [x] Define UI/UX design system (tokens, typography, layout, shortcuts)
- [x] Define 8 testable phases with acceptance criteria and test cases
- [x] Document technical risks and concrete mitigation strategies
- [x] Create project `README.md`, `HOSTINGER_DEPLOYMENT.md`, and `CHECKLIST.md`

---

## Phase 1: Project Foundation, Design System & Core App Shell
- [x] Initialize Next.js (App Router, TypeScript), Tailwind CSS, `shadcn/ui`, `next-themes`, and Zustand
- [x] Configure design tokens (Light/Dark theme variables, typography, border & surface colors)
- [x] Build responsive `AppShell` (Collapsible Desktop Sidebar, Mobile Drawer & Bottom Nav, Top Header, Save Status indicator)
- [x] Implement global Keyboard Shortcut provider (`Cmd/Ctrl + \`, `Cmd/Ctrl + K` shell)
- [x] Create route shells for `/dashboard`, `/tasks`, `/notes`, `/mind-maps`, `/projects`, and `/settings`
- [x] Configure Vitest + React Testing Library and verify tests (`T1.1–T1.3`), `typecheck`, `lint`, and `build`

## Phase 2: Hostinger MySQL Schema (Prisma), Server-Side Authorization & Better Auth Flow
- [x] Audit and remove all Supabase (`@supabase/ssr`, `@supabase/supabase-js`) and PostgreSQL-only dependencies
- [x] Migrate 13-table domain schema + 4 Better Auth core tables to MySQL (`prisma/schema.prisma` & `prisma/migrations/20261013000000_init_mysql_schema/migration.sql`)
- [x] Configure Better Auth with MySQL Prisma adapter, transactional workspace provisioning, and SMTP email support (`nodemailer`)
- [x] Implement explicit server-side authorization and IDOR-safe scoped repository (`src/lib/security/authorization.ts`) replacing PostgreSQL RLS and triggers
- [x] Update `/login`, `/signup`, `/forgot-password`, `/update-password`, `/auth/callback`, `/api/auth/[...all]`, and sidebar logout dropdown
- [x] Prepare Hostinger Node.js & MySQL deployment configuration (`HOSTINGER_DEPLOYMENT.md` & `.env.example`)
- [x] Verify route protection, auth validation, MySQL schema DDL, and two-user authorization/IDOR tests (`T2.1–T2.4B` passed locally; `T2.4C` live MySQL integration test ready and awaiting `DATABASE_URL` credentials)

## Phase 3: Projects Organization & Google Tasks-Inspired Task Manager
- [x] Implement Google Tasks desktop multi-column workspace (user lists side-by-side, responsive columns, smooth horizontal scroll controls)
- [x] Implement Google Tasks lists CRUD (My Tasks, Sharpen My Skills, Website Projects, Daily Routine, Business Goals, user lists, reordering, rename, delete)
- [x] Implement Tasks CRUD & quick inline composer (title, Enter to add, Esc to cancel, details modal, due date/time chips, star toggles)
- [x] Implement Google Tasks-style 1-level subtasks (create, toggle complete, edit, delete, promote to top-level task)
- [x] Implement roll-forward recurrence engine (`daily`, `weekdays`, `weekly` on specific weekdays, `monthly` with safe month-end clamp e.g. Jan 31 -> Feb 28, `yearly`, series deduplication)
- [x] Implement `@dnd-kit/sortable` drag-and-drop task reordering within lists, moving tasks between lists, and column reordering
- [x] Implement Google Tasks keyboard shortcuts modal & context-aware hotkeys
- [x] Implement Starred aggregated view, Today view, and Completed view with Undo action banner
- [x] Verify unit, recurrence, and component tests (`google-tasks-experience.test.tsx` 8/8, `recurrence.test.ts` 8/8, full suite 11/11 files passed, 0 lint warnings, 0 typecheck errors, production build verified)

## Phase 4: Notion-Inspired Rich-Text Notes Editor & Reliable Auto-Save
- [x] Implement Notes list, pinning, parent/child nesting, and project filtering
- [x] Build Tiptap rich-text editor (`/notes/[noteId]`) with 20 `/` slash commands, block hover handles (`+` / `⋮⋮`), drag reordering, and floating bubble toolbar
- [x] Implement Write-Ahead Auto-Save hook (`700ms` debounce, local recovery buffer, timestamped snapshots, JSON/Markdown export)
- [x] Verify auto-save, recovery, slash catalog, and editor tests (`slash-commands.test.ts` 4/4, `notes-editor.test.tsx` 6/6, full suite 11/11 files passed, 0 lint warnings, 0 typecheck errors)

## Phase 5: Personal Calendar & Multi-View Scheduling
- [x] Implement multi-view interactive Calendar workspace (`/calendar`) supporting Month, Week, Day, and Agenda views
- [x] Build multi-calendar management (Personal, Work, Focus, Habits, Routines) with color customization and toggle visibility
- [x] Support full Event CRUD (title, description, all-day flag, start/end timestamps, location, category)
- [x] Implement recurrence engine (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` with recurrence end and interval rules)
- [x] Implement non-overlapping column layout algorithm for concurrent events in Week and Day views
- [x] Verify integration, storage, recurrence, and layout tests (`calendar-integration.test.tsx` 4/4, `calendar-storage.test.ts` 3/3, `calendar-recurrence.test.ts` 6/6, `calendar-layout.test.ts` 4/4)

## Phase 6: Advanced Time Blocking & Plan Your Day Experience
- [x] Build dual-panel Plan Your Day workspace (`/plan-your-day`) with Task Library (~30%) and Interactive Timeline (~70%)
- [x] Implement Today's Top 3 Priorities shelf with scheduling progress badges and status tracking
- [x] Implement time block creation, duration adjustments (5m, 15m, 30m snap increments), drag-and-drop scheduling, and completion toggle
- [x] Implement conflict detection with warning alerts and smart reschedule suggestions
- [x] Implement Focus Mode modal with full-screen countdown timer, distraction-free environment, and completion logging
- [x] Ensure task data integrity: un-scheduling or deleting a time block preserves the underlying task
- [x] Synchronize time blocks bidirectionally between Plan Your Day and Personal Calendar
- [x] Verify time blocking suite (`time-blocking-experience.test.tsx` 11/11 passed, 0 lint warnings, 0 typecheck errors)

## Phase 7: Habit & Routine Tracker + Smart Reminders & Notifications
- [x] **Part A — Habit Tracker (`/habits`):**
  - [x] Dedicated `/habits` workspace with Today's Habits, Weekly Progress, Active Streaks, Categories, and History
  - [x] Support 3 tracking types: Checkbox, Duration (logged minutes vs. target), and Quantity (measured counter vs. target)
  - [x] Flexible recurrence frequencies: Daily, Weekdays, Specific Weekdays, Every N Days, N Times Per Week, Monthly
  - [x] Accurate streak tracking engine: handles unscheduled days safely (no false reset), streak freeze on explicit skips, future date protection, and prevents duplicate completion inflation
  - [x] GitHub-style 90-day contribution heatmap with intensity levels (0–4), aggregate or per-habit filtering, and inspect drawer
  - [x] End-of-day Daily Habit Summary modal with reflection notes, consistency score, and tomorrow's cues preview
  - [x] JSON data export for backup and external analysis
- [x] **Part B — Routine Tracker:**
  - [x] Dedicated Routines library with multi-step activity sequences (e.g., Morning Routine, Evening Shutdown, Deep Work Setup)
  - [x] Step-by-step Execution Mode with countdown timer, ambient chime audio, Next/Previous/Skip, and session state persistence
  - [x] Pause & Resume session banner allowing users to leave and resume without progress loss or duplicate completion history
  - [x] Bidirectional habit linking: routine step completion syncs directly with individual linked habit completions
- [x] **Part C — Calendar & Time Blocking Integration:**
  - [x] "Schedule Habit" and "Schedule Routine" dialogs integrated into Plan Your Day (`/plan-your-day`) and Calendar (`/calendar`)
  - [x] Conflict detection engine (`checkScheduleConflict`): detects overlapping events and time blocks, explains conflicts, and suggests the earliest available free slot
  - [x] Bidirectional completion sync: completing a habit or routine time block marks the habit/routine completed without modifying recurring schedules
- [x] **Part D — Smart Reminders & Notifications System (`/notifications`):**
  - [x] Central notification bell in top navigation header with unread badge counter and preview dropdown
  - [x] Dedicated `/notifications` workspace with category filtering (All, Tasks, Calendar, Time Blocks, Habits, Routines), search, and mark-read controls
  - [x] In-app floating toast alerts with Smart Snooze options (5m, 10m, 30m) and mark complete actions
  - [x] Configurable notification preferences: quiet hours schedule, category toggles, notification lead times (At time, 5m, 10m, 15m, 30m, 1h, 1d before)
  - [x] Web Notification API integration for desktop browser alerts with clear local storage prototype disclaimers
  - [x] Resilient evaluation scheduler: singleton 30s background heartbeat, tab visibility wake recovery, and deduplication
- [x] **Phase 7 Automated Verification:**
  - [x] 21/21 test suites passed, 135/136 tests passed (1 skipped), 0 failures (`habits-experience.test.tsx` 8/8, `habit-scheduler.test.ts` 16/16, `conflict-detector.test.ts` 5/5, `notifications-experience.test.tsx` 6/6, `notification-scheduler.test.ts` 11/11)
  - [x] TypeScript strict typecheck: 0 errors (`tsc --noEmit`)
  - [x] ESLint validation: 0 errors, 0 warnings (`eslint src`)
  - [x] Next.js 15 production build: 0 errors (all 25 static/dynamic routes compiled cleanly)

---

## Future Roadmap

### Phase 8: Interactive Mind Maps Canvas (React Flow)
- [ ] Implement Mind Maps gallery and `/mind-maps/[mapId]` React Flow workspace
- [ ] Build custom nodes (`IdeaNode`, `TaskRefNode`, `NoteRefNode`) and Node Inspector panel
- [ ] Implement keyboard graph shortcuts (`Tab` child node, `Enter` sibling node, `Delete`)
- [ ] Implement drag-stop delta persistence and stale-update prevention
- [ ] Verify graph diff, coordinate placement, and canvas tests

### Phase 9: Cross-Linking Engine (Knowledge Graph & Backlinks)
- [ ] Implement polymorphic `entity_links` repository and backlink queries
- [ ] Build `[[` inline entity link extension in Tiptap
- [ ] Build "Convert Node to Task / Note" actions in Mind Maps
- [ ] Build universal Backlinks panel across Tasks, Notes, and Mind Map Nodes
- [ ] Verify link extraction and bi-directional backlink tests

### Phase 10: Unified Dashboard & Global Search (`Cmd/Ctrl + K`)
- [ ] Build `/dashboard` daily focus view (Today/Overdue tasks, recent notes, active mind maps, project progress, quick capture)
- [ ] Implement `/api/search` with MySQL `FULLTEXT` search and fallback matching
- [ ] Connect `cmdk` Global Command Palette for instant search and quick creation commands
- [ ] Verify search ranking and command palette tests

### Phase 11: Data Export, Error Recovery, Mobile Polish & Final Release
- [ ] Build `/api/export` workspace export (JSON + Markdown archive)
- [ ] Implement file attachments for notes
- [ ] Add error boundaries, offline/conflict recovery dialogs, and mobile touch refinements
- [ ] Execute full regression test suite, typecheck, lint, and production build verification

