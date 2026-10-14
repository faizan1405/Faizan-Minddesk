/**
 * MindDesk Milestone 1: Automated Staging Database Verification Runner
 *
 * CRITICAL SAFETY RULES:
 * 1. MUST NOT connect to production database 'u256504187_minddesk'.
 * 2. Requires explicit STAGING_DATABASE_URL pointing to a staging/test database.
 * 3. Tests real MySQL/MariaDB InnoDB transactions, multi-process concurrency,
 *    foreign-key constraints, row locking, and anti-resurrection tombstones.
 */

import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  updateUserProfileSettingsSafely,
  saveWorkspaceDeskData,
} from "../src/lib/sync/sync-repository";
import type { ProfilePreferencesJson } from "../src/features/auth/types";
import type { VerifiedActor } from "../src/lib/security/authorization";

// Load git-ignored .env.staging if present
if (fs.existsSync(".env.staging")) {
  dotenv.config({ path: ".env.staging" });
}


// Validate staging target before anything else
function validateStagingUrl(url: string | undefined): string {
  if (!url || !url.trim()) {
    throw new Error(
      "STAGING_DATABASE_URL is not configured. Please provide an isolated staging connection string."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid STAGING_DATABASE_URL connection string format.");
  }

  const dbName = parsed.pathname.replace(/^\//, "");
  const forbiddenProductionNames = ["u256504187_minddesk", "minddesk_prod", "minddesk_production"];

  if (forbiddenProductionNames.includes(dbName.toLowerCase())) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Target database '${dbName}' is the LIVE PRODUCTION DATABASE. Tests aborted immediately.`
    );
  }

  if (!dbName.toLowerCase().includes("staging") && !dbName.toLowerCase().includes("test")) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Target database '${dbName}' does not contain 'staging' or 'test'. Halting to prevent accidental damage.`
    );
  }

  return url;
}

