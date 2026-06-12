import { mkdir } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildStandaloneHtml } from "../src/shared/htmlTemplate";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

// Comet fica por último: trava em modo headless (testado em 2026-06).
const CHROMIUM_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Comet.app/Contents/MacOS/Comet",
];

const CONFIG_DIR = join(homedir(), "Library", "Application Support", "MarkdownStudio");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

interface ServerOptions {
  port: number;
  token: string | null;
  initialFile: string | null;
  serveStatic: boolean;
}

interface JsonBody {
  [key: string]: unknown;
}

async function readConfig(): Promise<{ recent: RecentFile[] }> {
  try {
    const raw = await Bun.file(CONFIG_PATH).json();
    if (raw && Array.isArray(raw.recent)) return raw as { recent: RecentFile[] };
  } catch {
    // primeira execução ou arquivo corrompido — recomeça
  }
  return { recent: [] };
}

async function writeConfig(config: { recent: RecentFile[] }): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function runOsascript(script: string): Promise<string | null> {
  const proc = Bun.spawn(["osascript", "-e", script], { stderr: "pipe", stdout: "pipe" });
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  if (code !== 0) return null; // usuário cancelou
  const result = out.trim();
  return result.length > 0 ? result : null;
}

async function chooseFile(): Promise<string | null> {
  return runOsascript(
    `POSIX path of (choose file with prompt "Abrir documento markdown" of type {"md", "markdown", "mdown", "txt", "public.plain-text"})`,
  );
}

async function chooseSavePath(defaultName: string, extension: string): Promise<string | null> {
  const escaped = defaultName.replaceAll('"', '\\"');
  const result = await runOsascript(
    `POSIX path of (choose file name with prompt "Salvar como" default name "${escaped}")`,
  );
  if (!result) return null;
  return result.toLowerCase().endsWith(`.${extension}`) ? result : `${result}.${extension}`;
}

function findChromium(): string | null {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try {
      if (Bun.file(candidate).size > 0) return candidate;
    } catch {
      // binário não existe — tenta o próximo
    }
  }
  return null;
}

async function exportPdf(
  html: string,
  title: string,
  outPath: string,
): Promise<{ ok: boolean; warning?: string }> {
  const stamp = Date.now();
  const htmlPath = join(tmpdir(), `mdstudio-${stamp}.html`);
  await Bun.write(htmlPath, buildStandaloneHtml(html, title));
  const chromium = findChromium();
  if (!chromium) {
    const fallback = join(tmpdir(), `mdstudio-print-${stamp}.html`);
    await Bun.write(fallback, buildStandaloneHtml(html, title, true));
    Bun.spawn(["open", fallback]);
    return {
      ok: false,
      warning: "Nenhum navegador Chromium encontrado — abri no navegador: use Salvar como PDF.",
    };
  }
  const profileDir = join(tmpdir(), `mdstudio-chrome-${stamp}`);
  const proc = Bun.spawn(
    [
      chromium,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${profileDir}`,
      "--no-pdf-header-footer",
      "--virtual-time-budget=4000",
      `--print-to-pdf=${outPath}`,
      `file://${htmlPath}`,
    ],
    { stderr: "pipe", stdout: "pipe" },
  );
  const timer = setTimeout(() => proc.kill(), 45_000);
  const code = await proc.exited;
  clearTimeout(timer);
  if (code !== 0 || !(await Bun.file(outPath).exists())) {
    const err = await new Response(proc.stderr).text();
    const fallback = join(tmpdir(), `mdstudio-print-${stamp}.html`);
    await Bun.write(fallback, buildStandaloneHtml(html, title, true));
    Bun.spawn(["open", fallback]);
    return {
      ok: false,
      warning: `Conversão direta falhou — abri no navegador: use Salvar como PDF. (${err.slice(0, 120)})`,
    };
  }
  return { ok: true };
}

async function exportTextutil(
  html: string,
  title: string,
  format: "docx" | "rtf",
  outPath: string,
): Promise<void> {
  const htmlPath = join(tmpdir(), `mdstudio-${Date.now()}.html`);
  await Bun.write(htmlPath, buildStandaloneHtml(html, title));
  const proc = Bun.spawn(["textutil", "-convert", format, htmlPath, "-output", outPath], {
    stderr: "pipe",
  });
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`textutil falhou (${code}): ${err.slice(0, 300)}`);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript",
  css: "text/css",
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  json: "application/json",
  map: "application/json",
};

export async function startServer(options: ServerOptions) {
  let embedded: Record<string, string> = {};
  if (options.serveStatic) {
    const mod = (await import("./embedded.ts")) as { EMBEDDED: Record<string, string> };
    embedded = mod.EMBEDDED;
  }

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: options.port,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname.startsWith("/api/")) {
        if (options.token) {
          const provided = req.headers.get("X-Studio-Token") ?? url.searchParams.get("token") ?? "";
          if (provided !== options.token) return json({ error: "não autorizado" }, 401);
        }
        try {
          return await handleApi(url.pathname.slice(5), req, options);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 500);
        }
      }

      if (options.serveStatic) {
        const route = url.pathname === "/" ? "/index.html" : url.pathname;
        const assetPath = embedded[route];
        if (assetPath) {
          const ext = route.split(".").pop() ?? "";
          return new Response(Bun.file(assetPath), {
            headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
          });
        }
        const fallback = embedded["/index.html"];
        if (fallback) {
          return new Response(Bun.file(fallback), {
            headers: { "Content-Type": MIME.html ?? "text/html" },
          });
        }
      }
      return new Response("not found", { status: 404 });
    },
  });

  return server;
}

