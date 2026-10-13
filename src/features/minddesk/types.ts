export type Priority = "high" | "medium" | "low";

export interface TaskSubtask {
  id: string;
  title: string;
  complete: boolean;
  order?: number;
}

export type RecurrenceFrequency =
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g. every 1 day, every 2 weeks
  weekdays?: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat
  monthDay?: number; // 1-31
  endDate?: string; // ISO string or YYYY-MM-DD
  neverEnds?: boolean;
}

export interface TaskList {
  id: string;
  title: string;
  order: number;
  createdAt?: string;
  isDefault?: boolean;
}

export interface TaskItem {
  id: string;
  listId?: string; // Defaults to "list-my-tasks"
  title: string;
  note: string;
  due: string;
  dueTime?: string; // Optional time in HH:mm
  priority: Priority;
  complete: boolean;
  completedAt?: string;
  starred: boolean;
  projectId?: string;
  order?: number;
  subtasks: TaskSubtask[];
  recurrence?: RecurrenceRule;
  recurringSeriesId?: string;
  parentTaskId?: string;
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
  parentId?: string | null;
  coverImage?: string | null;
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
  taskLists?: TaskList[];
  notes: NoteItem[];
  maps: MindMapItem[];
  projects: ProjectItem[];
  theme: "light" | "dark";
  version?: number;
}
