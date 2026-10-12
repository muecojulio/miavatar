import { useEffect, useRef, useState } from "react";
import { drawNails } from "@/lib/draw-nails";
import { loadImage } from "@/lib/images";
import { useStudio } from "@/lib/store";
import { NAILS, nailById } from "@/lib/types";
import { detectHands } from "@/lib/vision";
import { Note, PhotoButtons, Swatches, Toggle } from "@/components/ui";

export function UnasPanel() {
  const nails = useStudio((state) => state.nails);
  const note = useStudio((state) => state.note);
  const setHand = useStudio((state) => state.setHand);
  const setNailColor = useStudio((state) => state.setNailColor);
  const setGloss = useStudio((state) => state.setGloss);
  const setDesign = useStudio((state) => state.setDesign);
  const clearDesign = useStudio((state) => state.clearDesign);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);
  const [design, setDesignCanvas] = useState<HTMLCanvasElement | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const color = nailById(nails.color);

  useEffect(() => {
    if (!nails.handUrl) {
      setPhoto(null);
      setCount(null);
      return;
    }
    let cancel = false;
    setPending(true);
    void (async () => {
      const img = await loadImage(nails.handUrl as string);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      const found = await detectHands(canvas);
      if (cancel) return;
      setPhoto(canvas);
      const view = canvasRef.current;
      if (view) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        view.width = canvas.width * dpr;
        view.height = canvas.height * dpr;
        const ctx = view.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const painted = drawNails(ctx, canvas, found, color.hex, nails.gloss, design);
          setCount(painted);
        }
      } else {
        setCount(found.reduce((sum, hand) => sum + (hand.length >= 21 ? 5 : 0), 0));
      }
      setPending(false);
    })();
    return () => {
      cancel = true;
    };
  }, [color.hex, design, nails.gloss, nails.handUrl]);

  useEffect(() => {
    if (!nails.designUrl) {
      setDesignCanvas(null);
      return;
    }
    let cancel = false;
    void loadImage(nails.designUrl).then((img) => {
      if (cancel) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      setDesignCanvas(canvas);
    });
    return () => {
      cancel = true;
    };
  }, [nails.designUrl]);

  return (
    <div className="panel space-y-5">
      <div>
        <h2 className="font-display text-3xl leading-tight">Uñas</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Foto de tu mano, palma abierta y uñas a la vista. El color y el diseño se aplican sobre ellas.
        </p>
      </div>

      {nails.handUrl ? (
        <div className="overflow-hidden rounded-3xl bg-fg">
          <canvas ref={canvasRef} className="w-full" aria-label="Vista previa del esmalte en la mano" />
        </div>
      ) : (
        <div className="flex min-h-64 flex-col justify-end rounded-3xl bg-fg p-6 text-bg">
          <p className="font-display text-3xl leading-tight">Muestra la mano.</p>
        </div>
      )}

      {pending ? <p className="text-sm text-muted">Buscando las uñas…</p> : null}
      {count === 0 ? (
        <p className="text-sm text-accent">No ubiqué la mano. Prueba con más luz y los dedos separados.</p>
      ) : null}
      {photo && count ? <p className="text-sm text-muted">{count} uñas marcadas.</p> : null}
      <Note>{note}</Note>

      <PhotoButtons
        takeLabel="Foto de la mano"
        pickLabel={nails.handUrl ? "Cambiar mano" : "Elegir foto"}
        onFile={(file) => void setHand(file)}
      />

      <section className="space-y-3">
        <h3 className="text-sm text-muted">Color</h3>
        <Swatches options={[...NAILS]} value={nails.color} onChange={setNailColor} />
        <Toggle label="Brillo" checked={nails.gloss} onCheckedChange={setGloss} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm text-muted">Diseño</h3>
        <PhotoButtons
          takeLabel="Foto del diseño"
          pickLabel={nails.designUrl ? "Cambiar diseño" : "Elegir diseño"}
          onFile={(file) => void setDesign(file)}
        />
        {nails.designUrl ? (
          <button type="button" className="tap text-sm text-muted" onClick={clearDesign}>
            Quitar diseño
          </button>
        ) : null}
      </section>
    </div>
  );
}
