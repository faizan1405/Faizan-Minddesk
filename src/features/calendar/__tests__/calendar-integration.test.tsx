import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { CalendarWorkspace } from "@/features/calendar/components/calendar-workspace";
import { DailyPlannerWorkspace } from "@/features/planner/components/daily-planner-workspace";
import { STORAGE_KEY } from "@/features/calendar/services/calendar-storage";

vi.mock("next/navigation", () => ({
  usePathname: () => "/calendar",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Calendar & Daily Planner Integration (Phase 5)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders CalendarWorkspace and switches between Month, Week, Day, and Agenda views", async () => {
    render(
      <MindDeskProvider>
        <CalendarProvider>
          <CalendarWorkspace />
        </CalendarProvider>
      </MindDeskProvider>
    );

    // Initial load: Calendar header should show view switchers
    const monthBtn = screen.getByRole("button", { name: /^Month$/i });
    const weekBtn = screen.getByRole("button", { name: /^Week$/i });
    const dayBtn = screen.getByRole("button", { name: /^Day$/i });
    const agendaBtn = screen.getByRole("button", { name: /^Agenda$/i });

    expect(monthBtn).toBeInTheDocument();
    expect(weekBtn).toBeInTheDocument();
    expect(dayBtn).toBeInTheDocument();
    expect(agendaBtn).toBeInTheDocument();

    // Verify Month view is default
    expect(monthBtn).toHaveClass("bg-background");

    // Switch to Week view
    fireEvent.click(weekBtn);
    await waitFor(() => {
      expect(weekBtn).toHaveClass("bg-background");
    });

    // Switch to Day view
    fireEvent.click(dayBtn);
    await waitFor(() => {
      expect(dayBtn).toHaveClass("bg-background");
    });

    // Switch to Agenda view
    fireEvent.click(agendaBtn);
    await waitFor(() => {
      expect(agendaBtn).toHaveClass("bg-background");
    });
  });

  it("opens QuickEventComposer, adds an event, and saves to persistence layer", async () => {
    render(
      <MindDeskProvider>
        <CalendarProvider>
          <CalendarWorkspace />
        </CalendarProvider>
      </MindDeskProvider>
    );

    // Click "Create" button in calendar header
    const createBtn = screen.getByRole("button", { name: /^Create$/i });
    fireEvent.click(createBtn);

    // Modal opens
    expect(screen.getByText("New Event")).toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText("Add title...");
    fireEvent.change(titleInput, { target: { value: "Sprint Architecture Demo" } });

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    // Check localStorage was updated with the new event
    await waitFor(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.events.some((e: { title: string }) => e.title === "Sprint Architecture Demo")).toBe(true);
    });
  });

  it("renders DailyPlannerWorkspace with priorities, tasks panel, and timeline", async () => {
    render(
      <MindDeskProvider>
        <CalendarProvider>
          <DailyPlannerWorkspace />
        </CalendarProvider>
      </MindDeskProvider>
    );

    // Check main headers
    expect(screen.getByText("Plan Your Day")).toBeInTheDocument();
    expect(screen.getByText(/Today's Top Priorities/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Tasks" })).toBeInTheDocument();
    expect(screen.getByText("Daily Intention")).toBeInTheDocument();

    // Check timeline shows Today button
    expect(screen.getAllByRole("button", { name: /^Today$/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("synchronizes task metrics in DailyProgressCard", async () => {
    render(
      <MindDeskProvider>
        <CalendarProvider>
          <DailyPlannerWorkspace />
        </CalendarProvider>
      </MindDeskProvider>
    );

    // Verify progress card metrics are rendered
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Focus Blocked")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });
});
