/**
 * Build completo do app macOS:
 *  1. vite build (frontend → dist/)
 *  2. gen-embed (dist/ → desktop/embedded.ts)
 *  3. bun build --compile (binário único)
 *  4. monta "build/Markdown Studio.app" com launcher + dylib do webview
 */
import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const APP_NAME = "Markdown Studio";
const APP_DIR = join(ROOT, "build", `${APP_NAME}.app`);

async function run(cmd: string[], cwd = ROOT): Promise<void> {
  console.log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`Comando falhou (${code}): ${cmd.join(" ")}`);
    process.exit(code);
  }
}

// 1. fontes embutidas + frontend
await run(["bun", "run", "scripts/gen-fonts.ts"]);
await run(["bunx", "vite", "build"]);

// 2. embed
await run(["bun", "run", "scripts/gen-embed.ts"]);

// 3. binário
await rm(join(ROOT, "build"), { recursive: true, force: true });
await mkdir(join(ROOT, "build"), { recursive: true });
await run([
  "bun",
  "build",
  "--compile",
  "--minify",
  "desktop/main.ts",
  "desktop/worker.ts",
  "--outfile",
  "build/markdown-studio-bin",
]);

// 4. bundle .app
const macos = join(APP_DIR, "Contents", "MacOS");
const resources = join(APP_DIR, "Contents", "Resources");
await mkdir(macos, { recursive: true });
await mkdir(resources, { recursive: true });

await cp(join(ROOT, "build", "markdown-studio-bin"), join(macos, "markdown-studio-bin"));
await cp(
  join(ROOT, "node_modules", "webview-bun", "build", "libwebview.dylib"),
  join(resources, "libwebview.dylib"),
);
await cp(join(ROOT, "assets", "icon.icns"), join(resources, "icon.icns"));

const launcher = `#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
export WEBVIEW_PATH="$DIR/../Resources/libwebview.dylib"
exec "$DIR/markdown-studio-bin" "$@"
`;
await Bun.write(join(macos, "launcher"), launcher);
await chmod(join(macos, "launcher"), 0o755);
await chmod(join(macos, "markdown-studio-bin"), 0o755);

const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key><string>${APP_NAME}</string>
  <key>CFBundleIdentifier</key><string>com.emerson.markdownstudio</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHumanReadableCopyright</key><string>© 2026 Emerson</string>
  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeName</key><string>Markdown</string>
      <key>CFBundleTypeRole</key><string>Editor</string>
      <key>CFBundleTypeExtensions</key>
      <array><string>md</string><string>markdown</string><string>mdown</string></array>
    </dict>
  </array>
</dict>
</plist>
`;
await Bun.write(join(APP_DIR, "Contents", "Info.plist"), infoPlist);

await rm(join(ROOT, "build", "markdown-studio-bin"));
console.log(`\n✅ App pronto: ${APP_DIR}`);
console.log(`   Instalar: cp -R "${APP_DIR}" /Applications/`);
