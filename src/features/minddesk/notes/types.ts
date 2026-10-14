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
    if (ancestors.length > 20) break;
  }

  return ancestors;
}

/**
 * Deterministically derives an RFC4122-compliant 36-character UUIDv5-style identifier
 * from a seed string. Always returns an exact 36-character UUID in the 8-4-4-4-12 hex format,
 * perfectly fitting MariaDB's VARCHAR(36) column limit with ZERO risk of truncation.
 */
export function deterministicUuid(seed: string): string {
  // 128-bit hash state using four 32-bit FNV-1a variations with distinct primes
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x27d4eb2f;
  let h3 = 0x811c9dc5 ^ 0x5a1f9cd1;
  let h4 = 0x811c9dc5 ^ 0x3c6ef372;

  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x01000193);
    h3 = Math.imul(h3 ^ ((ch << 1) + 1), 0x01000193);
    h4 = Math.imul(h4 ^ (ch * 31 + 7), 0x01000193);
  }

  const toHex = (num: number) => (num >>> 0).toString(16).padStart(8, "0");
  const hex = (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)).slice(0, 32);

  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = "5" + hex.slice(13, 16); // RFC4122 version 5 (deterministic)
  const part4 = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.slice(18, 20); // RFC4122 variant 1
  const part5 = hex.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
}

/**
 * Derives a stable, deterministic, 36-character Overview Note UUID for a project.
 * Guarantees length <= 36 characters (strictly matches Note.id VARCHAR(36)).
 */
export function getProjectOverviewId(projectId: string): string {
  return deterministicUuid(`minddesk:project-overview:${projectId}`);
}

/**
 * Checks whether a note or note ID represents a Project Overview note.
 * Can be verified by passing a NoteItem, or a noteId with a project or project list.
 */
export function isProjectOverviewNote(
  noteOrId: NoteItem | string,
  projectsOrProjectId?: ProjectItem[] | ProjectItem | string
): boolean {
  if (!noteOrId) return false;

  // Case 1: Full NoteItem object
  if (typeof noteOrId !== "string") {
    if (!noteOrId.projectId) return false;
    return noteOrId.id === getProjectOverviewId(noteOrId.projectId);
  }

  // Case 2: String noteId with explicit projectId or ProjectItem
  if (typeof projectsOrProjectId === "string") {
    return noteOrId === getProjectOverviewId(projectsOrProjectId);
  }

  if (projectsOrProjectId && typeof projectsOrProjectId === "object" && !Array.isArray(projectsOrProjectId)) {
    return noteOrId === getProjectOverviewId(projectsOrProjectId.id);
  }

  // Case 3: String noteId with ProjectItem[] array
  if (Array.isArray(projectsOrProjectId)) {
    return projectsOrProjectId.some((p) => getProjectOverviewId(p.id) === noteOrId);
  }

  return false;
}

export function getAllDescendantIds(noteId: string, allNotes: NoteItem[]): string[] {
  const descendants: string[] = [];
  const queue = [noteId];
  const visited = new Set<string>([noteId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const note of allNotes) {
      const parentId =
        note.parentId ??
        ((note as unknown as { parentNoteId?: string | null }).parentNoteId ?? null);
      if (parentId === currentId && !visited.has(note.id)) {
        visited.add(note.id);
        descendants.push(note.id);
        queue.push(note.id);
      }
    }
  }

  return descendants;
}

export function isDescendantOf(
  candidateId: string,
  potentialAncestorId: string,
  allNotes: NoteItem[]
): boolean {
  if (candidateId === potentialAncestorId) return true;
  const visited = new Set<string>();
  let currentId: string | null | undefined = candidateId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = allNotes.find((n) => n.id === currentId);
    const parentId =
      item?.parentId ??
      ((item as unknown as { parentNoteId?: string | null })?.parentNoteId ?? null);
    if (!parentId) return false;
    if (parentId === potentialAncestorId) return true;
    currentId = parentId;
  }

  return false;
}

