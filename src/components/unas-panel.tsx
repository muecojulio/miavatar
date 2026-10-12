import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { MorePhotos } from "@/components/more-photos";
import { Button, Choices, Note, PhotoButtons, Swatches, ThumbPicks, Toggle } from "@/components/ui";
import { drawNails } from "@/lib/draw-nails";
import { cropToBounds, opaqueRatio, removeBackground } from "@/lib/cutout";
import { canvasToBlob, loadImage } from "@/lib/images";
import { useStudio } from "@/lib/store";
import { DESIGN_SCOPES, NAILS, nailById } from "@/lib/types";
import { detectHands } from "@/lib/vision";

export function UnasPanel() {
  const nails = useStudio((state) => state.nails);
  const note = useStudio((state) => state.note);
  const setHand = useStudio((state) => state.setHand);
  const setNailColor = useStudio((state) => state.setNailColor);
  const setGloss = useStudio((state) => state.setGloss);
  const addDesigns = useStudio((state) => state.addDesigns);
  const setActiveDesign = useStudio((state) => state.setActiveDesign);
  const removeDesign = useStudio((state) => state.removeDesign);
  const setDesignScope = useStudio((state) => state.setDesignScope);
  const saveFavorite = useStudio((state) => state.saveFavorite);
  const buildSwatch = useStudio((state) => state.buildSwatch);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);
  const [design, setDesignCanvas] = useState<HTMLCanvasElement | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const color = nailById(nails.color);
  const activeDesign =
    nails.designs.find((item) => item.id === nails.activeDesignId) ?? nails.designs[0] ?? null;

  useEffect(() => {
    if (!activeDesign) {
      setDesignCanvas(null);
      return;
    }
    let cancel = false;
    void loadImage(activeDesign.url).then((img) => {
      if (cancel) return;
      // A design is usually a photo of nail art on a plain surface: keep just
      // the motif, so the polish underneath stays visible.
      const cut = removeBackground(img);
      const ratio = opaqueRatio(cut);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(ratio > 0.04 && ratio < 0.97 ? cut : img, 0, 0);
      }
      setDesignCanvas(cropToBounds(canvas));
    });
    return () => {
      cancel = true;
    };
  }, [activeDesign]);

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
          const painted = drawNails(
            ctx,
            canvas,
            found,
            color.hex,
            nails.gloss,
            design,
            nails.designScope,
          );
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
  }, [color.hex, design, nails.designScope, nails.gloss, nails.handUrl]);

  async function favorite() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preview = await canvasToBlob(canvas, "image/jpeg", 0.84);
    const sources: { label: string; blob: Blob }[] = [];
    if (activeDesign) sources.push({ label: "Diseño", blob: activeDesign.blob });
    sources.push({ label: `Color · ${color.label}`, blob: await buildSwatch(color.hex) });
    await saveFavorite({
      kind: "unas",
      meta: `${color.label} · ${activeDesign ? `diseño en ${nails.designScope === "todas" ? "todas las uñas" : "uña de acento"}` : "sin diseño"}`,
      preview,
      sources,
    });
  }

  return (
    <div className="panel space-y-5">
      <div>
        <h2 className="font-display text-3xl leading-tight">Uñas</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Foto de tu mano, palma abierta y uñas a la vista. El color y el diseño se aplican sobre
          ellas.
        </p>
      </div>

      {nails.handUrl ? (
        <div className="overflow-hidden rounded-3xl bg-fg">
          <canvas
            ref={canvasRef}
            className="w-full"
            aria-label="Vista previa del esmalte en la mano"
          />
        </div>
      ) : (
        <div className="flex min-h-64 flex-col justify-end rounded-3xl bg-fg p-6 text-bg">
          <p className="font-display text-3xl leading-tight">Muestra la mano.</p>
        </div>
      )}

      {pending ? <p className="text-sm text-muted">Buscando las uñas…</p> : null}
      {count === 0 ? (
        <p className="text-sm text-accent">
          No ubiqué la mano. Prueba con más luz y los dedos separados.
        </p>
      ) : null}
      {photo && count ? (
        <p className="text-sm text-muted">
          {count} uñas marcadas
          {activeDesign
            ? nails.designScope === "todas"
              ? " con el diseño."
              : " (el diseño va en la uña de acento)."
            : "."}
        </p>
      ) : null}
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

      <MorePhotos
        hint="Sube la foto de un diseño (decoración, francesa, pedrería) y se aplica sobre tus uñas. Puedes tener varios y tocar el que quieras usar."
        takeLabel="Foto del diseño"
        onFiles={(files) => void addDesigns(files)}
      >
        <ThumbPicks
          items={nails.designs.map((item, index) => ({
            id: item.id,
            url: item.url,
            caption: `Diseño ${index + 1}`,
          }))}
          activeId={activeDesign?.id ?? null}
          onPick={setActiveDesign}
          onRemove={removeDesign}
          empty={<p className="text-xs text-muted">Sin diseño: solo el color elegido.</p>}
        />
        {activeDesign ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">Dónde poner el diseño</p>
            <Choices options={DESIGN_SCOPES} value={nails.designScope} onChange={setDesignScope} />
          </div>
        ) : null}
      </MorePhotos>

      <Button disabled={!nails.handUrl} onClick={() => void favorite()}>
        <Heart className="size-4" />
        Guardar en favoritos
      </Button>
    </div>
  );
}
