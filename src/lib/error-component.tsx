import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { Compass, RotateCcw, TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Ocurrió un error inesperado. Recarga la página para continuar.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

/** Pantalla de error de la app: mismo lenguaje visual, mensaje técnico visible. */
export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
      <span
        className="grid size-14 place-items-center rounded-3xl border border-ember/40 bg-ember/15 text-ember"
        aria-hidden="true"
      >
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="font-display text-2xl">Algo se rompió en el estudio</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted" role="alert">
        {errorMessage(error)}
      </p>
      <button
        type="button"
        onClick={() => reset?.()}
        className="tap lift inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-br from-accent-soft via-accent to-[#a9843f] px-5 text-sm font-semibold text-[#17140f]"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Reintentar
      </button>
      <p className="text-xs text-muted">
        Tus fotos siguen en este dispositivo: el error no afecta a lo guardado.
      </p>
    </main>
  );
}

/** Pantalla para una ruta que no existe: mismo lenguaje, salida clara. */
export function AppNotFoundComponent() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
      <span
        className="animate-float-soft grid size-14 place-items-center rounded-3xl border border-accent/40 bg-accent/15 text-accent"
        aria-hidden="true"
      >
        <Compass className="size-7" />
      </span>
      <h1 className="font-display text-2xl">Esta página no existe</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted">
        Puede que el enlace esté mal escrito o que la sección se haya movido. El estudio sigue
        completo en la página principal.
      </p>
      <Link
        to="/"
        className="tap lift inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-br from-accent-soft via-accent to-[#a9843f] px-5 text-sm font-semibold text-[#17140f]"
      >
        Volver al estudio
      </Link>
    </main>
  );
}
