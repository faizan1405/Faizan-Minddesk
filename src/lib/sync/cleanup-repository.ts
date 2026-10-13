import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertWorkspaceWriteAccess,
  type VerifiedActor,
} from "@/lib/security/authorization";
import {
  DEFAULT_CALENDAR_CATEGORIES,
  DEFAULT_CALENDAR_SETTINGS,
} from "@/features/calendar/services/calendar-defaults";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/features/notifications/types";
import type { ProfilePreferencesJson } from "@/features/auth/types";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CleanupPreview {
  targetUser: {
    id: string;
    email: string;
  };
  workspaceId: string;
  counts: {
    tasks: number;
    notes: number;
    noteVersions: number;
    mindMaps: number;
    mindMapNodes: number;
    mindMapEdges: number;
    projects: number;
    customTaskLists: number;
    calendarEvents: number;
    scheduledBlocks: number;
    dailyPlans: number;
    habits: number;
    habitCompletions: number;
    habitProgressLogs: number;
    routines: number;
    routineSessions: number;
    notifications: number;
    totalRecords: number;
  };
}

export interface CleanupResult {
  success: boolean;
  targetUser: {
    id: string;
    email: string;
  };
  workspaceId: string;
  deletedCounts: CleanupPreview["counts"];
  timestamp: string;
}

/**
 * Previews account-scoped productivity data that will be cleaned up,
 * strictly scoped to the verified actor and workspace.
 */
export async function previewUserProductivityCleanup(
  db: DbClient,
  actor: VerifiedActor,
  workspaceId: string
): Promise<CleanupPreview> {
  await assertWorkspaceWriteAccess(db, actor, workspaceId);

  const [
    taskCount,
    noteCount,
    noteVersionCount,
    mindMapCount,
    mindMapNodeCount,
    mindMapEdgeCount,
    projectCount,
    taskListCount,
    profile,
  ] = await Promise.all([
    db.task.count({ where: { userId: actor.id, workspaceId } }),
    db.note.count({ where: { userId: actor.id, workspaceId } }),
    db.noteVersion.count({ where: { userId: actor.id, workspaceId } }),
    db.mindMap.count({ where: { userId: actor.id, workspaceId } }),
    db.mindMapNode.count({ where: { userId: actor.id, workspaceId } }),
    db.mindMapEdge.count({ where: { userId: actor.id, workspaceId } }),
    db.project.count({ where: { userId: actor.id, workspaceId } }),
    db.taskList.count({
      where: {
        userId: actor.id,
        workspaceId,
        id: { not: "list-my-tasks" },
      },
    }),
    db.profile.findUnique({
      where: { id: actor.id },
      select: { preferences: true },
    }),
  ]);

  const prefs =
    (profile?.preferences as unknown as ProfilePreferencesJson | null) || {};
  const calendarEvents = Array.isArray(prefs.calendar?.events)
    ? prefs.calendar.events.length
    : 0;
  const scheduledBlocks = Array.isArray(prefs.planner?.scheduledBlocks)
    ? prefs.planner.scheduledBlocks.length
    : 0;
  const dailyPlans =
    prefs.planner?.dailyPlans && typeof prefs.planner.dailyPlans === "object"
      ? Object.keys(prefs.planner.dailyPlans).length
      : 0;
  const habits = Array.isArray(prefs.habits?.habits)
    ? prefs.habits.habits.length
    : 0;
  const habitCompletions = Array.isArray(prefs.habits?.habitCompletions)
    ? prefs.habits.habitCompletions.length
    : 0;
  const habitProgressLogs = Array.isArray(prefs.habits?.habitProgressLogs)
    ? prefs.habits.habitProgressLogs.length
    : 0;
  const routines = Array.isArray(prefs.routines?.routines)
    ? prefs.routines.routines.length
    : 0;
  const routineSessions = Array.isArray(prefs.routines?.routineSessions)
    ? prefs.routines.routineSessions.length
    : 0;
  const notifications = Array.isArray(prefs.notifications?.notifications)
    ? prefs.notifications.notifications.length
    : 0;

  const totalRecords =
    taskCount +
    noteCount +
    noteVersionCount +
    mindMapCount +
    mindMapNodeCount +
    mindMapEdgeCount +
    projectCount +
    taskListCount +
    calendarEvents +
    scheduledBlocks +
    dailyPlans +
    habits +
    habitCompletions +
    habitProgressLogs +
    routines +
    routineSessions +
    notifications;

  return {
    targetUser: {
      id: actor.id,
      email: actor.email,
    },
    workspaceId,
    counts: {
      tasks: taskCount,
      notes: noteCount,
      noteVersions: noteVersionCount,
      mindMaps: mindMapCount,
      mindMapNodes: mindMapNodeCount,
      mindMapEdges: mindMapEdgeCount,
      projects: projectCount,
      customTaskLists: taskListCount,
      calendarEvents,
      scheduledBlocks,
      dailyPlans,
      habits,
      habitCompletions,
      habitProgressLogs,
      routines,
      routineSessions,
      notifications,
      totalRecords,
    },
  };
}

