export type WorkspaceView =
  | "home"
  | "tasks"
  | "notes"
  | "maps"
  | "projects"
  | "favorites"
  | "recent"
  | "settings";

export const workspaceTitles: Record<WorkspaceView, string> = {
  home: "Your desk",
  tasks: "My tasks",
  notes: "Notes",
  maps: "Mind maps",
  projects: "Projects",
  favorites: "Favorites",
  recent: "Recent",
  settings: "Settings",
};