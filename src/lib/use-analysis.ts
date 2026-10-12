import { useEffect, useState } from "react";
import { loadImage } from "@/lib/images";
import { analyzePerson, type PersonAnalysis } from "@/lib/vision";

export function usePersonAnalysis(url: string | null) {
  const [analysis, setAnalysis] = useState<PersonAnalysis | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setAnalysis(null);
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
        const result = await analyzePerson(img);
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
