import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { cycleFocusWithin } from "../lib/focusTrap";
import { Icon } from "./Icon";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Arquivo",
    items: [
      ["⌘N", "Novo documento"],
      ["⌘O", "Abrir…"],
      ["⌘S", "Salvar"],
      ["⇧⌘S", "Salvar como…"],
      ["⌘P", "Imprimir"],
    ],
  },
  {
    title: "Abas",
    items: [
      ["⌘W", "Fechar aba"],
      ["⇧⌘T", "Reabrir aba fechada"],
      ["⌘1…9", "Ir para a aba"],
      ["⌃Tab ⌃⇧Tab", "Próxima ⁄ anterior"],
      ["⇧⌘[ ⇧⌘]", "Aba à esquerda ⁄ direita"],
    ],
  },
  {
    title: "Visualização",
    items: [
      ["⇧⌘E", "Alternar Visual ⁄ Código"],
      ["⌥⌘O", "Estrutura do documento"],
      ["⌘F", "Buscar no documento"],
      ["⌘+ ⌘−", "Ampliar ⁄ reduzir texto"],
      ["⌘0", "Tamanho original"],
      ["⌘/", "Este painel"],
    ],
  },
  {
    title: "Edição (modo Visual)",
    items: [
      ["⌘B ⌘I ⌘U", "Negrito ⁄ itálico ⁄ sublinhado"],
      ["⌘Z ⇧⌘Z", "Desfazer ⁄ refazer"],
      ["clique no nome", "Renomear arquivo"],
    ],
  },
];

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState("");

  useEffect(() => {
    api
      .version()
      .then((v) => setVersion(v.version))
      .catch(() => {});
  }, []);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // diálogo modal semântico: o foco cicla dentro do painel
      if (ref.current) cycleFocusWithin(ref.current, e);
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Atalhos do teclado"
      className="fixed bottom-10 right-6 z-50 w-[340px] rounded-2xl border border-line-strong bg-card p-4 shadow-[0_18px_40px_-18px_rgba(33,29,25,0.35),0_4px_12px_-6px_rgba(33,29,25,0.18)] outline-none"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-baseline gap-2 text-[13px] font-semibold">
          Atalhos do teclado
          {version && (
            <span className="font-mono text-[10.5px] font-medium text-ink-faint">v{version}</span>
          )}
        </span>
        <button className="toolbar-btn" title="Fechar (Esc)" onClick={onClose}>
          <Icon name="close" size={13} strokeWidth={2.2} />
          <span className="sr-only">Fechar painel de atalhos</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-1 text-[11px] font-semibold text-ink-faint">{group.title}</div>
            <dl className="flex flex-col gap-0.5">
              {group.items.map(([keys, label]) => (
                <div key={keys} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[12.5px] text-ink-soft">{label}</dt>
                  <dd className="rounded bg-paper-deep px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                    {keys}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
