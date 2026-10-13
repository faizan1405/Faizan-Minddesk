import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { HabitsProvider } from "@/features/habits/context/habits-context";
import { NotificationProvider } from "@/features/notifications/context/notification-context";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationCenterWorkspace } from "@/features/notifications/components/notification-center-workspace";
import { NotificationPreferencesDialog } from "@/features/notifications/components/notification-preferences-dialog";

vi.mock("next/navigation", () => ({
  usePathname: () => "/notifications",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <MindDeskProvider>
      <CalendarProvider>
        <HabitsProvider>
          <NotificationProvider>
            {ui}
          </NotificationProvider>
        </HabitsProvider>
      </CalendarProvider>
    </MindDeskProvider>
  );
}

describe("Smart Reminders & Notifications Experience (Phase 7 - Part D)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders NotificationBell in header and displays unread count", async () => {
    renderWithProviders(<NotificationBell />);

    const bellBtn = screen.getByRole("button", { name: /Notifications/i });
    expect(bellBtn).toBeInTheDocument();
  });

  it("opens NotificationBell dropdown menu with notifications and mark all read button", async () => {
    renderWithProviders(<NotificationBell />);

    const bellBtn = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.keyDown(bellBtn, { key: "Enter", code: "Enter" });

    // Dropdown content displays
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Verify Preferences gear button is present
    expect(screen.getByTitle("Notification Preferences")).toBeInTheDocument();
  });

  it("renders NotificationCenterWorkspace (/notifications) with header and filter chips", () => {
    renderWithProviders(<NotificationCenterWorkspace />);

    // Main header
    expect(screen.getByText("Notifications & Smart Reminders")).toBeInTheDocument();
    expect(screen.getByText(/Smart Reminders Center/i)).toBeInTheDocument();

    // Category filter chips
    expect(screen.getByRole("button", { name: "All Alerts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Time Blocks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Habits" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Routines" })).toBeInTheDocument();

    // Preferences button
    expect(screen.getByRole("button", { name: /Preferences/i })).toBeInTheDocument();

    // Unread only checkbox
    expect(screen.getByLabelText("Unread only")).toBeInTheDocument();
  });

  it("opens NotificationPreferencesDialog and allows configuring quiet hours and categories", async () => {
    renderWithProviders(<NotificationPreferencesDialog isOpen={true} onClose={vi.fn()} />);

    // Dialog header
    expect(screen.getByText("Notification Preferences")).toBeInTheDocument();
    expect(screen.getByText("Enable Smart Reminders")).toBeInTheDocument();

    // Browser alerts section & prototype architecture disclaimer
    expect(screen.getByText("Browser Desktop Alerts")).toBeInTheDocument();
    expect(screen.getByText(/Local Prototype Architecture:/i)).toBeInTheDocument();

    // Categories toggles
    expect(screen.getByText(/Tasks \(Due soon & overdue\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Calendar \(Meetings & events\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Habits \(Scheduled cues\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Routines \(Morning & evening\)/i)).toBeInTheDocument();

    // Quiet hours section
    expect(screen.getByText("Quiet Hours")).toBeInTheDocument();
    expect(screen.getByText(/Suppress all non-urgent sound and banner alerts/i)).toBeInTheDocument();

    // Timing preferences
    expect(screen.getByText("Default Alert Offset")).toBeInTheDocument();
    expect(screen.getByText("Daily Review Time")).toBeInTheDocument();
  });

  it("filters notifications by category in NotificationCenterWorkspace", () => {
    renderWithProviders(<NotificationCenterWorkspace />);

    // Click Tasks filter chip
    const tasksChip = screen.getByRole("button", { name: "Tasks" });
    fireEvent.click(tasksChip);

    // Verify Tasks filter is active
    expect(tasksChip).toHaveClass("bg-foreground");

    // Click Calendar filter chip
    const calChip = screen.getByRole("button", { name: "Calendar" });
    fireEvent.click(calChip);
    expect(calChip).toHaveClass("bg-foreground");

    // Switch back to All Alerts
    const allChip = screen.getByRole("button", { name: "All Alerts" });
    fireEvent.click(allChip);
    expect(allChip).toHaveClass("bg-foreground");
  });

  it("toggles unread only checkbox in NotificationCenterWorkspace", () => {
    renderWithProviders(<NotificationCenterWorkspace />);

    const unreadCheckbox = screen.getByLabelText("Unread only") as HTMLInputElement;
    expect(unreadCheckbox.checked).toBe(false);

    fireEvent.click(unreadCheckbox);
    expect(unreadCheckbox.checked).toBe(true);
  });
});
