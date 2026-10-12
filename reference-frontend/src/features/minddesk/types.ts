export type Priority = "high" | "medium" | "low";

export interface TaskItem {
  id: string;
  title: string;
  note: string;
  due: string;
  priority: Priority;
  complete: boolean;
  starred: boolean;
  projectId: string;
  subtasks: { id: string; title: string; complete: boolean }[];
}

export interface NoteItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  icon: string;
  updated: string;
  projectId: string;
  starred: boolean;
}

export interface MapNodeItem {
  id: string;
  position: { x: number; y: number };
  data: { label: string; color: string };
  type?: string;
}

export interface MapEdgeItem {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface MindMapItem {
  id: string;
  title: string;
  updated: string;
  starred: boolean;
  theme?: "calm" | "paper" | "midnight";
  layout?: "freeform" | "tree" | "radial";
  nodes: MapNodeItem[];
  edges: MapEdgeItem[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  hue: "violet" | "mint" | "amber" | "blue";
}

export interface DeskData {
  tasks: TaskItem[];
  notes: NoteItem[];
  maps: MindMapItem[];
  projects: ProjectItem[];
  theme: "light" | "dark";
}