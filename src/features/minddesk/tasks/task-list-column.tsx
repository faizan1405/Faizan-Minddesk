"use client";

import * as React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripHorizontal,
  MoreVertical,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskItem, TaskList, TaskSubtask } from "../types";
import { TaskRow } from "./task-row";
import { TaskInlineComposer } from "./task-inline-composer";
import { parseLocalDate } from "./recurrence";

export type TaskSortOption = "my-order" | "due-date" | "starred" | "title";

export interface TaskListColumnProps {
  list: TaskList;
  allLists: TaskList[];
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
  onAddTask: (task: TaskItem) => void;
  onRenameList: (listId: string, newTitle: string) => void;
  onDeleteList: (
    listId: string,
    options?: { destinationListId?: string; deleteTasks?: boolean }
  ) => void;
}

export function TaskListColumn({
  list,
  allLists,
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
  onAddTask,
  onRenameList,
  onDeleteList,
}: TaskListColumnProps) {
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [isCompletedOpen, setIsCompletedOpen] = React.useState(false);
  const [sortOption, setSortOption] = React.useState<TaskSortOption>("my-order");
  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState(list.title);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  const otherLists = React.useMemo(
    () => allLists.filter((l) => l.id !== list.id),
    [allLists, list.id]
  );
  const [deleteHandlingMode, setDeleteHandlingMode] = React.useState<"move" | "delete">("move");
  const [targetDestinationListId, setTargetDestinationListId] = React.useState<string>(() => {
    const fallback = allLists.find((l) => l.id !== list.id);
    return fallback?.id || "";
  });

  React.useEffect(() => {
    if (!otherLists.some((l) => l.id === targetDestinationListId)) {
      setTargetDestinationListId(otherLists[0]?.id || "");
    }
  }, [otherLists, targetDestinationListId]);

  // Column drag-and-drop sortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${list.id}`,
    data: {
      type: "column",
      list,
    },
  });

  const columnStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Split tasks into active and completed
  const activeTasks = React.useMemo(() => {
    const active = tasks.filter((t) => !t.complete);

    return [...active].sort((a, b) => {
      if (sortOption === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === "starred") {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return (a.order ?? 0) - (b.order ?? 0);
      }
      if (sortOption === "due-date") {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return parseLocalDate(a.due).getTime() - parseLocalDate(b.due).getTime();
      }
      // "my-order"
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [tasks, sortOption]);

  const completedTasks = React.useMemo(() => {
    return tasks.filter((t) => t.complete);
  }, [tasks]);

  const activeTaskIds = React.useMemo(() => {
    return activeTasks.map((t) => t.id);
  }, [activeTasks]);

  function handleSaveRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== list.title) {
      onRenameList(list.id, trimmed);
    }
    setIsRenameOpen(false);
  }

  return (
    <>
      <section
        ref={setNodeRef}
        style={columnStyle}
        data-testid={`task-column-${list.id}`}
        className={`flex h-full w-[320px] sm:w-[330px] shrink-0 flex-col rounded-2xl border border-border/70 bg-card/80 shadow-xs backdrop-blur-xs transition-shadow duration-200 hover:shadow-md ${
          isDragging ? "opacity-40 ring-2 ring-primary z-20" : ""
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground/40 hover:text-foreground active:cursor-grabbing p-0.5"
              aria-label="Reorder list column"
            >
              <GripHorizontal className="size-4" />
            </button>

            <h3
              className="truncate text-sm font-semibold tracking-tight text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                setRenameValue(list.title);
                setIsRenameOpen(true);
              }}
              title="Click to rename list"
            >
              {list.title}
            </h3>

            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {activeTasks.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label={`Add a task to ${list.title}`}
              title="Add a task"
              onClick={() => setIsComposerOpen(true)}
            >
              <Plus className="size-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  aria-label="List options"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setRenameValue(list.title);
                    setIsRenameOpen(true);
                  }}
                >
                  <Edit2 className="size-3.5 mr-2" /> Rename list
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  Sort by
                </div>
                <DropdownMenuRadioGroup
                  value={sortOption}
                  onValueChange={(val) => setSortOption(val as TaskSortOption)}
                >
                  <DropdownMenuRadioItem value="my-order">
                    My order
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="due-date">
                    Due date
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="starred">
                    Starred first
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title">
                    Title
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={allLists.length <= 1}
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 className="size-3.5 mr-2" /> Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Scrollable Column Content */}
        <div className="minddesk-scrollbar flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Inline Task Composer */}
          {isComposerOpen ? (
            <TaskInlineComposer
              listId={list.id}
              onSave={(newTask) => {
                onAddTask(newTask);
              }}
              onCancel={() => setIsComposerOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-border/80 px-3.5 py-2.5 text-xs text-muted-foreground transition-all duration-150 hover:border-primary/50 hover:bg-card hover:text-foreground hover:shadow-xs group"
            >
              <Plus className="size-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">Add a task</span>
            </button>
          )}

          {/* Sortable Active Tasks Zone */}
          <SortableContext
            items={activeTaskIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 min-h-[50px]">
              {activeTasks.length === 0 && !isComposerOpen ? (
                <div className="py-8 text-center text-xs text-muted-foreground/70">
                  <p>No active tasks</p>
                  <p className="text-[11px] mt-0.5">Click &quot;Add a task&quot; above</p>
                </div>
              ) : (
                activeTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    taskLists={allLists}
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
                ))
              )}
            </div>
          </SortableContext>

          {/* Collapsible Completed Section */}
          {completedTasks.length > 0 && (
            <div className="pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                className="flex w-full items-center justify-between py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={isCompletedOpen}
              >
                <span>Completed ({completedTasks.length})</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    isCompletedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isCompletedOpen && (
                <div className="mt-2 space-y-2">
                  {completedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      taskLists={allLists}
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
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="max-w-xs p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Rename list</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRename} className="space-y-4 pt-2">
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Delete &ldquo;{list.title}&rdquo;?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5">
              {tasks.length === 0 ? (
                "This list is empty and will be permanently removed. This action cannot be undone."
              ) : (
                `This list contains ${tasks.length} ${
                  tasks.length === 1 ? "task" : "tasks"
                }. By default, tasks will be preserved by moving them to another list.`
              )}
            </DialogDescription>
          </DialogHeader>

          {tasks.length > 0 && otherLists.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-accent/30 p-3 text-xs cursor-pointer transition-colors hover:bg-accent/50">
                  <input
                    type="radio"
                    name={`delete-handling-${list.id}`}
                    value="move"
                    checked={deleteHandlingMode === "move"}
                    onChange={() => setDeleteHandlingMode("move")}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="flex-1 space-y-1.5">
                    <span className="font-medium text-foreground">
                      Move tasks to another list (Recommended)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Preserves all {tasks.length} tasks and keeps your productivity data safe.
                    </p>
                    {deleteHandlingMode === "move" && (
                      <select
                        aria-label="Destination list"
                        className="mt-1.5 w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        value={targetDestinationListId}
                        onChange={(e) => setTargetDestinationListId(e.target.value)}
                      >
                        {otherLists.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs cursor-pointer transition-colors hover:bg-destructive/10">
                  <input
                    type="radio"
                    name={`delete-handling-${list.id}`}
                    value="delete"
                    checked={deleteHandlingMode === "delete"}
                    onChange={() => setDeleteHandlingMode("delete")}
                    className="mt-0.5 accent-destructive"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-destructive">
                      Permanently delete all {tasks.length} tasks
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Both the list and its tasks will be permanently removed.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onDeleteList(list.id, {
                  destinationListId:
                    deleteHandlingMode === "move" ? targetDestinationListId : undefined,
                  deleteTasks: deleteHandlingMode === "delete",
                });
                setIsDeleteConfirmOpen(false);
              }}
            >
              Delete list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
