import * as Switch from "@radix-ui/react-switch";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" }) {
  return (
    <button
      className={cn(
        "tap inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-40",
        variant === "primary" && "bg-accent text-bg",
        variant === "ghost" && "bg-transparent text-fg outline outline-1 outline-fg/20",
        variant === "quiet" && "bg-surface text-fg",
        className,
      )}
      {...props}
    />
  );
}

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
      <FileLabel capture={capture} onFile={onFile}>
        {takeLabel}
      </FileLabel>
      <FileLabel onFile={onFile}>{pickLabel}</FileLabel>
    </div>
  );
}

function FileLabel({
  children,
  capture,
  onFile,
}: {
  children: ReactNode;
  capture?: "user" | "environment";
  onFile: (file: File) => void;
}) {
  return (
    <label className="tap inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-3 text-center text-sm font-medium text-fg">
      {children}
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        capture={capture}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4">
      <span className="text-sm text-fg">{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 shrink-0 rounded-full bg-surface outline outline-1 outline-fg/15 transition-colors data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-fg transition-transform duration-150 ease-out data-[state=checked]:translate-x-6 data-[state=checked]:bg-bg" />
      </Switch.Root>
    </label>
  );
}

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
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-display text-lg text-fg">
          {value} {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-valuetext={`${value} ${suffix}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Swatches({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; hex: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "tap flex shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs",
              active ? "bg-surface text-fg outline outline-1 outline-accent" : "text-muted",
            )}
          >
            <span
              className="size-8 rounded-full outline outline-1 outline-fg/20"
              style={{ background: option.hex || "transparent" }}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="text-sm text-accent">
      {children}
    </p>
  );
}

/** Camera or gallery, accepting more than one photo at a time. */
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
      <label className="tap inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-3 text-center text-sm font-medium text-fg">
        {takeLabel}
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) onFiles(files);
          }}
        />
      </label>
      <label className="tap inline-flex min-h-11 items-center justify-center rounded-full bg-surface px-3 text-center text-sm font-medium text-fg">
        {pickLabel}
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) onFiles(files);
          }}
        />
      </label>
    </div>
  );
}

/** Horizontal gallery of the photos already inside the avatar. */
export function ThumbPicks({
  items,
  activeId = null,
  onPick,
  onRemove,
  empty,
}: {
  items: { id: string; url: string; caption?: string }[];
  activeId?: string | null;
  onPick?: (id: string) => void;
  onRemove: (id: string) => void;
  empty?: ReactNode;
}) {
  if (items.length === 0 && empty) return <>{empty}</>;
  return (
    <ul className="flex gap-3 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <li key={item.id} className="shrink-0">
            <button
              type="button"
              aria-pressed={onPick ? active : undefined}
              onClick={() => onPick?.(item.id)}
              className={cn(
                "tap block overflow-hidden rounded-2xl outline outline-2",
                active ? "outline-accent" : "outline-transparent",
              )}
            >
              <img src={item.url} alt={item.caption ?? ""} className="size-20 object-cover" />
              {item.caption ? (
                <span className="block max-w-20 truncate bg-surface px-1 py-1 text-xs text-muted">
                  {item.caption}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="tap mt-1 w-full text-xs text-muted"
              aria-label={`Quitar ${item.caption ?? "esta foto"}`}
            >
              Quitar
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Choice row for two or three short options. */
export function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={cn(
            "tap min-h-9 rounded-full px-3 text-xs",
            option.id === value
              ? "bg-accent text-bg"
              : "bg-surface text-muted outline outline-1 outline-fg/15",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
