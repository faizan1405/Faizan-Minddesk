"use client";

import * as React from "react";
import {
  ChevronDown,
  Star,
} from "lucide-react";

import type { TaskItem, TaskList, TaskSubtask } from "../types";
import { TaskRow } from "./task-row";

export interface StarredTasksViewProps {
  taskLists: TaskList[];
  tasks: TaskItem[];
  expandedTaskIds: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onToggleComplete: (task: TaskItem) => void;
  onToggleStar: (task: TaskItem) => void;
  onTaskClick: (task: TaskItem) => void;
  onUpdateTask: (taskId: string, patch: Partial<TaskItem>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: TaskItem) => void;
  onMoveTaskToList: (taskId: string, targetListId: string) => void;
  onPromoteSubtask: (task: TaskItem, subtask: TaskSubtask) => void;
}

export function StarredTasksView({
  taskLists,
  tasks,
  expandedTaskIds,
  onToggleExpand,
  onToggleComplete,
  onToggleStar,
  onTaskClick,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onMoveTaskToList,
  onPromoteSubtask,
}: StarredTasksViewProps) {
  const [isCompletedOpen, setIsCompletedOpen] = React.useState(false);

  // Filter tasks that are starred
  const starredTasks = React.useMemo(() => {
    return tasks.filter((t) => t.starred);
  }, [tasks]);

  const activeStarred = React.useMemo(() => {
    return starredTasks.filter((t) => !t.complete);
  }, [starredTasks]);

  const completedStarred = React.useMemo(() => {
    return starredTasks.filter((t) => t.complete);
  }, [starredTasks]);

  // Group by list for convenient viewing or direct display
  const listLookup = React.useMemo(() => {
    const map = new Map<string, TaskList>();
    taskLists.forEach((l) => map.set(l.id, l));
    return map;
  }, [taskLists]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
            <Star className="size-5 fill-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Starred tasks
            </h2>
            <p className="text-xs text-muted-foreground">
              Priorities and highlights gathered from all lists
            </p>
          </div>
        </div>

        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {activeStarred.length} active
        </span>
      </div>

      {/* Active Starred Tasks */}
      <div className="space-y-3">
        {activeStarred.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
            <Star className="mx-auto size-8 text-muted-foreground/30 mb-2" />
            <h3 className="text-sm font-semibold text-foreground">
              No starred tasks
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Star important tasks from any list to keep them in focus here.
            </p>
          </div>
        ) : (
          activeStarred.map((task) => {
            const list = task.listId ? listLookup.get(task.listId) : undefined;
            return (
              <div key={task.id} className="space-y-1">
                {list && (
                  <div className="px-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <span>In</span>
                    <span className="font-semibold text-foreground">
                      {list.title}
                    </span>
                  </div>
                )}
                <TaskRow
                  task={task}
                  taskLists={taskLists}
                  isExpanded={expandedTaskIds.has(task.id)}
                  onToggleExpand={onToggleExpand}
                  onToggleComplete={onToggleComplete}
                  onToggleStar={onToggleStar}
                  onClick={onTaskClick}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                  onDuplicate={onDuplicateTask}
                  onMoveToList={onMoveTaskToList}
                  onPromoteSubtask={onPromoteSubtask}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Completed Starred Section */}
      {completedStarred.length > 0 && (
        <div className="pt-4 border-t border-border/80">
          <button
            type="button"
            onClick={() => setIsCompletedOpen(!isCompletedOpen)}
            className="flex w-full items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>Completed ({completedStarred.length})</span>
            <ChevronDown
              className={`size-3.5 transition-transform ${
                isCompletedOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isCompletedOpen && (
            <div className="mt-3 space-y-3">
              {completedStarred.map((task) => {
                const list = task.listId ? listLookup.get(task.listId) : undefined;
                return (
                  <div key={task.id} className="space-y-1">
                    {list && (
                      <div className="px-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <span>In</span>
                        <span className="font-semibold text-foreground">
                          {list.title}
                        </span>
                      </div>
                    )}
                    <TaskRow
                      task={task}
                      taskLists={taskLists}
                      isExpanded={expandedTaskIds.has(task.id)}
                      onToggleExpand={onToggleExpand}
                      onToggleComplete={onToggleComplete}
                      onToggleStar={onToggleStar}
                      onClick={onTaskClick}
                      onUpdate={onUpdateTask}
                      onDelete={onDeleteTask}
                      onDuplicate={onDuplicateTask}
                      onMoveToList={onMoveTaskToList}
                      onPromoteSubtask={onPromoteSubtask}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
