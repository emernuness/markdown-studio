const FOCUSABLE = "input, button:not(:disabled), [tabindex]:not([tabindex='-1'])";

/**
 * Mantém o Tab ciclando dentro do container (trap de foco para camadas flutuantes).
 * Retorna true se o evento foi tratado.
 */
export function cycleFocusWithin(container: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== "Tab") return false;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) return false;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  if (!container.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/** Primeiro elemento focável dentro do container. */
export function focusFirstWithin(container: HTMLElement | null): void {
  container?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
}
