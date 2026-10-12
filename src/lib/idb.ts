import type { DesignScope, FavoriteKind, PersonKind, Zone } from "@/lib/types";

const DB_NAME = "miavatar";
/**
 * v2 — índices de favoritos revisados (ver docs/INDICES-Y-RENDIMIENTO.md):
 * `byKindCreated` compuesto [kind, createdAt] sustituye al índice simple
 * `byKind`. Con él, filtrar por tipo ya devuelve las filas ordenadas por fecha
 * y se elimina la ordenación en memoria; para "todos" se usa `byCreated`.
 */
const DB_VERSION = 2;

/** Tope de filas que se leen de una sola vez al abrir Favoritos. */
export const FAVORITES_PAGE = 120;

export type ProfileRecord = {
  kind: PersonKind | null;
  heightCm: number;
  weightKg: number;
  eye: string;
  studio: boolean;
  measures: boolean;
  face: Blob | null;
  garments: { id: string; zone: Zone; blob: Blob }[];
};

export type StoredPhoto = { id: string; blob: Blob };

export type HairRecord = {
  selfie: Blob | null;
  /** Reference hairstyle photos, added one after another. */
  styles: StoredPhoto[];
  activeStyleId: string | null;
  dye: string;
  intensity: number;
  /** Older saves kept a single style; still readable. */
  style?: Blob | null;
};

export type NailsRecord = {
  hand: Blob | null;
  color: string;
  gloss: boolean;
  /** Reference nail-art photos, added one after another. */
  designs: StoredPhoto[];
  activeDesignId: string | null;
  designScope: DesignScope;
  /** Older saves kept a single design; still readable. */
  design?: Blob | null;
};

export type FavoriteRecord = {
  id: string;
  kind: FavoriteKind;
  createdAt: number;
  meta: string;
  preview: Blob;
  sources: { label: string; blob: Blob }[];
};

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      const store = db.objectStoreNames.contains("favorites")
        ? tx?.objectStore("favorites")
        : db.createObjectStore("favorites", { keyPath: "id" });
      if (!store) return;
      // Índice compuesto: prefijo por tipo + fecha, sirve para filtrar y para
      // ordenar sin ordenar. El índice simple `byKind` queda cubierto por él.
      if (!store.indexNames.contains("byKindCreated")) {
        store.createIndex("byKindCreated", ["kind", "createdAt"], { unique: false });
      }
      if (store.indexNames.contains("byKind")) store.deleteIndex("byKind");
      if (!store.indexNames.contains("byCreated")) {
        store.createIndex("byCreated", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestOf<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function kvGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  const value = await requestOf(db.transaction("kv", "readonly").objectStore("kv").get(key));
  return (value as T | undefined) ?? null;
}

async function kvSet(key: string, value: unknown) {
  const db = await openDb();
  await requestOf(db.transaction("kv", "readwrite").objectStore("kv").put(value, key));
}

export function loadProfile() {
  return kvGet<ProfileRecord>("profile");
}

export function saveProfile(record: ProfileRecord) {
  return kvSet("profile", record);
}

export function loadHair() {
  return kvGet<HairRecord>("hair");
}

export function saveHair(record: HairRecord) {
  return kvSet("hair", record);
}

export function loadNails() {
  return kvGet<NailsRecord>("nails");
}

export function saveNails(record: NailsRecord) {
  return kvSet("nails", record);
}

/**
 * Recorre un índice en orden descendente y devuelve hasta `limit` filas.
 * Al pedir "todo" se lee `byCreated`; al filtrar por tipo, `byKindCreated` con
 * el rango [kind, 0] … [kind, máximo], que ya viene ordenado por fecha.
 */
function readDescending<T>(
  index: IDBIndex,
  range: IDBKeyRange | null,
  limit: number,
): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const rows: T[] = [];
    let settled = false;
    const request = index.openCursor(range, "prev");
    request.onsuccess = () => {
      if (settled) return;
      const cursor = request.result;
      if (!cursor || rows.length >= limit) {
        settled = true;
        resolve(rows);
        return;
      }
      rows.push(cursor.value as T);
      cursor.continue();
    };
    request.onerror = () => {
      settled = true;
      reject(request.error);
    };
  });
}

export async function queryFavorites(kind: FavoriteKind | "all", limit = FAVORITES_PAGE) {
  const db = await openDb();
  const tx = db.transaction("favorites", "readonly");
  const store = tx.objectStore("favorites");
  if (kind === "all") {
    return readDescending<FavoriteRecord>(store.index("byCreated"), null, limit);
  }
  const range = IDBKeyRange.bound([kind, 0], [kind, Number.MAX_SAFE_INTEGER]);
  return readDescending<FavoriteRecord>(store.index("byKindCreated"), range, limit);
}

/** Cuántas pruebas hay guardadas, por tipo. Sirve para los filtros. */
export async function countFavorites(): Promise<{ total: number; byKind: Record<string, number> }> {
  const db = await openDb();
  const tx = db.transaction("favorites", "readonly");
  const store = tx.objectStore("favorites");
  const total = await requestOf(store.count());
  const byKind: Record<string, number> = {};
  for (const kind of ["prenda", "cabello", "unas"] as const) {
    const range = IDBKeyRange.bound([kind, 0], [kind, Number.MAX_SAFE_INTEGER]);
    byKind[kind] = await requestOf(store.index("byKindCreated").count(range));
  }
  return { total, byKind };
}

export async function putFavorite(record: FavoriteRecord) {
  const db = await openDb();
  await requestOf(db.transaction("favorites", "readwrite").objectStore("favorites").put(record));
}

export async function removeFavorite(id: string) {
  const db = await openDb();
  await requestOf(db.transaction("favorites", "readwrite").objectStore("favorites").delete(id));
}

export async function wipeAll() {
  const db = await openDb();
  const tx = db.transaction(["kv", "favorites"], "readwrite");
  await requestOf(tx.objectStore("kv").clear());
  await requestOf(tx.objectStore("favorites").clear());
}
