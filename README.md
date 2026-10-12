# MindDesk — Personal Knowledge & Productivity Workspace

MindDesk is a modern, distraction-free personal knowledge and productivity web application that unifies **Google Tasks-inspired Task Management**, **Notion-inspired Rich-Text Notes**, and **Interactive Visual Mind Maps** into a single connected workspace.

## Core Experiences

1. **Tasks (`@dnd-kit`):** Fast, keyboard-driven to-do lists with subtasks, priorities, due dates, recurring schedules, and drag-and-drop fractional ordering.
2. **Notes (`Tiptap`):** Clean rich-text document editor with `/` slash commands, Markdown shortcuts, `[[` inline entity cross-linking, version snapshots, and write-ahead auto-save recovery.
3. **Mind Maps (`React Flow`):** Interactive visual canvas with custom idea/task/note nodes, keyboard rapid node creation (`Tab` / `Enter`), and one-click node-to-task or node-to-note conversion.
4. **Unified Knowledge Graph:** Bi-directional cross-linking and backlinks across tasks, notes, and mind-map nodes, organized by projects and searchable via a global `Cmd/Ctrl + K` command palette.

## Technology Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling & UI:** Tailwind CSS, `shadcn/ui`, `lucide-react`, `next-themes`
- **Rich-Text Editor:** Tiptap (ProseMirror)
- **Mind Map Canvas:** React Flow (`@xyflow/react`)
- **Drag & Drop:** `dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`)
- **Backend & Auth:** Supabase (PostgreSQL, Row-Level Security, PKCE Auth, Storage, Full-Text Search)
- **Testing:** Vitest, React Testing Library, Playwright
- **Deployment:** Vercel

## Architecture Highlights

- **Modular Feature Isolation:** Domain logic is cleanly separated under `src/features/{auth,projects,tasks,notes,mind-maps,links,search}`.
- **Multi-User Ready Schema:** All entities belong to a `workspace_id` with PostgreSQL Row-Level Security (RLS) enforced via `workspace_members`.
- **Zero-Data-Loss Auto-Save:** Write-ahead local buffer (`localStorage` / `IndexedDB`) paired with debounced optimistic concurrency updates (`version` counter) and conflict recovery.

## Local Development Setup (Starting in Phase 1)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local

# 3. Start the development server
npm run dev

# 4. Run verification checks
npm run typecheck
npm run lint
npm run test
```

## Documentation & Tracking

- **Development Checklist:** See [`CHECKLIST.md`](./CHECKLIST.md) for the 8-phase implementation roadmap, acceptance criteria, and verification status.
