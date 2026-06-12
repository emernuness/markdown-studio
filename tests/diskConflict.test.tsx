// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

let diskContent = "# Olá\n\nConteúdo.";
const writes: { path: string; content: string }[] = [];

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  diskContent = "# Olá\n\nConteúdo.";
  writes.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/session/load")) return jsonResponse({ docs: [] });
      if (url.includes("/api/session/save")) return jsonResponse({ ok: true });
      if (url.includes("/api/initial")) return jsonResponse({ path: "/tmp/doc-conflito.md" });
      if (url.includes("/api/file/read"))
        return jsonResponse({
          path: "/tmp/doc-conflito.md",
          name: "doc-conflito.md",
          content: diskContent,
        });
      if (url.includes("/api/file/write")) {
        writes.push(JSON.parse(String(init?.body ?? "{}")) as { path: string; content: string });
        return jsonResponse({ ok: true });
      }
      if (url.includes("/api/recent")) return jsonResponse({ ok: true, files: [] });
      return jsonResponse({ ok: true });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function pressCmdS() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "s", metaKey: true, bubbles: true, cancelable: true }),
  );
}

describe("guarda de conflito com o disco", () => {
  it("⌘S grava normalmente quando o disco não mudou", async () => {
    render(<App />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    await act(async () => {
      pressCmdS();
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(writes.length).toBe(1);
  });

  it("⌘S NÃO sobrescreve quando o arquivo mudou no disco", async () => {
    render(<App />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    // outra ferramenta altera o arquivo no disco
    diskContent = "# Versão nova escrita por fora\n";
    await act(async () => {
      pressCmdS();
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(writes.length).toBe(0);
    expect(document.body.textContent).toContain("mudou no disco");
  });
});
