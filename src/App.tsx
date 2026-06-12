import { redo as cmRedo, undo as cmUndo, redoDepth, undoDepth } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import { EditorContent } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import appIcon from "./assets/icon-128.png";
import { CopyButton } from "./components/CopyButton";
import { Icon } from "./components/Icon";
import { Outline } from "./components/Outline";
import { SearchBar } from "./components/SearchBar";
import { ShortcutsPanel } from "./components/ShortcutsPanel";
import { SourceEditor } from "./components/SourceEditor";
import { StatusBar, type StatusMessage } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { Toolbar } from "./components/Toolbar";
import { Welcome } from "./components/Welcome";
import { api, type SessionDoc } from "./lib/api";
import { SAMPLE_DOC, SAMPLE_DOC_NAME } from "./lib/sampleDoc";
import { computeStats } from "./lib/stats";
import type { ExportFormat, ViewMode } from "./lib/types";
import { getMarkdown, useMarkdownEditor } from "./lib/useMarkdownEditor";

const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  pdf: "pdf",
  html: "html",
  docx: "docx",
  rtf: "rtf",
};

const ZOOM_STEPS = [0.85, 1, 1.15, 1.3, 1.5];

/** Tempos do app (ms) num lugar so. */
const TIMING = {
  flash: 4000,
  closeConfirm: 6000,
  autosaveDebounce: 1200,
  diskPoll: 4000,
} as const;

interface TabDoc {
  id: number;
  path: string | null;
  name: string;
  markdown: string;
  savedMarkdown: string;
  mode: ViewMode;
  /** O arquivo mudou no disco enquanto havia um rascunho local. */
  diskConflict?: boolean;
  /** mtime conhecido do arquivo no disco (ms). */
  diskMtime?: number;
}

function baseName(name: string): string {
  return name.replace(/\.(md|markdown|mdown|txt)$/i, "");
}

function toSessionDoc(d: TabDoc): SessionDoc {
  return { path: d.path, name: d.name, markdown: d.markdown, savedMarkdown: d.savedMarkdown };
}

let nextDocId = 1;

