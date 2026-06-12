import { describe, expect, it } from "vitest";
import { buildStandaloneHtml } from "../src/shared/htmlTemplate";

describe("buildStandaloneHtml", () => {
  it("gera documento HTML completo com o corpo", () => {
    const html = buildStandaloneHtml("<h1>Oi</h1><p>Texto</p>", "Meu Doc");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Meu Doc</title>");
    expect(html).toContain("<h1>Oi</h1>");
    expect(html).toContain("@media print");
  });

  it("escapa o título contra injeção de HTML", () => {
    const html = buildStandaloneHtml("<p>x</p>", `<script>alert("xss")</script>`);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("inclui script de impressão automática apenas quando pedido", () => {
    expect(buildStandaloneHtml("<p>x</p>", "Doc")).not.toContain("print()");
    expect(buildStandaloneHtml("<p>x</p>", "Doc", true)).toContain("print()");
  });
});
