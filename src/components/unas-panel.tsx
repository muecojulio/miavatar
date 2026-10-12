import { useEffect, useRef, useState } from "react";
import { Hand, Heart, Palette, Sparkles } from "lucide-react";
import { MorePhotos } from "@/components/more-photos";
import { StatPills } from "@/components/stats";
import { EmptyStage, Stage } from "@/components/stage";
import {
  Button,
  Choices,
  Note,
  PhotoButtons,
  Swatches,
  ThumbPicks,
  Toggle,
} from "@/components/ui";
import { cachedHands } from "@/lib/analysis-cache";
import { cropToBounds, opaqueRatio, removeBackground } from "@/lib/cutout";
import { drawNails } from "@/lib/draw-nails";
import { canvasToBlob, loadImage } from "@/lib/images";
import { statusFor, useStudio } from "@/lib/store";
import { DESIGN_SCOPES, NAILS, nailById } from "@/lib/types";
import { detectHands } from "@/lib/vision";

export function UnasPanel() {
  const nails = useStudio((state) => state.nails);
  const action = useStudio((state) => state.action);
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
  const [burst, setBurst] = useState(0);
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
      // Un diseño suele ser una foto sobre fondo liso: se conserva el motivo y
      // el esmalte de debajo sigue viéndose.
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
      const url = nails.handUrl as string;
      const img = await loadImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      // Las manos detectadas se guardan por foto: cambiar de color no repite el modelo.
      const found = await cachedHands(url, () => detectHands(canvas));
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
    setBurst((value) => value + 1);
    const preview = await canvasToBlob(canvas, "image/jpeg", 0.84);
    const sources: { label: string; blob: Blob }[] = [];
    if (activeDesign) sources.push({ label: "Diseño", blob: activeDesign.blob });
    sources.push({ label: `Color · ${color.label}`, blob: await buildSwatch(color.hex) });
    await saveFavorite({
      kind: "unas",
      meta: `${color.label} · ${
        activeDesign
          ? `diseño en ${nails.designScope === "todas" ? "todas las uñas" : "uña de acento"}`
          : "sin diseño"
      }`,
      preview,
      sources,
    });
  }

  const status = statusFor(action, "unas");

  return (
    <div className="space-y-6">
      <header className="stagger" style={{ ["--i" as string]: 0 }}>
        <h2 className="font-display text-3xl leading-tight">Uñas</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Foto de tu mano, palma abierta y uñas a la vista. El color y el diseño se aplican sobre
          ellas.
        </p>
      </header>

      {nails.handUrl ? (
        <div className="stagger" style={{ ["--i" as string]: 1 }}>
          <Stage
            ariaLabel="Vista previa del esmalte en la mano"
            busy={pending}
            badge={count ? `${count} uñas detectadas` : "Buscando las uñas"}
            burstKey={burst}
          >
            <canvas ref={canvasRef} className="block w-full" />
          </Stage>
        </div>
      ) : (
        <EmptyStage
          title="Muestra la mano."
          hint="Con la palma abierta y buena luz se localizan las cinco uñas y el esmalte se aplica sobre ellas."
          tone="jade"
        />
      )}

      <StatPills
        label="Resumen del esmalte"
        items={[
          { id: "color", label: "Color", value: color.label, icon: Palette },
          { id: "gloss", label: "Brillo", value: nails.gloss ? "Sí" : "No", icon: Sparkles },
          {
            id: "designs",
            label: "Diseños",
            value: String(nails.designs.length),
            icon: Hand,
          },
        ]}
      />

      {count === 0 ? (
        <Note tone="error">
          No ubiqué la mano. Prueba con más luz, la palma abierta y los dedos separados.
        </Note>
      ) : null}
      {photo && count ? (
        <Note>
          {count} uñas marcadas
          {activeDesign
            ? nails.designScope === "todas"
              ? " con el diseño."
              : " (el diseño va en la uña de acento)."
            : "."}
        </Note>
      ) : null}

      <section className="stagger" style={{ ["--i" as string]: 2 }}>
        <PhotoButtons
          takeLabel="Foto de la mano"
          pickLabel={nails.handUrl ? "Cambiar mano" : "Elegir foto"}
          onFile={(file) => void setHand(file)}
        />
      </section>

      <section className="card space-y-3 p-5 stagger" style={{ ["--i" as string]: 3 }}>
        <h3 className="font-display text-xl">Color</h3>
        <Swatches
          label="Color de esmalte"
          options={[...NAILS]}
          value={nails.color}
          onChange={setNailColor}
          fadeColor="var(--color-surface)"
        />
        <Toggle
          label="Brillo"
          hint="Añade un reflejo sobre el esmalte"
          checked={nails.gloss}
          onCheckedChange={setGloss}
        />
      </section>

      <div className="stagger" style={{ ["--i" as string]: 4 }}>
        <MorePhotos
          hint="Sube la foto de un diseño (decoración, francesa, pedrería) y se aplica sobre tus uñas. Puedes tener varios y tocar el que quieras usar."
          takeLabel="Foto del diseño"
          onFiles={(files) => void addDesigns(files)}
        >
          <ThumbPicks
            label="Diseños de uñas"
            items={nails.designs.map((item, index) => ({
              id: item.id,
              url: item.url,
              caption: `Diseño ${index + 1}`,
            }))}
            activeId={activeDesign?.id ?? null}
            onPick={setActiveDesign}
            onRemove={removeDesign}
            fadeColor="var(--color-surface)"
            empty={
              <p className="rounded-2xl border border-dashed border-fg/15 px-3 py-4 text-xs text-muted">
                Sin diseño: solo el color elegido.
              </p>
            }
          />
          {activeDesign ? (
            <div className="space-y-2">
              <p className="text-xs text-muted">Dónde poner el diseño</p>
              <Choices
                label="Dónde poner el diseño"
                options={DESIGN_SCOPES}
                value={nails.designScope}
                onChange={setDesignScope}
              />
            </div>
          ) : null}
        </MorePhotos>
      </div>

      <Button
        className="w-full"
        status={status}
        statusLabel={action.message}
        disabled={!nails.handUrl}
        icon={Heart}
        onClick={() => void favorite()}
      >
        {status === "success" ? "Guardado" : "Guardar en favoritos"}
      </Button>
    </div>
  );
}
