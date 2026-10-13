import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Palette,
  Strikethrough,
  Underline as UnderlineIcon,
  ChevronDown,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BubbleMenuProps {
  editor: Editor | null;
}

const TEXT_COLORS = [
  { name: "Default", color: "inherit" },
  { name: "Gray", color: "#64748b" },
  { name: "Violet", color: "#8b5cf6" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Emerald", color: "#10b981" },
  { name: "Amber", color: "#f59e0b" },
  { name: "Rose", color: "#f43f5e" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", color: "" },
  { name: "Yellow", color: "#fef08a" },
  { name: "Green", color: "#bbf7d0" },
  { name: "Blue", color: "#bfdbfe" },
  { name: "Purple", color: "#e9d5ff" },
  { name: "Pink", color: "#fbcfe8" },
];

export function FloatingBubbleMenu({ editor }: BubbleMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (!editor) return;

    const updateVisibility = () => {
      const { state, view } = editor;
      const { selection } = state;

      // Don't show if selection is empty or editor is not focused
      if (selection.empty || !view.hasFocus()) {
        setIsVisible(false);
        return;
      }

      // Check if inside a code block
      if (editor.isActive("codeBlock")) {
        setIsVisible(false);
        return;
      }

      // Calculate selection coordinates
      const { from, to } = selection;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      const top = Math.min(start.top, end.top);
      const bottom = Math.max(start.bottom, end.bottom);
      const left = Math.min(start.left, end.left);
      const right = Math.max(start.right, end.right);
      const width = Math.max(1, right - left);
      const height = Math.max(1, bottom - top);

      const virtualEl = {
        getBoundingClientRect: () =>
          new DOMRect(left, top, width, height),
      };

      if (menuRef.current) {
        computePosition(virtualEl, menuRef.current, {
          placement: "top",
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          setCoords({ x, y });
          setIsVisible(true);
        });
      }
    };

    editor.on("selectionUpdate", updateVisibility);
    editor.on("blur", () => {
      // Small timeout to allow clicking buttons without immediate dismiss
      setTimeout(() => {
        if (!document.activeElement?.closest(".minddesk-bubble-menu")) {
          setIsVisible(false);
        }
      }, 150);
    });

    return () => {
      editor.off("selectionUpdate", updateVisibility);
    };
  }, [editor]);

  if (!editor || !isVisible) return null;

  const getActiveBlockLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    if (editor.isActive("bulletList")) return "Bullet";
    if (editor.isActive("orderedList")) return "Number";
    if (editor.isActive("taskList")) return "To-do";
    if (editor.isActive("blockquote")) return "Quote";
    if (editor.isActive("codeBlock")) return "Code";
    return "Text";
  };

  const setLink = () => {
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setLinkInputOpen(false);
    setLinkUrl("");
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: `${coords.x}px`,
        top: `${coords.y}px`,
      }}
      className="minddesk-bubble-menu z-50 flex items-center gap-0.5 rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      onMouseDown={(e) => {
        // Prevent losing editor selection
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
        }
      }}
    >
      {/* Block Type Transform Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-accent text-foreground"
            title="Turn into"
          >
            <span>{getActiveBlockLabel()}</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="start">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              Normal text
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              Heading 1
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              Heading 2
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              Heading 3
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              Bulleted list
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              Numbered list
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              To-do list
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-left hover:bg-accent"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              Quote
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Bold */}
      <button
        type="button"
        title="Bold (Cmd+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`grid size-7 place-items-center rounded-md text-xs font-semibold transition-colors ${
          editor.isActive("bold") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Bold className="size-3.5" />
      </button>

      {/* Italic */}
      <button
        type="button"
        title="Italic (Cmd+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`grid size-7 place-items-center rounded-md text-xs transition-colors ${
          editor.isActive("italic") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Italic className="size-3.5" />
      </button>

      {/* Underline */}
      <button
        type="button"
        title="Underline (Cmd+U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`grid size-7 place-items-center rounded-md text-xs transition-colors ${
          editor.isActive("underline") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <UnderlineIcon className="size-3.5" />
      </button>

      {/* Strike */}
      <button
        type="button"
        title="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`grid size-7 place-items-center rounded-md text-xs transition-colors ${
          editor.isActive("strike") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Strikethrough className="size-3.5" />
      </button>

      {/* Inline Code */}
      <button
        type="button"
        title="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`grid size-7 place-items-center rounded-md text-xs transition-colors ${
          editor.isActive("code") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Code className="size-3.5" />
      </button>

      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Text Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Text color"
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Palette className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1.5" align="start">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase px-1.5 py-0.5">Color</div>
          <div className="flex flex-col gap-0.5">
            {TEXT_COLORS.map((tc) => (
              <button
                key={tc.name}
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent text-left"
                onClick={() => {
                  if (tc.color === "inherit") {
                    editor.chain().focus().unsetColor().run();
                  } else {
                    editor.chain().focus().setColor(tc.color).run();
                  }
                }}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: tc.color === "inherit" ? "currentColor" : tc.color }} />
                <span>{tc.name}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Highlight color"
            className={`grid size-7 place-items-center rounded-md transition-colors ${
              editor.isActive("highlight") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Highlighter className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1.5" align="start">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase px-1.5 py-0.5">Highlight</div>
          <div className="flex flex-col gap-0.5">
            {HIGHLIGHT_COLORS.map((hc) => (
              <button
                key={hc.name}
                type="button"
                className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent text-left"
                onClick={() => {
                  if (!hc.color) {
                    editor.chain().focus().unsetHighlight().run();
                  } else {
                    editor.chain().focus().setHighlight({ color: hc.color }).run();
                  }
                }}
              >
                <span className="size-3 rounded border border-border" style={{ backgroundColor: hc.color || "transparent" }} />
                <span>{hc.name}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Link Input */}
      <Popover open={linkInputOpen} onOpenChange={setLinkInputOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Link"
            onClick={() => {
              const prev = editor.getAttributes("link").href || "";
              setLinkUrl(prev);
              setLinkInputOpen(true);
            }}
            className={`grid size-7 place-items-center rounded-md transition-colors ${
              editor.isActive("link") ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <LinkIcon className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLink();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="url"
              placeholder="Paste or type link…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus:border-primary"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
