// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

let diskContent = "# Watcher\n\nANTES.";
let diskMtime = 100;

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  diskContent = "# Watcher\n\nANTES.";
  diskMtime = 100;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/session/load")) return jsonResponse({ docs: [] });
      if (url.includes("/api/session/save")) return jsonResponse({ ok: true });
      if (url.includes("/api/initial")) return jsonResponse({ path: "/tmp/w.md" });
      if (url.includes("/api/file/stat")) return jsonResponse({ exists: true, mtimeMs: diskMtime });
      if (url.includes("/api/file/read"))
        return jsonResponse({
          path: "/tmp/w.md",
          name: "w.md",
          content: diskContent,
          mtimeMs: diskMtime,
        });
      if (url.includes("/api/recent")) return jsonResponse({ ok: true, files: [] });
      return jsonResponse({ ok: true });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("watcher de disco (poll de mtime)", () => {
  it("recarrega doc limpo quando o arquivo muda no disco, sem ação do usuário", {
    timeout: 10000,
  }, async () => {
    render(<App />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    expect(document.body.textContent).toContain("ANTES.");

    // outra ferramenta escreve no arquivo
    diskContent = "# Watcher\n\nDEPOIS MUDADO POR FORA.";
    diskMtime = 200;

    // janela do poll (4s) + margem
    await act(async () => {
      await new Promise((r) => setTimeout(r, 4600));
    });
    expect(document.body.textContent).toContain("DEPOIS MUDADO POR FORA.");
  });
});
