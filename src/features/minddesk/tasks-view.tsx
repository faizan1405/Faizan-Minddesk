"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, ChevronRight, Circle, Clock3, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeskData } from "./store";
import type { TaskItem } from "./types";

type TaskFilter = "Today" | "Starred" | "Upcoming" | "Completed";

export function TasksView({ filter: initialFilter = "Today", initialTaskId }: { filter?: TaskFilter; initialTaskId?: string } = {}) {
  const { data, update, selectedItem, setSelectedItem } = useDeskData();
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState<string | null>(initialTaskId ?? selectedItem ?? null);
  const [editing, setEditing] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState("");

  useEffect(() => {
    const targetId = initialTaskId ?? selectedItem;
    if (targetId && data.tasks.some((task) => task.id === targetId)) {
      setExpanded(targetId);
      if (selectedItem === targetId) {
        setSelectedItem(null);
      }
    }
  }, [data.tasks, initialTaskId, selectedItem, setSelectedItem]);

  const tasks = useMemo(() => {
    const matching = data.tasks.filter((task) => {
      if (filter === "Completed") return task.complete;
      if (task.complete) return false;
      if (filter === "Starred") return task.starred;
      if (filter === "Upcoming") return task.due === "Tomorrow" || task.due === "This week";
      return task.due !== "Tomorrow" && task.due !== "This week";
    });
    return matching;
  }, [data.tasks, filter]);

  const addTask = () => {
    const title = draft.trim();
    if (!title) return;
    update((current) => ({
      ...current,
      tasks: [{ id: crypto.randomUUID(), title, note: "", due: "Today", priority: "medium", complete: false, starred: false, projectId: "personal", subtasks: [] }, ...current.tasks],
    }));
    setDraft("");
  };

  const patchTask = (id: string, values: Partial<TaskItem>) => {
    update((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...values } : task) }));
  };

  const moveTask = (taskId: string, direction: -1 | 1) => {
    update((current) => {
      const ordered = [...current.tasks];
      const index = ordered.findIndex((item) => item.id === taskId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return current;
      [ordered[index], ordered[nextIndex]] = [ordered[nextIndex]!, ordered[index]!];
      return { ...current, tasks: ordered };
    });
  };

  const createSubtask = (task: TaskItem) => {
    const title = subtaskDraft.trim();
    if (!title) return;
    patchTask(task.id, { subtasks: [...task.subtasks, { id: crypto.randomUUID(), title, complete: false }] });
    setSubtaskDraft("");
  };

  const heading = filter === "Today" ? "A little progress adds up." : filter === "Completed" ? "Look at all you moved forward." : filter === "Starred" ? "The things you want to keep close." : "A clear view of what’s ahead.";

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> Your time, well spent</div>
          <h1 className="truncate text-3xl font-semibold">{filter === "Today" ? "Today" : filter}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{heading}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4" /> {data.tasks.filter((task) => task.complete).length} done</div>
      </header>

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 sm:w-fit">
        {(["Today", "Starred", "Upcoming", "Completed"] as TaskFilter[]).map((option) => (
          <Button key={option} variant={filter === option ? "secondary" : "ghost"} size="sm" onClick={() => setFilter(option)}>{option}</Button>
        ))}
      </div>

      {filter !== "Completed" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 focus-within:border-ring">
          <Plus className="size-4 shrink-0 text-primary" />
          <input aria-label="Add a task" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Add a task and press Enter…" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTask(); }} />
          {draft.trim() && <Button size="sm" onClick={addTask}>Add task</Button>}
        </div>
      )}

      <div className="minddesk-panel divide-y divide-border overflow-hidden">
        {tasks.length === 0 ? (
          <div className="px-6 py-14 text-center"><div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-sage text-sage-ink"><Check className="size-5" /></div><p className="font-medium">Nothing on this list</p><p className="mt-1 text-sm text-muted-foreground">A little room to think.</p></div>
        ) : tasks.map((task) => {
          const project = data.projects.find((item) => item.id === task.projectId);
          const isExpanded = expanded === task.id;
          return (
            <article key={task.id} draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const draggedId = event.dataTransfer.getData("text/plain"); if (!draggedId || draggedId === task.id) return; update((current) => { const ordered = [...current.tasks]; const fromIndex = ordered.findIndex((item) => item.id === draggedId); const toIndex = ordered.findIndex((item) => item.id === task.id); if (fromIndex < 0 || toIndex < 0) return current; const [moved] = ordered.splice(fromIndex, 1); if (!moved) return current; ordered.splice(toIndex, 0, moved); return { ...current, tasks: ordered }; }); }} className="minddesk-task-row px-4 py-4 sm:px-5" data-done={task.complete}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                <button className="minddesk-task-check mt-0.5 grid size-5 place-items-center" data-done={task.complete} aria-label={task.complete ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={() => patchTask(task.id, { complete: !task.complete })}>{task.complete && <Check className="size-3.5" />}</button>
                <div className="min-w-0">
                  {editing === task.id ? <input autoFocus aria-label="Edit task title" className="w-full border-b border-primary bg-transparent pb-1 text-sm font-medium outline-none" value={task.title} onChange={(event) => patchTask(task.id, { title: event.target.value })} onBlur={() => setEditing(null)} onKeyDown={(event) => { if (event.key === "Enter") setEditing(null); }} /> : <button className="minddesk-task-title block max-w-full truncate text-left text-sm font-medium" onDoubleClick={() => setEditing(task.id)} onClick={() => setExpanded(isExpanded ? null : task.id)}>{task.title}</button>}
                  {task.note && <p className="mt-1 truncate text-xs text-muted-foreground">{task.note}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{task.due}</span>
                    {project && <span className="inline-flex items-center gap-1"><span className={`size-1.5 rounded-full ${project.hue === "mint" ? "bg-sage-ink" : project.hue === "amber" ? "bg-coral-ink" : project.hue === "blue" ? "bg-sky-ink" : "bg-primary"}`} />{project.name}</span>}
                    {task.subtasks.length > 0 && <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setExpanded(isExpanded ? null : task.id)}>{isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}{task.subtasks.filter((subtask) => subtask.complete).length}/{task.subtasks.length} subtasks</button>}
                    <span className={`rounded px-1.5 py-0.5 capitalize ${task.priority === "high" ? "bg-coral text-coral-ink" : task.priority === "medium" ? "bg-sky text-sky-ink" : "bg-muted text-muted-foreground"}`}>{task.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" aria-label="Move task up" title="Move task up" onClick={() => moveTask(task.id, -1)}><ArrowUp className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Move task down" title="Move task down" onClick={() => moveTask(task.id, 1)}><ArrowDown className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={task.starred ? "Remove from starred" : "Add to starred"} onClick={() => patchTask(task.id, { starred: !task.starred })}><Star className={`size-4 ${task.starred ? "fill-primary text-primary" : "text-muted-foreground"}`} /></Button>
                  <Button variant="ghost" size="icon" aria-label="Show task details" onClick={() => setExpanded(isExpanded ? null : task.id)}><ChevronDown className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} /></Button>
                </div>
              </div>
              {isExpanded && <div className="ml-8 mt-4 space-y-3 border-l border-border pl-4">
                <textarea aria-label="Task note" className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Add a note…" value={task.note} onChange={(event) => patchTask(task.id, { note: event.target.value })} rows={2} />
                <div className="flex items-center gap-2"><label className="text-xs text-muted-foreground" htmlFor={`priority-${task.id}`}>Priority</label><select id={`priority-${task.id}`} className="rounded-md border border-input bg-background px-2 py-1 text-xs" value={task.priority} onChange={(event) => patchTask(task.id, { priority: event.target.value as TaskItem["priority"] })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><label className="ml-2 text-xs text-muted-foreground" htmlFor={`due-${task.id}`}>Due</label><input id={`due-${task.id}`} className="w-28 rounded-md border border-input bg-background px-2 py-1 text-xs" value={task.due} onChange={(event) => patchTask(task.id, { due: event.target.value })} /></div>
                {task.subtasks.map((subtask) => <div key={subtask.id} className="flex items-center gap-2"><button aria-label={subtask.complete ? "Reopen subtask" : "Complete subtask"} className="grid size-4 place-items-center rounded border border-border" onClick={() => patchTask(task.id, { subtasks: task.subtasks.map((item) => item.id === subtask.id ? { ...item, complete: !item.complete } : item) })}>{subtask.complete && <Check className="size-3" />}</button><span className={`text-xs ${subtask.complete ? "text-muted-foreground line-through" : ""}`}>{subtask.title}</span></div>)}
                <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); createSubtask(task); }}><Circle className="size-3.5 text-muted-foreground" /><input aria-label="Add subtask" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" placeholder="Add a subtask…" value={subtaskDraft} onChange={(event) => setSubtaskDraft(event.target.value)} /><Button type="submit" variant="ghost" size="sm">Add</Button></form>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => update((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))}><Trash2 className="size-3.5" /> Delete task</Button>
              </div>}
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setFilter("Upcoming")}><ArrowDown className="size-3.5" /> Plan ahead</Button></div>
    </section>
  );
}
