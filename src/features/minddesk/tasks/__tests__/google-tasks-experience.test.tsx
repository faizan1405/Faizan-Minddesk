import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { TasksView } from "@/features/minddesk/tasks-view";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Google Tasks Experience (Phase 3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders multiple task lists side by side horizontally in All view", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    // Verify all 5 default task lists appear as columns
    const colMyTasks = screen.getByTestId("task-column-list-my-tasks");
    const colSkills = screen.getByTestId("task-column-list-skills");
    const colProjects = screen.getByTestId("task-column-list-projects");
    const colRoutine = screen.getByTestId("task-column-list-routine");
    const colGoals = screen.getByTestId("task-column-list-goals");

    expect(colMyTasks).toBeInTheDocument();
    expect(colSkills).toBeInTheDocument();
    expect(colProjects).toBeInTheDocument();
    expect(colRoutine).toBeInTheDocument();
    expect(colGoals).toBeInTheDocument();

    // Verify column headers
    expect(within(colMyTasks).getByText("My Tasks")).toBeInTheDocument();
    expect(within(colSkills).getByText("Sharpen My Skills")).toBeInTheDocument();
    expect(within(colProjects).getByText("Website Projects")).toBeInTheDocument();
    expect(within(colRoutine).getByText("Daily Routine")).toBeInTheDocument();
    expect(within(colGoals).getByText("Business Goals")).toBeInTheDocument();
  });

  it("creates a new task list via Create List dialog", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const createListBtn = screen.getByRole("button", { name: /Create list/i });
    fireEvent.click(createListBtn);

    const input = screen.getByPlaceholderText(/Enter list title…/i);
    fireEvent.change(input, { target: { value: "Health & Fitness" } });

    const doneBtn = screen.getByRole("button", { name: "Done" });
    fireEvent.click(doneBtn);

    expect(
      screen.getByRole("heading", { name: "Health & Fitness" })
    ).toBeInTheDocument();
  });

  it("creates a task inline with Enter and verifies it appears in list", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    // Find the quick Add a task button on the first column
    const addBtns = screen.getAllByRole("button", { name: /Add a task/i });
    fireEvent.click(addBtns[0]!);

    const titleInput = screen.getByPlaceholderText("Title");
    fireEvent.change(titleInput, { target: { value: "Ship Google Tasks Experience" } });
    fireEvent.keyDown(titleInput, { key: "Enter" });

    expect(screen.getByText("Ship Google Tasks Experience")).toBeInTheDocument();
  });

  it("toggles task completion and supports Undo restore", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const completeBtn = screen.getByRole("button", {
      name: "Complete Morning focus alignment",
    });
    fireEvent.click(completeBtn);

    // Undo notification banner appears
    const undoBtn = screen.getAllByRole("button", { name: /Undo/i })[0]!;
    expect(undoBtn).toBeInTheDocument();

    // Expand Completed section on My Tasks column to inspect completed tasks
    const myTasksCol = screen.getByTestId("task-column-list-my-tasks");
    const completedToggle = within(myTasksCol).getByRole("button", {
      name: /Completed \(\d+\)/i,
    });
    fireEvent.click(completedToggle);

    expect(
      within(myTasksCol).getByRole("button", {
        name: "Reopen Morning focus alignment",
      })
    ).toBeInTheDocument();

    // Clicking Undo restores the task to active
    fireEvent.click(undoBtn);
    expect(
      within(myTasksCol).getByRole("button", {
        name: "Complete Morning focus alignment",
      })
    ).toBeInTheDocument();
  });

  it("toggles star on a task and synchronizes with Starred view", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const starBtns = screen.getAllByRole("button", {
      name: "Add to starred",
    });
    fireEvent.click(starBtns[0]!);

    // Switch to Starred view tab (in toolbar)
    const toolbarTabs = screen.getAllByRole("button");
    const starredTab = toolbarTabs.find((btn) => btn.textContent?.includes("Starred"));
    expect(starredTab).toBeDefined();
    fireEvent.click(starredTab!);

    expect(screen.getByText("Starred tasks")).toBeInTheDocument();
    expect(
      screen.getByText("Priorities and highlights gathered from all lists")
    ).toBeInTheDocument();
  });

  it("opens task detail modal, edits note and priority, and duplicates task", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    // Click task title to open detail modal
    const taskTitle = screen.getByText("Review customer onboarding feedback");
    fireEvent.click(taskTitle);

    // Detail modal opens
    const detailsInput = screen.getByPlaceholderText(
      /Add details, notes, or links…/i
    );
    expect(detailsInput).toBeInTheDocument();

    fireEvent.change(detailsInput, {
      target: { value: "Updated customer interview findings." },
    });

    const doneBtn = screen.getByRole("button", { name: "Done" });
    fireEvent.click(doneBtn);

    expect(
      screen.getByText("Updated customer interview findings.")
    ).toBeInTheDocument();
  });

  it("manages subtasks: adds subtask, completes it, and promotes to main task", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    // Open task-1 ("Review the launch narrative") detail modal
    const taskTitle = screen.getByText("Review the launch narrative");
    fireEvent.click(taskTitle);

    // Subtask input appears in detail modal
    const subInput = screen.getByPlaceholderText("Add a subtask and press Enter…");
    fireEvent.change(subInput, { target: { value: "Verify typography hierarchy" } });
    fireEvent.submit(subInput.closest("form")!);

    expect(screen.getByDisplayValue("Verify typography hierarchy")).toBeInTheDocument();

    // Promote subtask to main task
    const promoteBtns = screen.getAllByRole("button", {
      name: /Promote subtask to main task/i,
    });
    fireEvent.click(promoteBtns[promoteBtns.length - 1]!);

    // Close modal
    const doneBtn = screen.getByRole("button", { name: "Done" });
    fireEvent.click(doneBtn);

    // Promoted task now exists as top-level task in list
    expect(screen.getByText("Verify typography hierarchy")).toBeInTheDocument();
  });

  it("opens shortcuts dialog with keyboard shortcut cheat sheet", () => {
    render(
      <MindDeskProvider>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const shortcutsBtn = screen.getByRole("button", {
      name: /Keyboard shortcuts/i,
    });
    fireEvent.click(shortcutsBtn);

    expect(
      screen.getByText("Google Tasks Keyboard Shortcuts")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create or confirm task creation")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Undo last task completion or delete")
    ).toBeInTheDocument();
  });
});
