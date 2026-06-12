/**
 * Gera src/shared/embeddedFonts.ts com as fontes do documento em base64,
 * para que exports HTML/PDF/impressão fiquem idênticos ao render do app.
 */
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const FONTS = [
  {
    family: "Newsreader Variable",
    style: "normal",
    weight: "200 800",
    file: "node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2",
  },
  {
    family: "Newsreader Variable",
    style: "italic",
    weight: "200 800",
    file: "node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2",
  },
  {
    family: "JetBrains Mono",
    style: "normal",
    weight: "400",
    file: "node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
  },
] as const;

let css = "";
for (const font of FONTS) {
  const data = await Bun.file(join(ROOT, font.file)).arrayBuffer();
  const b64 = Buffer.from(data).toString("base64");
  css += `@font-face{font-family:"${font.family}";font-style:${font.style};font-weight:${font.weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2");}\n`;
}

const out = `// GERADO por scripts/gen-fonts.ts — não editar manualmente.
export const EMBEDDED_FONTS_CSS = ${JSON.stringify(css)};
`;
await Bun.write(join(ROOT, "src", "shared", "embeddedFonts.ts"), out);
console.log(`embeddedFonts.ts gerado (${(css.length / 1024).toFixed(0)} KB).`);
