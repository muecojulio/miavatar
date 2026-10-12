import type { ReactNode } from "react";
import { Images } from "lucide-react";
import { MultiPhotoButtons } from "@/components/ui";

/**
 * The re-upload block shown in every tab except Favoritos: photos chosen here
 * are *added* to the avatar that already exists — the face photo and the figure
 * are left alone.
 */
export function MorePhotos({
  hint,
  takeLabel,
  pickLabel = "Volver a subir fotos",
  onFiles,
  children,
}: {
  hint: string;
  takeLabel: string;
  pickLabel?: string;
  onFiles: (files: File[]) => void;
  children?: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-3xl bg-surface/70 p-4">
      <div className="flex items-start gap-3">
        <Images className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div>
          <h2 className="text-sm font-medium text-fg">Volver a subir fotos</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>
        </div>
      </div>
      <MultiPhotoButtons takeLabel={takeLabel} pickLabel={pickLabel} onFiles={onFiles} />
      {children}
    </section>
  );
}
