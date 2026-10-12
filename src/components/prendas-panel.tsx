import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { MorePhotos } from "@/components/more-photos";
import { Button, Note, PhotoButtons, SliderField, Swatches, Toggle } from "@/components/ui";
import { drawBody, STAGE_H, STAGE_W } from "@/lib/draw-body";
import { cropToBounds, opaqueRatio, removeBackground } from "@/lib/cutout";
import { canvasToBlob, loadImage } from "@/lib/images";
import { useStudio } from "@/lib/store";
import { EYES, KINDS, ZONES, eyeHex, kindLabel, ranges } from "@/lib/types";
import { usePersonAnalysis } from "@/lib/use-analysis";

export function PrendasPanel() {
  const profile = useStudio((state) => state.profile);
  const note = useStudio((state) => state.note);
  const setKind = useStudio((state) => state.setKind);
  const setHeight = useStudio((state) => state.setHeight);
  const setWeight = useStudio((state) => state.setWeight);
  const setEye = useStudio((state) => state.setEye);
  const setStudio = useStudio((state) => state.setStudio);
  const setMeasures = useStudio((state) => state.setMeasures);
  const setFace = useStudio((state) => state.setFace);
  const addGarments = useStudio((state) => state.addGarments);
  const setGarmentZone = useStudio((state) => state.setGarmentZone);
  const removeGarment = useStudio((state) => state.removeGarment);
  const saveFavorite = useStudio((state) => state.saveFavorite);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cuts = useRef(new Map<string, HTMLCanvasElement>());
  const [cutVersion, setCutVersion] = useState(0);
  const { analysis, pending, error } = usePersonAnalysis(profile.faceUrl);
  const span = profile.kind ? ranges(profile.kind) : null;
  const garmentKey = profile.garments.map((item) => item.id).join("|");

  useEffect(() => {
    let cancel = false;
    void (async () => {
      for (const garment of profile.garments) {
        if (cuts.current.has(garment.id)) continue;
        const img = await loadImage(garment.url);
        const cut = removeBackground(img);
        const ratio = opaqueRatio(cut);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(ratio > 0.06 && ratio < 0.97 ? cut : img, 0, 0);
        cuts.current.set(garment.id, cropToBounds(canvas));
      }
      if (!cancel) setCutVersion((value) => value + 1);
    })();
    return () => {
      cancel = true;
    };
  }, [garmentKey, profile.garments]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile.kind) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = STAGE_W * dpr;
    canvas.height = STAGE_H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBody(ctx, {
      kind: profile.kind,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      eyeHex: eyeHex(profile.eye),
      studio: profile.studio,
      measures: profile.measures,
      skin: analysis?.skin ?? "#c9956c",
      hair: analysis?.hair ?? "#3a2a24",
      cutout: analysis?.image ?? null,
      landmarks: analysis?.landmarks ?? null,
      garments: profile.garments.flatMap((item) => {
        const image = cuts.current.get(item.id);
        return image ? [{ image, zone: item.zone }] : [];
      }),
    });
  }, [analysis, cutVersion, profile]);

  async function favorite() {
    const canvas = canvasRef.current;
    if (!canvas || !profile.kind) return;
    const preview = await canvasToBlob(canvas, "image/jpeg", 0.84);
    await saveFavorite({
      kind: "prenda",
      meta: `${kindLabel(profile.kind)} · ${profile.heightCm} cm · ${profile.weightKg} kg`,
      preview,
      sources: profile.garments.map((item, index) => ({
        label:
          item.zone === "completo"
            ? `Prenda ${index + 1} · completo`
            : `Prenda ${index + 1} · ${item.zone}`,
        blob: item.blob,
      })),
    });
  }

  const faceFound = Boolean(analysis?.landmarks);

  return (
    <div className="panel space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={profile.kind === item.id}
            onClick={() => setKind(item.id)}
            className={
              profile.kind === item.id
                ? "tap min-h-11 rounded-full bg-accent text-sm font-medium text-bg"
                : "tap min-h-11 rounded-full bg-surface text-sm text-fg"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {!profile.kind ? (
        <div className="flex min-h-80 flex-col justify-end rounded-3xl bg-fg p-6 text-bg">
          <p className="font-display text-3xl leading-tight">Elige quién se prueba la ropa.</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed opacity-80">
            Hombre, mujer, niño o niña. Después ajustas estatura, peso y color de ojos, y colocas tu
            cara.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-fg">
          <canvas
            ref={canvasRef}
            className="w-full"
            aria-label="Avatar de cuerpo completo con la ropa de prueba"
          />
        </div>
      )}

      {pending ? <p className="text-sm text-muted">Ajustando tu cara al avatar…</p> : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {analysis && !pending && !faceFound ? (
        <p className="text-sm text-muted">
          No encontré la cara con claridad, así que usé la foto completa y el color de ojos elegido
          no se aplicó.
        </p>
      ) : null}
      <Note>{note}</Note>

      {span ? (
        <div className="space-y-4">
          <SliderField
            label="Estatura"
            min={span.hMin}
            max={span.hMax}
            value={profile.heightCm}
            suffix="cm"
            onChange={setHeight}
          />
          <SliderField
            label="Peso"
            min={span.wMin}
            max={span.wMax}
            value={profile.weightKg}
            suffix="kg"
            onChange={setWeight}
          />
          <div>
            <p className="mb-2 text-sm text-muted">Color de ojos</p>
            <Swatches options={[...EYES]} value={profile.eye} onChange={setEye} />
          </div>
          <Toggle label="Fondo de estudio" checked={profile.studio} onCheckedChange={setStudio} />
          <Toggle
            label="Mostrar medidas"
            checked={profile.measures}
            onCheckedChange={setMeasures}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Tu cara</h2>
        <p className="text-sm leading-relaxed text-muted">
          La foto no sale de este teléfono. La primera vez se prepara un modelo de visión guardado
          en la app. Con esta foto se pega tu rostro al avatar.
        </p>
        <PhotoButtons
          capture="user"
          takeLabel="Tomar foto"
          pickLabel={profile.faceUrl ? "Cambiar cara" : "Elegir foto"}
          onFile={(file) => void setFace(file)}
        />
      </section>

      <MorePhotos
        hint="Fotografía cada prenda sobre un fondo liso. Las fotos que elijas aquí se suman una tras otra al avatar; tu cara y la figura no se cambian."
        takeLabel="Foto de prenda"
        onFiles={(files) => void addGarments(files)}
      >
        <ul className="space-y-3">
          {profile.garments.map((garment, index) => (
            <li key={garment.id} className="flex items-center gap-3 rounded-2xl bg-bg/60 p-2">
              <img src={garment.url} alt="" className="size-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">Prenda {index + 1}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ZONES.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      aria-pressed={garment.zone === zone.id}
                      onClick={() => setGarmentZone(garment.id, zone.id)}
                      className={
                        garment.zone === zone.id
                          ? "tap min-h-9 rounded-full bg-accent px-3 text-xs text-bg"
                          : "tap min-h-9 rounded-full px-3 text-xs text-muted outline outline-1 outline-fg/15"
                      }
                    >
                      {zone.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="tap min-h-11 px-2 text-sm text-muted"
                onClick={() => removeGarment(garment.id)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      </MorePhotos>

      <Button
        disabled={!profile.kind || (!profile.faceUrl && profile.garments.length === 0)}
        onClick={() => void favorite()}
      >
        <Heart className="size-4" />
        Guardar en favoritos
      </Button>
    </div>
  );
}
