"use client";

import React from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { PlannerTask } from "@/features/calendar/types";
import { formatTimeDisplay } from "@/features/calendar/services/calendar-layout";
import {
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  X,
  Target,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
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
    scheduledBlocks,
    settings,
    getDailyPlan,
    reorderDailyPriorities,
    removeDailyPriority,
    toggleTaskComplete,
  } = useCalendar();

  const plan = getDailyPlan(currentDateStr);
  const priorityIds = plan.topPriorityTaskIds || [];

  const priorityTasks = priorityIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is PlannerTask => Boolean(t));

  // Find scheduled blocks for this date
  const dayBlocks = scheduledBlocks.filter((b) => b.date === currentDateStr);

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
    <div className="rounded-2xl border border-border bg-card text-card-foreground p-3.5 sm:p-4 shadow-xs">
      {/* Shelf Header */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shadow-2xs border border-amber-500/20">
            <Target size={15} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>Today&apos;s Top 3 Priorities</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[10px] font-bold text-primary border border-primary/20">
                {priorityTasks.length} / 3
              </span>
            </h3>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Core outcomes to complete today before moving to lower-priority work.
            </p>
          </div>
        </div>
      </div>

      {/* Priorities List */}
      {priorityTasks.length === 0 ? (
        <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-5 text-center">
          <Sparkles className="size-5 text-amber-400 mb-1" />
          <p className="text-xs font-semibold text-foreground">No top priorities selected for this day</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Star or prioritize tasks in My Tasks to lock them into your top 3.
          </p>
        </div>
      ) : (
        <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2">
          {priorityTasks.map((task, idx) => {
            const isCompleted = task.completed;

            // Check if scheduled
            const linkedBlocks = dayBlocks.filter((b) => b.taskId === task.id);
            const isScheduled = linkedBlocks.length > 0;
            const primaryBlock = linkedBlocks[0];

            return (
              <div
                key={task.id}
                className={`group relative flex flex-col justify-between rounded-xl border p-2.5 sm:p-3 transition-all ${
                  isCompleted
                    ? "border-emerald-300/40 bg-emerald-500/5 opacity-80"
                    : "border-border bg-background shadow-2xs hover:border-primary/50"
                }`}
              >
                {/* Top Row: Rank Badge, Title, Reorder, Remove */}
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-extrabold text-foreground">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleTaskComplete(task.id)}
                        aria-label={`Toggle completion for ${task.title}`}
                        className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {isCompleted ? (
                          <CheckSquare size={15} className="text-emerald-500" />
                        ) : (
                          <Square size={15} className="text-muted-foreground group-hover:text-primary" />
                        )}
                      </button>

                      <p
                        className={`text-xs font-semibold truncate ${
                          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </p>
                    </div>

                    {/* Reorder and Delete */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        title="Move priority up"
                        aria-label="Move priority up"
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === priorityTasks.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        title="Move priority down"
                        aria-label="Move priority down"
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDailyPriority(currentDateStr, task.id)}
                        title="Remove from priorities"
                        aria-label="Remove priority"
                        className="p-0.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Scheduling Status Badge + Action */}
                <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-border/50 pt-2">
                  {/* Scheduling status per Section 10 */}
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={11} />
                      <span>Completed</span>
                    </span>
                  ) : isScheduled ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      <Clock size={11} />
                      <span>
                        Scheduled at {formatTimeDisplay(primaryBlock.startTime, settings.timeFormat)}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <AlertCircle size={11} />
                      <span>Not scheduled</span>
                    </span>
                  )}

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => onOpenSchedule(task)}
                      title="Schedule focus time block"
                      className="rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {isScheduled ? "Reschedule" : "Schedule"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
