import type { Point } from "@/lib/vision";

function dyeLayer(width: number, height: number, mask: CanvasImageSource, dye: string) {
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

function boundsOf(source: HTMLCanvasElement) {
  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { x: 0, y: 0, w: source.width, h: source.height };
  const { data, width, height } = ctx.getImageData(0, 0, source.width, source.height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 20) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return { x: 0, y: 0, w: width, h: height };
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

export function drawHair(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement,
  hairMask: HTMLCanvasElement | null,
  style: HTMLCanvasElement | null,
  landmarks: Point[] | null,
  dye: string,
  intensity: number,
) {
  const w = photo.width;
  const h = photo.height;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(photo, 0, 0);
  if (dye && hairMask && intensity > 0.02) {
    const layer = dyeLayer(w, h, hairMask, dye);
    ctx.save();
    ctx.globalCompositeOperation = "color";
    ctx.globalAlpha = intensity;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }
  if (!style) return;
  const box = boundsOf(style);
  let dx = w * 0.18;
  let dy = h * 0.02;
  let dw = w * 0.64;
  let dh = box.h * (dw / box.w);
  if (landmarks && landmarks.length > 454) {
    const left = landmarks[234];
    const right = landmarks[454];
    const top = landmarks[10];
    if (left && right && top) {
      const faceW = Math.abs(right.x - left.x) * w;
      const faceCx = ((left.x + right.x) / 2) * w;
      const earY = ((left.y + right.y) / 2) * h;
      dw = faceW * 2.5;
      dh = box.h * (dw / box.w);
      dx = faceCx - dw / 2;
      dy = Math.min(top.y * h, earY) - dh * 0.86;
    }
  }
  const tinted = document.createElement("canvas");
  tinted.width = style.width;
  tinted.height = style.height;
  const tctx = tinted.getContext("2d");
  if (!tctx) return;
  tctx.drawImage(style, 0, 0);
  if (dye && intensity > 0.02) {
    const layer = dyeLayer(style.width, style.height, style, dye);
    tctx.save();
    tctx.globalCompositeOperation = "color";
    tctx.globalAlpha = Math.min(1, intensity + 0.15);
    tctx.drawImage(layer, 0, 0);
    tctx.restore();
  }
  ctx.drawImage(tinted, box.x, box.y, box.w, box.h, dx, dy, dw, dh);
}
