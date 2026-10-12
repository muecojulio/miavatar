import { useEffect, useRef, useState } from "react";
import { Heart, Ruler, Shirt, Trash2, Weight } from "lucide-react";
import { MorePhotos } from "@/components/more-photos";
import { StatPills } from "@/components/stats";
import { EmptyStage, Stage } from "@/components/stage";
import { SwipeRow } from "@/components/swipe-row";
import {
  Button,
  Choices,
  Note,
  PhotoButtons,
  SliderField,
  Swatches,
  Toggle,
} from "@/components/ui";
import { cropToBounds, opaqueRatio, removeBackground } from "@/lib/cutout";
import { drawBody, STAGE_H, STAGE_W } from "@/lib/draw-body";
import { canvasToBlob, loadImage } from "@/lib/images";
import { statusFor, useStudio } from "@/lib/store";
import { EYES, KINDS, ZONES, eyeHex, kindLabel, ranges } from "@/lib/types";
import { usePersonAnalysis } from "@/lib/use-analysis";

export function PrendasPanel() {
  const profile = useStudio((state) => state.profile);
  const action = useStudio((state) => state.action);
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
  const [burst, setBurst] = useState(0);
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
    setBurst((value) => value + 1);
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
  const status = statusFor(action, "prenda");

  return (
    <div className="space-y-6">
      <header className="stagger" style={{ ["--i" as string]: 0 }}>
        <h2 className="font-display text-3xl leading-tight">Probador de prendas</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Elige la figura, ajusta medidas y coloca tu cara. Después sube cada prenda y colócala en
          la parte correcta.
        </p>
      </header>

      <div className="stagger" style={{ ["--i" as string]: 1 }}>
        <Choices
          label="¿Quién se prueba la ropa?"
          options={KINDS.map((item) => ({ id: item.id, label: item.label }))}
          value={profile.kind}
          onChange={setKind}
        />
      </div>

      {!profile.kind ? (
        <EmptyStage
          title="Elige quién se prueba la ropa."
          hint="Hombre, mujer, niño o niña. Después ajustas estatura, peso y color de ojos, y colocas tu cara."
        />
      ) : (
        <div className="stagger" style={{ ["--i" as string]: 2 }}>
          <Stage
            ariaLabel="Avatar de cuerpo completo con la ropa de prueba"
            busy={pending}
            burstKey={burst}
          >
            <canvas ref={canvasRef} className="block w-full" />
          </Stage>
        </div>
      )}

      {span ? (
        <StatPills
          label="Medidas actuales"
          items={[
            { id: "kind", label: "Figura", value: kindLabel(profile.kind), icon: Shirt },
            { id: "height", label: "Altura", value: `${profile.heightCm} cm`, icon: Ruler },
            { id: "weight", label: "Peso", value: `${profile.weightKg} kg`, icon: Weight },
            {
              id: "garments",
              label: "Prendas",
              value: String(profile.garments.length),
              icon: Heart,
            },
          ]}
        />
      ) : null}

      {error ? <Note tone="error">{error}</Note> : null}
      {analysis && !pending && !faceFound ? (
        <Note>
          No encontré la cara con claridad, así que usé la foto completa y el color de ojos elegido
          no se aplicó.
        </Note>
      ) : null}

      {span ? (
        <section className="card space-y-4 p-5 stagger" style={{ ["--i" as string]: 3 }}>
          <h3 className="font-display text-xl">Medidas y acabado</h3>
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
            <Swatches
              label="Color de ojos"
              options={[...EYES]}
              value={profile.eye}
              onChange={setEye}
              fadeColor="var(--color-surface)"
            />
          </div>
          <Toggle
            label="Fondo de estudio"
            hint="Un fondo claro y limpio detrás de la figura"
            checked={profile.studio}
            onCheckedChange={setStudio}
          />
          <Toggle
            label="Mostrar medidas"
            hint="Guías de altura y proporciones sobre el avatar"
            checked={profile.measures}
            onCheckedChange={setMeasures}
          />
        </section>
      ) : null}

      <section className="space-y-3 stagger" style={{ ["--i" as string]: 4 }}>
        <h3 className="font-display text-2xl">Tu cara</h3>
        <p className="text-sm leading-relaxed text-muted">
          La foto no sale de este teléfono. Con ella se pega tu rostro al avatar y se toman los
          colores de piel y pelo.
        </p>
        <PhotoButtons
          capture="user"
          takeLabel="Tomar foto"
          pickLabel={profile.faceUrl ? "Cambiar cara" : "Elegir foto"}
          onFile={(file) => void setFace(file)}
        />
      </section>

      <div className="stagger" style={{ ["--i" as string]: 5 }}>
        <MorePhotos
          hint="Fotografía cada prenda sobre un fondo liso. Las fotos que elijas aquí se suman una tras otra al avatar; tu cara y la figura no se cambian. Desliza una prenda hacia la izquierda para revelar acciones, o usa el botón de la esquina."
          takeLabel="Foto de prenda"
          onFiles={(files) => void addGarments(files)}
        >
          {profile.garments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-fg/15 px-3 py-4 text-xs text-muted">
              Sin prendas todavía. Sube una o varias fotos para probarlas.
            </p>
          ) : (
            <ul className="space-y-3">
              {profile.garments.map((garment, index) => (
                <li key={garment.id}>
                  <SwipeRow
                    label={`la prenda ${index + 1}`}
                    className="bg-bg/50"
                    surfaceClassName="bg-bg/60"
                    actions={[
                      {
                        id: "remove",
                        label: "Quitar",
                        icon: Trash2,
                        tone: "danger",
                        onAction: () => removeGarment(garment.id),
                      },
                    ]}
                  >
                    <div className="flex items-center gap-3 p-2.5 pr-14">
                      <img
                        src={garment.url}
                        alt={`Prenda ${index + 1}`}
                        className="size-16 rounded-2xl object-cover outline outline-1 outline-fg/10"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Prenda {index + 1}</p>
                        <p className="text-xs text-muted">¿Dónde va esta prenda?</p>
                        <div className="mt-2">
                          <Choices
                            label={`Zona de la prenda ${index + 1}`}
                            options={ZONES}
                            value={garment.zone}
                            onChange={(zone) => setGarmentZone(garment.id, zone)}
                          />
                        </div>
                      </div>
                    </div>
                  </SwipeRow>
                </li>
              ))}
            </ul>
          )}
        </MorePhotos>
      </div>

      <Button
        className="w-full"
        status={status}
        statusLabel={action.message}
        disabled={!profile.kind || (!profile.faceUrl && profile.garments.length === 0)}
        icon={Heart}
        onClick={() => void favorite()}
      >
        {status === "success" ? "Guardado" : "Guardar en favoritos"}
      </Button>
    </div>
  );
}
