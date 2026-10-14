import type { MindMapNodeType, Prisma, PrismaClient } from "@prisma/client";
import type {
  DeskData,
  MindMapItem,
  NoteItem,
  Priority,
  ProjectItem,
  RecurrenceRule,
  TaskItem,
  TaskList,
  TaskSubtask,
} from "@/features/minddesk/types";
import {
  assertWorkspaceReadAccess,
  assertWorkspaceWriteAccess,
  type VerifiedActor,
} from "@/lib/security/authorization";
import type { ProfilePreferencesJson } from "@/features/auth/types";
import type { CalendarSettings } from "@/features/calendar/types";
import type { NotificationPreferences } from "@/features/notifications/types";
import {
  DEFAULT_PREFERENCES,
  type UserSettingsPreferences,
} from "@/features/settings/types";

export type DbClient = PrismaClient | Prisma.TransactionClient;

interface TaskMetadataJson {
  recurrence?: RecurrenceRule;
  starred?: boolean;
  dueTime?: string;
  rawDue?: string;
  subtasks?: TaskSubtask[];
  recurringSeriesId?: string;
}

interface NoteMetadataJson {
  html?: string;
  excerpt?: string;
  icon?: string;
  starred?: boolean;
  coverImage?: string | null;
}

interface MapMetadataJson {
  theme?: "calm" | "paper" | "midnight";
  layout?: "freeform" | "tree" | "radial";
  starred?: boolean;
}


/**
 * Loads the complete workspace domain state from Hostinger MySQL for the
 * authenticated actor, strictly isolating records by (userId, workspaceId).
 */
