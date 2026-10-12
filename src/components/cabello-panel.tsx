import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { opaqueRatio, removeBackground } from "@/lib/cutout";
import { drawHair } from "@/lib/draw-hair";
import { canvasToBlob, loadImage } from "@/lib/images";
import { useStudio } from "@/lib/store";
import { DYES, dyeById } from "@/lib/types";
import { usePersonAnalysis } from "@/lib/use-analysis";
import { hairCutout } from "@/lib/vision";
import { Button, Note, PhotoButtons, SliderField, Swatches } from "@/components/ui";

export function CabelloPanel() {
  const hair = useStudio((state) => state.hair);
  const note = useStudio((state) => state.note);
  const setSelfie = useStudio((state) => state.setSelfie);
  const setStyle = useStudio((state) => state.setStyle);
  const clearStyle = useStudio((state) => state.clearStyle);
  const setDye = useStudio((state) => state.setDye);
  const setIntensity = useStudio((state) => state.setIntensity);
  const saveFavorite = useStudio((state) => state.saveFavorite);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analysis, pending, error } = usePersonAnalysis(hair.selfieUrl);
  const [styleCut, setStyleCut] = useState<HTMLCanvasElement | null>(null);
  const dye = dyeById(hair.dye);

  useEffect(() => {
    if (!hair.styleUrl) {
      setStyleCut(null);
      return;
    }
    let cancel = false;
    void (async () => {
      const img = await loadImage(hair.styleUrl as string);
      const flooded = removeBackground(img);
      const ratio = opaqueRatio(flooded);
      let chosen = flooded;
      if (ratio <= 0.05 || ratio >= 0.97) {
        const hairOnly = await hairCutout(img);
        if (hairOnly && opaqueRatio(hairOnly) > 0.02) chosen = hairOnly;
        else {
          const plain = document.createElement("canvas");
          plain.width = img.width;
          plain.height = img.height;
          plain.getContext("2d")?.drawImage(img, 0, 0);
          chosen = plain;
        }
      }
      if (!cancel) setStyleCut(chosen);
    })();
    return () => {
      cancel = true;
    };
  }, [hair.styleUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const photo = analysis?.image;
    if (!canvas || !photo) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = photo.width * dpr;
    canvas.height = photo.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawHair(
      ctx,
      photo,
      analysis.hairMask,
      styleCut,
      analysis.landmarks,
      dye.hex,
      dye.id === "natural" ? 0 : hair.intensity,
    );
  }, [analysis, dye.hex, dye.id, hair.intensity, styleCut]);

  async function favorite() {
    const canvas = canvasRef.current;
    if (!canvas || !hair.selfieBlob) return;
    const preview = await canvasToBlob(canvas, "image/jpeg", 0.84);
    await saveFavorite({
      kind: "cabello",
      meta: dye.label,
      preview,
      sources: hair.styleBlob ? [{ label: "Peinado", blob: hair.styleBlob }] : [],
    });
  }

  return (
    <div className="panel space-y-5">
      <div>
        <h2 className="font-display text-3xl leading-tight">Peinado y tinte</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Sube una foto tuya, un peinado de referencia y el color. La mezcla se hace aquí, sin subirla.
        </p>
      </div>

      {hair.selfieUrl ? (
        <div className="overflow-hidden rounded-3xl bg-fg">
          <canvas ref={canvasRef} className="w-full" aria-label="Vista previa del peinado y el color" />
        </div>
      ) : (
        <div className="flex min-h-64 flex-col justify-end rounded-3xl bg-fg p-6 text-bg">
          <p className="font-display text-3xl leading-tight">Empieza con tu foto.</p>
        </div>
      )}

      {pending ? <p className="text-sm text-muted">Buscando el contorno del pelo…</p> : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <Note>{note}</Note>

      <section className="space-y-3">
        <h3 className="text-sm text-muted">Tu foto</h3>
        <PhotoButtons
          capture="user"
          takeLabel="Tomar selfie"
          pickLabel={hair.selfieUrl ? "Cambiar foto" : "Elegir foto"}
          onFile={(file) => void setSelfie(file)}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm text-muted">Peinado de referencia</h3>
        <PhotoButtons
          takeLabel="Foto del peinado"
          pickLabel={hair.styleUrl ? "Cambiar peinado" : "Elegir peinado"}
          onFile={(file) => void setStyle(file)}
        />
        {hair.styleUrl ? (
          <button type="button" className="tap text-sm text-muted" onClick={clearStyle}>
            Quitar peinado
          </button>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm text-muted">Color de tinte</h3>
        <Swatches options={[...DYES]} value={hair.dye} onChange={setDye} />
        {dye.id !== "natural" ? (
          <SliderField
            label="Intensidad"
            min={20}
            max={100}
            value={Math.round(hair.intensity * 100)}
            suffix="%"
            onChange={(value) => setIntensity(value / 100)}
          />
        ) : null}
      </section>

      <Button disabled={!hair.selfieUrl} onClick={() => void favorite()}>
        <Heart className="size-4" />
        Guardar en favoritos
      </Button>
    </div>
  );
}
