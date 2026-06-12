import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  onViewReady?: (view: EditorView | null) => void;
}

const PT_BR_PHRASES = {
  Find: "Buscar",
  Replace: "Substituir",
  next: "próxima",
  previous: "anterior",
  all: "todas",
  "match case": "diferenciar maiúsculas",
  "by word": "palavra inteira",
  regexp: "regex",
  replace: "substituir",
  "replace all": "substituir todas",
  close: "fechar",
  "current match": "ocorrência atual",
  "replaced $ matches": "$ ocorrências substituídas",
  "replaced match on line $": "substituída na linha $",
  "on line": "na linha",
};

export function SourceEditor({ value, onChange, onViewReady }: SourceEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // O documento inicial é definido apenas na montagem; updates externos chegam via prop key.
  // biome-ignore lint/correctness/useExhaustiveDependencies: montagem única intencional
  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        EditorState.phrases.of(PT_BR_PHRASES),
        EditorView.contentAttributes.of({ "aria-label": "Código markdown do documento" }),
        search({ top: true }),
        highlightSelectionMatches(),
        keymap.of([...searchKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    onViewReady?.(view);
    view.focus();
    return () => {
      view.destroy();
      viewRef.current = null;
      onViewReady?.(null);
    };
  }, []);

  return <div ref={hostRef} className="h-full" />;
}
