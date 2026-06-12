import { describe, expect, it } from "vitest";
import { computeStats } from "../src/lib/stats";

describe("computeStats", () => {
  it("conta palavras de texto simples", () => {
    const stats = computeStats("Olá mundo, isto é um teste.");
    expect(stats.words).toBe(6);
    expect(stats.readingMinutes).toBe(1);
  });

  it("ignora sintaxe de marcação", () => {
    const stats = computeStats("# Título\n\n**negrito** e _itálico_\n\n- item um");
    expect(stats.words).toBe(6);
  });

  it("ignora blocos de código e links mantêm o texto", () => {
    const md = "Veja [a documentação](https://exemplo.com)\n\n```js\nconst x = 1;\n```";
    const stats = computeStats(md);
    expect(stats.words).toBe(3);
  });

  it("documento vazio zera tudo", () => {
    expect(computeStats("")).toEqual({ words: 0, chars: 0, readingMinutes: 0 });
  });

  it("calcula minutos de leitura a 200 ppm", () => {
    const longText = Array.from({ length: 450 }, (_, i) => `palavra${i}`).join(" ");
    expect(computeStats(longText).readingMinutes).toBe(2);
  });
});
