import Link from "next/link";
import {
  ArrowUpRight,
  CheckSquare,
  FileText,
  FolderKanban,
  Link2,
  Network,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

const OVERVIEW_CARDS = [
  {
    title: "Tasks",
    subtitle: "Google Tasks-inspired list",
    href: "/tasks",
    icon: CheckSquare,
    badge: "Phase 3",
    variant: "task" as const,
    description:
      "Rapid inline task entry, drag-and-drop fractional ordering, subtasks, and recurring schedules.",
  },
  {
    title: "Notes",
    subtitle: "Notion-style rich-text editor",
    href: "/notes",
    icon: FileText,
    badge: "Phase 4",
    variant: "note" as const,
    description:
      "Tiptap ProseMirror documents with slash commands, [[entity]] links, and write-ahead auto-save.",
  },
  {
    title: "Mind Maps",
    subtitle: "Interactive React Flow canvas",
    href: "/mind-maps",
    icon: Network,
    badge: "Phase 5",
    variant: "map" as const,
    description:
      "Visual idea nodes, directed connections, keyboard node spawning, and one-click task conversion.",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Welcome Banner */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Welcome to MindDesk
            </h2>
            <Badge variant="default">Phase 1 Shell Ready</Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Your unified workspace for tasks, rich-text notes, and connected
            mind maps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted/60 px-2.5 py-1.5">
            Command Palette <Kbd keys={["Ctrl", "K"]} />
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted/60 px-2.5 py-1.5">
            Quick Capture <Kbd keys={["Alt", "C"]} />
          </span>
        </div>
      </section>

      {/* Core Workspace Pillars */}
      <section aria-label="Core Workspace Modules" className="grid gap-4 md:grid-cols-3">
        {OVERVIEW_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-5 transition-colors hover:border-foreground-muted/40"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-muted">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {card.title}
                      </h3>
                      <p className="text-xs text-foreground-muted">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>
                  <Badge variant={card.variant}>{card.badge}</Badge>
                </div>

                <p className="text-xs leading-relaxed text-foreground-muted">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
                <span>Open {card.title}</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Knowledge Graph & Projects Preview */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-foreground-muted" />
              <h3 className="text-sm font-semibold text-foreground">
                Active Projects
              </h3>
            </div>
            <Link
              href="/projects"
              className="text-xs font-medium text-primary hover:underline"
            >
              Manage projects
            </Link>
          </div>
          <p className="text-xs text-foreground-muted">
            Group related tasks, notes, and mind maps under dedicated project
            containers with progress metrics.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-foreground-muted" />
              <h3 className="text-sm font-semibold text-foreground">
                Cross-Linked Knowledge Graph
              </h3>
            </div>
            <Badge variant="secondary">Bi-directional</Badge>
          </div>
          <p className="text-xs text-foreground-muted">
            Connect any task, document, or mind-map node with automatic
            backlinks and unified instant search.
          </p>
        </div>
      </section>
    </div>
  );
}
