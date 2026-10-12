export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole = "owner" | "editor" | "viewer";
export type ProjectStatus = "active" | "archived" | "completed";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "none" | "low" | "medium" | "high";
export type MindMapNodeType = "idea" | "task_ref" | "note_ref" | "group";
export type MindMapEdgeType = "default" | "smoothstep" | "bezier" | "straight";
export type LinkableEntityType =
  | "task"
  | "note"
  | "mind_map"
  | "mind_map_node";
export type EntityRelationshipType =
  | "references"
  | "derived_from"
  | "blocks"
  | "related";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          default_workspace_id: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string | null;
          default_workspace_id?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          default_workspace_id?: string | null;
          preferences?: Json;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          is_personal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          is_personal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          is_personal?: boolean;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          role?: WorkspaceRole;
        };
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          name: string;
          description: string;
          color: string;
          icon: string;
          status: ProjectStatus;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          name: string;
          description?: string;
          color?: string;
          icon?: string;
          status?: ProjectStatus;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          color?: string;
          icon?: string;
          status?: ProjectStatus;
          position?: number;
          updated_at?: string;
        };
      };
      task_lists: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          project_id: string | null;
          name: string;
          is_default: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          project_id?: string | null;
          name: string;
          is_default?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          name?: string;
          is_default?: boolean;
          position?: number;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          task_list_id: string | null;
          project_id: string | null;
          parent_task_id: string | null;
          recurrence_source_id: string | null;
          title: string;
          description: string;
          status: TaskStatus;
          priority: TaskPriority;
          due_date: string | null;
          completed_at: string | null;
          recurrence_rule: Json | null;
          position: number;
          version: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          task_list_id?: string | null;
          project_id?: string | null;
          parent_task_id?: string | null;
          recurrence_source_id?: string | null;
          title: string;
          description?: string;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          completed_at?: string | null;
          recurrence_rule?: Json | null;
          position?: number;
          version?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          task_list_id?: string | null;
          project_id?: string | null;
          parent_task_id?: string | null;
          title?: string;
          description?: string;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          completed_at?: string | null;
          recurrence_rule?: Json | null;
          position?: number;
          version?: number;
          is_archived?: boolean;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          project_id: string | null;
          parent_note_id: string | null;
          title: string;
          content_json: Json;
          content_text: string;
          is_pinned: boolean;
          is_archived: boolean;
          position: number;
          version: number;
          last_saved_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          project_id?: string | null;
          parent_note_id?: string | null;
          title?: string;
          content_json?: Json;
          content_text?: string;
          is_pinned?: boolean;
          is_archived?: boolean;
          position?: number;
          version?: number;
          last_saved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          parent_note_id?: string | null;
          title?: string;
          content_json?: Json;
          content_text?: string;
          is_pinned?: boolean;
          is_archived?: boolean;
          position?: number;
          version?: number;
          last_saved_at?: string;
          updated_at?: string;
        };
      };
      note_versions: {
        Row: {
          id: string;
          note_id: string;
          workspace_id: string;
          user_id: string;
          version: number;
          content_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          workspace_id: string;
          user_id: string;
          version: number;
          content_json: Json;
          created_at?: string;
        };
        Update: never;
      };
      mind_maps: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          description: string;
          viewport: Json;
          position: number;
          version: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          project_id?: string | null;
          title: string;
          description?: string;
          viewport?: Json;
          position?: number;
          version?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string | null;
          title?: string;
          description?: string;
          viewport?: Json;
          position?: number;
          version?: number;
          is_archived?: boolean;
          updated_at?: string;
        };
      };
      mind_map_nodes: {
        Row: {
          id: string;
          mind_map_id: string;
          workspace_id: string;
          user_id: string;
          type: MindMapNodeType;
          label: string;
          note_excerpt: string;
          position_x: number;
          position_y: number;
          width: number | null;
          height: number | null;
          z_index: number;
          style: Json;
          data: Json;
          linked_task_id: string | null;
          linked_note_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mind_map_id: string;
          workspace_id: string;
          user_id: string;
          type?: MindMapNodeType;
          label?: string;
          note_excerpt?: string;
          position_x?: number;
          position_y?: number;
          width?: number | null;
          height?: number | null;
          z_index?: number;
          style?: Json;
          data?: Json;
          linked_task_id?: string | null;
          linked_note_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: MindMapNodeType;
          label?: string;
          note_excerpt?: string;
          position_x?: number;
          position_y?: number;
          width?: number | null;
          height?: number | null;
          z_index?: number;
          style?: Json;
          data?: Json;
          linked_task_id?: string | null;
          linked_note_id?: string | null;
          updated_at?: string;
        };
      };
      mind_map_edges: {
        Row: {
          id: string;
          mind_map_id: string;
          workspace_id: string;
          user_id: string;
          source_node_id: string;
          target_node_id: string;
          source_handle: string | null;
          target_handle: string | null;
          label: string;
          type: MindMapEdgeType;
          animated: boolean;
          style: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mind_map_id: string;
          workspace_id: string;
          user_id: string;
          source_node_id: string;
          target_node_id: string;
          source_handle?: string | null;
          target_handle?: string | null;
          label?: string;
          type?: MindMapEdgeType;
          animated?: boolean;
          style?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_handle?: string | null;
          target_handle?: string | null;
          label?: string;
          type?: MindMapEdgeType;
          animated?: boolean;
          style?: Json;
          updated_at?: string;
        };
      };
      entity_links: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          source_type: LinkableEntityType;
          source_id: string;
          target_type: LinkableEntityType;
          target_id: string;
          relationship: EntityRelationshipType;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          source_type: LinkableEntityType;
          source_id: string;
          target_type: LinkableEntityType;
          target_id: string;
          relationship?: EntityRelationshipType;
          created_at?: string;
        };
        Update: {
          relationship?: EntityRelationshipType;
        };
      };
      attachments: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          entity_type: LinkableEntityType;
          entity_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          entity_type: LinkableEntityType;
          entity_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: never;
      };
    };
    Functions: {
      is_workspace_member: {
        Args: { ws_id: string };
        Returns: boolean;
      };
      can_write_workspace: {
        Args: { ws_id: string };
        Returns: boolean;
      };
    };
  };
}
