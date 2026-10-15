"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Search,
  SidebarClose,
  SidebarOpen,
  Star,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeskData } from "../store";
import type { NoteItem, ProjectItem } from "../types";
import { NoteEditor } from "./note-editor";
import { NoteSidebar } from "./components/note-sidebar";
import { ProjectFilter } from "./components/project-filter";
import { DeletePageDialog } from "./components/notes-modals";
import {
  filterNotesByProject,
  getAllDescendantIds,
  getProjectHueColor,
  getProjectOverviewId,
  type ProjectFilterValue,
} from "./types";

interface NotesViewProps {
  favoriteOnly?: boolean;
  initialNoteId?: string;
}

export function NotesView({ favoriteOnly = false, initialNoteId }: NotesViewProps = {}) {
  const {
    data,
    update,
    selectedItem,
    setSelectedItem,
    registerDeletedId,
    persistImmediately,
  } = useDeskData();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "alpha">("updated");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [showDocSidebar, setShowDocSidebar] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [projectFilter, setProjectFilter] = useState<ProjectFilterValue>("all");

  // Dialog state for deletion initiated from editor
  const [editorDeleteTarget, setEditorDeleteTarget] = useState<NoteItem | null>(null);

  // Active open note ID
  const [openNoteId, setOpenNoteId] = useState<string | null>(() => {
    const candidate = initialNoteId ?? selectedItem ?? null;
    return candidate && data.notes.some((item) => item.id === candidate) ? candidate : null;
  });

  const lastInitialNoteIdRef = useRef<string | undefined>(
    openNoteId ? initialNoteId : undefined,
  );

  useEffect(() => {
    if (initialNoteId && initialNoteId !== lastInitialNoteIdRef.current) {
      if (data.notes.some((item) => item.id === initialNoteId)) {
        setOpenNoteId(initialNoteId);
        lastInitialNoteIdRef.current = initialNoteId;
      }
    }
  }, [initialNoteId, data.notes]);

  useEffect(() => {
    if (selectedItem) {
      if (data.notes.some((item) => item.id === selectedItem)) {
        setOpenNoteId(selectedItem);
      }
      setSelectedItem(null);
    }
  }, [selectedItem, data.notes, setSelectedItem]);

  // Selected project object if a specific project is filtered
  const activeFilteredProject = useMemo(() => {
    if (projectFilter !== "all" && projectFilter !== "unassigned") {
      return data.projects.find((p) => p.id === projectFilter) || null;
    }
    return null;
  }, [data.projects, projectFilter]);

  // Create note
  const createNote = (parentId?: string, targetProjectId?: string, initialTitle?: string) => {
    const id = crypto.randomUUID();
    let assignedProjectId: string | undefined = undefined;

    if (targetProjectId) {
      assignedProjectId = targetProjectId;
    } else if (parentId) {
      const parent = data.notes.find((n) => n.id === parentId);
      if (parent?.projectId && data.projects.some((p) => p.id === parent.projectId)) {
        assignedProjectId = parent.projectId;
      }
    } else if (projectFilter !== "all" && projectFilter !== "unassigned") {
      if (data.projects.some((p) => p.id === projectFilter)) {
        assignedProjectId = projectFilter;
      }
    }

    const title = initialTitle || (parentId ? "Untitled sub-page" : "Untitled note");
    const newNote: NoteItem = {
      id,
      title,
      excerpt: parentId ? "Nested page." : "A new place to put a thought.",
      content:
        `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"${title}"}]}]}`,
      icon: parentId ? "📄" : "✎",
      updated: "Just now",
      starred: false,
      ...(assignedProjectId ? { projectId: assignedProjectId } : {}),
      ...(parentId ? { parentId } : {}),
    };

    update((current) => ({ ...current, notes: [newNote, ...current.notes] }));
    setOpenNoteId(id);
    void persistImmediately();
    return id;
  };

  // Duplicate note
  const duplicateNote = (note: NoteItem) => {
    const id = crypto.randomUUID();
    const copy: NoteItem = {
      ...note,
      id,
      title: `${note.title} (Copy)`,
      updated: "Just now",
    };
    update((current) => ({ ...current, notes: [copy, ...current.notes] }));
    setOpenNoteId(id);
    void persistImmediately();
  };

  // Delete note with subtree preservation or subtree deletion
  const handleDeleteNote = (noteId: string, deleteSubtree = false) => {
    const targetNote = data.notes.find((n) => n.id === noteId);
    if (!targetNote) return;

    if (deleteSubtree) {
      const descendantIds = getAllDescendantIds(noteId, data.notes);
      const allIdsToDelete = [noteId, ...descendantIds];
      for (const id of allIdsToDelete) {
        registerDeletedId("note", id);
      }
      const deleteIdSet = new Set(allIdsToDelete);
      update((current) => ({
        ...current,
        notes: current.notes.filter((item) => !deleteIdSet.has(item.id)),
      }));
      if (openNoteId && deleteIdSet.has(openNoteId)) {
        setOpenNoteId(null);
      }
    } else {
      // Reparent children to parent
      registerDeletedId("note", noteId);
      const parentId = targetNote.parentId ?? null;
      update((current) => ({
        ...current,
        notes: current.notes
          .filter((item) => item.id !== noteId)
          .map((item) => (item.parentId === noteId ? { ...item, parentId } : item)),
      }));
      if (openNoteId === noteId) {
        setOpenNoteId(null);
      }
    }

    void persistImmediately();
  };

  // Rename note
  const handleRenameNote = (noteId: string, newTitle: string) => {
    update((current) => ({
      ...current,
      notes: current.notes.map((n) =>
        n.id === noteId ? { ...n, title: newTitle, updated: "Just now" } : n,
      ),
    }));
    void persistImmediately();
  };

  // Move note to project and/or parent page
  const handleMoveNote = (
    noteId: string,
    targetProjectId?: string,
    targetParentId?: string | null,
  ) => {
    const descendantIds = getAllDescendantIds(noteId, data.notes);
    const affectedIds = new Set([noteId, ...descendantIds]);
    const normalizedProjId =
      targetProjectId === "unassigned" || !targetProjectId ? undefined : targetProjectId;

    update((current) => ({
      ...current,
      notes: current.notes.map((item) => {
        if (item.id === noteId) {
          return {
            ...item,
            parentId: targetParentId === "none" ? null : (targetParentId ?? null),
            projectId: normalizedProjId,
            updated: "Just now",
          };
        }
        if (affectedIds.has(item.id)) {
          // Descendants inherit target project
          return {
            ...item,
            projectId: normalizedProjId,
            updated: "Just now",
          };
        }
        return item;
      }),
    }));

    void persistImmediately();
  };

  // Star / unstar note
  const toggleStar = (noteId: string) => {
    update((current) => ({
      ...current,
      notes: current.notes.map((item) =>
        item.id === noteId ? { ...item, starred: !item.starred } : item,
      ),
    }));
  };

  // Project management
  const handleCreateProject = (projectData: {
    name: string;
    hue: "violet" | "mint" | "amber" | "blue";
    description?: string;
  }) => {
    const projectId = crypto.randomUUID();
    const overviewId = getProjectOverviewId(projectId);

    const newProject: ProjectItem = {
      id: projectId,
      name: projectData.name,
      hue: projectData.hue,
      description: projectData.description || "",
      icon: "📁",
    };

    const overviewNote: NoteItem = {
      id: overviewId,
      title: `${projectData.name} Overview`,
      excerpt: projectData.description || `Overview and goals for ${projectData.name}.`,
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: `${projectData.name} Overview` }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text:
                  projectData.description ||
                  "Welcome to your project workspace. Write high-level goals, scope, and specifications here.",
              },
            ],
          },
        ],
      }),
      icon: "📌",
      updated: "Just now",
      starred: false,
      projectId,
      parentId: null,
    };

    update((current) => ({
      ...current,
      projects: [...current.projects, newProject],
      notes: [overviewNote, ...current.notes],
    }));

    setOpenNoteId(overviewId);
    void persistImmediately();
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    const overviewId = getProjectOverviewId(projectId);
    update((current) => ({
      ...current,
      projects: current.projects.map((p) =>
        p.id === projectId ? { ...p, name: newName, updated: "Just now" } : p,
      ),
      notes: current.notes.map((n) =>
        n.id === overviewId ? { ...n, title: `${newName} Overview`, updated: "Just now" } : n,
      ),
    }));
    void persistImmediately();
  };

  const handleDeleteProject = (projectId: string, deleteNotes: boolean) => {
    registerDeletedId("project", projectId);
    const overviewId = getProjectOverviewId(projectId);

    if (deleteNotes) {
      const notesToDelete = data.notes.filter((n) => n.projectId === projectId);
      for (const n of notesToDelete) {
        registerDeletedId("note", n.id);
      }
      const deleteIdSet = new Set(notesToDelete.map((n) => n.id));
      update((current) => ({
        ...current,
        projects: current.projects.filter((p) => p.id !== projectId),
        notes: current.notes.filter((n) => !deleteIdSet.has(n.id)),
      }));
      if (openNoteId && (openNoteId === overviewId || deleteIdSet.has(openNoteId))) {
        setOpenNoteId(null);
      }
    } else {
      registerDeletedId("note", overviewId);
      update((current) => ({
        ...current,
        projects: current.projects.filter((p) => p.id !== projectId),
        notes: current.notes
          .filter((n) => n.id !== overviewId)
          .map((n) => (n.projectId === projectId ? { ...n, projectId: undefined } : n)),
      }));
      if (openNoteId === overviewId) {
        setOpenNoteId(null);
      }
    }

    void persistImmediately();
  };

  const handleSelectProjectOverview = (projectId: string) => {
    const overviewId = getProjectOverviewId(projectId);
    const existing = data.notes.find((n) => n.id === overviewId);
    const project = data.projects.find((p) => p.id === projectId);

    if (!existing && project) {
      const overviewNote: NoteItem = {
        id: overviewId,
        title: `${project.name} Overview`,
        excerpt: project.description || `Overview and goals for ${project.name}.`,
        content: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: `${project.name} Overview` }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text:
                    project.description ||
                    "Welcome to your project workspace. Write high-level goals, scope, and specifications here.",
                },
              ],
            },
          ],
        }),
        icon: "📌",
        updated: "Just now",
        starred: false,
        projectId: project.id,
        parentId: null,
      };
      update((current) => ({ ...current, notes: [overviewNote, ...current.notes] }));
      void persistImmediately();
    }

    setOpenNoteId(overviewId);
  };

  // Filter & sort notes for gallery view
  const notes = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = filterNotesByProject(data.notes, projectFilter, data.projects);

    if (favoriteOnly) {
      result = result.filter((note) => note.starred);
    }

    // Requirement: Show only top-level pages on Notes Home.
    // Subpages are accessed and managed when their parent document opens.
    result = result.filter((note) => !note.parentId);

    if (q) {
      result = result.filter((note) =>
        `${note.title} ${note.excerpt} ${note.content}`.toLowerCase().includes(q),
      );
    }

    if (sortBy === "alpha") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [data.notes, data.projects, favoriteOnly, projectFilter, query, sortBy]);

  // Open note details if one is selected
  const activeNote = openNoteId ? data.notes.find((item) => item.id === openNoteId) : null;

  if (activeNote) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Desktop Notion-style Document Sidebar */}
        {showDocSidebar && (
          <div className="hidden lg:block shrink-0 h-full">
            <NoteSidebar
              notes={data.notes}
              activeNoteId={openNoteId}
              onSelectNote={(id) => setOpenNoteId(id)}
              onCreateNote={createNote}
              onRenameNote={handleRenameNote}
              onDeleteNote={handleDeleteNote}
              onMoveNote={handleMoveNote}
              onToggleStar={toggleStar}
              projects={data.projects}
              onCreateProject={handleCreateProject}
              onRenameProject={handleRenameProject}
              onDeleteProject={handleDeleteProject}
              onSelectProjectOverview={handleSelectProjectOverview}
            />
          </div>
        )}

        {/* Mobile Slide-Over Sidebar Drawer */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
              onClick={() => setShowMobileSidebar(false)}
            />
            <div className="relative z-50 flex w-full max-w-xs flex-1 flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-200">
              <NoteSidebar
                notes={data.notes}
                activeNoteId={openNoteId}
                onSelectNote={(id) => {
                  setOpenNoteId(id);
                  setShowMobileSidebar(false);
                }}
                onCreateNote={(parentId, targetProjectId) => {
                  createNote(parentId, targetProjectId);
                  setShowMobileSidebar(false);
                }}
                onRenameNote={handleRenameNote}
                onDeleteNote={handleDeleteNote}
                onMoveNote={handleMoveNote}
                onToggleStar={toggleStar}
                projects={data.projects}
                onCreateProject={handleCreateProject}
                onRenameProject={handleRenameProject}
                onDeleteProject={handleDeleteProject}
                onSelectProjectOverview={(projId) => {
                  handleSelectProjectOverview(projId);
                  setShowMobileSidebar(false);
                }}
                onCloseMobile={() => setShowMobileSidebar(false)}
              />
            </div>
          </div>
        )}

        {/* Note Editor */}
        <div className="relative flex-1 overflow-y-auto minddesk-scrollbar">
          <div className="sticky top-3 left-4 z-20 hidden lg:block float-left">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg bg-card/80 backdrop-blur-md shadow-xs cursor-pointer"
              onClick={() => setShowDocSidebar(!showDocSidebar)}
              title={showDocSidebar ? "Hide sidebar" : "Show sidebar"}
            >
              {showDocSidebar ? (
                <SidebarClose className="size-4" />
              ) : (
                <SidebarOpen className="size-4" />
              )}
            </Button>
          </div>

          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            onBack={() => {
              void persistImmediately();
              setOpenNoteId(null);
            }}
            onUpdate={(changes) => {
              if (changes.projectId !== undefined || changes.parentId !== undefined) {
                const targetProj =
                  changes.projectId !== undefined ? changes.projectId : activeNote.projectId;
                const targetParent =
                  changes.parentId !== undefined ? changes.parentId : activeNote.parentId;
                handleMoveNote(activeNote.id, targetProj, targetParent);
              }
              const restChanges = { ...changes };
              delete restChanges.projectId;
              delete restChanges.parentId;
              if (Object.keys(restChanges).length > 0) {
                update((current) => ({
                  ...current,
                  notes: current.notes.map((item) =>
                    item.id === activeNote.id
                      ? { ...item, ...restChanges, updated: "Just now" }
                      : item,
                  ),
                }));
              }
            }}
            onNavigateToNote={(id) => {
              void persistImmediately();
              setOpenNoteId(id);
            }}
            onDuplicateNote={() => duplicateNote(activeNote)}
            onDeleteNote={() => setEditorDeleteTarget(activeNote)}
            onCreateSubpage={(title) => createNote(activeNote.id, undefined, title)}
            onToggleMobileSidebar={() => setShowMobileSidebar(true)}
          />
        </div>

        {/* Editor Deletion Dialog (Keep Subpages vs Delete Entire Subtree) */}
        <DeletePageDialog
          note={editorDeleteTarget}
          subpageCount={
            editorDeleteTarget ? getAllDescendantIds(editorDeleteTarget.id, data.notes).length : 0
          }
          open={Boolean(editorDeleteTarget)}
          onOpenChange={(open) => {
            if (!open) setEditorDeleteTarget(null);
          }}
          onDeleteNote={(noteId, deleteSubtree) => {
            handleDeleteNote(noteId, deleteSubtree);
          }}
        />
      </div>
    );
  }

  // Gallery / List View
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
            <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileSidebar(true)}
                    className="lg:hidden h-7 px-2 gap-1.5 text-xs -ml-2"
                  >
                    <BookOpen className="size-3.5 text-primary" />
                    <span>Sidebar</span>
                  </Button>
                  <span className="hidden lg:inline-flex items-center gap-1.5">
                    <BookOpen className="size-4 text-primary" /> Keep the useful bits
                  </span>
                </div>
                <h1 className="truncate text-3xl font-semibold">
                  {favoriteOnly ? "Favorites" : "Notes"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Notion-style documents, structured thoughts, references, and room to explore.
                </p>
              </div>
              <Button onClick={() => createNote()} className="gap-1.5 shadow-sm cursor-pointer">
                <Plus className="size-4" />
                <span>
                  {activeFilteredProject
                    ? `New note in ${activeFilteredProject.name}`
                    : "New note"}
                </span>
              </Button>
            </header>

            {/* Filter by Project Bar */}
            <div className="mb-6 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-2xs">
              <ProjectFilter
                projects={data.projects}
                notes={data.notes}
                value={projectFilter}
                onChange={setProjectFilter}
              />
            </div>

            {/* Search, Sort and Layout Controls */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-input bg-card px-3 shadow-xs">
                <Search className="size-4 text-muted-foreground" />
                <input
                  aria-label="Search notes"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={
                    activeFilteredProject
                      ? `Find a note in ${activeFilteredProject.name}…`
                      : projectFilter === "unassigned"
                      ? "Find an unassigned note…"
                      : "Find a note…"
                  }
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "updated" | "alpha")}
                  className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="updated">Recently updated</option>
                  <option value="alpha">Alphabetical</option>
                </select>

                <div className="flex rounded-lg border border-border bg-card p-0.5">
                  <Button
                    variant={viewLayout === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8 cursor-pointer"
                    onClick={() => setViewLayout("grid")}
                    title="Grid layout"
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    variant={viewLayout === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="size-8 cursor-pointer"
                    onClick={() => setViewLayout("list")}
                    title="List layout"
                  >
                    <List className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {notes.length ? (
              <div
                className={
                  viewLayout === "grid"
                    ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    : "flex flex-col gap-2.5"
                }
              >
                {notes.map((note) => {
                  const project = note.projectId
                    ? data.projects.find((item) => item.id === note.projectId) || null
                    : null;
                  const directSubpages = data.notes.filter((item) => item.parentId === note.id);

                  return (
                    <article
                      key={note.id}
                      className="minddesk-panel group relative flex min-h-44 flex-col p-5 transition-all hover:border-ring/50 hover:shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg shadow-2xs">
                            {note.icon || "📄"}
                          </span>
                          {directSubpages.length > 0 && (
                            <span className="flex items-center gap-1 rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-medium truncate">
                              <Layers className="size-3 shrink-0" />
                              <span>{directSubpages.length} {directSubpages.length === 1 ? "subpage" : "subpages"}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label="Add sub-page"
                            title="Add sub-page"
                            onClick={() => createNote(note.id)}
                          >
                            <Plus className="size-3.5 text-muted-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer"
                            aria-label={
                              note.starred ? "Remove note from favorites" : "Add note to favorites"
                            }
                            onClick={() => toggleStar(note.id)}
                          >
                            <Star
                              className={`size-4 ${note.starred ? "fill-primary text-primary" : "text-muted-foreground"}`}
                            />
                          </Button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setOpenNoteId(note.id)}
                        className="text-left text-base font-semibold hover:text-primary transition-colors truncate cursor-pointer"
                      >
                        {note.title || "Untitled"}
                      </button>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {note.excerpt}
                      </p>

                      <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                        {project ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 truncate max-w-[180px]">
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: getProjectHueColor(project.hue) }}
                            />
                            <FolderOpen className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">{project.name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                            <FileText className="size-3.5" />
                            <span>Unassigned</span>
                          </span>
                        )}
                        <span className="shrink-0">{note.updated}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                  <FileText className="size-6" />
                </div>
                <h3 className="text-base font-semibold">
                  {query
                    ? "No notes found"
                    : projectFilter === "unassigned"
                    ? "No unassigned notes"
                    : activeFilteredProject
                    ? `No notes in ${activeFilteredProject.name}`
                    : favoriteOnly
                    ? "No favorite notes"
                    : "No notes yet"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  {query
                    ? `No documents matched "${query}". Try adjusting your search.`
                    : projectFilter === "unassigned"
                    ? "All your notes currently belong to MindDesk projects."
                    : activeFilteredProject
                    ? `Gather notes, specifications, or meeting minutes for ${activeFilteredProject.name}.`
                    : favoriteOnly
                    ? "Star documents to keep your most important work at your fingertips."
                    : "Capture thoughts, ideas, or meeting notes."}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  {query && (
                    <Button
                      variant="outline"
                      onClick={() => setQuery("")}
                      className="cursor-pointer"
                    >
                      Clear search
                    </Button>
                  )}
                  {projectFilter !== "all" && !query && (
                    <Button
                      variant="outline"
                      onClick={() => setProjectFilter("all")}
                      className="cursor-pointer"
                    >
                      View all notes
                    </Button>
                  )}
                  <Button onClick={() => createNote()} className="gap-1.5 cursor-pointer">
                    <Plus className="size-4" />
                    <span>
                      {activeFilteredProject
                        ? `Write note in ${activeFilteredProject.name}`
                        : "Create note"}
                    </span>
                  </Button>
                </div>
              </div>
            )}
    </section>
  );
}
