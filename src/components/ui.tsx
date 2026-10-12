import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import {
  AlertTriangle,
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  useId,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Rail } from "@/components/rail";
import { cn } from "@/lib/cn";

/**
 * Primitivas de interfaz de miavatar.
 *
 * Todas comparten las mismas decisiones: objetivo táctil ≥ 44 px, respuesta
 * visible al pulsar, estados de carga/éxito/error que no dependen sólo del
 * color, etiquetas accesibles y movimiento que se apaga cuando el sistema pide
 * movimiento reducido.
 */

export type ActionState = "idle" | "loading" | "success" | "error";

/* ------------------------------------------------------------------ Botón */

export function Button({
  className,
  variant = "primary",
  status = "idle",
  statusLabel,
  icon: Icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet" | "danger";
  status?: ActionState;
  /** Texto que se anuncia al cambiar de estado (aria-live). */
  statusLabel?: string;
  icon?: LucideIcon;
}) {
  const busy = status === "loading";
  const Glyph =
    status === "loading"
      ? LoaderCircle
      : status === "success"
        ? Check
        : status === "error"
          ? AlertTriangle
          : Icon;

  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      data-status={status}
      className={cn(
        "tap lift relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold",
        variant === "primary" &&
          "bg-gradient-to-br from-accent-soft via-accent to-[#a9843f] text-[#17140f] shadow-[var(--glow-soft)]",
        variant === "ghost" && "border border-fg/20 bg-transparent text-fg",
        variant === "quiet" && "bg-surface-2 text-fg",
        variant === "danger" && "border border-ember/50 bg-ember/15 text-fg",
        status === "success" && "border-jade/60 bg-jade/20 text-fg",
        status === "error" && "border-ember/60 bg-ember/20 text-fg",
        props.disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      {Glyph ? (
        <Glyph
          className={cn("size-4 shrink-0", busy && "animate-spin", status === "success" && "pop")}
          aria-hidden="true"
        />
      ) : null}
      <span className="truncate">{children}</span>
      {statusLabel && status !== "idle" ? (
        <span role="status" className="sr-only">
          {statusLabel}
        </span>
      ) : null}
    </button>
  );
}

export function IconButton({
  label,
  icon: Icon,
  className,
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        "tap lift relative grid size-11 shrink-0 place-items-center rounded-full outline outline-1",
        active
          ? "bg-gradient-to-br from-accent-soft to-accent text-[#17140f] outline-transparent shadow-[var(--glow-soft)]"
          : "bg-surface-2/80 text-muted outline-fg/10",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

/* --------------------------------------------------------------- Interruptor */

export function Toggle({
  label,
  checked,
  onCheckedChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <span className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm text-fg">
          {label}
        </label>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-transparent bg-accent/40" : "border-fg/15 bg-surface-2",
        )}
      >
        <Switch.Thumb
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-spring)]",
            checked
              ? "translate-x-7 bg-gradient-to-br from-accent-soft to-accent text-[#17140f] shadow-[var(--glow-soft)]"
              : "translate-x-1 bg-muted/70 text-transparent",
          )}
        >
          <Check className="size-3.5" aria-hidden="true" />
        </Switch.Thumb>
        <span className="sr-only">{checked ? "Activado" : "Desactivado"}</span>
      </Switch.Root>
    </div>
  );
}

/* ---------------------------------------------------------------- Deslizador */

export function SliderField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="block">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-lg text-fg">
          {value} {suffix}
        </output>
      </div>
      <Slider.Root
        id={id}
        className="relative flex h-11 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? value)}
      >
        <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-fg/15">
          <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-[#a9843f] via-accent to-accent-soft" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          aria-valuetext={`${value} ${suffix}`}
          className="block size-6 rounded-full border-2 border-bg bg-gradient-to-br from-[#fff8ea] to-accent shadow-[var(--glow-soft)] transition-transform duration-150 focus-visible:outline-none data-[dragging]:scale-110"
        />
      </Slider.Root>
    </div>
  );
}

/* ------------------------------------------------------------------- Avisos */

export function Note({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2 rounded-2xl border px-3 py-2 text-sm",
        tone === "error"
          ? "border-ember/40 bg-ember/10 text-fg"
          : tone === "success"
            ? "border-jade/40 bg-jade/10 text-fg"
            : "border-accent/30 bg-accent/10 text-fg",
      )}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {tone === "error" ? (
          <AlertTriangle className="size-4 text-ember" />
        ) : tone === "success" ? (
          <Check className="size-4 text-jade" />
        ) : (
          <span className="block size-4 rounded-full bg-accent/70" />
        )}
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/* ------------------------------------------------------------------- Chips */

