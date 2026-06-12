/**
 * Garante que os arquivos gerados existam após o clone (rodado no "prepare" do bun install).
 * - desktop/embedded.ts: stub vazio (o build real é gerado por gen-embed.ts)
 * - src/shared/embeddedFonts.ts: gerado a partir das fontes do node_modules
 */
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const embeddedPath = join(ROOT, "desktop", "embedded.ts");
if (!(await Bun.file(embeddedPath).exists())) {
  await Bun.write(
    embeddedPath,
    '// GERADO por scripts/gen-embed.ts antes do build do binário. Stub vazio em dev.\nexport const EMBEDDED: Record<string, string> = {};\n',
  );
  console.log("desktop/embedded.ts (stub) criado.");
}

const fontsPath = join(ROOT, "src", "shared", "embeddedFonts.ts");
if (!(await Bun.file(fontsPath).exists())) {
  const proc = Bun.spawn(["bun", "run", join(ROOT, "scripts", "gen-fonts.ts")], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}
