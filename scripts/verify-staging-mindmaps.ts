import dotenv from "dotenv";
dotenv.config({ path: ".env.staging" });
import { PrismaClient } from "@prisma/client";
import {
  saveWorkspaceDeskData,
  getWorkspaceDeskData,
} from "../src/lib/sync/sync-repository";

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.STAGING_DATABASE_URL } },
  });

  const testUserId = `mindmap-usr-${Date.now()}`;
  const testWsId = `mindmap-ws-${Date.now()}`;

  try {
    console.log("------------------------------------------------------------");
    console.log("PHASE 1 & 2: MIND MAP STAGING PERSISTENCE VERIFICATION");
    console.log("------------------------------------------------------------");

    // 0. Setup test user & workspace
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@staging.test`,
        name: "MindMap Test User",
      },
    });

    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `${testUserId}@staging.test`,
        fullName: "MindMap Test User",
        preferences: { _version: 1, _tombstones: {} },
      },
    });

    await prisma.workspace.create({
      data: {
        id: testWsId,
        name: "MindMap Staging Workspace",
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

    const actor = { id: testUserId, email: `${testUserId}@staging.test` };

    // STEP 1: Create Map 1 with root, child1, child2
    console.log("\nStep 1: Creating Map 1 with 3 nodes and 2 edges...");
    const map1Id = `map_1_${Date.now()}`;
    const nodeRoot = `node_root_${Date.now()}`;
    const nodeChild1 = `node_c1_${Date.now()}`;
    const nodeChild2 = `node_c2_${Date.now()}`;
    const edge1 = `edge_1_${Date.now()}`;
    const edge2 = `edge_2_${Date.now()}`;

    await saveWorkspaceDeskData(prisma, actor, testWsId, {
      maps: [
        {
          id: map1Id,
          title: "Architecture Map",
          updated: "Just now",
          starred: true,
          theme: "calm",
          layout: "balanced",
          nodes: [
            {
              id: nodeRoot,
              position: { x: 0, y: 0 },
              data: { label: "MindDesk Core", color: "violet" },
              type: "mind",
            },
            {
              id: nodeChild1,
              position: { x: 200, y: -50 },
              data: { label: "Database Layer", color: "blue" },
              type: "mind",
            },
            {
              id: nodeChild2,
              position: { x: 200, y: 50 },
              data: { label: "Frontend React Flow", color: "mint" },
              type: "mind",
            },
          ],
          edges: [
            { id: edge1, source: nodeRoot, target: nodeChild1 },
            { id: edge2, source: nodeRoot, target: nodeChild2 },
          ],
        },
      ],
    });

    // Verify retrieval
    let loaded = await getWorkspaceDeskData(prisma, actor, testWsId);
    if (loaded.maps.length !== 1) throw new Error("Expected 1 map in database");
    if (loaded.maps[0].nodes.length !== 3) throw new Error("Expected 3 nodes in map 1");
    if (loaded.maps[0].edges.length !== 2) throw new Error("Expected 2 edges in map 1");
    console.log("✓ Step 1 verified: Map 1 created and loaded with 3 nodes and 2 edges.");

    // STEP 2: Delete nodeChild2 and edge2; edit nodeChild1 label and position
    console.log("\nStep 2: Deleting nodeChild2 and edge2; updating nodeChild1...");
    await saveWorkspaceDeskData(prisma, actor, testWsId, {
      maps: [
        {
          id: map1Id,
          title: "Architecture Map Updated",
          updated: "Just now",
          starred: true,
          theme: "paper",
          layout: "horizontal",
          nodes: [
            {
              id: nodeRoot,
              position: { x: 10, y: 10 },
              data: { label: "MindDesk Core (Renamed)", color: "violet" },
              type: "mind",
            },
            {
              id: nodeChild1,
              position: { x: 300, y: 0 },
              data: { label: "Database Layer (MariaDB)", color: "amber" },
              type: "mind",
            },
          ],
          edges: [
            { id: edge1, source: nodeRoot, target: nodeChild1 },
          ],
        },
      ],
    });

    loaded = await getWorkspaceDeskData(prisma, actor, testWsId);
    if (loaded.maps[0].nodes.length !== 2) {
      throw new Error(`Expected 2 nodes after deletion, found ${loaded.maps[0].nodes.length}`);
    }
    if (loaded.maps[0].edges.length !== 1) {
      throw new Error(`Expected 1 edge after deletion, found ${loaded.maps[0].edges.length}`);
    }
    const c1Loaded = loaded.maps[0].nodes.find((n) => n.id === nodeChild1);
    if (c1Loaded?.data.label !== "Database Layer (MariaDB)") {
      throw new Error(`Node label not updated: ${c1Loaded?.data.label}`);
    }
    if (loaded.maps[0].theme !== "paper" || loaded.maps[0].layout !== "horizontal") {
      throw new Error("Theme or layout not updated");
    }
    console.log("✓ Step 2 verified: Deleted node and edge cleanly removed from MariaDB with zero resurrection.");

    // STEP 3: Multi-Map Isolation & Legacy ID collision handling
    console.log("\nStep 3: Creating Map 2 with legacy hardcoded IDs ('root', 'idea')...");
    const map2Id = `map_2_${Date.now()}`;
    await saveWorkspaceDeskData(prisma, actor, testWsId, {
      maps: [
        ...loaded.maps,
        {
          id: map2Id,
          title: "Legacy Map",
          updated: "Just now",
          starred: false,
          theme: "midnight",
          layout: "radial",
          nodes: [
            {
              id: "root",
              position: { x: 100, y: 100 },
              data: { label: "Legacy Root", color: "violet" },
              type: "mind",
            },
            {
              id: "idea",
              position: { x: 300, y: 100 },
              data: { label: "Legacy Idea", color: "blue" },
              type: "mind",
            },
          ],
          edges: [
            { id: "root-idea", source: "root", target: "idea" },
          ],
        },
      ],
    });

    loaded = await getWorkspaceDeskData(prisma, actor, testWsId);
    if (loaded.maps.length !== 2) throw new Error("Expected 2 maps in database");
    const map1Loaded = loaded.maps.find((m) => m.id === map1Id);
    const map2Loaded = loaded.maps.find((m) => m.id === map2Id);
    if (!map1Loaded || !map2Loaded) throw new Error("Both maps must exist");
    if (map1Loaded.nodes.length !== 2) throw new Error("Map 1 nodes corrupted by Map 2");
    if (map2Loaded.nodes.length !== 2) throw new Error("Map 2 nodes missing");
    console.log("✓ Step 3 verified: Multiple maps with independent / legacy IDs co-exist without collision.");

    // STEP 4: Partial workspace save (Tasks and Notes) preserves MindMaps
    console.log("\nStep 4: Saving unrelated task & note without data.maps...");
    const taskId = `task_${Date.now()}`;
    await saveWorkspaceDeskData(prisma, actor, testWsId, {
      tasks: [
        {
          id: taskId,
          title: "Verify MindMap Safety",
          complete: false,
          listId: "list-my-tasks",
          note: "",
          due: "",
          priority: "medium",
          starred: false,
          subtasks: [],
        },
      ],
    });

    loaded = await getWorkspaceDeskData(prisma, actor, testWsId);
    if (loaded.maps.length !== 2) throw new Error("Unrelated save erased maps!");
    if (loaded.tasks.length !== 1) throw new Error("Task not saved!");
    console.log("✓ Step 4 verified: Unrelated workspace saves preserve existing mind maps and nodes.");

    // STEP 5: Delete Map 2 cleanly with options.deletedMapIds
    console.log("\nStep 5: Deleting Map 2 with options.deletedMapIds...");
    await saveWorkspaceDeskData(
      prisma,
      actor,
      testWsId,
      {
        maps: [map1Loaded],
      },
      {
        deletedMapIds: [map2Id],
      }
    );

    loaded = await getWorkspaceDeskData(prisma, actor, testWsId);
    if (loaded.maps.length !== 1 || loaded.maps[0].id !== map1Id) {
      throw new Error("Map 2 deletion failed");
    }
    const dbMap2Nodes = await prisma.mindMapNode.count({ where: { mindMapId: map2Id } });
    if (dbMap2Nodes !== 0) throw new Error("Map 2 nodes orphaned in MariaDB");
    console.log("✓ Step 5 verified: Map 2 and its nodes deleted cleanly from MariaDB.");

    console.log("\n------------------------------------------------------------");
    console.log("ALL REAL MARIADB MIND MAP PERSISTENCE TESTS PASSED!");
    console.log("------------------------------------------------------------");
  } finally {
    // Cleanup
    await prisma.workspace.delete({ where: { id: testWsId } }).catch(() => {});
    await prisma.profile.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN STAGING VERIFICATION:", err);
  process.exit(1);
});
