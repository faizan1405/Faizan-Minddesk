import dotenv from "dotenv";
dotenv.config({ path: ".env.staging" });
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.STAGING_DATABASE_URL } },
  });
  try {
    const maps = await prisma.mindMap.findMany({
      include: { nodes: true, edges: true },
    });
    console.log("Staging MindMaps Count:", maps.length);
    for (const m of maps) {
      console.log(`Map id=${m.id}, title="${m.title}", nodes=${m.nodes.length}, edges=${m.edges.length}`);
      for (const n of m.nodes) {
        console.log(`  Node id=${n.id}, type=${n.type}, label="${n.label}"`);
      }
      for (const e of m.edges) {
        console.log(`  Edge id=${e.id}, source=${e.sourceNodeId}, target=${e.targetNodeId}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
