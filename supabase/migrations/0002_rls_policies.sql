-- ============================================================================
-- MindDesk Migration 0002: Row-Level Security (RLS) & Least-Privilege Grants
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Least-Privilege Role Grants
--    Revoke all default privileges from anon and PUBLIC on private tables.
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.projects,
  public.task_lists,
  public.tasks,
  public.notes,
  public.note_versions,
  public.mind_maps,
  public.mind_map_nodes,
  public.mind_map_edges,
  public.entity_links,
  public.attachments
TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Enable and Force RLS on Every Table
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_lists FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_maps FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mind_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_map_nodes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mind_map_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_map_edges FORCE ROW LEVEL SECURITY;

ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_links FORCE ROW LEVEL SECURITY;

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Security Helper Functions (SECURITY DEFINER with pinned search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = ws_id
      AND wm.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_workspace(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = ws_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.role IN ('owner', 'editor')
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.can_write_workspace(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_workspace(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Profiles Policies
-- ----------------------------------------------------------------------------
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE TO authenticated
  USING (id = (SELECT auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Workspaces & Workspace Members Policies
-- ----------------------------------------------------------------------------
CREATE POLICY workspaces_select_member ON public.workspaces
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.is_workspace_member(id));

CREATE POLICY workspaces_insert_owner ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY workspaces_update_owner ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY workspaces_delete_owner ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY workspace_members_select ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_workspace_member(workspace_id));

CREATE POLICY workspace_members_insert_owner ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY workspace_members_update_owner ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY workspace_members_delete_owner ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = (SELECT auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Domain Tables Policies (Strict User & Workspace Isolation)
--    Covers: projects, task_lists, tasks, notes, note_versions,
--            mind_maps, mind_map_nodes, mind_map_edges, entity_links, attachments
-- ----------------------------------------------------------------------------

-- PROJECTS
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY projects_delete ON public.projects
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- TASK LISTS
CREATE POLICY task_lists_select ON public.task_lists
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY task_lists_insert ON public.task_lists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY task_lists_update ON public.task_lists
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY task_lists_delete ON public.task_lists
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- TASKS
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- NOTES
CREATE POLICY notes_select ON public.notes
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY notes_insert ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY notes_update ON public.notes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY notes_delete ON public.notes
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- NOTE VERSIONS
CREATE POLICY note_versions_select ON public.note_versions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY note_versions_insert ON public.note_versions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY note_versions_delete ON public.note_versions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- MIND MAPS
CREATE POLICY mind_maps_select ON public.mind_maps
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY mind_maps_insert ON public.mind_maps
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY mind_maps_update ON public.mind_maps
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY mind_maps_delete ON public.mind_maps
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- MIND MAP NODES
CREATE POLICY mind_map_nodes_select ON public.mind_map_nodes
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY mind_map_nodes_insert ON public.mind_map_nodes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY mind_map_nodes_update ON public.mind_map_nodes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY mind_map_nodes_delete ON public.mind_map_nodes
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- MIND MAP EDGES
CREATE POLICY mind_map_edges_select ON public.mind_map_edges
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY mind_map_edges_insert ON public.mind_map_edges
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY mind_map_edges_update ON public.mind_map_edges
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY mind_map_edges_delete ON public.mind_map_edges
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- ENTITY LINKS
CREATE POLICY entity_links_select ON public.entity_links
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY entity_links_insert ON public.entity_links
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY entity_links_update ON public.entity_links
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY entity_links_delete ON public.entity_links
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

-- ATTACHMENTS
CREATE POLICY attachments_select ON public.attachments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

CREATE POLICY attachments_insert ON public.attachments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));

CREATE POLICY attachments_delete ON public.attachments
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND public.can_write_workspace(workspace_id));
