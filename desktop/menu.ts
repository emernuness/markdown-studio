/**
 * Carrega o dylib do menu nativo (compilado de desktop/menu.m) e instala a barra
 * de menus. O trabalho Cocoa fica no dylib compilado; aqui só fazemos a chamada
 * FFI de uma função. Em dev (sem o dylib no bundle) é um no-op silencioso.
 */
import { dlopen, FFIType, ptr } from "bun:ffi";
import { dirname, join } from "node:path";

function findMenuDylib(): string | null {
  // No bundle: Contents/MacOS/bin -> Contents/Resources/libmenu.dylib
  const bundled = join(dirname(process.execPath), "..", "Resources", "libmenu.dylib");
  try {
    if (Bun.file(bundled).size > 0) return bundled;
  } catch {
    // fora do bundle (dev)
  }
  return null;
}

export function installMainMenu(appName: string): void {
  const path = findMenuDylib();
  if (!path) return;
  const lib = dlopen(path, {
    install_markdown_studio_menu: { args: [FFIType.ptr], returns: FFIType.void },
  });
  const name = ptr(new TextEncoder().encode(`${appName}\0`));
  lib.symbols.install_markdown_studio_menu(name);
}
