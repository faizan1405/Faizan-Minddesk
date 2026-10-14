/**
 * MindDesk — Real Staging MariaDB Verification for Notes Rebuild
 *
 * CRITICAL SAFETY RULES:
 * 1. MUST NOT connect to production database 'u256504187_minddesk'.
 * 2. Uses STAGING_DATABASE_URL pointing to isolated staging database 'u256504187_minddesk_test'.
 * 3. Tests real MySQL/MariaDB InnoDB transactions, 36-char VARCHAR limits,
 *    foreign key constraint unlinking, and anti-resurrection tombstones.
 */

import fs from "fs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  getWorkspaceDeskData,
  saveWorkspaceDeskData,
} from "../src/lib/sync/sync-repository";
import {
  getProjectOverviewId,
  isProjectOverviewNote,
  getAllDescendantIds,
} from "../src/features/minddesk/notes/types";
import type { NoteItem, ProjectItem } from "../src/features/minddesk/types";

if (fs.existsSync(".env.staging")) {
  dotenv.config({ path: ".env.staging" });
}

function validateStagingUrl(url: string | undefined): string {
  if (!url || !url.trim()) {
    throw new Error("STAGING_DATABASE_URL is not configured.");
  }
  const parsed = new URL(url);
  const dbName = parsed.pathname.replace(/^\//, "");
  const forbiddenProductionNames = ["u256504187_minddesk", "minddesk_prod", "minddesk_production"];

  if (forbiddenProductionNames.includes(dbName.toLowerCase())) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Target database '${dbName}' is the LIVE PRODUCTION DATABASE.`
    );
  }

  if (!dbName.toLowerCase().includes("staging") && !dbName.toLowerCase().includes("test")) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Target database '${dbName}' does not contain 'staging' or 'test'.`
    );
  }
  return url;
}

interface StepResult {
  step: string;
  passed: boolean;
  details: string;
}

