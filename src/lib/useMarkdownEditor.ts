import CharacterCount from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { type Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

interface MarkdownStorage {
  getMarkdown(): string;
}

/** Markdown atual do editor rico (aceita Editor do react ou do core, por estrutura). */
export function getMarkdown(editor: { storage: Record<string, unknown> }): string {
  return (editor.storage.markdown as MarkdownStorage).getMarkdown();
}

/** Extensões do editor — compartilhadas entre o app e os testes de roundtrip. */
export function buildEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    Image,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    CharacterCount,
    Placeholder.configure({ placeholder: "Escreva algo bonito…" }),
    Markdown.configure({
      html: true,
      linkify: true,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: false,
    }),
  ];
}

export function useMarkdownEditor(onMarkdownChange: (markdown: string) => void): Editor | null {
  return useEditor({
    extensions: buildEditorExtensions(),
    editorProps: {
      attributes: { class: "doc-prose" },
    },
    onUpdate: ({ editor }) => {
      onMarkdownChange(getMarkdown(editor));
    },
  });
}
