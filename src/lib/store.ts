import { create } from "zustand";
import { canvasToBlob, colorSwatchBlob, fileToCanvas } from "@/lib/images";
import {
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
  init: () => Promise<void>;
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
    list.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
  }
  return list;
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
  init: async () => {
    if (bootStarted) return;
    bootStarted = true;
    booting = true;
    try {
      const [profile, hair, nails, favorites] = await Promise.all([
        loadProfile(),
        loadHair(),
        loadNails(),
        queryFavorites("all"),
      ]);
      const styles = hair ? fromLegacy(hair.styles, hair.style) : [];
      const designs = nails ? fromLegacy(nails.designs, nails.design) : [];
      set({
        ready: true,
        memoryOk: true,
        profile: profile
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
          : emptyProfile(),
        hair: hair
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
          : emptyHair(),
        nails: nails
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
          : emptyNails(),
        favorites: favorites.map(viewFavorite),
      });
    } catch {
      set({
        ready: true,
        memoryOk: false,
        note: "Este navegador no guardó la memoria local. Puedes probar igual, pero se pierde al cerrar.",
      });
    } finally {
      booting = false;
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
        id: crypto.randomUUID(),
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
      added.push({ id: crypto.randomUUID(), url: image.url, blob: image.blob });
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
      added.push({ id: crypto.randomUUID(), url: image.url, blob: image.blob });
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
      id: crypto.randomUUID(),
      kind: input.kind,
      createdAt: Date.now(),
      meta: input.meta,
      preview: input.preview,
      sources: input.sources,
    };
    if (get().memoryOk) await putFavorite(record);
    set({
      favorites: [viewFavorite(record), ...get().favorites],
      note: "Guardado en favoritos.",
    });
  },
  buildSwatch: (hex) => colorSwatchBlob(hex),
  deleteFavorite: async (id) => {
    const current = get().favorites.find((item) => item.id === id);
    if (current) {
      revoke(current.previewUrl);
      current.sources.forEach((source) => revoke(source.url));
    }
    if (get().memoryOk) await removeFavorite(id);
    set({ favorites: get().favorites.filter((item) => item.id !== id) });
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
    set({
      profile: emptyProfile(),
      hair: emptyHair(),
      nails: emptyNails(),
      favorites: [],
      tab: "prendas",
      note: "Se borró todo lo guardado en este teléfono.",
    });
  },
}));