/** Grupo de opciones cortas con semántica de radiogroup y flechas de teclado. */
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  /** `null` cuando todavía no hay elección: ningún chip se marca como activo. */
  value: T | null;
  onChange: (id: T) => void;
}) {
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((option) => option.id === value);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      // Sin elección previa, la primera flecha elige la primera opción.
      onChange(index === -1 ? options[0]!.id : options[(index + 1) % options.length]!.id);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(
        index === -1 ? options[options.length - 1]!.id : options[(index - 1 + options.length) % options.length]!.id,
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(options[0]!.id);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(options[options.length - 1]!.id);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {options.map((option, optionIndex) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            // Sin elección, la primera opción recibe el foco del grupo: un
            // radiogroup nunca queda fuera del orden de tabulación.
            tabIndex={active || (value === null && optionIndex === 0) ? 0 : -1}
            data-active={active}
            data-state={active ? "on" : "off"}
            onClick={() => onChange(option.id)}
            className="chip"
          >
            {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Muestras de color: carril con imán, nombre accesible y estado activo visible. */
export function Swatches({
  label,
  options,
  value,
  onChange,
  fadeColor,
}: {
  label: string;
  options: { id: string; label: string; hex: string }[];
  value: string;
  onChange: (id: string) => void;
  fadeColor?: string;
}) {
  return (
    <Rail label={label} fadeColor={fadeColor} activeKey={value} hint={null}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            data-active={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "tap flex min-h-11 shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 text-xs outline",
              active
                ? "bg-surface-2 text-fg outline-2 outline-accent"
                : "text-muted outline-1 outline-fg/10",
            )}
          >
            <span className="relative block size-7">
              <span
                className="absolute inset-0 rounded-full outline outline-1 outline-fg/25"
                style={{
                  background: option.hex || "repeating-conic-gradient(#8a8a8a 0% 25%, #c4c4c4 0% 50%) 50% / 8px 8px",
                }}
              />
              {active ? (
                <Check
                  className="absolute inset-0 m-auto size-4 text-bg drop-shadow-[0_1px_2px_rgba(255,255,255,0.65)]"
                  aria-hidden="true"
                />
              ) : null}
            </span>
            <span className="max-w-16 truncate">{option.label}</span>
          </button>
        );
      })}
    </Rail>
  );
}

/* --------------------------------------------------------------- Fotografías */

export function PhotoButtons({
  takeLabel,
  pickLabel,
  capture = "environment",
  onFile,
}: {
  takeLabel: string;
  pickLabel: string;
  capture?: "user" | "environment";
  onFile: (file: File) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <FileLabel icon={Camera} capture={capture} onFile={onFile}>
        {takeLabel}
      </FileLabel>
      <FileLabel icon={ImagePlus} onFile={onFile}>
        {pickLabel}
      </FileLabel>
    </div>
  );
}

/** Cámara o galería, aceptando más de una foto a la vez. */
export function MultiPhotoButtons({
  takeLabel,
  pickLabel,
  onFiles,
}: {
  takeLabel: string;
  pickLabel: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <FileLabel icon={Camera} capture="environment" multiple onFiles={onFiles}>
        {takeLabel}
      </FileLabel>
      <FileLabel icon={ImagePlus} multiple onFiles={onFiles}>
        {pickLabel}
      </FileLabel>
    </div>
  );
}

function FileLabel({
  children,
  icon: Icon,
  capture,
  multiple,
  onFile,
  onFiles,
}: {
  children: ReactNode;
  icon: LucideIcon;
  capture?: "user" | "environment";
  multiple?: boolean;
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
}) {
  return (
    <label className="tap lift inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-fg/10 bg-surface-2/85 px-3 text-center text-sm font-medium text-fg">
      <Icon className="size-4 text-accent" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        capture={capture}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (onFiles) onFiles(files);
          else if (onFile && files[0]) onFile(files[0]);
        }}
      />
    </label>
  );
}

/** Carril de fotos del avatar: seleccionar y quitar, con la activa señalada. */
export function ThumbPicks({
  label,
  items,
  activeId = null,
  onPick,
  onRemove,
  empty,
  fadeColor,
}: {
  label: string;
  items: { id: string; url: string; caption?: string }[];
  activeId?: string | null;
  onPick?: (id: string) => void;
  onRemove: (id: string) => void;
  empty?: ReactNode;
  fadeColor?: string;
}) {
  if (items.length === 0 && empty) return <>{empty}</>;
  const activeIndex = items.findIndex((item) => item.id === activeId);

  return (
    <Rail label={label} hint="Desliza para ver todas" activeKey={activeId} fadeColor={fadeColor}>
      {items.map((item, index) => {
        const active = activeId === item.id;
        return (
          <div key={item.id} className="relative shrink-0" data-active={active}>
            <button
              type="button"
              aria-pressed={onPick ? active : undefined}
              aria-label={item.caption ?? `Foto ${index + 1}`}
              onClick={() => onPick?.(item.id)}
              className={cn(
                "tap block overflow-hidden rounded-2xl border-2",
                active ? "border-accent" : "border-transparent",
              )}
            >
              <img
                src={item.url}
                alt={item.caption ?? ""}
                className="size-24 object-cover"
                loading="lazy"
                decoding="async"
              />
              {item.caption ? (
                <span className="block max-w-24 truncate bg-surface-2 px-1 py-1 text-[11px] text-muted">
                  {item.caption}
                </span>
              ) : null}
            </button>
            {active ? (
              <span className="pointer-events-none absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-[#17140f]">
                <Check className="size-3" aria-hidden="true" />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Quitar ${item.caption ?? `la foto ${index + 1}`}`}
              className="tap absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-bg/80 text-muted outline outline-1 outline-fg/15 backdrop-blur"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
            {activeIndex === index ? <span className="sr-only">Seleccionada</span> : null}
          </div>
        );
      })}
    </Rail>
  );
}
