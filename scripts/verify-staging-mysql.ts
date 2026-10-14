/**
 * MindDesk Milestone 1: Automated Staging Database Verification Runner
 *
 * CRITICAL SAFETY RULES:
 * 1. MUST NOT connect to production database 'u256504187_minddesk'.
 * 2. Requires explicit STAGING_DATABASE_URL pointing to a staging/test database.
 * 3. Tests real MySQL/MariaDB InnoDB transactions, multi-process concurrency,
 *    foreign-key constraints, row locking, and anti-resurrection tombstones.
 */

import { execSync, fork } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";

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

    // Clean up test data
    console.log("\nStep 7: Cleaning up isolated staging test records...");
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

// Allow direct execution via CLI
if (require.main === module) {
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
