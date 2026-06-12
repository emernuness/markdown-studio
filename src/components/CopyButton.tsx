import { useState } from "react";
import { Icon } from "./Icon";

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback para contextos sem a Clipboard API
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

export function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors ${
        copied ? "bg-ok/15 text-ok" : "text-ink-faint hover:bg-paper-deep hover:text-ink"
      }`}
      title="Copiar markdown"
      onClick={async () => {
        await copyText(getText());
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={13} strokeWidth={2} />
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}
