import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Hand, Heart, QrCode, Scissors, Shirt, Shield, Sparkles } from "lucide-react";
import { CabelloPanel } from "@/components/cabello-panel";
import { Decor } from "@/components/decor";
import { FavoritosPanel } from "@/components/favoritos-panel";
import { InstallPanel } from "@/components/install-panel";
import { PrendasPanel } from "@/components/prendas-panel";
import { StylePanel } from "@/components/style-panel";
import { TabBar, TabPanel, type TabItem } from "@/components/tabs";
import { TipsTicker, VisionBadge } from "@/components/tips";
import { ActionToasts, AppToaster } from "@/components/toaster";
import { IconButton } from "@/components/ui";
import { UnasPanel } from "@/components/unas-panel";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import { showsNails, type TabId } from "@/lib/types";
import { NESTED_SWIPE_SELECTOR, useHorizontalSwipe } from "@/lib/use-gesture";
import { PrivacyPanel } from "@/routes/privacidad";

const CORE: { id: TabId; label: string; icon: typeof Shirt }[] = [
  { id: "prendas", label: "Prendas", icon: Shirt },
  { id: "cabello", label: "Cabello", icon: Scissors },
  { id: "unas", label: "Uñas", icon: Hand },
  { id: "estilo", label: "Estilo", icon: Sparkles },
  { id: "favoritos", label: "Favoritos", icon: Heart },
];

const EXTRAS: { id: TabId; label: string; icon: typeof Shirt }[] = [
  { id: "instalar", label: "Instalar en otro dispositivo", icon: QrCode },
  { id: "privacidad", label: "Privacidad y datos", icon: Shield },
];

const TIPS = [
  "Fotografía la prenda sobre un fondo liso: el recorte queda más limpio.",
  "Con buena luz frontal, el detector de rostro encuentra mejor tu cara.",
  "En Uñas, abre la mano con los dedos separados para marcar las cinco uñas.",
  "Puedes subir varios peinados y tocar cada miniatura para compararlos.",
  "El tinte se mezcla con el color real de tu pelo, no lo reemplaza.",
];

const ID_BASE = "miavatar";

