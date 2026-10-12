import { useEffect, useRef } from "react";
import { Check, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useStudio } from "@/lib/store";

/**
 * Avisos breves y accesibles.
 *
 * Los mensajes de estado de los componentes siguen existiendo en la propia
 * interfaz (regiones `role="status"`); el brindis es un refuerzo visual con el
 * mismo texto, útil cuando la acción ocurre fuera de la vista (por ejemplo, al
 * guardar desde el final del formulario).
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      theme="dark"
      gap={10}
      offset={96}
      duration={3200}
      visibleToasts={3}
      icons={{
        success: <Check className="size-4" aria-hidden="true" />,
        error: <TriangleAlert className="size-4" aria-hidden="true" />,
        info: <Info className="size-4" aria-hidden="true" />,
        loading: <LoaderCircle className="animate-spin size-4" aria-hidden="true" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-fg/12 !bg-surface/95 !text-fg !shadow-[var(--shadow-lift)] !backdrop-blur",
          description: "!text-muted",
          title: "!text-sm !font-medium",
          actionButton: "!rounded-full !bg-accent !text-[#17140f]",
          cancelButton: "!rounded-full !bg-surface-2 !text-muted",
        },
      }}
    />
  );
}

/** Traduce el estado de la acción actual (guardar, quitar, borrar) a un aviso. */
export function ActionToasts() {
  const action = useStudio((state) => state.action);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const signature = `${action.id}|${action.state}|${action.message}`;
    if (action.state === "idle" || seen.current === signature) return;
    seen.current = signature;
    if (action.state === "saving") return;
    if (action.state === "done") toast.success(action.message);
    if (action.state === "error") toast.error(action.message);
  }, [action]);

  return null;
}
