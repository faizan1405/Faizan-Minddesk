"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NoteItem, ProjectItem } from "../../types";
import { type ProjectFilterValue, getProjectHueColor } from "../types";
import { ProjectFilter } from "./project-filter";

interface NoteSidebarProps {
  notes: NoteItem[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: (parentId?: string, targetProjectId?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleStar: (noteId: string) => void;
  projects: ProjectItem[];
  selectedProject?: ProjectFilterValue;
  onSelectProject?: (proj: ProjectFilterValue) => void;
  onCloseMobile?: () => void;
}

export function NoteSidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onToggleStar,
  projects,
  selectedProject: externalSelectedProject,
  onSelectProject: externalOnSelectProject,
  onCloseMobile,
}: NoteSidebarProps) {
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [internalProject, setInternalProject] = useState<ProjectFilterValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const currentProjectFilter = externalSelectedProject ?? internalProject;
  const setProjectFilter = (val: ProjectFilterValue) => {
    if (externalOnSelectProject) {
      externalOnSelectProject(val);
    } else {
      setInternalProject(val);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const validProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  // Filter notes based on active criteria
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (filter === "favorites" && !note.starred) return false;

      // Project filter
      if (currentProjectFilter === "unassigned") {
        if (note.projectId && validProjectIds.has(note.projectId)) return false;
      } else if (currentProjectFilter !== "all") {
        if (note.projectId !== currentProjectFilter) return false;
      }

      // Search query
      if (q) {
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesContent = note.content.toLowerCase().includes(q);
        const matchesExcerpt = note.excerpt.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent && !matchesExcerpt) return false;
      }
      return true;
    });
  }, [currentProjectFilter, filter, notes, searchQuery, validProjectIds]);

  // Separate into top-level notes and child notes for hierarchy
  const { topLevelNotes, childrenMap } = useMemo(() => {
    const top: NoteItem[] = [];
    const children: Record<string, NoteItem[]> = {};
    const filteredIds = new Set(filteredNotes.map((n) => n.id));

    for (const note of filteredNotes) {
      if (note.parentId && filteredIds.has(note.parentId)) {
        if (!children[note.parentId]) {
          children[note.parentId] = [];
        }
        children[note.parentId].push(note);
      } else {
        top.push(note);
      }
    }

    return { topLevelNotes: top, childrenMap: children };
  }, [filteredNotes]);

  const handleQuickCreate = () => {
    const targetProject =
      currentProjectFilter !== "all" && currentProjectFilter !== "unassigned"
        ? currentProjectFilter
        : undefined;
    onCreateNote(undefined, targetProject);
  };

  const selectedProjectObj = useMemo(() => {
    if (currentProjectFilter !== "all" && currentProjectFilter !== "unassigned") {
      return projects.find((p) => p.id === currentProjectFilter) || null;
    }
    return null;
  }, [currentProjectFilter, projects]);

  const renderNoteRow = (note: NoteItem, level = 0) => {
    const isSelected = note.id === activeNoteId;
    const hasChildren = Boolean(childrenMap[note.id]?.length);
    const isExpanded = expandedParents[note.id] ?? true;

    return (
      <div key={note.id} className="group/item">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            onSelectNote(note.id);
            if (onCloseMobile) onCloseMobile();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectNote(note.id);
              if (onCloseMobile) onCloseMobile();
            }
          }}
          style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
          className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-xs transition-colors cursor-pointer ${
            isSelected
              ? "bg-accent text-accent-foreground font-medium shadow-xs"
              : "hover:bg-muted/70 text-foreground"
          }`}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(note.id, e)}
              className="grid size-4 place-items-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>
          ) : (
            <span className="size-4 shrink-0" />
          )}

          <span className="text-sm shrink-0">{note.icon || "📄"}</span>
          <span className="truncate flex-1 min-w-0">{note.title || "Untitled"}</span>

          {/* Action buttons on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
            <button
              type="button"
              title="Add sub-page"
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote(note.id);
              }}
              className="grid size-5 place-items-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Plus className="size-3" />
            </button>
            <button
              type="button"
              title={note.starred ? "Unfavorite" : "Favorite"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(note.id);
              }}
              className="grid size-5 place-items-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Star className={`size-3 ${note.starred ? "fill-primary text-primary" : ""}`} />
            </button>
            <button
              type="button"
              title="Delete note"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
              className="grid size-5 place-items-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>

        {/* Render child notes recursively */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {childrenMap[note.id].map((child) => renderNoteRow(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      aria-label="Document sidebar"
      className="flex h-full w-full flex-col border-r border-border bg-card/60 p-3 sm:w-68"
    >
      {/* Header with Quick Add & optional Mobile Close */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-sm">
          <BookOpen className="size-4 text-primary" />
          <span>Documents</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs shadow-2xs"
            onClick={handleQuickCreate}
            title={selectedProjectObj ? `New note in ${selectedProjectObj.name}` : "New note"}
          >
            <Plus className="size-3.5" /> New
          </Button>
          {onCloseMobile && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 lg:hidden"
              onClick={onCloseMobile}
              title="Close sidebar"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search docs…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 text-xs bg-background/60"
        />
      </div>

      {/* Filter Tabs */}
      <div className="mb-3 flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex-1 rounded-md py-1 text-center font-medium transition-colors cursor-pointer ${
            filter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("favorites")}
          className={`flex-1 rounded-md py-1 text-center font-medium transition-colors cursor-pointer ${
            filter === "favorites" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Favorites
        </button>
      </div>

      {/* Project Filter (Compact) */}
      <div className="mb-3">
        <ProjectFilter
          projects={projects}
          notes={notes}
          value={currentProjectFilter}
          onChange={setProjectFilter}
          compact
        />
      </div>

      {/* Document Tree Hierarchy */}
      <div className="minddesk-scrollbar flex-1 overflow-y-auto space-y-0.5 pr-1">
        {topLevelNotes.length > 0 ? (
          topLevelNotes.map((note) => renderNoteRow(note, 0))
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <FileText className="mx-auto size-6 opacity-40 mb-1.5" />
            <p className="font-medium text-foreground/80">
              {searchQuery
                ? "No matching docs"
                : currentProjectFilter === "unassigned"
                ? "No unassigned docs"
                : selectedProjectObj
                ? `No docs in ${selectedProjectObj.name}`
                : "No documents yet"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[180px] mx-auto">
              {searchQuery ? "Try a different search term" : "Click New above to write a document"}
            </p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-auto pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>
          {filteredNotes.length === notes.length
            ? `${notes.length} notes`
            : `${filteredNotes.length} of ${notes.length} notes`}
        </span>
        {selectedProjectObj ? (
          <span className="truncate max-w-[110px] flex items-center gap-1 font-medium text-foreground/80">
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: getProjectHueColor(selectedProjectObj.hue) }}
            />
            <span className="truncate">{selectedProjectObj.name}</span>
          </span>
        ) : currentProjectFilter === "unassigned" ? (
          <span className="text-muted-foreground/80">Unassigned</span>
        ) : (
          <span className="text-muted-foreground/60">All workspace</span>
        )}
      </div>
    </aside>
  );
}
