/// <reference lib="webworker" />
import { startServer } from "./server";

interface WorkerConfig {
  token: string;
  initialFile: string | null;
}

declare const self: Worker;

self.onmessage = async (event: MessageEvent<WorkerConfig>) => {
  const { token, initialFile } = event.data;
  const server = await startServer({
    port: 0,
    token,
    initialFile,
    serveStatic: true,
  });
  self.postMessage({ port: server.port });
};
