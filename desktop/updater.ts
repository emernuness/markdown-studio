/**
 * Verificação e instalação de atualizações a partir das releases públicas do GitHub.
 *
 * Segurança: uma atualização só é instalada depois de passar por TRÊS verificações
 * sobre o app baixado: assinatura válida (codesign), notarização aceita (spctl) e
 * Team ID idêntico ao do certificado oficial. Sem isso, a instalação é abortada.
 * Assim, mesmo que a origem do download fosse adulterada, um app não confiável
 * nunca substitui o instalado.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_VERSION, REPO, TEAM_ID } from "./version";

export interface UpdateInfo {
  available: boolean;
  current: string;
  latest: string;
  notes: string;
  releaseUrl: string;
  dmgUrl: string | null;
}

interface GithubAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  assets: GithubAsset[];
}

/** Compara "1.2.0" e "1.10.3" numericamente. Retorna true se `b` é mais novo que `a`. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (y > x) return true;
    if (y < x) return false;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Markdown-Studio" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
  const release = (await res.json()) as GithubRelease;
  const latest = release.tag_name.replace(/^v/, "");
  const dmg = release.assets.find((a) => a.name.toLowerCase().endsWith(".dmg"));
  return {
    available: isNewer(APP_VERSION, latest),
    current: APP_VERSION,
    latest,
    notes: release.body ?? "",
    releaseUrl: release.html_url,
    dmgUrl: dmg?.browser_download_url ?? null,
  };
}

async function run(cmd: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out: out + err };
}

/** Verifica assinatura, notarização e Team ID do app baixado. */
async function verifyApp(appPath: string): Promise<{ ok: boolean; reason?: string }> {
  const sign = await run(["codesign", "--verify", "--deep", "--strict", appPath]);
  if (sign.code !== 0) return { ok: false, reason: "assinatura inválida" };

  const gatekeeper = await run(["spctl", "--assess", "--type", "execute", appPath]);
  if (gatekeeper.code !== 0)
    return { ok: false, reason: "não passou no Gatekeeper (sem notarização)" };

  const info = await run(["codesign", "-dvvv", appPath]);
  if (!info.out.includes(`TeamIdentifier=${TEAM_ID}`)) {
    return { ok: false, reason: "Team ID diferente do oficial" };
  }
  return { ok: true };
}

/**
 * Baixa o DMG, monta, verifica o app e o instala substituindo o atual.
 * A troca em si roda num script destacado que espera o app encerrar, troca os
 * arquivos e reabre o app já atualizado.
 */
export async function installUpdate(dmgUrl: string): Promise<{ ok: boolean; error?: string }> {
  if (!dmgUrl.startsWith("https://")) return { ok: false, error: "URL inseguro" };

  const stamp = Date.now();
  const dmgPath = join(tmpdir(), `mdstudio-update-${stamp}.dmg`);
  const mountPoint = join(tmpdir(), `mdstudio-mount-${stamp}`);
  const stagedApp = join(tmpdir(), `mdstudio-new-${stamp}.app`);

  // 1. Baixar
  const res = await fetch(dmgUrl, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) return { ok: false, error: `download falhou (${res.status})` };
  await Bun.write(dmgPath, await res.arrayBuffer());

  // 2. Montar
  const mount = await run([
    "hdiutil",
    "attach",
    dmgPath,
    "-nobrowse",
    "-readonly",
    "-mountpoint",
    mountPoint,
  ]);
  if (mount.code !== 0) return { ok: false, error: "não foi possível montar o DMG" };

  try {
    const srcApp = join(mountPoint, "Markdown Studio.app");
    if (!(await Bun.file(join(srcApp, "Contents", "Info.plist")).exists())) {
      return { ok: false, error: "app não encontrado no DMG" };
    }

    // 3. Verificar (assinatura + notarização + Team ID) ANTES de copiar
    const verdict = await verifyApp(srcApp);
    if (!verdict.ok) return { ok: false, error: `verificação falhou: ${verdict.reason}` };

    // 4. Copiar para staging (fora do volume montado)
    await run(["cp", "-R", srcApp, stagedApp]);
  } finally {
    await run(["hdiutil", "detach", mountPoint, "-force"]);
  }

  // 5. Script destacado: espera o app encerrar, troca em /Applications e reabre
  const target = "/Applications/Markdown Studio.app";
  const script = join(tmpdir(), `mdstudio-swap-${stamp}.sh`);
  await Bun.write(
    script,
    `#!/bin/sh
sleep 1
# espera o app encerrar sozinho (até ~6s); se persistir, encerra à força
for i in $(seq 1 12); do
  pgrep -f "markdown-studio-bin" >/dev/null 2>&1 || break
  sleep 0.5
done
pkill -f "markdown-studio-bin" 2>/dev/null
sleep 1
rm -rf "${target}"
cp -R "${stagedApp}" "${target}"
rm -rf "${stagedApp}" "${dmgPath}"
xattr -cr "${target}" 2>/dev/null
open "${target}"
rm -f "$0"
`,
  );
  await run(["chmod", "+x", script]);
  // Destacado: sobrevive ao encerramento do app
  Bun.spawn(["/bin/sh", script], { stdio: ["ignore", "ignore", "ignore"] }).unref();

  return { ok: true };
}