export async function getWorkspaceDeskData(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string
): Promise<DeskData> {
  await assertWorkspaceReadAccess(db, actor, workspaceId);

  // 1. Fetch domain tables in parallel
  const [dbProjects, dbTaskLists, dbTasks, dbNotes, dbMindMaps, dbProfile] =
    await Promise.all([
      db.project.findMany({
        where: { workspaceId, userId: actor.id },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      db.taskList.findMany({
        where: { workspaceId, userId: actor.id },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      db.task.findMany({
        where: { workspaceId, userId: actor.id },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      db.note.findMany({
        where: { workspaceId, userId: actor.id },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      }),
      db.mindMap.findMany({
        where: { workspaceId, userId: actor.id },
        include: {
          nodes: true,
          edges: true,
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      db.profile.findUnique({
        where: { id: actor.id },
        select: { preferences: true },
      }),
    ]);

  // 2. Map Projects
  const projects: ProjectItem[] = dbProjects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    hue: (p.color as "violet" | "mint" | "amber" | "blue") || "violet",
  }));

  // 3. Map Task Lists (honest workspace state, no demo fallback)
  const taskLists: TaskList[] = dbTaskLists.map((tl) => ({
    id: tl.id,
    title: tl.name,
    order: tl.position,
    isDefault: tl.isDefault,
    createdAt: tl.createdAt.toISOString(),
  }));

  // 4. Map Tasks
  const tasks: TaskItem[] = dbTasks.map((t) => {
    const meta = (t.recurrenceRule as TaskMetadataJson) || {};
    let dueString = "Today";
    if (meta.rawDue) {
      dueString = meta.rawDue;
    } else if (t.dueDate) {
      dueString = t.dueDate.toISOString().split("T")[0];
    }

    let priority: Priority = "low";
    if (t.priority === "high") priority = "high";
    else if (t.priority === "medium") priority = "medium";
    else priority = "low";

    return {
      id: t.id,
      listId: t.taskListId || "list-my-tasks",
      title: t.title,
      note: t.description || "",
      due: dueString,
      dueTime: meta.dueTime,
      priority,
      complete: t.status === "done",
      completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
      starred: meta.starred ?? false,
      projectId: t.projectId || undefined,
      order: t.position,
      subtasks: Array.isArray(meta.subtasks) ? meta.subtasks : [],
      recurrence: meta.recurrence,
      recurringSeriesId: meta.recurringSeriesId,
      parentTaskId: t.parentTaskId || undefined,
    };
  });

  // 5. Map Notes
  const notes: NoteItem[] = dbNotes.map((n) => {
    const meta = (n.contentJson as NoteMetadataJson) || {};
    return {
      id: n.id,
      title: n.title,
      excerpt:
        meta.excerpt || (n.contentText ? n.contentText.slice(0, 160) : ""),
      content: meta.html !== undefined ? meta.html : n.contentText || "",
      icon: meta.icon || "📝",
      updated: n.updatedAt.toISOString(),
      projectId: n.projectId || undefined,
      starred: n.isPinned,
      parentId: n.parentNoteId,
      coverImage: meta.coverImage ?? null,
    };
  });

  // 6. Map Mind Maps
  const maps: MindMapItem[] = dbMindMaps.map((m) => {
    const meta = (m.viewport as MapMetadataJson) || {};
    return {
      id: m.id,
      title: m.title,
      updated: m.updatedAt.toISOString(),
      starred: meta.starred ?? false,
      theme: meta.theme || "calm",
      layout: meta.layout || "freeform",
      nodes: m.nodes.map((node) => ({
        id: node.id,
        position: { x: node.positionX, y: node.positionY },
        data: (node.data as { label: string; color: string }) || {
          label: node.label,
          color: "violet",
        },
        type: node.type,
      })),
      edges: m.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        animated: edge.animated,
      })),
    };
  });

  // 7. Extract Profile Preferences (Calendar, Planner, Habits, Routines, Notifications)
  const prefs =
    (dbProfile?.preferences as unknown as ProfilePreferencesJson | null) || {};

  return {
    version: 3,
    preferencesVersion: prefs._version ?? 1,
    theme: prefs.theme === "dark" ? "dark" : "light",
    projects,
    taskLists,
    tasks,
    notes,
    maps,
    events: Array.isArray(prefs.calendar?.events) ? prefs.calendar.events : [],
    categories: Array.isArray(prefs.calendar?.categories)
      ? prefs.calendar.categories
      : [],
    exceptions: Array.isArray(prefs.calendar?.exceptions)
      ? prefs.calendar.exceptions
      : [],
    calendarSettings:
      typeof prefs.calendar?.settings === "object" && prefs.calendar?.settings !== null
        ? (prefs.calendar.settings as CalendarSettings)
        : undefined,
    scheduledBlocks: Array.isArray(prefs.planner?.scheduledBlocks)
      ? prefs.planner.scheduledBlocks
      : [],
    dailyPlans:
      typeof prefs.planner?.dailyPlans === "object" && prefs.planner?.dailyPlans !== null
        ? prefs.planner.dailyPlans
        : {},
    habits: Array.isArray(prefs.habits?.habits) ? prefs.habits.habits : [],
    habitCompletions: Array.isArray(prefs.habits?.habitCompletions)
      ? prefs.habits.habitCompletions
      : [],
    habitProgressLogs: Array.isArray(prefs.habits?.habitProgressLogs)
      ? prefs.habits.habitProgressLogs
      : [],
    routines: Array.isArray(prefs.routines?.routines)
      ? prefs.routines.routines
      : [],
    routineSessions: Array.isArray(prefs.routines?.routineSessions)
      ? prefs.routines.routineSessions
      : [],
    notifications: Array.isArray(prefs.notifications?.notifications)
      ? prefs.notifications.notifications
      : [],
    notificationPreferences:
      typeof prefs.notifications?.preferences === "object" && prefs.notifications?.preferences !== null
        ? (prefs.notifications.preferences as NotificationPreferences)
        : undefined,
  };
}

export interface SaveDeskDataOptions {
  deletedTaskIds?: string[];
  deletedNoteIds?: string[];
  deletedMapIds?: string[];
  deletedTaskListIds?: string[];
  deletedProjectIds?: string[];
  deletedEventIds?: string[];
  deletedHabitIds?: string[];
  deletedRoutineIds?: string[];
  clientPreferencesVersion?: number;
}

/**
 * Reconciles profile preferences during concurrent multi-session writes,
 * ensuring newer items (calendar events, habits, routines, daily plans) are not
 * silently overwritten by stale client state.
 */
export function reconcileProfilePreferences(
  currentPrefs: ProfilePreferencesJson,
  incomingData: Partial<DeskData>,
  options: SaveDeskDataOptions = {}
): {
  preferences: ProfilePreferencesJson;
  conflictReconciled: boolean;
  preferencesVersion: number;
} {
  const currentVersion = currentPrefs._version ?? 1;
  const clientVersion =
    options.clientPreferencesVersion ??
    incomingData.preferencesVersion ??
    currentVersion;

  const isConcurrentConflict = clientVersion < currentVersion;
  const nextVersion = currentVersion + 1;
  const nowIso = new Date().toISOString();

  const existingTombstones = currentPrefs._tombstones || {};
  const newTombstones = {
    taskLists: Array.from(
      new Set([
        ...(existingTombstones.taskLists || []),
        ...(options.deletedTaskListIds || []),
      ])
    ).slice(-500),
    projects: Array.from(
      new Set([
        ...(existingTombstones.projects || []),
        ...(options.deletedProjectIds || []),
      ])
    ).slice(-500),
    tasks: Array.from(
      new Set([
        ...(existingTombstones.tasks || []),
        ...(options.deletedTaskIds || []),
      ])
    ).slice(-500),
    notes: Array.from(
      new Set([
        ...(existingTombstones.notes || []),
        ...(options.deletedNoteIds || []),
      ])
    ).slice(-500),
    habits: Array.from(
      new Set([
        ...(existingTombstones.habits || []),
        ...(options.deletedHabitIds || []),
      ])
    ).slice(-500),
    routines: Array.from(
      new Set([
        ...(existingTombstones.routines || []),
        ...(options.deletedRoutineIds || []),
      ])
    ).slice(-500),
    events: Array.from(
      new Set([
        ...(existingTombstones.events || []),
        ...(options.deletedEventIds || []),
      ])
    ).slice(-500),
  };

  const deletedEventIdsSet = new Set([
    ...(options.deletedEventIds || []),
    ...(newTombstones.events || []),
  ]);
  const deletedHabitIdsSet = new Set([
    ...(options.deletedHabitIds || []),
    ...(newTombstones.habits || []),
  ]);
  const deletedRoutineIdsSet = new Set([
    ...(options.deletedRoutineIds || []),
    ...(newTombstones.routines || []),
  ]);

  if (!isConcurrentConflict) {
    const updatedPrefs: ProfilePreferencesJson = {
      ...currentPrefs,
      _version: nextVersion,
      _updatedAt: nowIso,
      _tombstones: newTombstones,
      ...(incomingData.theme !== undefined ? { theme: incomingData.theme } : {}),
      calendar: {
        ...(currentPrefs.calendar || {}),
        ...(incomingData.events !== undefined
          ? {
              events: incomingData.events.filter(
                (e) => !deletedEventIdsSet.has(e.id)
              ),
            }
          : {}),
        ...(incomingData.categories !== undefined
          ? { categories: incomingData.categories }
          : {}),
        ...(incomingData.exceptions !== undefined
          ? { exceptions: incomingData.exceptions }
          : {}),
        ...(incomingData.calendarSettings !== undefined
          ? { settings: incomingData.calendarSettings }
          : {}),
      },
      planner: {
        ...(currentPrefs.planner || {}),
        ...(incomingData.scheduledBlocks !== undefined
          ? { scheduledBlocks: incomingData.scheduledBlocks }
          : {}),
        ...(incomingData.dailyPlans !== undefined
          ? { dailyPlans: incomingData.dailyPlans }
          : {}),
      },
      habits: {
        ...(currentPrefs.habits || {}),
        ...(incomingData.habits !== undefined
          ? {
              habits: incomingData.habits.filter(
                (h) => !deletedHabitIdsSet.has(h.id)
              ),
            }
          : {}),
        ...(incomingData.habitCompletions !== undefined
          ? { habitCompletions: incomingData.habitCompletions }
          : {}),
        ...(incomingData.habitProgressLogs !== undefined
          ? { habitProgressLogs: incomingData.habitProgressLogs }
          : {}),
      },
      routines: {
        ...(currentPrefs.routines || {}),
        ...(incomingData.routines !== undefined
          ? {
              routines: incomingData.routines.filter(
                (r) => !deletedRoutineIdsSet.has(r.id)
              ),
            }
          : {}),
        ...(incomingData.routineSessions !== undefined
          ? { routineSessions: incomingData.routineSessions }
          : {}),
      },
      notifications: {
        ...(currentPrefs.notifications || {}),
        notifications:
          incomingData.notifications !== undefined
            ? incomingData.notifications
            : currentPrefs.notifications?.notifications || [],
        preferences: {
          ...(currentPrefs.notifications?.preferences || {}),
          ...(incomingData.notificationPreferences || {}),
        },
        settings: {
          ...(currentPrefs.notifications?.settings || DEFAULT_PREFERENCES.notifications),
          ...(incomingData.notificationPreferences?.enabled !== undefined
            ? { enabled: incomingData.notificationPreferences.enabled }
            : {}),
          ...(incomingData.notificationPreferences?.browserNotificationsEnabled !== undefined
            ? { browserNotifications: incomingData.notificationPreferences.browserNotificationsEnabled }
            : {}),
          ...(incomingData.notificationPreferences?.quietHoursEnabled !== undefined
            ? { quietHoursEnabled: incomingData.notificationPreferences.quietHoursEnabled }
            : {}),
          ...(incomingData.notificationPreferences?.quietHoursStart
            ? { quietHoursStart: incomingData.notificationPreferences.quietHoursStart }
            : {}),
          ...(incomingData.notificationPreferences?.quietHoursEnd
            ? { quietHoursEnd: incomingData.notificationPreferences.quietHoursEnd }
            : {}),
          ...(incomingData.notificationPreferences?.categories?.tasks !== undefined
            ? { taskReminders: incomingData.notificationPreferences.categories.tasks }
            : {}),
          ...(incomingData.notificationPreferences?.categories?.calendar !== undefined
            ? { calendarReminders: incomingData.notificationPreferences.categories.calendar }
            : {}),
          ...(incomingData.notificationPreferences?.dailySummaryEnabled !== undefined
            ? { dailyDigest: incomingData.notificationPreferences.dailySummaryEnabled }
            : {}),
        },
      },
      appearance: {
        ...(currentPrefs.appearance || DEFAULT_PREFERENCES.appearance),
        ...(incomingData.theme !== undefined ? { theme: incomingData.theme } : {}),
      },
      productivity: {
        ...(currentPrefs.productivity || DEFAULT_PREFERENCES.productivity),
        ...(incomingData.calendarSettings?.defaultView
          ? { defaultCalendarView: incomingData.calendarSettings.defaultView }
          : {}),
        ...(incomingData.calendarSettings?.weekStartsOn !== undefined
          ? { weekStartsOn: incomingData.calendarSettings.weekStartsOn }
          : {}),
        ...(incomingData.calendarSettings?.timeFormat
          ? { timeFormat: incomingData.calendarSettings.timeFormat }
          : {}),
        ...(incomingData.calendarSettings?.defaultDurationMinutes !== undefined
          ? { defaultDurationMinutes: incomingData.calendarSettings.defaultDurationMinutes }
          : {}),
      },
    };

    return {
      preferences: updatedPrefs,
      conflictReconciled: false,
      preferencesVersion: nextVersion,
    };
  }

  function reconcileEntities<T extends { id: string }>(
    serverItems: T[] | undefined,
    incomingItems: T[] | undefined,
    deletedIds: Set<string>
  ): T[] {
    const sMap = new Map<string, T>();
    (serverItems || []).forEach((item) => {
      if (item?.id && !deletedIds.has(item.id)) {
        sMap.set(item.id, item);
      }
    });

    if (!incomingItems) {
      return Array.from(sMap.values());
    }

    const cMap = new Map<string, T>();
    incomingItems.forEach((item) => {
      if (item?.id && !deletedIds.has(item.id)) {
        cMap.set(item.id, item);
      }
    });

    const result = new Map<string, T>(sMap);
    cMap.forEach((item, id) => {
      result.set(id, item);
    });

    return Array.from(result.values());
  }

  function reconcileCompletions<
    T extends { id?: string; habitId?: string; date?: string },
  >(serverItems: T[] | undefined, incomingItems: T[] | undefined): T[] {
    const compMap = new Map<string, T>();
    const getKey = (item: T) => item.id || `${item.habitId}_${item.date}`;
    (serverItems || []).forEach((item) => {
      const k = getKey(item);
      if (k) compMap.set(k, item);
    });
    (incomingItems || []).forEach((item) => {
      const k = getKey(item);
      if (k) compMap.set(k, item);
    });
    return Array.from(compMap.values());
  }

  const reconciledPrefs: ProfilePreferencesJson = {
    ...currentPrefs,
    _version: nextVersion,
    _updatedAt: nowIso,
    _tombstones: newTombstones,
    theme:
      incomingData.theme !== undefined ? incomingData.theme : currentPrefs.theme,
    calendar: {
      ...(currentPrefs.calendar || {}),
      events: reconcileEntities(
        currentPrefs.calendar?.events,
        incomingData.events,
        deletedEventIdsSet
      ),
      categories: reconcileEntities(
        currentPrefs.calendar?.categories,
        incomingData.categories,
        new Set()
      ),
      exceptions: [
        ...(currentPrefs.calendar?.exceptions || []),
        ...(incomingData.exceptions || []).filter(
          (inc) =>
            !(currentPrefs.calendar?.exceptions || []).some(
              (s) => s.id === inc.id
            )
        ),
      ],
      settings: {
        ...(currentPrefs.calendar?.settings || {}),
        ...(incomingData.calendarSettings || {}),
      },
    },
    planner: {
      ...(currentPrefs.planner || {}),
      scheduledBlocks: reconcileEntities(
        currentPrefs.planner?.scheduledBlocks,
        incomingData.scheduledBlocks,
        new Set()
      ),
      dailyPlans: {
        ...(currentPrefs.planner?.dailyPlans || {}),
        ...(incomingData.dailyPlans || {}),
      },
    },
    habits: {
      ...(currentPrefs.habits || {}),
      habits: reconcileEntities(
        currentPrefs.habits?.habits,
        incomingData.habits,
        deletedHabitIdsSet
      ),
      habitCompletions: reconcileCompletions(
        currentPrefs.habits?.habitCompletions,
        incomingData.habitCompletions
      ),
      habitProgressLogs: reconcileEntities(
        currentPrefs.habits?.habitProgressLogs,
        incomingData.habitProgressLogs,
        new Set()
      ),
    },
    routines: {
      ...(currentPrefs.routines || {}),
      routines: reconcileEntities(
        currentPrefs.routines?.routines,
        incomingData.routines,
        deletedRoutineIdsSet
      ),
      routineSessions: reconcileEntities(
        currentPrefs.routines?.routineSessions,
        incomingData.routineSessions,
        new Set()
      ),
    },
    notifications: {
      ...(currentPrefs.notifications || {}),
      notifications: reconcileEntities(
        currentPrefs.notifications?.notifications,
        incomingData.notifications,
        new Set()
      ),
      preferences: {
        ...(currentPrefs.notifications?.preferences || {}),
        ...(incomingData.notificationPreferences || {}),
      },
      settings: {
        ...(currentPrefs.notifications?.settings || DEFAULT_PREFERENCES.notifications),
        ...(incomingData.notificationPreferences?.enabled !== undefined
          ? { enabled: incomingData.notificationPreferences.enabled }
          : {}),
        ...(incomingData.notificationPreferences?.browserNotificationsEnabled !== undefined
          ? { browserNotifications: incomingData.notificationPreferences.browserNotificationsEnabled }
          : {}),
        ...(incomingData.notificationPreferences?.quietHoursEnabled !== undefined
          ? { quietHoursEnabled: incomingData.notificationPreferences.quietHoursEnabled }
          : {}),
        ...(incomingData.notificationPreferences?.quietHoursStart
          ? { quietHoursStart: incomingData.notificationPreferences.quietHoursStart }
          : {}),
        ...(incomingData.notificationPreferences?.quietHoursEnd
          ? { quietHoursEnd: incomingData.notificationPreferences.quietHoursEnd }
          : {}),
        ...(incomingData.notificationPreferences?.categories?.tasks !== undefined
          ? { taskReminders: incomingData.notificationPreferences.categories.tasks }
          : {}),
        ...(incomingData.notificationPreferences?.categories?.calendar !== undefined
          ? { calendarReminders: incomingData.notificationPreferences.categories.calendar }
          : {}),
        ...(incomingData.notificationPreferences?.dailySummaryEnabled !== undefined
          ? { dailyDigest: incomingData.notificationPreferences.dailySummaryEnabled }
          : {}),
      },
    },
    appearance: {
      ...(currentPrefs.appearance || DEFAULT_PREFERENCES.appearance),
      ...(incomingData.theme !== undefined ? { theme: incomingData.theme } : {}),
    },
    productivity: {
      ...(currentPrefs.productivity || DEFAULT_PREFERENCES.productivity),
      ...(incomingData.calendarSettings?.defaultView
        ? { defaultCalendarView: incomingData.calendarSettings.defaultView }
        : {}),
      ...(incomingData.calendarSettings?.weekStartsOn !== undefined
        ? { weekStartsOn: incomingData.calendarSettings.weekStartsOn }
        : {}),
      ...(incomingData.calendarSettings?.timeFormat
        ? { timeFormat: incomingData.calendarSettings.timeFormat }
        : {}),
      ...(incomingData.calendarSettings?.defaultDurationMinutes !== undefined
        ? { defaultDurationMinutes: incomingData.calendarSettings.defaultDurationMinutes }
        : {}),
    },
  };

  return {
    preferences: reconciledPrefs,
    conflictReconciled: true,
    preferencesVersion: nextVersion,
  };
}

// Process-level serialization queue per user to prevent lost updates across concurrent requests
const userSaveQueues = new Map<string, Promise<unknown>>();

/**
 * Atomically saves workspace data to MySQL for the authenticated actor.
 * Upserts domain records safely and preserves cross-tenant isolation.
 */
export async function saveWorkspaceDeskData(
  db: PrismaClient,
  actor: VerifiedActor,
  workspaceId: string,
  data: Partial<DeskData>,
  options: SaveDeskDataOptions = {}
): Promise<{
  success: boolean;
  updatedAt: string;
  conflictReconciled?: boolean;
  preferencesVersion?: number;
}> {
  await assertWorkspaceWriteAccess(db, actor, workspaceId);

  // Serialize concurrent writes for the same actor within this process
  const previousQueue = userSaveQueues.get(actor.id) || Promise.resolve();
  let releaseQueue: () => void = () => {};
  const queuePromise = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  userSaveQueues.set(
    actor.id,
    previousQueue.then(() => queuePromise).catch(() => queuePromise)
  );

  await previousQueue.catch(() => {});

  try {
    return await executeSaveWorkspaceDeskData(
      db,
      actor,
      workspaceId,
      data,
      options
    );
  } finally {
    releaseQueue();
    if (userSaveQueues.get(actor.id) === queuePromise) {
      userSaveQueues.delete(actor.id);
    }
  }
}

async function executeSaveWorkspaceDeskData(
  db: PrismaClient,
  actor: VerifiedActor,
  workspaceId: string,
  data: Partial<DeskData>,
  options: SaveDeskDataOptions = {}
): Promise<{
  success: boolean;
  updatedAt: string;
  conflictReconciled?: boolean;
  preferencesVersion?: number;
}> {
  return db.$transaction(async (tx) => {
    // Row-level lock in MySQL InnoDB for cross-process/multi-worker atomicity:
    let currentPrefs: ProfilePreferencesJson = {};
    try {
      const rawTx = tx as unknown as {
        $queryRaw?: (
          strings: TemplateStringsArray,
          ...values: unknown[]
        ) => Promise<Array<{ preferences?: unknown }>>;
      };
      if (typeof rawTx.$queryRaw === "function") {
        const rows = await rawTx.$queryRaw`SELECT preferences FROM profiles WHERE id = ${actor.id} FOR UPDATE`;
        if (rows && rows.length > 0 && rows[0]?.preferences) {
          const rawPref = rows[0].preferences;
          currentPrefs =
            typeof rawPref === "string"
              ? JSON.parse(rawPref)
              : (rawPref as ProfilePreferencesJson);
        }
      }
    } catch {
      // Non-MySQL or mock environments where raw queries are unsupported fall through safely
    }

    // Fallback if not populated by raw locking query (e.g. mock test environments)
    if (!currentPrefs || Object.keys(currentPrefs).length === 0) {
      const existingProfile = await tx.profile.findUnique({
        where: { id: actor.id },
        select: { preferences: true },
      });
      currentPrefs =
        (existingProfile?.preferences as unknown as ProfilePreferencesJson | null) || {};
    }
    const existingTombstones = currentPrefs._tombstones || {};

    const deletedProjectIdsSet = new Set([
      ...(options.deletedProjectIds || []),
      ...(existingTombstones.projects || []),
    ]);
    const deletedTaskListIdsSet = new Set([
      ...(options.deletedTaskListIds || []),
      ...(existingTombstones.taskLists || []),
    ]);
    const deletedTaskIdsSet = new Set([
      ...(options.deletedTaskIds || []),
      ...(existingTombstones.tasks || []),
    ]);
    const deletedNoteIdsSet = new Set([
      ...(options.deletedNoteIds || []),
      ...(existingTombstones.notes || []),
    ]);

    // 0. Handle deleted projects if specified or tombstoned
    if (deletedProjectIdsSet.size > 0) {
      const deletedProjectIds = Array.from(deletedProjectIdsSet);
      // Explicitly unlink associated tasks, notes, and mind maps
      await tx.task.updateMany({
        where: {
          workspaceId,
          userId: actor.id,
          projectId: { in: deletedProjectIds },
        },
        data: { projectId: null },
      });
      await tx.note.updateMany({
        where: {
          workspaceId,
          userId: actor.id,
          projectId: { in: deletedProjectIds },
        },
        data: { projectId: null },
      });
      await tx.mindMap.updateMany({
        where: {
          workspaceId,
          userId: actor.id,
          projectId: { in: deletedProjectIds },
        },
        data: { projectId: null },
      });
      await tx.project.deleteMany({
        where: {
          workspaceId,
          userId: actor.id,
          id: { in: deletedProjectIds },
        },
      });
    }

    // 0.1 Handle deleted task lists if specified
    if (deletedTaskListIdsSet.size > 0) {
      const deletedTaskListIds = Array.from(deletedTaskListIdsSet);
      await tx.taskList.deleteMany({
        where: {
          workspaceId,
          userId: actor.id,
          id: { in: deletedTaskListIds },
        },
      });
    }

    // 1. Save Projects if provided (skip any explicitly deleted)
    const existingProjectIds = new Set<string>();
    if (data.projects && Array.isArray(data.projects)) {
      for (const p of data.projects) {
        if (!p?.id || !p?.name || deletedProjectIdsSet.has(p.id)) continue;
        existingProjectIds.add(p.id);
        await tx.project.upsert({
          where: {
            id_userId_workspaceId: {
              id: p.id,
              userId: actor.id,
              workspaceId,
            },
          },
          update: {
            name: p.name.trim(),
            description: p.description ?? "",
            color: p.hue ?? "#6366f1",
            icon: p.icon ?? "folder",
          },
          create: {
            id: p.id,
            workspaceId,
            userId: actor.id,
            name: p.name.trim(),
            description: p.description ?? "",
            color: p.hue ?? "#6366f1",
            icon: p.icon ?? "folder",
            position: 1000.0,
          },
        });
      }
    }

    // 2. Save Task Lists if provided (skip any explicitly deleted)
    const existingListIds = new Set<string>();
    if (data.taskLists && Array.isArray(data.taskLists)) {
      for (const tl of data.taskLists) {
        if (!tl?.id || !tl?.title || deletedTaskListIdsSet.has(tl.id)) continue;
        existingListIds.add(tl.id);
        await tx.taskList.upsert({
          where: {
            id_userId_workspaceId: {
              id: tl.id,
              userId: actor.id,
              workspaceId,
            },
          },
          update: {
            name: tl.title.trim(),
            position: typeof tl.order === "number" ? tl.order : 1000.0,
            isDefault: Boolean(tl.isDefault),
          },
          create: {
            id: tl.id,
            workspaceId,
            userId: actor.id,
            name: tl.title.trim(),
            position: typeof tl.order === "number" ? tl.order : 1000.0,
            isDefault: Boolean(tl.isDefault),
          },
        });
      }
    }

    // Fetch existing lists and projects in DB if not all were passed
    const currentLists = await tx.taskList.findMany({
      where: {
        workspaceId,
        userId: actor.id,
        ...(deletedTaskListIdsSet.size > 0
          ? { id: { notIn: Array.from(deletedTaskListIdsSet) } }
          : {}),
      },
      select: { id: true },
    });
    currentLists.forEach((l) => existingListIds.add(l.id));

    const currentProjects = await tx.project.findMany({
      where: {
        workspaceId,
        userId: actor.id,
        ...(deletedProjectIdsSet.size > 0
          ? { id: { notIn: Array.from(deletedProjectIdsSet) } }
          : {}),
      },
      select: { id: true },
    });
    currentProjects.forEach((p) => existingProjectIds.add(p.id));

    // Fallback default list ID
    let fallbackListId: string | null = null;
    if (existingListIds.size > 0) {
      fallbackListId = Array.from(existingListIds)[0];
    } else {
      const defaultList = await tx.taskList.create({
        data: {
          workspaceId,
          userId: actor.id,
          name: "My Tasks",
          isDefault: true,
          position: 1000.0,
        },
      });
      existingListIds.add(defaultList.id);
      fallbackListId = defaultList.id;
    }

    // 3. Save Tasks if provided
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        if (!task?.id || !task?.title || deletedTaskIdsSet.has(task.id)) continue;

        // Resolve valid taskListId
        let assignedListId: string | null = task.listId || null;
        if (assignedListId && !existingListIds.has(assignedListId)) {
          assignedListId = fallbackListId;
        }

        // Resolve valid projectId
        let assignedProjectId: string | null = task.projectId || null;
        if (assignedProjectId && !existingProjectIds.has(assignedProjectId)) {
          assignedProjectId = null;
        }

        // Parse dueDate if valid date
        let parsedDueDate: Date | null = null;
        if (task.due && !["Today", "Tomorrow", "Yesterday"].includes(task.due)) {
          const d = new Date(task.due);
          if (!isNaN(d.getTime())) {
            parsedDueDate = d;
          }
        }

        const recurrenceMetadata: TaskMetadataJson = {
          recurrence: task.recurrence,
          starred: task.starred,
          dueTime: task.dueTime,
          rawDue: task.due,
          subtasks: task.subtasks || [],
          recurringSeriesId: task.recurringSeriesId,
        };

        const taskPriority =
          task.priority === "high"
            ? "high"
            : task.priority === "medium"
            ? "medium"
            : task.priority === "low"
            ? "low"
            : "none";

        await tx.task.upsert({
          where: {
            id_userId_workspaceId: {
              id: task.id,
              userId: actor.id,
              workspaceId,
            },
          },
          update: {
            title: task.title.trim(),
            description: task.note ?? "",
            taskListId: assignedListId,
            projectId: assignedProjectId,
            status: task.complete ? "done" : "todo",
            priority: taskPriority,
            dueDate: parsedDueDate,
            completedAt: task.completedAt
              ? new Date(task.completedAt)
              : task.complete
              ? new Date()
              : null,
            recurrenceRule: recurrenceMetadata as unknown as Prisma.InputJsonValue,
            position: typeof task.order === "number" ? task.order : 1000.0,
          },
          create: {
            id: task.id,
            workspaceId,
            userId: actor.id,
            title: task.title.trim(),
            description: task.note ?? "",
            taskListId: assignedListId,
            projectId: assignedProjectId,
            status: task.complete ? "done" : "todo",
            priority: taskPriority,
            dueDate: parsedDueDate,
            completedAt: task.completedAt
              ? new Date(task.completedAt)
              : task.complete
              ? new Date()
              : null,
            recurrenceRule: recurrenceMetadata as unknown as Prisma.InputJsonValue,
            position: typeof task.order === "number" ? task.order : 1000.0,
          },
        });
      }
    }

    // Handle deleted tasks if specified or tombstoned
    if (deletedTaskIdsSet.size > 0) {
      await tx.task.deleteMany({
        where: {
          workspaceId,
          userId: actor.id,
          id: { in: Array.from(deletedTaskIdsSet) },
        },
      });
    }

    // 4. Save Notes if provided
    if (data.notes && Array.isArray(data.notes)) {
      const validNoteIds = new Set<string>();

      // Pass 1: Upsert all notes ensuring IDs exist in MySQL
      for (const note of data.notes) {
        if (!note?.id || deletedNoteIdsSet.has(note.id)) continue;
        validNoteIds.add(note.id);

        let assignedProjectId: string | null = note.projectId || null;
        if (assignedProjectId && !existingProjectIds.has(assignedProjectId)) {
          assignedProjectId = null;
        }

        const noteMeta: NoteMetadataJson = {
          html: note.content || "",
          excerpt: note.excerpt || "",
          icon: note.icon || "📝",
          starred: Boolean(note.starred),
          coverImage: note.coverImage ?? null,
        };

        await tx.note.upsert({
          where: {
            id_userId_workspaceId: {
              id: note.id,
              userId: actor.id,
              workspaceId,
            },
          },
          update: {
            title: note.title?.trim() || "Untitled Note",
            contentJson: noteMeta as unknown as Prisma.InputJsonValue,
            contentText: note.content || "",
            projectId: assignedProjectId,
            isPinned: Boolean(note.starred),
            lastSavedAt: new Date(),
          },
          create: {
            id: note.id,
            workspaceId,
            userId: actor.id,
            title: note.title?.trim() || "Untitled Note",
            contentJson: noteMeta as unknown as Prisma.InputJsonValue,
            contentText: note.content || "",
            projectId: assignedProjectId,
            isPinned: Boolean(note.starred),
            lastSavedAt: new Date(),
            position: 1000.0,
          },
        });
      }

      // Pass 2: Link parentNoteId hierarchy safely once all note IDs exist
      for (const note of data.notes) {
        if (!note?.id) continue;
        const parentId =
          note.parentId && validNoteIds.has(note.parentId) && note.parentId !== note.id
            ? note.parentId
            : null;

        await tx.note.update({
          where: {
            id_userId_workspaceId: {
              id: note.id,
              userId: actor.id,
              workspaceId,
            },
          },
          data: {
            parentNoteId: parentId,
          },
        });
      }
    }

    // Handle deleted notes if specified or tombstoned
    if (deletedNoteIdsSet.size > 0) {
      await tx.note.deleteMany({
        where: {
          workspaceId,
          userId: actor.id,
          id: { in: Array.from(deletedNoteIdsSet) },
        },
      });
    }

    // 5. Save Mind Maps if provided
    if (data.maps && Array.isArray(data.maps)) {
      for (const map of data.maps) {
        if (!map?.id) continue;

        const mapMeta: MapMetadataJson = {
          theme: map.theme || "calm",
          layout: map.layout || "freeform",
          starred: Boolean(map.starred),
        };

        await tx.mindMap.upsert({
          where: {
            id_userId_workspaceId: {
              id: map.id,
              userId: actor.id,
              workspaceId,
            },
          },
          update: {
            title: map.title?.trim() || "Untitled Map",
            viewport: mapMeta as unknown as Prisma.InputJsonValue,
          },
          create: {
            id: map.id,
            workspaceId,
            userId: actor.id,
            title: map.title?.trim() || "Untitled Map",
            viewport: mapMeta as unknown as Prisma.InputJsonValue,
            position: 1000.0,
          },
        });

        // Save nodes
        if (map.nodes && Array.isArray(map.nodes)) {
          const nodeIds = new Set<string>();
          for (const node of map.nodes) {
            if (!node?.id) continue;
            nodeIds.add(node.id);
            await tx.mindMapNode.upsert({
              where: {
                id_userId_workspaceId: {
                  id: node.id,
                  userId: actor.id,
                  workspaceId,
                },
              },
              update: {
                mindMapId: map.id,
                label: node.data?.label || "Idea",
                positionX: node.position?.x ?? 0,
                positionY: node.position?.y ?? 0,
                data: (node.data || {}) as unknown as Prisma.InputJsonValue,
                type: (node.type as MindMapNodeType) || "idea",
              },
              create: {
                id: node.id,
                mindMapId: map.id,
                workspaceId,
                userId: actor.id,
                label: node.data?.label || "Idea",
                positionX: node.position?.x ?? 0,
                positionY: node.position?.y ?? 0,
                data: (node.data || {}) as unknown as Prisma.InputJsonValue,
                type: (node.type as MindMapNodeType) || "idea",
                style: {},
              },
            });
          }

          // Save edges that connect valid nodes
          if (map.edges && Array.isArray(map.edges)) {
            for (const edge of map.edges) {
              if (
                !edge?.id ||
                !edge?.source ||
                !edge?.target ||
                !nodeIds.has(edge.source) ||
                !nodeIds.has(edge.target)
              ) {
                continue;
              }

              await tx.mindMapEdge.upsert({
                where: {
                  id: edge.id,
                },
                update: {
                  animated: Boolean(edge.animated),
                },
                create: {
                  id: edge.id,
                  mindMapId: map.id,
                  workspaceId,
                  userId: actor.id,
                  sourceNodeId: edge.source,
                  targetNodeId: edge.target,
                  animated: Boolean(edge.animated),
                  style: {},
                },
              });
            }
          }
        }
      }
    }

    // Handle deleted mind maps if specified
    if (options.deletedMapIds && options.deletedMapIds.length > 0) {
      await tx.mindMap.deleteMany({
        where: {
          workspaceId,
          userId: actor.id,
          id: { in: options.deletedMapIds },
        },
      });
    }

    // 6. Update Profile Preferences with Conflict-Aware Reconciliation
    const reconciled = reconcileProfilePreferences(currentPrefs, data, options);

    await tx.profile.update({
      where: { id: actor.id },
      data: { preferences: reconciled.preferences as unknown as Prisma.InputJsonValue },
    });

    return {
      success: true,
      updatedAt: new Date().toISOString(),
      conflictReconciled: reconciled.conflictReconciled,
      preferencesVersion: reconciled.preferencesVersion,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

export interface ImportPreviewResult {
  needsImport: boolean;
  counts: {
    tasks: number;
    notes: number;
    maps: number;
    projects: number;
    events: number;
    habits: number;
    routines: number;
  };
}

/**
 * Previews which records in the local candidate data are absent in MySQL,
 * computing an idempotent preview before user confirmation.
 */
export async function previewLocalDataImport(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string,
  localData: DeskData
): Promise<ImportPreviewResult> {
  await assertWorkspaceReadAccess(db, actor, workspaceId);

  const [dbTasks, dbNotes, dbMaps, dbProjects, dbProfile] = await Promise.all([
    db.task.findMany({
      where: { workspaceId, userId: actor.id },
      select: { id: true, title: true },
    }),
    db.note.findMany({
      where: { workspaceId, userId: actor.id },
      select: { id: true, title: true },
    }),
    db.mindMap.findMany({
      where: { workspaceId, userId: actor.id },
      select: { id: true, title: true },
    }),
    db.project.findMany({
      where: { workspaceId, userId: actor.id },
      select: { id: true, name: true },
    }),
    db.profile.findUnique({
      where: { id: actor.id },
      select: { preferences: true },
    }),
  ]);

  const existingTaskIds = new Set(dbTasks.map((t) => t.id));
  const existingNoteIds = new Set(dbNotes.map((n) => n.id));
  const existingMapIds = new Set(dbMaps.map((m) => m.id));
  const existingProjectIds = new Set(dbProjects.map((p) => p.id));

  const prefs =
    (dbProfile?.preferences as unknown as ProfilePreferencesJson | null) || {};
  const existingEventIds = new Set(
    (prefs.calendar?.events || []).map((e) => e.id)
  );
  const existingHabitIds = new Set(
    (prefs.habits?.habits || []).map((h) => h.id)
  );
  const existingRoutineIds = new Set(
    (prefs.routines?.routines || []).map((r) => r.id)
  );

  // Filter out known prototype demo item IDs so they are never flagged for cloud import
  const DEMO_DATA_IDS = new Set([
    "task-1", "task-2", "task-3", "task-4", "task-5", "task-6", "task-7", "task-8", "task-9", "task-10",
    "note-1", "note-2", "note-3", "note-roadmap", "note-architecture",
    "northstar", "fieldnotes", "launch", "personal",
    "map-1",
    "evt-standup-recurring", "evt-lunch", "evt-sprint-review", "evt-quarterly-planning", "evt-gym", "evt-tech-webinar",
    "habit-water", "habit-reading", "habit-workout", "habit-plan-day",
    "routine-morning", "routine-evening",
    "list-skills", "list-projects", "list-routine", "list-goals",
  ]);

  const tasksToImport = (localData.tasks || [])
    .filter((t) => !DEMO_DATA_IDS.has(t.id))
    .filter((t) => !existingTaskIds.has(t.id)).length;

  const notesToImport = (localData.notes || [])
    .filter((n) => !DEMO_DATA_IDS.has(n.id))
    .filter((n) => !existingNoteIds.has(n.id)).length;

  const mapsToImport = (localData.maps || [])
    .filter((m) => !DEMO_DATA_IDS.has(m.id))
    .filter((m) => !existingMapIds.has(m.id)).length;

  const projectsToImport = (localData.projects || [])
    .filter((p) => !DEMO_DATA_IDS.has(p.id))
    .filter((p) => !existingProjectIds.has(p.id)).length;

  const eventsToImport = (localData.events || [])
    .filter((e) => !DEMO_DATA_IDS.has(e.id))
    .filter((e) => !existingEventIds.has(e.id)).length;

  const habitsToImport = (localData.habits || [])
    .filter((h) => !DEMO_DATA_IDS.has(h.id))
    .filter((h) => !existingHabitIds.has(h.id)).length;

  const routinesToImport = (localData.routines || [])
    .filter((r) => !DEMO_DATA_IDS.has(r.id))
    .filter((r) => !existingRoutineIds.has(r.id)).length;

  const total =
    tasksToImport +
    notesToImport +
    mapsToImport +
    projectsToImport +
    eventsToImport +
    habitsToImport +
    routinesToImport;

  return {
    needsImport: total > 0,
    counts: {
      tasks: tasksToImport,
      notes: notesToImport,
      maps: mapsToImport,
      projects: projectsToImport,
      events: eventsToImport,
      habits: habitsToImport,
      routines: routinesToImport,
    },
  };
}

/**
 * Idempotently imports local prototype records into the authenticated user's MySQL workspace.
 * Uses stable IDs and upserts to protect against duplicates or data loss.
 */
export async function executeLocalDataImport(
  db: PrismaClient,
  actor: VerifiedActor,
  workspaceId: string,
  localData: DeskData
): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
  const preview = await previewLocalDataImport(
    db,
    actor,
    workspaceId,
    localData
  );

  await saveWorkspaceDeskData(db, actor, workspaceId, localData);

  return {
    success: true,
    importedCounts: preview.counts,
  };
}

export interface UpdateProfileSettingsInput {
  fullName?: string;
  avatarUrl?: string | null;
  preferences?: Partial<{
    appearance: Partial<UserSettingsPreferences["appearance"]>;
    productivity: Partial<UserSettingsPreferences["productivity"]>;
    notifications: Partial<UserSettingsPreferences["notifications"]>;
  }>;
  preferencesVersion?: number;
}

export interface UpdateProfileSettingsResult {
  success: boolean;
  fullName: string;
  avatarUrl: string | null;
  preferences: UserSettingsPreferences;
  preferencesVersion: number;
}

/**
 * Atomically updates user profile and preferences in MySQL under strict concurrency locking.
 * Uses process-level queue serialization and InnoDB row-level locking (SELECT ... FOR UPDATE)
 * to ensure that Settings updates NEVER erase Calendar events, Habits, Routines, or Planner plans.
 */
export async function updateUserProfileSettingsSafely(
  db: PrismaClient,
  userId: string,
  input: UpdateProfileSettingsInput
): Promise<UpdateProfileSettingsResult> {
  // Serialize concurrent writes for the same actor within this process
  const previousQueue = userSaveQueues.get(userId) || Promise.resolve();
  let releaseQueue: () => void = () => {};
  const queuePromise = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  userSaveQueues.set(
    userId,
    previousQueue.then(() => queuePromise).catch(() => queuePromise)
  );

  await previousQueue.catch(() => {});

  try {
    return await db.$transaction(async (tx) => {
      // Row-level lock in MySQL InnoDB for cross-process/multi-worker atomicity:
      let currentPrefs: ProfilePreferencesJson = {};
      try {
        const rawTx = tx as unknown as {
          $queryRaw?: (
            strings: TemplateStringsArray,
            ...values: unknown[]
          ) => Promise<Array<{ preferences?: unknown }>>;
        };
        if (typeof rawTx.$queryRaw === "function") {
          const rows = await rawTx.$queryRaw`SELECT preferences FROM profiles WHERE id = ${userId} FOR UPDATE`;
          if (rows && rows.length > 0 && rows[0]?.preferences) {
            const rawPref = rows[0].preferences;
            currentPrefs =
              typeof rawPref === "string"
                ? JSON.parse(rawPref)
                : (rawPref as ProfilePreferencesJson);
          }
        }
      } catch {
        // Non-MySQL or mock environments where raw queries are unsupported fall through safely
      }

      let existingProfile = null;
      if (!currentPrefs || Object.keys(currentPrefs).length === 0) {
        existingProfile = await tx.profile.findUnique({
          where: { id: userId },
          select: { preferences: true, fullName: true, avatarUrl: true },
        });
        currentPrefs =
          (existingProfile?.preferences as unknown as ProfilePreferencesJson | null) || {};
      } else {
        existingProfile = await tx.profile.findUnique({
          where: { id: userId },
          select: { fullName: true, avatarUrl: true },
        });
      }

      const currentVersion = currentPrefs._version ?? 1;
      const nextVersion = currentVersion + 1;
      const nowIso = new Date().toISOString();

      const existingAppearance = currentPrefs.appearance || {};
      const updatedAppearance = {
        theme:
          input.preferences?.appearance?.theme ??
          existingAppearance.theme ??
          (currentPrefs.theme as "light" | "dark" | undefined) ??
          DEFAULT_PREFERENCES.appearance.theme,
        compactMode:
          input.preferences?.appearance?.compactMode ??
          existingAppearance.compactMode ??
          DEFAULT_PREFERENCES.appearance.compactMode,
        reducedMotion:
          input.preferences?.appearance?.reducedMotion ??
          existingAppearance.reducedMotion ??
          DEFAULT_PREFERENCES.appearance.reducedMotion,
      };

      const existingProductivity = currentPrefs.productivity || {};
      const existingCalSettings = currentPrefs.calendar?.settings || {};
      const updatedProductivity = {
        defaultCalendarView:
          input.preferences?.productivity?.defaultCalendarView ??
          existingProductivity.defaultCalendarView ??
          (existingCalSettings.defaultView as "month" | "week" | "day" | "agenda" | undefined) ??
          DEFAULT_PREFERENCES.productivity.defaultCalendarView,
        weekStartsOn:
          input.preferences?.productivity?.weekStartsOn ??
          existingProductivity.weekStartsOn ??
          (existingCalSettings.weekStartsOn as 0 | 1 | undefined) ??
          DEFAULT_PREFERENCES.productivity.weekStartsOn,
        timeFormat:
          input.preferences?.productivity?.timeFormat ??
          existingProductivity.timeFormat ??
          (existingCalSettings.timeFormat as "12h" | "24h" | undefined) ??
          DEFAULT_PREFERENCES.productivity.timeFormat,
        defaultTaskPriority:
          input.preferences?.productivity?.defaultTaskPriority ??
          existingProductivity.defaultTaskPriority ??
          DEFAULT_PREFERENCES.productivity.defaultTaskPriority,
        defaultTaskDueOffsetDays:
          input.preferences?.productivity?.defaultTaskDueOffsetDays ??
          existingProductivity.defaultTaskDueOffsetDays ??
          DEFAULT_PREFERENCES.productivity.defaultTaskDueOffsetDays,
        defaultDurationMinutes:
          input.preferences?.productivity?.defaultDurationMinutes ??
          existingProductivity.defaultDurationMinutes ??
          existingCalSettings.defaultDurationMinutes ??
          DEFAULT_PREFERENCES.productivity.defaultDurationMinutes,
      };

      const existingNotifSettings = currentPrefs.notifications?.settings || {};
      const existingNotifPrefs = currentPrefs.notifications?.preferences || {};
      const updatedNotifSettings = {
        enabled:
          input.preferences?.notifications?.enabled ??
          existingNotifSettings.enabled ??
          existingNotifPrefs.enabled ??
          DEFAULT_PREFERENCES.notifications.enabled,
        browserNotifications:
          input.preferences?.notifications?.browserNotifications ??
          existingNotifSettings.browserNotifications ??
          existingNotifPrefs.browserNotificationsEnabled ??
          DEFAULT_PREFERENCES.notifications.browserNotifications,
        taskReminders:
          input.preferences?.notifications?.taskReminders ??
          existingNotifSettings.taskReminders ??
          existingNotifPrefs.categories?.tasks ??
          DEFAULT_PREFERENCES.notifications.taskReminders,
        calendarReminders:
          input.preferences?.notifications?.calendarReminders ??
          existingNotifSettings.calendarReminders ??
          existingNotifPrefs.categories?.calendar ??
          DEFAULT_PREFERENCES.notifications.calendarReminders,
        dailyDigest:
          input.preferences?.notifications?.dailyDigest ??
          existingNotifSettings.dailyDigest ??
          existingNotifPrefs.dailySummaryEnabled ??
          DEFAULT_PREFERENCES.notifications.dailyDigest,
        quietHoursEnabled:
          input.preferences?.notifications?.quietHoursEnabled ??
          existingNotifSettings.quietHoursEnabled ??
          existingNotifPrefs.quietHoursEnabled ??
          DEFAULT_PREFERENCES.notifications.quietHoursEnabled,
        quietHoursStart:
          input.preferences?.notifications?.quietHoursStart ??
          existingNotifSettings.quietHoursStart ??
          existingNotifPrefs.quietHoursStart ??
          DEFAULT_PREFERENCES.notifications.quietHoursStart,
        quietHoursEnd:
          input.preferences?.notifications?.quietHoursEnd ??
          existingNotifSettings.quietHoursEnd ??
          existingNotifPrefs.quietHoursEnd ??
          DEFAULT_PREFERENCES.notifications.quietHoursEnd,
      };

      // Merge and PRESERVE all calendar, habits, routines, planner, tombstones!
      const fullUpdatedPrefs: ProfilePreferencesJson = {
        ...currentPrefs,
        _version: nextVersion,
        _updatedAt: nowIso,
        theme:
          updatedAppearance.theme === "system"
            ? currentPrefs.theme
            : (updatedAppearance.theme as "light" | "dark"),
        appearance: updatedAppearance,
        productivity: updatedProductivity,
        calendar: {
          ...(currentPrefs.calendar || {}),
          settings: {
            ...(currentPrefs.calendar?.settings || {}),
            defaultView: updatedProductivity.defaultCalendarView,
            weekStartsOn: updatedProductivity.weekStartsOn,
            timeFormat: updatedProductivity.timeFormat,
            defaultDurationMinutes: updatedProductivity.defaultDurationMinutes,
          },
        },
        notifications: {
          ...(currentPrefs.notifications || {}),
          notifications: currentPrefs.notifications?.notifications || [],
          preferences: {
            ...(currentPrefs.notifications?.preferences || {}),
            enabled: updatedNotifSettings.enabled,
            browserNotificationsEnabled: updatedNotifSettings.browserNotifications,
            quietHoursEnabled: updatedNotifSettings.quietHoursEnabled,
            quietHoursStart: updatedNotifSettings.quietHoursStart,
            quietHoursEnd: updatedNotifSettings.quietHoursEnd,
            dailySummaryEnabled: updatedNotifSettings.dailyDigest,
            categories: {
              ...(currentPrefs.notifications?.preferences?.categories || {
                tasks: true,
                calendar: true,
                time_blocks: true,
                habits: true,
                routines: true,
                summary: true,
              }),
              tasks: updatedNotifSettings.taskReminders,
              calendar: updatedNotifSettings.calendarReminders,
            },
          },
          settings: updatedNotifSettings,
        },
      };

      const updatedName = input.fullName !== undefined ? input.fullName : undefined;
      const updatedAvatar =
        input.avatarUrl !== undefined
          ? input.avatarUrl === ""
            ? null
            : input.avatarUrl
          : undefined;

      if (updatedName !== undefined || updatedAvatar !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(updatedName !== undefined ? { name: updatedName } : {}),
            ...(updatedAvatar !== undefined ? { image: updatedAvatar } : {}),
          },
        });
      }

      const finalFullName =
        updatedName !== undefined
          ? updatedName
          : existingProfile?.fullName || "MindDesk User";
      const finalAvatarUrl =
        updatedAvatar !== undefined
          ? updatedAvatar
          : existingProfile?.avatarUrl ?? null;

      await tx.profile.update({
        where: { id: userId },
        data: {
          ...(updatedName !== undefined ? { fullName: updatedName } : {}),
          ...(updatedAvatar !== undefined ? { avatarUrl: updatedAvatar } : {}),
          preferences: fullUpdatedPrefs as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        success: true,
        fullName: finalFullName,
        avatarUrl: finalAvatarUrl,
        preferences: {
          appearance: updatedAppearance,
          productivity: updatedProductivity,
          notifications: updatedNotifSettings,
        },
        preferencesVersion: nextVersion,
      };
    }, { maxWait: 15000, timeout: 30000 });
  } finally {
    releaseQueue();
    if (userSaveQueues.get(userId) === queuePromise) {
      userSaveQueues.delete(userId);
    }
  }
}

