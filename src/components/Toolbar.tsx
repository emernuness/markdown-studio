import type { Editor } from "@tiptap/react";
import { useState } from "react";
import type { ExportFormat, ViewMode } from "../lib/types";
import { Icon } from "./Icon";
import { Popover } from "./Popover";

const TEXT_COLORS = [
  { name: "Tinta", value: "" },
  { name: "Terracota", value: "#bc4b27" },
  { name: "Âmbar", value: "#a16207" },
  { name: "Floresta", value: "#3f6f4f" },
  { name: "Petróleo", value: "#2f6072" },
  { name: "Ameixa", value: "#8a4055" },
  { name: "Rosa", value: "#be185d" },
  { name: "Grafite", value: "#6e675e" },
];

const HIGHLIGHT_COLORS = [
  { name: "Sol", value: "#fde68a" },
  { name: "Pêssego", value: "#fed7aa" },
  { name: "Rosa", value: "#fbcfe8" },
  { name: "Menta", value: "#bbf7d0" },
  { name: "Céu", value: "#bfdbfe" },
  { name: "Lavanda", value: "#e9d5ff" },
];

const BLOCK_TYPES = [
  { id: "p", label: "Parágrafo" },
  { id: "h1", label: "Título 1" },
  { id: "h2", label: "Título 2" },
  { id: "h3", label: "Título 3" },
  { id: "h4", label: "Título 4" },
] as const;

