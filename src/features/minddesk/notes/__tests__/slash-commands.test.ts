import { describe, expect, it } from "vitest";
import { ALL_SLASH_COMMANDS, filterSlashCommands } from "../extensions/slash-commands";

describe("Notion Slash Commands System — 6 Essential Commands", () => {
  it("contains strictly the six basic, functional slash commands", () => {
    expect(ALL_SLASH_COMMANDS.length).toBe(6);

    const commandIds = ALL_SLASH_COMMANDS.map((c) => c.id);
    expect(commandIds).toEqual(["text", "h1", "h2", "bullet", "number", "todo"]);

    // All non-essential / modal / prompt commands must NOT be in the visible menu
    expect(commandIds).not.toContain("h3");
    expect(commandIds).not.toContain("quote");
    expect(commandIds).not.toContain("code");
    expect(commandIds).not.toContain("divider");
    expect(commandIds).not.toContain("callout");
    expect(commandIds).not.toContain("toggle");
    expect(commandIds).not.toContain("page");
    expect(commandIds).not.toContain("table");
    expect(commandIds).not.toContain("image");
    expect(commandIds).not.toContain("link");
    expect(commandIds).not.toContain("bookmark");
    expect(commandIds).not.toContain("note");
    expect(commandIds).not.toContain("mindmap");
    expect(commandIds).not.toContain("task");
  });

  it("returns all 6 commands when query is empty or just slash", () => {
    expect(filterSlashCommands("").length).toBe(6);
    expect(filterSlashCommands("/").length).toBe(6);
    expect(filterSlashCommands("   ").length).toBe(6);
  });

  it("filters case-insensitively and by aliases/keywords", () => {
    // Exact id
    const h1Result = filterSlashCommands("h1");
    expect(h1Result.some((c) => c.id === "h1")).toBe(true);

    // Case insensitive
    const h2Result = filterSlashCommands("H2");
    expect(h2Result.some((c) => c.id === "h2")).toBe(true);

    // Text aliases
    const textByParagraph = filterSlashCommands("paragraph");
    expect(textByParagraph.some((c) => c.id === "text")).toBe(true);

    // Bullet aliases
    const bulletByUl = filterSlashCommands("ul");
    expect(bulletByUl.some((c) => c.id === "bullet")).toBe(true);

    // Number aliases
    const numberByOrdered = filterSlashCommands("ordered");
    expect(numberByOrdered.some((c) => c.id === "number")).toBe(true);

    // Todo aliases
    const todoByCheckbox = filterSlashCommands("checkbox");
    expect(todoByCheckbox.some((c) => c.id === "todo")).toBe(true);
  });

  it("returns empty array when no command matches query", () => {
    const result = filterSlashCommands("xyznonexistent");
    expect(result.length).toBe(0);
  });
});
