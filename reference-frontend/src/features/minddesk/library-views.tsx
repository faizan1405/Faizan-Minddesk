import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, FileText, FolderOpen, Plus, Search, Star, X } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { useDeskData } from "./store";
import { MindMapCanvas } from "./mind-map-canvas";
import type { MindMapItem, NoteItem, ProjectItem } from "./types";

export function NotesView({ favoriteOnly = false, initialNoteId }: { favoriteOnly?: boolean; initialNoteId?: string }) {
  const { data, update } = useDeskData();
  const [query, setQuery] = useState("");
  const [openNote, setOpenNote] = useState<string | null>(initialNoteId ?? null);
  const notes = useMemo(() => data.notes.filter((note) => (!favoriteOnly || note.starred) && `${note.title} ${note.excerpt}`.toLowerCase().includes(query.toLowerCase())), [data.notes, favoriteOnly, query]);

  const createNote = () => {
    const id = crypto.randomUUID();
    const note: NoteItem = { id, title: "Untitled note", excerpt: "A new place to put a thought.", content: "Untitled note\n\nStart writing…", icon: "✎", updated: "Just now", projectId: data.projects[0]?.id ?? "personal", starred: false };
    update((current) => ({ ...current, notes: [note, ...current.notes] }));
    setOpenNote(id);
  };

  if (openNote) {
    const note = data.notes.find((item) => item.id === openNote);
    if (note) return <NoteEditor note={note} onBack={() => setOpenNote(null)} onUpdate={(changes) => update((current) => ({ ...current, notes: current.notes.map((item) => item.id === note.id ? { ...item, ...changes, updated: "Just now" } : item) }))} />;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Keep the useful bits</div><h1 className="truncate text-3xl font-semibold">{favoriteOnly ? "Favorites" : "Notes"}</h1><p className="mt-2 text-sm text-muted-foreground">Thoughts, references, and room to explore.</p></div>
        <Button onClick={createNote}><Plus /> New note</Button>
      </header>
      <div className="mb-5 flex max-w-md items-center gap-2 rounded-lg border border-input bg-card px-3"><Search className="size-4 text-muted-foreground" /><input aria-label="Search notes" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Find a note…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      {notes.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{notes.map((note) => {
        const project = data.projects.find((item) => item.id === note.projectId);
        return <article key={note.id} className="minddesk-panel group flex min-h-48 flex-col p-5 transition-colors hover:border-ring/50"><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-lg">{note.icon}</span><Button variant="ghost" size="icon" aria-label={note.starred ? "Remove note from favorites" : "Add note to favorites"} onClick={() => update((current) => ({ ...current, notes: current.notes.map((item) => item.id === note.id ? { ...item, starred: !item.starred } : item) }))}><Star className={`size-4 ${note.starred ? "fill-primary text-primary" : "text-muted-foreground"}`} /></Button></div><button onClick={() => setOpenNote(note.id)} className="text-left text-base font-semibold hover:text-primary">{note.title}</button><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{note.excerpt}</p><div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><FolderOpen className="size-3.5" />{project?.name ?? "Personal"}</span><span>{note.updated}</span></div></article>;
      })}</div> : <EmptyState icon={<FileText className="size-5" />} title="No notes here yet" action="Write a note" onAction={createNote} />}
    </section>
  );
}

