import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { filterSlashCommands } from "./slash-commands";
import type { SlashCommandItem, SlashContext } from "../types";

export interface SlashMenuRenderHandler {
  onStart?: (props: SuggestionProps<SlashCommandItem>) => void;
  onUpdate?: (props: SuggestionProps<SlashCommandItem>) => void;
  onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
  onExit?: () => void;
}

export interface SlashCommandsOptions {
  renderHandler?: SlashMenuRenderHandler;
  getContext?: () => SlashContext;
}

export const SlashCommandsExtension = Extension.create<SlashCommandsOptions>({
  name: "slashCommands",

  addOptions() {
    return {
      renderHandler: undefined,
      getContext: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          // Incompatible contexts: code block or table header
          if ($from.parent.type.name === "codeBlock") {
            return false;
          }
          return true;
        },
        items: ({ query }) => {
          return filterSlashCommands(query);
        },
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          const context = this.options.getContext?.();
          if (props && props.run && context) {
            props.run(editor, context);
          }
        },
        render: () => {
          return {
            onStart: (props) => {
              this.options.renderHandler?.onStart?.(props);
            },
            onUpdate: (props) => {
              this.options.renderHandler?.onUpdate?.(props);
            },
            onKeyDown: (props) => {
              return this.options.renderHandler?.onKeyDown?.(props) ?? false;
            },
            onExit: () => {
              this.options.renderHandler?.onExit?.();
            },
          };
        },
      }),
    ];
  },
});
