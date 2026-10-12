import { useEffect, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Baby,
  ChevronDown,
  Cookie,
  Database,
  Feather,
  Globe,
  History,
  Lock,
  Scale,
  ScrollText,
  Shield,
  Sparkles,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { Rail } from "@/components/rail";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { PRIVACY_POLICY, PRIVACY_PROMISE, type PolicyBlock, type PolicySection } from "@/lib/legal";
import { useStudio } from "@/lib/store";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  shield: Shield,
  database: Database,
  scale: Scale,
  cookie: Cookie,
  globe: Globe,
  trash: Trash2,
  user: User,
  baby: Baby,
  lock: Lock,
  history: History,
  scroll: ScrollText,
};

/**
 * Política de privacidad dentro de la app: índice navegable, secciones
 * plegables con estado accesible, inventario de lo que hay guardado ahora mismo
 * y borrado con confirmación explícita.
 */
export function PrivacyPanel({ standalone = false }: { standalone?: boolean }) {
  const [open, setOpen] = useState<string | null>("resumen");
  const sections = PRIVACY_POLICY.sections;

  return (
    <section className={standalone ? "mx-auto min-h-dvh max-w-md space-y-5 px-4 py-6" : "space-y-5"}>
      <header className="stagger" style={{ ["--i" as string]: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-3xl leading-tight">Privacidad</h2>
          {standalone ? (
            <Link
              to="/"
              className="tap inline-flex min-h-11 items-center rounded-full border border-fg/10 px-3 text-sm text-muted"
            >
              Volver
            </Link>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{PRIVACY_POLICY.summary}</p>
        <p className="mt-2 text-xs text-muted">
          Versión {PRIVACY_POLICY.version} · actualizada el {PRIVACY_POLICY.updated} · vigente desde
          el {PRIVACY_POLICY.effective}
        </p>
      </header>

      <p className="stagger flex items-start gap-2 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm leading-relaxed text-fg" style={{ ["--i" as string]: 1 }}>
        <Shield className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        {PRIVACY_PROMISE}
      </p>

      <div className="stagger" style={{ ["--i" as string]: 2 }}>
        <Rail label="Índice de la política de privacidad" hint={null} fadeColor="var(--color-bg)">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              data-active={open === section.id}
              onClick={() => setOpen(section.id)}
              className="chip"
            >
              {section.title}
            </a>
          ))}
        </Rail>
      </div>

      <Inventory />

      <Accordion.Root
        type="single"
        collapsible
        value={open ?? ""}
        onValueChange={(value) => setOpen(value || null)}
        className="space-y-3"
      >
        {sections.map((section, index) => (
          <Section key={section.id} section={section} index={index} />
        ))}
      </Accordion.Root>

      <DangerZone />

      <p className="text-xs leading-relaxed text-muted">
        El mismo texto está versionado en el repositorio del proyecto
        (<span className="font-mono">docs/POLITICA-DE-PRIVACIDAD.md</span>) y se genera desde la
        fuente que usa esta página, así que no pueden divergir.
      </p>
    </section>
  );
}

function Section({ section, index }: { section: PolicySection; index: number }) {
  const Icon = section.icon ? ICONS[section.icon] : undefined;
  return (
    <Accordion.Item
      value={section.id}
      id={section.id}
      className="anchor-section card overflow-hidden"
      data-index={index}
    >
      <Accordion.Header className="m-0">
        <Accordion.Trigger className="group flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left">
          {Icon ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          ) : null}
          <span className="min-w-0 flex-1 font-display text-lg leading-tight text-fg">
            {section.title}
          </span>
          <ChevronDown
            className="size-5 shrink-0 text-muted transition-transform duration-250 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="accordion-content">
        <div className="space-y-4 border-t border-fg/10 px-4 py-4 text-sm leading-relaxed text-muted">
          {section.blocks.map((block, position) => (
            <Block key={`${section.id}-${position}`} block={block} />
          ))}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function Block({ block }: { block: PolicyBlock }) {
  if (block.kind === "p") return <p>{block.text}</p>;

  if (block.kind === "list") {
    return (
      <ul className="space-y-2">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "callout") {
    return (
      <div
        className={cn(
          "rounded-2xl border p-3",
          block.tone === "warn"
            ? "border-ember/40 bg-ember/10 text-fg"
            : "border-accent/30 bg-accent/10 text-fg",
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Feather className="size-4 shrink-0 text-accent" aria-hidden="true" />
          {block.title}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{block.text}</p>
      </div>
    );
  }

  return (
    <figure className="space-y-2">
      {block.caption ? <figcaption className="text-xs text-muted">{block.caption}</figcaption> : null}
      <div className="rail no-scrollbar overflow-x-auto rounded-2xl border border-fg/10">
        <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-surface-2/80">
              {block.headers.map((header) => (
                <th key={header} scope="col" className="px-3 py-2 font-semibold text-fg">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, index) => (
              <tr key={index} className="border-t border-fg/10 align-top">
                {row.map((cell, column) => (
                  <td key={column} className={cn("px-3 py-2", column === 0 && "text-fg")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Inventario en vivo: qué hay guardado en este navegador ahora mismo. */
function Inventory() {
  const profile = useStudio((state) => state.profile);
  const hair = useStudio((state) => state.hair);
  const nails = useStudio((state) => state.nails);
  const favorites = useStudio((state) => state.favorites);
  const memoryOk = useStudio((state) => state.memoryOk);

  const [cached, setCached] = useState(0);

  // El inventario se recalcula cuando cambia lo guardado (incluido el borrado).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let count = 0;
      for (let index = 0; index < window.localStorage.length; index += 1) {
        if (window.localStorage.key(index)?.startsWith("miavatar:cache:")) count += 1;
      }
      setCached(count);
    } catch {
      setCached(0);
    }
  }, [favorites.length, profile.garments.length, hair.styles.length, nails.designs.length]);

  const rows = [
    { id: "face", label: "Foto de tu cara", value: profile.faceBlob ? "Guardada" : "No hay" },
    { id: "garments", label: "Prendas", value: String(profile.garments.length) },
    { id: "selfie", label: "Foto de pelo", value: hair.selfieBlob ? "Guardada" : "No hay" },
    { id: "styles", label: "Peinados de referencia", value: String(hair.styles.length) },
    { id: "hand", label: "Foto de mano", value: nails.handBlob ? "Guardada" : "No hay" },
    { id: "designs", label: "Diseños de uñas", value: String(nails.designs.length) },
    { id: "favorites", label: "Pruebas guardadas", value: String(favorites.length) },
    { id: "cache", label: "Respuestas guardadas en caché", value: String(cached) },
  ];

  return (
    <section className="card p-4 stagger" style={{ ["--i" as string]: 3 }}>
      <h3 className="font-display text-lg">Lo que hay guardado en este navegador</h3>
      <p className="mt-1 text-xs text-muted">
        Nada de esto se ha enviado a un servidor. Es tu inventario local, calculado ahora mismo.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-fg/10 bg-bg/50 px-3 py-2"
          >
            <span className="min-w-0 truncate text-muted">{row.label}</span>
            <span className="shrink-0 font-medium text-fg">{row.value}</span>
          </li>
        ))}
      </ul>
      {!memoryOk ? (
        <p className="mt-2 text-xs text-ember">
          Este navegador no está guardando datos: el inventario se pierde al cerrar la pestaña.
        </p>
      ) : null}
    </section>
  );
}

/** Borrado con confirmación: una acción destructiva nunca debe ser un solo toque. */
function DangerZone() {
  const wipe = useStudio((state) => state.wipe);
  const note = useStudio((state) => state.note);
  const [open, setOpen] = useState(false);

  return (
    <section className="card space-y-3 border-ember/30 p-4">
      <h3 className="font-display text-lg">Borrar mis datos</h3>
      <p className="text-sm leading-relaxed text-muted">
        Elimina fotos, medidas, peinados, diseños, pruebas guardadas, cachés de consultas y
        resultados en memoria. No hay copia en ningún servidor: esto es definitivo en este
        dispositivo.
      </p>
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Trigger asChild>
          <Button variant="danger" icon={Trash2}>
            Borrar todo en este teléfono
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-bg-deep/80 backdrop-blur-sm" />
          <AlertDialog.Content className="floating-panel fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 p-5">
            <AlertDialog.Title className="font-display text-xl">
              ¿Borrar todo lo guardado?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">
              Se eliminarán tus fotos y tus pruebas de este navegador. Esta acción no se puede
              deshacer y no hay copia en la nube.
            </AlertDialog.Description>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="quiet">Cancelar</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => {
                    void wipe();
                    setOpen(false);
                  }}
                >
                  Sí, borrar todo
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {note ? (
        <p role="status" className="text-sm text-accent">
          {note}
        </p>
      ) : null}
    </section>
  );
}

export const Route = createFileRoute("/privacidad")({
  component: () => <PrivacyPanel standalone />,
});
