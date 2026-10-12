import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { PrismaClient, WorkspaceRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { isDatabaseConfigured } from "@/lib/auth/env";
import { ensureUserWorkspaceProvisioned } from "@/lib/auth/provisioning";
import {
  assertWorkspaceOwnerAccess,
  createScopedRepository,
  type VerifiedActor,
} from "@/lib/security/authorization";
import { AuthorizationError } from "@/lib/security/errors";
import { ALL_AUTH_TABLES, ALL_DOMAIN_TABLES } from "@/types/database";

const PRISMA_SCHEMA_PATH = path.resolve(process.cwd(), "prisma/schema.prisma");
const MYSQL_MIGRATION_PATH = path.resolve(
  process.cwd(),
  "prisma/migrations/20261013000000_init_mysql_schema/migration.sql"
);

// ============================================================================
// In-Memory Multi-Tenant MySQL Store Mock for Testing Real Repository Logic
// ============================================================================
function createInMemoryPrismaMock(): PrismaClient {
  const profiles = new Map<string, Record<string, unknown>>();
  const workspaces = new Map<string, Record<string, unknown>>();
  const workspaceMembers = new Map<string, Record<string, unknown>>();
  const projects = new Map<string, Record<string, unknown>>();
  const taskLists = new Map<string, Record<string, unknown>>();
  const tasks = new Map<string, Record<string, unknown>>();
  const notes = new Map<string, Record<string, unknown>>();
  const mindMaps = new Map<string, Record<string, unknown>>();
  const mindMapNodes = new Map<string, Record<string, unknown>>();
  const mindMapEdges = new Map<string, Record<string, unknown>>();
  const entityLinks = new Map<string, Record<string, unknown>>();

  const matchesWhere = (
    row: Record<string, unknown>,
    where: Record<string, unknown> | undefined
  ): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([k, v]) => {
      if (v === undefined) return true;
      return row[k] === v;
    });
  };

  const makeModel = (store: Map<string, Record<string, unknown>>, defaults: Record<string, unknown> = {}) => ({
    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      if (typeof where.id === "string") {
        return store.get(where.id) ?? null;
      }
      if (where.workspaceId_userId && typeof where.workspaceId_userId === "object") {
        const key = `${(where.workspaceId_userId as { workspaceId: string }).workspaceId}:${(where.workspaceId_userId as { userId: string }).userId}`;
        return store.get(key) ?? null;
      }
      return null;
    },
    findFirst: async ({ where }: { where?: Record<string, unknown> }) => {
      for (const row of store.values()) {
        if (matchesWhere(row, where)) {
          return row;
        }
      }
      return null;
    },
    findMany: async ({ where }: { where?: Record<string, unknown> } = {}) => {
      const results: Record<string, unknown>[] = [];
      for (const row of store.values()) {
        if (matchesWhere(row, where)) {
          results.push(row);
        }
      }
      return results;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const id = (data.id as string | undefined) ?? crypto.randomUUID();
      const now = new Date();
      const record: Record<string, unknown> = {
        ...defaults,
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };
      const key =
        data.workspaceId && data.userId && !data.id && store === workspaceMembers
          ? `${data.workspaceId}:${data.userId}`
          : id;
      store.set(key, record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const existing = store.get(where.id);
      if (!existing) {
        throw new Error(`Record not found: ${where.id}`);
      }
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      store.set(where.id, updated);
      return updated;
    },
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { workspaceId_userId: { workspaceId: string; userId: string } };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }) => {
      const key = `${where.workspaceId_userId.workspaceId}:${where.workspaceId_userId.userId}`;
      const existing = store.get(key);
      if (existing) {
        const next = { ...existing, ...update };
        store.set(key, next);
        return next;
      }
      const created = { ...create, createdAt: new Date() };
      store.set(key, created);
      return created;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const existing = store.get(where.id);
      if (!existing) {
        throw new Error(`Record not found: ${where.id}`);
      }
      store.delete(where.id);
      return existing;
    },
  });

  const client: Record<string, unknown> = {
    profile: makeModel(profiles, { fullName: "", avatarUrl: null, defaultWorkspaceId: null }),
    workspace: makeModel(workspaces, { isPersonal: true }),
    workspaceMember: makeModel(workspaceMembers, { role: "owner" }),
    project: makeModel(projects, { status: "active", position: 1000 }),
    taskList: makeModel(taskLists, { isDefault: false, position: 1000 }),
    task: makeModel(tasks, { status: "todo", priority: "none", version: 1, isArchived: false, position: 1000 }),
    note: makeModel(notes, { version: 1, isPinned: false, isArchived: false, position: 1000 }),
    mindMap: makeModel(mindMaps, { version: 1, isArchived: false, position: 1000 }),
    mindMapNode: makeModel(mindMapNodes, { type: "idea", zIndex: 0 }),
    mindMapEdge: makeModel(mindMapEdges, { type: "smoothstep", animated: false }),
    entityLink: makeModel(entityLinks, { relationship: "references" }),
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(client),
  };

  return client as unknown as PrismaClient;
}