interface ToolbarProps {
  editor: Editor | null;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onExport: (format: ExportFormat) => void;
  onPrint: () => void;
  hasDocument: boolean;
  dirty: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onRename: () => void;
  onShowShortcuts: () => void;
  outlineOpen: boolean;
  onToggleOutline: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function ToolButton({
  icon,
  title,
  active = false,
  disabled = false,
  toggle = false,
  onClick,
}: {
  icon: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  /** Botões liga/desliga anunciam estado via aria-pressed (sempre booleano). */
  toggle?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`toolbar-btn ${active ? "is-active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={toggle ? active : undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
}

function blockTypeOf(editor: Editor): (typeof BLOCK_TYPES)[number] {
  for (const level of [1, 2, 3, 4] as const) {
    if (editor.isActive("heading", { level })) {
      return BLOCK_TYPES[level] ?? BLOCK_TYPES[0];
    }
  }
  return BLOCK_TYPES[0];
}

function setBlockType(editor: Editor, id: string) {
  const chain = editor.chain().focus();
  if (id === "p") chain.setParagraph().run();
  else chain.toggleHeading({ level: Number(id[1]) as 1 | 2 | 3 | 4 }).run();
}

function PopoverInput({
  value,
  placeholder,
  ariaLabel,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSubmit()}
      placeholder={placeholder}
      className="h-8 rounded-lg border border-line-strong bg-paper px-2.5 text-[13px] outline-none focus:border-accent"
    />
  );
}

function LinkForm({ editor, close }: { editor: Editor; close: () => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [url, setUrl] = useState(current);
  const apply = () => {
    const chain = editor.chain().focus().extendMarkRange("link");
    if (url.trim()) chain.setLink({ href: url.trim() }).run();
    else chain.unsetLink().run();
    close();
  };
  return (
    <div className="flex w-64 flex-col gap-2 p-2">
      <span className="text-xs font-semibold text-ink-soft">Link</span>
      <PopoverInput
        value={url}
        placeholder="https://…"
        ariaLabel="Endereço do link"
        onChange={setUrl}
        onSubmit={apply}
      />
      <div className="flex justify-end gap-2">
        {current && (
          <button
            className="toolbar-btn"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              close();
            }}
          >
            Remover
          </button>
        )}
        <button
          className="h-7 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-white hover:bg-accent-deep"
          onClick={apply}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function ImageForm({ editor, close }: { editor: Editor; close: () => void }) {
  const [url, setUrl] = useState("");
  const apply = () => {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
    close();
  };
  return (
    <div className="flex w-64 flex-col gap-2 p-2">
      <span className="text-xs font-semibold text-ink-soft">Imagem (URL ou caminho)</span>
      <PopoverInput
        value={url}
        placeholder="https://… ou /Users/…/foto.png"
        ariaLabel="Endereço da imagem"
        onChange={setUrl}
        onSubmit={apply}
      />
      <div className="flex justify-end">
        <button
          className="h-7 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-white hover:bg-accent-deep"
          onClick={apply}
        >
          Inserir
        </button>
      </div>
    </div>
  );
}

function TableMenu({ editor, close }: { editor: Editor; close: () => void }) {
  const inTable = editor.isActive("table");
  const run = (fn: () => void) => {
    fn();
    close();
  };
  return (
    <div className="flex flex-col">
      <button
        className="menu-item"
        onClick={() =>
          run(() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          )
        }
      >
        <Icon name="table" /> Inserir tabela 3×3
      </button>
      {inTable && (
        <>
          <div className="mx-2 my-1 h-px bg-line" />
          <button
            className="menu-item"
            onClick={() => run(() => editor.chain().focus().addRowBefore().run())}
          >
            <Icon name="rowAbove" /> Linha acima
          </button>
          <button
            className="menu-item"
            onClick={() => run(() => editor.chain().focus().addRowAfter().run())}
          >
            <Icon name="rowBelow" /> Linha abaixo
          </button>
          <button
            className="menu-item"
            onClick={() => run(() => editor.chain().focus().addColumnBefore().run())}
          >
            <Icon name="colLeft" /> Coluna à esquerda
          </button>
          <button
            className="menu-item"
            onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}
          >
            <Icon name="colRight" /> Coluna à direita
          </button>
          <div className="mx-2 my-1 h-px bg-line" />
          <button
            className="menu-item"
            onClick={() => run(() => editor.chain().focus().deleteRow().run())}
          >
            <Icon name="trash" /> Excluir linha
          </button>
          <button
            className="menu-item"
            onClick={() => run(() => editor.chain().focus().deleteColumn().run())}
          >
            <Icon name="trash" /> Excluir coluna
          </button>
          <button
            className="menu-item text-accent-deep"
            onClick={() => run(() => editor.chain().focus().deleteTable().run())}
          >
            <Icon name="trash" /> Excluir tabela
          </button>
        </>
      )}
    </div>
  );
}

export function Toolbar({
  editor,
  mode,
  onModeChange,
  onExport,
  onPrint,
  hasDocument,
  dirty,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onRename,
  onShowShortcuts,
  outlineOpen,
  onToggleOutline,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const rich = mode === "rich" && editor !== null && hasDocument;
  const block = editor && rich ? blockTypeOf(editor) : BLOCK_TYPES[0];
  const currentColor =
    editor && rich ? ((editor.getAttributes("textStyle").color as string | undefined) ?? "") : "";

  const blockSelect = (
    <Popover
      trigger={(open, toggle) => (
        <button
          className={`toolbar-btn w-[104px] justify-between ${open ? "is-active" : ""}`}
          disabled={!rich}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="true"
          title="Estilo de bloco"
        >
          {block.label}
          <Icon name="chevron" size={13} />
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          {BLOCK_TYPES.map((b) => (
            <button
              key={b.id}
              className="menu-item"
              onClick={() => {
                if (editor) setBlockType(editor, b.id);
                close();
              }}
            >
              <span
                className={
                  b.id === "p" ? "" : `font-prose font-semibold ${b.id === "h1" ? "text-lg" : ""}`
                }
              >
                {b.label}
              </span>
              {block.id === b.id && (
                <span className="ml-auto text-accent">
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );

  const marks = (
    <>
      <ToolButton
        icon="bold"
        title="Negrito (⌘B)"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("bold")}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolButton
        icon="italic"
        title="Itálico (⌘I)"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("italic")}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolButton
        icon="underline"
        title="Sublinhado (⌘U)"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("underline")}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />
      <ToolButton
        icon="strike"
        title="Tachado"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("strike")}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      />
      <ToolButton
        icon="code"
        title="Código inline"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("code")}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      />

      <Popover
        trigger={(open, toggle) => (
          <button
            className={`toolbar-btn ${open ? "is-active" : ""}`}
            disabled={!rich}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="true"
            title="Cor do texto"
          >
            <span
              className="flex h-4 w-4 items-center justify-center border-b-2 font-prose text-[13px] font-semibold leading-none"
              style={{
                borderColor: currentColor || "var(--color-ink)",
                color: currentColor || "inherit",
              }}
            >
              A
            </span>
          </button>
        )}
      >
        {(close) => (
          <div className="grid grid-cols-4 gap-1.5 p-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                title={c.name}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line hover:border-line-strong"
                style={{ color: c.value || "var(--color-ink)" }}
                onClick={() => {
                  if (!editor) return;
                  if (c.value) editor.chain().focus().setColor(c.value).run();
                  else editor.chain().focus().unsetColor().run();
                  close();
                }}
              >
                <span className="font-prose text-[15px] font-semibold">A</span>
              </button>
            ))}
          </div>
        )}
      </Popover>

      <Popover
        trigger={(open, toggle) => (
          <button
            className={`toolbar-btn ${open || (rich && editor?.isActive("highlight")) ? "is-active" : ""}`}
            disabled={!rich}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="true"
            title="Marca-texto"
          >
            <Icon name="highlighter" />
          </button>
        )}
      >
        {(close) => (
          <div className="flex flex-col gap-1.5 p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.name}
                  title={c.name}
                  className="h-8 w-8 rounded-lg border border-line hover:scale-105"
                  style={{ background: c.value }}
                  onClick={() => {
                    editor?.chain().focus().setHighlight({ color: c.value }).run();
                    close();
                  }}
                />
              ))}
            </div>
            <button
              className="menu-item justify-center"
              onClick={() => {
                editor?.chain().focus().unsetHighlight().run();
                close();
              }}
            >
              Remover marcação
            </button>
          </div>
        )}
      </Popover>
    </>
  );

  const lists = (
    <>
      <ToolButton
        icon="listUl"
        title="Lista"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("bulletList")}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      />
      <ToolButton
        icon="listOl"
        title="Lista numerada"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("orderedList")}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      />
      <ToolButton
        icon="task"
        title="Lista de tarefas"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("taskList")}
        onClick={() => editor?.chain().focus().toggleTaskList().run()}
      />
      <ToolButton
        icon="quote"
        title="Citação"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("blockquote")}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      />
      <ToolButton
        icon="codeblock"
        title="Bloco de código"
        disabled={!rich}
        toggle
        active={rich && editor?.isActive("codeBlock")}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      />
    </>
  );

  const inserts = (
    <>
      <Popover
        trigger={(open, toggle) => (
          <button
            className={`toolbar-btn ${open || (rich && editor?.isActive("table")) ? "is-active" : ""}`}
            disabled={!rich}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="true"
            title="Tabela"
          >
            <Icon name="table" />
            <Icon name="chevron" size={12} />
          </button>
        )}
      >
        {(close) => (editor ? <TableMenu editor={editor} close={close} /> : null)}
      </Popover>

      <Popover
        trigger={(open, toggle) => (
          <button
            className={`toolbar-btn ${open || (rich && editor?.isActive("link")) ? "is-active" : ""}`}
            disabled={!rich}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="true"
            title="Link"
          >
            <Icon name="link" />
          </button>
        )}
      >
        {(close) => (editor ? <LinkForm editor={editor} close={close} /> : null)}
      </Popover>

      <Popover
        trigger={(open, toggle) => (
          <button
            className={`toolbar-btn ${open ? "is-active" : ""}`}
            disabled={!rich}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="true"
            title="Imagem"
          >
            <Icon name="image" />
          </button>
        )}
      >
        {(close) => (editor ? <ImageForm editor={editor} close={close} /> : null)}
      </Popover>

      <ToolButton
        icon="hr"
        title="Divisor"
        disabled={!rich}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      />
    </>
  );

  return (
    <div className="flex min-w-0 items-center gap-0.5 px-1.5">
      <Popover
        trigger={(open, toggle) => (
          <button
            className={`toolbar-btn ${open ? "is-active" : ""}`}
            onClick={toggle}
            aria-expanded={open}
            aria-haspopup="true"
            title="Arquivo"
          >
            <Icon name="doc" />
            <span className="toolbar-label text-[12.5px]">Arquivo</span>
            <Icon name="chevron" size={12} />
          </button>
        )}
      >
        {(close) => (
          <div className="flex w-56 flex-col">
            <button
              className="menu-item"
              onClick={() => {
                onNew();
                close();
              }}
            >
              <Icon name="filePlus" /> Novo documento <kbd>⌘N</kbd>
            </button>
            <button
              className="menu-item"
              onClick={() => {
                onOpen();
                close();
              }}
            >
              <Icon name="folder" /> Abrir… <kbd>⌘O</kbd>
            </button>
            <div className="mx-2 my-1 h-px bg-line" />
            <button
              className="menu-item"
              disabled={!hasDocument || !dirty}
              onClick={() => {
                onSave();
                close();
              }}
            >
              <Icon name="save" /> Salvar <kbd>⌘S</kbd>
            </button>
            <button
              className="menu-item"
              disabled={!hasDocument}
              onClick={() => {
                onSaveAs();
                close();
              }}
            >
              <Icon name="save" /> Salvar como… <kbd>⇧⌘S</kbd>
            </button>
            <button
              className="menu-item"
              disabled={!hasDocument}
              onClick={() => {
                onRename();
                close();
              }}
            >
              <Icon name="pencil" /> Renomear arquivo
            </button>
            <div className="mx-2 my-1 h-px bg-line" />
            <button
              className="menu-item"
              onClick={() => {
                onShowShortcuts();
                close();
              }}
            >
              <Icon name="more" /> Atalhos do teclado <kbd>⌘/</kbd>
            </button>
          </div>
        )}
      </Popover>

      <ToolButton
        icon="save"
        title={dirty ? "Salvar (⌘S)" : "Salvo"}
        disabled={!hasDocument || !dirty}
        onClick={onSave}
      />

      <div className="toolbar-sep" />

      <ToolButton
        icon="undo"
        title="Desfazer (⌘Z)"
        disabled={!hasDocument || !canUndo}
        onClick={onUndo}
      />
      <ToolButton
        icon="redo"
        title="Refazer (⇧⌘Z)"
        disabled={!hasDocument || !canRedo}
        onClick={onRedo}
      />

      <div className="tb-group g-block">
        <div className="toolbar-sep" />
        {blockSelect}
      </div>
      <div className="tb-group g-marks">
        <div className="toolbar-sep" />
        {marks}
      </div>
      <div className="tb-group g-lists">
        <div className="toolbar-sep" />
        {lists}
      </div>
      <div className="tb-group g-insert">
        <div className="toolbar-sep" />
        {inserts}
      </div>

      <div className="ml-auto flex flex-none items-center gap-1.5 pl-1.5">
        <span className="tb-more">
          <Popover
            align="right"
            trigger={(open, toggle) => (
              <button
                className={`toolbar-btn ${open ? "is-active" : ""}`}
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="true"
                title="Mais ferramentas"
              >
                <Icon name="more" strokeWidth={2.6} />
              </button>
            )}
          >
            {() => (
              <div className="flex max-w-72 flex-col gap-1 p-1.5">
                <div className="og-block og-row">{blockSelect}</div>
                <div className="og-marks og-row">{marks}</div>
                <div className="og-lists og-row">{lists}</div>
                <div className="og-insert og-row">{inserts}</div>
              </div>
            )}
          </Popover>
        </span>

        <ToolButton
          icon="outline"
          title="Estrutura do documento (⌥⌘O)"
          toggle
          disabled={!hasDocument || mode !== "rich"}
          active={outlineOpen && mode === "rich"}
          onClick={onToggleOutline}
        />

        <div className="flex items-center rounded-lg bg-paper-deep p-0.5">
          <button
            className={`flex h-[26px] items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] font-semibold transition-colors ${
              mode === "rich" ? "bg-card text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
            }`}
            disabled={!hasDocument}
            aria-pressed={mode === "rich"}
            onClick={() => onModeChange("rich")}
            title="Visual renderizado (⇧⌘E)"
          >
            <Icon name="eye" size={14} />
            <span className="toolbar-label">Visual</span>
          </button>
          <button
            className={`flex h-[26px] items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] font-semibold transition-colors ${
              mode === "source"
                ? "bg-card text-ink shadow-sm"
                : "text-ink-faint hover:text-ink-soft"
            }`}
            disabled={!hasDocument}
            aria-pressed={mode === "source"}
            onClick={() => onModeChange("source")}
            title="Código markdown (⇧⌘E)"
          >
            <Icon name="code" size={14} />
            <span className="toolbar-label">Código</span>
          </button>
        </div>

        <Popover
          align="right"
          trigger={(open, toggle) => (
            <button
              className={`toolbar-btn ${open ? "is-active" : ""}`}
              disabled={!hasDocument}
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="true"
              title="Exportar"
            >
              <Icon name="export" />
              <span className="toolbar-label text-[12.5px]">Exportar</span>
            </button>
          )}
        >
          {(close) => (
            <div className="flex flex-col">
              {(
                [
                  ["pdf", "PDF", "doc"],
                  ["html", "HTML", "code"],
                  ["docx", "Word (DOCX)", "doc"],
                  ["rtf", "RTF", "doc"],
                ] as const
              ).map(([fmt, label, icon]) => (
                <button
                  key={fmt}
                  className="menu-item"
                  onClick={() => {
                    onExport(fmt as ExportFormat);
                    close();
                  }}
                >
                  <Icon name={icon} /> {label}
                </button>
              ))}
              <div className="mx-2 my-1 h-px bg-line" />
              <button
                className="menu-item"
                onClick={() => {
                  onSaveAs();
                  close();
                }}
              >
                <Icon name="save" /> Markdown (.md)
              </button>
            </div>
          )}
        </Popover>

        <ToolButton
          icon="printer"
          title="Imprimir (⌘P)"
          disabled={!hasDocument}
          onClick={onPrint}
        />
      </div>
    </div>
  );
}