export default function App() {
  const [docs, setDocs] = useState<TabDoc[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [sourceKey, setSourceKey] = useState(0);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [dropping, setDropping] = useState(false);
  const [confirmCloseId, setConfirmCloseId] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(
    () => localStorage.getItem("outline-open") === "1",
  );
  const [zoom, setZoom] = useState(() => {
    const saved = Number(localStorage.getItem("doc-zoom"));
    return ZOOM_STEPS.includes(saved) ? saved : 1;
  });

  const docsRef = useRef(docs);
  docsRef.current = docs;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const lastClosedRef = useRef<SessionDoc | null>(null);
  const bootstrappedRef = useRef(false);
  const cmViewRef = useRef<EditorView | null>(null);
  const conflictBannerRef = useRef<HTMLDivElement>(null);
  const flashTimerRef = useRef(0);
  const [searchFocusTick, setSearchFocusTick] = useState(0);
  const [cmHistoryTick, setCmHistoryTick] = useState(0);

  /** Doc ativo no instante da chamada (fora do ciclo de render). */
  const getActive = useCallback(
    () => docsRef.current.find((d) => d.id === activeIdRef.current),
    [],
  );

  const active = docs.find((d) => d.id === activeId) ?? null;
  const mode: ViewMode = active?.mode ?? "rich";

  /** Mensagens: info some em `duration`; erro persiste até a próxima mensagem ou troca de doc. */
  const flash = useCallback(
    (text: string, kind: "info" | "error" = "info", duration: number = TIMING.flash) => {
      setMessage({ text, kind });
      window.clearTimeout(flashTimerRef.current);
      if (kind === "info") {
        flashTimerRef.current = window.setTimeout(() => setMessage(null), duration);
      }
    },
    [],
  );

  const updateActive = useCallback((fn: (doc: TabDoc) => TabDoc) => {
    setDocs((ds) => ds.map((d) => (d.id === activeIdRef.current ? fn(d) : d)));
  }, []);

  const onRichChange = useCallback(
    (markdown: string) => {
      updateActive((d) => (d.mode === "rich" ? { ...d, markdown } : d));
    },
    [updateActive],
  );

  const editor = useMarkdownEditor(onRichChange);
  const editorRef = useRef<typeof editor>(null);
  editorRef.current = editor;

  // Quando o TipTap terminar de montar, sincroniza o doc ativo (corrida na abertura inicial).
  useEffect(() => {
    const current = getActive();
    if (editor && current) editor.commands.setContent(current.markdown, false);
  }, [editor, getActive]);

  // Zoom do documento (⌘+ ⌘− ⌘0), persistido
  useEffect(() => {
    document.documentElement.style.setProperty("--doc-zoom", String(zoom));
    localStorage.setItem("doc-zoom", String(zoom));
  }, [zoom]);

  useEffect(() => {
    localStorage.setItem("outline-open", outlineOpen ? "1" : "0");
  }, [outlineOpen]);

  /**
   * Conciliação com o disco: a verdade do arquivo nunca é sombreada em silêncio.
   * Doc limpo → recarrega do disco. Doc sujo com disco divergente → marca conflito (banner).
   */
  const reconcileWithDisk = useCallback(async (docId: number) => {
    const doc = docsRef.current.find((d) => d.id === docId);
    if (!doc?.path) return;
    try {
      const file = await api.readFile(doc.path);
      if (file.content === doc.savedMarkdown) {
        // disco inalterado em conteúdo — só atualiza o mtime conhecido
        setDocs((ds) => ds.map((d) => (d.id === docId ? { ...d, diskMtime: file.mtimeMs } : d)));
        return;
      }
      const clean = doc.markdown === doc.savedMarkdown;
      setDocs((ds) =>
        ds.map((d) => {
          if (d.id !== docId) return d;
          return clean
            ? {
                ...d,
                markdown: file.content,
                savedMarkdown: file.content,
                diskConflict: false,
                diskMtime: file.mtimeMs,
              }
            : { ...d, diskConflict: true, diskMtime: file.mtimeMs };
        }),
      );
      if (clean && activeIdRef.current === docId) {
        editorRef.current?.commands.setContent(file.content, false);
        setSourceKey((k) => k + 1);
      }
    } catch {
      // arquivo removido/inacessível — mantém o que temos (rascunho ainda salvável via Salvar como)
    }
  }, []);

  const resolveConflict = useCallback(
    async (keep: "disk" | "draft") => {
      const current = getActive();
      if (!current?.path) return;
      try {
        const file = await api.readFile(current.path);
        if (keep === "disk") {
          // O rascunho descartado vai para o buffer do ⇧⌘T: nenhuma escolha é destrutiva
          lastClosedRef.current = toSessionDoc(current);
          updateActive((d) => ({
            ...d,
            markdown: file.content,
            savedMarkdown: file.content,
            diskConflict: false,
            diskMtime: file.mtimeMs,
          }));
          editorRef.current?.commands.setContent(file.content, false);
          setSourceKey((k) => k + 1);
          flash("Recarregado do disco — ⇧⌘T recupera o rascunho descartado.");
        } else {
          // Mantém o rascunho; o estado salvo passa a refletir o disco atual (⌘S agora é decisão consciente)
          updateActive((d) => ({
            ...d,
            savedMarkdown: file.content,
            diskConflict: false,
            diskMtime: file.mtimeMs,
          }));
          flash("Rascunho mantido — ⌘S vai sobrescrever a versão do disco.");
        }
      } catch (err) {
        flash(
          `Não foi possível ler o arquivo: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
    [updateActive, flash, getActive],
  );

  /** Abre um documento em nova aba (ou substitui a aba vazia atual). */
  const addDocument = useCallback(
    (path: string | null, name: string, content: string, mtimeMs?: number) => {
      const current = getActive();
      const doc: TabDoc = {
        id: nextDocId++,
        path,
        name,
        markdown: content,
        savedMarkdown: content,
        mode: "rich",
        diskMtime: mtimeMs,
      };
      const replaceEmpty =
        current && current.path === null && current.markdown === "" && docsRef.current.length > 0;
      setDocs((ds) =>
        replaceEmpty ? ds.map((d) => (d.id === current.id ? doc : d)) : [...ds, doc],
      );
      setActiveId(doc.id);
      editorRef.current?.commands.setContent(content, false);
      setSourceKey((k) => k + 1);
      if (path) api.addRecent(path).catch(() => {});
    },
    [getActive],
  );

  const switchTo = useCallback(
    (id: number) => {
      const target = docsRef.current.find((d) => d.id === id);
      if (!target || id === activeIdRef.current) return;
      setActiveId(id);
      editorRef.current?.commands.setContent(target.markdown, false);
      setSourceKey((k) => k + 1);
      setConfirmCloseId(null);
      setRenaming(false);
      setSearchOpen(false);
      setMessage((m) => (m?.kind === "error" ? null : m));
      reconcileWithDisk(id);
    },
    [reconcileWithDisk],
  );

  const closeTab = useCallback(
    (id: number) => {
      const target = docsRef.current.find((d) => d.id === id);
      if (!target) return;
      const dirty = target.markdown !== target.savedMarkdown;
      if (dirty && confirmCloseId !== id) {
        setConfirmCloseId(id);
        flash(
          docsRef.current.length > 1
            ? "Alterações não salvas — ✕ ou ⌘W de novo fecha. ⇧⌘T recupera depois."
            : "Alterações não salvas — ⌘W de novo fecha (⇧⌘T recupera depois), ⌘S salva.",
          "info",
          TIMING.closeConfirm,
        );
        window.setTimeout(
          () => setConfirmCloseId((c) => (c === id ? null : c)),
          TIMING.closeConfirm,
        );
        return;
      }
      setConfirmCloseId(null);
      lastClosedRef.current = toSessionDoc(target);
      const remaining = docsRef.current.filter((d) => d.id !== id);
      setDocs(remaining);
      if (remaining.length === 0) setMessage(null);
      if (activeIdRef.current === id) {
        const idx = docsRef.current.findIndex((d) => d.id === id);
        const neighbor = remaining[Math.min(idx, remaining.length - 1)] ?? null;
        setActiveId(neighbor?.id ?? null);
        if (neighbor) {
          editorRef.current?.commands.setContent(neighbor.markdown, false);
          setSourceKey((k) => k + 1);
        }
      }
    },
    [confirmCloseId, flash],
  );

  const reopenClosed = useCallback(() => {
    const closed = lastClosedRef.current;
    if (!closed) return;
    lastClosedRef.current = null;
    const pathTaken = closed.path && docsRef.current.some((d) => d.path === closed.path);
    const doc: TabDoc = pathTaken
      ? {
          ...closed,
          id: nextDocId++,
          mode: "rich",
          path: null,
          name: `Rascunho de ${closed.name}`,
          savedMarkdown: "",
        }
      : { ...closed, id: nextDocId++, mode: "rich" };
    setDocs((ds) => [...ds, doc]);
    setActiveId(doc.id);
    editorRef.current?.commands.setContent(doc.markdown, false);
    setSourceKey((k) => k + 1);
    if (doc.path) window.setTimeout(() => reconcileWithDisk(doc.id), 0);
  }, [reconcileWithDisk]);

  const openPath = useCallback(
    async (path: string) => {
      const existing = docsRef.current.find((d) => d.path === path);
      if (existing) {
        switchTo(existing.id);
        reconcileWithDisk(existing.id);
        return;
      }
      try {
        const file = await api.readFile(path);
        addDocument(file.path, file.name, file.content, file.mtimeMs);
      } catch (err) {
        flash(
          `Não foi possível abrir: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
    [addDocument, switchTo, reconcileWithDisk, flash],
  );

  const openDialog = useCallback(async () => {
    const result = await api.openDialog().catch(() => ({ path: null }));
    if (result.path) await openPath(result.path);
  }, [openPath]);

  const newDocument = useCallback(() => {
    addDocument(null, "Sem título.md", "");
    window.setTimeout(() => editorRef.current?.commands.focus(), 30);
  }, [addDocument]);

  const openSample = useCallback(() => {
    addDocument(null, SAMPLE_DOC_NAME, SAMPLE_DOC);
  }, [addDocument]);

  const saveAs = useCallback(async () => {
    const current = getActive();
    if (!current) return;
    const result = await api.saveDialog(current.name, "md").catch(() => ({ path: null }));
    if (!result.path) return;
    try {
      await api.writeFile(result.path, current.markdown);
      const name = result.path.split("/").pop() ?? current.name;
      updateActive((d) => ({
        ...d,
        path: result.path,
        name,
        savedMarkdown: d.markdown,
        diskConflict: false,
      }));
      api.addRecent(result.path).catch(() => {});
      flash("Documento salvo.");
    } catch (err) {
      flash(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [updateActive, flash, getActive]);

  const save = useCallback(async () => {
    const current = getActive();
    if (!current) return;
    if (!current.path) {
      await saveAs();
      return;
    }
    try {
      // Guarda contra sobrescrita silenciosa: se o disco mudou desde a última leitura, vira conflito
      const disk = await api.readFile(current.path).catch(() => null);
      if (disk && disk.content !== current.savedMarkdown && disk.content !== current.markdown) {
        updateActive((d) => ({ ...d, diskConflict: true }));
        flash("O arquivo mudou no disco — resolva o aviso acima antes de salvar.", "error");
        return;
      }
      const written = await api.writeFile(current.path, current.markdown);
      updateActive((d) => ({
        ...d,
        savedMarkdown: d.markdown,
        diskConflict: false,
        diskMtime: written.mtimeMs,
      }));
      flash("Salvo.");
    } catch (err) {
      flash(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [saveAs, updateActive, flash, getActive]);

  const startRename = useCallback(() => {
    const current = getActive();
    if (!current) return;
    setRenameValue(current.name);
    setRenaming(true);
  }, [getActive]);

  const applyRename = useCallback(async () => {
    const current = getActive();
    setRenaming(false);
    if (!current) return;
    const newName = renameValue.trim();
    if (!newName || newName === current.name) return;
    if (current.path) {
      try {
        const result = await api.renameFile(current.path, newName);
        updateActive((d) => ({ ...d, path: result.path, name: result.name }));
        flash("Arquivo renomeado.");
      } catch (err) {
        flash(`Erro ao renomear: ${err instanceof Error ? err.message : String(err)}`, "error");
      }
    } else {
      const finalName = /\.(md|markdown|mdown|txt)$/i.test(newName) ? newName : `${newName}.md`;
      updateActive((d) => ({ ...d, name: finalName }));
    }
  }, [renameValue, updateActive, flash, getActive]);

  /** HTML renderizado do doc ativo (sincroniza o TipTap se necessário). */
  const renderedHtml = useCallback((): string => {
    const ed = editorRef.current;
    const current = getActive();
    if (!ed || !current) return "";
    if (current.mode === "source" || getMarkdown(ed) !== current.markdown) {
      ed.commands.setContent(current.markdown, false);
    }
    return ed.getHTML();
  }, [getActive]);

  const exportDoc = useCallback(
    async (format: ExportFormat) => {
      const current = getActive();
      if (!current) return;
      const defaultName = `${baseName(current.name)}.${EXPORT_EXTENSIONS[format]}`;
      const result = await api
        .saveDialog(defaultName, EXPORT_EXTENSIONS[format])
        .catch(() => ({ path: null }));
      if (!result.path) return;
      flash(`Exportando ${format.toUpperCase()}…`);
      try {
        const res = await api.exportDoc(
          format,
          renderedHtml(),
          baseName(current.name),
          result.path,
        );
        if (res.warning) flash(res.warning, "error");
        else {
          flash(`${format.toUpperCase()} exportado.`);
          api.reveal(res.path).catch(() => {});
        }
      } catch (err) {
        flash(`Falha no export: ${err instanceof Error ? err.message : String(err)}`, "error");
      }
    },
    [renderedHtml, flash, getActive],
  );

  const print = useCallback(async () => {
    const current = getActive();
    if (!current) return;
    try {
      await api.print(renderedHtml(), baseName(current.name));
      flash("Abrindo impressão…");
    } catch (err) {
      flash(`Falha ao imprimir: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [renderedHtml, flash, getActive]);

  const toggleMode = useCallback(() => {
    const ed = editorRef.current;
    const current = getActive();
    if (!current || !ed) return;
    setSearchOpen(false);
    if (current.mode === "rich") {
      updateActive((d) => ({ ...d, mode: "source" }));
      setSourceKey((k) => k + 1);
    } else {
      ed.commands.setContent(current.markdown, false);
      updateActive((d) => ({ ...d, mode: "rich" }));
      window.setTimeout(() => ed.commands.focus(), 30);
    }
  }, [updateActive, getActive]);

  const onSourceChange = useCallback(
    (markdown: string) => {
      updateActive((d) => ({ ...d, markdown }));
    },
    [updateActive],
  );

  const undoAction = useCallback(() => {
    const current = getActive();
    if (current?.mode === "source" && cmViewRef.current) {
      cmUndo(cmViewRef.current);
      cmViewRef.current.focus();
    } else {
      editorRef.current?.chain().focus().undo().run();
    }
  }, [getActive]);

  const redoAction = useCallback(() => {
    const current = getActive();
    if (current?.mode === "source" && cmViewRef.current) {
      cmRedo(cmViewRef.current);
      cmViewRef.current.focus();
    } else {
      editorRef.current?.chain().focus().redo().run();
    }
  }, [getActive]);

  const cycleTab = useCallback(
    (direction: 1 | -1) => {
      const ds = docsRef.current;
      if (ds.length < 2) return;
      const idx = ds.findIndex((d) => d.id === activeIdRef.current);
      const next = ds[(idx + direction + ds.length) % ds.length];
      if (next) switchTo(next.id);
    },
    [switchTo],
  );

  // Atalhos globais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        cycleTab(e.shiftKey ? -1 : 1);
        return;
      }
      if (
        e.metaKey &&
        e.shiftKey &&
        !e.altKey &&
        (e.code === "BracketLeft" || e.code === "BracketRight")
      ) {
        e.preventDefault();
        cycleTab(e.code === "BracketRight" ? 1 : -1);
        return;
      }
      if (e.metaKey && e.altKey && e.code === "KeyO") {
        e.preventDefault();
        setOutlineOpen((v) => !v);
        return;
      }
      const cmd = e.metaKey && !e.altKey && !e.ctrlKey;
      if (!cmd) return;
      const k = e.key.toLowerCase();
      if (k === "o") {
        e.preventDefault();
        openDialog();
      } else if (k === "n") {
        e.preventDefault();
        newDocument();
      } else if (k === "s") {
        e.preventDefault();
        if (e.shiftKey) saveAs();
        else save();
      } else if (k === "p") {
        e.preventDefault();
        print();
      } else if (k === "e" && e.shiftKey) {
        e.preventDefault();
        toggleMode();
      } else if (k === "w") {
        e.preventDefault();
        if (activeIdRef.current !== null) closeTab(activeIdRef.current);
      } else if (k === "t" && e.shiftKey) {
        e.preventDefault();
        reopenClosed();
      } else if (k === "f") {
        const current = getActive();
        if (current?.mode === "rich") {
          e.preventDefault();
          setSearchOpen(true);
          setSearchFocusTick((t) => t + 1);
        }
        // No modo código o CodeMirror tem busca própria
      } else if (k === "/") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (k === "=" || k === "+") {
        e.preventDefault();
        setZoom((z) => {
          const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.indexOf(z) + 1, ZOOM_STEPS.length - 1)] ?? z;
          flash(
            next === z
              ? `Zoom máximo (${Math.round(next * 100)}%)`
              : `Zoom ${Math.round(next * 100)}%`,
          );
          return next;
        });
      } else if (k === "-") {
        e.preventDefault();
        setZoom((z) => {
          const next = ZOOM_STEPS[Math.max(ZOOM_STEPS.indexOf(z) - 1, 0)] ?? z;
          flash(
            next === z
              ? `Zoom mínimo (${Math.round(next * 100)}%)`
              : `Zoom ${Math.round(next * 100)}%`,
          );
          return next;
        });
      } else if (k === "0") {
        e.preventDefault();
        setZoom(1);
        flash("Zoom 100%");
      } else if (/^[1-9]$/.test(k) && !e.shiftKey) {
        const target = docsRef.current[Number(k) - 1];
        if (target) {
          e.preventDefault();
          switchTo(target.id);
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [
    openDialog,
    newDocument,
    save,
    saveAs,
    print,
    toggleMode,
    closeTab,
    reopenClosed,
    switchTo,
    cycleTab,
    flash,
    getActive,
  ]);

  // Bootstrap: restaura a sessão (rascunhos), reconcilia com o disco e abre arquivo de argumento
  // biome-ignore lint/correctness/useExhaustiveDependencies: bootstrap roda uma única vez na montagem
  useEffect(() => {
    (async () => {
      try {
        const session = await api.loadSession();
        lastClosedRef.current = session.lastClosed ?? null;
        if (Array.isArray(session.docs) && session.docs.length > 0) {
          const restored: TabDoc[] = session.docs.map((d) => ({
            id: nextDocId++,
            path: d.path,
            name: d.name,
            markdown: d.markdown,
            savedMarkdown: d.savedMarkdown,
            mode: "rich",
          }));
          bootstrappedRef.current = true;
          setDocs(restored);
          const activeIndex = Math.min(session.activeIndex ?? 0, restored.length - 1);
          const activeDoc = restored[activeIndex] ?? restored[0];
          if (activeDoc) {
            setActiveId(activeDoc.id);
            editorRef.current?.commands.setContent(activeDoc.markdown, false);
          }
          if (restored.some((d) => d.markdown !== d.savedMarkdown)) {
            flash("Rascunhos não salvos restaurados da última sessão.");
          }
          // O disco é a verdade: docs limpos recarregam, sujos com divergência viram conflito.
          // Um tick depois: docsRef só reflete o setDocs acima após o commit do React.
          window.setTimeout(() => {
            for (const doc of restored) {
              if (doc.path) reconcileWithDisk(doc.id);
            }
          }, 0);
        }
      } catch {
        // sem sessão anterior — segue para o arquivo inicial
      }
      bootstrappedRef.current = true;
      try {
        const res = await fetch("/api/initial", {
          method: "POST",
          headers: {
            "X-Studio-Token": new URLSearchParams(window.location.search).get("token") ?? "",
          },
        });
        const r = (await res.json()) as { path: string | null };
        if (r.path) await openPath(r.path);
      } catch {
        // sem arquivo inicial
      }
    })();
  }, []);

  // Autosave de sessão/rascunhos (debounce): nada se perde ao fechar a janela
  // biome-ignore lint/correctness/useExhaustiveDependencies: docs/activeId são os gatilhos; refs carregam o snapshot
  useEffect(() => {
    if (!bootstrappedRef.current) return;
    const timer = window.setTimeout(() => {
      const ds = docsRef.current;
      const activeIndex = Math.max(
        0,
        ds.findIndex((d) => d.id === activeIdRef.current),
      );
      api.saveSession(ds.map(toSessionDoc), activeIndex, lastClosedRef.current).catch(() => {});
    }, TIMING.autosaveDebounce);
    return () => window.clearTimeout(timer);
  }, [docs, activeId]);

  // O arquivo também age: poll leve de mtime do doc ativo + reconcílio ao focar a janela
  useEffect(() => {
    const checkActive = () => {
      const current = getActive();
      if (!current?.path || current.diskConflict) return;
      const path = current.path;
      const docId = current.id;
      api
        .statFile(path)
        .then((stat) => {
          if (!stat.exists) return;
          const doc = docsRef.current.find((d) => d.id === docId);
          if (doc && doc.diskMtime !== undefined && stat.mtimeMs !== doc.diskMtime) {
            reconcileWithDisk(docId);
          }
        })
        .catch(() => {});
    };
    const interval = window.setInterval(checkActive, TIMING.diskPoll);
    window.addEventListener("focus", checkActive);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkActive);
    };
  }, [reconcileWithDisk, getActive]);

  // Foco vai ao banner de conflito quando ele surge (leitor de tela + teclado chegam direto)
  useEffect(() => {
    if (active?.diskConflict) conflictBannerRef.current?.focus();
  }, [active?.diskConflict]);

  // Drag & drop de arquivos (cada arquivo vira uma aba)
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) setDropping(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDropping(false);
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      setDropping(false);
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        /\.(md|markdown|mdown|txt)$/i.test(f.name),
      );
      for (const file of files) {
        const content = await file.text();
        addDocument(null, file.name, content);
      }
      if (files.length > 0) flash("Arquivo carregado — use ⌘S para escolher onde salvar.");
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [addDocument, flash]);

  const stats = useMemo(() => computeStats(active?.markdown ?? ""), [active?.markdown]);
  const dirty = active !== null && active.markdown !== active.savedMarkdown;

  return (
    <div className="flex h-full flex-col">
      {docs.length > 1 && activeId !== null && (
        <TabBar
          tabs={docs.map((d) => ({
            id: d.id,
            name: d.name,
            dirty: d.markdown !== d.savedMarkdown,
          }))}
          activeId={activeId}
          confirmCloseId={confirmCloseId}
          onSelect={switchTo}
          onClose={closeTab}
        />
      )}

      {active !== null && (
        <header className="relative z-30 flex h-12 flex-none items-center gap-2 border-b border-line bg-card/85 px-3 backdrop-blur">
          <div className="flex flex-none items-center gap-2.5 pr-1">
            <img src={appIcon} alt="Markdown Studio" className="h-8 w-8 flex-none" />
            {renaming ? (
              <input
                autoFocus
                value={renameValue}
                aria-label="Novo nome do arquivo"
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={applyRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="h-7 w-44 rounded-lg border border-accent bg-paper px-2 text-[13px] font-semibold outline-none"
              />
            ) : (
              <button
                className="max-w-44 truncate text-[13px] font-semibold hover:text-accent-deep"
                title="Clique para renomear"
                onClick={startRename}
              >
                {active.name}
                {dirty && (
                  <span className="text-accent">
                    {" "}
                    •<span className="sr-only">(alterações não salvas)</span>
                  </span>
                )}
              </button>
            )}
          </div>
          <div className="toolbar-sep" />
          <div className="tb-container min-w-0 flex-1">
            <Toolbar
              editor={editor}
              mode={mode}
              onModeChange={(m) => m !== mode && toggleMode()}
              onExport={exportDoc}
              onPrint={print}
              hasDocument={true}
              dirty={dirty}
              onNew={newDocument}
              onOpen={openDialog}
              onSave={save}
              onSaveAs={saveAs}
              onRename={startRename}
              onShowShortcuts={() => setShortcutsOpen(true)}
              outlineOpen={outlineOpen}
              onToggleOutline={() => setOutlineOpen((v) => !v)}
              onUndo={undoAction}
              onRedo={redoAction}
              canUndo={
                mode === "source"
                  ? cmHistoryTick >= 0 &&
                    !!cmViewRef.current &&
                    undoDepth(cmViewRef.current.state) > 0
                  : !!editor?.can().undo()
              }
              canRedo={
                mode === "source"
                  ? cmHistoryTick >= 0 &&
                    !!cmViewRef.current &&
                    redoDepth(cmViewRef.current.state) > 0
                  : !!editor?.can().redo()
              }
            />
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        {active !== null && mode === "rich" && outlineOpen && (
          <Outline editor={editor} docKey={activeId} />
        )}

        <main
          id="doc-panel"
          data-doc-scroll
          role={docs.length > 1 ? "tabpanel" : undefined}
          aria-label={active ? active.name : undefined}
          className="relative min-h-0 min-w-0 flex-1 overflow-y-auto"
        >
          {active === null && (
            <Welcome
              onOpen={openDialog}
              onNew={newDocument}
              onOpenPath={openPath}
              onOpenSample={openSample}
            />
          )}

          {active?.diskConflict && (
            <div
              ref={conflictBannerRef}
              tabIndex={-1}
              role="alert"
              className="sticky top-0 z-20 flex items-center gap-3 border-b border-accent/40 bg-accent-wash px-5 py-2.5 outline-none"
            >
              <span className="flex-none text-accent-deep">
                <Icon name="alert" size={15} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-accent-deep">
                Este arquivo mudou no disco
                {active.diskMtime
                  ? ` às ${new Date(active.diskMtime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}{" "}
                enquanto você editava.
              </span>
              <button
                className="h-7 flex-none rounded-lg bg-accent px-3 text-[12px] font-semibold text-white hover:bg-accent-deep"
                onClick={() => resolveConflict("disk")}
              >
                Recarregar do disco
              </button>
              <button
                className="h-7 flex-none rounded-lg border border-accent/50 bg-card px-3 text-[12px] font-semibold text-accent-deep hover:border-accent"
                onClick={() => resolveConflict("draft")}
              >
                Manter meu rascunho
              </button>
            </div>
          )}

          {searchOpen && active !== null && mode === "rich" && (
            <SearchBar
              getRoot={() => document.querySelector<HTMLElement>(".doc-prose")}
              focusTick={searchFocusTick}
              onClose={() => setSearchOpen(false)}
            />
          )}

          {/* biome-ignore lint/a11y/noStaticElementInteractions: clique na margem foca o editor; o editor em si já é interativo */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: idem — interação por teclado acontece dentro do editor */}
          <div
            className={`mx-auto max-w-[780px] px-14 py-12 ${active !== null && mode === "rich" ? "" : "hidden"}`}
            onClick={() => editor?.commands.focus()}
          >
            <EditorContent editor={editor} />
          </div>

          {active !== null && mode === "source" && (
            <div className="mx-auto h-full max-w-[880px] px-8 py-7">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line-strong bg-card shadow-[0_14px_34px_-22px_rgba(33,29,25,0.45)]">
                <div className="flex h-9 flex-none items-center justify-between border-b border-line bg-paper-deep/60 pl-4 pr-2">
                  <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                    Markdown
                  </span>
                  <CopyButton
                    getText={() =>
                      docsRef.current.find((d) => d.id === activeIdRef.current)?.markdown ?? ""
                    }
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
                  <SourceEditor
                    key={`${active.id}:${sourceKey}`}
                    value={active.markdown}
                    onChange={(md) => {
                      onSourceChange(md);
                      setCmHistoryTick((t) => t + 1);
                    }}
                    onViewReady={(view) => {
                      cmViewRef.current = view;
                      setCmHistoryTick((t) => t + 1);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {dropping && (
            <div className="pointer-events-none absolute inset-3 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-accent-wash/70 backdrop-blur-sm">
              <span className="rounded-xl bg-card px-5 py-3 text-[14px] font-semibold text-accent-deep shadow-lg">
                Solte para abrir o arquivo
              </span>
            </div>
          )}
        </main>
      </div>

      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}

      {active !== null && (
        <StatusBar stats={stats} path={active.path} dirty={dirty} message={message} />
      )}
      {active === null && message && (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-paper shadow-xl"
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
