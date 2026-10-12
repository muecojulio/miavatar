import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carriles horizontales: señales de desbordamiento reales.
 *
 * El carril se desplaza de forma nativa (momentum del navegador, `scroll-snap`
 * moderado y nada de intercepción de gestos). Lo único que añadimos es saber si
 * queda contenido fuera de vista — a la izquierda, a la derecha o en ambos
 * lados — para mostrar bordes difuminados y una pista breve de "Desliza".
 */

export type OverflowState = {
  start: boolean;
  end: boolean;
  /** El usuario todavía no ha movido el carril: sirve para mostrar la pista. */
  untouched: boolean;
  /** Hay desbordamiento en algún sentido. */
  any: boolean;
};

const IDLE: OverflowState = { start: false, end: false, untouched: true, any: false };

export function useOverflow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<OverflowState>(IDLE);
  const touched = useRef(false);
  const frame = useRef(0);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    const overflows = max > 4;
    const start = overflows && node.scrollLeft > 4;
    const end = overflows && node.scrollLeft < max - 4;
    setState((previous) =>
      previous.start === start &&
      previous.end === end &&
      previous.any === overflows &&
      previous.untouched === (!touched.current || !overflows)
        ? previous
        : {
            start,
            end,
            any: overflows,
            untouched: !touched.current || !overflows,
          },
    );
  }, []);

  const schedule = useCallback(() => {
    if (typeof window === "undefined") return;
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onScroll = () => {
      if (node.scrollLeft > 8) touched.current = true;
      schedule();
    };
    node.addEventListener("scroll", onScroll, { passive: true });

    schedule();

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule());
    observer?.observe(node);
    if (node.firstElementChild) observer?.observe(node.firstElementChild);

    const mutations =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            touched.current = false;
            schedule();
          });
    mutations?.observe(node, { childList: true });

    return () => {
      node.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      mutations?.disconnect();
      window.cancelAnimationFrame(frame.current);
    };
  }, [schedule]);

  /** Llama tras un cambio de selección para dejar visible la opción activa. */
  const reveal = useCallback((child: Element | null | undefined) => {
    const node = ref.current;
    if (!node || !child) return;
    const target =
      (child as HTMLElement).offsetLeft - (node.clientWidth - (child as HTMLElement).offsetWidth) / 2;
    const wanted = Math.max(0, Math.min(target, node.scrollWidth - node.clientWidth));
    // Sólo cuenta como "ya movido" si el carril se mueve de verdad: revelar la
    // primera opción no debería ocultar la pista de "Desliza".
    if (Math.abs(wanted - node.scrollLeft) > 2) touched.current = true;
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      node.scrollTo({ left: wanted, behavior: reduced ? "auto" : "smooth" });
    } catch {
      node.scrollLeft = wanted;
    }
    schedule();
  }, [schedule]);

  return { ref, state, measure: schedule, reveal };
}
