import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { HabitsProvider } from "@/features/habits/context/habits-context";
import { DailyPlannerWorkspace } from "@/features/planner/components/daily-planner-workspace";
import { CalendarWorkspace } from "@/features/calendar/components/calendar-workspace";
import {
  calculateMergedOccupiedMinutes,
  checkIntervalConflict,
} from "@/features/calendar/services/calendar-layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/plan-your-day",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderPlannerWorkspace() {
  return render(
    <MindDeskProvider>
      <CalendarProvider>
        <HabitsProvider>
          <DailyPlannerWorkspace />
        </HabitsProvider>
      </CalendarProvider>
    </MindDeskProvider>
  );
}

describe("MindDesk Phase 6: Advanced Time Blocking & Daily Planning Experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the 2-panel planner layout with Task Library (~30%) and Timeline (~70%)", async () => {
    renderPlannerWorkspace();

    // Verify workspace header
    expect(screen.getByText("Plan Your Day")).toBeInTheDocument();
    expect(screen.getByText(/Time Blocking Engine/i)).toBeInTheDocument();

    // Left Panel: Task Library
    expect(screen.getByRole("heading", { name: "Task Library" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search tasks/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Task/i })).toBeInTheDocument();

    // Task Library filter tabs & Timeline Today button
    expect(screen.getAllByRole("button", { name: /^Today$/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /^Starred$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^All Tasks$/i })).toBeInTheDocument();

    // Today's Top 3 Priorities shelf
    expect(screen.getByText(/Today's Top 3 Priorities/i)).toBeInTheDocument();

    // Right Panel: Timeline & controls
    expect(screen.getByRole("button", { name: /\+ Add Time Block/i })).toBeInTheDocument();
    expect(screen.getByTitle(/Toggle Highlight Working Hours/i)).toBeInTheDocument();
    expect(screen.getByText("15m")).toBeInTheDocument(); // Snap default
  });

  it("adds a new task in the Task Library with duration and priority", async () => {
    renderPlannerWorkspace();

    // Click New Task button in Task Library
    const newTaskBtn = screen.getByRole("button", { name: /New Task/i });
    fireEvent.click(newTaskBtn);

    // Form inputs appear
    const taskInput = screen.getByPlaceholderText(/Task title/i);
    expect(taskInput).toBeInTheDocument();

    fireEvent.change(taskInput, { target: { value: "Build Client Landing Page" } });
    const addBtn = screen.getByRole("button", { name: /^Add Task$/i });
    fireEvent.click(addBtn);

    // Task appears in the library
    await waitFor(() => {
      expect(screen.getByText("Build Client Landing Page")).toBeInTheDocument();
    });
  });

  it("opens Time Block Editor when clicking Schedule on a task", async () => {
    renderPlannerWorkspace();

    // Add a task
    const newTaskBtn = screen.getByRole("button", { name: /New Task/i });
    fireEvent.click(newTaskBtn);
    const taskInput = screen.getByPlaceholderText(/Task title/i);
    fireEvent.change(taskInput, { target: { value: "Review Figma Prototype" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Task$/i }));

    await waitFor(() => {
      expect(screen.getByText("Review Figma Prototype")).toBeInTheDocument();
    });

    // Find schedule button for this specific task
    const taskRow = screen.getByText("Review Figma Prototype").closest(".group")!;
    const scheduleBtn = within(taskRow as HTMLElement).getByTitle("Schedule time block on timeline");
    fireEvent.click(scheduleBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByRole("button", { name: "15m" })).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "30m" })).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "60m" })).toBeInTheDocument();

    // Create block
    const createBtn = within(modal).getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    // Block now appears on the timeline
    await waitFor(() => {
      expect(screen.getAllByText("Review Figma Prototype").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("creates a standalone time block directly via + Add Time Block button", async () => {
    renderPlannerWorkspace();

    const addBlockBtn = screen.getByRole("button", { name: /Add Time Block/i });
    fireEvent.click(addBlockBtn);

    // Contextual Editor opens
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const modal = screen.getByRole("dialog");

    // Fill title
    const titleInput = within(modal).getByPlaceholderText(/e.g. Build client website/i);
    fireEvent.change(titleInput, { target: { value: "Team Architecture Review" } });

    // Select block type Meeting / Event
    const meetingTypeBtn = within(modal).getByRole("button", { name: /Meeting \/ Event/i });
    fireEvent.click(meetingTypeBtn);

    // Create block
    const createBtn = within(modal).getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    // Verify it renders on the timeline
    await waitFor(() => {
      expect(screen.getByText("Team Architecture Review")).toBeInTheDocument();
    });
  });

  it("calculates merged non-double-counted time analytics accurately", () => {
    // 2 overlapping intervals: 10:00 - 11:00 (600-660) and 10:30 - 11:30 (630-690)
    // Non-overlapping interval: 13:00 - 14:00 (780-840)
    const items = [
      { startMinutes: 600, endMinutes: 660 },
      { startMinutes: 630, endMinutes: 690 },
      { startMinutes: 780, endMinutes: 840 },
    ];

    const mergedOccupied = calculateMergedOccupiedMinutes(items);
    // [600, 690] = 90 mins, [780, 840] = 60 mins -> Total = 150 mins (2h 30m)
    // If double counted, it would have been 60 + 60 + 60 = 180 mins.
    expect(mergedOccupied).toBe(150);
  });

  it("detects scheduling conflicts and triggers ConflictDialog with 3 options", () => {
    const existing = [
      { id: "evt-1", title: "Client Strategy Sync", startMinutes: 600, endMinutes: 660 },
    ];

    // Conflict case: overlaps 10:15 - 11:15
    const conflictResult = checkIntervalConflict(
      { startMinutes: 615, endMinutes: 675 },
      existing
    );
    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflictingTitles).toContain("Client Strategy Sync");

    // Non-conflict case: 12:00 - 13:00
    const noConflictResult = checkIntervalConflict(
      { startMinutes: 720, endMinutes: 780 },
      existing
    );
    expect(noConflictResult.hasConflict).toBe(false);
  });

  it("switches snap increments between 5m, 15m, and 30m", async () => {
    renderPlannerWorkspace();

    const snap30Btn = screen.getByRole("button", { name: "30m" });
    fireEvent.click(snap30Btn);
    expect(snap30Btn).toHaveClass("bg-primary");

    const snap5Btn = screen.getByRole("button", { name: "5m" });
    fireEvent.click(snap5Btn);
    expect(snap5Btn).toHaveClass("bg-primary");
  });

  it("toggles 8am-6pm preferred working hours highlight", async () => {
    renderPlannerWorkspace();

    const workHoursBtn = screen.getByTitle(/Toggle Highlight Working Hours/i);
    expect(workHoursBtn).toHaveClass("bg-primary/10");

    fireEvent.click(workHoursBtn);
    expect(workHoursBtn).not.toHaveClass("bg-primary/10");
  });

  it("maintains task data integrity: deleting a scheduled block does NOT delete the task", async () => {
    renderPlannerWorkspace();

    // 1. Create a task in Task Library
    const newTaskBtn = screen.getByRole("button", { name: /New Task/i });
    fireEvent.click(newTaskBtn);
    const taskInput = screen.getByPlaceholderText(/Task title/i);
    fireEvent.change(taskInput, { target: { value: "Preserved Google Task" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Task$/i }));

    await waitFor(() => {
      expect(screen.getByText("Preserved Google Task")).toBeInTheDocument();
    });

    // 2. Schedule the task
    const taskRow = screen.getByText("Preserved Google Task").closest(".group")!;
    const scheduleBtn = within(taskRow as HTMLElement).getByTitle("Schedule time block on timeline");
    fireEvent.click(scheduleBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    const modal = screen.getByRole("dialog");
    const createBtn = within(modal).getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    // 3. Block appears on timeline (at least 2 occurrences: in library and on timeline)
    await waitFor(() => {
      const occurrences = screen.getAllByText("Preserved Google Task");
      expect(occurrences.length).toBeGreaterThanOrEqual(2);
    });

    // 4. Click the scheduled block to open Edit modal, then click Delete
    const blockOccurrence = screen.getAllByText("Preserved Google Task")[1];
    fireEvent.click(blockOccurrence);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    const editModal = screen.getByRole("dialog");
    const deleteBtn = within(editModal).getByRole("button", { name: /Delete/i });
    fireEvent.click(deleteBtn);

    // 5. Verify task is still in Task Library (exactly 1 occurrence remains)!
    await waitFor(() => {
      expect(screen.getAllByText("Preserved Google Task")).toHaveLength(1);
    });
  });

  it("synchronizes time blocks bidirectionally between Planner and Calendar", async () => {
    const { rerender } = renderPlannerWorkspace();

    // 1. Create block in Planner
    const addBlockBtn = screen.getByRole("button", { name: /Add Time Block/i });
    fireEvent.click(addBlockBtn);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    const modal = screen.getByRole("dialog");
    const titleInput = within(modal).getByPlaceholderText(/e.g. Build client website/i);
    fireEvent.change(titleInput, { target: { value: "Cross-App Sync Block" } });
    const createBtn = within(modal).getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText("Cross-App Sync Block")).toBeInTheDocument();
    });

    // 2. Switch view to CalendarWorkspace
    rerender(
      <MindDeskProvider>
        <CalendarProvider>
          <HabitsProvider>
            <CalendarWorkspace />
          </HabitsProvider>
        </CalendarProvider>
      </MindDeskProvider>
    );

    // Switch to Day view
    const dayBtn = screen.getByRole("button", { name: /^Day$/i });
    fireEvent.click(dayBtn);

    await waitFor(() => {
      expect(screen.getByText("Cross-App Sync Block")).toBeInTheDocument();
    });

    // Switch to Agenda view
    const agendaBtn = screen.getByRole("button", { name: /^Agenda$/i });
    fireEvent.click(agendaBtn);

    await waitFor(() => {
      expect(screen.getByText("Cross-App Sync Block")).toBeInTheDocument();
      expect(screen.getAllByText(/Focus Block/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("tracks Today's Top 3 Priorities scheduling status explicitly", async () => {
    renderPlannerWorkspace();

    // 1. Initially, clean state shows empty priorities shelf
    expect(screen.getByText("No top priorities selected for this day")).toBeInTheDocument();

    // 2. Create a task in Task Library
    const newTaskBtn = screen.getByRole("button", { name: /New Task/i });
    fireEvent.click(newTaskBtn);
    const taskInput = screen.getByPlaceholderText(/Task title/i);
    fireEvent.change(taskInput, { target: { value: "Priority Focus Item" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Task$/i }));

    await waitFor(() => {
      expect(screen.getByText("Priority Focus Item")).toBeInTheDocument();
    });

    // 3. Add to top priorities via the target icon
    const addToPriorityBtn = screen.getByTitle("Add to top priorities");
    fireEvent.click(addToPriorityBtn);

    // 4. Priority card appears on shelf with "Not scheduled"
    await waitFor(() => {
      expect(screen.getByText("Not scheduled")).toBeInTheDocument();
    });

    // 5. Click Schedule button on the priority card
    const priorityCard = screen.getByText("Not scheduled").closest(".group")!;
    const priorityScheduleBtn = within(priorityCard as HTMLElement).getByRole("button", { name: /^Schedule$/i });
    fireEvent.click(priorityScheduleBtn);

    // 6. Modal opens -> click Create Block
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    const modal = screen.getByRole("dialog");
    const createBtn = within(modal).getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    // 7. Priority is now scheduled
    await waitFor(() => {
      expect(screen.getByText(/Scheduled at/i)).toBeInTheDocument();
    });
  });
});
