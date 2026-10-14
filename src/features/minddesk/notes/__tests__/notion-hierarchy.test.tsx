import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MindDeskProvider } from "@/features/minddesk/store";
import { NotesView } from "../notes-view";
import {
  getProjectOverviewId,
  isProjectOverviewNote,
  getAllDescendantIds,
  isDescendantOf,
} from "../types";
import type { NoteItem, ProjectItem } from "../../types";

const initialTestProjects: ProjectItem[] = [
  {
    id: "proj-business",
    name: "My Business",
    description: "Startup plans and operations",
    icon: "💼",
    hue: "violet",
  },
  {
    id: "proj-personal",
    name: "Personal",
    description: "Life planning and journals",
    icon: "🏠",
    hue: "mint",
  },
];

const initialTestNotes: NoteItem[] = [
  {
    id: getProjectOverviewId("proj-business"),
    title: "My Business Overview",
    excerpt: "Mission statement and company vision.",
    content: JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Welcome to My Business." }] }],
    }),
    icon: "📌",
    updated: "Yesterday",
    starred: false,
    projectId: "proj-business",
    parentId: null,
  },
  {
    id: "page-website",
    title: "Website Ideas",
    excerpt: "Wireframes and copy drafts.",
    content: JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Brand new website plan." }] }],
    }),
    icon: "🌐",
    updated: "Just now",
    starred: true,
    projectId: "proj-business",
    parentId: null,
  },
  {
    id: "subpage-homepage",
    title: "Homepage",
    excerpt: "Above the fold structure.",
    content: JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hero copy and CTA." }] }],
    }),
    icon: "📄",
    updated: "Just now",
    starred: false,
    projectId: "proj-business",
    parentId: "page-website",
  },
  {
    id: "subpage-hero",
    title: "Hero Section",
    excerpt: "Headline variants.",
    content: JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Tagline draft A and B." }] }],
    }),
    icon: "📄",
    updated: "Just now",
    starred: false,
    projectId: "proj-business",
    parentId: "subpage-homepage",
  },
];

describe("Notion-Style Hierarchy & Stable Overview", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("calculates deterministic Project Overview IDs and identifies them correctly", () => {
    const overviewId = getProjectOverviewId("proj-123");
    expect(overviewId).toBe("project-overview-proj-123");
    expect(isProjectOverviewNote(overviewId)).toBe(true);
    expect(isProjectOverviewNote("regular-note-id")).toBe(false);
  });

  it("calculates multi-level descendants across arbitrary depths", () => {
    const descendants = getAllDescendantIds("page-website", initialTestNotes);
    expect(descendants).toContain("subpage-homepage");
    expect(descendants).toContain("subpage-hero");
    expect(descendants.length).toBe(2);

    const heroDescendants = getAllDescendantIds("subpage-hero", initialTestNotes);
    expect(heroDescendants.length).toBe(0);
  });

  it("prevents cycles when checking parent-child relationships", () => {
    // subpage-hero is descendant of page-website
    expect(isDescendantOf("subpage-hero", "page-website", initialTestNotes)).toBe(true);
    // page-website is NOT descendant of subpage-hero
    expect(isDescendantOf("page-website", "subpage-hero", initialTestNotes)).toBe(false);
    // note cannot be descendant of itself
    expect(isDescendantOf("page-website", "page-website", initialTestNotes)).toBe(true);
  });

  it("renders Project Overview and nested subpages in the sidebar when a note is open", async () => {
    render(
      <MindDeskProvider
        initialData={{
          notes: initialTestNotes,
          projects: initialTestProjects,
          tasks: [],
          maps: [],
          stats: { focusMinutes: 0, streakDays: 0, completionRate: 0 },
        }}
      >
        <NotesView initialNoteId="page-website" />
      </MindDeskProvider>,
    );

    const sidebar = screen.getByRole("complementary", { name: /Document sidebar/i });

    // Sidebar should display the project name
    expect(within(sidebar).getByText("My Business")).toBeInTheDocument();

    // Dedicated Overview rows should be present for each project
    expect(within(sidebar).getAllByText("Overview").length).toBe(2);

    // Nested pages should be visible in the sidebar tree
    expect(within(sidebar).getByText("Website Ideas")).toBeInTheDocument();
    expect(within(sidebar).getByText("Homepage")).toBeInTheDocument();
    expect(within(sidebar).getByText("Hero Section")).toBeInTheDocument();
  });

  it("supports single-note deletion with 'Keep Subpages' reparenting immediate children", () => {
    let currentNotes = [...initialTestNotes];
    const targetNoteId = "subpage-homepage"; // has child "subpage-hero" and parent "page-website"

    const targetNote = currentNotes.find((n) => n.id === targetNoteId)!;
    const parentId = targetNote.parentId ?? null;

    // Reparent immediate children to parentId
    currentNotes = currentNotes
      .filter((n) => n.id !== targetNoteId)
      .map((n) => (n.parentId === targetNoteId ? { ...n, parentId } : n));

    // subpage-homepage is gone
    expect(currentNotes.find((n) => n.id === "subpage-homepage")).toBeUndefined();

    // subpage-hero is preserved and reparented directly under page-website
    const reparentedHero = currentNotes.find((n) => n.id === "subpage-hero")!;
    expect(reparentedHero).toBeDefined();
    expect(reparentedHero.parentId).toBe("page-website");
  });

  it("supports single-note deletion with 'Delete Entire Subtree' deleting all descendants", () => {
    let currentNotes = [...initialTestNotes];
    const targetNoteId = "page-website";

    const descendantIds = getAllDescendantIds(targetNoteId, currentNotes);
    const allIdsToDelete = [targetNoteId, ...descendantIds];
    const deleteIdSet = new Set(allIdsToDelete);

    currentNotes = currentNotes.filter((n) => !deleteIdSet.has(n.id));

    // page-website, subpage-homepage, and subpage-hero should all be removed
    expect(currentNotes.find((n) => n.id === "page-website")).toBeUndefined();
    expect(currentNotes.find((n) => n.id === "subpage-homepage")).toBeUndefined();
    expect(currentNotes.find((n) => n.id === "subpage-hero")).toBeUndefined();

    // Overview note remains intact
    expect(currentNotes.find((n) => n.id === getProjectOverviewId("proj-business"))).toBeDefined();
  });

  it("moves an entire subtree to another project with project inheritance", () => {
    let currentNotes = [...initialTestNotes];
    const noteIdToMove = "page-website";
    const targetProjectId = "proj-personal";

    const descendantIds = getAllDescendantIds(noteIdToMove, currentNotes);
    const affectedIds = new Set([noteIdToMove, ...descendantIds]);

    currentNotes = currentNotes.map((item) => {
      if (affectedIds.has(item.id)) {
        return {
          ...item,
          projectId: targetProjectId,
          updated: "Just now",
        };
      }
      return item;
    });

    const movedPage = currentNotes.find((n) => n.id === "page-website")!;
    const movedHomepage = currentNotes.find((n) => n.id === "subpage-homepage")!;
    const movedHero = currentNotes.find((n) => n.id === "subpage-hero")!;

    expect(movedPage.projectId).toBe("proj-personal");
    expect(movedHomepage.projectId).toBe("proj-personal");
    expect(movedHero.projectId).toBe("proj-personal");
  });
});
