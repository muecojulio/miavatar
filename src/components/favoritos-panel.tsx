import { useMemo, useRef, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { EmptyStage } from "@/components/stage";
import { Rail } from "@/components/rail";
import { Button, Note } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/motion";
import { statusFor, useStudio, type FavoriteView } from "@/lib/store";
import { FAVORITE_KINDS, favoriteKindLabel, type FavoriteKind } from "@/lib/types";

type Filter = FavoriteKind | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  ...FAVORITE_KINDS.map((item) => ({ id: item.id as Filter, label: item.label })),
];

export function FavoritosPanel() {
  const favorites = useStudio((state) => state.favorites);
  const counts = useStudio((state) => state.favoriteCounts);
  const remove = useStudio((state) => state.deleteFavorite);
  const action = useStudio((state) => state.action);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const format = useMemo(
    () => new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }),
    [],
  );
  const visible = favorites.filter((item) => filter === "all" || item.kind === filter);

  const listStatus = statusFor(action, "favoritos");

  function scrollCards(direction: 1 | -1) {
    const node = track.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>("[data-card]");
    const step = (card?.offsetWidth ?? 260) + 14;
    node.scrollBy({ left: step * direction, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div className="space-y-5">
      <header className="stagger" style={{ ["--i" as string]: 0 }}>
        <h2 className="font-display text-3xl leading-tight">Favoritos</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Cada prueba guardada muestra el resultado, las fotos que usaste y el color del tinte o del
          esmalte. Todo vive en este dispositivo.
        </p>
      </header>

      <Rail label="Filtros de pruebas guardadas" activeKey={filter} hint={null} fadeColor="var(--color-bg)">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          const total = counts[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-active={active}
              onClick={() => setFilter(item.id)}
              className="chip"
            >
              {item.label}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-[10px] font-semibold",
                  active ? "bg-bg/25 text-bg" : "bg-fg/10 text-muted",
                )}
              >
                {total}
              </span>
            </button>
          );
        })}
      </Rail>

      <p role="status" className="sr-only">
        {visible.length} {visible.length === 1 ? "prueba" : "pruebas"} en pantalla.
      </p>

      {visible.length === 0 ? (
        <EmptyStage
          title="Todavía no hay pruebas guardadas."
          hint="Cuando te guste un resultado, pulsa guardar en Prendas, Cabello o Uñas y aparecerá aquí."
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {visible.length} {visible.length === 1 ? "prueba" : "pruebas"} · desliza las tarjetas
              para comparar
            </p>
            <div className="hidden gap-1.5 sm:flex lg:hidden">
              <button
                type="button"
                aria-label="Ver la prueba anterior"
                onClick={() => scrollCards(-1)}
                className="tap grid size-11 place-items-center rounded-full border border-fg/10 bg-surface-2/70 text-muted"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Ver la siguiente prueba"
                onClick={() => scrollCards(1)}
                className="tap grid size-11 place-items-center rounded-full border border-fg/10 bg-surface-2/70 text-muted"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div ref={track} data-rail className="carousel-track no-scrollbar">
            {visible.map((item, index) => (
              <FavoriteCard
                key={item.id}
                item={item}
                index={index}
                selected={selected === item.id}
                onSelect={() => setSelected(selected === item.id ? null : item.id)}
                onRemove={() => void remove(item.id)}
                removing={action.state === "saving" && action.id === item.id}
                format={(date) => format.format(date)}
              />
            ))}
          </div>
        </>
      )}

      {listStatus === "error" || action.state === "error" ? (
        <Note tone="error">{action.message}</Note>
      ) : null}
    </div>
  );
}

function FavoriteCard({
  item,
  index,
  selected,
  onSelect,
  onRemove,
  removing,
  format,
}: {
  item: FavoriteView;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  removing: boolean;
  format: (date: number) => string;
}) {
  const [details, setDetails] = useState(false);

  return (
    <article
      data-card
      data-active={selected}
      className={cn(
        "stagger card sheen lift flex flex-col overflow-hidden",
        selected && "border-accent/60 shadow-[var(--glow-soft)]",
      )}
      style={{ ["--i" as string]: Math.min(index, 6) }}
      aria-current={selected ? "true" : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="relative block w-full text-left"
      >
        <img
          src={item.previewUrl}
          alt={`Resultado guardado: ${favoriteKindLabel(item.kind)}`}
          className="aspect-4/5 w-full bg-bg-deep object-cover"
          loading="lazy"
          decoding="async"
        />
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-bg/80 px-2.5 py-1 text-[11px] font-medium text-fg backdrop-blur">
          {favoriteKindLabel(item.kind)}
        </span>
        {selected ? (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-accent px-2 py-1 text-[11px] font-semibold text-[#17140f]">
            Destacada
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{item.meta}</p>
          <p className="text-xs text-muted">{format(item.createdAt)}</p>
        </div>

        {item.sources.length > 0 ? (
          <Rail
            label={`Fotos usadas en la prueba ${index + 1}`}
            hint={null}
            fadeColor="var(--color-surface)"
          >
            {item.sources.map((source) => (
              <figure key={source.url} className="w-20 shrink-0">
                <img
                  src={source.url}
                  alt={source.label}
                  className="size-20 rounded-xl object-cover outline outline-1 outline-fg/10"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="mt-1 truncate text-[10px] text-muted">
                  {source.label}
                </figcaption>
              </figure>
            ))}
          </Rail>
        ) : null}

        <Collapsible.Root open={details} onOpenChange={setDetails}>
          <Collapsible.Trigger className="tap flex min-h-11 w-full items-center justify-between rounded-2xl border border-fg/10 px-3 text-sm text-muted">
            {details ? "Ocultar detalles" : "Ver detalles y acciones"}
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", details && "rotate-180")}
              aria-hidden="true"
            />
          </Collapsible.Trigger>
          <Collapsible.Content className="collapsible-content">
            <div className="space-y-2 pt-2">
              <p className="text-xs leading-relaxed text-muted">
                La prueba se guardó con {item.sources.length}{" "}
                {item.sources.length === 1 ? "foto" : "fotos"} de referencia y el color elegido. El
                archivo se puede descargar y no sale de este dispositivo.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={item.previewUrl}
                  download={`miavatar-${item.kind}-${item.id.slice(0, 8)}.jpg`}
                  className="tap inline-flex min-h-11 items-center gap-2 rounded-full border border-fg/15 px-4 text-sm text-fg"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Descargar
                </a>
                <Button
                  variant="danger"
                  status={removing ? "loading" : "idle"}
                  statusLabel="Quitando la prueba"
                  icon={Trash2}
                  onClick={onRemove}
                >
                  Quitar
                </Button>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    </article>
  );
}
