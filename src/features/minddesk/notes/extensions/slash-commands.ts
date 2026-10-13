import type { Editor } from "@tiptap/core";
import {
  Bookmark,
  CheckSquare,
  Code,
  FilePlus,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Lightbulb,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Map,
  Minus,
  Quote,
  Table,
  ToggleRight,
  Type,
} from "lucide-react";
import type { SlashCommandItem, SlashContext } from "../types";

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
      editor.chain().focus().toggleHeading({ level: 1 }).run();
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
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: "h3",
    label: "Heading 3",
    aliases: ["h3", "subheading", "small", "header 3"],
    category: "Basic",
    hint: "Small section heading.",
    icon: Heading3,
    shortcut: "###",
    run: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    id: "bullet",
    label: "Bulleted list",
    aliases: ["bullet", "ul", "unordered", "points", "list"],
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
    aliases: ["number", "ol", "ordered", "1.", "sequence"],
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
  {
    id: "toggle",
    label: "Toggle block",
    aliases: ["toggle", "collapse", "accordion", "expand", "details"],
    category: "Structure",
    hint: "Toggles can show and hide nested content.",
    icon: ToggleRight,
    shortcut: ">",
    run: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "toggle",
          attrs: { title: "Toggle section", open: true },
          content: [{ type: "paragraph" }],
        })
        .run();
    },
  },
  {
    id: "quote",
    label: "Quote",
    aliases: ["quote", "blockquote", "cite", "call"],
    category: "Formatting & Lists",
    hint: "Capture a quotation or reflection.",
    icon: Quote,
    shortcut: '">"',
    run: (editor: Editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    id: "divider",
    label: "Divider",
    aliases: ["divider", "hr", "horizontal", "line", "separator"],
    category: "Structure",
    hint: "Visually divide blocks.",
    icon: Minus,
    shortcut: "---",
    run: (editor: Editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    id: "callout",
    label: "Callout",
    aliases: ["callout", "info", "note", "alert", "highlight", "card"],
    category: "Structure",
    hint: "Make writing stand out with an icon.",
    icon: Lightbulb,
    run: (editor: Editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "callout",
          attrs: { icon: "💡", color: "default" },
          content: [{ type: "paragraph" }],
        })
        .run();
    },
  },

  // Advanced Blocks
  {
    id: "table",
    label: "Table",
    aliases: ["table", "grid", "rows", "columns", "sheet"],
    category: "Structure",
    hint: "Add a simple tabular data grid.",
    icon: Table,
    run: (editor: Editor) => {
      (
        editor.chain().focus() as unknown as {
          insertTable: (options: { rows: number; cols: number; withHeaderRow: boolean }) => { run: () => void };
        }
      )
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    id: "code",
    label: "Code block",
    aliases: ["code", "codeblock", "syntax", "js", "ts", "python"],
    category: "Formatting & Lists",
    hint: "Capture a code snippet with formatting.",
    icon: Code,
    shortcut: "```",
    run: (editor: Editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: "image",
    label: "Image",
    aliases: ["image", "photo", "picture", "img", "upload"],
    category: "Structure",
    hint: "Insert an image URL or image asset.",
    icon: Image,
    run: (_editor: Editor, context: SlashContext) => {
      context.openImagePicker();
    },
  },
  {
    id: "link",
    label: "Link",
    aliases: ["link", "url", "href", "hyperlink"],
    category: "Basic",
    hint: "Add a web link to text.",
    icon: Link,
    shortcut: "Ctrl+K",
    run: (_editor: Editor, context: SlashContext) => {
      context.openLinkDialog();
    },
  },
  {
    id: "bookmark",
    label: "Web Bookmark",
    aliases: ["bookmark", "preview", "web", "card"],
    category: "Structure",
    hint: "Save a link with visual web preview.",
    icon: Bookmark,
    run: (editor: Editor) => {
      const url = window.prompt("Enter web bookmark URL:", "https://");
      if (url && url !== "https://") {
        let title = url;
        try {
          title = new URL(url).hostname;
        } catch {
          // ignore
        }
        editor
          .chain()
          .focus()
          .insertContent({
            type: "bookmark",
            attrs: { url, title, description: "External bookmark link" },
          })
          .run();
      }
    },
  },

  // MindDesk Deep Links
  {
    id: "page",
    label: "Sub-page",
    aliases: ["page", "subpage", "nested", "doc", "child"],
    category: "MindDesk Links",
    hint: "Create a nested sub-document inside this note.",
    icon: FilePlus,
    run: (editor: Editor, context: SlashContext) => {
      const newNoteId = context.createNestedNote("Untitled sub-page");
      editor
        .chain()
        .focus()
        .insertContent({
          type: "noteReference",
          attrs: { noteId: newNoteId, title: "Untitled sub-page", icon: "📄" },
        })
        .run();
    },
  },
  {
    id: "note",
    label: "Link Note",
    aliases: ["note", "linknote", "document", "reference"],
    category: "MindDesk Links",
    hint: "Link another MindDesk document.",
    icon: FileText,
    run: (_editor: Editor, context: SlashContext) => {
      context.openNoteReferencePicker();
    },
  },
  {
    id: "mindmap",
    label: "Link Mind Map",
    aliases: ["mindmap", "map", "canvas", "graph", "diagram"],
    category: "MindDesk Links",
    hint: "Insert a link to a MindDesk mind map canvas.",
    icon: Map,
    run: (_editor: Editor, context: SlashContext) => {
      context.openMapReferencePicker();
    },
  },
  {
    id: "task",
    label: "MindDesk Task",
    aliases: ["task", "minddesktask", "todoitem", "actionitem"],
    category: "MindDesk Links",
    hint: "Create or link an actionable task from My Tasks.",
    icon: ListTodo,
    run: (_editor: Editor, context: SlashContext) => {
      context.openTaskReferencePicker();
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
