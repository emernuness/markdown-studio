import type { DocStats } from "../lib/stats";
import { Icon } from "./Icon";

export interface StatusMessage {
  text: string;
  kind: "info" | "error";
}

interface StatusBarProps {
  stats: DocStats;
  path: string | null;
  dirty: boolean;
  message: StatusMessage | null;
}

export function StatusBar({ stats, path, dirty, message }: StatusBarProps) {
  return (
    <footer className="flex h-7 flex-none items-center gap-4 overflow-hidden whitespace-nowrap border-t border-line bg-paper px-4 text-[11.5px] text-ink-faint">
      <span className="hidden flex-none sm:inline">
        {stats.words.toLocaleString("pt-BR")} palavras · {stats.chars.toLocaleString("pt-BR")}{" "}
        caracteres · {stats.readingMinutes} min de leitura
      </span>
      {message && (
        <span
          role={message.kind === "error" ? "alert" : "status"}
          aria-live={message.kind === "error" ? "assertive" : "polite"}
          className={`flex min-w-0 items-center gap-1.5 truncate font-semibold ${
            message.kind === "error" ? "text-accent-deep" : "text-ink-soft"
          }`}
        >
          {message.kind === "error" && (
            <span className="flex-none text-accent">
              <Icon name="alert" size={12} strokeWidth={2.2} />
            </span>
          )}
          <span className="truncate">{message.text}</span>
        </span>
      )}
      <span className="ml-auto flex min-w-0 flex-none items-center gap-2">
        <span className="max-w-[36vw] truncate">{path ?? "Não salvo em disco"}</span>
        <span
          className={`inline-block h-2 w-2 flex-none rounded-full ${dirty ? "bg-accent" : "bg-ok"}`}
          aria-hidden="true"
        />
        <span aria-live="polite" className={dirty ? "text-accent-deep" : "text-ok"}>
          {dirty ? "Não salvo" : "Salvo"}
        </span>
      </span>
    </footer>
  );
}
