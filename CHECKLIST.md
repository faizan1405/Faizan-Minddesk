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
- [ ] Implement Notes list, pinning, and project filtering
- [ ] Build Tiptap rich-text editor (`/notes/[noteId]`) with `/` slash command menu
- [ ] Implement Write-Ahead Auto-Save hook (`800ms` debounce, local recovery buffer, optimistic `version` check, `note_versions` snapshots)
- [ ] Verify auto-save, recovery, and editor tests (`T4.1–T4.3`)

## Phase 5: Interactive Mind Maps Canvas (React Flow)
- [ ] Implement Mind Maps gallery and `/mind-maps/[mapId]` React Flow workspace
- [ ] Build custom nodes (`IdeaNode`, `TaskRefNode`, `NoteRefNode`) and Node Inspector panel
- [ ] Implement keyboard graph shortcuts (`Tab` child node, `Enter` sibling node, `Delete`)
- [ ] Implement drag-stop delta persistence and stale-update prevention
- [ ] Verify graph diff, coordinate placement, and canvas tests (`T5.1–T5.3`)

## Phase 6: Cross-Linking Engine (Knowledge Graph & Backlinks)
- [ ] Implement polymorphic `entity_links` repository and backlink queries
- [ ] Build `[[` inline entity link extension in Tiptap
- [ ] Build "Convert Node to Task / Note" actions in Mind Maps
- [ ] Build universal Backlinks panel across Tasks, Notes, and Mind Map Nodes
- [ ] Verify link extraction and bi-directional backlink tests (`T6.1–T6.2`)

## Phase 7: Unified Dashboard & Global Search (`Cmd/Ctrl + K`)
- [ ] Build `/dashboard` daily focus view (Today/Overdue tasks, recent notes, active mind maps, project progress, quick capture)
- [ ] Implement `/api/search` with MySQL `FULLTEXT` search and fallback matching
- [ ] Connect `cmdk` Global Command Palette for instant search and quick creation commands
- [ ] Verify search ranking and command palette tests (`T7.1–T7.2`)

## Phase 8: Data Export, Error Recovery, Mobile Polish & Final Verification
- [ ] Build `/api/export` workspace export (JSON + Markdown archive)
- [ ] Implement file attachments for notes
- [ ] Add error boundaries, offline/conflict recovery dialogs, and mobile touch refinements
- [ ] Execute full test suite, typecheck, lint, and production build verification (`T8.1–T8.2`)
