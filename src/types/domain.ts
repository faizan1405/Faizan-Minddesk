export type SaveStatus = "idle" | "saved" | "saving" | "offline" | "conflict" | "error" | "loading";

export type EntityType = "task" | "note" | "mind_map" | "mind_map_node";

export interface AuthUserSummary {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  defaultWorkspaceId?: string | null;
}

export interface WorkspaceNavItem {
  title: string;
  href: string;
  shortcut?: string[];
  badge?: string;
  domain?: "task" | "note" | "map";
}

export interface ProjectSummary {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  noteCount: number;
  mapCount: number;
}
