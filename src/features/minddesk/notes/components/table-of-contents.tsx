import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { AlignLeft, ChevronDown, ChevronRight, Hash } from "lucide-react";
import type { TableOfContentItem } from "../types";

interface TableOfContentsProps {
  editor: Editor | null;
}

export function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TableOfContentItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const extractHeadings = () => {
      const items: TableOfContentItem[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const text = node.textContent.trim();
          if (text) {
            items.push({
              id: `heading-${pos}`,
              level: node.attrs.level || 1,
              text,
              pos,
            });
          }
        }
      });
      setHeadings(items);
    };

    extractHeadings();
    editor.on("update", extractHeadings);
    return () => {
      editor.off("update", extractHeadings);
    };
  }, [editor]);

  if (!editor || headings.length === 0) return null;

  const scrollToHeading = (pos: number) => {
    try {
      editor.chain().focus().setTextSelection(pos).run();
      const coords = editor.view.coordsAtPos(pos);
      window.scrollTo({
        top: coords.top + window.scrollY - 100,
        behavior: "smooth",
      });
    } catch {
      // ignore
    }
  };

  return (
    <nav
      aria-label="Table of contents"
      className="my-6 rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <AlignLeft className="size-3.5" />
          <span>Table of contents</span>
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        <span className="text-[11px] text-muted-foreground">{headings.length} sections</span>
      </div>

      {!collapsed && (
        <ul className="mt-2.5 space-y-1">
          {headings.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollToHeading(item.pos)}
                style={{
                  paddingLeft: `${Math.max(0, (item.level - 1) * 16)}px`,
                }}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
              >
                <Hash className="size-3 shrink-0 text-muted-foreground/60" />
                <span className="truncate">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
