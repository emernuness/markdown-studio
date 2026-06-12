/**
 * Template de documento standalone usado em todos os exports (HTML, PDF, DOCX, RTF e impressão).
 * Espelha exatamente a tipografia do app (.doc-prose) com as fontes embutidas em base64,
 * garantindo fidelidade máxima entre o que se vê no app e o que sai no PDF/impressão.
 */
import { EMBEDDED_FONTS_CSS } from "./embeddedFonts";

const DOC_CSS = `
  :root {
    --paper: #ffffff;
    --paper-deep: #efece3;
    --ink: #211d19;
    --ink-soft: #5c554d;
    --ink-faint: #9b938a;
    --line: #e4dfd4;
    --line-strong: #d3ccbe;
    --accent: #bc4b27;
    --accent-deep: #9c3a1b;
  }
  * { box-sizing: border-box; }
  html { background: var(--paper); }
  body {
    font-family: "Newsreader Variable", "Iowan Old Style", Georgia, serif;
    font-size: 17.5px;
    line-height: 1.72;
    font-variation-settings: "opsz" 17;
    color: var(--ink);
    max-width: 780px;
    margin: 0 auto;
    padding: 56px 56px 96px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body > * + * { margin-top: 0.85em; }
  body > :first-child { margin-top: 0; }
  h1, h2, h3, h4 {
    font-weight: 600;
    line-height: 1.22;
    letter-spacing: -0.012em;
    font-variation-settings: "opsz" 60;
    page-break-after: avoid;
  }
  h1 { font-size: 2.3em; margin-top: 1.1em; }
  h2 { font-size: 1.65em; margin-top: 1.4em; }
  h3 { font-size: 1.28em; margin-top: 1.3em; }
  h4 { font-size: 1.08em; margin-top: 1.2em; }
  a {
    color: var(--accent-deep);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  strong { font-weight: 650; }
  blockquote {
    border-left: 3px solid var(--accent);
    margin: 0.85em 0;
    padding: 2px 0 2px 20px;
    color: var(--ink-soft);
    font-style: italic;
  }
  hr { border: none; margin: 2.2em auto; }
  hr::before {
    content: "···";
    display: block;
    text-align: center;
    color: var(--ink-faint);
    font-size: 1.4em;
    letter-spacing: 0.8em;
    margin-left: 0.8em;
  }
  code {
    font-family: "JetBrains Mono", "SF Mono", Menlo, monospace;
    font-size: 0.82em;
    background: var(--paper-deep);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 0.12em 0.38em;
  }
  pre {
    font-family: "JetBrains Mono", "SF Mono", Menlo, monospace;
    font-size: 0.8em;
    line-height: 1.6;
    background: #221e1a;
    color: #ece7df;
    border-radius: 12px;
    padding: 18px 22px;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  pre code { background: none; border: none; padding: 0; font-size: inherit; color: inherit; }
  ul, ol { padding-left: 1.5em; margin: 0.85em 0 0; }
  li + li { margin-top: 0.3em; }
  li::marker { color: var(--ink-faint); }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1.4em 0;
    font-size: 0.92em;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid var(--line-strong);
    padding: 8px 12px;
    vertical-align: top;
    text-align: left;
  }
  th { background: var(--paper-deep); font-weight: 600; }
  img { max-width: 100%; border-radius: 10px; }
  mark { border-radius: 3px; padding: 0.05em 0.15em; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0.2em; }
  ul[data-type="taskList"] li { display: flex; gap: 10px; align-items: baseline; }
  ul[data-type="taskList"] input[type="checkbox"] {
    accent-color: var(--accent);
    width: 15px;
    height: 15px;
    transform: translateY(2px);
  }
  ul[data-type="taskList"] li[data-checked="true"] > div {
    color: var(--ink-faint);
    text-decoration: line-through;
  }
  @media print {
    body { padding: 0; max-width: none; }
    @page { margin: 1.8cm 2cm; }
  }
`;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildStandaloneHtml(bodyHtml: string, title: string, autoPrint = false): string {
  const printScript = autoPrint
    ? "<script>addEventListener('load',()=>setTimeout(()=>print(),400));</script>"
    : "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${EMBEDDED_FONTS_CSS}</style>
<style>${DOC_CSS}</style>
${printScript}
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
