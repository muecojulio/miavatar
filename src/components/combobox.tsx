import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { normalizeText } from "@/lib/cache";

/**
 * Selector con búsqueda (combobox + listbox).
 *
 * Accesibilidad: `role="combobox"` con `aria-expanded`, `aria-controls` y
 * `aria-activedescendant`; lista `role="listbox"` con opciones `role="option"` y
 * `aria-selected`. Teclado completo: ↑/↓ para recorrer, Inicio/Fin, Enter para
 * confirmar, Escape para cerrar. La opción activa se mantiene visible, el menú
 * se cierra al tocar fuera y la lista tiene su propia altura máxima con scroll
 * aislado (`overscroll-contain`) para no arrastrar la página.
 *
 * La búsqueda ignora mayúsculas, minúsculas y acentos.
 */

export type ComboOption = {
  id: string;
  label: string;
  sublabel?: string;
  keywords?: string;
};

export function Combobox({
  id,
  label,
  hint,
  placeholder,
  value,
  onValueChange,
  options,
  onSelect,
  onSearch,
  loading = false,
  open,
  onOpenChange,
  emptyMessage = "Sin coincidencias.",
  filterLocally = true,
  action,
  className,
}: {
  id?: string;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ComboOption[];
  onSelect: (id: string) => void;
  /** Búsqueda remota opcional, ya con retardo aplicado por quien la usa. */
  onSearch?: (query: string) => void;
  loading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emptyMessage?: string;
  filterLocally?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  const autoId = useId();
  const inputId = id ?? `combo-${autoId}`;
  const listId = `${inputId}-list`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const query = normalizeText(value);
  const visible =
    filterLocally && query.length > 0
      ? options.filter((option) =>
          normalizeText(`${option.label} ${option.sublabel ?? ""} ${option.keywords ?? ""}`).includes(
            query,
          ),
        )
      : options;

  useEffect(() => {
    setActive((current) => (current < visible.length ? current : 0));
  }, [visible.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const option = list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    option?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function commit(index: number) {
    const option = visible[index];
    if (!option) return;
    onSelect(option.id);
    onOpenChange(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        onOpenChange(true);
        return;
      }
      setActive((current) => (visible.length ? (current + 1) % visible.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        onOpenChange(true);
        return;
      }
      setActive((current) => (visible.length ? (current - 1 + visible.length) % visible.length : 0));
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(Math.max(0, visible.length - 1));
    } else if (event.key === "Enter") {
      if (open && visible.length > 0) {
        event.preventDefault();
        commit(active);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        onOpenChange(false);
      }
    } else if (event.key === "Tab") {
      onOpenChange(false);
    }
  }

  const activeOption = open ? visible[active] : undefined;

  return (
    <div className={cn("relative", className)} ref={wrapper}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? `${listId}-option-${activeOption.id}` : undefined}
            aria-describedby={hintId}
            autoComplete="off"
            spellCheck={false}
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              onValueChange(event.target.value);
              onOpenChange(true);
              setActive(0);
              onSearch?.(event.target.value);
            }}
            onFocus={() => onOpenChange(true)}
            onKeyDown={onKeyDown}
            className="min-h-11 w-full rounded-full border border-fg/10 bg-bg/80 py-2 pl-10 pr-11 text-sm text-fg placeholder:text-muted/70 transition-colors focus-visible:border-accent/60 focus-visible:outline-none"
          />
          {value ? (
            <button
              type="button"
              aria-label="Borrar la búsqueda"
              onClick={() => {
                onValueChange("");
                onSearch?.("");
                setActive(0);
              }}
              className="tap absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              aria-label={open ? "Cerrar la lista de opciones" : "Abrir la lista de opciones"}
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => onOpenChange(!open)}
              className="tap absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted"
            >
              <ChevronDown
                className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
        {action}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}

      <p role="status" className="sr-only">
        {loading
          ? "Buscando coincidencias…"
          : open
            ? `${visible.length} ${visible.length === 1 ? "resultado" : "resultados"} disponibles.`
            : ""}
      </p>

      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={`Opciones de ${label}`}
          className="floating-panel absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto p-1.5"
        >
          {loading ? (
            <li className="flex items-center gap-2 px-3 py-3 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Buscando…
            </li>
          ) : null}
          {!loading && visible.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">{emptyMessage}</li>
          ) : null}
          {visible.map((option, index) => {
            const isActive = index === active;
            return (
              <li key={option.id} role="none">
                <button
                  type="button"
                  id={`${listId}-option-${option.id}`}
                  role="option"
                  aria-selected={isActive}
                  data-index={index}
                  tabIndex={-1}
                  onMouseEnter={() => setActive(index)}
                  // `mousedown` no roba el foco del campo: el patrón combobox queda estable.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit(index)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm",
                    isActive ? "bg-accent/15 text-fg" : "text-muted",
                  )}
                >
                  <Check
                    className={cn("size-4 shrink-0", isActive ? "text-accent" : "opacity-0")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.sublabel ? (
                      <span className="block truncate text-xs text-muted">{option.sublabel}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
