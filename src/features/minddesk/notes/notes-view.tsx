"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FileText,
  FolderOpen,
  LayoutGrid,
  List,
  Plus,
  Search,
  SidebarClose,
  SidebarOpen,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeskData } from "../store";
import type { NoteItem } from "../types";
import { NoteEditor } from "./note-editor";
import { NoteSidebar } from "./components/note-sidebar";

interface NotesViewProps {
  favoriteOnly?: boolean;
  initialNoteId?: string;
}

export function NotesView({ favoriteOnly = false, initialNoteId }: NotesViewProps = {}) {
  const { data, update, selectedItem, setSelectedItem } = useDeskData();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "alpha">("updated");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [showDocSidebar, setShowDocSidebar] = useState(true);

  // Active open note ID
  const [openNoteId, setOpenNoteId] = useState<string | null>(() => {
    const candidate = initialNoteId ?? selectedItem ?? null;
    return candidate && data.notes.some((item) => item.id === candidate) ? candidate : null;
  });

  useEffect(() => {
    const candidate = initialNoteId ?? selectedItem;
    if (candidate && data.notes.some((item) => item.id === candidate)) {
      setOpenNoteId(candidate);
      if (selectedItem === candidate) {
        setSelectedItem(null);
      }
    }
  }, [data.notes, initialNoteId, selectedItem, setSelectedItem]);

  // Create note
  const createNote = (parentId?: string) => {
    const id = crypto.randomUUID();
    const newNote: NoteItem = {
      id,
      title: "Untitled note",
      excerpt: "A new place to put a thought.",
      content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Start writing…"}]}]}',
      icon: "✎",
      updated: "Just now",
      projectId: data.projects[0]?.id ?? "personal",
      starred: false,
      ...(parentId ? { parentId } : {}),
    };
    update((current) => ({ ...current, notes: [newNote, ...current.notes] }));
    setOpenNoteId(id);
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
  };

  // Delete note
  const deleteNote = (noteId: string) => {
    update((current) => ({
      ...current,
      notes: current.notes
        .filter((item) => item.id !== noteId)
        // Also reparent or detach child notes so they aren't orphaned
        .map((item) => (item.parentId === noteId ? { ...item, parentId: null } : item)),
    }));
    if (openNoteId === noteId) {
      setOpenNoteId(null);
    }
  };

  // Star note
  const toggleStar = (noteId: string) => {
    update((current) => ({
      ...current,
      notes: current.notes.map((item) =>
        item.id === noteId ? { ...item, starred: !item.starred } : item,
      ),
    }));
  };

  // Filter & sort notes for gallery view
  const notes = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = data.notes.filter((note) => {
      if (favoriteOnly && !note.starred) return false;
      if (!q) return true;
      return `${note.title} ${note.excerpt} ${note.content}`.toLowerCase().includes(q);
    });

    if (sortBy === "alpha") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [data.notes, favoriteOnly, query, sortBy]);

  // Open note details if one is selected
  const activeNote = openNoteId ? data.notes.find((item) => item.id === openNoteId) : null;

  if (activeNote) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Notion-style Document Sidebar in Editor mode */}
        {showDocSidebar && (
          <div className="hidden lg:block shrink-0 h-full">
            <NoteSidebar
              notes={data.notes}
              activeNoteId={activeNote.id}
              onSelectNote={(id) => setOpenNoteId(id)}
              onCreateNote={(parentId) => createNote(parentId)}
              onDeleteNote={deleteNote}
              onToggleStar={toggleStar}
              projects={data.projects}
            />
          </div>
        )}

        {/* Main Editor Scrollable Area */}
        <div className="relative flex-1 overflow-y-auto minddesk-scrollbar">
          <div className="sticky top-3 left-4 z-20 hidden lg:block float-left">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg bg-card/80 backdrop-blur-md shadow-xs"
              onClick={() => setShowDocSidebar(!showDocSidebar)}
              title={showDocSidebar ? "Hide sidebar" : "Show sidebar"}
            >
              {showDocSidebar ? <SidebarClose className="size-4" /> : <SidebarOpen className="size-4" />}
            </Button>
          </div>

          <NoteEditor
            note={activeNote}
            onBack={() => setOpenNoteId(null)}
            onUpdate={(changes) =>
              update((current) => ({
                ...current,
                notes: current.notes.map((item) =>
                  item.id === activeNote.id ? { ...item, ...changes, updated: "Just now" } : item,
                ),
              }))
            }
            onNavigateToNote={(id) => setOpenNoteId(id)}
            onDuplicateNote={() => duplicateNote(activeNote)}
            onDeleteNote={() => deleteNote(activeNote.id)}
          />
        </div>
      </div>
    );
  }

  // Gallery / List View
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="size-4 text-primary" /> Keep the useful bits
          </div>
          <h1 className="truncate text-3xl font-semibold">{favoriteOnly ? "Favorites" : "Notes"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notion-style documents, structured thoughts, references, and room to explore.
          </p>
        </div>
        <Button onClick={() => createNote()} className="gap-1.5 shadow-sm">
          <Plus className="size-4" /> New note
        </Button>
      </header>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-input bg-card px-3 shadow-xs">
          <Search className="size-4 text-muted-foreground" />
          <input
            aria-label="Search notes"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Find a note…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "updated" | "alpha")}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground outline-none focus:border-primary"
          >
            <option value="updated">Recently updated</option>
            <option value="alpha">Alphabetical</option>
          </select>

          {/* Layout Toggle */}
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            <Button
              variant={viewLayout === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setViewLayout("grid")}
              title="Grid layout"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewLayout === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
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
            const project = data.projects.find((item) => item.id === note.projectId);
            const parentNote = note.parentId ? data.notes.find((item) => item.id === note.parentId) : null;

            return (
              <article
                key={note.id}
                className="minddesk-panel group relative flex min-h-44 flex-col p-5 transition-all hover:border-ring/50 hover:shadow-sm"
              >
                {/* Header with Icon, Parent pill and Star */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg shadow-2xs">
                      {note.icon}
                    </span>
                    {parentNote && (
                      <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground truncate">
                        <span>{parentNote.icon}</span>
                        <span className="truncate">{parentNote.title}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Add sub-page"
                      title="Add sub-page"
                      onClick={() => createNote(note.id)}
                    >
                      <Plus className="size-3.5 text-muted-foreground" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={note.starred ? "Remove note from favorites" : "Add note to favorites"}
                      onClick={() => toggleStar(note.id)}
                    >
                      <Star
                        className={`size-4 ${note.starred ? "fill-primary text-primary" : "text-muted-foreground"}`}
                      />
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <button
                  type="button"
                  onClick={() => setOpenNoteId(note.id)}
                  className="text-left text-base font-semibold hover:text-primary transition-colors truncate"
                >
                  {note.title || "Untitled"}
                </button>

                {/* Excerpt */}
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {note.excerpt}
                </p>

                {/* Footer Metadata */}
                <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <FolderOpen className="size-3.5" />
                    {project?.name ?? "Personal"}
                  </span>
                  <span>{note.updated}</span>
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
          <h3 className="text-base font-semibold">No notes found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {query ? "Try adjusting your search terms." : "Capture thoughts, ideas, or meeting notes."}
          </p>
          <Button onClick={() => createNote()} className="mt-4 gap-1.5">
            <Plus className="size-4" /> Write a note
          </Button>
        </div>
      )}
    </section>
  );
}
