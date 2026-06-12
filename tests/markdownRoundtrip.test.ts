// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { buildEditorExtensions, getMarkdown } from "../src/lib/useMarkdownEditor";

function roundtrip(markdown: string): string {
  const editor = new Editor({
    extensions: buildEditorExtensions(),
    content: "",
  });
  editor.commands.setContent(markdown, false);
  const result = getMarkdown(editor);
  editor.destroy();
  return result;
}

describe("roundtrip markdown → editor → markdown", () => {
  it("preserva títulos, negrito e itálico", () => {
    const md = "# Título\n\nTexto **negrito** e *itálico*.";
    const out = roundtrip(md);
    expect(out).toContain("# Título");
    expect(out).toContain("**negrito**");
    expect(out).toContain("*itálico*");
  });

  it("preserva tabelas GFM", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const out = roundtrip(md);
    expect(out).toContain("| A | B |");
    expect(out).toContain("| 1 | 2 |");
  });

  it("preserva estado de checkbox em listas de tarefas", () => {
    const md = "- [x] feita\n- [ ] pendente";
    const out = roundtrip(md);
    expect(out).toContain("[x] feita");
    expect(out).toContain("[ ] pendente");
  });

  it("preserva cor de texto como HTML inline", () => {
    const md = 'Cor <span style="color:#bc4b27">terracota</span> aqui';
    const out = roundtrip(md);
    expect(out).toMatch(
      /<span style="color:\s*(#bc4b27|rgb\(188,\s*75,\s*39\))[^"]*">terracota<\/span>/,
    );
  });

  it("preserva blocos de código com linguagem", () => {
    const md = "```js\nconst x = 1;\n```";
    const out = roundtrip(md);
    expect(out).toContain("```js");
    expect(out).toContain("const x = 1;");
  });
});
