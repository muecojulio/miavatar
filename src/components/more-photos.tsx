import { useState, type ReactNode } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Images } from "lucide-react";
import { MultiPhotoButtons } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Bloque "Volver a subir fotos": panel plegable con estado accesible
 * (`aria-expanded`, `aria-controls`) y apertura/cierre animados sin saltos.
 * Las fotos que se eligen aquí se *suman* al avatar; la cara y la figura no se
 * tocan.
 */
export function MorePhotos({
  hint,
  takeLabel,
  pickLabel = "Volver a subir fotos",
  onFiles,
  children,
  defaultOpen = true,
}: {
  hint: string;
  takeLabel: string;
  pickLabel?: string;
  onFiles: (files: File[]) => void;
  children?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className="card overflow-hidden p-4"
      data-state={open ? "open" : "closed"}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Images className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-fg">Volver a subir fotos</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>
        </div>
        <Collapsible.Trigger
          className="tap grid size-11 shrink-0 place-items-center rounded-full border border-fg/10 text-muted"
          aria-label={open ? "Ocultar los pasos de este bloque" : "Mostrar los pasos de este bloque"}
        >
          <ChevronDown
            className={cn("size-5 transition-transform duration-250", open && "rotate-180")}
            aria-hidden="true"
          />
        </Collapsible.Trigger>
      </div>

      <Collapsible.Content className="collapsible-content">
        <div className="space-y-3 pt-3">
          <MultiPhotoButtons takeLabel={takeLabel} pickLabel={pickLabel} onFiles={onFiles} />
          {children}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
