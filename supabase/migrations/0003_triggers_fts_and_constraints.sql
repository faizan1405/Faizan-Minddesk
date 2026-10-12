-- ============================================================================
-- MindDesk Migration 0003: Cross-User Relationship Prevention, FTS & Auth Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Automatic updated_at Timestamp Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'workspaces', 'projects', 'task_lists',
    'tasks', 'notes', 'mind_maps', 'mind_map_nodes', 'mind_map_edges'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Full-Text Search (tsvector) Maintenance Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_task_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_search_vector ON public.tasks;
CREATE TRIGGER trg_tasks_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_task_search_vector();

CREATE OR REPLACE FUNCTION public.update_note_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content_text, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notes_search_vector ON public.notes;
CREATE TRIGGER trg_notes_search_vector
  BEFORE INSERT OR UPDATE OF title, content_text ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_note_search_vector();

CREATE OR REPLACE FUNCTION public.update_mind_map_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mind_maps_search_vector ON public.mind_maps;
CREATE TRIGGER trg_mind_maps_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON public.mind_maps
  FOR EACH ROW EXECUTE FUNCTION public.update_mind_map_search_vector();

CREATE OR REPLACE FUNCTION public.update_mind_map_node_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.label, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.note_excerpt, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mind_map_nodes_search_vector ON public.mind_map_nodes;
CREATE TRIGGER trg_mind_map_nodes_search_vector
  BEFORE INSERT OR UPDATE OF label, note_excerpt ON public.mind_map_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_mind_map_node_search_vector();

-- ----------------------------------------------------------------------------
-- 3. Database-Level Cross-User Relationship Prevention
--    Verifies that any optional foreign key or polymorphic link references
--    an entity owned by the EXACT same (user_id, workspace_id).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_entity_ownership(
  p_entity_type public.linkable_entity_type,
  p_entity_id UUID,
  p_user_id UUID,
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN := false;
BEGIN
  CASE p_entity_type
    WHEN 'task' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.tasks
        WHERE id = p_entity_id AND user_id = p_user_id AND workspace_id = p_workspace_id
      ) INTO v_exists;
    WHEN 'note' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.notes
        WHERE id = p_entity_id AND user_id = p_user_id AND workspace_id = p_workspace_id
      ) INTO v_exists;
    WHEN 'mind_map' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.mind_maps
        WHERE id = p_entity_id AND user_id = p_user_id AND workspace_id = p_workspace_id
      ) INTO v_exists;
    WHEN 'mind_map_node' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.mind_map_nodes
        WHERE id = p_entity_id AND user_id = p_user_id AND workspace_id = p_workspace_id
      ) INTO v_exists;
  END CASE;

  RETURN v_exists;
END;
$$;

-- Enforce ownership on tasks optional references (project_id, task_list_id, parent_task_id)
CREATE OR REPLACE FUNCTION public.enforce_task_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id AND user_id = NEW.user_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Invalid cross-user or cross-workspace project_id reference on task';
    END IF;
  END IF;

  IF NEW.task_list_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.task_lists
      WHERE id = NEW.task_list_id AND user_id = NEW.user_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Invalid cross-user or cross-workspace task_list_id reference on task';
    END IF;
  END IF;

  IF NEW.parent_task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = NEW.parent_task_id AND user_id = NEW.user_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Invalid cross-user or cross-workspace parent_task_id reference on task';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_task_relationships ON public.tasks;
CREATE TRIGGER trg_enforce_task_relationships
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_task_relationships();

-- Enforce ownership on notes optional references (project_id, parent_note_id)
CREATE OR REPLACE FUNCTION public.enforce_note_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id AND user_id = NEW.user_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Invalid cross-user or cross-workspace project_id reference on note';
    END IF;
  END IF;

  IF NEW.parent_note_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notes
      WHERE id = NEW.parent_note_id AND user_id = NEW.user_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Invalid cross-user or cross-workspace parent_note_id reference on note';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_note_relationships ON public.notes;
CREATE TRIGGER trg_enforce_note_relationships
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_note_relationships();

-- Enforce ownership on mind_map_nodes optional references (linked_task_id, linked_note_id)
CREATE OR REPLACE FUNCTION public.enforce_node_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = NEW.linked_task_id AND user_id = NEW.user_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Invalid cross-user or cross-workspace linked_task_id on mind_map_node';
    END IF;
  END IF;

  IF NEW.linked_note_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notes
      WHERE id = NEW.linked_note_id AND user_id = NEW.user_id AND workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'Invalid cross-user or cross-workspace linked_note_id on mind_map_node';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_node_relationships ON public.mind_map_nodes;
CREATE TRIGGER trg_enforce_node_relationships
  BEFORE INSERT OR UPDATE ON public.mind_map_nodes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_node_relationships();

-- Enforce ownership on polymorphic entity_links (source and target must belong to same user & workspace)
CREATE OR REPLACE FUNCTION public.enforce_entity_link_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_entity_ownership(NEW.source_type, NEW.source_id, NEW.user_id, NEW.workspace_id) THEN
    RAISE EXCEPTION 'Source entity (% / %) does not exist or belongs to another user/workspace',
      NEW.source_type, NEW.source_id;
  END IF;

  IF NOT public.verify_entity_ownership(NEW.target_type, NEW.target_id, NEW.user_id, NEW.workspace_id) THEN
    RAISE EXCEPTION 'Target entity (% / %) does not exist or belongs to another user/workspace',
      NEW.target_type, NEW.target_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_entity_link_ownership ON public.entity_links;
CREATE TRIGGER trg_enforce_entity_link_ownership
  BEFORE INSERT OR UPDATE ON public.entity_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_entity_link_ownership();

-- ----------------------------------------------------------------------------
-- 4. Automatic Personal Workspace & Default Task List Provisioning on Signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_full_name TEXT;
BEGIN
  v_full_name := coalesce(
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(NEW.email, 'User'), '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, coalesce(NEW.email, ''), v_full_name);

  INSERT INTO public.workspaces (name, owner_id, is_personal)
  VALUES ('Personal Workspace', NEW.id, true)
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'owner');

  UPDATE public.profiles
  SET default_workspace_id = v_workspace_id
  WHERE id = NEW.id;

  INSERT INTO public.task_lists (workspace_id, user_id, name, is_default, position)
  VALUES (v_workspace_id, NEW.id, 'My Tasks', true, 1000.0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
