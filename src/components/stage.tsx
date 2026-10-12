import { useEffect, useState, type ReactNode } from "react";
import { Cpu, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Escenario del avatar: el lienzo se presenta como una toma de estudio, con
 * marco, vignette, insignia de estado y un barrido de luz mientras se analiza
 * la foto. La insignia comunica que el cálculo ocurre en el dispositivo.
 */
export function Stage({
  children,
  ariaLabel,
  busy = false,
  badge,
  className,
  burstKey,
}: {
  children: ReactNode;
  ariaLabel: string;
  busy?: boolean;
  badge?: string;
  className?: string;
  /** Cambia de valor para lanzar un destello breve (por ejemplo, al guardar). */
  burstKey?: number;
}) {
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    if (burstKey === undefined) return;
    setBursting(true);
    const timer = window.setTimeout(() => setBursting(false), 700);
    return () => window.clearTimeout(timer);
  }, [burstKey]);

  return (
    <div className={cn("stage", busy && "scanning", className)} aria-busy={busy || undefined}>
      <div className="relative z-[1]" role="img" aria-label={ariaLabel}>
        {children}
      </div>

      <span className="pointer-events-none absolute left-3 top-3 z-[3] inline-flex items-center gap-1.5 rounded-full bg-[#1b1712]/70 px-2.5 py-1 text-[11px] font-medium text-[#f4efe6] backdrop-blur">
        <Cpu className="size-3" aria-hidden="true" />
        {badge ?? "Se calcula en tu teléfono"}
      </span>

      {bursting ? (
        <span className="pointer-events-none absolute right-4 top-4 z-[3]" aria-hidden="true">
          <Sparkles className="animate-sparkle size-8 text-[#fff3d6]" />
        </span>
      ) : null}

      {busy ? (
        <span
          role="status"
          className="pointer-events-none absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 rounded-full bg-[#1b1712]/75 px-3 py-1 text-xs text-[#f4efe6] backdrop-blur"
        >
          Analizando la foto…
        </span>
      ) : null}

      {[
        "left-2 top-2 border-l-2 border-t-2 rounded-tl-xl",
        "right-2 top-2 border-r-2 border-t-2 rounded-tr-xl",
        "left-2 bottom-2 border-b-2 border-l-2 rounded-bl-xl",
        "right-2 bottom-2 border-b-2 border-r-2 rounded-br-xl",
      ].map((tick) => (
        <span
          key={tick}
          aria-hidden="true"
          className={cn("pointer-events-none absolute size-5 border-[#8a6f3f]/60", tick)}
        />
      ))}
    </div>
  );
}

/** Estado vacío ilustrado: una silueta dibujada con CSS, con flotación suave. */
export function EmptyStage({
  title,
  hint,
  tone = "gold",
}: {
  title: string;
  hint?: string;
  tone?: "gold" | "berry" | "jade";
}) {
  const gradient =
    tone === "berry"
      ? "from-berry/40 via-berry/10 to-transparent"
      : tone === "jade"
        ? "from-jade/40 via-jade/10 to-transparent"
        : "from-accent/45 via-accent/10 to-transparent";

  return (
    <div className="relative flex min-h-72 flex-col justify-end overflow-hidden rounded-3xl border border-fg/10 bg-surface p-6">
      <div
        aria-hidden="true"
        className={cn(
          "animate-float-soft absolute -right-10 -top-12 size-56 rounded-full bg-gradient-to-br blur-3xl",
          gradient,
        )}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(244,239,230,0.09),transparent)]"
      />
      <p className="relative font-display text-3xl leading-tight text-fg">{title}</p>
      {hint ? <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}
