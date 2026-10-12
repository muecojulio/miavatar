import quantize from "./vendor/quantize.mjs";
import { opaqueRatio, removeBackground } from "@/lib/cutout";
import { fileToCanvas } from "@/lib/images";

/**
 * Pixel sampling follows Color Thief's createPixelArray filter (v2.7.0), with a
 * median-cut palette generated from the MIT-licensed lokesh/quantize project.
 * See THIRD_PARTY_NOTICES.md for source links and notices.
 */
function sampledPixels(data: Uint8ClampedArray, pixelCount: number, quality: number) {
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const alpha = data[offset + 3];
    if (alpha < 125) continue;
    if (r > 250 && g > 250 && b > 250) continue;
    pixels.push([r, g, b]);
  }
  return pixels;
}

function rgbToHex(rgb: number[]) {
  return `#${rgb
    .slice(0, 3)
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

/** Builds a small garment palette entirely in the browser; no image is uploaded. */
export async function extractColorPalette(blob: Blob, colorCount = 6): Promise<string[]> {
  const file = new File([blob], "garment-image", { type: blob.type || "image/jpeg" });
  const source = await fileToCanvas(file, 240);
  const cutout = removeBackground(source);
  const ratio = opaqueRatio(cutout);
  const canvas = ratio > 0.04 && ratio < 0.97 ? cutout : source;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No se pudo leer la imagen de la prenda.");

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixelCount = canvas.width * canvas.height;
  let pixels = sampledPixels(image.data, pixelCount, 5);
  // Keep white or very light garments usable when the image has no other colors.
  if (pixels.length === 0) {
    pixels = [];
    for (let i = 0; i < pixelCount; i += 5) {
      const offset = i * 4;
      if (image.data[offset + 3] >= 125) {
        pixels.push([image.data[offset], image.data[offset + 1], image.data[offset + 2]]);
      }
    }
  }

  const palette = quantize(pixels, Math.max(2, colorCount))?.palette() ?? [];
  return [...new Set(palette.map(rgbToHex))].slice(0, colorCount);
}
