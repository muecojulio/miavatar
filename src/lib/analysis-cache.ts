import type { PersonAnalysis, Point } from "@/lib/vision";

/**
 * Caché de cómputo en el dispositivo.
 *
 * Analizar una cara con los modelos de visión (segmentación multiclase, pelo,
 * piel) y extraer la paleta de una prenda cuesta cientos de milisegundos. Sin
 * caché, cambiar de pestaña y volver, o tocar la misma prenda dos veces, vuelve
 * a pagar ese coste. Aquí se guarda el resultado por foto — nunca la foto en
 * claro en otro sitio ni nada hacia la red — con un límite pequeño y expulsión
 * del más antiguo para no retener memoria de más.
 */

const LIMIT = 6;

class Lru<T> {
  private entries = new Map<string, { value: T; at: number }>();

  constructor(private readonly limit = LIMIT) {}

  get(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    entry.at = Date.now();
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T) {
    this.entries.delete(key);
    this.entries.set(key, { value, at: Date.now() });
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(key: string) {
    this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

const analysis = new Lru<PersonAnalysis>(4);
const palettes = new Lru<string[]>(12);
const hands = new Lru<Point[][]>(4);
const inflight = new Map<string, Promise<unknown>>();

function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const request = run().finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

/** Análisis de persona ya calculado para esa foto, si sigue en memoria. */
export function cachedAnalysis(url: string | null | undefined, compute: () => Promise<PersonAnalysis>) {
  if (!url) return compute();
  const hit = analysis.get(url);
  if (hit) return Promise.resolve(hit);
  return once(`analysis:${url}`, () =>
    compute().then((value) => {
      analysis.set(url, value);
      return value;
    }),
  );
}

export function readCachedAnalysis(url: string | null | undefined): PersonAnalysis | null {
  return url ? analysis.get(url) : null;
}

export function dropAnalysis(url: string | null | undefined) {
  if (url) analysis.delete(url);
}

export function cachedPalette(key: string, compute: () => Promise<string[]>) {
  const hit = palettes.get(key);
  if (hit) return Promise.resolve(hit);
  return once(`palette:${key}`, () =>
    compute().then((value) => {
      palettes.set(key, value);
      return value;
    }),
  );
}

export function dropPalette(key: string) {
  palettes.delete(key);
}

export function cachedHands(url: string, compute: () => Promise<Point[][]>) {
  const hit = hands.get(url);
  if (hit) return Promise.resolve(hit);
  return once(`hands:${url}`, () =>
    compute().then((value) => {
      hands.set(url, value);
      return value;
    }),
  );
}

/** Se llama al borrar todo: nada de resultados derivados sobrevive. */
export function clearComputeCache() {
  analysis.clear();
  palettes.clear();
  hands.clear();
  inflight.clear();
}

export const computeCacheStats = () => ({
  analysis: analysis.size,
  palettes: palettes.size,
  hands: hands.size,
});
