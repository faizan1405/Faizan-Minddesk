"use client";

import { useCalendar } from "@/features/calendar/calendar-context";
import { PlannerTask } from "@/features/calendar/types";
import {
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  X,
  Target,
  Sparkles,
} from "lucide-react";

interface TodaysPrioritiesShelfProps {
  currentDateStr: string;
  onOpenSchedule: (task: PlannerTask) => void;
}

export function TodaysPrioritiesShelf({
  currentDateStr,
  onOpenSchedule,
}: TodaysPrioritiesShelfProps) {
  const {
    tasks,
    getDailyPlan,
    reorderDailyPriorities,
    removeDailyPriority,
    toggleTaskComplete,
  } = useCalendar();

  const plan = getDailyPlan(currentDateStr);
  const priorityIds = plan.topPriorityTaskIds || [];

  const priorityTasks = priorityIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is PlannerTask => !!t);

  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...priorityIds];
    const temp = next[idx - 1];
    next[idx - 1] = next[idx];
    next[idx] = temp;
    reorderDailyPriorities(currentDateStr, next);
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= priorityIds.length - 1) return;
    const next = [...priorityIds];
    const temp = next[idx + 1];
    next[idx + 1] = next[idx];
    next[idx] = temp;
    reorderDailyPriorities(currentDateStr, next);
  };

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shadow-2xs border border-amber-500/20">
            <Target size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>Today&apos;s Top Priorities</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                {priorityTasks.length} / 3
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Focus on these core outcomes before moving to lower-priority work.
            </p>
          </div>
        </div>
      </div>

      {priorityTasks.length === 0 ? (
        <div className="mt-3.5 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-6 text-center">
          <Sparkles className="size-6 text-amber-400 mb-1.5" />
          <p className="text-xs font-semibold text-foreground">No top priorities chosen for today</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Star or click &quot;Add to Top 3&quot; on any task in the left panel to lock your focus.
          </p>
        </div>
      ) : (
        <div className="mt-3.5 space-y-2">
          {priorityTasks.map((task, idx) => {
            const isCompleted = task.completed;
            const priorityBadge = {
              urgent: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400",
              high: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
              medium: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
              low: "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400",
            }[task.priority || "medium"];

            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                  isCompleted
                    ? "border-border bg-muted/30 opacity-80"
                    : "border-border bg-background shadow-2xs hover:border-primary/50"
                }`}
              >
                {/* Left: Priority Rank, Checkbox & Title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(task.id)}
                    aria-label={`Toggle completion for ${task.title}`}
                    className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isCompleted ? (
                      <CheckSquare size={17} className="text-emerald-500" />
                    ) : (
                      <Square size={17} className="text-muted-foreground group-hover:text-primary" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span className={`rounded px-1.5 py-0.5 font-bold uppercase border ${priorityBadge}`}>
                        {task.priority}
                      </span>
                      {task.estimatedMinutes && (
                        <span>~{task.estimatedMinutes} mins est.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick actions (Schedule block, Reorder, Remove) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenSchedule(task)}
                    title="Schedule time block"
                    className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    Time Block
                  </button>

                  <div className="flex items-center rounded-lg bg-muted p-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      title="Move up"
                      aria-label="Move priority up"
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === priorityTasks.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      title="Move down"
                      aria-label="Move priority down"
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDailyPriority(currentDateStr, task.id)}
                    title="Remove from priorities"
                    aria-label="Remove priority"
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