async function handleApi(action: string, req: Request, options: ServerOptions): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as JsonBody;

  switch (action) {
    case "health":
      return json({ ok: true });

    case "initial":
      return json({ path: options.initialFile });

    case "dialog/open":
      return json({ path: await chooseFile() });

    case "dialog/save": {
      const defaultName = typeof body.defaultName === "string" ? body.defaultName : "documento.md";
      const extension = typeof body.extension === "string" ? body.extension : "md";
      return json({ path: await chooseSavePath(defaultName, extension) });
    }

    case "file/read": {
      const path = String(body.path ?? "");
      const file = Bun.file(path);
      if (!(await file.exists())) return json({ error: "Arquivo não encontrado." }, 404);
      if (file.size > MAX_FILE_BYTES)
        return json({ error: "Arquivo grande demais (>25 MB)." }, 413);
      return json({
        path,
        name: path.split("/").pop() ?? path,
        content: await file.text(),
        mtimeMs: file.lastModified,
      });
    }

    case "file/stat": {
      const path = String(body.path ?? "");
      const file = Bun.file(path);
      if (!(await file.exists())) return json({ exists: false, mtimeMs: 0 });
      return json({ exists: true, mtimeMs: file.lastModified });
    }

    case "file/write": {
      const path = String(body.path ?? "");
      if (!path.startsWith("/")) return json({ error: "Caminho inválido." }, 400);
      await mkdir(dirname(path), { recursive: true });
      await Bun.write(path, String(body.content ?? ""));
      return json({ ok: true, mtimeMs: Bun.file(path).lastModified });
    }

    case "file/rename": {
      const path = String(body.path ?? "");
      const newName = String(body.newName ?? "").trim();
      if (!path.startsWith("/")) return json({ error: "Caminho inválido." }, 400);
      if (!newName || newName.includes("/"))
        return json({ error: "Nome de arquivo inválido." }, 400);
      const finalName = /\.(md|markdown|mdown|txt)$/i.test(newName) ? newName : `${newName}.md`;
      const newPath = join(dirname(path), finalName);
      if (newPath === path) return json({ path, name: finalName });
      if (await Bun.file(newPath).exists())
        return json({ error: "Já existe um arquivo com esse nome." }, 409);
      const { rename } = await import("node:fs/promises");
      await rename(path, newPath);
      const config = await readConfig();
      config.recent = config.recent.map((r) =>
        r.path === path ? { ...r, path: newPath, name: finalName } : r,
      );
      await writeConfig(config);
      return json({ path: newPath, name: finalName });
    }

    case "session/save": {
      await mkdir(CONFIG_DIR, { recursive: true });
      await Bun.write(
        join(CONFIG_DIR, "session.json"),
        JSON.stringify({
          savedAt: Date.now(),
          docs: body.docs ?? [],
          activeIndex: body.activeIndex ?? 0,
        }),
      );
      return json({ ok: true });
    }

    case "session/load": {
      try {
        const session = await Bun.file(join(CONFIG_DIR, "session.json")).json();
        return json(session);
      } catch {
        return json({ docs: [] });
      }
    }

    case "recent": {
      const config = await readConfig();
      const existing: RecentFile[] = [];
      for (const entry of config.recent) {
        if (await Bun.file(entry.path).exists()) existing.push(entry);
      }
      return json({ files: existing });
    }

    case "recent/add": {
      const path = String(body.path ?? "");
      if (!path) return json({ error: "path obrigatório" }, 400);
      const config = await readConfig();
      const name = path.split("/").pop() ?? path;
      const rest = config.recent.filter((r) => r.path !== path);
      config.recent = [{ path, name, lastOpened: Date.now() }, ...rest].slice(0, 12);
      await writeConfig(config);
      return json({ ok: true });
    }

    case "export": {
      const format = String(body.format ?? "");
      const html = String(body.html ?? "");
      const title = String(body.title ?? "Documento");
      const path = String(body.path ?? "");
      if (!path.startsWith("/")) return json({ error: "Caminho inválido." }, 400);

      if (format === "html") {
        await Bun.write(path, buildStandaloneHtml(html, title));
        return json({ ok: true, path });
      }
      if (format === "pdf") {
        const result = await exportPdf(html, title, path);
        return json({ ...result, path });
      }
      if (format === "docx" || format === "rtf") {
        await exportTextutil(html, title, format, path);
        return json({ ok: true, path });
      }
      return json({ error: `Formato desconhecido: ${format}` }, 400);
    }

    case "print": {
      const html = String(body.html ?? "");
      const title = String(body.title ?? "Documento");
      const printPath = join(tmpdir(), `mdstudio-print-${Date.now()}.html`);
      await Bun.write(printPath, buildStandaloneHtml(html, title, true));
      Bun.spawn(["open", printPath]);
      return json({ ok: true });
    }

    case "reveal": {
      const path = String(body.path ?? "");
      if (path.startsWith("/")) Bun.spawn(["open", "-R", path]);
      return json({ ok: true });
    }

    default:
      return json({ error: `Ação desconhecida: ${action}` }, 404);
  }
}
