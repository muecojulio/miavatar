import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

export function InstallPanel() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
    setUrl(`${window.location.origin}${prefix}/`);
  }, []);

  return (
    <section className="panel space-y-5">
      <div>
        <h2 className="font-display text-3xl">Instalar miavatar</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Abre miavatar en otro dispositivo escaneando este código o compartiendo el enlace.
        </p>
      </div>
      {url ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-surface p-5">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={url} size={224} level="M" title="Código QR para abrir miavatar" />
          </div>
          <p className="w-full break-all text-center text-xs text-muted">{url}</p>
          <button
            type="button"
            className="tap min-h-11 rounded-full bg-accent px-6 text-sm text-bg"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>
        </div>
      ) : null}
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>En el otro dispositivo, abre el enlace en el navegador y sigue estos pasos:</p>
        <p>
          <strong className="text-fg">iPhone o iPad:</strong> en Safari, toca Compartir y luego
          “Añadir a pantalla de inicio”.
        </p>
        <p>
          <strong className="text-fg">Android:</strong> abre el menú del navegador y toca “Instalar
          aplicación” o “Añadir a pantalla de inicio”.
        </p>
        <p>
          <strong className="text-fg">Ordenador:</strong> busca “Instalar” en la barra de
          direcciones o en el menú del navegador. Si no aparece, guarda el enlace como marcador.
        </p>
        <p>
          La instalación depende de las opciones de cada navegador. Tus fotos y favoritos no se
          transfieren: permanecen en el dispositivo donde los guardaste.
        </p>
      </div>
    </section>
  );
}
