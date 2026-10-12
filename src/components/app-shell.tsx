import { useEffect, useState } from "react";
import { ArrowLeft, Hand, Heart, QrCode, Scissors, Shield, Shirt, Sparkles } from "lucide-react";
import { CabelloPanel } from "@/components/cabello-panel";
import { FavoritosPanel } from "@/components/favoritos-panel";
import { PrendasPanel } from "@/components/prendas-panel";
import { StylePanel } from "@/components/style-panel";
import { PrivacyPanel } from "@/routes/privacidad";
import { InstallPanel } from "@/components/install-panel";
import { UnasPanel } from "@/components/unas-panel";
import { cn } from "@/lib/cn";
import { useStudio } from "@/lib/store";
import { showsNails, type TabId } from "@/lib/types";

const TABS: { id: TabId; label: string; icon: typeof Shirt }[] = [
  { id: "prendas", label: "Prendas", icon: Shirt },
  { id: "cabello", label: "Cabello", icon: Scissors },
  { id: "unas", label: "Uñas", icon: Hand },
  { id: "estilo", label: "Estilo", icon: Sparkles },
  { id: "favoritos", label: "Favoritos", icon: Heart },
];

const EXTRAS: { id: TabId; label: string; icon: typeof Shirt }[] = [
  { id: "instalar", label: "Instalar", icon: QrCode },
  { id: "privacidad", label: "Privacidad", icon: Shield },
];

export function AppShell() {
  const ready = useStudio((state) => state.ready);
  const tab = useStudio((state) => state.tab);
  const kind = useStudio((state) => state.profile.kind);
  const memoryOk = useStudio((state) => state.memoryOk);
  const init = useStudio((state) => state.init);
  const setTab = useStudio((state) => state.setTab);
  const [lastCore, setLastCore] = useState<TabId>("prendas");
  const nails = showsNails(kind);
  const visible = TABS.filter((item) => item.id !== "unas" || nails);
  const extra = EXTRAS.some((item) => item.id === tab);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (TABS.some((item) => item.id === tab)) setLastCore(tab);
  }, [tab]);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-4xl leading-none">miavatar</p>
          <p className="mt-2 text-sm text-muted">Mírate antes de usarlo</p>
        </div>
        <div className="flex gap-1">
          {EXTRAS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                title={item.label}
                aria-pressed={active}
                onClick={() => setTab(active ? lastCore : item.id)}
                className={cn(
                  "tap grid size-11 place-items-center rounded-full",
                  active ? "bg-accent text-bg" : "bg-surface text-muted",
                )}
              >
                <Icon className="size-5" />
              </button>
            );
          })}
        </div>
      </header>

      {!memoryOk && ready ? (
        <p className="mb-4 text-sm text-accent">
          La memoria de este navegador no está disponible. La prueba funciona, pero no queda
          guardada.
        </p>
      ) : null}

      {extra ? (
        <button
          type="button"
          className="tap mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted"
          onClick={() => setTab(lastCore)}
        >
          <ArrowLeft className="size-4" />
          Volver al avatar
        </button>
      ) : null}

      {tab === "prendas" ? <PrendasPanel /> : null}
      {tab === "cabello" ? <CabelloPanel /> : null}
      {tab === "unas" && nails ? <UnasPanel /> : null}
      {tab === "estilo" ? <StylePanel /> : null}
      {tab === "favoritos" ? <FavoritosPanel /> : null}
      {tab === "privacidad" ? <PrivacyPanel /> : null}
      {tab === "instalar" ? <InstallPanel /> : null}

      <nav className="dock fixed inset-x-0 bottom-0 z-10 border-t border-fg/10 bg-bg/95 backdrop-blur-md">
        <ul
          className="mx-auto grid max-w-md"
          style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
        >
          {visible.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "tap flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs",
                    active ? "text-accent" : "text-muted",
                  )}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setTab(item.id)}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