/**
 * Safely executes account-scoped productivity data cleanup in an isolated transaction.
 * Preserves user credentials, sessions, profile, workspace, and other users' records.
 */
export async function executeUserProductivityCleanup(
  db: PrismaClient,
  actor: VerifiedActor,
  workspaceId: string
): Promise<CleanupResult> {
  await assertWorkspaceWriteAccess(db, actor, workspaceId);

  const preview = await previewUserProductivityCleanup(db, actor, workspaceId);

  await db.$transaction(async (tx) => {
    // 1. Delete mind map edges and nodes before mind maps (FK dependencies)
    await tx.mindMapEdge.deleteMany({
      where: { userId: actor.id, workspaceId },
    });
    await tx.mindMapNode.deleteMany({
      where: { userId: actor.id, workspaceId },
    });
    await tx.mindMap.deleteMany({
      where: { userId: actor.id, workspaceId },
    });

    // 2. Delete note versions before notes
    await tx.noteVersion.deleteMany({
      where: { userId: actor.id, workspaceId },
    });
    await tx.note.deleteMany({
      where: { userId: actor.id, workspaceId },
    });

    // 3. Delete tasks
    await tx.task.deleteMany({
      where: { userId: actor.id, workspaceId },
    });

    // 4. Delete projects
    await tx.project.deleteMany({
      where: { userId: actor.id, workspaceId },
    });

    // 5. Reset task lists: delete custom lists, guarantee single "My Tasks"
    await tx.taskList.deleteMany({
      where: {
        userId: actor.id,
        workspaceId,
        id: { not: "list-my-tasks" },
      },
    });

    await tx.taskList.upsert({
      where: {
        id_userId_workspaceId: {
          id: "list-my-tasks",
          userId: actor.id,
          workspaceId,
        },
      },
      update: {
        name: "My Tasks",
        isDefault: true,
        position: 0,
      },
      create: {
        id: "list-my-tasks",
        workspaceId,
        userId: actor.id,
        name: "My Tasks",
        isDefault: true,
        position: 0,
      },
    });

    // 6. Reset profile preferences (Calendar, Planner, Habits, Routines, Notifications)
    const cleanPreferences = {
      theme: "light",
      calendar: {
        events: [],
        categories: DEFAULT_CALENDAR_CATEGORIES,
        exceptions: [],
        settings: DEFAULT_CALENDAR_SETTINGS,
      },
      planner: {
        scheduledBlocks: [],
        dailyPlans: {},
      },
      habits: {
        habits: [],
        habitCompletions: [],
        habitProgressLogs: [],
      },
      routines: {
        routines: [],
        routineSessions: [],
      },
      notifications: {
        notifications: [],
        preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      },
    };

    await tx.profile.update({
      where: { id: actor.id },
      data: {
        preferences: cleanPreferences as unknown as Prisma.InputJsonValue,
      },
    });
  });

  return {
    success: true,
    targetUser: preview.targetUser,
    workspaceId,
    deletedCounts: preview.counts,
    timestamp: new Date().toISOString(),
  };
}
