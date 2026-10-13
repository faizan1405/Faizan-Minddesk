"use client";

import { useState, useMemo } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { PlannerTask, TaskPriority } from "@/features/calendar/types";
import {
  CheckSquare,
  Square,
  Star,
  Plus,
  Search,
  GripVertical,
  Calendar as CalendarIcon,
  Clock,
  Target,
  Trash2,
} from "lucide-react";
import { isBefore, parseISO, startOfDay } from "date-fns";

interface MyTasksPanelProps {
  currentDateStr: string;
  onScheduleTask: (task: PlannerTask) => void;
}

type FilterTab = "today" | "starred" | "overdue" | "unscheduled" | "all";

export function MyTasksPanel({ currentDateStr, onScheduleTask }: MyTasksPanelProps) {
  const {
    tasks,
    addTask,
    toggleTaskComplete,
    toggleTaskStar,
    deleteTask,
    getDailyPlan,
    addDailyPriority,
    removeDailyPriority,
  } = useCalendar();

  const [filterTab, setFilterTab] = useState<FilterTab>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const plan = getDailyPlan(currentDateStr);
  const priorityIds = useMemo(
    () => new Set(plan.topPriorityTaskIds || []),
    [plan.topPriorityTaskIds]
  );

  const todayDateObj = useMemo(() => startOfDay(new Date()), []);

  // Filter tasks based on active tab and search query
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.note?.toLowerCase().includes(q)
      );
    }

    switch (filterTab) {
      case "today":
        return result.filter(
          (t) =>
            t.dueDate === currentDateStr ||
            t.due === "Today" ||
            priorityIds.has(t.id)
        );
      case "starred":
        return result.filter((t) => t.isStarred || t.starred);
      case "overdue":
        return result.filter((t) => {
          if (!t.dueDate || t.completed) return false;
          try {
            const dueObj = parseISO(t.dueDate);
            return isBefore(dueObj, todayDateObj);
          } catch {
            return false;
          }
        });
      case "unscheduled":
        return result.filter((t) => !t.dueDate && t.due !== "Today");
      case "all":
      default:
        return result;
    }
  }, [tasks, filterTab, searchQuery, currentDateStr, priorityIds, todayDateObj]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle.trim(),
      dueDate: filterTab === "today" ? currentDateStr : undefined,
      priority: newTaskPriority,
      completed: false,
      isStarred: filterTab === "starred",
      estimatedMinutes: 45,
    });

    setNewTaskTitle("");
    setIsQuickAddOpen(false);
  };

  const handleDragStart = (e: React.DragEvent, task: PlannerTask) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task.id, title: task.title }));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card text-card-foreground p-4 sm:p-5 shadow-xs space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">My Tasks</h2>
          <p className="text-xs text-muted-foreground">
            Select priorities or drag into the schedule
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
          className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Quick Add Task Form */}
      {isQuickAddOpen && (
        <form onSubmit={handleQuickAdd} className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 motion-safe:animate-fade-in">
          <input
            type="text"
            autoFocus
            placeholder="What needs to be done?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary"
          />
          <div className="flex items-center justify-between">
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              className="rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer shadow-2xs transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-border">
        {(
          [
            { id: "today", label: "Today" },
            { id: "starred", label: "Starred" },
            { id: "overdue", label: "Overdue" },
            { id: "unscheduled", label: "Unscheduled" },
            { id: "all", label: "All" },
          ] as const
        ).map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-foreground text-background shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary"
        />
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[350px]">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <CheckSquare size={32} className="stroke-1 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-semibold text-foreground">No tasks in this list</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Add a new task or switch filters above.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isTopPriority = priorityIds.has(task.id);
            const isCompleted = task.completed;

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                className={`group relative flex items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all cursor-grab active:cursor-grabbing ${
                  isCompleted
                    ? "border-border bg-muted/30 opacity-70"
                    : "border-border bg-card shadow-2xs hover:border-primary/50 hover:shadow-xs"
                }`}
              >
                {/* Drag Handle */}
                <div className="pt-0.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  <GripVertical size={14} />
                </div>

                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTaskComplete(task.id)}
                  aria-label={`Toggle completion for ${task.title}`}
                  className="pt-0.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isCompleted ? (
                    <CheckSquare size={16} className="text-emerald-500" />
                  ) : (
                    <Square size={16} className="text-muted-foreground group-hover:text-primary" />
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold leading-snug ${
                      isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    {task.dueDate && (
                      <span className="flex items-center gap-1 font-medium">
                        <CalendarIcon size={10} className="text-muted-foreground" />
                        <span>Due {task.dueDate}</span>
                      </span>
                    )}
                    {task.estimatedMinutes && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={10} />
                        <span>{task.estimatedMinutes}m</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick action buttons on hover / mobile */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Star toggle */}
                  <button
                    type="button"
                    onClick={() => toggleTaskStar(task.id)}
                    aria-label={`Star ${task.title}`}
                    className="p-1 text-muted-foreground hover:text-amber-500 cursor-pointer transition-colors"
                  >
                    <Star
                      size={14}
                      className={task.isStarred ? "fill-amber-400 text-amber-500" : ""}
                    />
                  </button>

                  {/* Priority Shelf Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isTopPriority) {
                        removeDailyPriority(currentDateStr, task.id);
                      } else {
                        addDailyPriority(currentDateStr, task.id);
                      }
                    }}
                    title={isTopPriority ? "Remove from top priorities" : "Add to top priorities"}
                    aria-label={isTopPriority ? "Remove from top priorities" : "Add to top priorities"}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      isTopPriority
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Target size={14} />
                  </button>

                  {/* Time Block button */}
                  <button
                    type="button"
                    onClick={() => onScheduleTask(task)}
                    title="Schedule dedicated focus time"
                    className="rounded-md bg-muted hover:bg-primary/10 hover:text-primary px-2 py-0.5 text-[10px] font-bold text-foreground transition-colors cursor-pointer"
                  >
                    Block
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    title="Delete task"
                    aria-label={`Delete ${task.title}`}
                    className="p-1 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
