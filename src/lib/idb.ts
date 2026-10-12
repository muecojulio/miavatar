import type { DesignScope, FavoriteKind, PersonKind, Zone } from "@/lib/types";

const DB_NAME = "miavatar";
const DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("favorites")) {
        const store = db.createObjectStore("favorites", { keyPath: "id" });
        store.createIndex("byKind", "kind", { unique: false });
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

export async function queryFavorites(kind: FavoriteKind | "all") {
  const db = await openDb();
  const tx = db.transaction("favorites", "readonly");
  const store = tx.objectStore("favorites");
  const source = kind === "all" ? store.index("byCreated") : store.index("byKind");
  const rows = await requestOf(kind === "all" ? source.getAll() : source.getAll(kind));
  return (rows as FavoriteRecord[]).sort((a, b) => b.createdAt - a.createdAt);
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
