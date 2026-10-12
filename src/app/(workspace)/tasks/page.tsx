import { CheckSquare, GripVertical, Plus, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SAMPLE_TASKS = [
  {
    id: "t-1",
    title: "Design Supabase schema & Row-Level Security policies",
    project: "Product Strategy",
    due: "Today",
    priority: "High",
    recurring: false,
  },
  {
    id: "t-2",
    title: "Review weekly product architecture notes",
    project: "Knowledge Base",
    due: "Tomorrow",
    priority: "Medium",
    recurring: true,
  },
  {
    id: "t-3",
    title: "Link Q4 roadmap mind map nodes to sprint tasks",
    project: "Q4 Deliverables",
    due: "Fri",
    priority: "Low",
    recurring: false,
  },
];

export default function TasksPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-domain-task" />
            <h2 className="text-base font-semibold text-foreground">
              My Tasks
            </h2>
            <Badge variant="task">Google Tasks-Inspired</Badge>
          </div>
          <p className="text-xs text-foreground-muted">
            Fast single-line entry, drag reordering (@dnd-kit), subtasks, and
            roll-forward recurrence.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs">
          <span className="rounded-md bg-surface-muted px-2.5 py-1 font-medium text-foreground">
            All
          </span>
          <span className="px-2.5 py-1 text-foreground-muted">Today</span>
          <span className="px-2.5 py-1 text-foreground-muted">Upcoming</span>
          <span className="px-2.5 py-1 text-foreground-muted">Completed</span>
        </div>
      </div>

      {/* Quick-Add Task Shell */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-2xs">
        <Plus className="h-4 w-4 text-domain-task" />
        <span className="text-sm text-foreground-muted">
          Add a task... (Press Enter to save, Tab to indent subtask in Phase 3)
        </span>
      </div>

      {/* Task List Preview */}
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {SAMPLE_TASKS.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-surface-muted/40"
          >
            <div className="flex items-center gap-2.5">
              <GripVertical className="h-4 w-4 text-foreground-muted/60" />
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded border border-border bg-background"
              />
              <span className="text-sm text-foreground">{task.title}</span>
            </div>

            <div className="flex items-center gap-2">
              {task.recurring && (
                <Repeat
                  className="h-3.5 w-3.5 text-foreground-muted"
                   aria-label="Recurring task"
                />
              )}
              <Badge variant="secondary">{task.project}</Badge>
              <span className="text-xs text-foreground-muted">{task.due}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
