/**
 * MindDesk — Account-Scoped Productivity Data Cleanup CLI Tool
 *
 * Usage:
 *   npx tsx scripts/account-cleanup.ts --dry-run
 *   npx tsx scripts/account-cleanup.ts --execute --email=<target-email>
 */

import { prisma } from "../src/lib/db/prisma";
import {
  previewUserProductivityCleanup,
  executeUserProductivityCleanup,
} from "../src/lib/sync/cleanup-repository";

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const emailArg = args.find((a) => a.startsWith("--email="))?.replace("--email=", "");

  const targetEmail = emailArg || process.env.ADMIN_EMAIL || "faizan@minddesk.app";

  console.log("============================================================");
  console.log("MindDesk Account-Scoped Cleanup Tool");
  console.log("Mode:", isExecute ? "EXECUTE (DESTRUCTIVE DELETION)" : "DRY RUN (PREVIEW ONLY)");
  console.log("Target Email:", targetEmail);
  console.log("============================================================");

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    include: { profile: true },
  });

  if (!user) {
    console.error(`Error: User with email "${targetEmail}" not found in database.`);
    process.exit(1);
  }

  const workspaceId = user.profile?.defaultWorkspaceId;
  if (!workspaceId) {
    console.error(`Error: User "${targetEmail}" does not have a default workspace ID.`);
    process.exit(1);
  }

  const actor = { id: user.id, email: user.email };

  const preview = await previewUserProductivityCleanup(prisma, actor, workspaceId);

  console.log("\n[TARGET ACCOUNT VERIFICATION]");
  console.log("User ID:", preview.targetUser.id);
  console.log("Email:", preview.targetUser.email);
  console.log("Workspace ID:", preview.workspaceId);

  console.log("\n[RECORD COUNTS FOUND]");
  console.log("- Tasks:", preview.counts.tasks);
  console.log("- Notes:", preview.counts.notes);
  console.log("- Note Versions:", preview.counts.noteVersions);
  console.log("- Mind Maps:", preview.counts.mindMaps);
  console.log("- Mind Map Nodes:", preview.counts.mindMapNodes);
  console.log("- Mind Map Edges:", preview.counts.mindMapEdges);
  console.log("- Projects:", preview.counts.projects);
  console.log("- Custom Task Lists:", preview.counts.customTaskLists);
  console.log("- Calendar Events:", preview.counts.calendarEvents);
  console.log("- Scheduled Blocks:", preview.counts.scheduledBlocks);
  console.log("- Daily Plans:", preview.counts.dailyPlans);
  console.log("- Habits:", preview.counts.habits);
  console.log("- Habit Completions:", preview.counts.habitCompletions);
  console.log("- Routines:", preview.counts.routines);
  console.log("- Routine Sessions:", preview.counts.routineSessions);
  console.log("- Notifications:", preview.counts.notifications);
  console.log("------------------------------------------------------------");
  console.log("TOTAL PRODUCTIVITY RECORDS:", preview.counts.totalRecords);

  if (!isExecute) {
    console.log("\n[PREVIEW MODE ONLY] No records were deleted.");
    console.log("To execute deletion for this verified account, re-run with: --execute --email=" + targetEmail);
    process.exit(0);
  }

  console.log("\nExecuting safe transactional cleanup for verified account...");
  const result = await executeUserProductivityCleanup(prisma, actor, workspaceId);
  console.log("\n[SUCCESS] Cleanup completed successfully!");
  console.log("Timestamp:", result.timestamp);
  console.log("All productivity records removed. Single 'My Tasks' list and clean preferences restored.");
}

main()
  .catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
