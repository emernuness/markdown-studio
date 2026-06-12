import { useEffect, useState } from "react";
import appIcon from "../assets/icon-128.png";
import { api } from "../lib/api";
import type { RecentFile } from "../lib/types";
import { Icon } from "./Icon";

interface WelcomeProps {
  onOpen: () => void;
  onNew: () => void;
  onOpenPath: (path: string) => void;
  onOpenSample: () => void;
}

const HINTS: [string, string][] = [
  ["⌘O", "abrir"],
  ["⌘N", "novo"],
  ["⇧⌘E", "visual ⁄ código"],
  ["⌘/", "atalhos"],
];

export function Welcome({ onOpen, onNew, onOpenPath, onOpenSample }: WelcomeProps) {
  const [recent, setRecent] = useState<RecentFile[]>([]);

  useEffect(() => {
    api
      .recent()
      .then((r) => setRecent(r.files))
      .catch(() => setRecent([]));
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-9 px-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src={appIcon} alt="" className="h-24 w-24" />
        <h1 className="mt-1 font-prose text-[34px] font-semibold leading-tight tracking-tight">
          Markdown Studio
        </h1>
        <p className="max-w-md text-[14.5px] leading-relaxed text-ink-soft">
          Abra um arquivo markdown e veja-o como documento: renderizado, bonito e já editável. O que
          você salva é markdown limpo.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="flex h-10 items-center gap-2.5 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-deep active:scale-[0.98]"
          onClick={onOpen}
        >
          <Icon name="folder" />
          Abrir arquivo
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-medium">⌘O</kbd>
        </button>
        <button
          className="flex h-10 items-center gap-2.5 rounded-xl border border-line-strong bg-card px-5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink active:scale-[0.98]"
          onClick={onNew}
        >
          <Icon name="filePlus" />
          Novo documento
        </button>
      </div>

      {recent.length > 0 ? (
        <div className="w-full max-w-md">
          <div className="mb-2 px-1 text-[12px] font-semibold text-ink-soft">Recentes</div>
          <div className="overflow-hidden rounded-xl border border-line bg-card">
            {recent.slice(0, 6).map((f, i) => (
              <button
                key={f.path}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper-deep ${
                  i > 0 ? "border-t border-line" : ""
                }`}
                onClick={() => onOpenPath(f.path)}
              >
                <span className="text-ink-faint">
                  <Icon name="doc" size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{f.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-faint">{f.path}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          className="group flex max-w-md items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left transition-colors hover:border-line-strong"
          onClick={onOpenSample}
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-accent-wash text-accent-deep">
            <Icon name="doc" size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold">
              Primeira vez? Abra o documento de exemplo
            </span>
            <span className="block text-[12px] leading-snug text-ink-soft">
              Um markdown de verdade que ensina o editor em 30 segundos: tabelas, cores, tarefas e
              atalhos.
            </span>
          </span>
        </button>
      )}

      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-4">
          {HINTS.map(([keys, label]) => (
            <span key={keys} className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
              <kbd className="rounded bg-paper-deep px-1.5 py-0.5 text-[10.5px] font-medium text-ink-soft">
                {keys}
              </kbd>
              {label}
            </span>
          ))}
        </div>
        <p className="text-[12px] text-ink-faint">…ou arraste arquivos .md para esta janela</p>
        {recent.length > 0 && (
          <button
            className="text-[11.5px] text-ink-faint underline-offset-2 hover:text-ink-soft hover:underline"
            onClick={onOpenSample}
          >
            Reabrir o documento de exemplo
          </button>
        )}
      </div>
    </div>
  );
}
