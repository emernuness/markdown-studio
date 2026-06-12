import { useEffect, useState } from "react";
import { api, type UpdateInfo } from "../lib/api";
import { Icon } from "./Icon";

type Phase = "idle" | "available" | "installing" | "error";

/**
 * Verifica atualizações ao abrir (uma vez por sessão, com adiamento curto) e
 * mostra um aviso discreto quando há versão nova. A instalação baixa, verifica
 * a assinatura e troca o app, que reabre já atualizado.
 */
export function UpdateBanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.checkUpdate();
        if (result.available && result.dmgUrl) {
          setInfo(result);
          setPhase("available");
        }
      } catch {
        // sem rede ou GitHub indisponível: silencioso, tenta de novo na próxima sessão
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (phase === "idle" || dismissed || !info) return null;

  const install = async () => {
    if (!info.dmgUrl) return;
    setPhase("installing");
    try {
      const res = await api.installUpdate(info.dmgUrl);
      if (!res.ok) {
        setError(res.error ?? "falha ao instalar");
        setPhase("error");
      }
      // Em caso de sucesso, o app é encerrado e reaberto pelo instalador.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  return (
    <div
      role="status"
      className="flex flex-none items-center gap-3 border-b border-accent/30 bg-accent-wash px-4 py-2"
    >
      <span className="flex-none text-accent-deep">
        <Icon name="download" size={15} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-accent-deep">
        {phase === "installing"
          ? `Baixando a versão ${info.latest}… o app vai reabrir sozinho.`
          : phase === "error"
            ? `Não foi possível atualizar: ${error}`
            : `Markdown Studio ${info.latest} disponível (você tem a ${info.current}).`}
      </span>

      {phase === "available" && (
        <>
          <button
            className="h-7 flex-none rounded-lg border border-accent/40 bg-card px-3 text-[12px] font-semibold text-accent-deep hover:border-accent"
            onClick={() => api.openUrl(info.releaseUrl).catch(() => {})}
          >
            Ver novidades
          </button>
          <button
            className="h-7 flex-none rounded-lg bg-accent px-3 text-[12px] font-semibold text-white hover:bg-accent-deep"
            onClick={install}
          >
            Baixar e instalar
          </button>
        </>
      )}

      {phase === "error" && (
        <button
          className="h-7 flex-none rounded-lg border border-accent/40 bg-card px-3 text-[12px] font-semibold text-accent-deep hover:border-accent"
          onClick={() => api.openUrl(info.releaseUrl).catch(() => {})}
        >
          Abrir no GitHub
        </button>
      )}

      {phase !== "installing" && (
        <button
          className="flex h-6 w-6 flex-none items-center justify-center rounded text-accent-deep hover:bg-accent/10"
          title="Dispensar"
          aria-label="Dispensar aviso de atualização"
          onClick={() => setDismissed(true)}
        >
          <Icon name="close" size={12} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
