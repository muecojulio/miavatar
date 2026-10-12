import type { Point } from "@/lib/vision";

const FINGERS: [number, number][] = [
  [3, 4],
  [7, 8],
  [11, 12],
  [15, 16],
  [19, 20],
];

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export type NailShape = { path: Path2D; box: { x: number; y: number; w: number; h: number } };

export function nailShapes(hands: Point[][], width: number, height: number): NailShape[] {
  const shapes: NailShape[] = [];
  for (const hand of hands) {
    if (hand.length < 21) continue;
    for (const [dipIndex, tipIndex] of FINGERS) {
      const dip = hand[dipIndex];
      const tip = hand[tipIndex];
      if (!dip || !tip) continue;
      const x1 = dip.x * width;
      const y1 = dip.y * height;
      const x2 = tip.x * width;
      const y2 = tip.y * height;
      const vx = x2 - x1;
      const vy = y2 - y1;
      const len = Math.hypot(vx, vy) || 1;
      const ux = vx / len;
      const uy = vy / len;
      const nailLen = len * 0.85;
      const nailW = len * 0.42;
      const cx = x2 + ux * nailLen * 0.12;
      const cy = y2 + uy * nailLen * 0.12;
      const ang = Math.atan2(vy, vx);
      const path = new Path2D();
      path.ellipse(cx, cy, nailLen * 0.55, nailW, ang, 0, Math.PI * 2);
      shapes.push({
        path,
        box: { x: cx - nailLen, y: cy - nailLen, w: nailLen * 2, h: nailLen * 2 },
      });
    }
  }
  return shapes;
}

export function drawNails(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement,
  hands: Point[][],
  color: string,
  gloss: boolean,
  design: HTMLCanvasElement | null,
) {
  const w = photo.width;
  const h = photo.height;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(photo, 0, 0);
  const nails = nailShapes(hands, w, h);
  const light = luminance(color) > 0.72;
  for (const nail of nails) {
    ctx.save();
    ctx.clip(nail.path);
    ctx.globalAlpha = light ? 0.78 : 0.7;
    ctx.globalCompositeOperation = light ? "screen" : "multiply";
    ctx.fillStyle = color;
    ctx.fillRect(nail.box.x, nail.box.y, nail.box.w, nail.box.h);
    ctx.restore();
    if (design) {
      ctx.save();
      ctx.clip(nail.path);
      ctx.globalAlpha = 0.92;
      const scale = Math.max(nail.box.w / design.width, nail.box.h / design.height);
      const dw = design.width * scale;
      const dh = design.height * scale;
      ctx.drawImage(design, nail.box.x + (nail.box.w - dw) / 2, nail.box.y + (nail.box.h - dh) / 2, dw, dh);
      ctx.restore();
    }
    if (gloss) {
      ctx.save();
      ctx.clip(nail.path);
      const g = ctx.createLinearGradient(nail.box.x, nail.box.y, nail.box.x, nail.box.y + nail.box.h);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.45, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(nail.box.x, nail.box.y, nail.box.w, nail.box.h * 0.6);
      ctx.restore();
    }
  }
  return nails.length;
}
