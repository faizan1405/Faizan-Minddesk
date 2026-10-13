import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useDeskData } from "../store";
import type { NoteItem } from "../types";
import { createEditorExtensions } from "./extensions/editor-extensions";
import type { SlashCommandItem, SlashContext } from "./types";
import { ALL_SLASH_COMMANDS } from "./extensions/slash-commands";
import { NoteHeader } from "./components/note-header";
import { SlashMenu } from "./components/slash-menu";
import { FloatingBubbleMenu } from "./components/bubble-menu";
import { BlockHoverHandle } from "./components/block-handle";
import { TableControls } from "./components/table-controls";
import { TableOfContents } from "./components/table-of-contents";
import {
  ImageInsertDialog,
  MindMapReferenceDialog,
  NoteReferenceDialog,
  TaskReferenceDialog,
} from "./components/dialogs";

interface NoteEditorProps {
  note: NoteItem;
  onBack: () => void;
  onUpdate: (changes: Partial<NoteItem>) => void;
  onNavigateToNote: (noteId: string) => void;
  onDuplicateNote: () => void;
  onDeleteNote: () => void;
}

export function NoteEditor({
  note,
  onBack,
  onUpdate,
  onNavigateToNote,
  onDuplicateNote,
  onDeleteNote,
}: NoteEditorProps) {
  const { data, update } = useDeskData();

  // Save status state
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  // Slash menu state
  const [slashActive, setSlashActive] = useState(false);
  const [slashItems, setSlashItems] = useState<SlashCommandItem[]>(ALL_SLASH_COMMANDS);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashClientRect, setSlashClientRect] = useState<(() => DOMRect) | null>(null);
  const slashPropsRef = useRef<SuggestionProps<SlashCommandItem> | null>(null);

  // Dialog states
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [noteRefDialogOpen, setNoteRefDialogOpen] = useState(false);
  const [mapRefDialogOpen, setMapRefDialogOpen] = useState(false);
  const [taskRefDialogOpen, setTaskRefDialogOpen] = useState(false);

  // Helper to create nested notes
  const createNestedNote = useCallback(
    (title = "Untitled sub-page") => {
      const id = crypto.randomUUID();
      const newNote: NoteItem = {
        id,
        title,
        excerpt: "Nested page.",
        content: `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"${title}"}]}]}`,
        icon: "📄",
        updated: "Just now",
        projectId: note.projectId,
        starred: false,
        parentId: note.id,
      };
      update((current) => ({ ...current, notes: [newNote, ...current.notes] }));
      return id;
    },
    [note.id, note.projectId, update],
  );

  // Helper to create a task in data.tasks
  const createMindDeskTask = useCallback(
    (title: string) => {
      const id = crypto.randomUUID();
      const newTask = {
        id,
        title: title || "New task from note",
        note: `Referenced from: ${note.title}`,
        due: "Today",
        priority: "medium" as const,
        complete: false,
        starred: false,
        projectId: note.projectId,
        subtasks: [],
      };
      update((current) => ({ ...current, tasks: [newTask, ...current.tasks] }));
      return newTask;
    },
    [note.projectId, note.title, update],
  );

  // Context passed to slash commands and block handles
  const slashContext: SlashContext = useMemo(
    () => ({
      notes: data.notes,
      projects: data.projects,
      tasks: data.tasks,
      maps: data.maps,
      currentNote: note,
      createNestedNote,
      createMindDeskTask,
      openImagePicker: () => setImageDialogOpen(true),
      openLinkDialog: () => {
        const url = window.prompt("Enter URL:", "https://");
        if (url) {
          editorRef.current?.chain().focus().setLink({ href: url }).run();
        }
      },
      openNoteReferencePicker: () => setNoteRefDialogOpen(true),
      openMapReferencePicker: () => setMapRefDialogOpen(true),
      openTaskReferencePicker: () => setTaskRefDialogOpen(true),
    }),
    [createMindDeskTask, createNestedNote, data.maps, data.notes, data.projects, data.tasks, note],
  );

  // Slash suggestions handlers
  const slashRenderHandler = useMemo(
    () => ({
      onStart: (props: SuggestionProps<SlashCommandItem>) => {
        slashPropsRef.current = props;
        setSlashItems(props.items);
        setSlashClientRect(() => props.clientRect as () => DOMRect);
        setSlashIndex(0);
        setSlashActive(true);
      },
      onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
        slashPropsRef.current = props;
        setSlashItems(props.items);
        setSlashClientRect(() => props.clientRect as () => DOMRect);
        setSlashIndex(0);
      },
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (!slashActive) return false;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashIndex((prev) => (prev + 1) % Math.max(1, slashItems.length));
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashIndex((prev) => (prev - 1 + slashItems.length) % Math.max(1, slashItems.length));
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          if (slashItems.length > 0) {
            event.preventDefault();
            const chosen = slashItems[slashIndex] || slashItems[0];
            slashPropsRef.current?.command(chosen);
            setSlashActive(false);
            return true;
          }
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setSlashActive(false);
          return true;
        }

        return false;
      },
      onExit: () => {
        setSlashActive(false);
        slashPropsRef.current = null;
      },
    }),
    [slashActive, slashIndex, slashItems],
  );

  // Parse initial content safely (JSON or HTML or Plain Text)
  const initialContent = useMemo(() => {
    const raw = note.content || "";
    if (raw.startsWith("{") && raw.includes('"type":"doc"')) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    if (raw.startsWith("<")) {
      return raw;
    }
    return `<p>${raw.split("\n").map(escapeHtml).join("</p><p>")}</p>`;
  }, [note.content]);

  // Flush debounced save
  const flushSave = useCallback(
    (jsonDoc: object, plainText: string) => {
      setSaveStatus("saved");
      const serialized = JSON.stringify(jsonDoc);
      const excerpt = plainText.replace(/\s+/g, " ").trim().slice(0, 110) || "Empty note";
      onUpdate({ content: serialized, excerpt });
    },
    [onUpdate],
  );

  // Initialize Editor
  const editor = useEditor({
    extensions: createEditorExtensions({
      renderHandler: slashRenderHandler,
      getContext: () => slashContext,
    }),
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "minddesk-note-editor min-h-[55vh] text-base leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const jsonDoc = current.getJSON();
      const text = current.getText();

      saveTimeoutRef.current = setTimeout(() => {
        flushSave(jsonDoc, text);
      }, 700);
    },
  });
  editorRef.current = editor;

  // Flush pending save when navigating away or unmounting
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (editor) {
          flushSave(editor.getJSON(), editor.getText());
        }
      }
    };
  }, [editor, flushSave]);

  // Export functions
  const handleExportMarkdown = () => {
    if (!editor) return;
    const text = `# ${note.title}\n\n${editor.getText()}`;
    downloadFile(`${note.title || "note"}.md`, text, "text/markdown");
  };

  const handleExportJson = () => {
    if (!editor) return;
    const dataObj = {
      id: note.id,
      title: note.title,
      icon: note.icon,
      updated: note.updated,
      content: editor.getJSON(),
    };
    downloadFile(`${note.title || "note"}.json`, JSON.stringify(dataObj, null, 2), "application/json");
  };

  return (
    <section className="relative mx-auto min-h-[calc(100vh-4rem)] w-full max-w-4xl px-4 pb-32 pt-6 sm:px-10 sm:pt-9">
      {/* Top Navigation Bar */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2 text-xs font-medium">
          <ChevronLeft className="size-4" /> All notes
        </Button>
      </div>

      {/* Document Header (Cover, Icon, Title, Meta) */}
      <NoteHeader
        note={note}
        allNotes={data.notes}
        projects={data.projects}
        onUpdate={onUpdate}
        onNavigateToNote={onNavigateToNote}
        onDuplicate={onDuplicateNote}
        onDelete={onDeleteNote}
        onExportMarkdown={handleExportMarkdown}
        onExportJson={handleExportJson}
        saveStatus={saveStatus}
      />

      {/* Collapsible Table of Contents */}
      <TableOfContents editor={editor} />

      {/* Sticky Table Controls (Row/Column manager) */}
      <TableControls editor={editor} />

      {/* Editor Content Area */}
      <div className="relative mt-4">
        {/* Notion Block Hover Handle (+ and drag grip) */}
        <BlockHoverHandle editor={editor} context={slashContext} />

        {/* Floating Bubble Menu on text selection */}
        <FloatingBubbleMenu editor={editor} />

        {/* Main ProseMirror Editor Canvas */}
        <EditorContent editor={editor} />

        {/* Slash Command Autocomplete Popover */}
        {slashActive && (
          <SlashMenu
            items={slashItems}
            selectedIndex={slashIndex}
            onSelect={(item) => {
              slashPropsRef.current?.command(item);
              setSlashActive(false);
            }}
            clientRect={slashClientRect}
            onClose={() => setSlashActive(false)}
          />
        )}
      </div>

      {/* Dialogs */}
      <ImageInsertDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={(url) => {
          editor?.chain().focus().setImage({ src: url }).run();
        }}
      />

      <NoteReferenceDialog
        open={noteRefDialogOpen}
        onOpenChange={setNoteRefDialogOpen}
        notes={data.notes}
        currentNoteId={note.id}
        onSelect={(target) => {
          editor
            ?.chain()
            .focus()
            .insertContent({
              type: "noteReference",
              attrs: { noteId: target.id, title: target.title, icon: target.icon },
            })
            .run();
        }}
      />

      <MindMapReferenceDialog
        open={mapRefDialogOpen}
        onOpenChange={setMapRefDialogOpen}
        maps={data.maps}
        onSelect={(target) => {
          editor
            ?.chain()
            .focus()
            .insertContent({
              type: "mindmapReference",
              attrs: { mapId: target.id, title: target.title },
            })
            .run();
        }}
      />

      <TaskReferenceDialog
        open={taskRefDialogOpen}
        onOpenChange={setTaskRefDialogOpen}
        tasks={data.tasks}
        onCreateTask={createMindDeskTask}
        onSelect={(task) => {
          editor
            ?.chain()
            .focus()
            .insertContent({
              type: "taskReference",
              attrs: { taskId: task.id, title: task.title, complete: task.complete, priority: task.priority },
            })
            .run();
        }}
      />
    </section>
  );
}

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
