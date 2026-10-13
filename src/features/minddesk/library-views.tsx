"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, FolderOpen, Plus, Search, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeskData } from "./store";
import { MindMapCanvas } from "./mind-map-canvas";
import type { MindMapItem, ProjectItem } from "./types";
import { NotesView } from "./notes/notes-view";

export { NotesView };

export function ProjectsView({ initialProjectId }: { initialProjectId?: string } = {}) {
  const { data, update, selectedItem, setSelectedItem, registerDeletedId } = useDeskData();
  const [activeId, setActiveId] = useState<string | null>(() => {
    const candidate = initialProjectId ?? selectedItem ?? null;
    return candidate && data.projects.some((project) => project.id === candidate) ? candidate : null;
  });
  const [query, setQuery] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);
  const [deleteHandlingMode, setDeleteHandlingMode] = useState<"preserve" | "delete">("preserve");

  useEffect(() => {
    const candidate = initialProjectId ?? selectedItem;
    if (candidate && data.projects.some((project) => project.id === candidate)) {
      setActiveId(candidate);
      if (selectedItem === candidate) {
        setSelectedItem(null);
      }
    }
  }, [data.projects, initialProjectId, selectedItem, setSelectedItem]);

  const activeProject = data.projects.find((project) => project.id === activeId);

  const createProject = () => {
    const id = crypto.randomUUID();
    const project: ProjectItem = {
      id,
      name: "New project",
      description: "A fresh space for related work.",
      icon: "✳",
      hue: "violet",
    };
    update((current) => ({ ...current, projects: [project, ...current.projects] }));
    setActiveId(id);
  };

  const handleConfirmDeleteProject = () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete.id;

    registerDeletedId("project", targetId);

    if (deleteHandlingMode === "delete") {
      const linkedTasks = data.tasks.filter((t) => t.projectId === targetId);
      const linkedNotes = data.notes.filter((n) => n.projectId === targetId);
      linkedTasks.forEach((t) => registerDeletedId("task", t.id));
      linkedNotes.forEach((n) => registerDeletedId("note", n.id));

      update((current) => ({
        ...current,
        projects: current.projects.filter((p) => p.id !== targetId),
        tasks: current.tasks.filter((t) => t.projectId !== targetId),
        notes: current.notes.filter((n) => n.projectId !== targetId),
      }));
    } else {
      // Safe default: preserve linked tasks and notes by unlinking them
      update((current) => ({
        ...current,
        projects: current.projects.filter((p) => p.id !== targetId),
        tasks: current.tasks.map((t) =>
          t.projectId === targetId ? { ...t, projectId: undefined } : t
        ),
        notes: current.notes.map((n) =>
          n.projectId === targetId ? { ...n, projectId: undefined } : n
        ),
      }));
    }

    if (activeId === targetId) {
      setActiveId(null);
    }
    setProjectToDelete(null);
    setDeleteHandlingMode("preserve");
  };

  const renderDeleteDialog = () => (
    <Dialog
      open={Boolean(projectToDelete)}
      onOpenChange={(open) => {
        if (!open) {
          setProjectToDelete(null);
          setDeleteHandlingMode("preserve");
        }
      }}
    >
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Delete &ldquo;{projectToDelete?.name}&rdquo;?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1.5">
            {(() => {
              if (!projectToDelete) return null;
              const pTasks = data.tasks.filter((t) => t.projectId === projectToDelete.id);
              const pNotes = data.notes.filter((n) => n.projectId === projectToDelete.id);
              if (pTasks.length === 0 && pNotes.length === 0) {
                return "Are you sure you want to delete this project? This action cannot be undone.";
              }
              return `This project has ${pTasks.length} ${
                pTasks.length === 1 ? "task" : "tasks"
              } and ${pNotes.length} ${
                pNotes.length === 1 ? "note" : "notes"
              } associated with it.`;
            })()}
          </DialogDescription>
        </DialogHeader>

        {projectToDelete && (() => {
          const pTasks = data.tasks.filter((t) => t.projectId === projectToDelete.id);
          const pNotes = data.notes.filter((n) => n.projectId === projectToDelete.id);
          const totalLinked = pTasks.length + pNotes.length;

          if (totalLinked === 0) return null;

          return (
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-accent/30 p-3 text-xs cursor-pointer transition-colors hover:bg-accent/50">
                  <input
                    type="radio"
                    name={`delete-project-mode-${projectToDelete.id}`}
                    value="preserve"
                    checked={deleteHandlingMode === "preserve"}
                    onChange={() => setDeleteHandlingMode("preserve")}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="font-medium text-foreground">
                      Preserve linked notes and tasks (Recommended)
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Unlinks {pTasks.length} {pTasks.length === 1 ? "task" : "tasks"} and {pNotes.length} {pNotes.length === 1 ? "note" : "notes"} so they remain safely in your workspace.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs cursor-pointer transition-colors hover:bg-destructive/10">
                  <input
                    type="radio"
                    name={`delete-project-mode-${projectToDelete.id}`}
                    value="delete"
                    checked={deleteHandlingMode === "delete"}
                    onChange={() => setDeleteHandlingMode("delete")}
                    className="mt-0.5 accent-destructive"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-destructive">
                      Permanently delete linked notes and tasks
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                      All {totalLinked} associated productivity items will be permanently removed.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          );
        })()}

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setProjectToDelete(null);
              setDeleteHandlingMode("preserve");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="confirm-delete-project-btn"
            onClick={handleConfirmDeleteProject}
          >
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (activeProject) {
    const tasks = data.tasks.filter((task) => task.projectId === activeProject.id);
    const notes = data.notes.filter((note) => note.projectId === activeProject.id);
    return (
      <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>
            <ChevronLeft /> Projects
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive gap-1.5"
            onClick={() => setProjectToDelete(activeProject)}
            aria-label="Delete project"
          >
            <Trash2 className="size-4" />
            <span>Delete project</span>
          </Button>
        </div>
        <header className="mb-8 flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl text-brand-ink">
            {activeProject.icon}
          </span>
          <div className="min-w-0 flex-1">
            <input
              aria-label="Project name"
              className="w-full bg-transparent text-3xl font-semibold outline-none"
              value={activeProject.name}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  projects: current.projects.map((project) =>
                    project.id === activeProject.id ? { ...project, name: event.target.value } : project,
                  ),
                }))
              }
            />
            <input
              aria-label="Project description"
              className="mt-2 w-full bg-transparent text-sm text-muted-foreground outline-none"
              value={activeProject.description}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  projects: current.projects.map((project) =>
                    project.id === activeProject.id ? { ...project, description: event.target.value } : project,
                  ),
                }))
              }
            />
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold">
              Tasks <span className="ml-1 text-muted-foreground">{tasks.length}</span>
            </h2>
            <div className="minddesk-panel divide-y divide-border">
              {tasks.length ? (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      aria-label={task.complete ? "Reopen task" : "Complete task"}
                      className="minddesk-task-check grid size-5 place-items-center"
                      data-done={task.complete}
                      onClick={() =>
                        update((current) => ({
                          ...current,
                          tasks: current.tasks.map((item) =>
                            item.id === task.id ? { ...item, complete: !item.complete } : item,
                          ),
                        }))
                      }
                    >
                      {task.complete && <span>✓</span>}
                    </button>
                    <span className="text-sm">{task.title}</span>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">No tasks connected yet.</p>
              )}
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">
              Notes <span className="ml-1 text-muted-foreground">{notes.length}</span>
            </h2>
            <div className="minddesk-panel divide-y divide-border">
              {notes.length ? (
                notes.map((note) => (
                  <div key={note.id} className="flex items-center gap-3 px-4 py-3">
                    <span>{note.icon}</span>
                    <span className="text-sm">{note.title}</span>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">No notes connected yet.</p>
              )}
            </div>
          </div>
        </div>
        {renderDeleteDialog()}
      </section>
    );
  }

  const projects = data.projects.filter((project) =>
    `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="size-4" /> Everything has a place
          </div>
          <h1 className="truncate text-3xl font-semibold">Projects</h1>
          <p className="mt-2 text-sm text-muted-foreground">A few connected threads, gathered together.</p>
        </div>
        <Button onClick={createProject}>
          <Plus /> New project
        </Button>
      </header>
      <div className="mb-5 flex max-w-md items-center gap-2 rounded-lg border border-input bg-card px-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          aria-label="Search projects"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Find a project…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-6" />}
          title={query ? "No projects match your search" : "No projects yet"}
          action="Create your first project"
          onAction={createProject}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const taskCount = data.tasks.filter((task) => task.projectId === project.id && !task.complete).length;
            const noteCount = data.notes.filter((note) => note.projectId === project.id).length;
            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveId(project.id);
                  }
                }}
                onClick={() => setActiveId(project.id)}
                className="minddesk-panel group min-h-48 p-5 text-left transition-colors hover:border-ring/50 cursor-pointer relative"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span
                    className={`grid size-10 place-items-center rounded-xl text-lg ${
                      project.hue === "mint"
                        ? "bg-sage text-sage-ink"
                        : project.hue === "amber"
                          ? "bg-coral text-coral-ink"
                          : project.hue === "blue"
                            ? "bg-sky text-sky-ink"
                            : "bg-brand-soft text-brand-ink"
                    }`}
                  >
                    {project.icon}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete project ${project.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToDelete(project);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <span className="block text-base font-semibold">{project.name}</span>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">{project.description}</span>
                <span className="mt-5 flex gap-4 text-xs text-muted-foreground">
                  <span>{taskCount} open tasks</span>
                  <span>{noteCount} notes</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {renderDeleteDialog()}
    </section>
  );
}

export function MapsView({ favoriteOnly = false, initialMapId }: { favoriteOnly?: boolean; initialMapId?: string } = {}) {
  const { data, update, selectedItem, setSelectedItem, registerDeletedId } = useDeskData();
  const [mapId, setMapId] = useState<string | null>(() => {
    const candidate = initialMapId ?? selectedItem ?? null;
    return candidate && data.maps.some((item) => item.id === candidate) ? candidate : null;
  });
  const [query, setQuery] = useState("");

  useEffect(() => {
    const candidate = initialMapId ?? selectedItem;
    if (candidate && data.maps.some((item) => item.id === candidate)) {
      setMapId(candidate);
      if (selectedItem === candidate) {
        setSelectedItem(null);
      }
    }
  }, [data.maps, initialMapId, selectedItem, setSelectedItem]);

  const activeMap = data.maps.find((item) => item.id === mapId);
  const createMap = () => {
    const id = crypto.randomUUID();
    const map: MindMapItem = {
      id,
      title: "Untitled mind map",
      updated: "Just now",
      starred: false,
      nodes: [
        { id: "root", position: { x: 250, y: 150 }, data: { label: "A new thought", color: "violet" }, type: "mind" },
        { id: "idea", position: { x: 570, y: 150 }, data: { label: "Add an idea", color: "blue" }, type: "mind" },
      ],
      edges: [{ id: "root-idea", source: "root", target: "idea" }],
    };
    update((current) => ({ ...current, maps: [map, ...current.maps] }));
    setMapId(id);
  };

  if (activeMap) {
    return (
      <section className="mx-auto w-full max-w-[1500px] px-4 pb-8 pt-5 sm:px-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMapId(null)}>
              <ChevronLeft /> Maps
            </Button>
            <input
              aria-label="Mind map title"
              className="min-w-0 bg-transparent text-lg font-semibold outline-none"
              value={activeMap.title}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  maps: current.maps.map((item) =>
                    item.id === activeMap.id ? { ...item, title: event.target.value } : item,
                  ),
                }))
              }
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={activeMap.starred ? "Remove map from favorites" : "Add map to favorites"}
              onClick={() =>
                update((current) => ({
                  ...current,
                  maps: current.maps.map((item) =>
                    item.id === activeMap.id ? { ...item, starred: !item.starred } : item,
                  ),
                }))
              }
            >
              <Star className={`size-4 ${activeMap.starred ? "fill-primary text-primary" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete mind map"
              onClick={() => {
                registerDeletedId("map", activeMap.id);
                update((current) => ({
                  ...current,
                  maps: current.maps.filter((item) => item.id !== activeMap.id),
                }));
                setMapId(null);
              }}
            >
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
        <MindMapCanvas
          nodes={activeMap.nodes}
          edges={activeMap.edges}
          theme={activeMap.theme ?? "calm"}
          layout={activeMap.layout ?? "freeform"}
          onThemeChange={(theme) =>
            update((current) => ({
              ...current,
              maps: current.maps.map((item) => (item.id === activeMap.id ? { ...item, theme } : item)),
            }))
          }
          onLayoutChange={(layout) =>
            update((current) => ({
              ...current,
              maps: current.maps.map((item) => (item.id === activeMap.id ? { ...item, layout } : item)),
            }))
          }
          onSave={(nodes, edges) =>
            update((current) => ({
              ...current,
              maps: current.maps.map((item) =>
                item.id === activeMap.id ? { ...item, nodes, edges, updated: "Just now" } : item,
              ),
            }))
          }
        />
      </section>
    );
  }

  const maps = data.maps.filter(
    (item) => (!favoriteOnly || item.starred) && item.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-base">⌘</span> Give your ideas room to connect
          </div>
          <h1 className="truncate text-3xl font-semibold">Mind maps</h1>
          <p className="mt-2 text-sm text-muted-foreground">See the bigger picture, one branch at a time.</p>
        </div>
        <Button onClick={createMap}>
          <Plus /> New mind map
        </Button>
      </header>
      <div className="mb-5 flex max-w-md items-center gap-2 rounded-lg border border-input bg-card px-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          aria-label="Search mind maps"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Find a map…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {maps.length === 0 ? (
        <EmptyState
          icon={<span className="text-xl">✳</span>}
          title={query ? "No mind maps match your search" : "No mind maps yet"}
          action="Create your first mind map"
          onAction={createMap}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {maps.map((map) => (
            <button
              key={map.id}
              className="minddesk-panel group text-left transition-colors hover:border-ring/50"
              onClick={() => setMapId(map.id)}
            >
              <div className="relative h-40 overflow-hidden rounded-t-xl border-b border-border bg-background">
                <div
                  className="absolute inset-0 opacity-65"
                  style={{
                    backgroundImage: "radial-gradient(var(--border) 0.8px, transparent 0.8px)",
                    backgroundSize: "16px 16px",
                  }}
                />
                <div className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border border-primary/20 bg-brand-soft text-brand-ink">
                  ✳
                </div>
                <div className="absolute left-[22%] top-[24%] h-px w-[26%] rotate-12 bg-primary/40" />
                <div className="absolute left-[55%] top-[27%] h-px w-[22%] -rotate-12 bg-sage-ink/40" />
                <div className="absolute left-[24%] top-[74%] h-px w-[25%] -rotate-12 bg-coral-ink/40" />
                <span className="absolute left-[9%] top-[16%] rounded-md border border-border bg-card px-2 py-1 text-[10px]">
                  Focus
                </span>
                <span className="absolute right-[8%] top-[17%] rounded-md border border-border bg-card px-2 py-1 text-[10px]">
                  Rituals
                </span>
                <span className="absolute bottom-[12%] left-[10%] rounded-md border border-border bg-card px-2 py-1 text-[10px]">
                  Space
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{map.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {map.nodes.length} ideas · {map.updated}
                  </span>
                </div>
                <Star
                  className={`size-4 shrink-0 ${map.starred ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="py-16 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <h2 className="font-medium">{title}</h2>
      <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
        <Plus />
        {action}
      </Button>
    </div>
  );
}
