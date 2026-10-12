import { useEffect, useState } from "react";
import { cachedAnalysis, readCachedAnalysis } from "@/lib/analysis-cache";
import { loadImage } from "@/lib/images";
import { analyzePerson, type PersonAnalysis } from "@/lib/vision";

/**
 * Analiza la foto de la persona una sola vez por imagen.
 *
 * El resultado (recorte, máscaras, colores de piel y pelo) queda en la caché de
 * cómputo del dispositivo: volver a la pestaña, cambiar de sección o repetir la
 * misma foto no vuelve a ejecutar los modelos de visión.
 */
export function usePersonAnalysis(url: string | null) {
  const [analysis, setAnalysis] = useState<PersonAnalysis | null>(() => readCachedAnalysis(url));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setAnalysis(null);
      setPending(false);
      setError(null);
      return;
    }

    const cached = readCachedAnalysis(url);
    if (cached) {
      setAnalysis(cached);
      setPending(false);
      setError(null);
      return;
    }

    let cancel = false;
    setPending(true);
    setError(null);
    void (async () => {
      try {
        const img = await loadImage(url);
        const result = await cachedAnalysis(url, () => analyzePerson(img));
        if (!cancel) setAnalysis(result);
      } catch {
        if (!cancel) {
          setAnalysis(null);
          setError("No pude leer esa foto. Prueba con JPG o PNG.");
        }
      } finally {
        if (!cancel) setPending(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [url]);

  return { analysis, pending, error };
}
