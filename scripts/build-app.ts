/**
 * Build completo do app macOS:
 *  1. vite build (frontend → dist/)
 *  2. gen-embed (dist/ → desktop/embedded.ts)
 *  3. bun build --compile (binário único)
 *  4. monta "build/Markdown Studio.app" com launcher + dylib do webview
 *  5. (opcional) assina com Developer ID, gera DMG, notariza e grampeia
 *
 * Assinatura e notarização são autodetectadas e nunca quebram o build:
 *  - identidade: env MDSTUDIO_SIGN_IDENTITY ou a primeira "Developer ID Application" do Keychain
 *  - notarização: perfil do Keychain em env MDSTUDIO_NOTARY_PROFILE (padrão "mdstudio-notary")
 *  - flag --dmg gera o instalador em release/ (assinado e notarizado quando possível)
 */
import { chmod, cp, mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const APP_NAME = "Markdown Studio";
const APP_DIR = join(ROOT, "build", `${APP_NAME}.app`);
const VERSION = "1.0.0";
const WANT_DMG = process.argv.includes("--dmg");
const NOTARY_PROFILE = process.env.MDSTUDIO_NOTARY_PROFILE ?? "mdstudio-notary";

async function run(cmd: string[], cwd = ROOT): Promise<void> {
  console.log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`Comando falhou (${code}): ${cmd.join(" ")}`);
    process.exit(code);
  }
}

async function capture(cmd: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out: out + err };
}

async function findSignIdentity(): Promise<string | null> {
  if (process.env.MDSTUDIO_SIGN_IDENTITY) return process.env.MDSTUDIO_SIGN_IDENTITY;
  const { out } = await capture(["security", "find-identity", "-v", "-p", "codesigning"]);
  const match = out.match(/"(Developer ID Application: [^"]+)"/);
  return match?.[1] ?? null;
}

async function hasNotaryProfile(): Promise<boolean> {
  const { out } = await capture([
    "xcrun",
    "notarytool",
    "history",
    "--keychain-profile",
    NOTARY_PROFILE,
  ]);
  return !out.includes("No Keychain password item found");
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

// 5. Assinatura (Developer ID) quando houver identidade no Keychain
const identity = await findSignIdentity();
const entitlements = join(ROOT, "scripts", "entitlements.plist");
if (identity) {
  console.log(`\nAssinando com: ${identity}`);
  // De dentro pra fora: dylib → binário (hardened runtime + entitlements) → bundle
  await run([
    "codesign",
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--sign",
    identity,
    join(resources, "libwebview.dylib"),
  ]);
  await run([
    "codesign",
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--entitlements",
    entitlements,
    "--sign",
    identity,
    join(macos, "markdown-studio-bin"),
  ]);
  await run([
    "codesign",
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--entitlements",
    entitlements,
    "--sign",
    identity,
    APP_DIR,
  ]);
  await run(["codesign", "--verify", "--deep", "--strict", APP_DIR]);
} else {
  console.log("\nSem identidade Developer ID no Keychain: app sem assinatura (ok para uso local).");
}

console.log(`\n✅ App pronto: ${APP_DIR}`);
console.log(`   Instalar: cp -R "${APP_DIR}" /Applications/`);

// 6. DMG + notarização (com --dmg)
if (WANT_DMG) {
  const releaseDir = join(ROOT, "release");
  const dmgPath = join(releaseDir, `MarkdownStudio-${VERSION}.dmg`);
  const staging = join(ROOT, "build", "dmg-staging");
  await rm(staging, { recursive: true, force: true });
  await rm(dmgPath, { force: true });
  await mkdir(staging, { recursive: true });
  await mkdir(releaseDir, { recursive: true });
  await cp(APP_DIR, join(staging, `${APP_NAME}.app`), { recursive: true });
  await symlink("/Applications", join(staging, "Applications"));
  await run([
    "hdiutil",
    "create",
    "-volname",
    APP_NAME,
    "-srcfolder",
    staging,
    "-ov",
    "-format",
    "UDZO",
    dmgPath,
  ]);
  await rm(staging, { recursive: true, force: true });

  if (identity) {
    await run(["codesign", "--force", "--timestamp", "--sign", identity, dmgPath]);
    if (await hasNotaryProfile()) {
      console.log(`\nNotarizando (perfil "${NOTARY_PROFILE}")…`);
      await run([
        "xcrun",
        "notarytool",
        "submit",
        dmgPath,
        "--keychain-profile",
        NOTARY_PROFILE,
        "--wait",
      ]);
      await run(["xcrun", "stapler", "staple", dmgPath]);
      console.log("Notarização concluída e grampeada no DMG.");
    } else {
      console.log(
        `\nPerfil "${NOTARY_PROFILE}" ausente no Keychain: DMG assinado, mas sem notarização.`,
      );
      console.log(
        `Crie com: xcrun notarytool store-credentials ${NOTARY_PROFILE} --apple-id SEU_ID --team-id TEAM`,
      );
    }
  }
  console.log(`\n📦 Instalador: ${dmgPath}`);
}
