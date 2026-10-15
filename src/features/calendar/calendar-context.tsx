"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  CalendarCategory,
  CalendarEvent,
  CalendarSettings,
  CalendarViewType,
  DailyPlan,
  ExpandedCalendarEvent,
  MindDeskStoreData,
  PlannerTask,
  RecurrenceException,
  ScheduledTaskBlock,
} from "./types";
import {
  PlannerCategory,
  PlannerRoutine,
  PlannerRoutineException,
  FocusSession,
  DEFAULT_PLANNER_CATEGORIES,
} from "@/features/planner/types";
import {
  loadMindDeskStore,
  saveMindDeskStore,
  exportCalendarBackup,
  importCalendarBackup,
  STORAGE_EVENT_NAME,
} from "./services/calendar-storage";
import { expandEventsForRange } from "./services/recurrence-engine";
import { getInitialSeedData } from "./services/calendar-defaults";
import { useOptionalDeskData } from "@/features/minddesk/store";
import type { TaskItem } from "@/features/minddesk/types";
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
  parseISO,
  isBefore,
  isAfter,
} from "date-fns";

export interface CalendarContextType {
  isLoaded: boolean;
  selectedDate: Date;
  view: CalendarViewType;
  setSelectedDate: (date: Date) => void;
  setView: (view: CalendarViewType) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;

  // Data
  events: CalendarEvent[];
  categories: CalendarCategory[];
  exceptions: RecurrenceException[];
  scheduledBlocks: ScheduledTaskBlock[];
  tasks: PlannerTask[];
  dailyPlans: Record<string, DailyPlan>;
  settings: CalendarSettings;
  projects: Array<{ id: string; name: string; color?: string; hue?: string }>;
  notes: Array<{ id: string; title: string }>;

  // Expand helper
  getEventsForRange: (start: Date, end: Date) => ExpandedCalendarEvent[];

  // Event actions
  addEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string, scope?: "this" | "series", occurrenceDate?: string) => void;
  duplicateEvent: (id: string) => CalendarEvent | null;
  rescheduleEvent: (id: string, newStartDate: string, newStartTime?: string, newEndDate?: string, newEndTime?: string) => void;
  updateEventOccurrence: (originalEventId: string, occurrenceDate: string, updates: Partial<CalendarEvent>) => void;

  // Category actions
  toggleCategoryVisibility: (categoryId: string) => void;
  addCategory: (category: Omit<CalendarCategory, "id">) => CalendarCategory;
  updateCategory: (id: string, updates: Partial<CalendarCategory>) => void;

  // Task actions
  addTask: (task: Omit<PlannerTask, "id" | "createdAt" | "updatedAt">) => PlannerTask;
  updateTask: (id: string, updates: Partial<PlannerTask>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  toggleTaskStar: (id: string) => void;

  // Scheduled Task Blocks
  scheduleTaskBlock: (
    taskIdOrPayload?: string | (Partial<ScheduledTaskBlock> & { title?: string }),
    date?: string,
    startTime?: string,
    durationMinutes?: number,
    options?: Partial<ScheduledTaskBlock>
  ) => ScheduledTaskBlock;
  updateTaskBlock: (blockId: string, updates: Partial<ScheduledTaskBlock>) => void;
  deleteTaskBlock: (blockId: string) => void;
  duplicateTaskBlock: (blockId: string) => ScheduledTaskBlock | null;
  rescheduleTaskBlock: (
    blockId: string,
    newDate: string,
    newStartTime: string,
    newEndTime?: string
  ) => void;
  getScheduledBlocksForRange: (start: Date, end: Date) => ScheduledTaskBlock[];

  // Daily Plan actions
  getDailyPlan: (dateStr: string) => DailyPlan;
  setDailyTopPriorities: (dateStr: string, taskIds: string[]) => void;
  addDailyPriority: (dateStr: string, taskId: string) => void;
  removeDailyPriority: (dateStr: string, taskId: string) => void;
  reorderDailyPriorities: (dateStr: string, taskIds: string[]) => void;
  updateDailyNotes: (dateStr: string, notes: string) => void;

  // Settings & Backup
  updateSettings: (settings: Partial<CalendarSettings>) => void;
  exportBackup: () => void;
  restoreBackup: (json: string) => void;

  // Planner Categories & Routines
  plannerCategories: PlannerCategory[];
  setPlannerCategories: (categories: PlannerCategory[]) => void;
  addPlannerCategory: (category: Omit<PlannerCategory, "id">) => PlannerCategory;
  updatePlannerCategory: (id: string, updates: Partial<PlannerCategory>) => void;
  deletePlannerCategory: (id: string, reassignCategoryId?: string) => void;

  plannerRoutines: PlannerRoutine[];
  addPlannerRoutine: (routine: Omit<PlannerRoutine, "id" | "createdAt" | "updatedAt">) => PlannerRoutine;
  updatePlannerRoutine: (id: string, updates: Partial<PlannerRoutine>) => void;
  deletePlannerRoutine: (id: string) => void;

  plannerExceptions: PlannerRoutineException[];
  addPlannerException: (exception: Omit<PlannerRoutineException, "id" | "createdAt">) => PlannerRoutineException;
  deletePlannerException: (id: string) => void;

  focusSessions: FocusSession[];
  addFocusSession: (session: Omit<FocusSession, "id"> & { id?: string }) => FocusSession;
}

