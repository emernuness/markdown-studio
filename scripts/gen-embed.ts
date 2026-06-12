/**
 * Varre dist/ e gera desktop/embedded.ts com imports `with { type: "file" }`
 * para que `bun build --compile` embuta os assets do frontend no binário.
 */
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const files = (await walk(DIST)).filter((f) => !f.endsWith(".map"));
let imports = "";
let entries = "";
files.forEach((file, i) => {
  const route = `/${relative(DIST, file)}`;
  imports += `import f${i} from "../dist${route}" with { type: "file" };\n`;
  entries += `  ${JSON.stringify(route)}: f${i},\n`;
});

const output = `// @ts-nocheck — GERADO por scripts/gen-embed.ts; imports "with file" não têm tipos.
// biome-ignore-all lint: arquivo gerado
${imports}
export const EMBEDDED: Record<string, string> = {
${entries}};
`;

await Bun.write(join(ROOT, "desktop", "embedded.ts"), output);
console.log(`embedded.ts gerado com ${files.length} assets.`);
