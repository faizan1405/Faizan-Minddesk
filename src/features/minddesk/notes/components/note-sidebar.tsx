"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  MoreHorizontal,
  Move,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NoteItem, ProjectItem } from "../../types";
import {
  getAllDescendantIds,
  getProjectHueColor,
  getProjectOverviewId,
  isProjectOverviewNote,
} from "../types";
import {
  CreateProjectDialog,
  RenameProjectDialog,
  DeleteProjectDialog,
  RenamePageDialog,
  DeletePageDialog,
  MovePageDialog,
} from "./notes-modals";

interface NoteSidebarProps {
  notes: NoteItem[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: (parentId?: string, targetProjectId?: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onDeleteNote: (noteId: string, deleteSubtree: boolean) => void;
  onMoveNote: (noteId: string, targetProjectId?: string, targetParentId?: string | null) => void;
  onToggleStar: (noteId: string) => void;
  projects: ProjectItem[];
  onCreateProject: (data: {
    name: string;
    hue: "violet" | "mint" | "amber" | "blue";
    description?: string;
  }) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDeleteProject: (projectId: string, deleteNotes: boolean) => void;
  onSelectProjectOverview: (projectId: string) => void;
  onCloseMobile?: () => void;
}

export function NoteSidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onRenameNote,
  onDeleteNote,
  onMoveNote,
  onToggleStar,
  projects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onSelectProjectOverview,
  onCloseMobile,
}: NoteSidebarProps) {
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [projectsSectionOpen, setProjectsSectionOpen] = useState(true);
  const [generalSectionOpen, setGeneralSectionOpen] = useState(true);

  // Modal dialog states
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [renameProjectTarget, setRenameProjectTarget] = useState<ProjectItem | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ProjectItem | null>(null);
  const [renamePageTarget, setRenamePageTarget] = useState<NoteItem | null>(null);
  const [deletePageTarget, setDeletePageTarget] = useState<NoteItem | null>(null);
  const [movePageTarget, setMovePageTarget] = useState<NoteItem | null>(null);

  const toggleProjectExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects((prev) => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  };

  const toggleNoteExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNotes((prev) => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  };

  const validProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  // Standard notes (excluding dedicated project overview records from general trees)
  const standardNotes = useMemo(() => {
    return notes.filter((n) => !isProjectOverviewNote(n.id));
  }, [notes]);

  // Filtered notes for search mode
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return notes.filter((note) => {
      if (filter === "favorites" && !note.starred) return false;
      const matchesTitle = (note.title || "").toLowerCase().includes(q);
      const matchesContent = (note.content || "").toLowerCase().includes(q);
      const matchesExcerpt = (note.excerpt || "").toLowerCase().includes(q);
      return matchesTitle || matchesContent || matchesExcerpt;
    });
  }, [filter, notes, searchQuery]);

  // Build parent -> children map for recursive rendering
  const childrenMap = useMemo(() => {
    const map: Record<string, NoteItem[]> = {};
    for (const note of standardNotes) {
      if (note.parentId) {
        if (!map[note.parentId]) {
          map[note.parentId] = [];
        }
        map[note.parentId].push(note);
      }
    }
    return map;
  }, [standardNotes]);

  // Separate top-level notes by project and unassigned
  const { projectTopNotes, unassignedTopNotes } = useMemo(() => {
    const projMap: Record<string, NoteItem[]> = {};
    const unassigned: NoteItem[] = [];

    for (const note of standardNotes) {
      if (filter === "favorites" && !note.starred) {
        continue;
      }

      if (!note.parentId) {
        if (note.projectId && validProjectIds.has(note.projectId)) {
          if (!projMap[note.projectId]) {
            projMap[note.projectId] = [];
          }
          projMap[note.projectId].push(note);
        } else {
          unassigned.push(note);
        }
      }
    }

    return { projectTopNotes: projMap, unassignedTopNotes: unassigned };
  }, [filter, standardNotes, validProjectIds]);

  // Render a recursive note tree row
  const renderNoteRow = (note: NoteItem, level = 0) => {
    const isSelected = note.id === activeNoteId;
    const children = childrenMap[note.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedNotes[note.id] ?? true;

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
          style={{ paddingLeft: `${Math.max(6, level * 14 + 6)}px` }}
          className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-1.5 text-left text-xs transition-colors cursor-pointer ${
            isSelected
              ? "bg-accent text-accent-foreground font-medium shadow-xs"
              : "hover:bg-muted/70 text-foreground"
          }`}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse subpages" : "Expand subpages"}
              onClick={(e) => toggleNoteExpand(note.id, e)}
              className="grid size-4 place-items-center text-muted-foreground hover:text-foreground cursor-pointer rounded"
            >
              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>
          ) : (
            <span className="size-4 shrink-0" />
          )}

          <span className="text-sm shrink-0 leading-none">{note.icon || "📄"}</span>
          <span className="truncate flex-1 min-w-0">{note.title || "Untitled"}</span>

          {/* Action buttons (hover or focus) */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              title="Add subpage"
              aria-label="Add subpage"
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote(note.id, note.projectId);
              }}
              className="grid size-5 place-items-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Plus className="size-3" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Page options"
                  aria-label="Page options"
                  onClick={(e) => e.stopPropagation()}
                  className="grid size-5 place-items-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <MoreHorizontal className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <DropdownMenuItem
                  onClick={() => onCreateNote(note.id, note.projectId)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Plus className="size-3.5" /> Add Subpage
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRenamePageTarget(note)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Edit2 className="size-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setMovePageTarget(note)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Move className="size-3.5" /> Move to…
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToggleStar(note.id)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Star className={`size-3.5 ${note.starred ? "fill-primary text-primary" : ""}`} />
                  {note.starred ? "Unfavorite" : "Favorite"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletePageTarget(note)}
                  className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Recursive child subpages */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {children.map((child) => renderNoteRow(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside
        aria-label="Document sidebar"
        className="flex h-full w-full flex-col border-r border-border bg-card/60 p-3 sm:w-72"
      >
        {/* Header with Quick Add & Mobile Close */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <BookOpen className="size-4 text-primary" />
            <span>MindDesk Docs</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs shadow-2xs cursor-pointer"
              onClick={() => onCreateNote()}
              title="Create new note"
            >
              <Plus className="size-3.5" /> New Page
            </Button>
            {onCloseMobile && (
              <Button
                size="icon"
                variant="ghost"
                className="size-7 lg:hidden cursor-pointer"
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

        {/* Filter Tabs: All vs Favorites */}
        <div className="mb-3 flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 rounded-md py-1 text-center font-medium transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Docs
          </button>
          <button
            type="button"
            onClick={() => setFilter("favorites")}
            className={`flex-1 rounded-md py-1 text-center font-medium transition-colors cursor-pointer ${
              filter === "favorites"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Favorites
          </button>
        </div>

        {/* Navigation Content Area */}
        <div className="minddesk-scrollbar flex-1 overflow-y-auto space-y-4 pr-1">
          {searchQuery.trim() ? (
            /* Search Results Mode */
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                Search Results ({searchResults.length})
              </div>
              {searchResults.length > 0 ? (
                searchResults.map((note) => {
                  const isSelected = note.id === activeNoteId;
                  const proj = note.projectId
                    ? projects.find((p) => p.id === note.projectId)
                    : null;
                  return (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onSelectNote(note.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg py-1.5 px-2 text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-accent text-accent-foreground font-medium shadow-xs"
                          : "hover:bg-muted/70 text-foreground"
                      }`}
                    >
                      <span className="text-sm shrink-0 leading-none">{note.icon || "📄"}</span>
                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate font-medium">{note.title || "Untitled"}</div>
                        {proj && (
                          <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: getProjectHueColor(proj.hue) }}
                            />
                            <span>{proj.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <FileText className="mx-auto size-5 opacity-40 mb-1" />
                  No documents found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          ) : (
            /* Notion-style Hierarchy Mode */
            <>
              {/* Projects Section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                  <button
                    type="button"
                    onClick={() => setProjectsSectionOpen(!projectsSectionOpen)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {projectsSectionOpen ? (
                      <ChevronDown className="size-3" />
                    ) : (
                      <ChevronRight className="size-3" />
                    )}
                    <span>Projects ({projects.length})</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setCreateProjectOpen(true)}
                    title="Create new project"
                    aria-label="Create new project"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                {projectsSectionOpen && (
                  <div className="space-y-1">
                    {projects.map((project) => {
                      const isProjExpanded = expandedProjects[project.id] ?? true;
                      const overviewId = getProjectOverviewId(project.id);
                      const isOverviewSelected = activeNoteId === overviewId;
                      const topPages = projectTopNotes[project.id] || [];

                      return (
                        <div key={project.id} className="space-y-0.5">
                          {/* Project Header Node */}
                          <div className="group/proj flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-foreground/90 hover:bg-muted/70 transition-colors">
                            <button
                              type="button"
                              onClick={(e) => toggleProjectExpand(project.id, e)}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer font-medium"
                            >
                              <span className="grid size-4 place-items-center text-muted-foreground hover:text-foreground">
                                {isProjExpanded ? (
                                  <ChevronDown className="size-3" />
                                ) : (
                                  <ChevronRight className="size-3" />
                                )}
                              </span>
                              <span
                                className="size-2 rounded-full shrink-0"
                                style={{ backgroundColor: getProjectHueColor(project.hue) }}
                              />
                              <span className="truncate">{project.name}</span>
                            </button>

                            {/* Project Actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/proj:opacity-100 focus-within:opacity-100 transition-opacity">
                              <button
                                type="button"
                                title="Add page to project"
                                aria-label="Add page to project"
                                onClick={() => onCreateNote(undefined, project.id)}
                                className="grid size-5 place-items-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Plus className="size-3" />
                              </button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    title="Project options"
                                    aria-label="Project options"
                                    className="grid size-5 place-items-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <MoreHorizontal className="size-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 text-xs">
                                  <DropdownMenuItem
                                    onClick={() => onSelectProjectOverview(project.id)}
                                    className="gap-2 text-xs cursor-pointer"
                                  >
                                    <Pin className="size-3.5 text-primary" /> Open Overview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onCreateNote(undefined, project.id)}
                                    className="gap-2 text-xs cursor-pointer"
                                  >
                                    <Plus className="size-3.5" /> Add Page
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRenameProjectTarget(project)}
                                    className="gap-2 text-xs cursor-pointer"
                                  >
                                    <Edit2 className="size-3.5" /> Rename Project
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteProjectTarget(project)}
                                    className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" /> Delete Project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Expanded Project Contents (Overview + Page Tree) */}
                          {isProjExpanded && (
                            <div className="space-y-0.5 pl-2 border-l border-border/40 ml-3">
                              {/* Dedicated Project Overview Row */}
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  onSelectProjectOverview(project.id);
                                  if (onCloseMobile) onCloseMobile();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onSelectProjectOverview(project.id);
                                    if (onCloseMobile) onCloseMobile();
                                  }
                                }}
                                className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pl-4 pr-2 text-left text-xs transition-colors cursor-pointer ${
                                  isOverviewSelected
                                    ? "bg-accent text-accent-foreground font-medium shadow-xs"
                                    : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <Pin className="size-3 text-primary shrink-0" />
                                <span className="truncate flex-1">Overview</span>
                              </div>

                              {/* Nested Pages inside this project */}
                              {topPages.map((page) => renderNoteRow(page, 0))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {projects.length === 0 && (
                      <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                        No projects yet. Click + to create one.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* General / Unassigned Pages Section */}
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                  <button
                    type="button"
                    onClick={() => setGeneralSectionOpen(!generalSectionOpen)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {generalSectionOpen ? (
                      <ChevronDown className="size-3" />
                    ) : (
                      <ChevronRight className="size-3" />
                    )}
                    <span>General Pages ({unassignedTopNotes.length})</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => onCreateNote()}
                    title="Create unassigned page"
                    aria-label="Create unassigned page"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                {generalSectionOpen && (
                  <div className="space-y-0.5">
                    {unassignedTopNotes.length > 0 ? (
                      unassignedTopNotes.map((note) => renderNoteRow(note, 0))
                    ) : (
                      <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                        No general pages.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Statistics */}
        <div className="mt-auto pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>{notes.length} total pages</span>
          <span>{projects.length} projects</span>
        </div>
      </aside>

      {/* Modal Dialogs */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onCreateProject={onCreateProject}
      />

      <RenameProjectDialog
        project={renameProjectTarget}
        open={Boolean(renameProjectTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameProjectTarget(null);
        }}
        onRenameProject={onRenameProject}
      />

      <DeleteProjectDialog
        project={deleteProjectTarget}
        open={Boolean(deleteProjectTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteProjectTarget(null);
        }}
        onDeleteProject={onDeleteProject}
      />

      <RenamePageDialog
        note={renamePageTarget}
        open={Boolean(renamePageTarget)}
        onOpenChange={(open) => {
          if (!open) setRenamePageTarget(null);
        }}
        onRenameNote={onRenameNote}
      />

      <DeletePageDialog
        note={deletePageTarget}
        subpageCount={deletePageTarget ? getAllDescendantIds(deletePageTarget.id, notes).length : 0}
        open={Boolean(deletePageTarget)}
        onOpenChange={(open) => {
          if (!open) setDeletePageTarget(null);
        }}
        onDeleteNote={onDeleteNote}
      />

      <MovePageDialog
        note={movePageTarget}
        allNotes={notes}
        projects={projects}
        open={Boolean(movePageTarget)}
        onOpenChange={(open) => {
          if (!open) setMovePageTarget(null);
        }}
        onMoveNote={onMoveNote}
      />
    </>
  );
}
