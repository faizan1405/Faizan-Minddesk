import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ExternalLink, Globe } from "lucide-react";

function BookmarkComponent({ node }: NodeViewProps) {
  const url = (node.attrs.url as string) || "https://";
  const title = (node.attrs.title as string) || url;
  const description = (node.attrs.description as string) || "Web bookmark link";

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  return (
    <NodeViewWrapper as="div" className="my-3 select-none" data-type="bookmark" data-url={url}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex max-w-2xl items-center justify-between overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
      >
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Globe className="size-3.5 text-primary" />
            <span className="font-medium truncate">{hostname}</span>
          </div>
          <h4 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <ExternalLink className="size-4" />
        </div>
      </a>
    </NodeViewWrapper>
  );
}

export const BookmarkBlock = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      url: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-url") || "",
        renderHTML: (attrs) => ({ "data-url": attrs.url }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
      description: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-description") || "",
        renderHTML: (attrs) => ({ "data-description": attrs.description }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bookmark"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "bookmark",
        class: "minddesk-bookmark",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkComponent);
  },
});
