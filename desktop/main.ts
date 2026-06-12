import { SizeHint, Webview } from "webview-bun";
import { installMainMenu } from "./menu";

function resolveInitialFile(): string | null {
  const candidates = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  return candidates.find((a) => /\.(md|markdown|txt)$/i.test(a)) ?? candidates[0] ?? null;
}

const token = crypto.randomUUID();

// String literal: obrigatório para o bun build --compile empacotar o worker (segundo entrypoint).
const worker = new Worker("./worker.ts");

const port = await new Promise<number>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Servidor interno não iniciou.")), 15_000);
  worker.addEventListener("error", (event) => {
    clearTimeout(timeout);
    reject(new Error(`Worker falhou: ${(event as ErrorEvent).message ?? "erro desconhecido"}`));
  });
  worker.onmessage = (event: MessageEvent<{ port: number }>) => {
    clearTimeout(timeout);
    resolve(event.data.port);
  };
  worker.postMessage({ token, initialFile: resolveInitialFile() });
});

const webview = new Webview(false, {
  width: 1240,
  height: 820,
  hint: SizeHint.NONE,
});
webview.title = "Markdown Studio";
try {
  // Sem main menu o macOS engole todos os atalhos ⌘ (inclusive copiar/colar)
  installMainMenu("Markdown Studio");
} catch (err) {
  console.error("menu nativo indisponível:", err);
}
webview.navigate(`http://127.0.0.1:${port}/?token=${token}`);
webview.run();

process.exit(0);
