"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Plus,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeskData } from "./store";
import type { TaskItem, TaskList, TaskSubtask } from "./types";
import { initialTaskLists } from "./seed";
import { handleTaskCompletion } from "./tasks/recurrence";
import { TaskListColumn } from "./tasks/task-list-column";
import { TaskDetailModal } from "./tasks/task-detail-modal";
import { StarredTasksView } from "./tasks/starred-tasks-view";
import { TaskShortcutsDialog } from "./tasks/task-shortcuts-dialog";
import { TaskRow } from "./tasks/task-row";

export type ViewFilter = "All" | "Today" | "Starred" | "Completed" | string;

export interface TasksViewProps {
  filter?: string;
  initialTaskId?: string;
}

export function TasksView({
  filter: initialFilter = "Today",
  initialTaskId,
}: TasksViewProps = {}) {
  const { data, update, selectedItem, setSelectedItem, registerDeletedId } = useDeskData();
  const searchParams = useSearchParams();

  // Active view filter: "All", "Today", "Starred", "Completed", or a specific listId
  const [activeView, setActiveView] = React.useState<ViewFilter>(initialFilter);

  React.useEffect(() => {
    if (!searchParams) return;
    const filterParam = searchParams.get("filter");
    const listParam = searchParams.get("list");
    if (filterParam) {
      setActiveView(filterParam);
    } else if (listParam) {
      setActiveView(listParam);
    }
  }, [searchParams]);
  const [editingTask, setEditingTask] = React.useState<TaskItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = React.useState<Set<string>>(new Set());
  const [isNewListDialogOpen, setIsNewListDialogOpen] = React.useState(false);
  const [newListTitle, setNewListTitle] = React.useState("");
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = React.useState(false);
  const [quickDraft, setQuickDraft] = React.useState("");

  // Undo notification state
  const [undoAction, setUndoAction] = React.useState<{
    message: string;
    undo: () => void;
  } | null>(null);

  // Active item being dragged for drag preview overlay
  const [activeDragItem, setActiveDragItem] = React.useState<{
    type: "column" | "task";
    data: TaskList | TaskItem;
  } | null>(null);

  // Horizontal scroll ref
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  // Selected task from external prop
  React.useEffect(() => {
    const targetId = initialTaskId ?? selectedItem;
    if (targetId) {
      const found = data.tasks.find((t) => t.id === targetId);
      if (found) {
        setEditingTask(found);
        setIsDetailModalOpen(true);
        if (selectedItem === targetId) {
          setSelectedItem(null);
        }
      }
    }
  }, [data.tasks, initialTaskId, selectedItem, setSelectedItem]);

  // Ensure task lists exist and are sorted by order
  const taskLists = React.useMemo(() => {
    const lists = data.taskLists && data.taskLists.length > 0 ? data.taskLists : initialTaskLists;
    return [...lists].sort((a, b) => a.order - b.order);
  }, [data.taskLists]);

  const primaryListId = taskLists[0]?.id || "list-my-tasks";

  // Check scroll bounds
  const updateScrollButtons = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons, taskLists.length]);

  function scrollHorizontal(direction: "left" | "right") {
    if (!scrollContainerRef.current) return;
    const offset = direction === "left" ? -350 : 350;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
  }

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // 6px movement required before drag begins, preserving clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag Handlers
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeId = String(active.id);

    if (activeId.startsWith("column-")) {
      const listId = activeId.replace("column-", "");
      const foundList = taskLists.find((l) => l.id === listId);
      if (foundList) {
        setActiveDragItem({ type: "column", data: foundList });
      }
    } else {
      const foundTask = data.tasks.find((t) => t.id === activeId);
      if (foundTask) {
        setActiveDragItem({ type: "task", data: foundTask });
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Case 1: Reordering Columns
    if (activeId.startsWith("column-") && overId.startsWith("column-")) {
      const sourceListId = activeId.replace("column-", "");
      const targetListId = overId.replace("column-", "");

      const oldIndex = taskLists.findIndex((l) => l.id === sourceListId);
      const newIndex = taskLists.findIndex((l) => l.id === targetListId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(taskLists, oldIndex, newIndex).map(
          (list, idx) => ({ ...list, order: idx })
        );
        update((curr) => ({ ...curr, taskLists: reordered }));
      }
      return;
    }

    // Case 2: Reordering Tasks
    if (!activeId.startsWith("column-")) {
      const activeTask = data.tasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      // Over might be another task or a column
      let targetListId = activeTask.listId;
      if (overId.startsWith("column-")) {
        targetListId = overId.replace("column-", "");
      } else {
        const overTask = data.tasks.find((t) => t.id === overId);
        if (overTask) {
          targetListId = overTask.listId;
        }
      }

      const tasksInTargetList = data.tasks
        .filter((t) => t.listId === targetListId && !t.complete)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const oldIndex = tasksInTargetList.findIndex((t) => t.id === activeId);
      const newIndex = tasksInTargetList.findIndex((t) => t.id === overId);

      update((curr) => {
        let updatedListTasks = [...tasksInTargetList];

        if (activeTask.listId !== targetListId) {
          // Moved across lists
          const movedTask: TaskItem = { ...activeTask, listId: targetListId };
          if (newIndex >= 0) {
            updatedListTasks.splice(newIndex, 0, movedTask);
          } else {
            updatedListTasks.push(movedTask);
          }
        } else if (oldIndex !== -1 && newIndex !== -1) {
          // Reordered within same list
          updatedListTasks = arrayMove(updatedListTasks, oldIndex, newIndex);
        }

        // Assign continuous orders
        const finalOrders = new Map<string, number>();
        updatedListTasks.forEach((t, idx) => finalOrders.set(t.id, idx));

        return {
          ...curr,
          tasks: curr.tasks.map((t) => {
            if (t.id === activeTask.id && activeTask.listId !== targetListId) {
              return {
                ...t,
                listId: targetListId,
                order: finalOrders.get(t.id) ?? t.order,
              };
            }
            if (finalOrders.has(t.id)) {
              return { ...t, order: finalOrders.get(t.id) };
            }
            return t;
          }),
        };
      });
    }
  }

  // Task Mutations
  function patchTask(taskId: string, patch: Partial<TaskItem>) {
    update((curr) => ({
      ...curr,
      tasks: curr.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
    if (editingTask && editingTask.id === taskId) {
      setEditingTask((prev) => (prev ? { ...prev, ...patch } : null));
    }
  }

  function handleToggleComplete(task: TaskItem) {
    const originalTask = { ...task };
    const { updatedCurrent, nextOccurrence } = handleTaskCompletion(
      task,
      data.tasks
    );

    update((curr) => {
      let nextTasks = curr.tasks.map((t) =>
        t.id === task.id ? updatedCurrent : t
      );
      if (nextOccurrence) {
        nextTasks = [nextOccurrence, ...nextTasks];
      }
      return { ...curr, tasks: nextTasks };
    });

    if (editingTask && editingTask.id === task.id) {
      setEditingTask(updatedCurrent);
    }

    // Set Undo action
    setUndoAction({
      message: updatedCurrent.complete ? `Completed "${task.title}"` : `Reopened "${task.title}"`,
      undo: () => {
        update((curr) => ({
          ...curr,
          tasks: curr.tasks
            .filter((t) => !nextOccurrence || t.id !== nextOccurrence.id)
            .map((t) => (t.id === task.id ? originalTask : t)),
        }));
        setUndoAction(null);
      },
    });
  }

  function handleToggleStar(task: TaskItem) {
    patchTask(task.id, { starred: !task.starred });
  }

  function handleDeleteTask(taskId: string) {
    const deleted = data.tasks.find((t) => t.id === taskId);
    if (!deleted) return;

    registerDeletedId("task", taskId);

    update((curr) => ({
      ...curr,
      tasks: curr.tasks.filter((t) => t.id !== taskId),
    }));

    if (editingTask && editingTask.id === taskId) {
      setEditingTask(null);
      setIsDetailModalOpen(false);
    }

    setUndoAction({
      message: `Deleted "${deleted.title}"`,
      undo: () => {
        update((curr) => ({
          ...curr,
          tasks: [deleted, ...curr.tasks],
        }));
        setUndoAction(null);
      },
    });
  }

  function handleDuplicateTask(task: TaskItem) {
    const dup: TaskItem = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} (copy)`,
      order: (task.order ?? 0) + 1,
      subtasks: task.subtasks.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
      })),
    };

    update((curr) => ({
      ...curr,
      tasks: [dup, ...curr.tasks],
    }));
  }

  function handleMoveTaskToList(taskId: string, targetListId: string) {
    patchTask(taskId, { listId: targetListId });
  }

  function handlePromoteSubtask(parentTask: TaskItem, subtask: TaskSubtask) {
    // 1. Remove subtask from parent
    const updatedSubtasks = parentTask.subtasks.filter(
      (s) => s.id !== subtask.id
    );
    patchTask(parentTask.id, { subtasks: updatedSubtasks });

    // 2. Create as top-level task in the same list
    const newTopTask: TaskItem = {
      id: crypto.randomUUID(),
      listId: parentTask.listId,
      title: subtask.title,
      note: `Promoted from "${parentTask.title}"`,
      due: parentTask.due || "Today",
      dueTime: parentTask.dueTime,
      priority: parentTask.priority,
      complete: subtask.complete,
      starred: false,
      order: 0,
      subtasks: [],
    };

    update((curr) => ({
      ...curr,
      tasks: [newTopTask, ...curr.tasks],
    }));
  }

  function handleAddTask(newTask: TaskItem) {
    update((curr) => ({
      ...curr,
      tasks: [newTask, ...curr.tasks],
    }));
  }

  function handleQuickAdd() {
    const title = quickDraft.trim();
    if (!title) return;
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      listId: primaryListId,
      title,
      note: "",
      due: "Today",
      priority: "medium",
      complete: false,
      starred: false,
      order: 0,
      subtasks: [],
    };
    handleAddTask(newTask);
    setQuickDraft("");
  }

  // List Management
  function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    const title = newListTitle.trim();
    if (!title) return;

    const newList: TaskList = {
      id: crypto.randomUUID(),
      title,
      order: taskLists.length,
      createdAt: new Date().toISOString(),
    };

    update((curr) => ({
      ...curr,
      taskLists: [...taskLists, newList],
    }));

    setNewListTitle("");
    setIsNewListDialogOpen(false);
    // Automatically switch or scroll
    setActiveView("All");
  }

  function handleRenameList(listId: string, newTitle: string) {
    update((curr) => ({
      ...curr,
      taskLists: (curr.taskLists || initialTaskLists).map((l) =>
        l.id === listId ? { ...l, title: newTitle } : l
      ),
    }));
  }

  function handleDeleteList(listId: string) {
    if (taskLists.length <= 1) return; // Cannot delete last remaining list
    const tasksInList = data.tasks.filter((t) => t.listId === listId);
    tasksInList.forEach((t) => registerDeletedId("task", t.id));
    update((curr) => ({
      ...curr,
      taskLists: (curr.taskLists || initialTaskLists).filter((l) => l.id !== listId),
      tasks: curr.tasks.filter((t) => t.listId !== listId),
    }));
    if (activeView === listId) {
      setActiveView("All");
    }
  }

  function toggleExpandTask(taskId: string) {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  // Keyboard navigation & global shortcuts scoped to Tasks
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs/textareas or Notes editor
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest(".ProseMirror"));

      if (isInput) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (undoAction) {
          e.preventDefault();
          undoAction.undo();
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsDialogOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoAction]);

  // View titles & headers
  const totalOpenTasks = data.tasks.filter((t) => !t.complete).length;
  const totalCompletedTasks = data.tasks.filter((t) => t.complete).length;

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] flex-col bg-background text-foreground">
      {/* Top Navigation & Toolbar Bar */}
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/95 px-4 sm:px-6 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Filter Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto minddesk-scrollbar py-0.5">
            <Button
              type="button"
              variant={activeView === "All" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg"
              onClick={() => setActiveView("All")}
            >
              <span>All lists</span>
              {totalOpenTasks > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({totalOpenTasks})
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant={activeView === "Today" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg"
              onClick={() => setActiveView("Today")}
            >
              Today
            </Button>

            <Button
              type="button"
              variant={activeView === "Starred" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg"
              onClick={() => setActiveView("Starred")}
            >
              <Star className="size-3.5 fill-amber-500 text-amber-500 mr-1" />
              Starred
            </Button>

            <Button
              type="button"
              variant={activeView === "Completed" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg"
              onClick={() => setActiveView("Completed")}
              aria-label="Completed"
            >
              <span>Completed</span>
              {totalCompletedTasks > 0 && (
                <span className="ml-1 text-[11px] opacity-75">
                  ({totalCompletedTasks})
                </span>
              )}
            </Button>

            {/* Individual List Pills */}
            <div className="hidden lg:flex items-center gap-1 border-l border-border/80 pl-2 ml-1">
              {taskLists.map((list) => {
                const count = data.tasks.filter(
                  (t) => t.listId === list.id && !t.complete
                ).length;
                return (
                  <Button
                    key={list.id}
                    type="button"
                    variant={activeView === list.id ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 text-xs rounded-lg max-w-[140px] truncate"
                    onClick={() => setActiveView(list.id)}
                  >
                    <span className="truncate">{list.title}</span>
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Horizontal Scroll Controls for Desktop Columns */}
            {activeView === "All" && (
              <div className="hidden md:flex items-center gap-0.5 border border-border/80 rounded-lg p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={!canScrollLeft}
                  onClick={() => scrollHorizontal("left")}
                  aria-label="Scroll lists left"
                  title="Scroll left"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={!canScrollRight}
                  onClick={() => scrollHorizontal("right")}
                  aria-label="Scroll lists right"
                  title="Scroll right"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-lg"
              onClick={() => setIsNewListDialogOpen(true)}
            >
              <Plus className="size-3.5" />
              <span>Create list</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              onClick={() => setIsShortcutsDialogOpen(true)}
            >
              <Keyboard className="size-4" />
            </Button>
          </div>
        </div>

        {/* Quick Task Input Bar (Available in Today / Completed / List views) */}
        {(activeView === "Today" || activeView === "All") && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-1.5 focus-within:border-primary/60 transition-colors">
            <Plus className="size-4 text-primary shrink-0" />
            <input
              type="text"
              aria-label="Add a task"
              placeholder="Add a task and press Enter…"
              value={quickDraft}
              onChange={(e) => setQuickDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickAdd();
              }}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {quickDraft.trim() && (
              <Button size="sm" className="h-7 text-xs" onClick={handleQuickAdd}>
                Add task
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 min-h-0">
        {/* VIEW 1: Starred View */}
        {activeView === "Starred" ? (
          <StarredTasksView
            taskLists={taskLists}
            tasks={data.tasks}
            expandedTaskIds={expandedTaskIds}
            onToggleExpand={toggleExpandTask}
            onToggleComplete={handleToggleComplete}
            onToggleStar={handleToggleStar}
            onTaskClick={(task) => {
              setEditingTask(task);
              setIsDetailModalOpen(true);
            }}
            onUpdateTask={patchTask}
            onDeleteTask={handleDeleteTask}
            onDuplicateTask={handleDuplicateTask}
            onMoveTaskToList={handleMoveTaskToList}
            onPromoteSubtask={handlePromoteSubtask}
          />
        ) : activeView === "Completed" ? (
          /* VIEW 2: All Completed Tasks View */
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Completed
              </h1>
              <span className="text-xs text-muted-foreground">
                {totalCompletedTasks} completed tasks
              </span>
            </div>

            {totalCompletedTasks === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-muted-foreground text-xs">
                No completed tasks yet. Completed tasks from all lists will appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {data.tasks
                  .filter((t) => t.complete)
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      taskLists={taskLists}
                      isExpanded={expandedTaskIds.has(task.id)}
                      onToggleExpand={toggleExpandTask}
                      onToggleComplete={handleToggleComplete}
                      onToggleStar={handleToggleStar}
                      onClick={(t) => {
                        setEditingTask(t);
                        setIsDetailModalOpen(true);
                      }}
                      onUpdate={patchTask}
                      onDelete={handleDeleteTask}
                      onDuplicate={handleDuplicateTask}
                      onMoveToList={handleMoveTaskToList}
                      onPromoteSubtask={handlePromoteSubtask}
                    />
                  ))}
              </div>
            )}
          </div>
        ) : activeView === "Today" ? (
          /* VIEW 3: Today View */
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Today
              </h1>
              <span className="text-xs text-muted-foreground">
                {data.tasks.filter((t) => t.due === "Today" && !t.complete).length} tasks due today
              </span>
            </div>

            <div className="space-y-2">
              {data.tasks
                .filter((t) => t.due === "Today" && !t.complete)
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    taskLists={taskLists}
                    isExpanded={expandedTaskIds.has(task.id)}
                    onToggleExpand={toggleExpandTask}
                    onToggleComplete={handleToggleComplete}
                    onToggleStar={handleToggleStar}
                    onClick={(t) => {
                      setEditingTask(t);
                      setIsDetailModalOpen(true);
                    }}
                    onUpdate={patchTask}
                    onDelete={handleDeleteTask}
                    onDuplicate={handleDuplicateTask}
                    onMoveToList={handleMoveTaskToList}
                    onPromoteSubtask={handlePromoteSubtask}
                  />
                ))}
            </div>
          </div>
        ) : (
          /* VIEW 4: Google Tasks Horizontal Columns ("All" or specific single list view) */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              ref={scrollContainerRef}
              className="flex h-[calc(100vh-140px)] gap-4 overflow-x-auto p-4 sm:p-6 minddesk-scrollbar overscroll-x-contain"
            >
              <SortableContext
                items={taskLists.map((l) => `column-${l.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {taskLists
                  .filter((l) => activeView === "All" || activeView === l.id)
                  .map((list) => {
                    const listTasks = data.tasks.filter(
                      (t) => t.listId === list.id
                    );

                    return (
                      <TaskListColumn
                        key={list.id}
                        list={list}
                        allLists={taskLists}
                        tasks={listTasks}
                        expandedTaskIds={expandedTaskIds}
                        onToggleExpand={toggleExpandTask}
                        onToggleComplete={handleToggleComplete}
                        onToggleStar={handleToggleStar}
                        onTaskClick={(task) => {
                          setEditingTask(task);
                          setIsDetailModalOpen(true);
                        }}
                        onUpdateTask={patchTask}
                        onDeleteTask={handleDeleteTask}
                        onDuplicateTask={handleDuplicateTask}
                        onMoveTaskToList={handleMoveTaskToList}
                        onPromoteSubtask={handlePromoteSubtask}
                        onAddTask={handleAddTask}
                        onRenameList={handleRenameList}
                        onDeleteList={handleDeleteList}
                      />
                    );
                  })}
              </SortableContext>
            </div>

            {/* Drag Overlay for smooth preview during drag */}
            <DragOverlay>
              {activeDragItem ? (
                activeDragItem.type === "column" ? (
                  <div className="w-[330px] rounded-2xl border-2 border-primary bg-card/95 p-4 shadow-2xl backdrop-blur-md">
                    <h3 className="font-semibold text-sm">
                      {(activeDragItem.data as TaskList).title}
                    </h3>
                  </div>
                ) : (
                  <div className="w-[300px] rounded-xl border-2 border-primary bg-card/95 p-3 shadow-2xl backdrop-blur-md">
                    <p className="text-sm font-medium">
                      {(activeDragItem.data as TaskItem).title}
                    </p>
                  </div>
                )
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={editingTask}
        taskLists={taskLists}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onUpdate={patchTask}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDeleteTask}
        onDuplicate={handleDuplicateTask}
        onPromoteSubtask={handlePromoteSubtask}
      />

      {/* Create New List Dialog */}
      <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
        <DialogContent className="max-w-xs p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Create new list
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateList} className="space-y-4 pt-2">
            <input
              type="text"
              autoFocus
              placeholder="Enter list title…"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring text-foreground"
            />
            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsNewListDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newListTitle.trim()}
              >
                Done
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <TaskShortcutsDialog
        open={isShortcutsDialogOpen}
        onOpenChange={setIsShortcutsDialogOpen}
      />

      {/* Floating Undo Toast Banner */}
      {undoAction && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="Undo banner"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-medium text-foreground shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3"
        >
          <span>{undoAction.message}</span>
          <button
            type="button"
            onClick={undoAction.undo}
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <RotateCcw className="size-3" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setUndoAction(null)}
            className="text-muted-foreground hover:text-foreground ml-1"
            aria-label="Dismiss undo notification"
          >
            <X className="size-3.5" />
          </button>
        </aside>
      )}
    </div>
  );
}
