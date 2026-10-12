import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { MorePhotos } from "@/components/more-photos";
import { Button, Note, PhotoButtons, SliderField, Swatches, ThumbPicks } from "@/components/ui";
import { cropToBounds, opaqueRatio, removeBackground } from "@/lib/cutout";
import { drawHair } from "@/lib/draw-hair";
import { canvasToBlob, loadImage } from "@/lib/images";
import { useStudio } from "@/lib/store";
import { DYES, dyeById } from "@/lib/types";
import { usePersonAnalysis } from "@/lib/use-analysis";
import { hairCutout } from "@/lib/vision";

export function CabelloPanel() {
  const hair = useStudio((state) => state.hair);
  const note = useStudio((state) => state.note);
  const setSelfie = useStudio((state) => state.setSelfie);
  const addStyles = useStudio((state) => state.addStyles);
  const setActiveStyle = useStudio((state) => state.setActiveStyle);
  const removeStyle = useStudio((state) => state.removeStyle);
  const setDye = useStudio((state) => state.setDye);
  const setIntensity = useStudio((state) => state.setIntensity);
  const saveFavorite = useStudio((state) => state.saveFavorite);
  const buildSwatch = useStudio((state) => state.buildSwatch);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analysis, pending, error } = usePersonAnalysis(hair.selfieUrl);
  const [styleCut, setStyleCut] = useState<HTMLCanvasElement | null>(null);
  const [cutting, setCutting] = useState(false);
  const dye = dyeById(hair.dye);
  const activeStyle =
    hair.styles.find((item) => item.id === hair.activeStyleId) ?? hair.styles[0] ?? null;

  useEffect(() => {
    if (!activeStyle) {
      setStyleCut(null);
      return;
    }
    let cancel = false;
    setCutting(true);
    void (async () => {
      const img = await loadImage(activeStyle.url);
      // First choice: keep only the hair of the reference photo, so the face of
      // whoever wears that hairstyle never lands over yours. If the model can't
      // find hair (a product photo, a wig on a stand), fall back to cutting out
      // whatever sits on the plain background.
      let chosen: HTMLCanvasElement | null = null;
      const hairOnly = await hairCutout(img);
      if (hairOnly && opaqueRatio(hairOnly) > 0.02) {
        chosen = hairOnly;
      } else {
        const flooded = removeBackground(img);
        const ratio = opaqueRatio(flooded);
        if (ratio > 0.05 && ratio < 0.97) chosen = flooded;
        else {
          const plain = document.createElement("canvas");
          plain.width = img.width;
          plain.height = img.height;
          plain.getContext("2d")?.drawImage(img, 0, 0);
          chosen = plain;
        }
      }
      if (!cancel) {
        setStyleCut(cropToBounds(chosen));
        setCutting(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [activeStyle]);

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
    drawHair(ctx, {
      photo,
      hairMask: analysis.hairMask,
      style: styleCut,
      landmarks: analysis.landmarks,
      dye: dye.hex,
      intensity: dye.id === "natural" ? 0 : hair.intensity,
      skinLayer: analysis.skinLayer,
    });
  }, [analysis, dye.hex, dye.id, hair.intensity, styleCut]);

  async function favorite() {
    const canvas = canvasRef.current;
    if (!canvas || !hair.selfieBlob) return;
    const preview = await canvasToBlob(canvas, "image/jpeg", 0.84);
    const sources: { label: string; blob: Blob }[] = [];
    if (hair.selfieBlob) sources.push({ label: "Tu foto", blob: hair.selfieBlob });
    if (activeStyle) sources.push({ label: "Peinado", blob: activeStyle.blob });
    sources.push({
      label: `Tinte · ${dye.label}`,
      blob: await buildSwatch(dye.hex || "#3a2a24"),
    });
    await saveFavorite({
      kind: "cabello",
      meta:
        dye.id === "natural"
          ? `${dye.label} · sin tinte`
          : `${dye.label} · intensidad ${Math.round(hair.intensity * 100)}%`,
      preview,
      sources,
    });
  }

  return (
    <div className="panel space-y-5">
      <div>
        <h2 className="font-display text-3xl leading-tight">Peinado y tinte</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Sube una foto tuya, uno o varios peinados de referencia y el color. La mezcla se hace
          aquí, sin subir nada.
        </p>
      </div>

      {hair.selfieUrl ? (
        <div className="overflow-hidden rounded-3xl bg-fg">
          <canvas
            ref={canvasRef}
            className="w-full"
            aria-label="Vista previa del peinado y el color"
          />
        </div>
      ) : (
        <div className="flex min-h-64 flex-col justify-end rounded-3xl bg-fg p-6 text-bg">
          <p className="font-display text-3xl leading-tight">Empieza con tu foto.</p>
        </div>
      )}

      {pending || cutting ? (
        <p className="text-sm text-muted">Buscando el contorno del pelo…</p>
      ) : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <p className="text-sm text-muted">
        {activeStyle
          ? `Peinado activo: ${hair.styles.findIndex((item) => item.id === activeStyle.id) + 1} de ${hair.styles.length}. Toca otra miniatura para cambiarlo.`
          : "Todavía no hay un peinado de referencia: el tinte se aplica igual sobre tu pelo."}
      </p>
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

      <MorePhotos
        hint="Cada peinado que subas se suma a los que ya tiene el avatar; toca una miniatura para probarlo. Tu foto no se cambia aquí."
        takeLabel="Foto del peinado"
        onFiles={(files) => void addStyles(files)}
      >
        <ThumbPicks
          items={hair.styles.map((item, index) => ({
            id: item.id,
            url: item.url,
            caption: `Peinado ${index + 1}`,
          }))}
          activeId={activeStyle?.id ?? null}
          onPick={setActiveStyle}
          onRemove={removeStyle}
          empty={
            <p className="text-xs text-muted">
              Sin peinados de referencia. Puedes subir uno o varios a la vez.
            </p>
          }
        />
      </MorePhotos>

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
        ) : (
          <p className="text-xs text-muted">Con “Natural” se respeta el color de tu foto.</p>
        )}
      </section>

      <Button disabled={!hair.selfieUrl} onClick={() => void favorite()}>
        <Heart className="size-4" />
        Guardar en favoritos
      </Button>
    </div>
  );
}
