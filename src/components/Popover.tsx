import { type ReactNode, useEffect, useRef, useState } from "react";
import { cycleFocusWithin, focusFirstWithin } from "../lib/focusTrap";

interface PopoverProps {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}

/** Botão + painel flutuante. Fecha em clique fora ou Esc; Tab cicla dentro; foco restaurado ao fechar. */
export function Popover({ trigger, children, align = "left" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    focusFirstWithin(panelRef.current);

    const close = () => {
      setOpen(false);
      restoreFocusRef.current?.focus();
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      // Tab cicla dentro do painel: o foco nunca vaza por trás da camada aberta
      if (panelRef.current) cycleFocusWithin(panelRef.current, e);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Restaura o foco também quando um item do menu fecha o painel
  const closeAndRestore = () => {
    setOpen(false);
    restoreFocusRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      {trigger(open, () => setOpen((v) => !v))}
      {open && (
        <div
          ref={panelRef}
          className={`menu-panel absolute top-[36px] z-50 min-w-44 ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children(closeAndRestore)}
        </div>
      )}
    </div>
  );
}
