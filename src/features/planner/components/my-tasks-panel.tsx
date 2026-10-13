"use client";

import React, { useState, useMemo } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { PlannerTask, TaskPriority } from "@/features/calendar/types";
import { useOptionalDeskData } from "@/features/minddesk/store";
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
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { isBefore, parseISO, startOfDay } from "date-fns";
import Link from "next/link";

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

  const deskContext = useOptionalDeskData();

  const taskLists = deskContext?.data?.taskLists || [
    { id: "list-my-tasks", title: "My Tasks" },
    { id: "list-skills", title: "Sharpen My Skills" },
    { id: "list-projects", title: "Website Projects" },
    { id: "list-routine", title: "Daily Routine" },
  ];

  const [filterTab, setFilterTab] = useState<FilterTab>("today");
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");
  const [newTaskDuration, setNewTaskDuration] = useState<number>(45);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const plan = getDailyPlan(currentDateStr);
  const priorityIds = useMemo(
    () => new Set(plan.topPriorityTaskIds || []),
    [plan.topPriorityTaskIds]
  );

  const todayDateObj = useMemo(() => startOfDay(new Date()), []);

  // Filter tasks based on active tab, selected task list, and search query
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by task list
    if (selectedListId !== "all") {
      result = result.filter((t) => t.listId === selectedListId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.note?.toLowerCase().includes(q)
      );
    }

    // Filter by tab
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
  }, [tasks, selectedListId, searchQuery, filterTab, currentDateStr, priorityIds, todayDateObj]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle.trim(),
      dueDate: filterTab === "today" ? currentDateStr : undefined,
      priority: newTaskPriority,
      completed: false,
      isStarred: filterTab === "starred",
      estimatedMinutes: newTaskDuration,
      listId: selectedListId !== "all" ? selectedListId : "list-my-tasks",
    });

    setNewTaskTitle("");
    setIsQuickAddOpen(false);
  };

  const handleDragStart = (e: React.DragEvent, task: PlannerTask) => {
    const payload = {
      taskId: task.id,
      title: task.title,
      estimatedMinutes: task.estimatedMinutes || 60,
      priority: task.priority,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-card text-card-foreground p-3.5 sm:p-4 shadow-xs space-y-3 overflow-hidden">
      {/* Panel Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
            Task Library
          </h2>
          <p className="text-[11px] text-muted-foreground truncate">
            Drag into timeline or click Schedule
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>New Task</span>
        </button>
      </div>

      {/* Quick Add Task Form */}
      {isQuickAddOpen && (
        <form
          onSubmit={handleQuickAdd}
          className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2.5 motion-safe:animate-fade-in"
        >
          <input
            type="text"
            autoFocus
            placeholder="Task title (e.g. Complete design review)"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary shadow-2xs"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground cursor-pointer"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <select
                value={newTaskDuration}
                onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                className="rounded-lg border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground cursor-pointer"
              >
                <option value={15}>15m est.</option>
                <option value={30}>30m est.</option>
                <option value={45}>45m est.</option>
                <option value={60}>60m est.</option>
                <option value={90}>90m est.</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
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
                Add Task
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List Selector & Search Bar */}
      <div className="flex items-center gap-2">
        {/* Task List Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            aria-label="Filter by task list"
            className="appearance-none rounded-xl border border-input bg-background pl-2.5 pr-6 py-1.5 text-xs font-semibold text-foreground focus:outline-primary cursor-pointer shadow-2xs"
          >
            <option value="all">All Lists</option>
            {taskLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-2.5 text-muted-foreground"
          />
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-7 pr-2.5 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary shadow-2xs"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-border">
        {(
          [
            { id: "today", label: "Today" },
            { id: "starred", label: "Starred" },
            { id: "overdue", label: "Overdue" },
            { id: "unscheduled", label: "Unscheduled" },
            { id: "all", label: "All Tasks" },
          ] as const
        ).map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

      {/* Tasks Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[380px]">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <CheckSquare size={32} className="stroke-1 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-semibold text-foreground">No tasks found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Add a new task or switch filters above.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isTopPriority = priorityIds.has(task.id);
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
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                className={`group relative flex items-start gap-2 rounded-xl border p-2.5 transition-all cursor-grab active:cursor-grabbing ${
                  isCompleted
                    ? "border-border bg-muted/30 opacity-70"
                    : "border-border bg-card shadow-2xs hover:border-primary/50 hover:shadow-xs"
                }`}
              >
                {/* Drag Handle */}
                <div
                  className="pt-0.5 text-muted-foreground/40 group-hover:text-primary transition-colors cursor-grab"
                  title="Drag onto timeline to schedule"
                >
                  <GripVertical size={14} />
                </div>

                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTaskComplete(task.id)}
                  aria-label={`Toggle completion for ${task.title}`}
                  className="pt-0.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {isCompleted ? (
                    <CheckSquare size={16} className="text-emerald-500" />
                  ) : (
                    <Square size={16} className="text-muted-foreground group-hover:text-primary" />
                  )}
                </button>

                {/* Task Details */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold leading-snug truncate ${
                      isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`rounded px-1 py-0.2 font-bold uppercase border text-[9px] ${priorityBadge}`}>
                      {task.priority || "med"}
                    </span>

                    {task.dueDate && (
                      <span className="flex items-center gap-0.5 font-medium">
                        <CalendarIcon size={9} />
                        <span>{task.dueDate}</span>
                      </span>
                    )}

                    {task.estimatedMinutes && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <Clock size={9} />
                        <span>{task.estimatedMinutes}m</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {/* Star toggle */}
                  <button
                    type="button"
                    onClick={() => toggleTaskStar(task.id)}
                    aria-label={`Star ${task.title}`}
                    className="p-1 text-muted-foreground hover:text-amber-500 cursor-pointer transition-colors"
                  >
                    <Star
                      size={13}
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
                    <Target size={13} />
                  </button>

                  {/* Clear "Schedule" action button */}
                  <button
                    type="button"
                    onClick={() => onScheduleTask(task)}
                    title="Schedule time block on timeline"
                    className="flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Clock size={10} />
                    <span>Schedule</span>
                  </button>

                  {/* Delete Task */}
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    title="Delete task"
                    aria-label={`Delete ${task.title}`}
                    className="p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer note: Drag tip & Task Manager link */}
      <div className="border-t border-border pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <GripVertical size={11} className="text-primary" />
          <span>Tip: Drag tasks onto timeline</span>
        </span>
        <Link
          href="/tasks"
          className="hover:text-primary transition-colors flex items-center gap-1 font-semibold text-foreground/80"
        >
          <span>Open Tasks</span>
          <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}
