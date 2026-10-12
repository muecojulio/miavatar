/**
 * Caché de datos externos (clima y armonías de color).
 *
 * Dos capas, ambas sin servidor y sin cookies:
 * 1. memoria del proceso — respuesta inmediata al repetir dentro de la sesión;
 * 2. `localStorage` con caducidad — sobrevive a recargas y permite ver el
 *    último pronóstico sin conexión.
 *
 * Además agrupa peticiones idénticas simultáneas (`dedupe`): dos componentes
 * que pidan la misma ciudad al mismo tiempo hacen una sola llamada de red.
 */

const NAMESPACE = "miavatar:cache:";
const KEY_LIMIT = 64;

type Stored<T> = { at: number; value: T };

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = `${NAMESPACE}probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored<T>(key: string, ttlMs: number): T | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(NAMESPACE + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    if (typeof parsed?.at !== "number") return null;
    if (Date.now() - parsed.at > ttlMs) {
      store.removeItem(NAMESPACE + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeStored<T>(key: string, value: T) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(NAMESPACE + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Cuota llena: se descarta lo más viejo de nuestra propia caché.
    pruneStored(store);
  }
}

function pruneStored(store: Storage) {
  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key?.startsWith(NAMESPACE)) keys.push(key);
  }
  for (const key of keys.sort().slice(0, Math.max(1, keys.length - KEY_LIMIT))) {
    store.removeItem(key);
  }
}

/** Registro de las cachés creadas, para poder purgarlas todas de una vez. */
const registry = new Set<() => void>();

/** Borra todo lo cacheado: se usa al eliminar los datos del dispositivo. */
export function clearAllCaches() {
  registry.forEach((clear) => clear());
}

export type TtlCache<T> = {
  /** Valor en memoria o en `localStorage`, si sigue vigente. */
  peek: (key: string) => T | null;
  /** Último valor guardado aunque esté caducado: sólo para modo sin conexión. */
  peekStale: (key: string) => T | null;
  /** Consulta la red una sola vez por clave y guarda el resultado. */
  load: (key: string, fetcher: (signal?: AbortSignal) => Promise<T>, signal?: AbortSignal) => Promise<T>;
  /** Guarda un valor ya calculado. */
  put: (key: string, value: T) => void;
  clear: () => void;
};

export function createTtlCache<T>(name: string, ttlMs: number): TtlCache<T> {
  const memory = new Map<string, Stored<T>>();
  const inflight = new Map<string, Promise<T>>();

  const peek = (key: string): T | null => {
    const local = memory.get(key);
    if (local && Date.now() - local.at <= ttlMs) return local.value;
    const stored = readStored<T>(key, ttlMs);
    if (stored !== null) memory.set(key, { at: Date.now(), value: stored });
    return stored;
  };

  const put = (key: string, value: T) => {
    const entry = { at: Date.now(), value };
    memory.set(key, entry);
    if (memory.size > KEY_LIMIT) {
      const oldest = memory.keys().next().value;
      if (oldest) memory.delete(oldest);
    }
    writeStored(key, value);
  };

  const load = (
    key: string,
    fetcher: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> => {
    const cached = peek(key);
    if (cached !== null) return Promise.resolve(cached);

    const pending = inflight.get(key);
    if (pending) return pending;

    const request = fetcher(signal)
      .then((value) => {
        put(key, value);
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, request);
    return request;
  };

  const peekStale = (key: string): T | null => {
    const local = memory.get(key);
    if (local) return local.value;
    const store = storage();
    if (!store) return null;
    try {
      const raw = store.getItem(NAMESPACE + key);
      if (!raw) return null;
      return (JSON.parse(raw) as Stored<T>)?.value ?? null;
    } catch {
      return null;
    }
  };

  const clear = () => {
    memory.clear();
    inflight.clear();
    const store = storage();
    if (!store) return;
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(NAMESPACE)) keys.push(key);
    }
    keys.forEach((key) => store.removeItem(key));
  };

  registry.add(clear);
  void name;
  return { peek, peekStale, load, put, clear };
}

/** Normaliza texto para buscar sin distinguir mayúsculas ni acentos. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
