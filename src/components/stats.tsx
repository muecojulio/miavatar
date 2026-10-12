import type { LucideIcon } from "lucide-react";
import { Rail } from "@/components/rail";

/** Tira de datos vivos del avatar: valores actuales, siempre a la vista. */
export function StatPills({
  label,
  items,
  fadeColor = "var(--color-bg)",
}: {
  label: string;
  items: { id: string; label: string; value: string; icon?: LucideIcon }[];
  fadeColor?: string;
}) {
  if (items.length === 0) return null;
  return (
    <Rail label={label} hint={null} fadeColor={fadeColor} className="mb-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <span
            key={item.id}
            className="flex shrink-0 items-center gap-2 rounded-2xl border border-fg/10 bg-surface-2/70 px-3 py-1.5"
          >
            {Icon ? <Icon className="size-4 text-accent" aria-hidden="true" /> : null}
            <span className="text-[11px] uppercase tracking-wide text-muted">{item.label}</span>
            <span className="font-display text-base text-fg">{item.value}</span>
          </span>
        );
      })}
    </Rail>
  );
}
