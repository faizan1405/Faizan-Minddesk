import type { Editor } from "@tiptap/core";
import {
  CheckSquare,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Type,
} from "lucide-react";
import type { SlashCommandItem } from "../types";

/**
 * The six essential, functional Notion-style slash commands:
 * 1. Text
 * 2. Heading 1
 * 3. Heading 2
 * 4. Bulleted List
 * 5. Numbered List
 * 6. To-do List
 */
export const ALL_SLASH_COMMANDS: SlashCommandItem[] = [
  // Basic Blocks
  {
    id: "text",
    label: "Text",
    aliases: ["p", "paragraph", "normal", "plain"],
    category: "Basic",
    hint: "Just start writing with plain text.",
    icon: Type,
    shortcut: "Ctrl+Alt+0",
    run: (editor: Editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    id: "h1",
    label: "Heading 1",
    aliases: ["h1", "title", "big", "header 1"],
    category: "Basic",
    hint: "Big section heading.",
    icon: Heading1,
    shortcut: "#",
    run: (editor: Editor) => {
      editor.chain().focus().setHeading({ level: 1 }).run();
    },
  },
  {
    id: "h2",
    label: "Heading 2",
    aliases: ["h2", "subtitle", "medium", "header 2"],
    category: "Basic",
    hint: "Medium section heading.",
    icon: Heading2,
    shortcut: "##",
    run: (editor: Editor) => {
      editor.chain().focus().setHeading({ level: 2 }).run();
    },
  },

  // Formatting & Lists
  {
    id: "bullet",
    label: "Bulleted list",
    aliases: ["bullet", "bulleted", "ul", "unordered", "points", "list"],
    category: "Formatting & Lists",
    hint: "Create a simple bulleted list.",
    icon: List,
    shortcut: "-",
    run: (editor: Editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: "number",
    label: "Numbered list",
    aliases: ["number", "numbered", "ol", "ordered", "1.", "sequence"],
    category: "Formatting & Lists",
    hint: "Create a list with numbering.",
    icon: ListOrdered,
    shortcut: "1.",
    run: (editor: Editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    id: "todo",
    label: "To-do list",
    aliases: ["todo", "task", "checkbox", "check", "box", "action"],
    category: "Formatting & Lists",
    hint: "Track tasks with a to-do list.",
    icon: CheckSquare,
    shortcut: "[]",
    run: (editor: Editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const clean = query.trim().toLowerCase().replace(/^\//, "");
  if (!clean) return ALL_SLASH_COMMANDS;

  return ALL_SLASH_COMMANDS.filter((cmd) => {
    if (cmd.id.toLowerCase().includes(clean)) return true;
    if (cmd.label.toLowerCase().includes(clean)) return true;
    if (cmd.hint.toLowerCase().includes(clean)) return true;
    return cmd.aliases.some((alias) => alias.toLowerCase().includes(clean));
  });
}
