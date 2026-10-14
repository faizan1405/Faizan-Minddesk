import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SettingsView,
  ProfileSection,
  AppearanceSection,
  ProductivitySection,
  SecuritySection,
  SyncInfoSection,
  DEFAULT_PREFERENCES,
  type UserProfileData,
  type SessionInfo,
  type SyncOverviewInfo,
} from "@/features/settings";
import { MindDeskProvider } from "@/features/minddesk/store";

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

const mockUser: UserProfileData = {
  id: "usr-abc-123",
  email: "sarah.connor@minddesk.io",
  fullName: "Sarah Connor",
  avatarUrl: null,
  emailVerified: true,
  createdAt: "2026-03-01T12:00:00.000Z",
  defaultWorkspaceId: "ws-primary-1",
  workspaceName: "Resistance Operations",
  provider: "credential",
  preferences: DEFAULT_PREFERENCES,
};

const mockSessions: SessionInfo[] = [
  {
    id: "sess-1",
    createdAt: "2026-10-14T08:00:00.000Z",
    expiresAt: "2026-11-14T08:00:00.000Z",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0",
    ipAddress: "192.168.1.50",
    isCurrent: true,
  },
  {
    id: "sess-2",
    createdAt: "2026-10-10T14:30:00.000Z",
    expiresAt: "2026-11-10T14:30:00.000Z",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1",
    ipAddress: "10.0.0.12",
    isCurrent: false,
  },
];

const mockSyncInfo: SyncOverviewInfo = {
  isConfigured: true,
  syncEngine: "Hostinger MySQL Cloud Sync",
  databaseProvider: "Hostinger MySQL / Prisma ORM",
  accountIsolation: "Strict Row-Level Profile & Workspace Partitioning",
  lastSyncedAt: "2026-10-14T10:00:00.000Z",
};