export function AppShell() {
  const ready = useStudio((state) => state.ready);
  const tab = useStudio((state) => state.tab);
  const kind = useStudio((state) => state.profile.kind);
  const memoryOk = useStudio((state) => state.memoryOk);
  const favoriteCounts = useStudio((state) => state.favoriteCounts);
  const init = useStudio((state) => state.init);
  const setTab = useStudio((state) => state.setTab);
  const [lastCore, setLastCore] = useState<TabId>("prendas");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [drag, setDrag] = useState(0);
  const reduced = useReducedMotion();
  const surface = useRef<HTMLDivElement>(null);
  const nails = showsNails(kind);

  const cores = useMemo(
    () => CORE.filter((item) => item.id !== "unas" || nails),
    [nails],
  );
  const extra = EXTRAS.some((item) => item.id === tab);
  const coreTab = extra ? lastCore : tab;

  const tabs: TabItem<TabId>[] = cores.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    badge: item.id === "favoritos" ? favoriteCounts.all : undefined,
  }));

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (CORE.some((item) => item.id === tab)) setLastCore(tab);
  }, [tab]);

  function go(next: TabId, move: 1 | -1 = 1) {
    setDirection(move);
    setTab(next);
    // Cada pestaña empieza arriba: evita aterrizar a media página.
    if (typeof window !== "undefined" && window.scrollY > 48) {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
  }

  const { bind, wasDragged } = useHorizontalSwipe({
    ratio: 1.2,
    minDistance: 18,
    enabled: !extra,
    // Un carril, un carrusel o una fila deslizable tienen su propio gesto
    // horizontal: deslizarlos nunca cambia de sección.
    ignoreFrom: NESTED_SWIPE_SELECTOR,

    onDragStart: () => undefined,
    onDrag: (dx) => setDrag(Math.max(-30, Math.min(30, dx * 0.32))),
    onDragEnd: ({ dx, velocity }) => {
      setDrag(0);
      const index = cores.findIndex((item) => item.id === coreTab);
      const far = Math.abs(dx) > 76;
      const flick = Math.abs(velocity) > 0.5;
      if (dx < 0 && (far || (flick && velocity < 0))) {
        const next = cores[Math.min(cores.length - 1, index + 1)];
        if (next) go(next.id, 1);
      } else if (dx > 0 && (far || (flick && velocity > 0))) {
        const previous = cores[Math.max(0, index - 1)];
        if (previous) go(previous.id, -1);
      }
    },
  });

  return (
    <>
      <Decor />
      <main className="relative z-10 mx-auto min-h-dvh max-w-md px-4 pb-32 pt-6 lg:max-w-2xl">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-display text-4xl leading-none">
              <span className="bg-gradient-to-r from-accent-soft via-fg to-accent bg-clip-text text-transparent">
                miavatar
              </span>
              <Sparkles className="animate-float-soft size-5 text-accent" aria-hidden="true" />
            </h1>
            <TipsTicker tips={TIPS} />
          </div>
          <div className="flex shrink-0 gap-1.5">
            {EXTRAS.map((item) => (
              <IconButton
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={tab === item.id}
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => (tab === item.id ? go(lastCore) : go(item.id))}
              />
            ))}
          </div>
        </header>

        {!memoryOk && ready ? (
          <div className="mb-4">
            <p className="rounded-2xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-fg">
              La memoria de este navegador no está disponible. La prueba funciona, pero no queda
              guardada.
            </p>
          </div>
        ) : null}

        {tab === "prendas" || tab === "cabello" || tab === "unas" ? <VisionBadge /> : null}

        {extra ? (
          <button
            type="button"
            className="tap mb-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-fg/10 bg-surface/70 px-4 text-sm text-muted"
            onClick={() => go(lastCore, -1)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al avatar
          </button>
        ) : null}

        <div
          {...bind}
          ref={surface}
          style={
            drag !== 0 && !reduced
              ? { transform: `translate3d(${drag}px,0,0)`, opacity: 1 - Math.abs(drag) / 240 }
              : undefined
          }
          className={cn(
            "touch-pan-y transition-transform duration-200",
            drag !== 0 ? "transition-none" : "",
          )}
          onClickCapture={(event) => {
            if (wasDragged()) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          {cores.map((item) =>
            coreTab === item.id ? (
              <TabPanel key={item.id} id={item.id} idBase={ID_BASE} direction={direction}>
                {item.id === "prendas" ? <PrendasPanel /> : null}
                {item.id === "cabello" ? <CabelloPanel /> : null}
                {item.id === "unas" && nails ? <UnasPanel /> : null}
                {item.id === "estilo" ? <StylePanel /> : null}
                {item.id === "favoritos" ? <FavoritosPanel /> : null}
              </TabPanel>
            ) : null,
          )}
          {tab === "privacidad" ? <PrivacyPanel /> : null}
          {tab === "instalar" ? <InstallPanel /> : null}
        </div>

        <footer className="mt-10 space-y-2 border-t border-fg/10 pt-5 text-xs leading-relaxed text-muted">
          <p>
            Tus fotos no salen de este dispositivo. Puedes borrar todo lo guardado cuando quieras
            desde la pestaña Privacidad.
          </p>
        </footer>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-fg/10 bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        aria-label="Secciones de miavatar"
      >
        <div className="mx-auto max-w-md lg:max-w-2xl">
          <TabBar
            items={tabs}
            value={coreTab}
            onChange={(id) => {
              const index = cores.findIndex((item) => item.id === id);
              const current = cores.findIndex((item) => item.id === coreTab);
              go(id, index >= current ? 1 : -1);
            }}
            label="Secciones"
            idBase={ID_BASE}
            variant="dock"
          />
        </div>
      </nav>

      <AppToaster />
      <ActionToasts />
    </>
  );
}
