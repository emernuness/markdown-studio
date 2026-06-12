import type { ExportFormat, RecentFile } from "./types";

const token = new URLSearchParams(window.location.search).get("token") ?? "";

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Studio-Token": token,
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Falha em /api/${path} (${res.status})`);
  }
  return (await res.json()) as T;
}

interface DialogResult {
  path: string | null;
}

interface FileContent {
  path: string;
  name: string;
  content: string;
  mtimeMs: number;
}

export const api = {
  openDialog: () => call<DialogResult>("dialog/open"),
  saveDialog: (defaultName: string, extension: string) =>
    call<DialogResult>("dialog/save", { defaultName, extension }),
  readFile: (path: string) => call<FileContent>("file/read", { path }),
  statFile: (path: string) => call<{ exists: boolean; mtimeMs: number }>("file/stat", { path }),
  writeFile: (path: string, content: string) =>
    call<{ ok: true; mtimeMs: number }>("file/write", { path, content }),
  renameFile: (path: string, newName: string) =>
    call<{ path: string; name: string }>("file/rename", { path, newName }),
  recent: () => call<{ files: RecentFile[] }>("recent"),
  addRecent: (path: string) => call<{ ok: true }>("recent/add", { path }),
  exportDoc: (format: ExportFormat, html: string, title: string, path: string) =>
    call<{ ok: boolean; path: string; warning?: string }>("export", {
      format,
      html,
      title,
      path,
    }),
  print: (html: string, title: string) => call<{ ok: true }>("print", { html, title }),
  reveal: (path: string) => call<{ ok: true }>("reveal", { path }),
  saveSession: (docs: SessionDoc[], activeIndex: number, lastClosed: SessionDoc | null) =>
    call<{ ok: true }>("session/save", { docs, activeIndex, lastClosed }),
  loadSession: () =>
    call<{ docs: SessionDoc[]; activeIndex?: number; lastClosed?: SessionDoc | null }>(
      "session/load",
    ),
  version: () => call<{ version: string }>("version"),
  checkUpdate: () => call<UpdateInfo>("update/check"),
  installUpdate: (dmgUrl: string) =>
    call<{ ok: boolean; error?: string }>("update/install", { dmgUrl }),
  openUrl: (url: string) => call<{ ok: true }>("open-url", { url }),
};

export interface UpdateInfo {
  available: boolean;
  current: string;
  latest: string;
  notes: string;
  releaseUrl: string;
  dmgUrl: string | null;
}

export interface SessionDoc {
  path: string | null;
  name: string;
  markdown: string;
  savedMarkdown: string;
}
