import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { useUIStore } from "@/stores/ui-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("T1.2 — AppShell Navigation & Keyboard Shortcuts", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUIStore.setState({
      isSidebarOpen: true,
      isMobileNavOpen: false,
      isCommandPaletteOpen: false,
      isQuickCaptureOpen: false,
      saveStatus: "saved",
    });
  });

  it("renders primary navigation links and highlights active route (/tasks)", () => {
    render(
      <AppShell>
        <div>Workspace Content</div>
      </AppShell>
    );

    expect(screen.getByText("Workspace Content")).toBeInTheDocument();
    expect(screen.getByTestId("save-status-badge")).toHaveTextContent("Saved");

    const taskLinks = screen.getAllByRole("link", { name: /tasks/i });
    expect(taskLinks.length).toBeGreaterThan(0);
    expect(taskLinks[0]).toHaveAttribute("aria-current", "page");
  });

  it("collapses and expands desktop sidebar via button and Ctrl+\\ shortcut", () => {
    render(
      <AppShell>
        <div>Workspace Content</div>
      </AppShell>
    );

    const sidebar = screen.getByTestId("desktop-sidebar");
    expect(sidebar).toHaveAttribute("data-state", "open");

    // Toggle via header button
    const toggleBtn = screen.getByTestId("toggle-sidebar-button");
    fireEvent.click(toggleBtn);
    expect(sidebar).toHaveAttribute("data-state", "collapsed");

    // Toggle back via Ctrl+\ keyboard shortcut
    fireEvent.keyDown(window, { key: "\\", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-state", "open");
  });

  it("opens and closes Command Palette via Ctrl+K and Escape", () => {
    render(
      <AppShell>
        <div>Workspace Content</div>
      </AppShell>
    );

    expect(
      screen.queryByTestId("command-palette-dialog")
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByTestId("command-palette-dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByTestId("command-palette-dialog")
    ).not.toBeInTheDocument();
  });
});
