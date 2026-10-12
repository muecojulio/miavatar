import { useEffect, useState } from "react";

/**
 * Movimiento: un único lugar decide si se puede animar. Cuando el sistema pide
 * movimiento reducido se conserva la información (estados, mensajes, iconos) y
 * se elimina el desplazamiento: scroll inmediato, sin parallax ni rebotes.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function readPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduced(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** `"smooth"` salvo que el usuario haya pedido menos movimiento. */
export function useScrollBehavior(): ScrollBehavior {
  return useReducedMotion() ? "auto" : "smooth";
}

/**
 * Deja visible un elemento dentro de un carril o lista, con desplazamiento
 * suave sólo cuando está permitido. `block: "nearest"` evita saltos de página.
 */
export function revealElement(
  element: Element | null | undefined,
  options: { behavior?: ScrollBehavior; inline?: ScrollLogicalPosition; block?: ScrollLogicalPosition } = {},
) {
  if (!element || typeof element.scrollIntoView !== "function") return;
  const reduced = readPreference();
  const behavior = reduced ? "auto" : (options.behavior ?? "smooth");
  try {
    element.scrollIntoView({
      behavior,
      inline: options.inline ?? "center",
      block: options.block ?? "nearest",
    });
  } catch {
    element.scrollIntoView();
  }
}

/** Variación determinista para animaciones decorativas (evita saltos entre renders). */
export function seeded(value: string, spread = 1): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const unit = ((hash >>> 0) % 1000) / 1000;
  return (unit - 0.5) * 2 * spread;
}
