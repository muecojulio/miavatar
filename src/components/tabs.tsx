import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverflow } from "@/lib/use-overflow";

/**
 * Pestañas accesibles con indicador deslizante.
 *
 * - Semántica de `tablist`: cada pestaña es `role="tab"` con `aria-selected`,
 *   `aria-controls` y foco móvil (roving tabindex) → flechas ←/→, Inicio/Fin.
 * - El indicador (píldora dorada) se mide del botón activo y se anima hacia él;
 *   nunca depende del color para indicar la selección (también hay icono activo
 *   y etiqueta en negrita).
 * - Si las pestañas no caben, el carril se desplaza de forma nativa y la pestaña
 *   activa se centra sola. Los bordes difuminados y la pista "Desliza" aparecen
 *   sólo cuando hay contenido fuera de vista.
 */

export type TabItem<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  /** Contador opcional (por ejemplo, pruebas guardadas). */
  badge?: number;
};

export function TabBar<T extends string>({
  items,
  value,
  onChange,
  label,
  idBase,
  className,
  variant = "inline",
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idBase: string;
  className?: string;
  variant?: "inline" | "dock";
}) {
  const { ref, state, reveal } = useOverflow<HTMLDivElement>();
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const measure = useCallback(() => {
    const node = ref.current;
    const button = buttons.current.get(value);
    if (!node || !button) return;
    setIndicator({ left: button.offsetLeft, width: button.offsetWidth, ready: true });
  }, [ref, value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, items.length]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (ref.current) observer?.observe(ref.current);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [measure, ref]);

  useEffect(() => {
    const active = buttons.current.get(value);
    if (active) reveal(active);
  }, [value, reveal]);

  function move(delta: number) {
    const index = items.findIndex((item) => item.id === value);
    const next = items[(index + delta + items.length) % items.length];
    if (next) onChange(next.id);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(items[0]!.id);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(items[items.length - 1]!.id);
    }
  }

  useEffect(() => {
    // Al cambiar con teclado, el foco sigue a la pestaña activa.
    const active = buttons.current.get(value);
    if (active && document.activeElement && active.parentElement?.contains(document.activeElement)) {
      active.focus();
    }
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className={cn(
          "no-scrollbar relative flex overflow-x-auto",
          variant === "dock" ? "items-stretch gap-1 px-1.5 py-1.5" : "gap-1 rounded-full",
        )}
      >
        <span
          aria-hidden="true"
          className="slide-indicator"
          data-ready={indicator.ready}
          style={{
            width: `${indicator.width}px`,
            transform: `translateX(${indicator.left}px)`,
            opacity: indicator.ready ? 1 : 0,
            top: variant === "dock" ? "0.375rem" : 0,
            bottom: variant === "dock" ? "0.375rem" : 0,
          }}
        />
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === value;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) buttons.current.set(item.id, node);
                else buttons.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${idBase}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              data-state={active ? "active" : "inactive"}
              className={cn(
                "tab-button tap relative flex shrink-0 items-center justify-center gap-2 rounded-full px-3.5 font-medium",
                variant === "dock"
                  ? "min-h-14 min-w-[4.5rem] flex-col gap-1 px-3 text-[11px] leading-tight"
                  : "min-h-11 text-sm",
              )}
              onClick={() => onChange(item.id)}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "size-5 transition-transform duration-200",
                    active ? "scale-110" : "scale-100",
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <span className="whitespace-nowrap">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "min-w-4 rounded-full px-1 text-[10px] font-semibold",
                    active ? "bg-bg/25 text-bg" : "bg-accent/20 text-accent",
                  )}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <span
        aria-hidden="true"
        data-visible={state.start}
        className="edge-fade edge-fade-start"
        style={{ width: "1.5rem", ["--edge-color" as string]: "var(--color-bg)" }}
      />
      <span
        aria-hidden="true"
        data-visible={state.end}
        className="edge-fade edge-fade-end"
        style={{ width: "2rem", ["--edge-color" as string]: "var(--color-bg)" }}
      />
      {state.any && state.untouched ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-1 inline-flex items-center gap-1 text-[11px] text-muted"
        >
          <ChevronsRight className="size-3" />
          Desliza
        </span>
      ) : null}
    </div>
  );
}

/**
 * Panel de pestaña: entrada con desplazamiento corto y fundido (180–250 ms) en
 * la dirección de la navegación. `aria-labelledby` une el panel con su pestaña.
 */
export function TabPanel<T extends string>({
  id,
  idBase,
  children,
  direction = 1,
}: {
  id: T;
  idBase: string;
  children: ReactNode;
  direction?: 1 | -1;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${id}`}
      aria-labelledby={`${idBase}-tab-${id}`}
      tabIndex={-1}
      className={direction === 1 ? "panel-enter" : "panel-enter-back"}
    >
      {children}
    </div>
  );
}
