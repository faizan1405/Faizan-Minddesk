import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Check, FileText, Map } from "lucide-react";
import { useDeskData } from "../../store";

function NoteReferenceComponent({ node }: NodeViewProps) {
  const { setSelectedItem, data } = useDeskData();
  const noteId = (node.attrs.noteId as string) || "";
  const targetNote = data.notes.find((n) => n.id === noteId);

  const title = targetNote?.title || (node.attrs.title as string) || "Untitled Note";
  const icon = targetNote?.icon || (node.attrs.icon as string) || "📄";

  return (
    <NodeViewWrapper as="div" className="my-2 select-none" data-type="note-ref" data-note-id={noteId}>
      <button
        type="button"
        onClick={() => {
          if (noteId) {
            setSelectedItem(noteId);
          }
        }}
        className="group flex max-w-md items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-all hover:border-primary hover:bg-accent/40 active:scale-[0.99]"
      >
        <span className="grid size-7 place-items-center rounded bg-brand-soft text-base">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="size-3" /> Linked Note
          </div>
          <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </p>
        </div>
      </button>
    </NodeViewWrapper>
  );
}

export const NoteReferenceBlock = Node.create({
  name: "noteReference",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      noteId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note-id") || "",
        renderHTML: (attrs) => ({ "data-note-id": attrs.noteId }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
      icon: {
        default: "📄",
        parseHTML: (el) => el.getAttribute("data-icon") || "📄",
        renderHTML: (attrs) => ({ "data-icon": attrs.icon }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="note-ref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "note-ref",
        class: "minddesk-note-ref",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteReferenceComponent);
  },
});

function MindMapReferenceComponent({ node }: NodeViewProps) {
  const { setSelectedItem, data } = useDeskData();
  const mapId = (node.attrs.mapId as string) || "";
  const targetMap = data.maps.find((m) => m.id === mapId);
  const title = targetMap?.title || (node.attrs.title as string) || "Untitled Mind Map";

  return (
    <NodeViewWrapper as="div" className="my-2 select-none" data-type="map-ref" data-map-id={mapId}>
      <button
        type="button"
        onClick={() => {
          if (mapId) {
            setSelectedItem(mapId);
          }
        }}
        className="group flex max-w-md items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-all hover:border-primary hover:bg-accent/40 active:scale-[0.99]"
      >
        <span className="grid size-7 place-items-center rounded bg-primary/10 text-primary">
          <Map className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mind Map
          </div>
          <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </p>
        </div>
      </button>
    </NodeViewWrapper>
  );
}

export const MindMapReferenceBlock = Node.create({
  name: "mindmapReference",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      mapId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-map-id") || "",
        renderHTML: (attrs) => ({ "data-map-id": attrs.mapId }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="map-ref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "map-ref",
        class: "minddesk-map-ref",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MindMapReferenceComponent);
  },
});

function TaskReferenceComponent({ node }: NodeViewProps) {
  const { data, update } = useDeskData();
  const taskId = (node.attrs.taskId as string) || "";
  const targetTask = data.tasks.find((t) => t.id === taskId);
  const title = targetTask?.title || (node.attrs.title as string) || "Task";
  const isComplete = targetTask ? targetTask.complete : node.attrs.complete === true;

  const toggleTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!taskId) return;
    update((current) => ({
      ...current,
      tasks: current.tasks.map((t) => (t.id === taskId ? { ...t, complete: !t.complete } : t)),
    }));
  };

  return (
    <NodeViewWrapper as="div" className="my-2 select-none" data-type="task-ref" data-task-id={taskId}>
      <div className="flex max-w-md items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-all hover:border-primary/50">
        <button
          type="button"
          onClick={toggleTask}
          className={`grid size-5 place-items-center rounded border transition-colors ${
            isComplete
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary text-transparent"
          }`}
          aria-label={isComplete ? "Mark incomplete" : "Mark complete"}
        >
          <Check className="size-3.5 stroke-[3]" />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium transition-colors ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {title}
          </p>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const TaskReferenceBlock = Node.create({
  name: "taskReference",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      taskId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-task-id") || "",
        renderHTML: (attrs) => ({ "data-task-id": attrs.taskId }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
      complete: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-complete") === "true",
        renderHTML: (attrs) => ({ "data-complete": attrs.complete ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="task-ref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "task-ref",
        class: "minddesk-task-ref",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskReferenceComponent);
  },
});
