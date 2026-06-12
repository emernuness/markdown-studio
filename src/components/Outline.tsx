import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";

interface OutlineItem {
  level: number;
  text: string;
  pos: number;
}

function extractOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      items.push({
        level: (node.attrs.level as number) ?? 1,
        text: node.textContent || "(sem título)",
        pos,
      });
    }
    return true;
  });
  return items;
}

interface OutlineProps {
  editor: Editor | null;
  /** Muda quando o documento ativo muda (recalcula imediatamente). */
  docKey: number | null;
}

/** Estrutura do documento: títulos navegáveis, painel lateral discreto. */
export function Outline({ editor, docKey }: OutlineProps) {
  const [items, setItems] = useState<OutlineItem[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: docKey força recálculo na troca de doc
  useEffect(() => {
    if (!editor) return;
    setItems(extractOutline(editor));
    let timer = 0;
    const onUpdate = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setItems(extractOutline(editor)), 250);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      window.clearTimeout(timer);
    };
  }, [editor, docKey]);

  const jumpTo = (pos: number) => {
    if (!editor) return;
    editor.commands.focus();
    editor.commands.setTextSelection(pos + 1);
    const dom = editor.view.domAtPos(pos + 1).node;
    const el = dom instanceof HTMLElement ? dom : dom.parentElement;
    el?.scrollIntoView({ block: "start", behavior: "auto" });
  };

  return (
    <nav
      aria-label="Estrutura do documento"
      className="w-56 flex-none overflow-y-auto border-r border-line bg-paper px-3 py-6"
    >
      <div className="mb-2 px-2 text-[11px] font-semibold text-ink-faint">Estrutura</div>
      {items.length === 0 ? (
        <p className="px-2 text-[12px] leading-snug text-ink-faint">
          Os títulos do documento aparecem aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={`${item.pos}-${item.text}`}>
              <button
                className="w-full truncate rounded-md px-2 py-1 text-left text-[12.5px] text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                style={{ paddingLeft: `${8 + (item.level - 1) * 12}px` }}
                title={item.text}
                onClick={() => jumpTo(item.pos)}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
