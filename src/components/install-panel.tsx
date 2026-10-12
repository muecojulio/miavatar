import { useCallback, useEffect, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { QRCodeSVG } from "qrcode.react";
import { ChevronDown, Copy, Share2, Smartphone } from "lucide-react";
import { Button, type ActionState } from "@/components/ui";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

const STEPS: { id: string; title: string; text: string }[] = [
  {
    id: "ios",
    title: "iPhone o iPad",
    text: "En Safari, toca Compartir y luego «Añadir a pantalla de inicio». Se abrirá a pantalla completa, como una app.",
  },
  {
    id: "android",
    title: "Android",
    text: "Abre el menú del navegador y toca «Instalar aplicación» o «Añadir a pantalla de inicio».",
  },
  {
    id: "desktop",
    title: "Ordenador",
    text: "Busca el icono de instalar en la barra de direcciones o guarda el enlace como marcador.",
  },
];

export function InstallPanel() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ActionState>("idle");
  const [open, setOpen] = useState<string | null>("ios");

  useEffect(() => {
    const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
    setUrl(`${window.location.origin}${prefix}/`);
  }, []);

  const copy = useCallback(async () => {
    if (!url) return;
    setStatus("loading");
    try {
      await navigator.clipboard.writeText(url);
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2600);
    }
  }, [url]);

  const share = useCallback(async () => {
    if (!url || typeof navigator === "undefined" || !("share" in navigator)) return;
    try {
      await navigator.share({ title: "miavatar", url });
    } catch {
      // El usuario canceló el diálogo del sistema: no hay nada que avisar.
    }
  }, [url]);

  return (
    <section className="space-y-5">
      <header className="stagger" style={{ ["--i" as string]: 0 }}>
        <h2 className="font-display text-3xl">Instalar miavatar</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ábrela en otro dispositivo escaneando el código o compartiendo el enlace. Tus fotos y
          favoritos no se transfieren: se quedan donde los guardaste.
        </p>
      </header>

      {url ? (
        <div className="card sheen flex flex-col items-center gap-4 p-5 stagger" style={{ ["--i" as string]: 1 }}>
          <div className="rounded-3xl bg-gradient-to-br from-accent-soft via-fg to-accent p-1 shadow-[var(--glow-soft)]">
            <div className="rounded-[1.25rem] bg-white p-4">
              <QRCodeSVG
                value={url}
                size={216}
                level="M"
                title="Código QR para abrir miavatar"
                bgColor="#ffffff"
                fgColor="#141210"
              />
            </div>
          </div>
          <p className="break-all text-center text-xs text-muted">{url}</p>
          <div className="flex w-full flex-wrap justify-center gap-2">
            <Button
              icon={Copy}
              status={status}
              statusLabel={
                status === "loading"
                  ? "Copiando el enlace"
                  : status === "success"
                    ? "Enlace copiado"
                    : status === "error"
                      ? "No se pudo copiar"
                      : undefined
              }
              onClick={() => void copy()}
            >
              {status === "success"
                ? "Enlace copiado"
                : status === "error"
                  ? "No se pudo copiar"
                  : "Copiar enlace"}
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator ? (
              <Button variant="ghost" icon={Share2} onClick={() => void share()}>
                Compartir
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Accordion.Root
        type="single"
        collapsible
        value={open ?? ""}
        onValueChange={(value) => setOpen(value || null)}
        className="space-y-2 stagger"
        style={{ ["--i" as string]: 2 }}
      >
        {STEPS.map((step) => (
          <Accordion.Item key={step.id} value={step.id} className="card overflow-hidden">
            <Accordion.Header className="m-0">
              <Accordion.Trigger className="group flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-fg">
                <Smartphone className="size-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="flex-1">{step.title}</span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordion-content">
              <p className="border-t border-fg/10 px-4 py-3 text-sm leading-relaxed text-muted">
                {step.text}
              </p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>

      <p className="text-xs leading-relaxed text-muted">
        La instalación depende de las opciones de cada navegador. Al añadirla a la pantalla de
        inicio, la app guarda sus archivos y modelos para abrirse sin conexión; tus fotos siguen
        viviendo en este dispositivo.
      </p>
    </section>
  );
}