const CalendarContext = createContext<CalendarContextType | null>(null);

/**
 * Normalizes a MindDesk TaskItem into a PlannerTask with compatible aliases.
 */
function normalizeTaskItem(task: TaskItem, dailyPlan?: DailyPlan): PlannerTask {
  let dueDateStr = task.due;
  const today = format(new Date(), "yyyy-MM-dd");
  if (task.due === "Today") {
    dueDateStr = today;
  } else if (task.due === "Tomorrow") {
    dueDateStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  } else if (task.due === "Yesterday") {
    dueDateStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  }

  const isTodayPriority = dailyPlan?.topPriorityTaskIds?.includes(task.id) ?? false;
  const priorityIndex = dailyPlan?.topPriorityTaskIds?.indexOf(task.id) ?? -1;

  return {
    ...task,
    completed: task.complete,
    dueDate: dueDateStr,
    description: task.note,
    isStarred: task.starred,
    isTodayPriority,
    priorityOrder: priorityIndex >= 0 ? priorityIndex + 1 : undefined,
    estimatedMinutes: (task as unknown as { estimatedMinutes?: number }).estimatedMinutes ?? 45,
    category: task.projectId,
  };
}

function CalendarProviderInner({ children }: { children: React.ReactNode }) {
  // Check if rendered within MindDesk workspace
  const deskContext = useOptionalDeskData();

  const [localStore, setLocalStore] = useState<MindDeskStoreData>(getInitialSeedData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarViewType>("month");

  // Load from storage or initialize
  useEffect(() => {
    const loaded = loadMindDeskStore();
    setLocalStore(loaded);
    if (loaded.settings?.defaultView) {
      setView(loaded.settings.defaultView);
    }
    setIsLoaded(true);

    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<MindDeskStoreData>;
      if (customEvent.detail) {
        setLocalStore(customEvent.detail);
      } else {
        setLocalStore(loadMindDeskStore());
      }
    };

    window.addEventListener(STORAGE_EVENT_NAME, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(STORAGE_EVENT_NAME, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Sync with DeskContext if available
  const deskData = deskContext?.data;
  const updateDeskData = deskContext?.update;

  const seed = useMemo(() => getInitialSeedData(), []);

  const events: CalendarEvent[] = useMemo(() => {
    if (deskData?.events && Array.isArray(deskData.events)) {
      return deskData.events;
    }
    return localStore.events || seed.events;
  }, [deskData?.events, localStore.events, seed.events]);

  const categories: CalendarCategory[] = useMemo(() => {
    if (deskData?.categories && Array.isArray(deskData.categories)) {
      return deskData.categories;
    }
    return localStore.categories || seed.categories;
  }, [deskData?.categories, localStore.categories, seed.categories]);

  const exceptions: RecurrenceException[] = useMemo(() => {
    if (deskData?.exceptions && Array.isArray(deskData.exceptions)) {
      return deskData.exceptions;
    }
    return localStore.exceptions || seed.exceptions;
  }, [deskData?.exceptions, localStore.exceptions, seed.exceptions]);

  const scheduledBlocks: ScheduledTaskBlock[] = useMemo(() => {
    if (deskData?.scheduledBlocks && Array.isArray(deskData.scheduledBlocks)) {
      return deskData.scheduledBlocks;
    }
    return localStore.scheduledBlocks || seed.scheduledBlocks;
  }, [deskData?.scheduledBlocks, localStore.scheduledBlocks, seed.scheduledBlocks]);

  const dailyPlans: Record<string, DailyPlan> = useMemo(() => {
    if (deskData?.dailyPlans && typeof deskData.dailyPlans === "object") {
      return deskData.dailyPlans;
    }
    return localStore.dailyPlans || seed.dailyPlans;
  }, [deskData?.dailyPlans, localStore.dailyPlans, seed.dailyPlans]);

  const settings: CalendarSettings = useMemo(() => {
    if (deskData?.calendarSettings && typeof deskData.calendarSettings === "object") {
      return deskData.calendarSettings;
    }
    return localStore.settings || seed.settings;
  }, [deskData?.calendarSettings, localStore.settings, seed.settings]);

  const plannerCategories: PlannerCategory[] = useMemo(() => {
    if (deskData?.plannerCategories && Array.isArray(deskData.plannerCategories) && deskData.plannerCategories.length > 0) {
      return deskData.plannerCategories;
    }
    if (localStore.plannerCategories && Array.isArray(localStore.plannerCategories) && localStore.plannerCategories.length > 0) {
      return localStore.plannerCategories;
    }
    return DEFAULT_PLANNER_CATEGORIES;
  }, [deskData?.plannerCategories, localStore.plannerCategories]);

  const plannerRoutines: PlannerRoutine[] = useMemo(() => {
    if (deskData?.plannerRoutines && Array.isArray(deskData.plannerRoutines)) {
      return deskData.plannerRoutines;
    }
    return localStore.plannerRoutines || [];
  }, [deskData?.plannerRoutines, localStore.plannerRoutines]);

  const plannerExceptions: PlannerRoutineException[] = useMemo(() => {
    if (deskData?.plannerExceptions && Array.isArray(deskData.plannerExceptions)) {
      return deskData.plannerExceptions;
    }
    return localStore.plannerExceptions || [];
  }, [deskData?.plannerExceptions, localStore.plannerExceptions]);

  const focusSessions: FocusSession[] = useMemo(() => {
    if (deskData?.focusSessions && Array.isArray(deskData.focusSessions)) {
      return deskData.focusSessions;
    }
    return localStore.focusSessions || [];
  }, [deskData?.focusSessions, localStore.focusSessions]);

  const currentDateStr = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const currentPlan = dailyPlans[currentDateStr];

  // Map MindDesk's tasks or localStore tasks into normalized PlannerTask array
  const tasks: PlannerTask[] = useMemo(() => {
    if (deskData?.tasks && Array.isArray(deskData.tasks)) {
      return deskData.tasks.map((t) => normalizeTaskItem(t, currentPlan));
    }
    return (localStore.tasks || seed.tasks).map((t) => {
      const taskItem: TaskItem = {
        id: t.id,
        title: t.title,
        note: t.description || t.note || "",
        due: t.dueDate || t.due || "Today",
        dueTime: t.dueTime,
        priority: t.priority === "urgent" ? "high" : t.priority,
        complete: t.completed ?? t.complete ?? false,
        starred: t.isStarred ?? t.starred ?? false,
        projectId: t.projectId || t.category || "launch",
        subtasks: t.subtasks || [],
        order: t.order ?? 0,
      };
      return normalizeTaskItem(taskItem, currentPlan);
    });
  }, [deskData?.tasks, localStore.tasks, seed.tasks, currentPlan]);

  const projects = useMemo(() => {
    if (deskData?.projects && Array.isArray(deskData.projects)) {
      return deskData.projects;
    }
    return localStore.projects || seed.projects || [];
  }, [deskData?.projects, localStore.projects, seed.projects]);

  const notes = useMemo(() => {
    if (deskData?.notes && Array.isArray(deskData.notes)) {
      return deskData.notes;
    }
    return localStore.notes || seed.notes || [];
  }, [deskData?.notes, localStore.notes, seed.notes]);

  // Persist updater helper
  const updateAndPersist = useCallback(
    (updater: (prev: MindDeskStoreData) => MindDeskStoreData) => {
      if (updateDeskData) {
        updateDeskData((current) => {
          const currentStore: MindDeskStoreData = {
            version: 3,
            events: current.events ?? events,
            categories: current.categories ?? categories,
            exceptions: current.exceptions ?? exceptions,
            scheduledBlocks: current.scheduledBlocks ?? scheduledBlocks,
            tasks: (current.tasks as unknown as PlannerTask[]) ?? tasks,
            dailyPlans: current.dailyPlans ?? dailyPlans,
            settings: current.calendarSettings ?? settings,
            projects: current.projects,
            notes: current.notes,
            maps: current.maps,
            taskLists: current.taskLists,
            theme: current.theme,
            plannerCategories: current.plannerCategories ?? plannerCategories,
            plannerRoutines: current.plannerRoutines ?? plannerRoutines,
            plannerExceptions: current.plannerExceptions ?? plannerExceptions,
            focusSessions: current.focusSessions ?? focusSessions,
          };
          const next = updater(currentStore);
          // Sync to localStorage
          saveMindDeskStore(next);
          return {
            ...current,
            events: next.events,
            categories: next.categories,
            exceptions: next.exceptions,
            scheduledBlocks: next.scheduledBlocks,
            tasks: next.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              note: t.description || t.note || "",
              due: t.dueDate || t.due || "Today",
              dueTime: t.dueTime,
              priority: t.priority === "urgent" ? "high" : t.priority,
              complete: t.completed !== undefined ? t.completed : Boolean((t as unknown as { complete?: boolean }).complete),
              starred: t.isStarred !== undefined ? t.isStarred : Boolean((t as unknown as { starred?: boolean }).starred),
              projectId: t.projectId || t.category || "launch",
              listId: t.listId || "list-my-tasks",
              subtasks: t.subtasks || [],
              order: t.order ?? 0,
            })),
            dailyPlans: next.dailyPlans || {},
            calendarSettings: next.settings,
            plannerCategories: next.plannerCategories,
            plannerRoutines: next.plannerRoutines,
            plannerExceptions: next.plannerExceptions,
            focusSessions: next.focusSessions,
          };
        });
      } else {
        setLocalStore((prev) => {
          const next = updater(prev);
          saveMindDeskStore(next);
          return next;
        });
      }
    },
    [
      updateDeskData,
      events,
      categories,
      exceptions,
      scheduledBlocks,
      tasks,
      dailyPlans,
      settings,
      plannerCategories,
      plannerRoutines,
      plannerExceptions,
      focusSessions,
    ]
  );

  // Navigation handlers
  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    setSelectedDate((prev) => {
      switch (view) {
        case "month":
          return subMonths(prev, 1);
        case "week":
          return subWeeks(prev, 1);
        case "day":
          return subDays(prev, 1);
        case "agenda":
          return subMonths(prev, 1);
        default:
          return subMonths(prev, 1);
      }
    });
  }, [view]);

  const goToNext = useCallback(() => {
    setSelectedDate((prev) => {
      switch (view) {
        case "month":
          return addMonths(prev, 1);
        case "week":
          return addWeeks(prev, 1);
        case "day":
          return addDays(prev, 1);
        case "agenda":
          return addMonths(prev, 1);
        default:
          return addMonths(prev, 1);
      }
    });
  }, [view]);

  // Recurrence expansion
  const getEventsForRange = useCallback(
    (start: Date, end: Date) => {
      return expandEventsForRange(events, exceptions, start, end);
    },
    [events, exceptions]
  );

  // Event Actions
  const addEvent = useCallback(
    (eventInput: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): CalendarEvent => {
      const now = new Date().toISOString();
      const newEvent: CalendarEvent = {
        ...eventInput,
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };

      updateAndPersist((prev) => ({
        ...prev,
        events: [...prev.events, newEvent],
      }));

      return newEvent;
    },
    [updateAndPersist]
  );

  const updateEvent = useCallback(
    (id: string, updates: Partial<CalendarEvent>) => {
      const now = new Date().toISOString();
      updateAndPersist((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: now } : e
        ),
      }));
    },
    [updateAndPersist]
  );

  const deleteEvent = useCallback(
    (id: string, scope: "this" | "series" = "series", occurrenceDate?: string) => {
      if (scope === "this" && occurrenceDate) {
        // Create a cancellation exception for this date
        const newException: RecurrenceException = {
          id: `exc-${Date.now()}`,
          originalEventId: id,
          exceptionDate: occurrenceDate,
          isCancelled: true,
        };

        updateAndPersist((prev) => ({
          ...prev,
          exceptions: [...prev.exceptions, newException],
        }));
      } else {
        // Delete entire series and all related exceptions
        updateAndPersist((prev) => ({
          ...prev,
          events: prev.events.filter((e) => e.id !== id),
          exceptions: prev.exceptions.filter((ex) => ex.originalEventId !== id),
        }));
      }
    },
    [updateAndPersist]
  );

  const duplicateEvent = useCallback(
    (id: string): CalendarEvent | null => {
      const target = events.find((e) => e.id === id);
      if (!target) return null;

      const now = new Date().toISOString();
      const duplicated: CalendarEvent = {
        ...target,
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: `${target.title} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };

      updateAndPersist((prev) => ({
        ...prev,
        events: [...prev.events, duplicated],
      }));

      return duplicated;
    },
    [events, updateAndPersist]
  );

  const rescheduleEvent = useCallback(
    (
      id: string,
      newStartDate: string,
      newStartTime?: string,
      newEndDate?: string,
      newEndTime?: string
    ) => {
      updateAndPersist((prev) => ({
        ...prev,
        events: prev.events.map((e) => {
          if (e.id !== id) return e;
          return {
            ...e,
            startDate: newStartDate,
            startTime: newStartTime !== undefined ? newStartTime : e.startTime,
            endDate: newEndDate || newStartDate,
            endTime: newEndTime !== undefined ? newEndTime : e.endTime,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [updateAndPersist]
  );

  const updateEventOccurrence = useCallback(
    (originalEventId: string, occurrenceDate: string, updates: Partial<CalendarEvent>) => {
      const newException: RecurrenceException = {
        id: `exc-${Date.now()}`,
        originalEventId,
        exceptionDate: occurrenceDate,
        isCancelled: false,
        overrideData: updates,
      };

      updateAndPersist((prev) => ({
        ...prev,
        exceptions: [
          ...prev.exceptions.filter(
            (ex) => !(ex.originalEventId === originalEventId && ex.exceptionDate === occurrenceDate)
          ),
          newException,
        ],
      }));
    },
    [updateAndPersist]
  );

  // Category Actions
  const toggleCategoryVisibility = useCallback(
    (categoryId: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, isVisible: !c.isVisible } : c
        ),
      }));
    },
    [updateAndPersist]
  );

  const addCategory = useCallback(
    (categoryInput: Omit<CalendarCategory, "id">): CalendarCategory => {
      const newCat: CalendarCategory = {
        ...categoryInput,
        id: `cat-${Date.now()}`,
      };

      updateAndPersist((prev) => ({
        ...prev,
        categories: [...prev.categories, newCat],
      }));

      return newCat;
    },
    [updateAndPersist]
  );

  const updateCategory = useCallback(
    (id: string, updates: Partial<CalendarCategory>) => {
      updateAndPersist((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    },
    [updateAndPersist]
  );

  // Task Actions
  const addTask = useCallback(
    (taskInput: Omit<PlannerTask, "id" | "createdAt" | "updatedAt">): PlannerTask => {
      const now = new Date().toISOString();
      const newTask: PlannerTask = {
        ...taskInput,
        id: `task-${Date.now()}`,
        completed: taskInput.completed ?? false,
        complete: taskInput.completed ?? false,
        isStarred: taskInput.isStarred ?? false,
        starred: taskInput.isStarred ?? false,
        createdAt: now,
        updatedAt: now,
      };

      updateAndPersist((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));

      return newTask;
    },
    [updateAndPersist]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<PlannerTask>) => {
      updateAndPersist((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== id) return t;
          return {
            ...t,
            ...updates,
            completed: updates.completed !== undefined ? updates.completed : t.completed,
            complete: updates.completed !== undefined ? updates.completed : t.complete,
            isStarred: updates.isStarred !== undefined ? updates.isStarred : t.isStarred,
            starred: updates.isStarred !== undefined ? updates.isStarred : t.starred,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [updateAndPersist]
  );

  const deleteTask = useCallback(
    (id: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
        scheduledBlocks: prev.scheduledBlocks.filter((b) => b.taskId !== id),
      }));
    },
    [updateAndPersist]
  );

  const toggleTaskComplete = useCallback(
    (id: string) => {
      updateAndPersist((prev) => {
        let isNowCompleted = false;
        const nextTasks = prev.tasks.map((t) => {
          if (t.id === id) {
            isNowCompleted = !t.completed;
            return {
              ...t,
              completed: isNowCompleted,
              complete: isNowCompleted,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        });

        const nextBlocks = prev.scheduledBlocks.map((b) =>
          b.taskId === id ? { ...b, completed: isNowCompleted } : b
        );

        return {
          ...prev,
          tasks: nextTasks,
          scheduledBlocks: nextBlocks,
        };
      });
    },
    [updateAndPersist]
  );

  const toggleTaskStar = useCallback(
    (id: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                isStarred: !t.isStarred,
                starred: !t.isStarred,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }));
    },
    [updateAndPersist]
  );

  // Scheduled Task Blocks
  const scheduleTaskBlock = useCallback(
    (
      taskIdOrPayload?: string | (Partial<ScheduledTaskBlock> & { title?: string }),
      date = format(new Date(), "yyyy-MM-dd"),
      startTime = "10:00",
      durationMinutes = 60,
      options?: Partial<ScheduledTaskBlock>
    ): ScheduledTaskBlock => {
      let resolvedTaskId = typeof taskIdOrPayload === "string" ? taskIdOrPayload : undefined;
      let resolvedDate = date;
      let resolvedStartTime = startTime;
      let resolvedDuration = durationMinutes;
      let resolvedOptions: Partial<ScheduledTaskBlock> = options || {};

      if (typeof taskIdOrPayload === "object" && taskIdOrPayload !== null) {
        const payload = taskIdOrPayload;
        resolvedTaskId = payload.taskId;
        resolvedDate = payload.date || format(new Date(), "yyyy-MM-dd");
        resolvedStartTime = payload.startTime || "10:00";
        resolvedDuration = payload.durationMinutes || 60;
        resolvedOptions = payload;
      }

      const task = resolvedTaskId ? tasks.find((t) => t.id === resolvedTaskId) : null;
      const [h, m] = resolvedStartTime.split(":").map(Number);
      const startMins = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m);
      const endMins = startMins + resolvedDuration;
      const endHour = Math.floor(endMins / 60) % 24;
      const endMinute = endMins % 60;
      const computedEndTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

      const now = new Date().toISOString();
      const newBlock: ScheduledTaskBlock = {
        id: resolvedOptions?.id || `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        taskId: resolvedTaskId || resolvedOptions?.taskId,
        title: resolvedOptions?.title || (task ? task.title : "Focus Work Session"),
        date: resolvedDate,
        startTime: resolvedStartTime,
        endTime: resolvedOptions?.endTime || computedEndTime,
        durationMinutes: resolvedDuration,
        color: resolvedOptions?.color || (task?.priority === "urgent" ? "#ef4444" : "#2563eb"),
        completed: resolvedOptions?.completed !== undefined ? resolvedOptions.completed : (task ? task.completed : false),
        description: resolvedOptions?.description || task?.description || task?.note || "",
        blockType: resolvedOptions?.blockType || "focus",
        recurrence: resolvedOptions?.recurrence,
        createdAt: now,
        updatedAt: now,
        ...resolvedOptions,
      };
      updateAndPersist((prev) => ({
        ...prev,
        scheduledBlocks: [...(prev.scheduledBlocks || []), newBlock],
      }));

      return newBlock;
    },
    [tasks, updateAndPersist]
  );

  const updateTaskBlock = useCallback(
    (blockId: string, updates: Partial<ScheduledTaskBlock>) => {
      updateAndPersist((prev) => ({
        ...prev,
        scheduledBlocks: (prev.scheduledBlocks || []).map((b) =>
          b.id === blockId ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
        ),
      }));
    },
    [updateAndPersist]
  );

  const deleteTaskBlock = useCallback(
    (blockId: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        scheduledBlocks: (prev.scheduledBlocks || []).filter((b) => b.id !== blockId),
      }));
    },
    [updateAndPersist]
  );

  const duplicateTaskBlock = useCallback(
    (blockId: string): ScheduledTaskBlock | null => {
      const target = scheduledBlocks.find((b) => b.id === blockId);
      if (!target) return null;

      const [h, m] = target.startTime.split(":").map(Number);
      const nextStartMins = (h + 1) * 60 + (m || 0);
      const nextEndMins = nextStartMins + target.durationMinutes;
      const nextStartTime = `${String(Math.floor(nextStartMins / 60) % 24).padStart(2, "0")}:${String(nextStartMins % 60).padStart(2, "0")}`;
      const nextEndTime = `${String(Math.floor(nextEndMins / 60) % 24).padStart(2, "0")}:${String(nextEndMins % 60).padStart(2, "0")}`;

      const now = new Date().toISOString();
      const duplicated: ScheduledTaskBlock = {
        ...target,
        id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: `${target.title} (Copy)`,
        startTime: nextStartTime,
        endTime: nextEndTime,
        createdAt: now,
        updatedAt: now,
      };

      updateAndPersist((prev) => ({
        ...prev,
        scheduledBlocks: [...prev.scheduledBlocks, duplicated],
      }));

      return duplicated;
    },
    [scheduledBlocks, updateAndPersist]
  );

  const rescheduleTaskBlock = useCallback(
    (
      blockId: string,
      newDate: string,
      newStartTime: string,
      newEndTime?: string
    ) => {
      updateAndPersist((prev) => ({
        ...prev,
        scheduledBlocks: prev.scheduledBlocks.map((b) => {
          if (b.id !== blockId) return b;
          const [sh, sm] = newStartTime.split(":").map(Number);
          const startMins = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
          let endMins = startMins + b.durationMinutes;
          let computedEndTime = b.endTime;
          let newDuration = b.durationMinutes;

          if (newEndTime) {
            const [eh, em] = newEndTime.split(":").map(Number);
            const explicitEndMins = (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);
            if (explicitEndMins > startMins) {
              endMins = explicitEndMins;
              newDuration = endMins - startMins;
              computedEndTime = newEndTime;
            }
          } else {
            const endHour = Math.floor(endMins / 60) % 24;
            const endMinute = endMins % 60;
            computedEndTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
          }

          return {
            ...b,
            date: newDate,
            startTime: newStartTime,
            endTime: computedEndTime,
            durationMinutes: newDuration,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [updateAndPersist]
  );

  const getScheduledBlocksForRange = useCallback(
    (start: Date, end: Date): ScheduledTaskBlock[] => {
      const result: ScheduledTaskBlock[] = [];
      const recurringMasterBlocks: ScheduledTaskBlock[] = [];

      for (const block of scheduledBlocks) {
        if (!block.recurrence) {
          try {
            const bDate = parseISO(block.date);
            if (!isAfter(bDate, end) && !isBefore(bDate, start)) {
              result.push(block);
            }
          } catch {
            result.push(block);
          }
        } else {
          recurringMasterBlocks.push(block);
        }
      }

      if (recurringMasterBlocks.length > 0) {
        const dummyEvents: CalendarEvent[] = recurringMasterBlocks.map((b) => ({
          id: b.id,
          title: b.title,
          startDate: b.date,
          startTime: b.startTime,
          endDate: b.date,
          endTime: b.endTime,
          allDay: false,
          categoryId: "cat-focus",
          recurrence: b.recurrence,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt || b.createdAt,
        }));

        const expanded = expandEventsForRange(dummyEvents, exceptions, start, end);
        for (const occ of expanded) {
          const master = recurringMasterBlocks.find((b) => b.id === occ.originalEventId);
          if (master) {
            result.push({
              ...master,
              id: occ.isOccurrence ? `${master.id}-${occ.occurrenceDate}` : master.id,
              date: occ.occurrenceDate || master.date,
              startTime: occ.startTime || master.startTime,
              endTime: occ.endTime || master.endTime,
            });
          }
        }
      }

      return result;
    },
    [scheduledBlocks, exceptions]
  );

  // Daily Plan actions
  const getDailyPlan = useCallback(
    (dateStr: string): DailyPlan => {
      if (dailyPlans[dateStr]) {
        return dailyPlans[dateStr];
      }
      return {
        date: dateStr,
        topPriorityTaskIds: [],
        targetFocusMinutes: 240,
        updatedAt: new Date().toISOString(),
      };
    },
    [dailyPlans]
  );

  const setDailyTopPriorities = useCallback(
    (dateStr: string, taskIds: string[]) => {
      updateAndPersist((prev) => {
        const existing = (prev.dailyPlans && prev.dailyPlans[dateStr]) || {
          date: dateStr,
          topPriorityTaskIds: [],
          targetFocusMinutes: 240,
          updatedAt: new Date().toISOString(),
        };

        return {
          ...prev,
          dailyPlans: {
            ...(prev.dailyPlans || {}),
            [dateStr]: {
              ...existing,
              topPriorityTaskIds: taskIds.slice(0, 3), // max 3 top priorities
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [updateAndPersist]
  );

  const addDailyPriority = useCallback(
    (dateStr: string, taskId: string) => {
      const plan = getDailyPlan(dateStr);
      if (plan.topPriorityTaskIds.includes(taskId)) return;
      if (plan.topPriorityTaskIds.length >= 3) {
        alert("You can select up to 3 top priorities per day.");
        return;
      }
      setDailyTopPriorities(dateStr, [...plan.topPriorityTaskIds, taskId]);
    },
    [getDailyPlan, setDailyTopPriorities]
  );

  const removeDailyPriority = useCallback(
    (dateStr: string, taskId: string) => {
      const plan = getDailyPlan(dateStr);
      setDailyTopPriorities(
        dateStr,
        plan.topPriorityTaskIds.filter((id) => id !== taskId)
      );
    },
    [getDailyPlan, setDailyTopPriorities]
  );

  const reorderDailyPriorities = useCallback(
    (dateStr: string, taskIds: string[]) => {
      setDailyTopPriorities(dateStr, taskIds);
    },
    [setDailyTopPriorities]
  );

  const updateDailyNotes = useCallback(
    (dateStr: string, notes: string) => {
      updateAndPersist((prev) => {
        const existing = prev.dailyPlans[dateStr] || {
          date: dateStr,
          topPriorityTaskIds: [],
          targetFocusMinutes: 240,
          updatedAt: new Date().toISOString(),
        };

        return {
          ...prev,
          dailyPlans: {
            ...prev.dailyPlans,
            [dateStr]: {
              ...existing,
              notes,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [updateAndPersist]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<CalendarSettings>) => {
      updateAndPersist((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...newSettings,
        },
      }));
    },
    [updateAndPersist]
  );

  const exportBackup = useCallback(() => {
    exportCalendarBackup(localStore);
  }, [localStore]);

  const restoreBackup = useCallback((jsonString: string) => {
    const restored = importCalendarBackup(jsonString);
    setLocalStore(restored);
  }, []);

  const setPlannerCategories = useCallback(
    (cats: PlannerCategory[]) => {
      updateAndPersist((prev) => ({
        ...prev,
        plannerCategories: cats,
      }));
    },
    [updateAndPersist]
  );

  const addPlannerCategory = useCallback(
    (cat: Omit<PlannerCategory, "id">): PlannerCategory => {
      const newCat: PlannerCategory = {
        ...cat,
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      updateAndPersist((prev) => ({
        ...prev,
        plannerCategories: [...(prev.plannerCategories || DEFAULT_PLANNER_CATEGORIES), newCat],
      }));
      return newCat;
    },
    [updateAndPersist]
  );

  const updatePlannerCategory = useCallback(
    (id: string, updates: Partial<PlannerCategory>) => {
      updateAndPersist((prev) => {
        const categories = (prev.plannerCategories || DEFAULT_PLANNER_CATEGORIES).map((c) =>
          c.id === id ? { ...c, ...updates } : c
        );
        const updatedScheduledBlocks = updates.color
          ? (prev.scheduledBlocks || []).map((b) =>
              b.categoryId === id ? { ...b, color: updates.color } : b
            )
          : prev.scheduledBlocks;
        const updatedPlannerRoutines = updates.color
          ? (prev.plannerRoutines || []).map((r) =>
              r.categoryId === id ? { ...r, color: updates.color } : r
            )
          : prev.plannerRoutines;

        return {
          ...prev,
          plannerCategories: categories,
          scheduledBlocks: updatedScheduledBlocks,
          plannerRoutines: updatedPlannerRoutines,
        };
      });
    },
    [updateAndPersist]
  );

  const deletePlannerCategory = useCallback(
    (id: string, reassignCategoryId?: string) => {
      updateAndPersist((prev) => {
        const currentCats = prev.plannerCategories || DEFAULT_PLANNER_CATEGORIES;
        const fallbackId =
          reassignCategoryId ||
          currentCats.find((c) => c.id !== id)?.id ||
          "cat-work-focus";
        const targetCategory = currentCats.find((c) => c.id === fallbackId);
        const targetColor = targetCategory?.color || "#4f46e5";

        return {
          ...prev,
          plannerCategories: currentCats.filter((c) => c.id !== id),
          scheduledBlocks: (prev.scheduledBlocks || []).map((b) =>
            b.categoryId === id ? { ...b, categoryId: fallbackId, color: targetColor } : b
          ),
          plannerRoutines: (prev.plannerRoutines || []).map((r) =>
            r.categoryId === id ? { ...r, categoryId: fallbackId, color: targetColor } : r
          ),
        };
      });
    },
    [updateAndPersist]
  );

  const addPlannerRoutine = useCallback(
    (routine: Omit<PlannerRoutine, "id" | "createdAt" | "updatedAt">): PlannerRoutine => {
      const now = new Date().toISOString();
      const newRoutine: PlannerRoutine = {
        ...routine,
        id: `routine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      updateAndPersist((prev) => ({
        ...prev,
        plannerRoutines: [...(prev.plannerRoutines || []), newRoutine],
      }));
      return newRoutine;
    },
    [updateAndPersist]
  );

  const updatePlannerRoutine = useCallback(
    (id: string, updates: Partial<PlannerRoutine>) => {
      updateAndPersist((prev) => ({
        ...prev,
        plannerRoutines: (prev.plannerRoutines || []).map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        ),
      }));
    },
    [updateAndPersist]
  );

  const deletePlannerRoutine = useCallback(
    (id: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        plannerRoutines: (prev.plannerRoutines || []).filter((r) => r.id !== id),
        plannerExceptions: (prev.plannerExceptions || []).filter((e) => e.routineId !== id),
      }));
    },
    [updateAndPersist]
  );

  const addPlannerException = useCallback(
    (exception: Omit<PlannerRoutineException, "id" | "createdAt">): PlannerRoutineException => {
      const newEx: PlannerRoutineException = {
        ...exception,
        id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      updateAndPersist((prev) => ({
        ...prev,
        plannerExceptions: [...(prev.plannerExceptions || []), newEx],
      }));
      return newEx;
    },
    [updateAndPersist]
  );

  const deletePlannerException = useCallback(
    (id: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        plannerExceptions: (prev.plannerExceptions || []).filter((e) => e.id !== id),
      }));
    },
    [updateAndPersist]
  );

  const addFocusSession = useCallback(
    (session: Omit<FocusSession, "id"> & { id?: string }): FocusSession => {
      const sessionId = session.id || `focus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newSession: FocusSession = {
        ...session,
        id: sessionId,
      };
      updateAndPersist((prev) => {
        const existing = prev.focusSessions || [];
        if (
          existing.some(
            (s) =>
              s.id === sessionId ||
              (Boolean(s.sessionId) &&
                Boolean(session.sessionId) &&
                s.sessionId === session.sessionId)
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          focusSessions: [...existing, newSession],
        };
      });
      return newSession;
    },
    [updateAndPersist]
  );

  const value: CalendarContextType = useMemo(
    () => ({
      isLoaded,
      selectedDate,
      view,
      setSelectedDate,
      setView,
      goToToday,
      goToPrevious,
      goToNext,
      events,
      categories,
      exceptions,
      scheduledBlocks,
      tasks,
      dailyPlans,
      settings,
      projects,
      notes,
      getEventsForRange,
      addEvent,
      updateEvent,
      deleteEvent,
      duplicateEvent,
      rescheduleEvent,
      updateEventOccurrence,
      toggleCategoryVisibility,
      addCategory,
      updateCategory,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskComplete,
      toggleTaskStar,
      scheduleTaskBlock,
      updateTaskBlock,
      deleteTaskBlock,
      duplicateTaskBlock,
      rescheduleTaskBlock,
      getScheduledBlocksForRange,
      getDailyPlan,
      setDailyTopPriorities,
      addDailyPriority,
      removeDailyPriority,
      reorderDailyPriorities,
      updateDailyNotes,
      updateSettings,
      exportBackup,
      restoreBackup,
      plannerCategories,
      setPlannerCategories,
      addPlannerCategory,
      updatePlannerCategory,
      deletePlannerCategory,
      plannerRoutines,
      addPlannerRoutine,
      updatePlannerRoutine,
      deletePlannerRoutine,
      plannerExceptions,
      addPlannerException,
      deletePlannerException,
      focusSessions,
      addFocusSession,
    }),
    [
      isLoaded,
      selectedDate,
      view,
      events,
      categories,
      exceptions,
      scheduledBlocks,
      tasks,
      dailyPlans,
      settings,
      projects,
      notes,
      getEventsForRange,
      addEvent,
      updateEvent,
      deleteEvent,
      duplicateEvent,
      rescheduleEvent,
      updateEventOccurrence,
      toggleCategoryVisibility,
      addCategory,
      updateCategory,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskComplete,
      toggleTaskStar,
      scheduleTaskBlock,
      updateTaskBlock,
      deleteTaskBlock,
      duplicateTaskBlock,
      rescheduleTaskBlock,
      getScheduledBlocksForRange,
      getDailyPlan,
      setDailyTopPriorities,
      addDailyPriority,
      removeDailyPriority,
      reorderDailyPriorities,
      updateDailyNotes,
      updateSettings,
      exportBackup,
      restoreBackup,
      goToToday,
      goToPrevious,
      goToNext,
      plannerCategories,
      setPlannerCategories,
      addPlannerCategory,
      updatePlannerCategory,
      deletePlannerCategory,
      plannerRoutines,
      addPlannerRoutine,
      updatePlannerRoutine,
      deletePlannerRoutine,
      plannerExceptions,
      addPlannerException,
      deletePlannerException,
      focusSessions,
      addFocusSession,
    ]
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const existing = useContext(CalendarContext);
  if (existing) {
    return <>{children}</>;
  }
  return <CalendarProviderInner>{children}</CalendarProviderInner>;
}

export function useCalendar(): CalendarContextType {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}
