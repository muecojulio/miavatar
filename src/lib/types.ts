export const KINDS = [
  { id: "hombre", label: "Hombre" },
  { id: "mujer", label: "Mujer" },
  { id: "nino", label: "Niño" },
  { id: "nina", label: "Niña" },
] as const;

export type PersonKind = (typeof KINDS)[number]["id"];

export type Zone = "superior" | "inferior" | "completo";

export const ZONES: { id: Zone; label: string }[] = [
  { id: "superior", label: "Superior" },
  { id: "inferior", label: "Inferior" },
  { id: "completo", label: "Completo" },
];

export const EYES = [
  { id: "cafe", label: "Café", hex: "#5c3a24" },
  { id: "miel", label: "Miel", hex: "#b5813c" },
  { id: "verde", label: "Verde", hex: "#3f6b4a" },
  { id: "azul", label: "Azul", hex: "#3e6494" },
  { id: "gris", label: "Gris", hex: "#8a9096" },
  { id: "negro", label: "Negro", hex: "#1c1c1c" },
] as const;

export const DYES = [
  { id: "natural", label: "Natural", hex: "" },
  { id: "negro", label: "Negro", hex: "#1a1a1a" },
  { id: "castano", label: "Castaño", hex: "#5a3824" },
  { id: "castano-claro", label: "Castaño claro", hex: "#8a5a32" },
  { id: "rubio", label: "Rubio", hex: "#d7b15a" },
  { id: "platino", label: "Platino", hex: "#efe6cf" },
  { id: "rojo", label: "Rojo", hex: "#8e2f2a" },
  { id: "cobre", label: "Cobrizo", hex: "#b15a32" },
  { id: "caoba", label: "Caoba", hex: "#6b2430" },
  { id: "rosa", label: "Rosa", hex: "#c46b8a" },
  { id: "ceniza", label: "Ceniza", hex: "#8d8a86" },
] as const;

export const NAILS = [
  { id: "nude", label: "Nude", hex: "#e6cbb8" },
  { id: "rosa", label: "Rosa", hex: "#e7a3b0" },
  { id: "coral", label: "Coral", hex: "#e07a62" },
  { id: "rojo", label: "Rojo", hex: "#b4232c" },
  { id: "vino", label: "Vino", hex: "#6e2432" },
  { id: "berry", label: "Berry", hex: "#8a3358" },
  { id: "malva", label: "Malva", hex: "#b48aa8" },
  { id: "negro", label: "Negro", hex: "#1c1c1c" },
  { id: "blanco", label: "Blanco", hex: "#f4f1ea" },
  { id: "azul", label: "Azul noche", hex: "#243656" },
  { id: "verde", label: "Bosque", hex: "#2f4a3c" },
  { id: "champagne", label: "Champagne", hex: "#c6a36a" },
] as const;

/** Where the uploaded nail design is painted. */
export type DesignScope = "todas" | "acento";

export const DESIGN_SCOPES: { id: DesignScope; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "acento", label: "Uña de acento" },
];

export type FavoriteKind = "prenda" | "cabello" | "unas";

export const FAVORITE_KINDS: { id: FavoriteKind; label: string; plural: string }[] = [
  { id: "prenda", label: "Prendas", plural: "Prendas" },
  { id: "cabello", label: "Cabello", plural: "Peinados y tintes" },
  { id: "unas", label: "Uñas", plural: "Uñas" },
];

/** How many photos the avatar accepts at once in each section. */
export const LIMITS = { garments: 12, styles: 8, designs: 8 } as const;

/** A photo kept in memory (and in the local database) with its preview URL. */
export type MediaRef = {
  id: string;
  blob: Blob;
  url: string;
};

export type TabId =
  "prendas" | "cabello" | "unas" | "estilo" | "favoritos" | "privacidad" | "instalar";

export function kindLabel(kind: PersonKind | null) {
  return KINDS.find((item) => item.id === kind)?.label ?? "Sin elegir";
}

export function favoriteKindLabel(kind: FavoriteKind) {
  return FAVORITE_KINDS.find((item) => item.id === kind)?.plural ?? "";
}

export function showsNails(kind: PersonKind | null) {
  return kind === "mujer" || kind === "nina";
}

export function ranges(kind: PersonKind) {
  const child = kind === "nino" || kind === "nina";
  return child
    ? { hMin: 90, hMax: 165, h: 128, wMin: 14, wMax: 70, w: 30 }
    : { hMin: 140, hMax: 210, h: 168, wMin: 40, wMax: 160, w: 66 };
}

export function clampMeasures(kind: PersonKind, heightCm: number, weightKg: number) {
  const span = ranges(kind);
  return {
    heightCm: Math.min(span.hMax, Math.max(span.hMin, Math.round(heightCm))),
    weightKg: Math.min(span.wMax, Math.max(span.wMin, Math.round(weightKg))),
  };
}

export function eyeHex(id: string) {
  return EYES.find((item) => item.id === id)?.hex ?? EYES[0].hex;
}

export function dyeById(id: string) {
  return DYES.find((item) => item.id === id) ?? DYES[0];
}

export function nailById(id: string) {
  return NAILS.find((item) => item.id === id) ?? NAILS[3];
}

/**
 * A tall photo is taken as a full look (dress, suit), anything else as a top.
 * Used to place an uploaded garment on the right part of the figure.
 */
export function guessZone(width: number, height: number): Zone {
  if (!width || !height) return "superior";
  return height / width > 1.45 ? "completo" : "superior";
}
