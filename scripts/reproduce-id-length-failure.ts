import dotenv from "dotenv";
dotenv.config({ path: ".env.staging" });
import { PrismaClient } from "@prisma/client";
import { saveWorkspaceDeskData } from "../src/lib/sync/sync-repository";
import { createDefaultMindMap } from "../src/features/minddesk/utils/mind-map-utils";

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.STAGING_DATABASE_URL } },
  });

  const testUserId = `test-repro-${Date.now()}`.slice(0, 36);
  const testWsId = `ws-repro-${Date.now()}`.slice(0, 36);

  try {
    console.log("-----------------------------------------------------------------");
    console.log("REPRODUCING EXACT FAILURE WITH createDefaultMindMap() ON STAGING");
    console.log("-----------------------------------------------------------------");

    // 0. Setup test user and workspace
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        name: "Repro User",
      },
    });

    await prisma.profile.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        fullName: "Repro User",
        preferences: {},
      },
    });

    await prisma.workspace.create({
      data: {
        id: testWsId,
        name: "Repro Workspace",
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

    const actor = { id: testUserId, email: `${testUserId}@example.com` };

    // 1. Generate map with the real UI factory:
    const defaultMap = createDefaultMindMap("My Brand New Map");
    console.log("Created default map:");
    console.log(`  Map ID: "${defaultMap.id}" (length: ${defaultMap.id.length})`);
    for (const n of defaultMap.nodes) {
      console.log(`  Node ID: "${n.id}" (length: ${n.id.length})`);
    }
    for (const e of defaultMap.edges) {
      console.log(`  Edge ID: "${e.id}" (length: ${e.id.length}, source: "${e.source}", target: "${e.target}")`);
    }

    console.log("\nAttempting saveWorkspaceDeskData with real staging MariaDB...");
    const result = await saveWorkspaceDeskData(prisma, actor, testWsId, {
      maps: [defaultMap],
    });
    console.log("Result:", result);
  } catch (error: any) {
    console.error("\n>>> CAUGHT EXPECTED ERROR <<<");
    console.error("Error Name:", error?.name);
    console.error("Error Code:", error?.code);
    console.error("Error Message:", error?.message);
    console.error("Meta:", JSON.stringify(error?.meta, null, 2));
  } finally {
    // Cleanup
    try {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: testWsId } });
      await prisma.workspace.deleteMany({ where: { id: testWsId } });
      await prisma.profile.deleteMany({ where: { id: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch {}
    await prisma.$disconnect();
  }
}

main();