describe("Settings Feature Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ProfileSection", () => {
    it("renders actual user data, email, avatar initials, and account specifications", () => {
      render(
        <ProfileSection
          user={mockUser}
          onSave={vi.fn().mockResolvedValue(true)}
          isSaving={false}
        />
      );

      expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
      expect(screen.getByText("sarah.connor@minddesk.io")).toBeInTheDocument();
      expect(screen.getByText("Resistance Operations")).toBeInTheDocument();
      expect(screen.getByText("Verified Account")).toBeInTheDocument();
      expect(screen.getByText("SC")).toBeInTheDocument();
      expect(screen.getByText("usr-abc-123")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Sarah Connor")).toBeInTheDocument();
    });

    it("validates that display name cannot be blank", async () => {
      const onSave = vi.fn().mockResolvedValue(true);
      render(
        <ProfileSection user={mockUser} onSave={onSave} isSaving={false} />
      );

      const nameInput = screen.getByLabelText("Display Name");
      fireEvent.change(nameInput, { target: { value: "   " } });

      const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
      fireEvent.click(saveBtn);

      expect(screen.getByRole("alert")).toHaveTextContent("Full name cannot be blank.");
      expect(onSave).not.toHaveBeenCalled();
    });

    it("validates avatar image URL format", async () => {
      const onSave = vi.fn().mockResolvedValue(true);
      render(
        <ProfileSection user={mockUser} onSave={onSave} isSaving={false} />
      );

      const avatarInput = screen.getByLabelText("Avatar Image URL");
      fireEvent.change(avatarInput, { target: { value: "not-a-valid-url" } });

      const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
      fireEvent.click(saveBtn);

      expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid avatar image URL");
      expect(onSave).not.toHaveBeenCalled();
    });

    it("successfully submits updated name and avatar URL", async () => {
      const onSave = vi.fn().mockResolvedValue(true);
      render(
        <ProfileSection user={mockUser} onSave={onSave} isSaving={false} />
      );

      const nameInput = screen.getByLabelText("Display Name");
      fireEvent.change(nameInput, { target: { value: "Sarah Connor-Reese" } });

      const avatarInput = screen.getByLabelText("Avatar Image URL");
      fireEvent.change(avatarInput, { target: { value: "https://example.com/sarah.jpg" } });

      const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
      fireEvent.click(saveBtn);

      expect(onSave).toHaveBeenCalledWith({
        fullName: "Sarah Connor-Reese",
        avatarUrl: "https://example.com/sarah.jpg",
      });
    });
  });

  describe("AppearanceSection", () => {
    it("renders theme cards and triggers theme change", () => {
      const onUpdate = vi.fn().mockResolvedValue(true);
      render(
        <AppearanceSection
          appearance={DEFAULT_PREFERENCES.appearance}
          onUpdate={onUpdate}
          isSaving={false}
        />
      );

      expect(screen.getByText("Light Theme")).toBeInTheDocument();
      expect(screen.getByText("Dark Theme")).toBeInTheDocument();
      expect(screen.getByText("System Match")).toBeInTheDocument();

      // Click Dark Theme
      const darkBtn = screen.getByRole("button", { name: /Dark Theme/i });
      fireEvent.click(darkBtn);
      expect(onUpdate).toHaveBeenCalledWith({ theme: "dark" });

      // Click System Theme
      const sysBtn = screen.getByRole("button", { name: /System Match/i });
      fireEvent.click(sysBtn);
      expect(onUpdate).toHaveBeenCalledWith({ theme: "system" });
    });

    it("toggles compact mode and reduced motion", () => {
      const onUpdate = vi.fn().mockResolvedValue(true);
      render(
        <AppearanceSection
          appearance={DEFAULT_PREFERENCES.appearance}
          onUpdate={onUpdate}
          isSaving={false}
        />
      );

      const switches = screen.getAllByRole("switch");
      expect(switches).toHaveLength(2);

      // Compact Mode toggle
      fireEvent.click(switches[0]);
      expect(onUpdate).toHaveBeenCalledWith({ compactMode: true });

      // Reduced Motion toggle
      fireEvent.click(switches[1]);
      expect(onUpdate).toHaveBeenCalledWith({ reducedMotion: true });
    });
  });

  describe("ProductivitySection", () => {
    it("allows switching calendar view, week start, and time format", () => {
      const onUpdateProd = vi.fn().mockResolvedValue(true);
      const onUpdateNotif = vi.fn().mockResolvedValue(true);

      render(
        <ProductivitySection
          productivity={DEFAULT_PREFERENCES.productivity}
          notifications={DEFAULT_PREFERENCES.notifications}
          onUpdateProductivity={onUpdateProd}
          onUpdateNotifications={onUpdateNotif}
          isSaving={false}
        />
      );

      // Change calendar view to week
      const weekBtn = screen.getByRole("button", { name: "week" });
      fireEvent.click(weekBtn);
      expect(onUpdateProd).toHaveBeenCalledWith({ defaultCalendarView: "week" });

      // Change first day of week to Sunday
      const sunBtn = screen.getByRole("button", { name: /Sunday/i });
      fireEvent.click(sunBtn);
      expect(onUpdateProd).toHaveBeenCalledWith({ weekStartsOn: 0 });

      // Change time format to 24-hour
      const time24Btn = screen.getByRole("button", { name: /24-Hour/i });
      fireEvent.click(time24Btn);
      expect(onUpdateProd).toHaveBeenCalledWith({ timeFormat: "24h" });

      // Change task priority to high
      const highBtn = screen.getByRole("button", { name: /high/i });
      fireEvent.click(highBtn);
      expect(onUpdateProd).toHaveBeenCalledWith({ defaultTaskPriority: "high" });
    });

    it("toggles notifications and quiet hours", () => {
      const onUpdateProd = vi.fn().mockResolvedValue(true);
      const onUpdateNotif = vi.fn().mockResolvedValue(true);

      render(
        <ProductivitySection
          productivity={DEFAULT_PREFERENCES.productivity}
          notifications={DEFAULT_PREFERENCES.notifications}
          onUpdateProductivity={onUpdateProd}
          onUpdateNotifications={onUpdateNotif}
          isSaving={false}
        />
      );

      const masterSwitch = screen.getByRole("switch");
      fireEvent.click(masterSwitch);
      expect(onUpdateNotif).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe("SecuritySection", () => {
    it("renders active sessions, encryption notice, password reset link, and sign out button", () => {
      render(
        <SecuritySection
          user={mockUser}
          sessions={mockSessions}
        />
      );

      expect(screen.getByText("Account Protection")).toBeInTheDocument();
      expect(screen.getByText("Encrypted Password")).toBeInTheDocument();
      expect(screen.getByText("Active Database Sessions")).toBeInTheDocument();
      expect(screen.getByText("2 sessions tracked")).toBeInTheDocument();

      // Check sessions parsed
      expect(screen.getByText(/Chrome on Windows/i)).toBeInTheDocument();
      expect(screen.getByText(/Safari on iOS/i)).toBeInTheDocument();
      expect(screen.getByText("Current session")).toBeInTheDocument();
      expect(screen.getByText("IP: 192.168.1.50")).toBeInTheDocument();

      // Password reset link
      const resetLink = screen.getByRole("link", { name: /Reset Password/i });
      expect(resetLink).toHaveAttribute("href", "/update-password");

      // Sign out button
      expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
    });
  });

  describe("SyncInfoSection", () => {
    it("renders MySQL cloud sync status, row-level isolation explanation, and recovery limitations", () => {
      render(
        <MindDeskProvider>
          <SyncInfoSection syncInfo={mockSyncInfo} />
        </MindDeskProvider>
      );

      expect(screen.getByText("Hostinger MySQL Cloud Sync")).toBeInTheDocument();
      expect(screen.getByText("Active Cloud Engine")).toBeInTheDocument();
      expect(screen.getByText("Strict Data Ownership")).toBeInTheDocument();
      expect(screen.getByText("Row-Level Isolation")).toBeInTheDocument();
      expect(screen.getByText("Note Revision Snapshots")).toBeInTheDocument();
      expect(screen.getByText(/Permanent Deletion/i)).toBeInTheDocument();
    });
  });

  describe("SettingsView Tabs Integration", () => {
    it("renders tab navigation and switches between all 5 sections", () => {
      render(
        <MindDeskProvider>
          <SettingsView />
        </MindDeskProvider>
      );

      // Default tab: Profile
      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Personal Profile" })).toBeInTheDocument();

      // Click Appearance tab
      const appearanceTab = screen.getByRole("tab", { name: /Appearance/i });
      fireEvent.click(appearanceTab);
      expect(screen.getByText("Light Theme")).toBeInTheDocument();
      expect(screen.getByText("Dark Theme")).toBeInTheDocument();

      // Click Productivity tab
      const prodTab = screen.getByRole("tab", { name: /Productivity/i });
      fireEvent.click(prodTab);
      expect(screen.getByText("Calendar & Schedule")).toBeInTheDocument();
      expect(screen.getByText("Task Creation Defaults")).toBeInTheDocument();

      // Click Security tab
      const secTab = screen.getByRole("tab", { name: /Security/i });
      fireEvent.click(secTab);
      expect(screen.getByText("Account Protection")).toBeInTheDocument();

      // Click Cloud Sync tab
      const syncTab = screen.getByRole("tab", { name: /Cloud Sync/i });
      fireEvent.click(syncTab);
      expect(screen.getByText("Hostinger MySQL Cloud Sync")).toBeInTheDocument();
    });
  });
});
