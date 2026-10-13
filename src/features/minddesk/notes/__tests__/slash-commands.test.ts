import { describe, expect, it } from "vitest";
import { ALL_SLASH_COMMANDS, filterSlashCommands } from "../extensions/slash-commands";

describe("Notion Slash Commands System", () => {
  it("contains all 20 required slash commands across 4 categories", () => {
    expect(ALL_SLASH_COMMANDS.length).toBe(20);

    const commandIds = ALL_SLASH_COMMANDS.map((c) => c.id);
    expect(commandIds).toContain("text");
    expect(commandIds).toContain("h1");
    expect(commandIds).toContain("h2");
    expect(commandIds).toContain("h3");
    expect(commandIds).toContain("bullet");
    expect(commandIds).toContain("number");
    expect(commandIds).toContain("todo");
    expect(commandIds).toContain("toggle");
    expect(commandIds).toContain("quote");
    expect(commandIds).toContain("divider");
    expect(commandIds).toContain("callout");
    expect(commandIds).toContain("table");
    expect(commandIds).toContain("code");
    expect(commandIds).toContain("image");
    expect(commandIds).toContain("link");
    expect(commandIds).toContain("bookmark");
    expect(commandIds).toContain("page");
    expect(commandIds).toContain("note");
    expect(commandIds).toContain("mindmap");
    expect(commandIds).toContain("task");
  });

  it("returns all commands when query is empty or just slash", () => {
    expect(filterSlashCommands("").length).toBe(20);
    expect(filterSlashCommands("/").length).toBe(20);
    expect(filterSlashCommands("   ").length).toBe(20);
  });

  it("filters case-insensitively and by aliases/keywords", () => {
    // Exact id
    const h1Result = filterSlashCommands("h1");
    expect(h1Result.some((c) => c.id === "h1")).toBe(true);

    // Case insensitive
    const h2Result = filterSlashCommands("H2");
    expect(h2Result.some((c) => c.id === "h2")).toBe(true);

    // Aliases
    const todoByCheckbox = filterSlashCommands("checkbox");
    expect(todoByCheckbox.some((c) => c.id === "todo")).toBe(true);

    const tableByGrid = filterSlashCommands("grid");
    expect(tableByGrid.some((c) => c.id === "table")).toBe(true);

    const toggleByAccordion = filterSlashCommands("accordion");
    expect(toggleByAccordion.some((c) => c.id === "toggle")).toBe(true);

    const calloutByAlert = filterSlashCommands("alert");
    expect(calloutByAlert.some((c) => c.id === "callout")).toBe(true);

    const dividerBySeparator = filterSlashCommands("separator");
    expect(dividerBySeparator.some((c) => c.id === "divider")).toBe(true);
  });

  it("returns empty array when no command matches query", () => {
    const result = filterSlashCommands("xyznonexistent");
    expect(result.length).toBe(0);
  });
});