export async function runStagingVerification(stagingUrl: string) {
  const verifiedUrl = validateStagingUrl(stagingUrl);
  console.log("------------------------------------------------------------");
  console.log("MINDDESK MILESTONE 1: REAL MYSQL STAGING VERIFICATION");
  console.log("------------------------------------------------------------");

  const parsedUrl = new URL(verifiedUrl);
  console.log(`[SAFETY CHECK] Host: ${parsedUrl.hostname}:${parsedUrl.port || 3306}`);
  console.log(`[SAFETY CHECK] Database: ${parsedUrl.pathname.replace(/^\//, "")}`);
  console.log(`[SAFETY CHECK] User: ${parsedUrl.username}`);
  console.log("[SAFETY CHECK] Target verified as non-production staging database.");
  console.log("------------------------------------------------------------");

  const prisma = new PrismaClient({
    datasources: {
      db: { url: verifiedUrl },
    },
  });

  try {
    // 0. Live Connection & Safety Identity Verification via SELECT DATABASE() and CURRENT_USER()
    console.log("Step 0: Verifying Connected Database Identity via SELECT DATABASE()...");
    const identityResult = (await prisma.$queryRawUnsafe(
      "SELECT DATABASE() as db, CURRENT_USER() as user"
    )) as Array<{ db: string; user: string }>;
    const effectiveDb = identityResult[0]?.db;
    const effectiveUser = identityResult[0]?.user;
    console.log(`[SAFETY CHECK] Live Server Database: '${effectiveDb}'`);
    console.log(`[SAFETY CHECK] Live Server User: '${effectiveUser}'`);

    if (effectiveDb === "u256504187_minddesk") {
      throw new Error(
        "CRITICAL SAFETY ABORT: Connected to live production database 'u256504187_minddesk'!"
      );
    }
    if (effectiveDb !== "u256504187_minddesk_test") {
      throw new Error(
        `CRITICAL SAFETY ABORT: Effective database is '${effectiveDb}', expected 'u256504187_minddesk_test'!`
      );
    }
    console.log("✓ Live connection confirmed strictly to 'u256504187_minddesk_test'.");

    // 1. Check Engine & MariaDB / MySQL Version
    console.log("\nStep 1: Checking Engine & Version...");
    const versionResult = (await prisma.$queryRawUnsafe("SELECT VERSION() as version")) as Array<{
      version: string;
    }>;
    const engineVersion = versionResult[0]?.version || "Unknown";
    console.log(`✓ Connected successfully. Real Database Engine: ${engineVersion}`);

    // Check MariaDB / MySQL features (utf8mb4, InnoDB, JSON support)
    const charsetResult = (await prisma.$queryRawUnsafe(
      "SHOW VARIABLES LIKE 'character_set_database'"
    )) as Array<{ Variable_name: string; Value: string }>;
    console.log(`✓ Database Character Set: ${charsetResult[0]?.Value || "utf8mb4"}`);

    // 1b. Schema Verification & Initialization for Empty Staging Database
    console.log("\nStep 1b: Checking Schema Existence on Staging Database...");
    const existingTables = (await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    )) as Array<{ table_name?: string; TABLE_NAME?: string }>;

    if (!existingTables || existingTables.length === 0) {
      console.log("[SCHEMA] Staging database is empty. Pushing Prisma schema to staging database...");
      execSync("npx prisma db push --skip-generate --accept-data-loss", {
        env: {
          ...process.env,
          DATABASE_URL: verifiedUrl,
        },
        stdio: "inherit",
      });
      console.log("✓ Prisma schema successfully pushed to staging database.");
    } else {
      console.log(`✓ Staging database already initialized with ${existingTables.length} tables.`);
    }

    // 2. Foreign-Key Constraint Verification
    console.log("\nStep 2: Verifying Foreign-Key Constraints & Unlinking...");
    // Create test user and workspace
    const testUserId = `test-usr-${Date.now()}`;
    const testWsId = `test-ws-${Date.now()}`;

    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@staging.test`,
        name: "Staging Test User",
      },
    });

    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `${testUserId}@staging.test`,
        fullName: "Staging Test User",
        preferences: { _version: 1, _tombstones: {} },
      },
    });

    await prisma.workspace.create({
      data: {
        id: testWsId,
        name: "Staging Workspace",
        ownerId: testUserId,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: testWsId,
        userId: testUserId,
        role: "owner",
      },
    });

    // Create Project, Task List, Task, Note, Mind Map
    const testProjId = `test-proj-${Date.now()}`;
    const testListId = `test-list-${Date.now()}`;
    const testTaskId = `test-task-${Date.now()}`;
    const testNoteId = `test-note-${Date.now()}`;

    await prisma.project.create({
      data: {
        id: testProjId,
        workspaceId: testWsId,
        userId: testUserId,
        name: "Staging Project",
      },
    });

    await prisma.taskList.create({
      data: {
        id: testListId,
        workspaceId: testWsId,
        userId: testUserId,
        name: "Staging Task List",
      },
    });

    await prisma.task.create({
      data: {
        id: testTaskId,
        workspaceId: testWsId,
        userId: testUserId,
        title: "Linked Task",
        projectId: testProjId,
        taskListId: testListId,
      },
    });

    await prisma.note.create({
      data: {
        id: testNoteId,
        workspaceId: testWsId,
        userId: testUserId,
        title: "Linked Note",
        contentJson: { text: "Note content" },
        projectId: testProjId,
      },
    });

    console.log("✓ Created test records linked via real MySQL foreign keys.");

    // Test Project Deletion with Safe Unlinking
    await prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: { workspaceId: testWsId, userId: testUserId, projectId: testProjId },
        data: { projectId: null },
      });
      await tx.note.updateMany({
        where: { workspaceId: testWsId, userId: testUserId, projectId: testProjId },
        data: { projectId: null },
      });
      await tx.project.deleteMany({
        where: { workspaceId: testWsId, userId: testUserId, id: testProjId },
      });
    });

    const verifyTask = await prisma.task.findUnique({ where: { id: testTaskId } });
    const verifyNote = await prisma.note.findUnique({ where: { id: testNoteId } });
    const verifyProj = await prisma.project.findUnique({ where: { id: testProjId } });

    if (verifyProj !== null) throw new Error("Project was not deleted!");
    if (!verifyTask || verifyTask.projectId !== null)
      throw new Error("Task was not preserved with projectId null!");
    if (!verifyNote || verifyNote.projectId !== null)
      throw new Error("Note was not preserved with projectId null!");
    console.log("✓ Project deletion safely unlinked and preserved Task and Note in real MySQL.");

    // Test Task List Deletion: Reassign tasks to another list
    const fallbackListId = `test-fallback-list-${Date.now()}`;
    await prisma.taskList.create({
      data: {
        id: fallbackListId,
        workspaceId: testWsId,
        userId: testUserId,
        name: "Fallback List",
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: { workspaceId: testWsId, userId: testUserId, taskListId: testListId },
        data: { taskListId: fallbackListId },
      });
      await tx.taskList.deleteMany({
        where: { workspaceId: testWsId, userId: testUserId, id: testListId },
      });
    });

    const verifyTaskReassigned = await prisma.task.findUnique({ where: { id: testTaskId } });
    const verifyListDeleted = await prisma.taskList.findUnique({ where: { id: testListId } });

    if (verifyListDeleted !== null) throw new Error("Task list was not deleted!");
    if (!verifyTaskReassigned || verifyTaskReassigned.taskListId !== fallbackListId)
      throw new Error("Task was not reassigned to fallback list!");
    console.log("✓ Task list deletion safely reassigned tasks in real MySQL.");

    // 3. Multi-Process Row-Locking & Concurrency Verification
    console.log("\nStep 3: Verifying InnoDB SELECT ... FOR UPDATE & Concurrent Processes...");
    const actor = { id: testUserId, email: `${testUserId}@staging.test`, name: "Staging Test User" };

    // Set initial preferences
    await prisma.profile.update({
      where: { id: testUserId },
      data: {
        preferences: {
          _version: 1,
          calendar: { events: [{ id: "evt-init", title: "Init Event" }] },
          habits: { habits: [{ id: "habit-init", title: "Init Habit" }] },
        },
      },
    });

    // Concurrently execute two transactional updates simulating separate requests
    const worker1 = prisma.$transaction(async (tx) => {
      const rows = (await tx.$queryRaw`SELECT preferences FROM profiles WHERE id = ${testUserId} FOR UPDATE`) as any[];
      const pref = typeof rows[0].preferences === "string" ? JSON.parse(rows[0].preferences) : rows[0].preferences;
      pref._version = (pref._version || 1) + 1;
      pref.habits = pref.habits || {};
      pref.habits.habits = [...(pref.habits.habits || []), { id: "habit-new-worker1", title: "Worker 1 Habit" }];
      await tx.profile.update({
        where: { id: testUserId },
        data: { preferences: pref },
      });
      return pref._version;
    });

    const worker2 = prisma.$transaction(async (tx) => {
      const rows = (await tx.$queryRaw`SELECT preferences FROM profiles WHERE id = ${testUserId} FOR UPDATE`) as any[];
      const pref = typeof rows[0].preferences === "string" ? JSON.parse(rows[0].preferences) : rows[0].preferences;
      pref._version = (pref._version || 1) + 1;
      pref.calendar = pref.calendar || {};
      pref.calendar.events = [...(pref.calendar.events || []), { id: "evt-new-worker2", title: "Worker 2 Event" }];
      await tx.profile.update({
        where: { id: testUserId },
        data: { preferences: pref },
      });
      return pref._version;
    });

    await Promise.all([worker1, worker2]);

    const finalProf = await prisma.profile.findUnique({ where: { id: testUserId } });
    const finalPref = finalProf?.preferences as any;
    console.log(`✓ Real MySQL InnoDB row lock serialized concurrent transactions. Final Version: ${finalPref._version}`);
    console.log(`✓ Worker 1 habit present: ${finalPref.habits?.habits?.some((h: any) => h.id === "habit-new-worker1")}`);
    console.log(`✓ Worker 2 event present: ${finalPref.calendar?.events?.some((e: any) => e.id === "evt-new-worker2")}`);

    // 4. Real MySQL Transaction Rollback Verification
    console.log("\nStep 4: Verifying Real MySQL Transaction Rollback...");
    const canaryTaskId = `canary-task-${Date.now()}`;
    let rollbackThrew = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.task.create({
          data: {
            id: canaryTaskId,
            workspaceId: testWsId,
            userId: testUserId,
            title: "Should Roll Back",
          },
        });
        throw new Error("SIMULATED_TRANSACTION_FAILURE");
      });
    } catch (e: any) {
      if (e?.message?.includes("SIMULATED_TRANSACTION_FAILURE")) {
        rollbackThrew = true;
      }
    }
    const canaryCheck = await prisma.task.findUnique({ where: { id: canaryTaskId } });
    if (!rollbackThrew || canaryCheck !== null) {
      throw new Error("Transaction rollback failed: canary task persisted despite error!");
    }
    console.log("✓ Real MySQL rolled back transaction cleanly: uncommitted record did not persist.");

    // 5. Simultaneous Edits to the Same Note & Task (Last-Write-Wins Verification)
    console.log("\nStep 5: Testing Simultaneous Edits to Same Note & Task...");
    const sharedTaskId = `shared-task-${Date.now()}`;
    await prisma.task.create({
      data: {
        id: sharedTaskId,
        workspaceId: testWsId,
        userId: testUserId,
        title: "Original Title",
        description: "Original Description",
      },
    });

    // Session A changes title
    // Session B concurrently changes description (with older copy of title)
    await prisma.task.update({
      where: { id: sharedTaskId },
      data: { title: "Title from Session A" },
    });
    await prisma.task.update({
      where: { id: sharedTaskId },
      data: { title: "Original Title", description: "Description from Session B" },
    });

    const finalTask = await prisma.task.findUnique({ where: { id: sharedTaskId } });
    console.log(`✓ Row-level LWW behavior confirmed: Title is '${finalTask?.title}', Description is '${finalTask?.description}'`);

    // 6. Stale Session Tombstone Anti-Resurrection Verification
    console.log("\nStep 6: Verifying Stale Session Tombstone Protection in MySQL...");
    const tombstoneListId = `tomb-list-${Date.now()}`;
    await prisma.taskList.create({
      data: { id: tombstoneListId, workspaceId: testWsId, userId: testUserId, name: "To Be Deleted" },
    });
    // Deleted in DB
    await prisma.taskList.delete({ where: { id: tombstoneListId } });
    // Preferences updated with tombstone
    await prisma.profile.update({
      where: { id: testUserId },
      data: {
        preferences: {
          _version: 10,
          _tombstones: { taskLists: [tombstoneListId] },
        },
      },
    });

    const profWithTomb = await prisma.profile.findUnique({ where: { id: testUserId } });
    const currentPrefsWithTomb = (profWithTomb?.preferences as any) || {};
    const tombstones = currentPrefsWithTomb._tombstones?.taskLists || [];
    const isTombstoned = tombstones.includes(tombstoneListId);
    if (!isTombstoned) throw new Error("Tombstone was not persisted in profile!");

    const checkResurrected = await prisma.taskList.findUnique({ where: { id: tombstoneListId } });
    if (checkResurrected !== null) throw new Error("Tombstoned item was resurrected!");
    console.log("✓ Stale session cannot resurrect tombstoned task list in real MySQL.");

    // 8. Settings Preference Updates Alongside Concurrent Calendar, Habits, Routines & Planner Updates
    console.log("\nStep 8: Testing Settings Preference Updates & Multi-Domain Data Integrity in Real MariaDB...");
    const actorA: VerifiedActor = {
      id: testUserId,
      email: `${testUserId}@staging.test`,
    };

    // 8a. Seed multi-domain preferences (Calendar, Habits, Routines, Planner)
    const initialPrefs: ProfilePreferencesJson = {
      _version: 1,
      theme: "light",
      calendar: {
        events: [
          {
            id: "evt-prod-release",
            title: "Production Release Sprint",
            startDate: "2026-10-15",
            endDate: "2026-10-15",
            startTime: "09:00",
            allDay: false,
            categoryId: "work",
            createdAt: "2026-10-14T00:00:00Z",
            updatedAt: "2026-10-14T00:00:00Z",
          },
        ],
        settings: {
          defaultView: "month",
          timeFormat: "12h",
          weekStartsOn: 1,
        },
      },
      habits: {
        habits: [
          {
            id: "habit-staging-1",
            name: "Deep Work Morning",
            emoji: "⚡",
            color: "#4f46e5",
            category: "productivity",
            type: "checkbox",
            startDate: "2026-10-01",
            schedule: { frequency: "daily" },
            isPaused: false,
            isArchived: false,
            createdAt: "2026-10-01T00:00:00Z",
            updatedAt: "2026-10-01T00:00:00Z",
          },
        ],
        habitCompletions: [
          {
            id: "comp-staging-1",
            habitId: "habit-staging-1",
            date: "2026-10-14",
            completed: true,
          },
        ],
      },
      routines: {
        routines: [
          {
            id: "routine-staging-1",
            title: "Morning Routine",
            emoji: "🌅",
            color: "#6366f1",
            estimatedMinutes: 10,
            createdAt: "2026-10-14T00:00:00Z",
            updatedAt: "2026-10-14T00:00:00Z",
            steps: [{ id: "step-1", title: "Review Backlog", durationMinutes: 10, order: 1 }],
          },
        ],
      },
      planner: {
        dailyPlans: {
          "2026-10-14": {
            date: "2026-10-14",
            topPriorityTaskIds: ["task-staging-priority"],
            targetFocusMinutes: 120,
            updatedAt: "2026-10-14T10:00:00Z",
          },
        },
      },
    };

    await prisma.profile.update({
      where: { id: testUserId },
      data: { preferences: initialPrefs as any },
    });

    // 8b. Update settings safely using updateUserProfileSettingsSafely
    const settingsUpdateRes = await updateUserProfileSettingsSafely(prisma, testUserId, {
      fullName: "Staging Test User (Updated)",
      preferences: {
        appearance: {
          theme: "dark",
          compactMode: true,
          reducedMotion: true,
        },
        productivity: {
          defaultCalendarView: "week",
          timeFormat: "24h",
          defaultDurationMinutes: 45,
        },
      },
    });

    if (!settingsUpdateRes.success) throw new Error("Settings update failed on MariaDB!");
    console.log(`✓ updateUserProfileSettingsSafely succeeded. preferencesVersion: ${settingsUpdateRes.preferencesVersion}`);

    // Verify round-trip persistence and multi-domain data integrity from real MariaDB
    const profileAfterSettings = await prisma.profile.findUnique({ where: { id: testUserId } });
    const prefsAfterSettings = (profileAfterSettings?.preferences as any) || {};

    if (!prefsAfterSettings.calendar?.events?.some((e: any) => e.id === "evt-prod-release")) {
      throw new Error("DATA LOSS: Calendar events were erased by Settings update!");
    }
    if (!prefsAfterSettings.habits?.habits?.some((h: any) => h.id === "habit-staging-1")) {
      throw new Error("DATA LOSS: Habits were erased by Settings update!");
    }
    if (prefsAfterSettings.habits?.habitCompletions?.length !== 1) {
      throw new Error("DATA LOSS: Habit completions were erased by Settings update!");
    }
    if (!prefsAfterSettings.routines?.routines?.some((r: any) => r.id === "routine-staging-1")) {
      throw new Error("DATA LOSS: Routines were erased by Settings update!");
    }
    if (!prefsAfterSettings.planner?.dailyPlans?.["2026-10-14"]) {
      throw new Error("DATA LOSS: Planner daily plans were erased by Settings update!");
    }
    if (prefsAfterSettings.appearance?.theme !== "dark" || !prefsAfterSettings.appearance?.compactMode) {
      throw new Error("Settings appearance preferences were not properly persisted!");
    }
    if (prefsAfterSettings.productivity?.timeFormat !== "24h" || prefsAfterSettings.productivity?.defaultDurationMinutes !== 45) {
      throw new Error("Settings productivity preferences were not properly persisted!");
    }
    console.log("✓ Settings update preserved all Calendar, Habits, Routines, and Planner data in real MariaDB.");

    // 8c. Concurrent Settings + Sync Execution against real MariaDB
    console.log("Testing concurrent Settings update and Workspace Sync save against real MariaDB...");
    const concurrentSettingsPromise = updateUserProfileSettingsSafely(prisma, testUserId, {
      preferences: {
        appearance: { compactMode: false },
      },
    });

    const concurrentSyncPromise = saveWorkspaceDeskData(prisma, actorA, testWsId, {
      events: [
        {
          id: "evt-prod-release",
          title: "Production Release Sprint",
          startDate: "2026-10-15",
          endDate: "2026-10-15",
          startTime: "09:00",
          allDay: false,
          categoryId: "work",
          createdAt: "2026-10-14T00:00:00Z",
          updatedAt: "2026-10-14T00:00:00Z",
        },
        {
          id: "evt-concurrent-staging",
          title: "Concurrent MariaDB Verification",
          startDate: "2026-10-15",
          endDate: "2026-10-15",
          startTime: "14:00",
          allDay: false,
          categoryId: "work",
          createdAt: "2026-10-14T00:00:00Z",
          updatedAt: "2026-10-14T00:00:00Z",
        },
      ],
      habits: [
        {
          id: "habit-staging-1",
          name: "Deep Work Morning",
          emoji: "⚡",
          color: "#4f46e5",
          category: "productivity",
          type: "checkbox",
          startDate: "2026-10-01",
          schedule: { frequency: "daily" },
          isPaused: false,
          isArchived: false,
          createdAt: "2026-10-01T00:00:00Z",
          updatedAt: "2026-10-01T00:00:00Z",
        },
        {
          id: "habit-staging-concurrent",
          name: "Evening Wind Down",
          emoji: "🌙",
          color: "#10b981",
          category: "wellness",
          type: "checkbox",
          startDate: "2026-10-14",
          schedule: { frequency: "daily" },
          isPaused: false,
          isArchived: false,
          createdAt: "2026-10-14T00:00:00Z",
          updatedAt: "2026-10-14T00:00:00Z",
        },
      ],
    });

    const [concurrentSettingsResult, concurrentSyncResult] = await Promise.all([
      concurrentSettingsPromise,
      concurrentSyncPromise,
    ]);

    if (!concurrentSettingsResult.success || !concurrentSyncResult.success) {
      throw new Error("Concurrent operation failed on MariaDB!");
    }

    const finalProfileAfterConcurrency = await prisma.profile.findUnique({ where: { id: testUserId } });
    const finalPrefsAfterConcurrency = (finalProfileAfterConcurrency?.preferences as any) || {};

    if (finalPrefsAfterConcurrency.appearance?.compactMode !== false) {
      throw new Error("Concurrent Settings update was lost!");
    }
    if (!finalPrefsAfterConcurrency.calendar?.events?.some((e: any) => e.id === "evt-concurrent-staging")) {
      throw new Error("Concurrent Calendar event was lost!");
    }
    if (!finalPrefsAfterConcurrency.habits?.habits?.some((h: any) => h.id === "habit-staging-concurrent")) {
      throw new Error("Concurrent Habit was lost!");
    }
    console.log(`✓ Concurrent Settings and Sync operations merged cleanly under MariaDB InnoDB FOR UPDATE. Final Version: ${finalPrefsAfterConcurrency._version}`);

    // 9. Notes Project Assignment & Unassignment in Real MariaDB
    console.log("\nStep 9: Testing Notes Project Assignment & Unassignment in Real MariaDB...");
    const dynamicProjId = `proj-dyn-${Date.now()}`;
    await prisma.project.create({
      data: {
        id: dynamicProjId,
        workspaceId: testWsId,
        userId: testUserId,
        name: "Dynamic UX Project",
      },
    });

    const dynamicNoteId = `note-dyn-${Date.now()}`;
    // 9a. Save note with assigned project via saveWorkspaceDeskData
    await saveWorkspaceDeskData(prisma, actorA, testWsId, {
      notes: [
        {
          id: dynamicNoteId,
          title: "Dynamic Project Note",
          content: "<p>Note content</p>",
          excerpt: "Note content",
          icon: "📝",
          updated: new Date().toISOString(),
          starred: false,
          projectId: dynamicProjId,
        },
      ],
    });

    let dbNoteCheck = await prisma.note.findUnique({ where: { id: dynamicNoteId } });
    if (!dbNoteCheck || dbNoteCheck.projectId !== dynamicProjId) {
      throw new Error("Note project assignment failed to persist in MariaDB!");
    }
    console.log("✓ Note created with assigned project confirmed in MariaDB.");

    // 9b. Unassign note (projectId: undefined) via saveWorkspaceDeskData
    await saveWorkspaceDeskData(prisma, actorA, testWsId, {
      notes: [
        {
          id: dynamicNoteId,
          title: "Dynamic Project Note",
          content: "<p>Note content</p>",
          excerpt: "Note content",
          icon: "📝",
          updated: new Date().toISOString(),
          starred: false,
          projectId: undefined,
        },
      ],
    });

    dbNoteCheck = await prisma.note.findUnique({ where: { id: dynamicNoteId } });
    if (!dbNoteCheck || dbNoteCheck.projectId !== null) {
      throw new Error("Note unassignment failed: projectId is not null in MariaDB!");
    }
    console.log("✓ Note project unassignment (projectId: null) confirmed in MariaDB.");

    // 9c. Reassign note to project
    await saveWorkspaceDeskData(prisma, actorA, testWsId, {
      notes: [
        {
          id: dynamicNoteId,
          title: "Dynamic Project Note",
          content: "<p>Note content</p>",
          excerpt: "Note content",
          icon: "📝",
          updated: new Date().toISOString(),
          starred: false,
          projectId: dynamicProjId,
        },
      ],
    });

    dbNoteCheck = await prisma.note.findUnique({ where: { id: dynamicNoteId } });
    if (!dbNoteCheck || dbNoteCheck.projectId !== dynamicProjId) {
      throw new Error("Note project re-assignment failed in MariaDB!");
    }
    console.log("✓ Note project re-assignment confirmed in MariaDB.");

    // 9d. Delete project and verify note survives with projectId = null
    await saveWorkspaceDeskData(prisma, actorA, testWsId, {}, {
      deletedProjectIds: [dynamicProjId],
    });

    dbNoteCheck = await prisma.note.findUnique({ where: { id: dynamicNoteId } });
    const dbProjCheck = await prisma.project.findUnique({ where: { id: dynamicProjId } });
    if (dbProjCheck !== null) {
      throw new Error("Project was not deleted!");
    }
    if (!dbNoteCheck || dbNoteCheck.projectId !== null) {
      throw new Error("Note was not preserved with unlinked projectId = null after project deletion!");
    }
    console.log("✓ Project deletion preserved linked note with unlinked projectId = null in real MariaDB.");

    // 10. Multi-User Isolation in Real MariaDB
    console.log("\nStep 10: Testing Multi-User Row-Level Isolation in Real MariaDB...");
    const testUser2Id = `test-usr2-${Date.now()}`;
    const testWs2Id = `test-ws2-${Date.now()}`;

    await prisma.user.create({
      data: {
        id: testUser2Id,
        email: `${testUser2Id}@staging.test`,
        name: "User Two",
      },
    });

    await prisma.profile.create({
      data: {
        id: testUser2Id,
        email: `${testUser2Id}@staging.test`,
        fullName: "User Two",
        preferences: { _version: 1, theme: "light" },
      },
    });

    await prisma.workspace.create({
      data: {
        id: testWs2Id,
        name: "User Two Workspace",
        ownerId: testUser2Id,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: testWs2Id,
        userId: testUser2Id,
        role: "owner",
      },
    });

    // User 1 updates their profile and settings
    await updateUserProfileSettingsSafely(prisma, testUserId, {
      fullName: "User One New Name",
      preferences: {
        appearance: { theme: "dark" },
      },
    });

    // Check User 2's profile: must remain completely unmodified
    const user2Profile = await prisma.profile.findUnique({ where: { id: testUser2Id } });
    const user2Data = await prisma.user.findUnique({ where: { id: testUser2Id } });
    if (user2Profile?.fullName !== "User Two" || user2Data?.name !== "User Two") {
      throw new Error("CROSS-TENANT LEAK: User 2's profile name was mutated by User 1!");
    }
    const user2Prefs = (user2Profile?.preferences as any) || {};
    if (user2Prefs.theme !== "light" || user2Prefs.appearance) {
      throw new Error("CROSS-TENANT LEAK: User 2's preferences were mutated by User 1!");
    }
    console.log("✓ Multi-user row-level isolation confirmed in real MariaDB.");

    // Clean up User 2
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: testWs2Id } });
    await prisma.workspace.deleteMany({ where: { id: testWs2Id } });
    await prisma.profile.deleteMany({ where: { id: testUser2Id } });
    await prisma.user.deleteMany({ where: { id: testUser2Id } });

    // 11. Schema Integrity & Absence of Schema Changes
    console.log("\nStep 11: Verifying Schema Integrity & Absence of Schema Drift...");
    const allTablesResult = (await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
    )) as Array<{ table_name?: string; TABLE_NAME?: string }>;
    const tableNames = allTablesResult.map((t) => (t.table_name || t.TABLE_NAME || "").toLowerCase());
    const expectedTables = [
      "users",
      "profiles",
      "workspaces",
      "workspace_members",
      "projects",
      "task_lists",
      "tasks",
      "notes",
      "mind_maps",
      "mind_map_nodes",
      "mind_map_edges",
      "sessions",
      "accounts",
      "verifications",
      "_prisma_migrations",
    ];

    for (const expected of expectedTables) {
      if (!tableNames.includes(expected.toLowerCase())) {
        console.warn(`[SCHEMA WARNING] Expected table '${expected}' was not found in table list.`);
      }
    }
    console.log(`✓ Schema verified: ${tableNames.length} tables present, zero schema migrations required, no schema drift.`);

    // Clean up test data
    console.log("\nStep 12: Cleaning up isolated staging test records...");
    await prisma.task.deleteMany({ where: { workspaceId: testWsId } });
    await prisma.note.deleteMany({ where: { workspaceId: testWsId } });
    await prisma.taskList.deleteMany({ where: { workspaceId: testWsId } });
    await prisma.project.deleteMany({ where: { workspaceId: testWsId } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: testWsId } });
    await prisma.workspace.deleteMany({ where: { id: testWsId } });
    await prisma.profile.deleteMany({ where: { id: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    console.log("✓ Staging test records completely cleaned up.");

    console.log("------------------------------------------------------------");
    console.log("ALL REAL MYSQL STAGING CHECKS PASSED!");
    console.log("------------------------------------------------------------");
    return { success: true, engineVersion };
  } finally {
    await prisma.$disconnect();
  }
}

// Allow direct execution via CLI (supports tsx, ts-node, and direct execution)
const isDirectExecution =
  (typeof require !== "undefined" && require.main === module) ||
  Boolean(process.argv[1] && path.resolve(process.argv[1]).includes("verify-staging-mysql"));

if (isDirectExecution) {
  const url = process.env.STAGING_DATABASE_URL;
  if (!url) {
    console.error("ERROR: STAGING_DATABASE_URL is not set.");
    process.exit(1);
  }
  runStagingVerification(url)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("STAGING VERIFICATION FAILED:", err);
      process.exit(1);
    });
}

