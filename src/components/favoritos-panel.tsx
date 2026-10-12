import { useState } from "react";
import { useStudio } from "@/lib/store";

const filters = [
  { id: "all", label: "Todo" },
  { id: "prenda", label: "Prendas" },
  { id: "cabello", label: "Cabello" },
] as const;

export function FavoritosPanel() {
  const favorites = useStudio((state) => state.favorites);
  const remove = useStudio((state) => state.deleteFavorite);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visible = favorites.filter((item) => filter === "all" || item.kind === filter);
  const format = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="panel space-y-5">
      <div>
        <h2 className="font-display text-3xl leading-tight">Favoritos</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Cada prueba guardada muestra el resultado y las fotos que usaste.
        </p>
      </div>
      <div className="flex gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={
              filter === item.id
                ? "tap min-h-11 rounded-full bg-accent px-4 text-sm text-bg"
                : "tap min-h-11 rounded-full bg-surface px-4 text-sm text-fg"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="rounded-3xl bg-surface px-5 py-8">
          <p className="font-display text-2xl">Todavía no hay pruebas guardadas.</p>
          <p className="mt-2 text-sm text-muted">Cuando te guste un resultado, pulsa guardar en Prendas o Cabello.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-3xl bg-surface">
              <img src={item.previewUrl} alt="" className="w-full bg-fg object-cover" />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-fg">{item.kind === "prenda" ? "Prendas" : "Cabello"}</p>
                    <p className="text-sm text-muted">{item.meta}</p>
                    <p className="text-xs text-muted">{format.format(item.createdAt)}</p>
                  </div>
                  <button type="button" className="tap min-h-11 text-sm text-muted" onClick={() => void remove(item.id)}>
                    Quitar
                  </button>
                </div>
                {item.sources.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto">
                    {item.sources.map((source) => (
                      <figure key={source.url} className="shrink-0">
                        <img src={source.url} alt={source.label} className="size-20 rounded-xl object-cover" />
                        <figcaption className="mt-1 text-xs text-muted">{source.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
