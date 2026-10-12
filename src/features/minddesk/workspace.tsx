"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Command,
  FileText,
  Focus,
  Home,
  LayoutGrid,
  ListTodo,
  LogOut,
  Map,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  Sun,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/stores/ui-store";
import { MindDeskProvider, useDeskData } from "./store";
import { MapsView, NotesView, ProjectsView } from "./library-views";
import { TasksView } from "./tasks-view";
import { workspaceRoutes, workspaceTitles, type WorkspaceView } from "./workspace-types";
import type { TaskItem } from "./types";

export const mainLinks: { id: WorkspaceView; label: string; href: string; icon: typeof Home }[] = [
  { id: "home", label: "Your desk", href: "/dashboard", icon: Home },
  { id: "tasks", label: "My tasks", href: "/tasks", icon: ListTodo },
  { id: "notes", label: "Notes", href: "/notes", icon: FileText },
  { id: "maps", label: "Mind maps", href: "/mind-maps", icon: Map },
  { id: "projects", label: "Projects", href: "/projects", icon: LayoutGrid },
];

export function MindDeskWorkspace({ initialView = "home" }: { initialView?: WorkspaceView } = {}) {
  return (
    <MindDeskProvider>
      <Workspace initialView={initialView} />
    </MindDeskProvider>
  );
}

