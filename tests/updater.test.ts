import { describe, expect, it } from "vitest";
import { isNewer } from "../desktop/updater";

describe("isNewer (comparação de versão do updater)", () => {
  it("detecta versão maior", () => {
    expect(isNewer("1.0.0", "1.1.0")).toBe(true);
    expect(isNewer("1.0.0", "2.0.0")).toBe(true);
    expect(isNewer("1.0.0", "1.0.1")).toBe(true);
  });

  it("não atualiza para versão igual ou menor", () => {
    expect(isNewer("1.1.0", "1.1.0")).toBe(false);
    expect(isNewer("1.1.0", "1.0.0")).toBe(false);
    expect(isNewer("2.0.0", "1.9.9")).toBe(false);
  });

  it("compara numericamente, não lexicograficamente", () => {
    expect(isNewer("1.9.0", "1.10.0")).toBe(true);
    expect(isNewer("1.10.0", "1.9.0")).toBe(false);
  });

  it("ignora prefixo v", () => {
    expect(isNewer("v1.0.0", "v1.1.0")).toBe(true);
    expect(isNewer("1.0.0", "v1.0.0")).toBe(false);
  });
});
