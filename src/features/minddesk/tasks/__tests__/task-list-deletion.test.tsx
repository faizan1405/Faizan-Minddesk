import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { TasksView } from "@/features/minddesk/tasks-view";
import { initialDeskData } from "@/features/minddesk/seed";
import type { DeskData } from "@/features/minddesk/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockDeskDataWithLists: DeskData = {
  ...initialDeskData,
  taskLists: [
    { id: "list-default", title: "My Tasks", order: 0, isDefault: true },
    { id: "list-work", title: "Work Projects", order: 1, isDefault: false },
  ],
  tasks: [
    {
      id: "task-work-1",
      listId: "list-work",
      title: "Prepare Sprint Presentation",
      note: "Slides 1-10",
      due: "Today",
      priority: "high",
      complete: false,
      starred: true,
      subtasks: [],
    },
    {
      id: "task-work-2",
      listId: "list-work",
      title: "Review Backend PR",
      note: "",
      due: "Today",
      priority: "medium",
      complete: false,
      starred: false,
      subtasks: [],
    },
  ],
};

describe("Task List Deletion Lifecycle & Data Integrity", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows clear confirmation dialog with task counts and preservation option", () => {
    render(
      <MindDeskProvider initialData={mockDeskDataWithLists}>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const workColumn = screen.getByTestId("task-column-list-work");
    expect(workColumn).toBeInTheDocument();

    // Open options dropdown in "Work Projects" column
    const optionsBtn = within(workColumn).getByLabelText("List options");
    fireEvent.keyDown(optionsBtn, { key: "Enter" });

    // Click "Delete list"
    const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete list/i });
    fireEvent.click(deleteMenuItem);

    // Confirmation dialog appears
    expect(screen.getByRole("heading", { name: /Delete “Work Projects”?/i })).toBeInTheDocument();
    expect(screen.getByText(/This list contains 2 tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/Move tasks to another list \(Recommended\)/i)).toBeInTheDocument();
  });

  it("safely preserves tasks by moving them to destination list by default", () => {
    render(
      <MindDeskProvider initialData={mockDeskDataWithLists}>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const workColumn = screen.getByTestId("task-column-list-work");
    const optionsBtn = within(workColumn).getByLabelText("List options");
    fireEvent.keyDown(optionsBtn, { key: "Enter" });

    const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete list/i });
    fireEvent.click(deleteMenuItem);

    // Default option is "move" to My Tasks
    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete list" });
    fireEvent.click(confirmDeleteBtn);

    // "Work Projects" column is removed
    expect(screen.queryByTestId("task-column-list-work")).not.toBeInTheDocument();

    // Both tasks are safely preserved in "My Tasks" column
    const defaultColumn = screen.getByTestId("task-column-list-default");
    expect(within(defaultColumn).getByText("Prepare Sprint Presentation")).toBeInTheDocument();
    expect(within(defaultColumn).getByText("Review Backend PR")).toBeInTheDocument();
  });

  it("permanently deletes tasks when user explicitly chooses delete option", () => {
    render(
      <MindDeskProvider initialData={mockDeskDataWithLists}>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const workColumn = screen.getByTestId("task-column-list-work");
    const optionsBtn = within(workColumn).getByLabelText("List options");
    fireEvent.keyDown(optionsBtn, { key: "Enter" });

    const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete list/i });
    fireEvent.click(deleteMenuItem);

    // Select explicit delete radio
    const deleteTasksRadio = screen.getByLabelText(/Permanently delete all 2 tasks/i);
    fireEvent.click(deleteTasksRadio);

    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete list" });
    fireEvent.click(confirmDeleteBtn);

    // List and tasks are removed
    expect(screen.queryByTestId("task-column-list-work")).not.toBeInTheDocument();
    expect(screen.queryByText("Prepare Sprint Presentation")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Backend PR")).not.toBeInTheDocument();
  });

  it("disables delete list option when only one list remains", () => {
    const singleListDeskData: DeskData = {
      ...initialDeskData,
      taskLists: [{ id: "list-only", title: "Only List", order: 0, isDefault: true }],
      tasks: [],
    };

    render(
      <MindDeskProvider initialData={singleListDeskData}>
        <TasksView filter="All" />
      </MindDeskProvider>
    );

    const onlyColumn = screen.getByTestId("task-column-list-only");
    const optionsBtn = within(onlyColumn).getByLabelText("List options");
    fireEvent.keyDown(optionsBtn, { key: "Enter" });

    const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete list/i });
    expect(deleteMenuItem).toHaveAttribute("aria-disabled", "true");
  });
});
