"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  GripVertical,
  MoreVertical,
  Plus,
  Repeat,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskItem, TaskList, TaskSubtask } from "../types";
import { parseLocalDate } from "./recurrence";

export interface TaskRowProps {
  task: TaskItem;
  taskLists: TaskList[];
  isExpanded: boolean;
  onToggleExpand: (taskId: string) => void;
  onToggleComplete: (task: TaskItem) => void;
  onToggleStar: (task: TaskItem) => void;
  onClick: (task: TaskItem) => void;
  onUpdate: (taskId: string, patch: Partial<TaskItem>) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: TaskItem) => void;
  onMoveToList: (taskId: string, targetListId: string) => void;
  onPromoteSubtask: (task: TaskItem, subtask: TaskSubtask) => void;
}

export function TaskRow({
  task,
  taskLists,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onToggleStar,
  onClick,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveToList,
  onPromoteSubtask,
}: TaskRowProps) {
  const [subtaskDraft, setSubtaskDraft] = React.useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasksCount = hasSubtasks
    ? task.subtasks.filter((s) => s.complete).length
    : 0;

  function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const title = subtaskDraft.trim();
    if (!title) return;
    const newSub: TaskSubtask = {
      id: crypto.randomUUID(),
      title,
      complete: false,
      order: task.subtasks.length,
    };
    onUpdate(task.id, { subtasks: [...task.subtasks, newSub] });
    setSubtaskDraft("");
  }

  function handleToggleSubtask(e: React.MouseEvent, subId: string) {
    e.stopPropagation();
    const updated = task.subtasks.map((s) =>
      s.id === subId ? { ...s, complete: !s.complete } : s
    );
    onUpdate(task.id, { subtasks: updated });
  }

  function handleDeleteSubtask(e: React.MouseEvent, subId: string) {
    e.stopPropagation();
    const updated = task.subtasks.filter((s) => s.id !== subId);
    onUpdate(task.id, { subtasks: updated });
  }

  // Format due date badge
  const dueFormatted = React.useMemo(() => {
    if (!task.due) return null;
    const base = parseLocalDate(task.due);
    const today = parseLocalDate("today");
    const diffDays = Math.round(
      (base.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let text = "";
    let isOverdue = false;

    if (diffDays === 0) text = "Today";
    else if (diffDays === 1) text = "Tomorrow";
    else if (diffDays < 0) {
      text = diffDays === -1 ? "Yesterday" : base.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (!task.complete) isOverdue = true;
    } else {
      text = base.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    if (task.dueTime) {
      text += ` ${task.dueTime}`;
    }

    return { text, isOverdue };
  }, [task.due, task.dueTime, task.complete]);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border border-border/70 bg-card p-3 shadow-xs transition-all duration-150 hover:border-border hover:shadow-sm ${
        isDragging ? "opacity-30 z-30 shadow-lg ring-2 ring-primary" : ""
      } ${task.complete ? "opacity-60 bg-muted/20" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-foreground active:cursor-grabbing transition-opacity"
          aria-label="Drag to reorder task"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </button>

        {/* Circular Checkbox */}
        <button
          type="button"
          aria-label={task.complete ? `Reopen ${task.title}` : `Complete ${task.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          className={`minddesk-task-check mt-0.5 grid size-5 shrink-0 place-items-center rounded-full transition-all duration-180 ${
            task.complete
              ? "border-primary bg-primary text-primary-foreground shadow-xs"
              : "border-border hover:border-primary/70 text-transparent"
          }`}
        >
          <Check className={`size-3.5 transition-transform ${task.complete ? "scale-100" : "scale-0"}`} />
        </button>

        {/* Content area: Title & description, click opens modal */}
        <div
          className="flex-1 min-w-0 cursor-pointer select-none"
          onClick={() => onClick(task)}
        >
          <h4
            className={`text-sm font-medium leading-snug break-words transition-colors ${
              task.complete
                ? "text-muted-foreground line-through"
                : "text-foreground group-hover:text-primary/95"
            }`}
          >
            {task.title}
          </h4>

          {task.note && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {task.note}
            </p>
          )}

          {/* Chips & Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {dueFormatted && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${
                  dueFormatted.isOverdue
                    ? "bg-coral/20 text-coral-ink"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CalendarDays className="size-3" />
                <span>{dueFormatted.text}</span>
              </span>
            )}

            {task.recurrence && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-primary font-medium"
                title="Recurring task"
              >
                <Repeat className="size-3" />
              </span>
            )}

            {hasSubtasks && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(task.id);
                }}
                className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Toggle subtasks view"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                <span>
                  {completedSubtasksCount}/{task.subtasks.length} subtasks
                </span>
              </button>
            )}

            {task.priority !== "medium" && (
              <span
                className={`rounded px-1.5 py-0.5 capitalize ${
                  task.priority === "high"
                    ? "bg-coral text-coral-ink font-medium"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {task.priority}
              </span>
            )}
          </div>
        </div>

        {/* Right side actions: Star & Menu */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            aria-label={task.starred ? "Remove from starred" : "Add to starred"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(task);
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Star
              className={`size-4 transition-colors ${
                task.starred
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              }`}
            />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                aria-label="Task options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onClick(task)}>
                Details
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to list</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {taskLists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      disabled={list.id === task.listId}
                      onClick={() => onMoveToList(task.id, list.id)}
                    >
                      {list.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {!task.recurrence && (
                <DropdownMenuItem onClick={() => onToggleExpand(task.id)}>
                  Add subtask
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => onDuplicate(task)}>
                Duplicate
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Indented Subtasks Section */}
      {isExpanded && !task.recurrence && (
        <div className="mt-3 ml-7 space-y-2 border-l border-border pl-3 pt-1">
          {task.subtasks.map((sub) => (
            <div
              key={sub.id}
              className="group/sub flex items-center gap-2 text-xs py-0.5"
            >
              <button
                type="button"
                onClick={(e) => handleToggleSubtask(e, sub.id)}
                className={`grid size-3.5 place-items-center rounded-full border transition-all ${
                  sub.complete
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent hover:border-primary/70"
                }`}
                aria-label={sub.complete ? "Reopen subtask" : "Complete subtask"}
              >
                <Check className="size-2.5" />
              </button>

              <span
                className={`flex-1 truncate ${
                  sub.complete ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {sub.title}
              </span>

              <button
                type="button"
                title="Promote subtask to main task"
                aria-label="Promote subtask to main task"
                onClick={(e) => {
                  e.stopPropagation();
                  onPromoteSubtask(task, sub);
                }}
                className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity"
              >
                <CornerDownRight className="size-3" />
              </button>

              <button
                type="button"
                aria-label="Delete subtask"
                onClick={(e) => handleDeleteSubtask(e, sub.id)}
                className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}

          <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-1">
            <Plus className="size-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Add subtask…"
              value={subtaskDraft}
              onChange={(e) => setSubtaskDraft(e.target.value)}
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            {subtaskDraft.trim() && (
              <Button type="submit" variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                Add
              </Button>
            )}
          </form>
        </div>
      )}
    </article>
  );
}
