-- ============================================================================
-- MindDesk Migration 0001: Initial Schema, Entities, Indexes & Relationships
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Domain Enumerations
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.workspace_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('active', 'archived', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('none', 'low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mind_map_node_type AS ENUM ('idea', 'task_ref', 'note_ref', 'group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mind_map_edge_type AS ENUM ('default', 'smoothstep', 'bezier', 'straight');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.linkable_entity_type AS ENUM ('task', 'note', 'mind_map', 'mind_map_node');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.entity_relationship_type AS ENUM ('references', 'derived_from', 'blocks', 'related');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. Profiles & Workspaces (Personal-Optimized, Multi-User Ready)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  default_workspace_id UUID,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_personal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_default_workspace,
  ADD CONSTRAINT fk_profiles_default_workspace
    FOREIGN KEY (default_workspace_id)
    REFERENCES public.workspaces(id)
    ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 3. Projects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'folder',
  status public.project_status NOT NULL DEFAULT 'active',
  position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, user_id, workspace_id)
);

-- ----------------------------------------------------------------------------
-- 4. Task Lists & Tasks (with Subtasks, Fractional Ordering & Recurrence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_list_id UUID REFERENCES public.task_lists(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  recurrence_source_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'none',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recurrence_rule JSONB,
  position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, user_id, workspace_id),
  CONSTRAINT chk_tasks_no_self_parent CHECK (parent_task_id IS NULL OR parent_task_id <> id)
);

-- ----------------------------------------------------------------------------
-- 5. Notes & Note Recovery Snapshots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  parent_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_text TEXT NOT NULL DEFAULT '',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, user_id, workspace_id),
  CONSTRAINT chk_notes_no_self_parent CHECK (parent_note_id IS NULL OR parent_note_id <> id)
);

CREATE TABLE IF NOT EXISTS public.note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version >= 1),
  content_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_note_versions_same_owner
    FOREIGN KEY (note_id, user_id, workspace_id)
    REFERENCES public.notes(id, user_id, workspace_id)
    ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 6. Mind Maps, First-Class Nodes & Directed Connections (Edges)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  viewport JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb,
  position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id),
  UNIQUE (id, user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.mind_map_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mind_map_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.mind_map_node_type NOT NULL DEFAULT 'idea',
  label TEXT NOT NULL DEFAULT 'New Idea',
  note_excerpt TEXT NOT NULL DEFAULT '',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  z_index INTEGER NOT NULL DEFAULT 0,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  linked_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, mind_map_id, user_id, workspace_id),
  UNIQUE (id, user_id, workspace_id),
  CONSTRAINT fk_nodes_mind_map_same_owner
    FOREIGN KEY (mind_map_id, user_id, workspace_id)
    REFERENCES public.mind_maps(id, user_id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mind_map_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mind_map_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL,
  target_node_id UUID NOT NULL,
  source_handle TEXT,
  target_handle TEXT,
  label TEXT NOT NULL DEFAULT '',
  type public.mind_map_edge_type NOT NULL DEFAULT 'smoothstep',
  animated BOOLEAN NOT NULL DEFAULT false,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_edges_no_self_loop CHECK (source_node_id <> target_node_id),
  CONSTRAINT uq_edges_connection UNIQUE (mind_map_id, source_node_id, target_node_id, source_handle, target_handle),
  CONSTRAINT fk_edges_mind_map_same_owner
    FOREIGN KEY (mind_map_id, user_id, workspace_id)
    REFERENCES public.mind_maps(id, user_id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_edges_source_node_same_map
    FOREIGN KEY (source_node_id, mind_map_id, user_id, workspace_id)
    REFERENCES public.mind_map_nodes(id, mind_map_id, user_id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_edges_target_node_same_map
    FOREIGN KEY (target_node_id, mind_map_id, user_id, workspace_id)
    REFERENCES public.mind_map_nodes(id, mind_map_id, user_id, workspace_id)
    ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 7. Cross-Links (Bi-Directional Knowledge Graph) & Attachments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type public.linkable_entity_type NOT NULL,
  source_id UUID NOT NULL,
  target_type public.linkable_entity_type NOT NULL,
  target_id UUID NOT NULL,
  relationship public.entity_relationship_type NOT NULL DEFAULT 'references',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_entity_links_no_self_link
    CHECK (NOT (source_type = target_type AND source_id = target_id)),
  CONSTRAINT uq_entity_links_pair
    UNIQUE (workspace_id, source_type, source_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type public.linkable_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. Performance & Search Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_pos ON public.projects(workspace_id, status, position);
CREATE INDEX IF NOT EXISTS idx_task_lists_workspace_pos ON public.task_lists(workspace_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_list_pos ON public.tasks(workspace_id, task_list_id, status, position);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(workspace_id, due_date) WHERE status <> 'done';
CREATE INDEX IF NOT EXISTS idx_tasks_fts ON public.tasks USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_notes_workspace_updated ON public.notes(workspace_id, is_archived, is_pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_project ON public.notes(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_fts ON public.notes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_note_versions_note ON public.note_versions(note_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_mind_maps_workspace_updated ON public.mind_maps(workspace_id, is_archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_maps_fts ON public.mind_maps USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_map ON public.mind_map_nodes(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_linked_task ON public.mind_map_nodes(linked_task_id) WHERE linked_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_linked_note ON public.mind_map_nodes(linked_note_id) WHERE linked_note_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_fts ON public.mind_map_nodes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_mind_map_edges_map ON public.mind_map_edges(mind_map_id);

CREATE INDEX IF NOT EXISTS idx_entity_links_source ON public.entity_links(workspace_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_target ON public.entity_links(workspace_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(workspace_id, entity_type, entity_id);
