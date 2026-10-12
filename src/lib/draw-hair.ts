import { opaqueBounds } from "./cutout.ts";
import type { Point } from "./vision.ts";

function luminance(color: string) {
  const hex = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 0.4;
  const n = Number.parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function layerOf(width: number, height: number, mask: CanvasImageSource, dye: string) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const ctx = layer.getContext("2d");
  if (!ctx) return layer;
  ctx.fillStyle = dye;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0, width, height);
  return layer;
}

/**
 * Dye a photo of hair (or a reference hairstyle) while keeping the original
 * light and shadow, so the result reads as tinted hair and not as a flat blob.
 * `hue` moves the colour, a light `color` pass adds saturation.
 */
function dyePhoto(
  ctx: CanvasRenderingContext2D,
  mask: CanvasImageSource & { width: number; height: number },
  dye: string,
  intensity: number,
) {
  if (!dye || intensity <= 0.02) return;
  const layer = layerOf(mask.width, mask.height, mask, dye);
  const lum = luminance(dye);
  ctx.save();
  ctx.globalCompositeOperation = "hue";
  ctx.globalAlpha = Math.min(1, intensity);
  ctx.drawImage(layer, 0, 0);
  // Saturation of the chosen dye, keeping the highlights of the photo.
  ctx.globalCompositeOperation = "color";
  ctx.globalAlpha = Math.min(1, intensity * 1.15);
  ctx.drawImage(layer, 0, 0);
  if (lum < 0.5) {
    // Dark dyes (negro, caoba, vino) also darken the hair.
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = Math.min(0.85, (0.55 - lum) * 1.6 * intensity);
    ctx.drawImage(layer, 0, 0);
  } else {
    // Light dyes (rubio, platino) lift dark hair instead.
    ctx.globalCompositeOperation = "lighten";
    ctx.globalAlpha = Math.min(0.9, (lum - 0.5) * 2.4 * intensity);
    ctx.drawImage(layer, 0, 0);
    if (lum > 0.8) ctx.drawImage(layer, 0, 0);
  }
  ctx.restore();
}

/** Bottom edge of a reference hairstyle fades out so it doesn't cut the face. */
function fadeBottom(canvas: HTMLCanvasElement, fade = 0.22) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const gradient = ctx.createLinearGradient(0, canvas.height * (1 - fade - 0.12), 0, canvas.height);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  return canvas;
}

export function drawHair(
  ctx: CanvasRenderingContext2D,
  input: {
    photo: HTMLCanvasElement;
    hairMask: HTMLCanvasElement | null;
    style: HTMLCanvasElement | null;
    landmarks: Point[] | null;
    dye: string;
    intensity: number;
    /** Face and skin of the original photo, painted over the reference hair. */
    skinLayer?: HTMLCanvasElement | null;
  },
) {
  const { photo, hairMask, style, landmarks, dye, intensity, skinLayer } = input;
  const w = photo.width;
  const h = photo.height;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(photo, 0, 0);

  if (hairMask && dye && intensity > 0.02) {
    dyePhoto(ctx, hairMask, dye, intensity);
  }

  if (!style) return;
  const box = opaqueBounds(style);
  // A reference hairstyle is drawn over the head: width from the face, height
  // from the photo's own proportions, never taller than the photo itself.
  let dw = w * 0.64;
  let dh = box.h * (dw / box.w);
  let dx = (w - dw) / 2;
  let dy = h * 0.02;
  if (landmarks && landmarks.length > 454) {
    const left = landmarks[234];
    const right = landmarks[454];
    const top = landmarks[10];
    const chin = landmarks[152];
    if (left && right && top) {
      const faceW = Math.abs(right.x - left.x) * w;
      const faceCx = ((left.x + right.x) / 2) * w;
      const faceLen = chin ? Math.max(faceW * 0.9, Math.abs(chin.y - top.y) * h) : faceW * 1.4;
      // Hair sits on the skull: a little above the hairline, about 2.3 faces
      // wide, and never longer than the photo or the shoulders allow.
      const headTop = top.y * h - faceLen * 0.18;
      dw = faceW * 2.3;
      dh = box.h * (dw / box.w);
      const maxHeight = Math.min(h - headTop, faceLen * 2.7);
      if (dh > maxHeight) {
        dh = maxHeight;
        dw = box.w * (dh / box.h);
      }
      dx = faceCx - dw / 2;
      dy = headTop;
    }
  }

  const wig = document.createElement("canvas");
  wig.width = Math.max(1, Math.round(box.w));
  wig.height = Math.max(1, Math.round(box.h));
  const wctx = wig.getContext("2d");
  if (!wctx) return;
  wctx.drawImage(style, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  if (dye && intensity > 0.02) dyePhoto(wctx, wig, dye, Math.min(1, intensity + 0.1));
  fadeBottom(wig, 0.3);

  ctx.save();
  ctx.drawImage(wig, dx, dy, dw, dh);
  ctx.restore();

  // The face of the photo goes on top: the reference hair frames it instead of
  // covering it, and the wig can still fall over the shoulders.
  if (skinLayer) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(skinLayer, 0, 0, w, h);
    ctx.restore();
  }
}
