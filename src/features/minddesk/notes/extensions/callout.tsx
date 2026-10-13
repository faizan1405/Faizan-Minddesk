import React, { useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMOJI_OPTIONS } from "../types";

const CALLOUT_COLORS: { id: string; name: string; bg: string; border: string; text: string }[] = [
  { id: "default", name: "Neutral", bg: "bg-muted/50", border: "border-border", text: "text-foreground" },
  { id: "violet", name: "Violet", bg: "bg-primary/10", border: "border-primary/30", text: "text-foreground" },
  { id: "mint", name: "Emerald", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-950 dark:text-emerald-100" },
  { id: "amber", name: "Amber", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-950 dark:text-amber-100" },
  { id: "sky", name: "Sky", bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-950 dark:text-sky-100" },
  { id: "rose", name: "Rose", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-950 dark:text-rose-100" },
];

function CalloutComponent({ node, updateAttributes }: NodeViewProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const icon = (node.attrs.icon as string) || "💡";
  const colorId = (node.attrs.color as string) || "default";
  const activeColor = CALLOUT_COLORS.find((c) => c.id === colorId) || CALLOUT_COLORS[0];

  return (
    <NodeViewWrapper
      as="div"
      className={`relative my-4 flex items-start gap-3 rounded-xl border p-4 transition-colors ${activeColor.bg} ${activeColor.border} ${activeColor.text}`}
      data-type="callout"
      data-icon={icon}
      data-color={colorId}
    >
      <div className="flex shrink-0 items-center gap-1">
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-xl transition-transform active:scale-95"
              title="Change icon"
            >
              {icon}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="grid grid-cols-6 gap-1 text-center text-lg">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="grid size-8 place-items-center rounded-md hover:bg-accent"
                  onClick={() => {
                    updateAttributes({ icon: emoji });
                    setEmojiOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={paletteOpen} onOpenChange={setPaletteOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="grid size-6 place-items-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              title="Change color"
            >
              <Palette className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="start">
            <div className="flex flex-col gap-1">
              {CALLOUT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent text-left"
                  onClick={() => {
                    updateAttributes({ color: c.id });
                    setPaletteOpen(false);
                  }}
                >
                  <span className={`size-3 rounded-full border ${c.bg} ${c.border}`} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="min-w-0 flex-1">
        <NodeViewContent className="callout-content min-w-0 flex-1 outline-none [&>p]:my-1" />
      </div>
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      icon: {
        default: "💡",
        parseHTML: (element) => element.getAttribute("data-icon") || "💡",
        renderHTML: (attributes) => ({
          "data-icon": attributes.icon,
        }),
      },
      color: {
        default: "default",
        parseHTML: (element) => element.getAttribute("data-color") || "default",
        renderHTML: (attributes) => ({
          "data-color": attributes.color,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "minddesk-callout",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
});
