import { useEffect, type ReactNode } from "react";
import { ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverflow } from "@/lib/use-overflow";

/**
 * Carril horizontal: desplazamiento nativo del navegador (momentum táctil y
 * `scroll-snap` moderado), barra oculta sólo a la vista, señales de
 * desbordamiento que aparecen únicamente cuando hay contenido fuera de vista y
 * auto-revelado de la opción activa tras un cambio.
 */
export function Rail({
  children,
  label,
  hint = "Desliza",
  className,
  listClassName,
  fadeColor = "var(--color-surface)",
  align = "start",
  activeKey = null,
}: {
  children: ReactNode;
  /** Nombre accesible del grupo: "Filtros", "Categorías", "Opciones disponibles"… */
  label: string;
  hint?: string | null;
  className?: string;
  listClassName?: string;
  /** Color hacia el que se desvanecen los bordes (según la superficie que lo envuelve). */
  fadeColor?: string;
  align?: "start" | "center";
  /** Cambia de valor cuando cambia la selección: deja visible la opción activa. */
  activeKey?: string | number | null;
}) {
  const { ref, state, reveal } = useOverflow<HTMLDivElement>();

  useEffect(() => {
    if (activeKey === null) return;
    const active = ref.current?.querySelector<HTMLElement>("[data-active='true']");
    if (active) reveal(active);
  }, [activeKey, ref, reveal]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        data-rail
        role="group"
        aria-label={label}
        className={cn(
          "rail rail-snap no-scrollbar flex items-stretch gap-2 overflow-x-auto px-0.5 pb-1",
          align === "center" && "rail-center",
          listClassName,
        )}
      >
        {children}
      </div>
      <span
        aria-hidden="true"
        data-visible={state.start}
        className="edge-fade edge-fade-start"
        style={{ ["--edge-color" as string]: fadeColor }}
      />
      <span
        aria-hidden="true"
        data-visible={state.end}
        className="edge-fade edge-fade-end"
        style={{ ["--edge-color" as string]: fadeColor }}
      />
      {hint && state.any && state.untouched ? (
        <span
          aria-hidden="true"
          className="animate-marquee-in pointer-events-none absolute -top-7 right-0 inline-flex items-center gap-1 rounded-full border border-fg/10 bg-bg/85 px-2 py-0.5 text-[11px] text-muted backdrop-blur"
        >
          <ChevronsRight className="size-3" />
          {hint}
        </span>
      ) : null}
    </div>
  );
}
