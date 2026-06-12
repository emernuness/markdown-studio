/**
 * Dev: sobe o backend (porta 4519, sem token) + Vite (5173, com proxy /api).
 */
import { startServer } from "../desktop/server";

await startServer({ port: 4519, token: null, initialFile: null, serveStatic: false });
console.log("API dev em http://127.0.0.1:4519");

const vite = Bun.spawn(["bunx", "vite"], {
  stdout: "inherit",
  stderr: "inherit",
});
process.on("SIGINT", () => {
  vite.kill();
  process.exit(0);
});
await vite.exited;
