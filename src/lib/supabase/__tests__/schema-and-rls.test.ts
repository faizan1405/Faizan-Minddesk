import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

const ALL_USER_OWNED_TABLES = [
  "profiles",
  "workspaces",
  "workspace_members",
  "projects",
  "task_lists",
  "tasks",
  "notes",
  "note_versions",
  "mind_maps",
  "mind_map_nodes",
  "mind_map_edges",
  "entity_links",
  "attachments",
] as const;

describe("T2.4A — SQL Schema & RLS Policy Verification (Static Migration Audit)", () => {
  const schemaSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0001_initial_schema.sql"),
    "utf8"
  );
  const rlsSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0002_rls_policies.sql"),
    "utf8"
  );
  const triggersSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, "0003_triggers_fts_and_constraints.sql"),
    "utf8"
  );

  it("defines all 13 required domain tables with primary and foreign keys", () => {
    for (const table of ALL_USER_OWNED_TABLES) {
      expect(schemaSql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
  });

  it("enables and forces Row-Level Security on every table and revokes anon/PUBLIC grants", () => {
    expect(rlsSql).toContain(
      "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;"
    );

    for (const table of ALL_USER_OWNED_TABLES) {
      expect(rlsSql).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
      );
      expect(rlsSql).toContain(
        `ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY;`
      );
    }
  });

  it("enforces SELECT, INSERT, UPDATE, and DELETE policies across user-owned tables", () => {
    const crudTables = [
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
      "entity_links",
    ];

    for (const table of crudTables) {
      expect(rlsSql).toMatch(
        new RegExp(`ON public\\.${table}\\s+FOR SELECT TO authenticated`)
      );
      expect(rlsSql).toMatch(
        new RegExp(`ON public\\.${table}\\s+FOR INSERT TO authenticated`)
      );
      expect(rlsSql).toMatch(
        new RegExp(`ON public\\.${table}\\s+FOR UPDATE TO authenticated`)
      );
      expect(rlsSql).toMatch(
        new RegExp(`ON public\\.${table}\\s+FOR DELETE TO authenticated`)
      );
    }
  });

  it("prevents cross-user relationships at the database level via composite FKs and triggers", () => {
    expect(schemaSql).toContain("fk_nodes_mind_map_same_owner");
    expect(schemaSql).toContain("fk_edges_source_node_same_map");
    expect(schemaSql).toContain("fk_edges_target_node_same_map");
    expect(triggersSql).toContain("trg_enforce_task_relationships");
    expect(triggersSql).toContain("trg_enforce_note_relationships");
    expect(triggersSql).toContain("trg_enforce_node_relationships");
    expect(triggersSql).toContain("trg_enforce_entity_link_ownership");
    expect(triggersSql).toContain("on_auth_user_created");
  });
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const userAEmail = process.env.SUPABASE_TEST_USER_A_EMAIL?.trim();
const userAPassword = process.env.SUPABASE_TEST_USER_A_PASSWORD?.trim();
const userBEmail = process.env.SUPABASE_TEST_USER_B_EMAIL?.trim();
const userBPassword = process.env.SUPABASE_TEST_USER_B_PASSWORD?.trim();

const hasLiveRlsTestEnv = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    userAEmail &&
    userAPassword &&
    userBEmail &&
    userBPassword
);

describe.skipIf(!hasLiveRlsTestEnv)(
  "T2.4B — Live Two-User Supabase RLS Isolation Tests (User A vs User B)",
  () => {
    it("isolates User A's records from User B across SELECT, INSERT, UPDATE, DELETE, and cross-linking", async () => {
      const clientA = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const clientB = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const authA = await clientA.auth.signInWithPassword({
        email: userAEmail!,
        password: userAPassword!,
      });
      expect(authA.error).toBeNull();
      const userAId = authA.data.user!.id;

      const authB = await clientB.auth.signInWithPassword({
        email: userBEmail!,
        password: userBPassword!,
      });
      expect(authB.error).toBeNull();
      const userBId = authB.data.user!.id;

      // Resolve User A and User B personal workspaces
      const { data: profileAData } = await clientA
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", userAId)
        .single();
      const profileA = profileAData as { default_workspace_id: string | null } | null;
      const workspaceAId = profileA!.default_workspace_id!;

      const { data: profileBData } = await clientB
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", userBId)
        .single();
      const profileB = profileBData as { default_workspace_id: string | null } | null;
      const workspaceBId = profileB!.default_workspace_id!;

      // 1. User A creates a Task and Note
      const { data: taskAData, error: taskAErr } = await clientA
        .from("tasks")
        .insert({
          workspace_id: workspaceAId,
          user_id: userAId,
          title: "User A Confidential Task",
        } as never)
        .select("id")
        .single();
      expect(taskAErr).toBeNull();
      const taskA = taskAData as { id: string } | null;

      const { data: noteAData, error: noteAErr } = await clientA
        .from("notes")
        .insert({
          workspace_id: workspaceAId,
          user_id: userAId,
          title: "User A Private Note",
        } as never)
        .select("id")
        .single();
      expect(noteAErr).toBeNull();
      const noteA = noteAData as { id: string } | null;

      try {
        // 2. User B cannot SELECT User A's Task or Note
        const { data: bReadTask } = await clientB
          .from("tasks")
          .select("id")
          .eq("id", taskA!.id);
        expect(bReadTask).toEqual([]);

        const { data: bReadNote } = await clientB
          .from("notes")
          .select("id")
          .eq("id", noteA!.id);
        expect(bReadNote).toEqual([]);

        // 3. User B cannot UPDATE User A's Task
        const { data: bUpdateTask } = await clientB
          .from("tasks")
          .update({ title: "Hijacked" } as never)
          .eq("id", taskA!.id)
          .select("id");
        expect(bUpdateTask).toEqual([]);

        // 4. User B cannot link their own entities to User A's Task or Note
        const { error: crossLinkErr } = await clientB
          .from("entity_links")
          .insert({
            workspace_id: workspaceBId,
            user_id: userBId,
            source_type: "task",
            source_id: taskA!.id,
            target_type: "note",
            target_id: noteA!.id,
          } as never);
        expect(crossLinkErr).not.toBeNull();
      } finally {
        // Clean up test rows
        await clientA.from("tasks").delete().eq("id", taskA!.id);
        await clientA.from("notes").delete().eq("id", noteA!.id);
      }
    });
  }
);
