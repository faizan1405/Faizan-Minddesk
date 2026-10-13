import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Image } from "@tiptap/extension-image";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Placeholder } from "@tiptap/extension-placeholder";

import { Callout } from "./callout";
import { ToggleBlock } from "./toggle";
import { BookmarkBlock } from "./bookmark";
import { NoteReferenceBlock, MindMapReferenceBlock, TaskReferenceBlock } from "./references";
import { SlashCommandsExtension, type SlashCommandsOptions } from "./slash-extension";

export function createEditorExtensions(options?: SlashCommandsOptions) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      link: {
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary font-medium transition-colors cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      },
      dropcursor: {
        color: "var(--primary)",
        width: 2,
      },
      codeBlock: {
        HTMLAttributes: {
          class: "minddesk-code-block rounded-xl bg-muted p-4 font-mono text-sm leading-relaxed",
        },
      },
      blockquote: {
        HTMLAttributes: {
          class: "border-l-2 border-primary/70 pl-4 py-1 italic my-3 text-muted-foreground",
        },
      },
      horizontalRule: {
        HTMLAttributes: {
          class: "my-6 border-t border-border",
        },
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "minddesk-table my-4 w-full border-collapse border border-border rounded-lg overflow-hidden",
      },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: {
        class: "border border-border bg-muted/60 p-2 font-semibold text-left text-sm",
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: "border border-border p-2 text-sm",
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: "minddesk-task-list list-none pl-0 my-2 space-y-1",
      },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: "minddesk-task-item flex items-start gap-2.5 my-1",
      },
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: "minddesk-image my-4 max-h-[520px] rounded-xl border border-border object-contain shadow-sm",
      },
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TextStyle,
    Color,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return "Heading…";
        }
        return "Type '/' for commands…";
      },
      emptyEditorClass: "is-editor-empty",
    }),
    Callout,
    ToggleBlock,
    BookmarkBlock,
    NoteReferenceBlock,
    MindMapReferenceBlock,
    TaskReferenceBlock,
    SlashCommandsExtension.configure(options),
  ];
}
