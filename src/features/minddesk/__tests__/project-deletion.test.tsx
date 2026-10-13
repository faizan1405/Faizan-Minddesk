import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { ProjectsView } from "@/features/minddesk/library-views";
import { initialDeskData } from "@/features/minddesk/seed";
import type { DeskData } from "@/features/minddesk/types";

const mockDeskDataWithProject: DeskData = {
  ...initialDeskData,
  projects: [
    {
      id: "proj-web",
      name: "MindDesk 2.0 Website",
      description: "Next-gen workspace redesign",
      icon: "🌐",
      hue: "violet",
    },
  ],
  tasks: [
    {
      id: "task-p1",
      projectId: "proj-web",
      title: "Design System Tokens",
      note: "",
      due: "Today",
      priority: "high",
      complete: false,
      starred: false,
      subtasks: [],
    },
  ],
  notes: [
    {
      id: "note-p1",
      projectId: "proj-web",
      title: "Website Information Architecture",
      content: "<p>IA Outline</p>",
      excerpt: "IA Outline",
      icon: "📑",
      updated: "2026-10-13T12:00:00.000Z",
      starred: true,
    },
  ],
};

describe("Project Deletion Lifecycle & Productivity Data Preservation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows confirmation dialog with task and note counts and preserves data by default", () => {
    render(
      <MindDeskProvider initialData={mockDeskDataWithProject}>
        <ProjectsView />
      </MindDeskProvider>
    );

    // Click project card to view active project
    const projectCard = screen.getByText("MindDesk 2.0 Website");
    fireEvent.click(projectCard);

    // Active project view displays "Delete project" button
    const deleteBtn = screen.getByRole("button", { name: "Delete project" });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    // Confirmation dialog appears with linked record counts
    expect(
      screen.getByRole("heading", { name: /Delete “MindDesk 2.0 Website”?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This project has 1 task and 1 note associated with it\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Preserve linked notes and tasks \(Recommended\)/i)
    ).toBeInTheDocument();

    // Confirm deletion with default safe preservation
    const confirmBtn = screen.getByTestId("confirm-delete-project-btn");
    fireEvent.click(confirmBtn);

    // Project view exits back to projects library
    expect(screen.queryByDisplayValue("MindDesk 2.0 Website")).not.toBeInTheDocument();
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("allows direct deletion from the project card in the grid view", () => {
    render(
      <MindDeskProvider initialData={mockDeskDataWithProject}>
        <ProjectsView />
      </MindDeskProvider>
    );

    const cardDeleteBtn = screen.getByLabelText("Delete project MindDesk 2.0 Website");
    fireEvent.click(cardDeleteBtn);

    expect(
      screen.getByRole("heading", { name: /Delete “MindDesk 2.0 Website”?/i })
    ).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    // Dialog closes and project remains
    expect(
      screen.queryByRole("heading", { name: /Delete “MindDesk 2.0 Website”?/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText("MindDesk 2.0 Website")).toBeInTheDocument();
  });

  it("deletes associated tasks and notes when user explicitly selects permanent deletion", () => {
    render(
      <MindDeskProvider initialData={mockDeskDataWithProject}>
        <ProjectsView />
      </MindDeskProvider>
    );

    const cardDeleteBtn = screen.getByLabelText("Delete project MindDesk 2.0 Website");
    fireEvent.click(cardDeleteBtn);

    // Choose explicit delete radio
    const deleteLinkedRadio = screen.getByLabelText(
      /Permanently delete linked notes and tasks/i
    );
    fireEvent.click(deleteLinkedRadio);

    const confirmBtn = screen.getByTestId("confirm-delete-project-btn");
    fireEvent.click(confirmBtn);

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });
});
