import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

interface SearchBarProps {
  /** Container do documento renderizado onde a busca acontece. */
  getRoot: () => HTMLElement | null;
  /** Incrementa quando ⌘F é pressionado com a busca já aberta: refoca o input. */
  focusTick?: number;
  onClose: () => void;
}

interface MatchState {
  ranges: Range[];
  current: number;
}

function collectMatches(root: HTMLElement, term: string): Range[] {
  if (!term) return [];
  const needle = term.toLowerCase();
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const haystack = text.toLowerCase();
    let idx = haystack.indexOf(needle);
    while (idx !== -1) {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + needle.length);
      ranges.push(range);
      idx = haystack.indexOf(needle, idx + needle.length);
    }
  }
  return ranges;
}

function paintHighlights(ranges: Range[], current: number) {
  if (!("highlights" in CSS)) return;
  CSS.highlights.delete("search");
  CSS.highlights.delete("search-active");
  if (ranges.length === 0) return;
  CSS.highlights.set("search", new Highlight(...ranges));
  const active = ranges[current];
  if (active) CSS.highlights.set("search-active", new Highlight(active));
}

function clearHighlights() {
  if (!("highlights" in CSS)) return;
  CSS.highlights.delete("search");
  CSS.highlights.delete("search-active");
}

/** Busca no modo visual: highlight de todas as ocorrências via CSS Custom Highlight API. */
export function SearchBar({ getRoot, focusTick = 0, onClose }: SearchBarProps) {
  const [term, setTerm] = useState("");
  const [match, setMatch] = useState<MatchState>({ ranges: [], current: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scrollToRange é estável (não usa estado)
  const runSearch = useCallback(
    (text: string, keepIndex = false) => {
      const root = getRoot();
      if (!root) return;
      const ranges = collectMatches(root, text.trim());
      setMatch((prev) => {
        const current = keepIndex && prev.current < ranges.length ? prev.current : 0;
        paintHighlights(ranges, current);
        if (ranges.length > 0) scrollToRange(ranges[current]);
        return { ranges, current };
      });
    },
    [getRoot],
  );

  const scrollToRange = (range: Range | undefined) => {
    if (!range) return;
    const rect = range.getBoundingClientRect();
    const container = range.startContainer.parentElement?.closest("main") ?? document.body;
    if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
      container.scrollBy({ top: rect.top - window.innerHeight / 3, behavior: "auto" });
    }
  };

  const step = (backwards: boolean) => {
    setMatch((prev) => {
      if (prev.ranges.length === 0) return prev;
      const current =
        (prev.current + (backwards ? -1 : 1) + prev.ranges.length) % prev.ranges.length;
      paintHighlights(prev.ranges, current);
      scrollToRange(prev.ranges[current]);
      return { ...prev, current };
    });
    inputRef.current?.focus();
  };

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => clearHighlights();
  }, []);

  useEffect(() => {
    if (focusTick > 0) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [focusTick]);

  // Debounce leve enquanto digita
  useEffect(() => {
    const timer = window.setTimeout(() => runSearch(term, false), 90);
    return () => window.clearTimeout(timer);
  }, [term, runSearch]);

  const total = match.ranges.length;

  return (
    <div className="absolute right-6 top-2 z-40 flex items-center gap-1.5 rounded-xl border border-line-strong bg-card px-2 py-1.5 shadow-[0_18px_40px_-18px_rgba(33,29,25,0.35),0_4px_12px_-6px_rgba(33,29,25,0.18)]">
      <input
        ref={inputRef}
        value={term}
        aria-label="Buscar no documento"
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            step(e.shiftKey);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="Buscar no documento…"
        className="h-7 w-52 rounded-lg border border-line bg-paper px-2.5 text-[13px] outline-none focus:border-accent"
      />
      <span
        className="min-w-14 text-center text-[11.5px] font-medium text-ink-faint"
        role="status"
        aria-live="polite"
      >
        {term ? (total > 0 ? `${match.current + 1} de ${total}` : "Nenhuma") : ""}
      </span>
      <button
        className="toolbar-btn"
        title="Anterior (⇧Enter)"
        aria-label="Ocorrência anterior"
        disabled={total === 0}
        onClick={() => step(true)}
        style={{ transform: "rotate(180deg)" }}
      >
        <Icon name="chevron" size={14} strokeWidth={2.2} />
      </button>
      <button
        className="toolbar-btn"
        title="Próxima (Enter)"
        aria-label="Próxima ocorrência"
        disabled={total === 0}
        onClick={() => step(false)}
      >
        <Icon name="chevron" size={14} strokeWidth={2.2} />
      </button>
      <button
        className="toolbar-btn"
        title="Fechar (Esc)"
        aria-label="Fechar busca"
        onClick={onClose}
      >
        <Icon name="close" size={13} strokeWidth={2.2} />
      </button>
    </div>
  );
}
