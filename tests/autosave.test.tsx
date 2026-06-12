// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

interface RecordedSave {
  docs: { name: string; markdown: string }[];
  activeIndex: number;
}

const saves: RecordedSave[] = [];

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  saves.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/session/load")) return jsonResponse({ docs: [] });
      if (url.includes("/api/session/save")) {
        saves.push(JSON.parse(String(init?.body ?? "{}")) as RecordedSave);
        return jsonResponse({ ok: true });
      }
      if (url.includes("/api/initial")) return jsonResponse({ path: "/tmp/doc-teste.md" });
      if (url.includes("/api/file/read"))
        return jsonResponse({
          path: "/tmp/doc-teste.md",
          name: "doc-teste.md",
          content: "# Olá\n\nConteúdo.",
        });
      if (url.includes("/api/recent")) return jsonResponse({ ok: true, files: [] });
      return jsonResponse({ ok: true });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("autosave de sessão", () => {
  it("grava a sessão ~1.2s depois de abrir o documento inicial", async () => {
    render(<App />);

    // bootstrap: session/load → initial → file/read → setDocs
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // janela de debounce do autosave
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });

    expect(saves.length).toBeGreaterThanOrEqual(1);
    const last = saves.at(-1);
    expect(last?.docs[0]?.name).toBe("doc-teste.md");
    expect(last?.docs[0]?.markdown).toContain("# Olá");
  });
});
