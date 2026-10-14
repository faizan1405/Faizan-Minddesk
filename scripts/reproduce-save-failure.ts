import dotenv from "dotenv";
dotenv.config({ path: ".env.staging" });
import { PrismaClient } from "@prisma/client";
import { saveWorkspaceDeskData, getWorkspaceDeskData } from "../src/lib/sync/sync-repository";

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.STAGING_DATABASE_URL } },
  });

  try {
    // 1. Create a dummy test profile and workspace in staging
    const testUserId = `user_test_${Date.now()}`;
    const testWorkspaceId = `ws_test_${Date.now()}`;

    console.log(`Setting up test user ${testUserId} and workspace ${testWorkspaceId}...`);
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        name: "Test User",
      },
    });

    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        fullName: "Test User",
        preferences: {},
      },
    });

    await prisma.workspace.create({
      data: {
        id: testWorkspaceId,
        name: "Test Workspace",
        ownerId: testUserId,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        role: "owner",
      },
    });

    const actor = { id: testUserId, email: `${testUserId}@example.com` };

    console.log("Attempting save with existing frontend map payload (type: 'mind')...");
    try {
      const result = await saveWorkspaceDeskData(
        prisma,
        actor,
        testWorkspaceId,
        {
          maps: [
            {
              id: `map_${Date.now()}`,
              title: "Test Map 1",
              updated: "Just now",
              starred: false,
              nodes: [
                {
                  id: "root",
                  position: { x: 250, y: 150 },
                  data: { label: "Central Thought", color: "violet" },
                  type: "mind",
                },
                {
                  id: "idea",
                  position: { x: 570, y: 150 },
                  data: { label: "Add an idea", color: "blue" },
                  type: "mind",
                },
              ],
              edges: [
                { id: "root-idea", source: "root", target: "idea" },
              ],
            },
          ],
        }
      );
      console.log("Save result:", result);
    } catch (err: any) {
      console.error("EXPECTED ERROR REPRODUCED:");
      console.error("Error name:", err.name);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
    }

    // Cleanup
    await prisma.workspace.delete({ where: { id: testWorkspaceId } }).catch(() => {});
    await prisma.profile.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    console.log("Cleanup done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
