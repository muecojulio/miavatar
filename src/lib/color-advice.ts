export type ColorMode = "complement" | "analogic" | "triad";

export type ColorSuggestion = {
  hex: string;
  name: string;
};

export type ColorAdvice = {
  baseName: string;
  colors: ColorSuggestion[];
};

type ColorApiColor = {
  hex?: { value?: unknown };
  name?: { value?: unknown };
};

const API_BASE = "https://www.thecolorapi.com";
const cache = new Map<string, ColorAdvice>();
const HEX_PATTERN = /^#[\da-f]{6}$/i;

async function getJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("No se pudo generar la combinación de color.");
  return (await response.json()) as T;
}

function cleanColor(color: ColorApiColor): ColorSuggestion | null {
  const hex = color.hex?.value;
  if (typeof hex !== "string" || !HEX_PATTERN.test(hex)) return null;
  const name = color.name?.value;
  return { hex: hex.toUpperCase(), name: typeof name === "string" ? name : "Color" };
}

/**
 * Uses The Color API's keyless color-identification and harmony endpoints. Only
 * a locally extracted hex value is sent; the source photo stays on this device.
 */
export async function getColorAdvice(
  hex: string,
  mode: ColorMode,
  signal?: AbortSignal,
): Promise<ColorAdvice> {
  if (!HEX_PATTERN.test(hex)) throw new Error("El color seleccionado no es válido.");

  const normalizedHex = hex.slice(1).toUpperCase();
  const cacheKey = `${normalizedHex}:${mode}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const colorUrl = new URL("/id", API_BASE);
  colorUrl.search = new URLSearchParams({ hex: normalizedHex, format: "json" }).toString();
  const schemeUrl = new URL("/scheme", API_BASE);
  schemeUrl.search = new URLSearchParams({
    hex: normalizedHex,
    mode,
    count: "5",
    format: "json",
  }).toString();

  const [base, scheme] = await Promise.all([
    getJson<ColorApiColor>(colorUrl, signal),
    getJson<{ colors?: ColorApiColor[] }>(schemeUrl, signal),
  ]);
  const baseColor = cleanColor(base);
  const colors = (scheme.colors ?? [])
    .map(cleanColor)
    .filter((item): item is ColorSuggestion => item !== null);
  if (!baseColor || colors.length === 0) {
    throw new Error("La API no devolvió una paleta válida. Prueba de nuevo.");
  }

  const result = { baseName: baseColor.name, colors };
  cache.set(cacheKey, result);
  if (cache.size > 24) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return result;
}
