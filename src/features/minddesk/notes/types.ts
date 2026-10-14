import type { Editor } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";
import type { NoteItem, ProjectItem, TaskItem, MindMapItem } from "../types";

export type SlashCategory = "Basic" | "Formatting & Lists" | "Structure" | "MindDesk Links";

export interface SlashContext {
  notes: NoteItem[];
  projects: ProjectItem[];
  tasks: TaskItem[];
  maps: MindMapItem[];
  currentNote: NoteItem;
  createNestedNote: (title?: string) => string;
  createMindDeskTask: (title: string) => void;
  openImagePicker: () => void;
  openLinkDialog: () => void;
  openNoteReferencePicker: () => void;
  openMapReferencePicker: () => void;
  openTaskReferencePicker: () => void;
}

export interface SlashCommandItem {
  id: string;
  label: string;
  aliases: string[];
  category: SlashCategory;
  hint: string;
  icon: LucideIcon;
  shortcut?: string;
  run: (editor: Editor, context: SlashContext) => void;
}

export interface TableOfContentItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export interface CoverPreset {
  id: string;
  name: string;
  url: string;
  previewClass: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "gradient-violet",
    name: "Northstar Violet",
    url: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
    previewClass: "bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500",
  },
  {
    id: "gradient-mint",
    name: "Sage Field",
    url: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
    previewClass: "bg-gradient-to-r from-emerald-600 via-teal-500 to-green-400",
  },
  {
    id: "gradient-amber",
    name: "Warm Dawn",
    url: "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)",
    previewClass: "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-300",
  },
  {
    id: "gradient-sky",
    name: "Azure Horizon",
    url: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)",
    previewClass: "bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400",
  },
  {
    id: "gradient-midnight",
    name: "Midnight Calm",
    url: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
    previewClass: "bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900",
  },
  {
    id: "gradient-rose",
    name: "Gentle Rose",
    url: "linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fda4af 100%)",
    previewClass: "bg-gradient-to-r from-rose-600 via-pink-500 to-rose-300",
  },
];

export const EMOJI_OPTIONS = [
  "✎", "☀️", "✳️", "💡", "🎯", "🚀", "📚", "✍️",
  "🧠", "🌿", "⭐", "🔥", "📌", "🎨", "📂", "🔍",
  "✨", "🏷️", "💼", "🕊️", "☕", "💻", "🌊", "🌙"
];

export type ProjectFilterValue = "all" | "unassigned" | string;

export function getProjectHueColor(hue?: string): string {
  switch (hue) {
    case "violet":
      return "#8b5cf6";
    case "mint":
      return "#10b981";
    case "amber":
      return "#f59e0b";
    case "blue":
      return "#3b82f6";
    default:
      return "#6366f1";
  }
}

export function filterNotesByProject(
  notes: NoteItem[],
  filter: ProjectFilterValue,
  projects: ProjectItem[]
): NoteItem[] {
  if (filter === "all") return notes;
  if (filter === "unassigned") {
    const validProjectIds = new Set(projects.map((p) => p.id));
    return notes.filter((n) => !n.projectId || !validProjectIds.has(n.projectId));
  }
  return notes.filter((n) => n.projectId === filter);
}

export function getNoteAncestors(note: NoteItem, allNotes: NoteItem[]): NoteItem[] {
  const ancestors: NoteItem[] = [];
  const visited = new Set<string>([note.id]);
  let currentParentId = note.parentId;

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = allNotes.find((n) => n.id === currentParentId);
    if (!parent) break;
    ancestors.unshift(parent);
    currentParentId = parent.parentId;
    if (ancestors.length > 10) break;
  }

  return ancestors;
}

