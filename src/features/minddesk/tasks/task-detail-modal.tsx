"use client";

import * as React from "react";
import {
  Check,
  Copy,
  CornerDownRight,
  ListPlus,
  MoreVertical,
  Star,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  Priority,
  TaskItem,
  TaskList,
  TaskSubtask,
} from "../types";
import { TaskDatePicker } from "./task-date-picker";

export interface TaskDetailModalProps {
  task: TaskItem | null;
  taskLists: TaskList[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (taskId: string, patch: Partial<TaskItem>) => void;
  onToggleComplete: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: TaskItem) => void;
  onPromoteSubtask: (task: TaskItem, subtask: TaskSubtask) => void;
}

export function TaskDetailModal({
  task,
  taskLists,
  open,
  onOpenChange,
  onUpdate,
  onToggleComplete,
  onDelete,
  onDuplicate,
  onPromoteSubtask,
}: TaskDetailModalProps) {
  const [subtaskDraft, setSubtaskDraft] = React.useState("");

  if (!task) return null;

  const currentList = taskLists.find((l) => l.id === task.listId) || taskLists[0];

  function handleAddSubtask(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!task) return;
    const title = subtaskDraft.trim();
    if (!title) return;

    const newSub: TaskSubtask = {
      id: crypto.randomUUID(),
      title,
      complete: false,
      order: task.subtasks.length,
    };

    onUpdate(task.id, {
      subtasks: [...task.subtasks, newSub],
    });
    setSubtaskDraft("");
  }

  function handleToggleSubtask(subId: string) {
    if (!task) return;
    const updated = task.subtasks.map((s) =>
      s.id === subId ? { ...s, complete: !s.complete } : s
    );
    onUpdate(task.id, { subtasks: updated });
  }

  function handleEditSubtaskTitle(subId: string, title: string) {
    if (!task) return;
    const updated = task.subtasks.map((s) =>
      s.id === subId ? { ...s, title } : s
    );
    onUpdate(task.id, { subtasks: updated });
  }

  function handleDeleteSubtask(subId: string) {
    if (!task) return;
    const updated = task.subtasks.filter((s) => s.id !== subId);
    onUpdate(task.id, { subtasks: updated });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-border bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>
        {/* Header with list selector and top actions */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground font-medium">List:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-accent transition-colors text-foreground"
                >
                  <span className="truncate max-w-[160px]">{currentList?.title || "My Tasks"}</span>
                  <ArrowRightLeft className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {taskLists.map((list) => (
                  <DropdownMenuItem
                    key={list.id}
                    onClick={() => onUpdate(task.id, { listId: list.id })}
                    className={list.id === task.listId ? "font-semibold bg-accent" : ""}
                  >
                    {list.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={task.starred ? "Unstar task" : "Star task"}
              onClick={() => onUpdate(task.id, { starred: !task.starred })}
            >
              <Star
                className={`size-4 ${
                  task.starred
                    ? "fill-amber-500 text-amber-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="More task options">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDuplicate(task)}>
                  <Copy className="size-3.5 mr-2" /> Duplicate task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    onDelete(task.id);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="size-3.5 mr-2" /> Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto minddesk-scrollbar">
          {/* Completion state toggle and Title */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border transition-all ${
                task.complete
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/60 text-transparent"
              }`}
              onClick={() => onToggleComplete(task)}
              aria-label={task.complete ? "Mark uncompleted" : "Mark completed"}
            >
              <Check className="size-3.5" />
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={task.title}
                onChange={(e) => onUpdate(task.id, { title: e.target.value })}
                className={`w-full bg-transparent text-base font-semibold outline-none text-foreground placeholder:text-muted-foreground ${
                  task.complete ? "line-through text-muted-foreground" : ""
                }`}
                placeholder="Task title"
              />
            </div>
          </div>

          {/* Details / Notes */}
          <div className="space-y-1.5 pl-8">
            <label htmlFor="task-description-input" className="text-xs font-medium text-muted-foreground">Details</label>
            <textarea
              id="task-description-input"
              rows={3}
              value={task.note}
              onChange={(e) => onUpdate(task.id, { note: e.target.value })}
              className="w-full resize-y rounded-lg border border-input bg-background/50 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              placeholder="Add details, notes, or links…"
            />
          </div>

          {/* Date, Time & Recurrence */}
          <div className="pl-8 flex flex-wrap items-center gap-3">
            <TaskDatePicker
              due={task.due}
              dueTime={task.dueTime}
              recurrence={task.recurrence}
              onDueDateChange={(due) => onUpdate(task.id, { due })}
              onDueTimeChange={(dueTime) => onUpdate(task.id, { dueTime })}
              onRecurrenceChange={(recurrence) => {
                // If recurring, Google Tasks clears subtasks
                if (recurrence && task.subtasks.length > 0) {
                  onUpdate(task.id, { recurrence, subtasks: [] });
                } else {
                  onUpdate(task.id, { recurrence });
                }
              }}
            />

            {/* Priority pill selector */}
            <div className="flex items-center gap-1.5 border border-border rounded-full px-2 py-0.5 text-xs">
              <span className="text-[10px] text-muted-foreground">Priority:</span>
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdate(task.id, { priority: p })}
                  className={`rounded-full px-2 py-0.5 text-[10px] capitalize transition-colors ${
                    task.priority === p
                      ? p === "high"
                        ? "bg-coral text-coral-ink font-semibold"
                        : p === "medium"
                          ? "bg-sky text-sky-ink font-semibold"
                          : "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="pl-8 pt-2 space-y-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ListPlus className="size-3.5 text-primary" /> Subtasks
                {task.subtasks.length > 0 && (
                  <span className="text-muted-foreground text-[11px] font-normal">
                    ({task.subtasks.filter((s) => s.complete).length}/{task.subtasks.length})
                  </span>
                )}
              </span>
            </div>

            {task.recurrence ? (
              <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg border border-border">
                Google Tasks rule: Recurring tasks cannot have subtasks. Remove repetition to add subtasks.
              </p>
            ) : (
              <div className="space-y-1.5">
                {task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-background/50 px-2.5 py-1.5 transition-colors hover:bg-accent/40"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(sub.id)}
                      className={`grid size-4 place-items-center rounded-full border transition-all ${
                        sub.complete
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent hover:border-primary/60"
                      }`}
                      aria-label={sub.complete ? "Reopen subtask" : "Complete subtask"}
                    >
                      <Check className="size-3" />
                    </button>

                    <input
                      type="text"
                      value={sub.title}
                      onChange={(e) => handleEditSubtaskTitle(sub.id, e.target.value)}
                      className={`flex-1 min-w-0 bg-transparent text-xs outline-none text-foreground ${
                        sub.complete ? "line-through text-muted-foreground" : ""
                      }`}
                    />

                    {/* Promote to main task button */}
                    <button
                      type="button"
                      title="Promote subtask to main task"
                      aria-label="Promote subtask to main task"
                      onClick={() => onPromoteSubtask(task, sub)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-primary transition-opacity"
                    >
                      <CornerDownRight className="size-3.5" />
                    </button>

                    {/* Delete subtask */}
                    <button
                      type="button"
                      aria-label="Delete subtask"
                      onClick={() => handleDeleteSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}

                {/* Inline add subtask input */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a subtask and press Enter…"
                    value={subtaskDraft}
                    onChange={(e) => setSubtaskDraft(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!subtaskDraft.trim()}
                  >
                    Add
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Delete and Done */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              onDelete(task.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="size-3.5 mr-1.5" /> Delete
          </Button>

          <Button
            type="button"
            size="sm"
            className="text-xs px-4"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
