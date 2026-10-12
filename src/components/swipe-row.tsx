import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHorizontalSwipe } from "@/lib/use-gesture";

/**
 * Desliza una tarjeta para revelar acciones contextuales.
 *
 * Reglas que respeta:
 * - El deslizamiento nunca es la única vía: hay un botón visible ("⋯") que abre
 *   y cierra las mismas acciones, y en pantallas con mouse las acciones se
 *   muestran directamente en la fila.
 * - Bloqueo de eje: la tarjeta sólo se mueve cuando el gesto es claramente
 *   horizontal (`|dx| ≥ 1.2·|dy|`); los gestos verticales los sigue controlando
 *   el navegador, así que el desplazamiento de la página no se cancela.
 * - Los gestos que empiezan sobre botones, enlaces, campos o selectores no
 *   mueven nada, y el clic posterior a un arrastre se descarta.
 * - Mientras las acciones están ocultas quedan fuera del orden de foco y no se
 *   anuncian: `aria-hidden` + `tabIndex={-1}`.
 */

export type SwipeAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onAction: () => void;
  tone?: "default" | "danger";
};

const PANEL_FALLBACK = 108;

export function SwipeRow({
  children,
  actions,
  className,
  surfaceClassName,
  label,
}: {
  children: ReactNode;
  actions: SwipeAction[];
  className?: string;
  surfaceClassName?: string;
  /** Describe el contenido, para el botón de acciones: "Acciones de la prueba". */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [inline, setInline] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_FALLBACK);
  const surface = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const offset = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const sync = () => setInline(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (panel.current) setPanelWidth(Math.max(88, panel.current.offsetWidth + 12));
  }, [actions.length, inline]);

  const apply = useCallback((next: number) => {
    offset.current = next;
    const node = surface.current;
    if (node) node.style.transform = next === 0 ? "" : `translate3d(${next}px, 0, 0)`;
  }, []);

  const settle = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      apply(nextOpen && !inline ? -panelWidth : 0);
    },
    [apply, inline, panelWidth],
  );

  const { bind, wasDragged } = useHorizontalSwipe({
    enabled: !inline,
    ratio: 1.2,
    minDistance: 10,
    onDragStart: () => {
      setDragging(true);
      if (surface.current) surface.current.style.transition = "none";
    },
    onDrag: (dx) => {
      const base = open ? -panelWidth : 0;
      const raw = base + dx;
      // Resistencia al pasar del límite: se siente el tope.
      const clamped =
        raw > 0 ? Math.min(raw * 0.25, 24) : raw < -panelWidth ? -panelWidth + (raw + panelWidth) * 0.3 : raw;
      apply(clamped);
    },
    onDragEnd: ({ dx, velocity }) => {
      setDragging(false);
      const node = surface.current;
      if (node) node.style.transition = "transform 260ms var(--ease-out-soft)";
      const far = Math.abs(dx) > panelWidth * 0.4;
      const flick = Math.abs(velocity) > 0.45;
      if (open) {
        settle(!(dx > panelWidth * 0.35 || (flick && dx > 0)));
      } else {
        settle(dx < 0 && (far || (flick && dx < 0)));
      }
    },
  });

  useEffect(() => {
    if (!open || inline) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") settle(false);
    };
    const onOutside = (event: PointerEvent) => {
      if (!surface.current?.parentElement?.contains(event.target as Node)) settle(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open, inline, settle]);

  const hidden = !open && !inline;

  return (
    <div className={cn("relative overflow-hidden rounded-3xl", className)}>
      <div
        ref={panel}
        className="swipe-actions"
        data-open={open || inline}
        aria-hidden={hidden}
        style={inline ? { position: "static", opacity: 1, pointerEvents: "auto" } : undefined}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              tabIndex={hidden ? -1 : 0}
              onClick={() => {
                settle(false);
                action.onAction();
              }}
              className={cn(
                "tap inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-3 text-xs font-medium",
                action.tone === "danger"
                  ? "bg-ember/20 text-fg outline outline-1 outline-ember/50"
                  : "bg-surface-2 text-fg outline outline-1 outline-fg/15",
              )}
            >
              {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
              {action.label}
            </button>
          );
        })}
      </div>

      <div
        {...bind}
        ref={surface}
        data-swipe-surface
        className={cn(
          "relative z-[2] touch-pan-y",
          dragging ? "cursor-grabbing select-none" : "transition-transform duration-[260ms]",
          surfaceClassName,
        )}
        style={{ transitionTimingFunction: "var(--ease-out-soft)" }}
        onClickCapture={(event) => {
          if (wasDragged()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {children}
      </div>

      {!inline ? (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `Cerrar acciones de ${label}` : `Abrir acciones de ${label}`}
          onClick={() => settle(!open)}
          className="tap absolute right-2 top-2 z-[3] grid size-11 place-items-center rounded-full bg-bg/70 text-muted outline outline-1 outline-fg/10 backdrop-blur"
        >
          <MoreVertical className="size-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
