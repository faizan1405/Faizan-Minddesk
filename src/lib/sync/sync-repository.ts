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
        ? prefs.calendar.settings
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
        ? prefs.notifications.preferences
        : undefined,
  };
}

export interface SaveDeskDataOptions {
  deletedTaskIds?: string[];
  deletedNoteIds?: string[];
  deletedMapIds?: string[];
}

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
): Promise<{ success: boolean; updatedAt: string }> {
  await assertWorkspaceWriteAccess(db, actor, workspaceId);

  return db.$transaction(async (tx) => {
    // 1. Save Projects if provided
    const existingProjectIds = new Set<string>();
    if (data.projects && Array.isArray(data.projects)) {
      for (const p of data.projects) {
        if (!p?.id || !p?.name) continue;
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

    // 2. Save Task Lists if provided
    const existingListIds = new Set<string>();
    if (data.taskLists && Array.isArray(data.taskLists)) {
      for (const tl of data.taskLists) {
        if (!tl?.id || !tl?.title) continue;
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
      where: { workspaceId, userId: actor.id },
      select: { id: true },
    });
    currentLists.forEach((l) => existingListIds.add(l.id));

    const currentProjects = await tx.project.findMany({
      where: { workspaceId, userId: actor.id },
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
        if (!task?.id || !task?.title) continue;

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

    // Handle deleted tasks if specified
    if (options.deletedTaskIds && options.deletedTaskIds.length > 0) {
      await tx.task.deleteMany({
        where: {
          workspaceId,
          userId: actor.id,
          id: { in: options.deletedTaskIds },
        },
      });
    }

    // 4. Save Notes if provided
    if (data.notes && Array.isArray(data.notes)) {
      const validNoteIds = new Set<string>();

      // Pass 1: Upsert all notes ensuring IDs exist in MySQL
      for (const note of data.notes) {
        if (!note?.id) continue;
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

    // Handle deleted notes if specified
    if (options.deletedNoteIds && options.deletedNoteIds.length > 0) {
      await tx.note.deleteMany({
        where: {
          workspaceId,
          userId: actor.id,
          id: { in: options.deletedNoteIds },
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

    // 6. Update Profile Preferences (Calendar, Planner, Habits, Routines, Notifications, Theme)
    const existingProfile = await tx.profile.findUnique({
      where: { id: actor.id },
      select: { preferences: true },
    });
    const currentPrefs =
      (existingProfile?.preferences as unknown as ProfilePreferencesJson | null) || {};

    const updatedPrefs: ProfilePreferencesJson = {
      ...currentPrefs,
      ...(data.theme !== undefined ? { theme: data.theme } : {}),
      calendar: {
        ...(currentPrefs.calendar || {}),
        ...(data.events !== undefined ? { events: data.events } : {}),
        ...(data.categories !== undefined ? { categories: data.categories } : {}),
        ...(data.exceptions !== undefined ? { exceptions: data.exceptions } : {}),
        ...(data.calendarSettings !== undefined
          ? { settings: data.calendarSettings }
          : {}),
      },
      planner: {
        ...(currentPrefs.planner || {}),
        ...(data.scheduledBlocks !== undefined
          ? { scheduledBlocks: data.scheduledBlocks }
          : {}),
        ...(data.dailyPlans !== undefined ? { dailyPlans: data.dailyPlans } : {}),
      },
      habits: {
        ...(currentPrefs.habits || {}),
        ...(data.habits !== undefined ? { habits: data.habits } : {}),
        ...(data.habitCompletions !== undefined
          ? { habitCompletions: data.habitCompletions }
          : {}),
        ...(data.habitProgressLogs !== undefined
          ? { habitProgressLogs: data.habitProgressLogs }
          : {}),
      },
      routines: {
        ...(currentPrefs.routines || {}),
        ...(data.routines !== undefined ? { routines: data.routines } : {}),
        ...(data.routineSessions !== undefined
          ? { routineSessions: data.routineSessions }
          : {}),
      },
      notifications: {
        ...(currentPrefs.notifications || {}),
        ...(data.notifications !== undefined
          ? { notifications: data.notifications }
          : {}),
        ...(data.notificationPreferences !== undefined
          ? { preferences: data.notificationPreferences }
          : {}),
      },
    };

    await tx.profile.update({
      where: { id: actor.id },
      data: { preferences: updatedPrefs as unknown as Prisma.InputJsonValue },
    });

    return {
      success: true,
      updatedAt: new Date().toISOString(),
    };
  });
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
