import { create } from "zustand";
import { canvasToBlob, fileToCanvas } from "@/lib/images";
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
  ranges,
  type PersonKind,
  type TabId,
  type Zone,
} from "@/lib/types";

export type Garment = { id: string; zone: Zone; url: string; blob: Blob };

export type FavoriteView = {
  id: string;
  kind: "prenda" | "cabello";
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
  styleUrl: string | null;
  styleBlob: Blob | null;
  dye: string;
  intensity: number;
};

type Nails = {
  handUrl: string | null;
  handBlob: Blob | null;
  color: string;
  gloss: boolean;
  designUrl: string | null;
  designBlob: Blob | null;
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
  addGarment: (file: File) => Promise<void>;
  setGarmentZone: (id: string, zone: Zone) => void;
  removeGarment: (id: string) => void;
  setSelfie: (file: File) => Promise<void>;
  setStyle: (file: File) => Promise<void>;
  clearStyle: () => void;
  setDye: (dye: string) => void;
  setIntensity: (intensity: number) => void;
  setHand: (file: File) => Promise<void>;
  setNailColor: (color: string) => void;
  setGloss: (gloss: boolean) => void;
  setDesign: (file: File) => Promise<void>;
  clearDesign: () => void;
  saveFavorite: (input: {
    kind: "prenda" | "cabello";
    meta: string;
    preview: Blob;
    sources: { label: string; blob: Blob }[];
  }) => Promise<void>;
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
  styleUrl: null,
  styleBlob: null,
  dye: "castano",
  intensity: 0.7,
});

const emptyNails = (): Nails => ({
  handUrl: null,
  handBlob: null,
  color: "rojo",
  gloss: true,
  designUrl: null,
  designBlob: null,
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
      style: hair.styleBlob,
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
      design: nails.designBlob,
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
              garments: profile.garments.map((item) => ({
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
              styleBlob: hair.style,
              styleUrl: urlOf(hair.style),
            }
          : emptyHair(),
        nails: nails
          ? {
              color: nails.color,
              gloss: nails.gloss,
              handBlob: nails.hand,
              handUrl: urlOf(nails.hand),
              designBlob: nails.design,
              designUrl: urlOf(nails.design),
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
  addGarment: async (file) => {
    if (get().profile.garments.length >= 6) {
      set({ note: "Puedes colocar hasta 6 prendas en la misma prueba." });
      return;
    }
    const image = await rememberFile(file, 800);
    const zone: Zone = image.height / image.width > 1.45 ? "completo" : "superior";
    const garment: Garment = { id: crypto.randomUUID(), zone, url: image.url, blob: image.blob };
    set({ profile: { ...get().profile, garments: [...get().profile.garments, garment] }, note: "" });
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
      profile: { ...get().profile, garments: get().profile.garments.filter((item) => item.id !== id) },
    });
    queueProfile();
  },
  setSelfie: async (file) => {
    const image = await rememberFile(file);
    revoke(get().hair.selfieUrl);
    set({ hair: { ...get().hair, selfieUrl: image.url, selfieBlob: image.blob }, note: "" });
    queueHair();
  },
  setStyle: async (file) => {
    const image = await rememberFile(file, 800);
    revoke(get().hair.styleUrl);
    set({ hair: { ...get().hair, styleUrl: image.url, styleBlob: image.blob }, note: "" });
    queueHair();
  },
  clearStyle: () => {
    revoke(get().hair.styleUrl);
    set({ hair: { ...get().hair, styleUrl: null, styleBlob: null } });
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
  setDesign: async (file) => {
    const image = await rememberFile(file, 640);
    revoke(get().nails.designUrl);
    set({ nails: { ...get().nails, designUrl: image.url, designBlob: image.blob } });
    queueNails();
  },
  clearDesign: () => {
    revoke(get().nails.designUrl);
    set({ nails: { ...get().nails, designUrl: null, designBlob: null } });
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
    profile.garments.forEach((item) => revoke(item.url));
    revoke(hair.selfieUrl);
    revoke(hair.styleUrl);
    revoke(nails.handUrl);
    revoke(nails.designUrl);
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
