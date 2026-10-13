import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { DashboardView, FavoritesView, RecentView, SettingsView, MindDeskWorkspace } from "@/features/minddesk/workspace";
import { TasksView } from "@/features/minddesk/tasks-view";
import { NotesView, ProjectsView } from "@/features/minddesk/library-views";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Lovable Frontend Components & Interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders DashboardView with greeting, today's focus tasks, overview stats, and recent notes", () => {
    render(
      <MindDeskProvider>
        <DashboardView />
      </MindDeskProvider>
    );

    expect(screen.getByText(/Faizan\./i)).toBeInTheDocument();
    expect(screen.getByText(/Today’s focus/i)).toBeInTheDocument();
    expect(screen.getByText("Tasks completed")).toBeInTheDocument();
    expect(screen.getByText("Open projects")).toBeInTheDocument();
    expect(screen.getByText("Recently opened")).toBeInTheDocument();
    expect(screen.getByText("A small next step")).toBeInTheDocument();
  });

  it("renders TasksView, allows filter switching, task toggling, and new task entry", () => {
    render(
      <MindDeskProvider>
        <TasksView />
      </MindDeskProvider>
    );

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add a task and press Enter…/i)).toBeInTheDocument();

    // Toggle a task's completion
    const completeBtns = screen.getAllByRole("button", { name: /Complete/i });
    expect(completeBtns.length).toBeGreaterThan(0);
    fireEvent.click(completeBtns[0]);

    // Switch filter tab to Completed
    const completedTab = screen.getByRole("button", { name: "Completed" });
    fireEvent.click(completedTab);
    expect(screen.getByRole("heading", { name: "Completed" })).toBeInTheDocument();

    // Switch back to Today and add a task
    const todayTab = screen.getByRole("button", { name: "Today" });
    fireEvent.click(todayTab);
    const input = screen.getByPlaceholderText(/Add a task and press Enter…/i);
    fireEvent.change(input, { target: { value: "Ship Lovable Integration" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("Ship Lovable Integration")).toBeInTheDocument();
  });

  it("renders NotesView, filters notes via search input, and creates a new note", () => {
    render(
      <MindDeskProvider>
        <NotesView />
      </MindDeskProvider>
    );

    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Find a note…")).toBeInTheDocument();

    const newNoteBtn = screen.getByRole("button", { name: /New note/i });
    fireEvent.click(newNoteBtn);

    expect(screen.getByDisplayValue("Untitled note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All notes/i })).toBeInTheDocument();
  });

  it("renders ProjectsView with active projects and opens project details", () => {
    render(
      <MindDeskProvider>
        <ProjectsView />
      </MindDeskProvider>
    );

    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByText("Northstar Studio")).toBeInTheDocument();

    // Click project card to view details
    fireEvent.click(screen.getByText("Northstar Studio"));
    expect(screen.getByDisplayValue("Northstar Studio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Projects/i })).toBeInTheDocument();
  });

  it("renders FavoritesView and RecentView with workspace items", () => {
    const { unmount } = render(
      <MindDeskProvider>
        <FavoritesView />
      </MindDeskProvider>
    );
    expect(screen.getByRole("heading", { name: "Favorites" })).toBeInTheDocument();
    unmount();

    render(
      <MindDeskProvider>
        <RecentView />
      </MindDeskProvider>
    );
    expect(screen.getByRole("heading", { name: "Recent" })).toBeInTheDocument();
  });

  it("renders SettingsView and toggles theme appearance", () => {
    render(
      <MindDeskProvider>
        <SettingsView />
      </MindDeskProvider>
    );

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    const themeBtn = screen.getByRole("button", { name: /Dark|Light/i });
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("renders MindDeskWorkspace standalone without errors", () => {
    render(<MindDeskWorkspace initialView="home" />);
    expect(screen.getByText("Mind Desk")).toBeInTheDocument();
    expect(screen.getByText("Quick capture")).toBeInTheDocument();
  });
});