function NoteEditor({ note, onBack, onUpdate }: { note: NoteItem; onBack: () => void; onUpdate: (changes: Partial<NoteItem>) => void }) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const editor = useEditor({
    extensions: [StarterKit],
    content: `<p>${note.content.split("\n").map(escapeHtml).join("</p><p>")}</p>`,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onUpdate({ content: current.getHTML(), excerpt: current.getText().replace(/\n/g, " ").slice(0, 110) });
      const beforeCursor = current.state.doc.textBetween(Math.max(0, current.state.selection.from - 32), current.state.selection.from, "\n");
      const match = beforeCursor.match(/\/([\w-]*)$/);
      setSlashQuery(match?.[1] ?? "");
      setSlashOpen(Boolean(match));
      setSlashIndex(0);
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (!slashOpen) return false;
        const options = slashCommands.filter((command) => command.label.toLowerCase().includes(slashQuery.toLowerCase()));
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setSlashIndex((current) => (current + (event.key === "ArrowDown" ? 1 : options.length - 1)) % Math.max(1, options.length));
          return true;
        }
        if (event.key === "Escape") { setSlashOpen(false); return true; }
        if (event.key === "Enter" && options.length) { event.preventDefault(); runSlashCommand(options[slashIndex] ?? options[0]); return true; }
        return false;
      },
    },
  });
  useEffect(() => {
    if (editor && note.content.startsWith("<") && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
  }, [editor, note.content]);

  const tools = [
    { label: "Bold", run: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold"), text: <strong>B</strong> },
    { label: "Italic", run: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic"), text: <em>I</em> },
    { label: "Heading 1", run: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive("heading", { level: 1 }), text: "H1" },
    { label: "Heading 2", run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }), text: "H2" },
    { label: "Bullet list", run: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList"), text: "• List" },
    { label: "Numbered list", run: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList"), text: "1. List" },
    { label: "Quote", run: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive("blockquote"), text: "Quote" },
    { label: "Code", run: () => editor?.chain().focus().toggleCodeBlock().run(), active: editor?.isActive("codeBlock"), text: "Code" },
  ];
  const slashCommands = [
    { label: "Heading 1", hint: "Large section title", run: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", hint: "Section title", run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Bullet list", hint: "Unordered list", run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", hint: "Ordered list", run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "Quote", hint: "A thought worth keeping", run: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: "Code block", hint: "Monospaced text", run: () => editor?.chain().focus().toggleCodeBlock().run() },
  ];
  const runSlashCommand = (command: (typeof slashCommands)[number] | undefined) => {
    if (!editor || !command) return;
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: Math.max(1, from - slashQuery.length - 1), to: from }).run();
    command.run();
    setSlashOpen(false);
  };
  return <section className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-4xl px-5 pb-24 pt-6 sm:px-10 sm:pt-9">
    <div className="mb-7 flex items-center justify-between gap-3"><Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft /> All notes</Button><span className="text-xs text-muted-foreground">Saved in this browser · {note.updated}</span></div>
    <div className="mx-auto max-w-3xl"><div className="mb-6 text-4xl">{note.icon}</div><input aria-label="Note title" className="mb-5 w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-muted-foreground sm:text-4xl" value={note.title} onChange={(event) => onUpdate({ title: event.target.value })} />
      <div className="mb-5 flex flex-wrap items-center gap-1 border-y border-border py-2">{tools.map((tool) => <Button key={tool.label} type="button" aria-label={tool.label} title={tool.label} variant={tool.active ? "secondary" : "ghost"} size="sm" onClick={() => tool.run()}>{tool.text}</Button>)}<Button type="button" variant="ghost" size="sm" onClick={() => editor?.chain().focus().undo().run()}>Undo</Button><Button type="button" variant="ghost" size="sm" onClick={() => editor?.chain().focus().redo().run()}>Redo</Button><span className="ml-auto text-xs text-muted-foreground">Type / for blocks</span></div>
      <div className="relative"><EditorContent editor={editor} className="minddesk-note-editor min-h-[55vh] text-base leading-8" />{slashOpen && <div role="listbox" aria-label="Insert block" className="absolute left-3 top-3 z-10 w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">{slashCommands.filter((command) => command.label.toLowerCase().includes(slashQuery.toLowerCase())).map((command, index) => <button key={command.label} role="option" aria-selected={slashIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => runSlashCommand(command)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${slashIndex === index ? "bg-accent" : "hover:bg-accent/60"}`}><span className="text-sm font-medium">{command.label}</span><span className="text-[11px] text-muted-foreground">{command.hint}</span></button>)}</div>}</div>
    </div>
  </section>;
}

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function ProjectsView({ initialProjectId }: { initialProjectId?: string } = {}) {
  const { data, update } = useDeskData();
  const [activeId, setActiveId] = useState<string | null>(initialProjectId ?? null);
  const [query, setQuery] = useState("");
  const activeProject = data.projects.find((project) => project.id === activeId);

  const createProject = () => {
    const id = crypto.randomUUID();
    const project: ProjectItem = { id, name: "New project", description: "A fresh space for related work.", icon: "✳", hue: "violet" };
    update((current) => ({ ...current, projects: [project, ...current.projects] }));
    setActiveId(id);
  };

  if (activeProject) {
    const tasks = data.tasks.filter((task) => task.projectId === activeProject.id);
    const notes = data.notes.filter((note) => note.projectId === activeProject.id);
    return <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10"><Button variant="ghost" size="sm" className="mb-6" onClick={() => setActiveId(null)}><ChevronLeft /> Projects</Button><header className="mb-8 flex items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl text-brand-ink">{activeProject.icon}</span><div className="min-w-0 flex-1"><input aria-label="Project name" className="w-full bg-transparent text-3xl font-semibold outline-none" value={activeProject.name} onChange={(event) => update((current) => ({ ...current, projects: current.projects.map((project) => project.id === activeProject.id ? { ...project, name: event.target.value } : project) }))} /><input aria-label="Project description" className="mt-2 w-full bg-transparent text-sm text-muted-foreground outline-none" value={activeProject.description} onChange={(event) => update((current) => ({ ...current, projects: current.projects.map((project) => project.id === activeProject.id ? { ...project, description: event.target.value } : project) }))} /></div></header><div className="grid gap-6 lg:grid-cols-2"><div><h2 className="mb-3 text-sm font-semibold">Tasks <span className="ml-1 text-muted-foreground">{tasks.length}</span></h2><div className="minddesk-panel divide-y divide-border">{tasks.length ? tasks.map((task) => <div key={task.id} className="flex items-center gap-3 px-4 py-3"><button aria-label={task.complete ? "Reopen task" : "Complete task"} className="minddesk-task-check grid size-5 place-items-center" data-done={task.complete} onClick={() => update((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, complete: !item.complete } : item) }))}>{task.complete && <span>✓</span>}</button><span className="text-sm">{task.title}</span></div>) : <p className="p-4 text-sm text-muted-foreground">No tasks connected yet.</p>}</div></div><div><h2 className="mb-3 text-sm font-semibold">Notes <span className="ml-1 text-muted-foreground">{notes.length}</span></h2><div className="minddesk-panel divide-y divide-border">{notes.length ? notes.map((note) => <div key={note.id} className="flex items-center gap-3 px-4 py-3"><span>{note.icon}</span><span className="text-sm">{note.title}</span></div>) : <p className="p-4 text-sm text-muted-foreground">No notes connected yet.</p>}</div></div></div></section>;
  }

  const projects = data.projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10"><header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between"><div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><FolderOpen className="size-4" /> Everything has a place</div><h1 className="truncate text-3xl font-semibold">Projects</h1><p className="mt-2 text-sm text-muted-foreground">A few connected threads, gathered together.</p></div><Button onClick={createProject}><Plus /> New project</Button></header><div className="mb-5 flex max-w-md items-center gap-2 rounded-lg border border-input bg-card px-3"><Search className="size-4 text-muted-foreground" /><input aria-label="Search projects" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Find a project…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{projects.map((project) => { const taskCount = data.tasks.filter((task) => task.projectId === project.id && !task.complete).length; const noteCount = data.notes.filter((note) => note.projectId === project.id).length; return <button key={project.id} onClick={() => setActiveId(project.id)} className="minddesk-panel group min-h-48 p-5 text-left transition-colors hover:border-ring/50"><span className={`mb-5 grid size-10 place-items-center rounded-xl text-lg ${project.hue === "mint" ? "bg-sage text-sage-ink" : project.hue === "amber" ? "bg-coral text-coral-ink" : project.hue === "blue" ? "bg-sky text-sky-ink" : "bg-brand-soft text-brand-ink"}`}>{project.icon}</span><span className="block text-base font-semibold">{project.name}</span><span className="mt-2 block text-sm leading-6 text-muted-foreground">{project.description}</span><span className="mt-5 flex gap-4 text-xs text-muted-foreground"><span>{taskCount} open tasks</span><span>{noteCount} notes</span></span></button>; })}</div></section>;
}

export function MapsView({ favoriteOnly = false, initialMapId }: { favoriteOnly?: boolean; initialMapId?: string } = {}) {
  const { data, update } = useDeskData();
  const [mapId, setMapId] = useState<string | null>(initialMapId ?? null);
  const [query, setQuery] = useState("");
  const activeMap = data.maps.find((item) => item.id === mapId);
  const createMap = () => {
    const id = crypto.randomUUID();
    const map: MindMapItem = { id, title: "Untitled mind map", updated: "Just now", starred: false, nodes: [{ id: "root", position: { x: 250, y: 150 }, data: { label: "A new thought", color: "violet" }, type: "mind" }, { id: "idea", position: { x: 570, y: 150 }, data: { label: "Add an idea", color: "blue" }, type: "mind" }], edges: [{ id: "root-idea", source: "root", target: "idea" }] };
    update((current) => ({ ...current, maps: [map, ...current.maps] }));
    setMapId(id);
  };
  if (activeMap) return <section className="mx-auto w-full max-w-[1500px] px-4 pb-8 pt-5 sm:px-7"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setMapId(null)}><ChevronLeft /> Maps</Button><input aria-label="Mind map title" className="min-w-0 bg-transparent text-lg font-semibold outline-none" value={activeMap.title} onChange={(event) => update((current) => ({ ...current, maps: current.maps.map((item) => item.id === activeMap.id ? { ...item, title: event.target.value } : item) }))} /></div><Button variant="ghost" size="icon" aria-label={activeMap.starred ? "Remove map from favorites" : "Add map to favorites"} onClick={() => update((current) => ({ ...current, maps: current.maps.map((item) => item.id === activeMap.id ? { ...item, starred: !item.starred } : item) }))}><Star className={`size-4 ${activeMap.starred ? "fill-primary text-primary" : ""}`} /></Button></div><MindMapCanvas nodes={activeMap.nodes} edges={activeMap.edges} theme={activeMap.theme ?? "calm"} layout={activeMap.layout ?? "freeform"} onThemeChange={(theme) => update((current) => ({ ...current, maps: current.maps.map((item) => item.id === activeMap.id ? { ...item, theme } : item) }))} onLayoutChange={(layout) => update((current) => ({ ...current, maps: current.maps.map((item) => item.id === activeMap.id ? { ...item, layout } : item) }))} onSave={(nodes, edges) => update((current) => ({ ...current, maps: current.maps.map((item) => item.id === activeMap.id ? { ...item, nodes, edges, updated: "Just now" } : item) }))} /></section>;
  const maps = data.maps.filter((item) => (!favoriteOnly || item.starred) && item.title.toLowerCase().includes(query.toLowerCase()));
  return <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10"><header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between"><div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><span className="text-base">⌘</span> Give your ideas room to connect</div><h1 className="truncate text-3xl font-semibold">Mind maps</h1><p className="mt-2 text-sm text-muted-foreground">See the bigger picture, one branch at a time.</p></div><Button onClick={createMap}><Plus /> New mind map</Button></header><div className="mb-5 flex max-w-md items-center gap-2 rounded-lg border border-input bg-card px-3"><Search className="size-4 text-muted-foreground" /><input aria-label="Search mind maps" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Find a map…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{maps.map((map) => <button key={map.id} className="minddesk-panel group text-left transition-colors hover:border-ring/50" onClick={() => setMapId(map.id)}><div className="relative h-40 overflow-hidden rounded-t-xl border-b border-border bg-background"><div className="absolute inset-0 opacity-65" style={{ backgroundImage: "radial-gradient(var(--border) 0.8px, transparent 0.8px)", backgroundSize: "16px 16px" }} /><div className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border border-primary/20 bg-brand-soft text-brand-ink">✳</div><div className="absolute left-[22%] top-[24%] h-px w-[26%] rotate-12 bg-primary/40" /><div className="absolute left-[55%] top-[27%] h-px w-[22%] -rotate-12 bg-sage-ink/40" /><div className="absolute left-[24%] top-[74%] h-px w-[25%] -rotate-12 bg-coral-ink/40" /><span className="absolute left-[9%] top-[16%] rounded-md border border-border bg-card px-2 py-1 text-[10px]">Focus</span><span className="absolute right-[8%] top-[17%] rounded-md border border-border bg-card px-2 py-1 text-[10px]">Rituals</span><span className="absolute bottom-[12%] left-[10%] rounded-md border border-border bg-card px-2 py-1 text-[10px]">Space</span></div><div className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><span className="block truncate text-sm font-semibold">{map.title}</span><span className="mt-1 block text-xs text-muted-foreground">{map.nodes.length} ideas · {map.updated}</span></div><Star className={`size-4 shrink-0 ${map.starred ? "fill-primary text-primary" : "text-muted-foreground"}`} /></div></button>)}</div></section>;
}

export function EmptyState({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action: string; onAction: () => void }) {
  return <div className="py-16 text-center"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</span><h2 className="font-medium">{title}</h2><Button variant="outline" size="sm" className="mt-4" onClick={onAction}><Plus />{action}</Button></div>;
}