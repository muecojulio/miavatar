"use client";

import { useCallback, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Gestos táctiles con bloqueo de eje.
 *
 * Reglas que aplica este archivo y que todos los componentes respetan:
 * - Un gesto sólo cuenta como horizontal si el desplazamiento lateral supera
 *   claramente al vertical (proporción 1.2 por defecto) y pasa un mínimo.
 * - Si el bloqueo acaba siendo vertical, soltamos el gesto: el navegador sigue
 *   desplazando la página con su propia inercia.
 * - Un gesto que empieza sobre un control (botón, enlace, campo, selector,
 *   pestaña, mapa…) nunca mueve una tarjeta.
 * - Después de arrastrar, el clic siguiente se descarta para no activar nada.
 */

export const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "[role='button']",
  "[role='tab']",
  "[role='switch']",
  "[role='slider']",
  "[role='option']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='combobox']",
  "[contenteditable='true']",
  "[data-no-swipe]",
].join(",");

/**
 * Contenedores con gesto horizontal propio (carriles, carruseles, filas
 * deslizables). Un gesto que nace dentro de uno de ellos no debe hacer también
 * la acción de la pantalla — cambiar de sección, por ejemplo.
 */
export const NESTED_SWIPE_SELECTOR = "[data-rail], [data-swipe-surface]";

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(INTERACTIVE_SELECTOR) !== null;
}

export type SwipeEndInfo = {
  dx: number;
  velocity: number;
  durationMs: number;
  canceled: boolean;
};

export type HorizontalSwipeOptions = {
  enabled?: boolean;
  /**
   * Selector de contenedores que tienen su propio gesto horizontal (carriles,
   * carruseles, filas deslizables): un gesto que nace dentro no cambia de
   * sección. Sin esto, deslizar una prenda o un carrusel arrastraría también la
   * navegación.
   */
  ignoreFrom?: string;
  /** Distancia mínima (px) antes de decidir el eje. */
  minDistance?: number;
  /** `|dx| / |dy|` mínimo para considerarlo horizontal. */
  ratio?: number;
  onDragStart?: () => void;
  onDrag?: (dx: number, event: PointerEvent) => void;
  onDragEnd?: (info: SwipeEndInfo) => void;
};

export function useHorizontalSwipe(options: HorizontalSwipeOptions) {
  const config = useRef(options);
  config.current = options;

  const gesture = useRef({
    tracking: false,
    locked: false,
    aborted: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    startedAt: 0,
    dragged: false,
  });

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = gesture.current;
    state.dragged = false;
    state.tracking = false;
    state.locked = false;
    state.aborted = false;

    const current = config.current;
    if (current.enabled === false) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;
    const nested = current.ignoreFrom;
    if (nested && event.target instanceof Element && event.target.closest(nested)) return;

    state.tracking = true;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    state.startedAt = event.timeStamp;
    state.velocity = 0;
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = gesture.current;
    const current = config.current;
    if (!state.tracking || state.aborted || event.pointerId !== state.pointerId) return;
    if (current.enabled === false) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.locked) {
      const min = current.minDistance ?? 8;
      if (Math.abs(dx) < min && Math.abs(dy) < min) return;
      const ratio = current.ratio ?? 1.2;
      if (Math.abs(dx) >= Math.abs(dy) * ratio) {
        state.locked = true;
        state.dragged = true;
        // El gesto ya es de este componente: los contenedores que lo envuelven
        // no deben reaccionar al mismo movimiento.
        event.stopPropagation();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // El navegador puede rechazar la captura; el gesto sigue funcionando.
        }
        current.onDragStart?.();
      } else {
        // El gesto es vertical: el navegador se queda con él.
        state.aborted = true;
        state.tracking = false;
        return;
      }
    }

    if (state.locked) event.stopPropagation();
    const elapsed = Math.max(1, event.timeStamp - state.lastTime);
    state.velocity = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    current.onDrag?.(dx, event.nativeEvent);
  }, []);

  const finish = useCallback((canceled: boolean) => {
    const state = gesture.current;
    const current = config.current;
    if (!state.tracking && !state.locked) {
      state.tracking = false;
      return;
    }
    const dx = state.lastX - state.startX;
    const wasLocked = state.locked;
    state.tracking = false;
    state.locked = false;
    if (!wasLocked) return;
    current.onDragEnd?.({
      dx,
      velocity: state.velocity,
      durationMs: state.lastTime - state.startedAt,
      canceled,
    });
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (gesture.current.locked) event.stopPropagation();
      finish(false);
    },
    [finish],
  );
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (gesture.current.locked) event.stopPropagation();
      finish(true);
    },
    [finish],
  );
  const onLostPointerCapture = useCallback(() => finish(true), [finish]);

  const bind = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture],
  );

  /** `true` cuando el último gesto movió la tarjeta: se descarta el clic. */
  const wasDragged = useCallback(() => gesture.current.dragged, []);

  return { bind, wasDragged };
}
