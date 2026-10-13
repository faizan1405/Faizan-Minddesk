import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { ChevronRight } from "lucide-react";

function ToggleComponent({ node, updateAttributes }: NodeViewProps) {
  const isOpen = node.attrs.open !== false;
  const title = (node.attrs.title as string) || "";

  return (
    <NodeViewWrapper
      as="div"
      className="minddesk-toggle my-2 rounded-lg border border-transparent transition-colors hover:border-border/40"
      data-type="toggle"
      data-open={isOpen ? "true" : "false"}
    >
      <div className="flex items-center gap-1.5 py-1">
        <button
          type="button"
          onClick={() => updateAttributes({ open: !isOpen })}
          className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-transform"
          aria-label={isOpen ? "Collapse toggle" : "Expand toggle"}
        >
          <ChevronRight className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
        </button>
        <input
          type="text"
          value={title}
          placeholder="Toggle header…"
          onChange={(e) => updateAttributes({ title: e.target.value })}
          className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none placeholder:text-muted-foreground/60 text-base"
        />
      </div>

      <div className={`pl-7 pr-2 transition-all duration-200 ${isOpen ? "block pb-1" : "hidden"}`}>
        <NodeViewContent className="min-w-0 outline-none [&>p]:my-1" />
      </div>
    </NodeViewWrapper>
  );
}

export const ToggleBlock = Node.create({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      title: {
        default: "Toggle section",
        parseHTML: (element) => element.getAttribute("data-title") || "Toggle section",
        renderHTML: (attributes) => ({
          "data-title": attributes.title,
        }),
      },
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({
          "data-open": attributes.open ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle"]',
      },
      {
        tag: "details",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const summary = (element as HTMLElement).querySelector("summary");
          return {
            title: summary?.textContent || "Toggle section",
            open: (element as HTMLDetailsElement).open,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle",
        class: "minddesk-toggle",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleComponent);
  },
});