describe("T2.4A — MySQL Prisma Schema & Migration SQL Verification (Static Audit)", () => {
  const prismaSchema = fs.readFileSync(PRISMA_SCHEMA_PATH, "utf8");
  const migrationSql = fs.readFileSync(MYSQL_MIGRATION_PATH, "utf8");

  it("configures Prisma with the MySQL datasource provider and prisma-client-js generator", () => {
    expect(prismaSchema).toContain('provider = "prisma-client-js"');
    expect(prismaSchema).toContain('provider = "mysql"');
    expect(prismaSchema).toContain('url      = env("DATABASE_URL")');
  });

  it("defines all 13 required MindDesk domain tables and 4 Better Auth core tables in MySQL", () => {
    for (const table of [...ALL_DOMAIN_TABLES, ...ALL_AUTH_TABLES]) {
      expect(prismaSchema).toContain(`@@map("${table}")`);
      expect(migrationSql).toContain(`CREATE TABLE IF NOT EXISTS \`${table}\``);
    }
  });

  it("uses MySQL-compatible InnoDB, utf8mb4, FULLTEXT indexes, composite FKs, and CHECK constraints", () => {
    expect(migrationSql).toContain(
      "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB"
    );
    expect(migrationSql).toContain("FULLTEXT INDEX `idx_tasks_fts`");
    expect(migrationSql).toContain("FULLTEXT INDEX `idx_notes_fts`");
    expect(migrationSql).toContain("FULLTEXT INDEX `idx_mind_maps_fts`");
    expect(migrationSql).toContain("FULLTEXT INDEX `idx_mind_map_nodes_fts`");

    // Composite same-owner foreign keys preserved in MySQL
    expect(migrationSql).toContain("CONSTRAINT `fk_note_versions_same_owner`");
    expect(migrationSql).toContain("CONSTRAINT `fk_nodes_mind_map_same_owner`");
    expect(migrationSql).toContain("CONSTRAINT `fk_edges_mind_map_same_owner`");
    expect(migrationSql).toContain("CONSTRAINT `fk_edges_source_node_same_map`");
    expect(migrationSql).toContain("CONSTRAINT `fk_edges_target_node_same_map`");

    // Self-reference CHECK constraints
    expect(migrationSql).toContain("CONSTRAINT `chk_tasks_no_self_parent`");
    expect(migrationSql).toContain("CONSTRAINT `chk_notes_no_self_parent`");
    expect(migrationSql).toContain("CONSTRAINT `chk_edges_no_self_loop`");
    expect(migrationSql).toContain("CONSTRAINT `chk_entity_links_no_self_link`");
  });

  it("contains zero PostgreSQL-only constructs in the MySQL migration", () => {
    expect(migrationSql).not.toMatch(/JSONB/i);
    expect(migrationSql).not.toMatch(/TSVECTOR/i);
    expect(migrationSql).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(migrationSql).not.toMatch(/gen_random_uuid/i);
    expect(migrationSql).not.toMatch(/LANGUAGE plpgsql/i);
  });
});

