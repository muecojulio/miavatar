import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Hand, Heart, Scissors, Shirt } from "lucide-react";
import { CabelloPanel } from "@/components/cabello-panel";
import { FavoritosPanel } from "@/components/favoritos-panel";
import { PrendasPanel } from "@/components/prendas-panel";
import { UnasPanel } from "@/components/unas-panel";
import { cn } from "@/lib/cn";
import { useStudio } from "@/lib/store";
import { showsNails, type TabId } from "@/lib/types";

const TABS: { id: TabId; label: string; icon: typeof Shirt }[] = [
  { id: "prendas", label: "Prendas", icon: Shirt },
  { id: "cabello", label: "Cabello", icon: Scissors },
  { id: "unas", label: "Uñas", icon: Hand },
  { id: "favoritos", label: "Favoritos", icon: Heart },
];

export function AppShell() {
  const ready = useStudio((state) => state.ready);
  const tab = useStudio((state) => state.tab);
  const kind = useStudio((state) => state.profile.kind);
  const memoryOk = useStudio((state) => state.memoryOk);
  const init = useStudio((state) => state.init);
  const setTab = useStudio((state) => state.setTab);
  const nails = showsNails(kind);
  const visible = TABS.filter((item) => item.id !== "unas" || nails);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-4xl leading-none">miavatar</p>
          <p className="mt-2 text-sm text-muted">Mírate antes de usarlo</p>
        </div>
        <Link to="/privacidad" className="tap mb-1 min-h-11 text-sm text-muted">
          Privacidad
        </Link>
      </header>

      {!memoryOk && ready ? (
        <p className="mb-4 text-sm text-accent">
          La memoria de este navegador no está disponible. La prueba funciona, pero no queda guardada.
        </p>
      ) : null}

      {tab === "prendas" ? <PrendasPanel /> : null}
      {tab === "cabello" ? <CabelloPanel /> : null}
      {tab === "unas" && nails ? <UnasPanel /> : null}
      {tab === "favoritos" ? <FavoritosPanel /> : null}

      <nav className="dock fixed inset-x-0 bottom-0 z-10 border-t border-fg/10 bg-bg/95 backdrop-blur-md">
        <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
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
