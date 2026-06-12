import { useRef } from "react";
import { Icon } from "./Icon";

interface TabInfo {
  id: number;
  name: string;
  dirty: boolean;
}

interface TabBarProps {
  tabs: TabInfo[];
  activeId: number;
  confirmCloseId: number | null;
  onSelect: (id: number) => void;
  onClose: (id: number) => void;
}

export function TabBar({ tabs, activeId, confirmCloseId, onSelect, onClose }: TabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Navegação por setas (roving tabindex)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.id === activeId);
    const next = tabs[(idx + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    if (next) {
      onSelect(next.id);
      window.setTimeout(() => {
        listRef.current
          ?.querySelector<HTMLElement>(`[data-tab-id="${next.id}"] [role="tab"]`)
          ?.focus();
      }, 0);
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Documentos abertos"
      className="flex h-9 flex-none items-end gap-1 border-b border-line bg-paper-deep px-2 pt-1"
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const confirming = tab.id === confirmCloseId;
        return (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            className={`group flex h-8 min-w-0 max-w-52 items-center gap-0.5 rounded-t-lg border border-b-0 pl-3 pr-0.5 transition-colors ${
              active
                ? "border-line-strong bg-paper text-ink"
                : "border-transparent bg-transparent text-ink-faint hover:bg-paper/60 hover:text-ink-soft"
            } ${confirming ? "border-accent" : ""}`}
          >
            <button
              role="tab"
              aria-selected={active}
              aria-controls="doc-panel"
              tabIndex={active ? 0 : -1}
              className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium"
              onClick={() => onSelect(tab.id)}
              title={tab.name}
            >
              <span className="truncate">{tab.name}</span>
              {tab.dirty && (
                <span className="flex-none text-accent" title="Alterações não salvas">
                  •<span className="sr-only"> (alterações não salvas)</span>
                </span>
              )}
            </button>
            <button
              aria-label={
                confirming
                  ? `Fechar ${tab.name} sem salvar (confirme clicando de novo; ⇧⌘T recupera)`
                  : `Fechar ${tab.name}`
              }
              className={`flex h-7 w-7 flex-none items-center justify-center rounded transition-opacity hover:bg-line focus-visible:opacity-100 ${
                confirming
                  ? "bg-accent-wash text-accent-deep opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              title={
                confirming ? "Clique de novo para fechar — ⇧⌘T recupera depois" : "Fechar (⌘W)"
              }
              onClick={() => onClose(tab.id)}
            >
              <Icon name="close" size={11} strokeWidth={2.2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
