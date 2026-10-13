export type WorkspaceView =
  | "home"
  | "tasks"
  | "calendar"
  | "plan-your-day"
  | "notes"
  | "maps"
  | "projects"
  | "favorites"
  | "recent"
  | "settings";

export const workspaceTitles: Record<WorkspaceView, string> = {
  home: "Your desk",
  tasks: "My tasks",
  calendar: "Calendar",
  "plan-your-day": "Plan your day",
  notes: "Notes",
  maps: "Mind maps",
  projects: "Projects",
  favorites: "Favorites",
  recent: "Recent",
  settings: "Settings",
};

export const workspaceRoutes: Record<WorkspaceView, string> = {
  home: "/dashboard",
  tasks: "/tasks",
  calendar: "/calendar",
  "plan-your-day": "/plan-your-day",
  notes: "/notes",
  maps: "/mind-maps",
  projects: "/projects",
  favorites: "/favorites",
  recent: "/recent",
  settings: "/settings",
};

export function pathnameToWorkspaceView(pathname: string | null | undefined): WorkspaceView {
  if (!pathname || pathname === "/" || pathname.startsWith("/dashboard")) return "home";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/plan-your-day")) return "plan-your-day";
  if (pathname.startsWith("/notes")) return "notes";
  if (pathname.startsWith("/mind-maps") || pathname.startsWith("/maps")) return "maps";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/favorites")) return "favorites";
  if (pathname.startsWith("/recent")) return "recent";
  if (pathname.startsWith("/settings")) return "settings";
  return "home";
}
