"use client";

import * as React from "react";
import {
  Circle,
  Star,
  Trash2,
  ChevronDown,
  ListPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Priority, RecurrenceRule, TaskItem, TaskSubtask } from "../types";
import { TaskDatePicker } from "./task-date-picker";

export interface TaskInlineComposerProps {
  listId: string;
  onSave: (task: TaskItem) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

export function TaskInlineComposer({
  listId,
  onSave,
  onCancel,
  autoFocus = true,
}: TaskInlineComposerProps) {
  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [due, setDue] = React.useState("");
  const [dueTime, setDueTime] = React.useState<string | undefined>();
  const [starred, setStarred] = React.useState(false);
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [recurrence, setRecurrence] = React.useState<RecurrenceRule | undefined>();
  const [subtasks, setSubtasks] = React.useState<TaskSubtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = React.useState("");
  const [isExpanded, setIsExpanded] = React.useState(false);

  const titleInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (autoFocus) {
      titleInputRef.current?.focus();
    }
  }, [autoFocus]);

  function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed) return;

    // Compile subtasks, checking if recurring items allow subtasks
    const finalSubtasks = recurrence ? [] : subtasks;

    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      listId,
      title: trimmed,
      note: note.trim(),
      due: due || "Today",
      dueTime,
      priority,
      complete: false,
      starred,
      order: 0,
      subtasks: finalSubtasks,
      recurrence,
      recurringSeriesId: recurrence ? crypto.randomUUID() : undefined,
    };

    onSave(newTask);

    // Reset draft fields so user can rapidly add another task
    setTitle("");
    setNote("");
    setDue("");
    setDueTime(undefined);
    setStarred(false);
    setRecurrence(undefined);
    setSubtasks([]);
    setSubtaskDraft("");
    setIsExpanded(false);
    titleInputRef.current?.focus();
  }

  function handleAddSubtask() {
    const trimmed = subtaskDraft.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: trimmed,
        complete: false,
        order: prev.length,
      },
    ]);
    setSubtaskDraft("");
  }

  function handleRemoveSubtask(subId: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
  }

  return (
    <div className="mb-3 rounded-xl border border-primary/30 bg-card p-3 shadow-sm transition-all duration-200">
      <div className="flex items-start gap-2.5">
        <Circle className="size-4 shrink-0 mt-1 text-muted-foreground/50" />
        <div className="flex-1 min-w-0">
          <input
            ref={titleInputRef}
            type="text"
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCreate();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
          />

          {/* Quick detail toggle or expand */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TaskDatePicker
              due={due}
              dueTime={dueTime}
              recurrence={recurrence}
              onDueDateChange={setDue}
              onDueTimeChange={setDueTime}
              onRecurrenceChange={setRecurrence}
            />

            <button
              type="button"
              onClick={() => setStarred(!starred)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                starred
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
              aria-label={starred ? "Unstar" : "Star"}
            >
              <Star className={`size-3.5 ${starred ? "fill-amber-500" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <span>{isExpanded ? "Fewer details" : "Add details"}</span>
              <ChevronDown className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details: Notes, subtasks, priority */}
      {isExpanded && (
        <div className="mt-3 space-y-2.5 border-t border-border pt-2.5 pl-6">
          <textarea
            className="w-full resize-none rounded-md border border-input bg-background/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="Details / notes…"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {/* Subtasks in composer */}
          {!recurrence && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <ListPlus className="size-3" /> Subtasks
              </span>

              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="truncate">{sub.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(sub.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove subtask"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Add a subtask…"
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 rounded-md border border-input bg-background/50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAddSubtask}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {recurrence && (
            <p className="text-[11px] text-muted-foreground italic">
              Recurring tasks cannot have subtasks in Google Tasks.
            </p>
          )}

          {/* Priority selector */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">Priority:</span>
            {(["low", "medium", "high"] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${
                  priority === p
                    ? p === "high"
                      ? "bg-coral text-coral-ink font-semibold"
                      : p === "medium"
                        ? "bg-sky text-sky-ink font-semibold"
                        : "bg-muted text-foreground font-semibold"
                    : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer action footer */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          disabled={!title.trim()}
          onClick={handleCreate}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
