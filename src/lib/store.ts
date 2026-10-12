import { create } from "zustand";
import { clearComputeCache } from "@/lib/analysis-cache";
import { clearAllCaches } from "@/lib/cache";
import { clearOfflineCaches } from "@/lib/offline";
import { canvasToBlob, colorSwatchBlob, fileToCanvas } from "@/lib/images";
import {
  countFavorites,
  loadHair,
  loadNails,
  loadProfile,
  putFavorite,
  queryFavorites,
  removeFavorite,
  saveHair,
  saveNails,
  saveProfile,
  wipeAll,
  type FavoriteRecord,
} from "@/lib/idb";
import {
  clampMeasures,
  guessZone,
  LIMITS,
  ranges,
  type DesignScope,
  type FavoriteKind,
  type MediaRef,
  type PersonKind,
  type TabId,
  type Zone,
} from "@/lib/types";

export type Garment = MediaRef & { zone: Zone };

/** Estado visible de una acción: alimenta botones, avisos y regiones aria-live. */
export type ActionStatus = {
  id: string;
  state: "idle" | "saving" | "done" | "error";
  message: string;
};

export type FavoriteView = {
  id: string;
  kind: FavoriteKind;
  createdAt: number;
  meta: string;
  previewUrl: string;
  sources: { label: string; url: string }[];
};

type Profile = {
  kind: PersonKind | null;
  heightCm: number;
  weightKg: number;
  eye: string;
  studio: boolean;
  measures: boolean;
  faceUrl: string | null;
  faceBlob: Blob | null;
  garments: Garment[];
};

type Hair = {
  selfieUrl: string | null;
  selfieBlob: Blob | null;
  styles: MediaRef[];
  activeStyleId: string | null;
  dye: string;
  intensity: number;
};

type Nails = {
  handUrl: string | null;
  handBlob: Blob | null;
  color: string;
  gloss: boolean;
  designs: MediaRef[];
  activeDesignId: string | null;
  designScope: DesignScope;
};

type StudioState = {
  ready: boolean;
  memoryOk: boolean;
  tab: TabId;
  note: string;
  profile: Profile;
  hair: Hair;
  nails: Nails;
  favorites: FavoriteView[];
  /** Cuántas pruebas hay por tipo (se muestra en los filtros). */
  favoriteCounts: Record<string, number>;
  action: ActionStatus;
  init: () => Promise<void>;
  setAction: (state: ActionStatus["state"], message: string, id?: string) => void;
  setTab: (tab: TabId) => void;
  setKind: (kind: PersonKind) => void;
  setHeight: (heightCm: number) => void;
  setWeight: (weightKg: number) => void;
  setEye: (eye: string) => void;
  setStudio: (studio: boolean) => void;
  setMeasures: (measures: boolean) => void;
  setFace: (file: File) => Promise<void>;
  addGarments: (files: File[]) => Promise<void>;
  setGarmentZone: (id: string, zone: Zone) => void;
  removeGarment: (id: string) => void;
  setSelfie: (file: File) => Promise<void>;
  addStyles: (files: File[]) => Promise<void>;
  setActiveStyle: (id: string) => void;
  removeStyle: (id: string) => void;
  setDye: (dye: string) => void;
  setIntensity: (intensity: number) => void;
  setHand: (file: File) => Promise<void>;
  setNailColor: (color: string) => void;
  setGloss: (gloss: boolean) => void;
  addDesigns: (files: File[]) => Promise<void>;
  setActiveDesign: (id: string) => void;
  removeDesign: (id: string) => void;
  setDesignScope: (scope: DesignScope) => void;
  saveFavorite: (input: {
    kind: FavoriteKind;
    meta: string;
    preview: Blob;
    sources: { label: string; blob: Blob }[];
  }) => Promise<void>;
  buildSwatch: (hex: string) => Promise<Blob>;
  deleteFavorite: (id: string) => Promise<void>;
  wipe: () => Promise<void>;
};

const emptyProfile = (): Profile => ({
  kind: null,
  heightCm: 168,
  weightKg: 66,
  eye: "cafe",
  studio: true,
  measures: false,
  faceUrl: null,
  faceBlob: null,
  garments: [],
});

const emptyHair = (): Hair => ({
  selfieUrl: null,
  selfieBlob: null,
  styles: [],
  activeStyleId: null,
  dye: "castano",
  intensity: 0.7,
});