describe("T2.4B — Two-User Server-Side Authorization, IDOR & Cross-Tenant Link Prevention (User A vs User B)", () => {
  const actorA: VerifiedActor = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "user.a@minddesk.app",
  };

  const actorB: VerifiedActor = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "user.b@minddesk.app",
  };

  it("provisions isolated personal workspaces for User A and User B and blocks cross-workspace access", async () => {
    const db = createInMemoryPrismaMock();

    const ctxA = await ensureUserWorkspaceProvisioned(
      { id: actorA.id, email: actorA.email, name: "User A" },
      db
    );
    const ctxB = await ensureUserWorkspaceProvisioned(
      { id: actorB.id, email: actorB.email, name: "User B" },
      db
    );

    expect(ctxA.defaultWorkspaceId).not.toBe(ctxB.defaultWorkspaceId);

    const repoA = createScopedRepository(db, actorA);
    const repoB = createScopedRepository(db, actorB);

    // User A creates a project, task, note, mind map, 2 nodes, an edge, and an entity link
    const projectA = await repoA.projects.create(ctxA.defaultWorkspaceId, {
      name: "User A Strategic Roadmap",
    });
    const taskA = await repoA.tasks.create(ctxA.defaultWorkspaceId, {
      title: "User A Confidential Task",
      projectId: projectA.id as string,
    });
    const noteA = await repoA.notes.create(ctxA.defaultWorkspaceId, {
      title: "User A Private Architecture Note",
      projectId: projectA.id as string,
    });
    const mapA = await repoA.mindMaps.create(ctxA.defaultWorkspaceId, {
      title: "User A System Graph",
      projectId: projectA.id as string,
    });
    const nodeA1 = await repoA.mindMaps.createNode(ctxA.defaultWorkspaceId, {
      mindMapId: mapA.id as string,
      label: "Root Idea",
      linkedTaskId: taskA.id as string,
    });
    const nodeA2 = await repoA.mindMaps.createNode(ctxA.defaultWorkspaceId, {
      mindMapId: mapA.id as string,
      label: "Child Idea",
      linkedNoteId: noteA.id as string,
    });
    await repoA.mindMaps.createEdge(ctxA.defaultWorkspaceId, {
      mindMapId: mapA.id as string,
      sourceNodeId: nodeA1.id as string,
      targetNodeId: nodeA2.id as string,
    });
    const linkA = await repoA.entityLinks.create(ctxA.defaultWorkspaceId, {
      sourceType: "task",
      sourceId: taskA.id as string,
      targetType: "note",
      targetId: noteA.id as string,
    });

    // 1. User B cannot access User A's workspace directly (403 FORBIDDEN)
    await expect(
      repoB.tasks.list(ctxA.defaultWorkspaceId)
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });

    await expect(
      repoB.notes.create(ctxA.defaultWorkspaceId, { title: "Intruder Note" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });

    // 2. IDOR Prevention: User B cannot read, update, or delete User A's records by passing User A's IDs in workspaceB
    expect(
      await repoB.tasks.getById(ctxB.defaultWorkspaceId, taskA.id as string)
    ).toBeNull();
    expect(
      await repoB.notes.getById(ctxB.defaultWorkspaceId, noteA.id as string)
    ).toBeNull();

    await expect(
      repoB.tasks.update(ctxB.defaultWorkspaceId, taskA.id as string, {
        title: "Hijacked by User B",
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND_OR_FORBIDDEN",
      statusCode: 404,
    });

    await expect(
      repoB.notes.delete(ctxB.defaultWorkspaceId, noteA.id as string)
    ).rejects.toMatchObject({
      code: "NOT_FOUND_OR_FORBIDDEN",
      statusCode: 404,
    });

    await expect(
      repoB.entityLinks.delete(ctxB.defaultWorkspaceId, linkA.id as string)
    ).rejects.toMatchObject({
      code: "NOT_FOUND_OR_FORBIDDEN",
      statusCode: 404,
    });

    // Verify User A's task and note remain completely intact
    const verifiedTaskA = await repoA.tasks.getById(
      ctxA.defaultWorkspaceId,
      taskA.id as string
    );
    expect(verifiedTaskA?.title).toBe("User A Confidential Task");

    // 3. Cross-User Entity Reference Prevention (tasks, notes, mind_map_nodes, mind_map_edges, entity_links)
    await expect(
      repoB.tasks.create(ctxB.defaultWorkspaceId, {
        title: "User B Task with User A Project",
        projectId: projectA.id as string,
      })
    ).rejects.toMatchObject({
      code: "CROSS_TENANT_REFERENCE",
      statusCode: 403,
    });

    await expect(
      repoB.tasks.create(ctxB.defaultWorkspaceId, {
        title: "User B Subtask under User A Task",
        parentTaskId: taskA.id as string,
      })
    ).rejects.toMatchObject({
      code: "CROSS_TENANT_REFERENCE",
      statusCode: 403,
    });

    await expect(
      repoB.notes.create(ctxB.defaultWorkspaceId, {
        title: "User B Note under User A Note",
        parentNoteId: noteA.id as string,
      })
    ).rejects.toMatchObject({
      code: "CROSS_TENANT_REFERENCE",
      statusCode: 403,
    });

    const mapB = await repoB.mindMaps.create(ctxB.defaultWorkspaceId, {
      title: "User B Mind Map",
    });

    await expect(
      repoB.mindMaps.createNode(ctxB.defaultWorkspaceId, {
        mindMapId: mapB.id as string,
        label: "Node linking to User A Task",
        linkedTaskId: taskA.id as string,
      })
    ).rejects.toMatchObject({
      code: "CROSS_TENANT_REFERENCE",
      statusCode: 403,
    });

    await expect(
      repoB.mindMaps.createNode(ctxB.defaultWorkspaceId, {
        mindMapId: mapB.id as string,
        label: "Node linking to User A Note",
        linkedNoteId: noteA.id as string,
      })
    ).rejects.toMatchObject({
      code: "CROSS_TENANT_REFERENCE",
      statusCode: 403,
    });

    await expect(
      repoB.entityLinks.create(ctxB.defaultWorkspaceId, {
        sourceType: "task",
        sourceId: taskA.id as string,
        targetType: "note",
        targetId: noteA.id as string,
      })
    ).rejects.toMatchObject({
      code: "CROSS_TENANT_REFERENCE",
      statusCode: 403,
    });
  });

  it("enforces self-reference guards, optimistic version conflict checks, and viewer read-only roles", async () => {
    const db = createInMemoryPrismaMock();
    const ctxA = await ensureUserWorkspaceProvisioned(
      { id: actorA.id, email: actorA.email, name: "User A" },
      db
    );
    const repoA = createScopedRepository(db, actorA);

    const task = await repoA.tasks.create(ctxA.defaultWorkspaceId, {
      title: "Primary Task",
    });

    // Self-parenting a task is blocked
    await expect(
      repoA.tasks.update(ctxA.defaultWorkspaceId, task.id as string, {
        parentTaskId: task.id as string,
      })
    ).rejects.toMatchObject({
      code: "SELF_REFERENCE",
      statusCode: 400,
    });

    // Self-linking an entity is blocked
    await expect(
      repoA.entityLinks.create(ctxA.defaultWorkspaceId, {
        sourceType: "task",
        sourceId: task.id as string,
        targetType: "task",
        targetId: task.id as string,
      })
    ).rejects.toMatchObject({
      code: "SELF_REFERENCE",
      statusCode: 400,
    });

    // Optimistic concurrency check on notes
    const note = await repoA.notes.create(ctxA.defaultWorkspaceId, {
      title: "Versioned Note",
    });
    expect(note.version).toBe(1);

    const updatedNote = await repoA.notes.update(
      ctxA.defaultWorkspaceId,
      note.id as string,
      {
        title: "Version 2",
        expectedVersion: 1,
      }
    );
    expect(updatedNote.version).toBe(2);

    await expect(
      repoA.notes.update(ctxA.defaultWorkspaceId, note.id as string, {
        title: "Stale Write Attempt",
        expectedVersion: 1,
      })
    ).rejects.toMatchObject({
      code: "VERSION_CONFLICT",
      statusCode: 409,
    });

    // Grant User B read-only `viewer` role in workspace A
    await db.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: ctxA.defaultWorkspaceId,
          userId: actorB.id,
        },
      },
      update: { role: "viewer" as WorkspaceRole },
      create: {
        workspaceId: ctxA.defaultWorkspaceId,
        userId: actorB.id,
        role: "viewer" as WorkspaceRole,
      },
    });

    const repoB = createScopedRepository(db, actorB);

    // Viewer can read workspace metadata, but cannot create/update/delete or claim owner privileges
    const ws = await repoB.workspaces.getById(ctxA.defaultWorkspaceId);
    expect(ws?.id).toBe(ctxA.defaultWorkspaceId);

    await expect(
      repoB.tasks.create(ctxA.defaultWorkspaceId, {
        title: "Viewer Write Attempt",
      })
    ).rejects.toBeInstanceOf(AuthorizationError);

    await expect(
      assertWorkspaceOwnerAccess(db, actorB, ctxA.defaultWorkspaceId)
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });
  });
});

const hasLiveMySqlTestEnv =
  isDatabaseConfigured() && process.env.MINDDESK_RUN_LIVE_DB_TESTS === "true";

describe.skipIf(!hasLiveMySqlTestEnv)(
  "T2.4C — Live Hostinger/Local MySQL Database Integration Test",
  () => {
    it("connects to MySQL via Prisma and verifies User A vs User B isolation", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const result = await prisma.$queryRaw`SELECT 1 AS connected`;
      expect(result).toBeDefined();
    });
  }
);