function Workspace({ initialView }: { initialView: WorkspaceView }) {
  const { data, update, selectedItem, setSelectedItem } = useDeskData();
  const [view, setView] = useState<WorkspaceView>(initialView);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickType, setQuickType] = useState<"task" | "note" | "map">("task");
  const [quickDraft, setQuickDraft] = useState("");
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"profile" | "sign-in" | "sign-up" | "forgot">("profile");
  const [accountMessage, setAccountMessage] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setQuickOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setQuickOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const searchItems = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    return [
      ...data.tasks
        .filter((item) => item.title.toLowerCase().includes(text))
        .map((item) => ({ id: item.id, label: item.title, kind: "Task", view: "tasks" as WorkspaceView })),
      ...data.notes
        .filter((item) => item.title.toLowerCase().includes(text))
        .map((item) => ({ id: item.id, label: item.title, kind: "Note", view: "notes" as WorkspaceView })),
      ...data.maps
        .filter((item) => item.title.toLowerCase().includes(text))
        .map((item) => ({ id: item.id, label: item.title, kind: "Mind map", view: "maps" as WorkspaceView })),
      ...data.projects
        .filter((item) => item.name.toLowerCase().includes(text))
        .map((item) => ({ id: item.id, label: item.name, kind: "Project", view: "projects" as WorkspaceView })),
    ].slice(0, 8);
  }, [data.maps, data.notes, data.projects, data.tasks, query]);

  const createQuick = () => {
    const title = quickDraft.trim();
    if (!title) return;
    if (quickType === "task") {
      const task: TaskItem = {
        id: crypto.randomUUID(),
        title,
        note: "",
        due: "Today",
        priority: "medium",
        complete: false,
        starred: false,
        projectId: "personal",
        subtasks: [],
      };
      update((current) => ({ ...current, tasks: [task, ...current.tasks] }));
      setView("tasks");
    } else if (quickType === "note") {
      const id = crypto.randomUUID();
      update((current) => ({
        ...current,
        notes: [
          {
            id,
            title,
            excerpt: "A new note, ready to unfold.",
            content: `${title}\n\n`,
            icon: "✎",
            updated: "Just now",
            projectId: "personal",
            starred: false,
          },
          ...current.notes,
        ],
      }));
      setView("notes");
    } else {
      const id = crypto.randomUUID();
      update((current) => ({
        ...current,
        maps: [
          {
            id,
            title,
            updated: "Just now",
            starred: false,
            nodes: [
              { id: "root", position: { x: 250, y: 180 }, data: { label: title, color: "violet" }, type: "mind" },
              { id: "idea", position: { x: 560, y: 180 }, data: { label: "Add an idea", color: "mint" }, type: "mind" },
            ],
            edges: [{ id: "root-idea", source: "root", target: "idea" }],
          },
          ...current.maps,
        ],
      }));
      setView("maps");
    }
    setQuickDraft("");
    setQuickOpen(false);
  };

  const navigate = (target: WorkspaceView, itemId?: string) => {
    setView(target);
    setSelectedItem(itemId ?? null);
    setMobileMenu(false);
  };

  return (
    <main className="minddesk-shell flex bg-background text-foreground">
      {mobileMenu && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-foreground/25 md:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border px-5">
          <div className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Focus className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tracking-tight">Mind Desk</span>
            <span className="text-[11px] text-muted-foreground">A little more in focus</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Close navigation" onClick={() => setMobileMenu(false)}>
            <X />
          </Button>
        </div>

        <div className="px-4 pt-5">
          <Button className="w-full justify-start" onClick={() => setQuickOpen(true)}>
            <Plus /> Quick capture <span className="ml-auto text-xs opacity-75">⌘ J</span>
          </Button>
        </div>
        <nav aria-label="Main navigation" className="minddesk-scrollbar flex-1 overflow-y-auto px-3 pt-6">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
          <div className="space-y-1">
            {mainLinks.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${view === id ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                {id === "tasks" && (
                  <span className="text-xs text-muted-foreground">{data.tasks.filter((task) => !task.complete).length}</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-8 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your space</p>
          <div className="space-y-1">
            <button
              onClick={() => navigate("favorites")}
              className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${view === "favorites" ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`}
            >
              <Star className="size-4" />
              <span>Favorites</span>
            </button>
            <button
              onClick={() => navigate("recent")}
              className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${view === "recent" ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`}
            >
              <CalendarDays className="size-4" />
              <span>Recent</span>
            </button>
            <button
              onClick={() => navigate("settings")}
              className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${view === "settings" ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`}
            >
              <Settings2 className="size-4" />
              <span>Settings</span>
            </button>
          </div>
          <div className="mt-8 flex items-center justify-between px-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
            <Button variant="ghost" size="icon" className="size-7" aria-label="Create project" onClick={() => navigate("projects")}>
              <Plus className="size-3.5" />
            </Button>
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent/60"
            onClick={() => setProfileOpen(true)}
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
              F
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">Faizan</span>
              <span className="block truncate text-[10px] text-muted-foreground">Personal workspace</span>
            </div>
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[64px] shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-7">
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label="Open navigation" onClick={() => setMobileMenu(true)}>
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{workspaceTitles[view]}</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden min-w-0 justify-start gap-2 text-muted-foreground sm:flex sm:w-56"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
            <span className="min-w-0 flex-1 truncate text-left">Search anything…</span>
            <span className="rounded border border-border px-1 text-[10px]">⌘ K</span>
          </Button>
          <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle light or dark theme"
            title="Toggle appearance"
            onClick={() => update((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))}
          >
            {data.theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Quick capture" title="Quick capture" onClick={() => setQuickOpen(true)}>
            <Plus />
          </Button>
        </header>

        <div className="minddesk-scrollbar flex-1 overflow-y-auto pb-16 md:pb-0">
          {view === "home" ? (
            <DashboardView navigate={navigate} onQuick={() => setQuickOpen(true)} />
          ) : view === "tasks" ? (
            <TasksView {...(selectedItem ? { initialTaskId: selectedItem } : {})} />
          ) : view === "notes" ? (
            <NotesView {...(selectedItem ? { initialNoteId: selectedItem } : {})} />
          ) : view === "maps" ? (
            <MapsView {...(selectedItem ? { initialMapId: selectedItem } : {})} />
          ) : view === "projects" ? (
            <ProjectsView {...(selectedItem ? { initialProjectId: selectedItem } : {})} />
          ) : view === "favorites" ? (
            <FavoritesView navigate={navigate} />
          ) : view === "recent" ? (
            <RecentView navigate={navigate} />
          ) : (
            <SettingsView
              theme={data.theme}
              onTheme={() => update((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))}
              onProfile={() => setProfileOpen(true)}
            />
          )}
        </div>
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden"
        >
          {mainLinks.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              aria-current={view === id ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] ${view === id ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate">{label === "Your desk" ? "Home" : label}</span>
            </button>
          ))}
        </nav>
      </div>

      <Dialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) setQuery("");
        }}
      >
        <DialogContent className="top-[20%] max-w-xl translate-y-0 p-0">
          <DialogTitle className="sr-only">Search your workspace</DialogTitle>
          <DialogDescription className="sr-only">Search tasks, notes, mind maps, and projects.</DialogDescription>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              aria-label="Search your workspace"
              className="h-14 border-0 px-0 shadow-none focus-visible:ring-0"
              placeholder="Search tasks, notes, projects…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</span>
          </div>
          <div className="minddesk-scrollbar max-h-80 overflow-y-auto p-2">
            {query.trim() ? (
              searchItems.length ? (
                searchItems.map((item) => (
                  <button
                    key={`${item.kind}-${item.id}`}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-accent"
                    onClick={() => {
                      navigate(item.view, item.id);
                      setSearchOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-muted">
                      <Search className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.kind}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing found. Try another search.</p>
              )
            ) : (
              <div className="p-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">Jump to</p>
                <div className="grid grid-cols-2 gap-2">
                  {mainLinks.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        navigate(id);
                        setSearchOpen(false);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-accent"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <Command className="size-3" /> Search across your workspace
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture a thought</DialogTitle>
            <DialogDescription>Put it somewhere you can find it again.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {(["task", "note", "map"] as const).map((kind) => (
              <Button key={kind} variant={quickType === kind ? "secondary" : "outline"} onClick={() => setQuickType(kind)}>
                {kind === "task" ? <ListTodo /> : kind === "note" ? <FileText /> : <Map />}
                {kind === "task" ? "Task" : kind === "note" ? "Note" : "Mind map"}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              createQuick();
            }}
          >
            <Input
              autoFocus
              aria-label={`${quickType} title`}
              placeholder={
                quickType === "task"
                  ? "What needs doing?"
                  : quickType === "note"
                    ? "Give this note a name…"
                    : "What are you exploring?"
              }
              value={quickDraft}
              onChange={(event) => setQuickDraft(event.target.value)}
            />
            <Button type="submit" disabled={!quickDraft.trim()}>
              <Plus /> Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={profileOpen}
        onOpenChange={(open) => {
          setProfileOpen(open);
          if (!open) {
            setAccountMessage("");
            setAccountMode("profile");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {accountMode === "sign-in"
                ? "Welcome back"
                : accountMode === "sign-up"
                  ? "Create your space"
                  : accountMode === "forgot"
                    ? "Reset your password"
                    : "Personal workspace"}
            </DialogTitle>
            <DialogDescription>
              {accountMode === "profile"
                ? "Manage your Mind Desk account or navigate to authentication."
                : "Preview only — use the dedicated authentication pages for live Better Auth sessions."}
            </DialogDescription>
          </DialogHeader>
          {accountMode === "profile" ? (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="grid size-10 place-items-center rounded-full bg-brand-soft font-semibold text-brand-ink">
                  F
                </div>
                <div>
                  <p className="text-sm font-medium">Faizan</p>
                  <p className="text-xs text-muted-foreground">Mind Desk workspace</p>
                </div>
              </div>
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/signup">Create account</Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setAccountMessage("No active database session in local preview mode.")}
                >
                  <LogOut /> Sign out
                </Button>
              </div>
              {accountMessage && (
                <p role="status" className="text-xs text-muted-foreground">
                  {accountMessage}
                </p>
              )}
            </>
          ) : (
            <AccountPreview mode={accountMode} onMode={setAccountMode} onMessage={setAccountMessage} message={accountMessage} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

export function DashboardView({
  navigate: navigateProp,
  onQuick: onQuickProp,
}: {
  navigate?: (view: WorkspaceView, itemId?: string) => void;
  onQuick?: () => void;
} = {}) {
  const router = useRouter();
  const { data, update, setSelectedItem } = useDeskData();
  const setQuickCaptureOpen = useUIStore((state) => state.setQuickCaptureOpen);

  const navigate = (view: WorkspaceView, itemId?: string) => {
    if (navigateProp) {
      navigateProp(view, itemId);
      return;
    }
    setSelectedItem(itemId ?? null);
    router.push(workspaceRoutes[view]);
  };

  const onQuick = () => {
    if (onQuickProp) {
      onQuickProp();
      return;
    }
    setQuickCaptureOpen(true);
  };

  const openTasks = data.tasks.filter((task) => !task.complete);
  const todayTasks = openTasks.filter((task) => task.due !== "Tomorrow" && task.due !== "This week");
  const completed = data.tasks.filter((task) => task.complete).length;
  const hello =
    new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pt-11">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" /> A new page, a little more room
          </div>
          <h1 className="truncate text-3xl font-semibold tracking-tight sm:text-[34px]">{hello}, Faizan.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Let’s turn today’s ideas into progress.</p>
        </div>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <CalendarDays className="size-4" />
          {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your day</p>
              <h2 className="mt-1 text-xl font-semibold">
                Today’s focus <span className="ml-1 text-sm font-normal text-muted-foreground">{todayTasks.length}</span>
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("tasks")}>
              All tasks <ChevronRight />
            </Button>
          </div>
          <div className="minddesk-panel divide-y divide-border overflow-hidden">
            {todayTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="minddesk-task-row flex items-start gap-3 px-4 py-4 sm:px-5"
                data-done={task.complete}
              >
                <button
                  aria-label={`Complete ${task.title}`}
                  className="minddesk-task-check mt-0.5 grid size-5 shrink-0 place-items-center"
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
                  {task.complete && <Check className="size-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="minddesk-task-title truncate text-sm font-medium">{task.title}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.due}</span>
                    <span aria-hidden="true">·</span>
                    <span>{data.projects.find((project) => project.id === task.projectId)?.name}</span>
                  </div>
                </div>
                {task.starred && <Star className="mt-0.5 size-4 shrink-0 fill-primary text-primary" />}
              </div>
            ))}
            {todayTasks.length === 0 && (
              <p className="px-5 py-9 text-center text-sm text-muted-foreground">A clear day. Keep it that way.</p>
            )}
            <button
              className="flex w-full items-center gap-2 px-5 py-3 text-sm text-primary hover:bg-accent/60"
              onClick={onQuick}
            >
              <Plus className="size-4" /> Add a task
            </button>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">A gentle overview</p>
            <h2 className="mt-1 text-xl font-semibold">In good shape</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="minddesk-panel p-4 text-left transition-colors hover:border-ring/50"
              onClick={() => navigate("tasks")}
            >
              <span className="grid size-8 place-items-center rounded-lg bg-sage text-sage-ink">
                <Check className="size-4" />
              </span>
              <span className="mt-4 block text-2xl font-semibold">{completed}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Tasks completed</span>
            </button>
            <button
              className="minddesk-panel p-4 text-left transition-colors hover:border-ring/50"
              onClick={() => navigate("projects")}
            >
              <span className="grid size-8 place-items-center rounded-lg bg-sky text-sky-ink">
                <LayoutGrid className="size-4" />
              </span>
              <span className="mt-4 block text-2xl font-semibold">{data.projects.length}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Open projects</span>
            </button>
          </div>
          <button
            className="minddesk-panel mt-3 flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-ring/50"
            onClick={() => navigate("tasks")}
          >
            <div className="grid size-9 place-items-center rounded-lg bg-coral text-coral-ink">
              <Clock3Icon />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Coming up</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {openTasks.filter((task) => task.due === "Tomorrow" || task.due === "This week").length
                  ? `${openTasks.filter((task) => task.due === "Tomorrow" || task.due === "This week").length} tasks later this week`
                  : "A little breathing room"}
              </span>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground" />
          </button>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keep the thread</p>
              <h2 className="mt-1 text-xl font-semibold">Recently opened</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("notes")}>
              All notes <ChevronRight />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.notes.slice(0, 2).map((note) => (
              <button
                key={note.id}
                className="minddesk-panel min-h-40 p-4 text-left transition-colors hover:border-ring/50"
                onClick={() => navigate("notes", note.id)}
              >
                <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-lg">{note.icon}</span>
                <span className="mt-3 block truncate text-sm font-semibold">{note.title}</span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{note.excerpt}</span>
                <span className="mt-3 block text-[11px] text-muted-foreground">{note.updated}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start somewhere</p>
            <h2 className="mt-1 text-xl font-semibold">A small next step</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Task", icon: ListTodo },
              { label: "Note", icon: BookOpen },
              { label: "Mind map", icon: Map },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="minddesk-panel flex min-h-[92px] flex-col items-center justify-center gap-2 p-3 text-xs font-medium transition-colors hover:border-ring/50 hover:bg-accent/30"
                onClick={onQuick}
              >
                <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                {label}
              </button>
            ))}
          </div>
          <button
            className="mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-left hover:border-primary/50 hover:bg-accent/30"
            onClick={() => navigate("maps")}
          >
            <div className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand-ink">
              <Map className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{data.maps[0]?.title ?? "Make a mind map"}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Pick up an idea where you left off.</span>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground" />
          </button>
        </section>
      </div>
    </section>
  );
}

export function FavoritesView({
  navigate: navigateProp,
}: {
  navigate?: (view: WorkspaceView, itemId?: string) => void;
} = {}) {
  const router = useRouter();
  const { data, setSelectedItem } = useDeskData();

  const navigate = (view: WorkspaceView, itemId?: string) => {
    if (navigateProp) {
      navigateProp(view, itemId);
      return;
    }
    setSelectedItem(itemId ?? null);
    router.push(workspaceRoutes[view]);
  };

  const starredTasks = data.tasks.filter((task) => task.starred);
  const starredNotes = data.notes.filter((note) => note.starred);
  const starredMaps = data.maps.filter((map) => map.starred);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="size-4" /> The things you want close
        </div>
        <h1 className="text-3xl font-semibold">Favorites</h1>
        <p className="mt-2 text-sm text-muted-foreground">A small collection of things worth coming back to.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-3">
        {[
          {
            title: "Tasks",
            items: starredTasks.map((task) => ({ id: task.id, title: task.title })),
            view: "tasks" as WorkspaceView,
          },
          {
            title: "Notes",
            items: starredNotes.map((note) => ({ id: note.id, title: note.title })),
            view: "notes" as WorkspaceView,
          },
          {
            title: "Mind maps",
            items: starredMaps.map((map) => ({ id: map.id, title: map.title })),
            view: "maps" as WorkspaceView,
          },
        ].map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-sm font-semibold">
              {group.title} <span className="text-muted-foreground">{group.items.length}</span>
            </h2>
            <div className="minddesk-panel divide-y divide-border">
              {group.items.length ? (
                group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(group.view, item.id)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-accent/50"
                  >
                    <Star className="size-3.5 shrink-0 fill-primary text-primary" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <p className="p-4 text-xs text-muted-foreground">Nothing saved here yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function RecentView({
  navigate: navigateProp,
}: {
  navigate?: (view: WorkspaceView, itemId?: string) => void;
} = {}) {
  const router = useRouter();
  const { data, setSelectedItem } = useDeskData();

  const navigate = (view: WorkspaceView, itemId?: string) => {
    if (navigateProp) {
      navigateProp(view, itemId);
      return;
    }
    setSelectedItem(itemId ?? null);
    router.push(workspaceRoutes[view]);
  };

  const records = [
    ...data.notes
      .slice(0, 4)
      .map((note) => ({ id: note.id, title: note.title, detail: note.updated, kind: "Note", icon: FileText, view: "notes" as WorkspaceView })),
    ...data.maps
      .slice(0, 3)
      .map((map) => ({ id: map.id, title: map.title, detail: map.updated, kind: "Mind map", icon: Map, view: "maps" as WorkspaceView })),
    ...data.projects
      .slice(0, 2)
      .map((project) => ({ id: project.id, title: project.name, detail: "Project", kind: "Project", icon: LayoutGrid, view: "projects" as WorkspaceView })),
    ...data.tasks
      .slice(0, 3)
      .map((task) => ({ id: task.id, title: task.title, detail: task.due, kind: "Task", icon: ListTodo, view: "tasks" as WorkspaceView })),
  ].slice(0, 8);

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" /> A thread to pick up again
        </div>
        <h1 className="text-3xl font-semibold">Recent</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your latest notes, ideas, and things to do.</p>
      </header>
      <div className="minddesk-panel divide-y divide-border">
        {records.map((record) => (
          <button
            key={`${record.kind}-${record.id}`}
            onClick={() => navigate(record.view, record.id)}
            className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-accent/40 sm:px-5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <record.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{record.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{record.kind}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{record.detail}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}

function AccountPreview({
  mode,
  onMode,
  onMessage,
  message,
}: {
  mode: "sign-in" | "sign-up" | "forgot";
  onMode: (mode: "sign-in" | "sign-up" | "forgot") => void;
  onMessage: (message: string) => void;
  message: string;
}) {
  const title = mode === "sign-in" ? "Email" : mode === "sign-up" ? "Your name" : "Email";
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onMessage("This account form is a visual prototype; no details were sent or saved.");
      }}
    >
      {mode === "sign-up" && <Input aria-label="Your name" placeholder="Your name" required />}
      <Input aria-label={title} placeholder={mode === "forgot" ? "you@example.com" : "Email address"} type="email" required />
      {mode !== "forgot" && <Input aria-label="Password" placeholder="Password" type="password" required />}
      <Button type="submit" className="w-full">
        {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
      </Button>
      {mode === "sign-in" && (
        <button type="button" className="w-full text-xs text-primary hover:underline" onClick={() => onMode("forgot")}>
          Forgot password?
        </button>
      )}
      <button
        type="button"
        className="w-full text-xs text-muted-foreground hover:text-foreground"
        onClick={() => onMode(mode === "sign-up" ? "sign-in" : "sign-up")}
      >
        {mode === "sign-up" ? "Already have an account? Sign in" : "New to Mind Desk? Create an account"}
      </button>
      {message && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </form>
  );
}

export function MindDeskAccountPage({ mode: initialMode }: { mode: "sign-in" | "sign-up" | "forgot" }) {
  const [mode, setMode] = useState(initialMode);
  const [message, setMessage] = useState("");
  const title = mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Create your space" : "Reset your password";
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-md">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-soft font-semibold text-brand-ink">M</span>
          <span className="text-sm font-semibold">Mind Desk</span>
        </Link>
        <div className="minddesk-panel p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            Preview only — no account is created and nothing is sent.
          </p>
          <AccountPreview
            mode={mode}
            onMode={(next) => {
              setMode(next);
              setMessage("");
            }}
            onMessage={setMessage}
            message={message}
          />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Your thoughts stay on this device in this frontend prototype.
          </p>
        </div>
        <div className="mt-5 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Create account
          </Link>
          <Link href="/forgot-password" className="hover:text-foreground">
            Forgot password
          </Link>
        </div>
      </section>
    </main>
  );
}

export function SettingsView({
  theme: themeProp,
  onTheme: onThemeProp,
  onProfile: onProfileProp,
}: {
  theme?: "light" | "dark";
  onTheme?: () => void;
  onProfile?: () => void;
} = {}) {
  const router = useRouter();
  const { data, update } = useDeskData();
  const activeTheme = themeProp ?? data.theme;

  const handleTheme = () => {
    if (onThemeProp) {
      onThemeProp();
      return;
    }
    update((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }));
  };

  const handleProfile = () => {
    if (onProfileProp) {
      onProfileProp();
      return;
    }
    router.push("/login");
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-5 pb-20 pt-7 sm:px-8 sm:pt-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Settings2 className="size-4" /> Make yourself at home
        </div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">A few ways to make this space yours.</p>
      </header>
      <div className="divide-y divide-border border-y border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5">
          <div>
            <h2 className="text-sm font-medium">Appearance</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose the look that feels right today.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleTheme}>
            {activeTheme === "dark" ? <Sun /> : <Moon />}
            {activeTheme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5">
          <div>
            <h2 className="text-sm font-medium">Local storage</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your demo changes stay in this browser. There is no cloud sync.
            </p>
          </div>
          <span className="rounded-full bg-sage px-2.5 py-1 text-xs text-sage-ink">On this device</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5">
          <div>
            <h2 className="text-sm font-medium">Profile</h2>
            <p className="mt-1 text-xs text-muted-foreground">Presentation-only account controls.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleProfile}>
            Faizan <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5">
          <div>
            <h2 className="text-sm font-medium">Help & feedback</h2>
            <p className="mt-1 text-xs text-muted-foreground">This preview keeps things simple and frontend-only.</p>
          </div>
          <CircleHelp className="size-4 text-muted-foreground" />
        </div>
      </div>
    </section>
  );
}

function Clock3Icon() {
  return <CalendarDays className="size-4" />;
}