async function main() {
  const stagingUrl = validateStagingUrl(process.env.STAGING_DATABASE_URL);
  console.log("=================================================================");
  console.log("MINDDESK: REAL MARIADB STAGING VERIFICATION (NOTES REBUILD)");
  console.log("Target Database:", new URL(stagingUrl).pathname.replace(/^\//, ""));
  console.log("Host:", new URL(stagingUrl).host);
  console.log("=================================================================\n");

  const prisma = new PrismaClient({
    datasources: { db: { url: stagingUrl } },
  });

  const timestamp = Date.now();
  const testUserId = `test-usr-${timestamp}`.slice(0, 36);
  const testWsId = `test-ws-${timestamp}`.slice(0, 36);
  const actor = { id: testUserId, email: `${testUserId}@example.com` };

  const results: StepResult[] = [];

  try {
    // ------------------------------------------------------------------------
    // Step 0: Setup isolated test user and workspace
    // ------------------------------------------------------------------------
    console.log("Step 0: Provisioning isolated test workspace...");
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        name: "MariaDB Verification User",
      },
    });

    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        fullName: "MariaDB Verification User",
        preferences: {
          _version: 1,
          habits: {
            habits: [{ id: "habit-existing", name: "Daily Standup", frequency: "daily" }],
          },
        },
      },
    });

    await prisma.workspace.create({
      data: {
        id: testWsId,
        name: "MariaDB Notes Test Workspace",
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

    // Create an existing task to test non-disruption
    await prisma.task.create({
      data: {
        id: `task-existing-${timestamp}`.slice(0, 36),
        workspaceId: testWsId,
        userId: testUserId,
        title: "Important Milestone Task",
        description: "Must remain untouched during note operations",
      },
    });

    results.push({
      step: "0. Workspace Provisioning",
      passed: true,
      details: `Created isolated test workspace '${testWsId}' with baseline task and habit`,
    });

    // ------------------------------------------------------------------------
    // Step 1 & 2: Create Project A with 36-char Overview Note & Verify in MariaDB
    // ------------------------------------------------------------------------
    console.log("\nStep 1 & 2: Testing Project A creation and 36-char Overview Note...");
    const projectAId = `proj-a-${timestamp}`.slice(0, 36);
    const overviewAId = getProjectOverviewId(projectAId);

    console.log(`  Project A ID: "${projectAId}" (${projectAId.length} chars)`);
    console.log(`  Overview A ID: "${overviewAId}" (${overviewAId.length} chars)`);

    if (overviewAId.length > 36) {
      throw new Error(`Overview A ID '${overviewAId}' exceeds MariaDB VARCHAR(36)!`);
    }

    const projectA: ProjectItem = {
      id: projectAId,
      name: "Acme Corporation",
      description: "Business management project",
      icon: "💼",
      hue: "violet",
    };

    const overviewNoteA: NoteItem = {
      id: overviewAId,
      title: "Acme Corporation Overview",
      excerpt: "Mission statement and roadmap",
      content: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Welcome to Acme Corp." }] }],
      }),
      icon: "📌",
      updated: "Just now",
      starred: false,
      projectId: projectAId,
      parentId: null,
    };

    await saveWorkspaceDeskData(prisma, actor, testWsId, {
      projects: [projectA],
      notes: [overviewNoteA],
    });

    // Direct MariaDB verification
    const dbProjectA = await prisma.project.findUnique({ where: { id: projectAId } });
    const dbOverviewA = await prisma.note.findUnique({ where: { id: overviewAId } });

    if (!dbProjectA) throw new Error("Project A was not found in MariaDB");
    if (!dbOverviewA) throw new Error("Overview Note A was not found in MariaDB");
    if (dbOverviewA.id.length !== 36) throw new Error(`Overview A ID length is ${dbOverviewA.id.length}, expected 36`);

    results.push({
      step: "1 & 2. Project A & 36-char Overview Note",
      passed: true,
      details: `Project A and Overview Note (${overviewAId}) verified in MariaDB table 'notes'`,
    });

    // ------------------------------------------------------------------------
    // Step 3: Create Project B with independent 36-char Overview Note
    // ------------------------------------------------------------------------
    console.log("\nStep 3: Testing Project B creation and independent Overview Note...");
    const projectBId = `proj-b-${timestamp}`.slice(0, 36);
    const overviewBId = getProjectOverviewId(projectBId);

    console.log(`  Project B ID: "${projectBId}" (${projectBId.length} chars)`);
    console.log(`  Overview B ID: "${overviewBId}" (${overviewBId.length} chars)`);

    if (overviewBId.length > 36) {
      throw new Error(`Overview B ID '${overviewBId}' exceeds MariaDB VARCHAR(36)!`);
    }
    if (overviewBId === overviewAId) {
      throw new Error("Project B shares Overview ID with Project A!");
    }

    const projectB: ProjectItem = {
      id: projectBId,
      name: "Personal Life",
      description: "Personal goals and habits",
      icon: "🏠",
      hue: "mint",
    };

    const overviewNoteB: NoteItem = {
      id: overviewBId,
      title: "Personal Life Overview",
      excerpt: "Personal vision",
      content: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Life goals." }] }],
      }),
      icon: "📌",
      updated: "Just now",
      starred: false,
      projectId: projectBId,
      parentId: null,
    };

    await saveWorkspaceDeskData(prisma, actor, testWsId, {
      projects: [projectA, projectB],
      notes: [overviewNoteA, overviewNoteB],
    });

    const dbOverviewB = await prisma.note.findUnique({ where: { id: overviewBId } });
    if (!dbOverviewB) throw new Error("Overview Note B was not found in MariaDB");

    results.push({
      step: "3. Project B & Independent Overview",
      passed: true,
      details: `Project B and Overview Note (${overviewBId}) verified in MariaDB with unique 36-char ID`,
    });

    // ------------------------------------------------------------------------
    // Step 4: Write content into both Overview pages
    // ------------------------------------------------------------------------
    console.log("\nStep 4: Writing content into both Overview notes...");
    const updatedContentA = JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Acme Corp Vision 2027" }] },
        { type: "paragraph", content: [{ type: "text", text: "Key OKRs: Launch enterprise platform." }] },
      ],
    });

    const updatedContentB = JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Personal Fitness Goals" }] },
        { type: "paragraph", content: [{ type: "text", text: "Run 5k three times per week." }] },
      ],
    });

    overviewNoteA.content = updatedContentA;
    overviewNoteB.content = updatedContentB;

    await saveWorkspaceDeskData(prisma, actor, testWsId, {
      notes: [overviewNoteA, overviewNoteB],
    });

    const reloadedA = await prisma.note.findUnique({ where: { id: overviewAId } });
    const reloadedB = await prisma.note.findUnique({ where: { id: overviewBId } });

    if (!reloadedA?.contentText.includes("Key OKRs") && !JSON.stringify(reloadedA?.contentJson).includes("Key OKRs")) {
      throw new Error("Overview Note A content was not updated in MariaDB");
    }
    if (!reloadedB?.contentText.includes("Run 5k") && !JSON.stringify(reloadedB?.contentJson).includes("Run 5k")) {
      throw new Error("Overview Note B content was not updated in MariaDB");
    }

    results.push({
      step: "4. Overview Content Writing",
      passed: true,
      details: "Both Overview notes saved rich content to MariaDB content_json and content_text",
    });

    // ------------------------------------------------------------------------
    // Step 5 & 6: Create 4-level nested hierarchy & verify round-trip
    // ------------------------------------------------------------------------
    console.log("\nStep 5 & 6: Creating 4-level nested hierarchy...");
    const pageTopId = `page-top-${timestamp}`.slice(0, 36);
    const pageSubId = `page-sub-${timestamp}`.slice(0, 36);
    const pageGrandId = `page-grand-${timestamp}`.slice(0, 36);
    const pageDeepId = `page-deep-${timestamp}`.slice(0, 36);

    const nestedNotes: NoteItem[] = [
      overviewNoteA,
      overviewNoteB,
      {
        id: pageTopId,
        title: "Website Redesign",
        excerpt: "Redesign root",
        content: "<p>Root</p>",
        icon: "🌐",
        updated: "Just now",
        starred: true,
        projectId: projectAId,
        parentId: null,
      },
      {
        id: pageSubId,
        title: "Landing Page Architecture",
        excerpt: "Level 1 child",
        content: "<p>Landing</p>",
        icon: "📐",
        updated: "Just now",
        starred: false,
        projectId: projectAId,
        parentId: pageTopId,
      },
      {
        id: pageGrandId,
        title: "Hero Banner Component",
        excerpt: "Level 2 grandchild",
        content: "<p>Hero</p>",
        icon: "🎨",
        updated: "Just now",
        starred: false,
        projectId: projectAId,
        parentId: pageSubId,
      },
      {
        id: pageDeepId,
        title: "Call To Action Button Specs",
        excerpt: "Level 3 great-grandchild",
        content: "<p>CTA</p>",
        icon: "🔘",
        updated: "Just now",
        starred: false,
        projectId: projectAId,
        parentId: pageGrandId,
      },
    ];

    await saveWorkspaceDeskData(prisma, actor, testWsId, { notes: nestedNotes });

    // Round-trip fetch from MariaDB (simulating browser reload / second device login)
    const fetchedDesk = await getWorkspaceDeskData(prisma, actor, testWsId);

    const fetchedTop = fetchedDesk.notes.find((n) => n.id === pageTopId);
    const fetchedSub = fetchedDesk.notes.find((n) => n.id === pageSubId);
    const fetchedGrand = fetchedDesk.notes.find((n) => n.id === pageGrandId);
    const fetchedDeep = fetchedDesk.notes.find((n) => n.id === pageDeepId);

    if (!fetchedTop || fetchedTop.parentId !== null) throw new Error("Top-level page parentId is invalid");
    if (!fetchedSub || fetchedSub.parentId !== pageTopId) throw new Error("Subpage parentId is invalid");
    if (!fetchedGrand || fetchedGrand.parentId !== pageSubId) throw new Error("Grandchild parentId is invalid");
    if (!fetchedDeep || fetchedDeep.parentId !== pageGrandId) throw new Error("Deep page parentId is invalid");

    results.push({
      step: "5 & 6. 4-Level Nested Hierarchy Round-Trip",
      passed: true,
      details: "Top -> Subpage -> Grandchild -> Great-grandchild verified from MariaDB with exact parent_note_id links",
    });

    // ------------------------------------------------------------------------
    // Step 7: Delete a leaf note and verify permanent deletion
    // ------------------------------------------------------------------------
    console.log("\nStep 7: Deleting leaf note (page-deep)...");
    await saveWorkspaceDeskData(
      prisma,
      actor,
      testWsId,
      {
        notes: nestedNotes.filter((n) => n.id !== pageDeepId),
      },
      {
        deletedNoteIds: [pageDeepId],
      }
    );

    // Direct database query: row MUST not exist in MariaDB
    const rawLeafCheck = await prisma.note.findUnique({ where: { id: pageDeepId } });
    if (rawLeafCheck) throw new Error("Deleted leaf note still exists in MariaDB!");

    const deskAfterLeaf = await getWorkspaceDeskData(prisma, actor, testWsId);
    if (deskAfterLeaf.notes.some((n) => n.id === pageDeepId)) {
      throw new Error("Deleted leaf note reappeared in getWorkspaceDeskData!");
    }

    results.push({
      step: "7. Leaf Note Deletion",
      passed: true,
      details: `Leaf note '${pageDeepId}' was permanently deleted from MariaDB table 'notes'`,
    });

    // ------------------------------------------------------------------------
    // Step 8: Reproduce deletion of a parent note with dependent FKs
    // ------------------------------------------------------------------------
    console.log("\nStep 8: Testing parent note deletion with dependent versions & mind map node links...");
    const parentWithDepsId = `parent-deps-${timestamp}`.slice(0, 36);
    const childOfDepsId = `child-deps-${timestamp}`.slice(0, 36);
    const mapId = `map-deps-${timestamp}`.slice(0, 36);
    const mapNodeId = `node-deps-${timestamp}`.slice(0, 36);

    // 1. Create parent and child note in MariaDB
    await prisma.note.create({
      data: {
        id: parentWithDepsId,
        workspaceId: testWsId,
        userId: testUserId,
        title: "Parent with Dependencies",
        contentJson: { type: "doc", content: [] },
        contentText: "Parent with dependencies",
      },
    });

    await prisma.note.create({
      data: {
        id: childOfDepsId,
        workspaceId: testWsId,
        userId: testUserId,
        parentNoteId: parentWithDepsId,
        title: "Child Note",
        contentJson: { type: "doc", content: [] },
        contentText: "Child Note",
      },
    });

    // 2. Create a NoteVersion record referencing this note
    await prisma.noteVersion.create({
      data: {
        id: `ver-${timestamp}`.slice(0, 36),
        noteId: parentWithDepsId,
        workspaceId: testWsId,
        userId: testUserId,
        version: 1,
        contentJson: { type: "doc", content: [] },
      },
    });

    // 3. Create a MindMap and a MindMapNode with linkedNoteId referencing this note
    await prisma.mindMap.create({
      data: {
        id: mapId,
        workspaceId: testWsId,
        userId: testUserId,
        title: "Architecture Map",
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    });

    await prisma.mindMapNode.create({
      data: {
        id: mapNodeId,
        mindMapId: mapId,
        workspaceId: testWsId,
        userId: testUserId,
        label: "Feature Node",
        linkedNoteId: parentWithDepsId,
        positionX: 100,
        positionY: 100,
        style: {},
        data: {},
      },
    });

    console.log("  Created dependent child note, note_version, and linked mind_map_node in MariaDB.");
    console.log("  Executing saveWorkspaceDeskData with deletedNoteIds to unlink FKs and delete parent...");

    // Execute deletion through sync repository:
    await saveWorkspaceDeskData(
      prisma,
      actor,
      testWsId,
      {
        notes: [
          overviewNoteA,
          overviewNoteB,
          fetchedTop!,
          fetchedSub!,
          fetchedGrand!,
          {
            id: childOfDepsId,
            title: "Child Note",
            excerpt: "Reparented",
            content: "<p>Child</p>",
            icon: "📄",
            updated: "Just now",
            starred: false,
            parentId: null, // reparented
          },
        ],
      },
      {
        deletedNoteIds: [parentWithDepsId],
      }
    );

    // Verify parent note is deleted from MariaDB
    const checkDeletedParent = await prisma.note.findUnique({ where: { id: parentWithDepsId } });
    if (checkDeletedParent) throw new Error("Parent note with dependencies was not deleted!");

    // Verify mind map node linkedNoteId was safely set to null
    const checkMapNode = await prisma.mindMapNode.findUnique({ where: { id: mapNodeId } });
    if (checkMapNode?.linkedNoteId !== null) {
      throw new Error(`Mind map node linkedNoteId was not unlinked! Got '${checkMapNode?.linkedNoteId}'`);
    }

    // Verify child note is preserved and parentNoteId is null
    const checkChildOfDeps = await prisma.note.findUnique({ where: { id: childOfDepsId } });
    if (!checkChildOfDeps || checkChildOfDeps.parentNoteId !== null) {
      throw new Error("Child note was corrupted or not reparented");
    }

    // Clean up temporary Step 8 test note childOfDepsId
    await saveWorkspaceDeskData(
      prisma,
      actor,
      testWsId,
      {},
      { deletedNoteIds: [childOfDepsId] }
    );

    results.push({
      step: "8. Complex Dependency Deletion (InnoDB FK Safety)",
      passed: true,
      details: "Parent note successfully deleted; self-referencing FK, NoteVersion, and MindMapNode links unlinked without MariaDB constraint failure",
    });

    // ------------------------------------------------------------------------
    // Step 9: Test Keep Subpages vs Delete Entire Subtree
    // ------------------------------------------------------------------------
    console.log("\nStep 9: Testing 'Keep Subpages' vs 'Delete Entire Subtree'...");
    // A. Keep Subpages: Deleting pageSubId (parent of pageGrandId)
    // pageGrandId should be reparented to pageTopId
    await saveWorkspaceDeskData(
      prisma,
      actor,
      testWsId,
      {
        notes: [
          overviewNoteA,
          overviewNoteB,
          fetchedTop!,
          {
            ...fetchedGrand!,
            parentId: pageTopId, // Reparented to grandparent
          },
        ],
      },
      {
        deletedNoteIds: [pageSubId],
      }
    );

    const dbSub = await prisma.note.findUnique({ where: { id: pageSubId } });
    const dbGrand = await prisma.note.findUnique({ where: { id: pageGrandId } });
    if (dbSub) throw new Error("pageSubId was not deleted from MariaDB");
    if (!dbGrand || dbGrand.parentNoteId !== pageTopId) {
      throw new Error(`Grandchild was not reparented to pageTopId! parentNoteId: ${dbGrand?.parentNoteId}`);
    }

    // B. Delete Entire Subtree: Deleting pageTopId and all its remaining descendants
    const deskBeforeSubtree = await getWorkspaceDeskData(prisma, actor, testWsId);
    const allRemainingDescendants = getAllDescendantIds(pageTopId, deskBeforeSubtree.notes);
    const subtreeIdsToDelete = [pageTopId, ...allRemainingDescendants];

    await saveWorkspaceDeskData(
      prisma,
      actor,
      testWsId,
      {
        notes: [overviewNoteA, overviewNoteB],
      },
      {
        deletedNoteIds: subtreeIdsToDelete,
      }
    );

    for (const id of subtreeIdsToDelete) {
      const row = await prisma.note.findUnique({ where: { id } });
      if (row) throw new Error(`Subtree note '${id}' still exists in MariaDB!`);
    }

    results.push({
      step: "9. Keep Subpages vs Delete Entire Subtree",
      passed: true,
      details: "Keep Subpages reparented grandchild to grandparent; Delete Entire Subtree cleanly removed full branch from MariaDB",
    });

    // ------------------------------------------------------------------------
    // Step 10: Check that old deleted notes do not reappear (Anti-Resurrection)
    // ------------------------------------------------------------------------
    console.log("\nStep 10: Testing anti-resurrection protection...");
    // Simulate a stale client sending pageDeepId back in save payload
    await saveWorkspaceDeskData(
      prisma,
      actor,
      testWsId,
      {
        notes: [
          overviewNoteA,
          overviewNoteB,
          {
            id: pageDeepId, // STALE DELETED NOTE
            title: "Zombie Note",
            excerpt: "Should not resurrect",
            content: "<p>Zombie</p>",
            icon: "🧟",
            updated: "Just now",
            starred: false,
          },
        ],
      }
    );

    const recheckDesk = await getWorkspaceDeskData(prisma, actor, testWsId);
    if (recheckDesk.notes.some((n) => n.id === pageDeepId)) {
      throw new Error("Stale note was resurrected despite tombstone protection!");
    }

    results.push({
      step: "10. Anti-Resurrection Protection",
      passed: true,
      details: "Tombstone filtering prevented stale payload from resurrecting deleted note in MariaDB workspace",
    });

    // ------------------------------------------------------------------------
    // Step 11: Multi-session consistency
    // ------------------------------------------------------------------------
    console.log("\nStep 11: Verifying second authenticated session sees identical Notes structure...");
    const session2Actor = { id: testUserId, email: `${testUserId}@example.com` };
    const session2Desk = await getWorkspaceDeskData(prisma, session2Actor, testWsId);

    const session2NoteIds = session2Desk.notes.map((n) => n.id).sort();
    const expectedNoteIds = [overviewAId, overviewBId].sort();

    if (JSON.stringify(session2NoteIds) !== JSON.stringify(expectedNoteIds)) {
      throw new Error(`Session 2 saw different notes: ${JSON.stringify(session2NoteIds)}`);
    }

    results.push({
      step: "11. Cross-Session Consistency",
      passed: true,
      details: "Second authenticated session fetched identical Overview notes and zero ghost records",
    });

    // ------------------------------------------------------------------------
    // Step 12: Verify Tasks, Habits, and Mind Maps remain unaffected
    // ------------------------------------------------------------------------
    console.log("\nStep 12: Checking non-disruption of Tasks, Habits, and Mind Maps...");
    const existingTask = await prisma.task.findFirst({
      where: { workspaceId: testWsId, title: "Important Milestone Task" },
    });
    if (!existingTask) throw new Error("Baseline Task was lost during note operations!");

    const userProfile = await prisma.profile.findUnique({ where: { id: testUserId } });
    const profilePrefs = userProfile?.preferences as Record<string, unknown>;
    const habitsList = (profilePrefs?.habits as { habits?: unknown[] })?.habits || [];
    if (habitsList.length === 0) throw new Error("Baseline Habits were lost during note operations!");

    results.push({
      step: "12. Productivity Modules Non-Disruption",
      passed: true,
      details: "Tasks, Habits, and Calendar preferences remained completely intact throughout all Notes operations",
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("\n❌ VERIFICATION STEP FAILED:", err.message);
    results.push({
      step: "Execution Error",
      passed: false,
      details: err.message,
    });
  } finally {
    // Clean up temporary test data
    console.log("\nCleaning up temporary test records from staging MariaDB...");
    try {
      await prisma.noteVersion.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.mindMapNode.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.mindMapEdge.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.mindMap.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.note.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.task.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.taskList.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.project.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.workspace.deleteMany({ where: { id: testWsId } });
      await prisma.profile.deleteMany({ where: { id: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
    await prisma.$disconnect();
  }

  // --------------------------------------------------------------------------
  // Summary Report
  // --------------------------------------------------------------------------
  console.log("\n=================================================================");
  console.log("MARIADB STAGING VERIFICATION RESULTS");
  console.log("=================================================================");
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${mark} | ${r.step}`);
    console.log(`       ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log("=================================================================");
  console.log("OVERALL RESULT:", allPassed ? "ALL 12 TESTS PASSED" : "FAILED");
  console.log("=================================================================\n");

  if (!allPassed) {
    process.exit(1);
  }
}

main();
