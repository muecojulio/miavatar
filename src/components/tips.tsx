import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/motion";
import { onVisionProgress, prewarmVision, type VisionProgress } from "@/lib/vision";

/**
 * Consejo rotatorio: una línea que cambia cada pocos segundos para que la
 * primera pantalla tenga vida, sin movimiento constante ni distracción. Con
 * movimiento reducido se queda en el primer consejo.
 */
export function TipsTicker({ tips }: { tips: string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || tips.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % tips.length), 7000);
    return () => window.clearInterval(timer);
  }, [reduced, tips.length]);

  const tip = tips[index] ?? tips[0];

  return (
    <p className="mt-3 flex items-center gap-2 text-xs leading-relaxed text-muted">
      <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
      <span key={index} className="animate-marquee-in">
        {tip}
      </span>
    </p>
  );
}

/**
 * Progreso real de los modelos de visión, que se descargan la primera vez.
 * Explica qué está pasando (y cuánto falta) en vez de mostrar un "espera" mudo.
 */
export function VisionBadge() {
  const [progress, setProgress] = useState<VisionProgress | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const off = onVisionProgress(setProgress);
    const timer = window.setTimeout(() => {
      setStarted(true);
      void prewarmVision().catch(() => undefined);
    }, 900);
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  const done = progress?.stage === "ready";
  const failed = progress?.stage === "error";
  if (!started || done || !progress || progress.stage === "idle") return null;

  const steps = ["wasm", "face", "hair", "hands"] as const;
  const completed = steps.filter((step) => progress.loaded.includes(step)).length;
  const ratio = failed ? 1 : Math.min(0.95, completed / steps.length);

  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs",
        failed ? "border-ember/40 bg-ember/10 text-fg" : "border-accent/25 bg-accent/10 text-fg",
      )}
    >
      {failed ? (
        <CircleCheck className="size-4 shrink-0 text-ember" aria-hidden="true" />
      ) : (
        <LoaderCircle className="size-4 shrink-0 animate-spin text-accent" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate">
          {failed ? "Un modelo no cargó: la prueba sigue funcionando." : progress.message}
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fg/10">
          <div
            className="progress-sheen h-full rounded-full bg-gradient-to-r from-[#a9843f] via-accent to-accent-soft transition-[width] duration-500"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      </div>
      <span className="sr-only" role="status">
        {failed ? "Carga de modelos incompleta" : `${completed} de ${steps.length} modelos listos`}
      </span>
    </div>
  );
}