const emptyNails = (): Nails => ({
  handUrl: null,
  handBlob: null,
  color: "rojo",
  gloss: true,
  designs: [],
  activeDesignId: null,
  designScope: "todas",
});

/** `crypto.randomUUID` exige contexto seguro; hay un respaldo por si no está. */
function newId() {
  const builder = globalThis.crypto;
  if (builder && typeof builder.randomUUID === "function") return builder.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function urlOf(blob: Blob | null) {
  return blob ? URL.createObjectURL(blob) : null;
}

let profileTimer = 0;
let hairTimer = 0;
let nailsTimer = 0;
let booting = false;
let bootStarted = false;

function queueProfile() {
  if (booting) return;
  window.clearTimeout(profileTimer);
  profileTimer = window.setTimeout(() => {
    const profile = useStudio.getState().profile;
    void saveProfile({
      kind: profile.kind,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      eye: profile.eye,
      studio: profile.studio,
      measures: profile.measures,
      face: profile.faceBlob,
      garments: profile.garments.map((item) => ({ id: item.id, zone: item.zone, blob: item.blob })),
    });
  }, 220);
}

function queueHair() {
  if (booting) return;
  window.clearTimeout(hairTimer);
  hairTimer = window.setTimeout(() => {
    const hair = useStudio.getState().hair;
    void saveHair({
      selfie: hair.selfieBlob,
      styles: hair.styles.map((item) => ({ id: item.id, blob: item.blob })),
      activeStyleId: hair.activeStyleId,
      style: null,
      dye: hair.dye,
      intensity: hair.intensity,
    });
  }, 220);
}

function queueNails() {
  if (booting) return;
  window.clearTimeout(nailsTimer);
  nailsTimer = window.setTimeout(() => {
    const nails = useStudio.getState().nails;
    void saveNails({
      hand: nails.handBlob,
      color: nails.color,
      gloss: nails.gloss,
      designs: nails.designs.map((item) => ({ id: item.id, blob: item.blob })),
      activeDesignId: nails.activeDesignId,
      designScope: nails.designScope,
      design: null,
    });
  }, 220);
}

async function rememberFile(file: File, max = 960) {
  const canvas = await fileToCanvas(file, max);
  const blob = await canvasToBlob(canvas);
  return { blob, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
}

function revoke(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

function revokeAll(refs: MediaRef[]) {
  refs.forEach((item) => revoke(item.url));
}

function viewFavorite(record: FavoriteRecord): FavoriteView {
  return {
    id: record.id,
    kind: record.kind,
    createdAt: record.createdAt,
    meta: record.meta,
    previewUrl: URL.createObjectURL(record.preview),
    sources: record.sources.map((source) => ({
      label: source.label,
      url: URL.createObjectURL(source.blob),
    })),
  };
}

/** Older saves stored a single `style` / `design` blob instead of a list. */
function fromLegacy(
  photos: { id: string; blob: Blob }[] | undefined,
  legacy: Blob | null | undefined,
) {
  const list = (photos ?? []).map((item) => ({
    id: item.id,
    blob: item.blob,
    url: URL.createObjectURL(item.blob),
  }));
  if (list.length === 0 && legacy) {
    const blob = legacy;
    list.push({ id: newId(), blob, url: URL.createObjectURL(blob) });
  }
  return list;
}

/**
 * Traduce el estado interno de la acción al estado visual del botón.
 * Centralizado para que todas las pestañas usen el mismo criterio.
 */
export function statusFor(
  action: ActionStatus,
  id: string,
): "idle" | "loading" | "success" | "error" {
  if (action.id !== id) return "idle";
  if (action.state === "saving") return "loading";
  if (action.state === "done") return "success";
  if (action.state === "error") return "error";
  return "idle";
}

export const useStudio = create<StudioState>((set, get) => ({
  ready: false,
  memoryOk: true,
  tab: "prendas",
  note: "",
  profile: emptyProfile(),
  hair: emptyHair(),
  nails: emptyNails(),
  favorites: [],
  favoriteCounts: {},
  action: { id: "", state: "idle", message: "" },
  setAction: (state, message, id = "") => set({ action: { id, state, message } }),
  init: async () => {
    if (bootStarted) return;
    bootStarted = true;
    booting = true;
    // La memoria tarda unas décimas en cargar y el usuario puede tocar la
    // interfaz antes. Lo que elige en ese instante es más reciente que lo
    // guardado: se conserva en lugar de sobrescribirse cuando llega la carga.
    const touched = new Set<"profile" | "hair" | "nails" | "favorites">();
    const unsubscribe = useStudio.subscribe((state, previous) => {
      if (!booting) return;
      if (state.profile !== previous.profile) touched.add("profile");
      if (state.hair !== previous.hair) touched.add("hair");
      if (state.nails !== previous.nails) touched.add("nails");
      if (state.favorites !== previous.favorites) touched.add("favorites");
    });
    try {
      const [profile, hair, nails, favorites, counts] = await Promise.all([
        loadProfile(),
        loadHair(),
        loadNails(),
        queryFavorites("all"),
        countFavorites().catch(() => ({ total: 0, byKind: {} as Record<string, number> })),
      ]);
      const styles = hair ? fromLegacy(hair.styles, hair.style) : [];
      const designs = nails ? fromLegacy(nails.designs, nails.design) : [];
      const loadedProfile: Profile = profile
        ? {
              kind: profile.kind,
              heightCm: profile.heightCm,
              weightKg: profile.weightKg,
              eye: profile.eye,
              studio: profile.studio,
              measures: profile.measures,
              faceBlob: profile.face,
              faceUrl: urlOf(profile.face),
              garments: (profile.garments ?? []).map((item) => ({
                id: item.id,
                zone: item.zone,
                blob: item.blob,
                url: URL.createObjectURL(item.blob),
              })),
            }
        : emptyProfile();

      const loadedHair: Hair = hair
        ? {
              dye: hair.dye,
              intensity: hair.intensity,
              selfieBlob: hair.selfie,
              selfieUrl: urlOf(hair.selfie),
              styles,
              activeStyleId: styles.some((item) => item.id === hair.activeStyleId)
                ? hair.activeStyleId
                : (styles[0]?.id ?? null),
            }
        : emptyHair();

      const loadedNails: Nails = nails
        ? {
              color: nails.color,
              gloss: nails.gloss,
              handBlob: nails.hand,
              handUrl: urlOf(nails.hand),
              designs,
              activeDesignId: designs.some((item) => item.id === nails.activeDesignId)
                ? nails.activeDesignId
                : (designs[0]?.id ?? null),
              designScope: nails.designScope ?? "todas",
            }
        : emptyNails();

      set({
        ready: true,
        memoryOk: true,
        ...(touched.has("profile") ? {} : { profile: loadedProfile }),
        ...(touched.has("hair") ? {} : { hair: loadedHair }),
        ...(touched.has("nails") ? {} : { nails: loadedNails }),
        ...(touched.has("favorites")
          ? {}
          : {
              favorites: favorites.map(viewFavorite),
              favoriteCounts: { all: counts.total, ...counts.byKind },
            }),
      });

      if (touched.has("favorites") && get().memoryOk) {
        // Guardar y quitar escriben antes de tocar el estado, así que volver a
        // consultar la base es exacto y no pierde lo hecho durante el arranque.
        const [fresh, freshCounts] = await Promise.all([
          queryFavorites("all"),
          countFavorites().catch(() => ({ total: 0, byKind: {} as Record<string, number> })),
        ]);
        get().favorites.forEach((item) => {
          revoke(item.previewUrl);
          item.sources.forEach((source) => revoke(source.url));
        });
        set({
          favorites: fresh.map(viewFavorite),
          favoriteCounts: { all: freshCounts.total, ...freshCounts.byKind },
        });
      }
    } catch {
      set({
        ready: true,
        memoryOk: false,
        note: "Este navegador no guardó la memoria local. Puedes probar igual, pero se pierde al cerrar.",
      });
    } finally {
      unsubscribe();
      booting = false;
      // Lo elegido durante el arranque se guarda ahora (antes no podía: la
      // carga en curso habría escrito encima).
      if (touched.has("profile")) queueProfile();
      if (touched.has("hair")) queueHair();
      if (touched.has("nails")) queueNails();
    }
  },
  setTab: (tab) => set({ tab, note: "" }),
  setKind: (kind) => {
    const current = get().profile;
    const next =
      current.kind == null
        ? { heightCm: ranges(kind).h, weightKg: ranges(kind).w }
        : clampMeasures(kind, current.heightCm, current.weightKg);
    const tab = get().tab === "unas" && kind !== "mujer" && kind !== "nina" ? "prendas" : get().tab;
    set({ tab, profile: { ...current, kind, ...next } });
    queueProfile();
  },
  setHeight: (heightCm) => {
    set({ profile: { ...get().profile, heightCm } });
    queueProfile();
  },
  setWeight: (weightKg) => {
    set({ profile: { ...get().profile, weightKg } });
    queueProfile();
  },
  setEye: (eye) => {
    set({ profile: { ...get().profile, eye } });
    queueProfile();
  },
  setStudio: (studio) => {
    set({ profile: { ...get().profile, studio } });
    queueProfile();
  },
  setMeasures: (measures) => {
    set({ profile: { ...get().profile, measures } });
    queueProfile();
  },
  setFace: async (file) => {
    const image = await rememberFile(file);
    revoke(get().profile.faceUrl);
    set({ profile: { ...get().profile, faceUrl: image.url, faceBlob: image.blob }, note: "" });
    queueProfile();
  },
  addGarments: async (files) => {
    if (files.length === 0) return;
    const current = get().profile.garments;
    const room = LIMITS.garments - current.length;
    if (room <= 0) {
      set({ note: `El avatar ya tiene ${LIMITS.garments} prendas. Quita una para agregar otra.` });
      return;
    }
    const taken = files.slice(0, room);
    const added: Garment[] = [];
    for (const file of taken) {
      const image = await rememberFile(file, 800);
      added.push({
        id: newId(),
        zone: guessZone(image.width, image.height),
        url: image.url,
        blob: image.blob,
      });
    }
    set({
      profile: { ...get().profile, garments: [...current, ...added] },
      note:
        added.length === 1
          ? "Prenda agregada al avatar."
          : `${added.length} prendas agregadas al avatar.`,
    });
    queueProfile();
  },
  setGarmentZone: (id, zone) => {
    set({
      profile: {
        ...get().profile,
        garments: get().profile.garments.map((item) => (item.id === id ? { ...item, zone } : item)),
      },
    });
    queueProfile();
  },
  removeGarment: (id) => {
    const garment = get().profile.garments.find((item) => item.id === id);
    revoke(garment?.url ?? null);
    set({
      profile: {
        ...get().profile,
        garments: get().profile.garments.filter((item) => item.id !== id),
      },
    });
    queueProfile();
  },
  setSelfie: async (file) => {
    const image = await rememberFile(file);
    revoke(get().hair.selfieUrl);
    set({ hair: { ...get().hair, selfieUrl: image.url, selfieBlob: image.blob }, note: "" });
    queueHair();
  },
  addStyles: async (files) => {
    if (files.length === 0) return;
    const current = get().hair.styles;
    const room = LIMITS.styles - current.length;
    if (room <= 0) {
      set({ note: `Ya hay ${LIMITS.styles} peinados de referencia. Quita uno para agregar otro.` });
      return;
    }
    const added: MediaRef[] = [];
    for (const file of files.slice(0, room)) {
      const image = await rememberFile(file, 800);
      added.push({ id: newId(), url: image.url, blob: image.blob });
    }
    set({
      hair: {
        ...get().hair,
        styles: [...current, ...added],
        activeStyleId: get().hair.activeStyleId ?? added[0]?.id ?? null,
      },
      note:
        added.length === 1
          ? "Peinado agregado al avatar."
          : `${added.length} peinados agregados al avatar.`,
    });
    queueHair();
  },
  setActiveStyle: (id) => {
    set({ hair: { ...get().hair, activeStyleId: id }, note: "" });
    queueHair();
  },
  removeStyle: (id) => {
    const styles = get().hair.styles;
    const gone = styles.find((item) => item.id === id);
    revoke(gone?.url ?? null);
    const next = styles.filter((item) => item.id !== id);
    set({
      hair: {
        ...get().hair,
        styles: next,
        activeStyleId:
          get().hair.activeStyleId === id ? (next[0]?.id ?? null) : get().hair.activeStyleId,
      },
    });
    queueHair();
  },
  setDye: (dye) => {
    set({ hair: { ...get().hair, dye } });
    queueHair();
  },
  setIntensity: (intensity) => {
    set({ hair: { ...get().hair, intensity } });
    queueHair();
  },
  setHand: async (file) => {
    const image = await rememberFile(file);
    revoke(get().nails.handUrl);
    set({ nails: { ...get().nails, handUrl: image.url, handBlob: image.blob }, note: "" });
    queueNails();
  },
  setNailColor: (color) => {
    set({ nails: { ...get().nails, color } });
    queueNails();
  },
  setGloss: (gloss) => {
    set({ nails: { ...get().nails, gloss } });
    queueNails();
  },
  addDesigns: async (files) => {
    if (files.length === 0) return;
    const current = get().nails.designs;
    const room = LIMITS.designs - current.length;
    if (room <= 0) {
      set({ note: `Ya hay ${LIMITS.designs} diseños. Quita uno para agregar otro.` });
      return;
    }
    const added: MediaRef[] = [];
    for (const file of files.slice(0, room)) {
      const image = await rememberFile(file, 640);
      added.push({ id: newId(), url: image.url, blob: image.blob });
    }
    set({
      nails: {
        ...get().nails,
        designs: [...current, ...added],
        activeDesignId: get().nails.activeDesignId ?? added[0]?.id ?? null,
      },
      note:
        added.length === 1
          ? "Diseño agregado a las uñas."
          : `${added.length} diseños agregados a las uñas.`,
    });
    queueNails();
  },
  setActiveDesign: (id) => {
    set({ nails: { ...get().nails, activeDesignId: id } });
    queueNails();
  },
  removeDesign: (id) => {
    const designs = get().nails.designs;
    const gone = designs.find((item) => item.id === id);
    revoke(gone?.url ?? null);
    const next = designs.filter((item) => item.id !== id);
    set({
      nails: {
        ...get().nails,
        designs: next,
        activeDesignId:
          get().nails.activeDesignId === id ? (next[0]?.id ?? null) : get().nails.activeDesignId,
      },
    });
    queueNails();
  },
  setDesignScope: (designScope) => {
    set({ nails: { ...get().nails, designScope } });
    queueNails();
  },
  saveFavorite: async (input) => {
    const record: FavoriteRecord = {
      id: newId(),
      kind: input.kind,
      createdAt: Date.now(),
      meta: input.meta,
      preview: input.preview,
      sources: input.sources,
    };
    set({ action: { id: input.kind, state: "saving", message: "Guardando la prueba…" } });
    try {
      if (get().memoryOk) await putFavorite(record);
      const counts = get().favoriteCounts;
      set({
        favorites: [viewFavorite(record), ...get().favorites],
        favoriteCounts: {
          ...counts,
          all: (counts.all ?? 0) + 1,
          [input.kind]: (counts[input.kind] ?? 0) + 1,
        },
        note: "Guardado en favoritos.",
        action: { id: input.kind, state: "done", message: "Guardado en favoritos." },
      });
    } catch {
      set({
        memoryOk: false,
        note: "No se pudo guardar en este dispositivo.",
        action: { id: input.kind, state: "error", message: "No se pudo guardar." },
      });
    }
  },
  buildSwatch: (hex) => colorSwatchBlob(hex),
  deleteFavorite: async (id) => {
    const current = get().favorites.find((item) => item.id === id);
    set({ action: { id, state: "saving", message: "Quitando la prueba…" } });
    try {
      if (get().memoryOk) await removeFavorite(id);
      const counts = get().favoriteCounts;
      const nextCounts: Record<string, number> = {
        ...counts,
        all: Math.max(0, (counts.all ?? 0) - 1),
      };
      if (current) nextCounts[current.kind] = Math.max(0, (counts[current.kind] ?? 0) - 1);
      set({
        favorites: get().favorites.filter((item) => item.id !== id),
        favoriteCounts: nextCounts,
        action: { id, state: "done", message: "Prueba quitada." },
      });
    } finally {
      if (current) {
        revoke(current.previewUrl);
        current.sources.forEach((source) => revoke(source.url));
      }
    }
  },
  wipe: async () => {
    const { profile, hair, nails, favorites } = get();
    revoke(profile.faceUrl);
    revokeAll(profile.garments);
    revoke(hair.selfieUrl);
    revokeAll(hair.styles);
    revoke(nails.handUrl);
    revokeAll(nails.designs);
    favorites.forEach((item) => {
      revoke(item.previewUrl);
      item.sources.forEach((source) => revoke(source.url));
    });
    if (get().memoryOk) await wipeAll();
    // Nada derivado sobrevive al borrado: caché de cómputo, de datos externos y
    // del service worker.
    clearComputeCache();
    clearAllCaches();
    await clearOfflineCaches();
    set({
      profile: emptyProfile(),
      hair: emptyHair(),
      nails: emptyNails(),
      favorites: [],
      favoriteCounts: {},
      action: { id: "", state: "done", message: "Se borró todo lo guardado en este teléfono." },
      tab: "prendas",
      note: "Se borró todo lo guardado en este teléfono.",
    });
  },
}));
