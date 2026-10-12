import type { DesignScope } from "./types.ts";
import type { Point } from "./vision.ts";

const FINGERS: [number, number][] = [
  [3, 4],
  [7, 8],
  [11, 12],
  [15, 16],
  [19, 20],
];

/** Ring finger — the one an accent nail is painted on. */
const ACCENT_FINGER = 3;

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export type NailShape = {
  path: Path2D;
  box: { x: number; y: number; w: number; h: number };
  /** Finger index inside the hand, 0 = thumb. */
  finger: number;
  angle: number;
  center: { x: number; y: number };
  size: { w: number; h: number };
};

export function nailShapes(hands: Point[][], width: number, height: number): NailShape[] {
  const shapes: NailShape[] = [];
  for (const hand of hands) {
    if (hand.length < 21) continue;
    FINGERS.forEach(([dipIndex, tipIndex], finger) => {
      const dip = hand[dipIndex];
      const tip = hand[tipIndex];
      if (!dip || !tip) return;
      const x1 = dip.x * width;
      const y1 = dip.y * height;
      const x2 = tip.x * width;
      const y2 = tip.y * height;
      const vx = x2 - x1;
      const vy = y2 - y1;
      const len = Math.hypot(vx, vy) || 1;
      const ux = vx / len;
      const uy = vy / len;
      // The nail sits just under the tip: longer than wide, tilted with the
      // finger, never a big circle covering the finger pad.
      const nailLen = len * 0.46;
      const nailW = len * 0.29;
      const cx = x2 - ux * len * 0.05;
      const cy = y2 - uy * len * 0.05;
      const ang = Math.atan2(vy, vx);
      const path = new Path2D();
      path.ellipse(cx, cy, nailLen * 1.05, nailW, ang, 0, Math.PI * 2);
      const reach = nailLen * 1.2;
      shapes.push({
        path,
        box: { x: cx - reach, y: cy - reach, w: reach * 2, h: reach * 2 },
        finger,
        angle: ang,
        center: { x: cx, y: cy },
        size: { w: nailLen * 2.1, h: nailW * 2 },
      });
    });
  }
  return shapes;
}

function paintDesign(ctx: CanvasRenderingContext2D, nail: NailShape, design: HTMLCanvasElement) {
  const w = nail.size.w;
  const h = nail.size.h;
  ctx.save();
  // Clip in photo space first, then rotate the drawing so the design lies along
  // the finger (the clip stays put while the transform changes).
  ctx.clip(nail.path);
  ctx.translate(nail.center.x, nail.center.y);
  ctx.rotate(nail.angle + Math.PI / 2);
  const scale = Math.max(w / design.width, h / design.height);
  const dw = design.width * scale;
  const dh = design.height * scale;
  ctx.globalAlpha = 0.94;
  ctx.drawImage(design, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

export function drawNails(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement,
  hands: Point[][],
  color: string,
  gloss: boolean,
  design: HTMLCanvasElement | null,
  scope: DesignScope = "todas",
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
    ctx.globalAlpha = light ? 0.82 : 0.72;
    ctx.globalCompositeOperation = light ? "screen" : "multiply";
    ctx.fillStyle = color;
    ctx.fillRect(nail.box.x, nail.box.y, nail.box.w, nail.box.h);
    ctx.restore();

    if (design && (scope === "todas" || nail.finger === ACCENT_FINGER)) {
      paintDesign(ctx, nail, design);
    }

    // Soft shadow at the cuticle keeps the polish from floating.
    ctx.save();
    ctx.clip(nail.path);
    const cuticle = ctx.createLinearGradient(
      nail.center.x,
      nail.center.y + nail.size.h / 2,
      nail.center.x,
      nail.center.y - nail.size.h / 2,
    );
    cuticle.addColorStop(0, "rgba(0,0,0,0.18)");
    cuticle.addColorStop(0.4, "rgba(0,0,0,0)");
    ctx.fillStyle = cuticle;
    ctx.fillRect(nail.box.x, nail.box.y, nail.box.w, nail.box.h);
    ctx.restore();

    if (gloss) {
      ctx.save();
      ctx.clip(nail.path);
      const g = ctx.createLinearGradient(
        nail.box.x,
        nail.box.y,
        nail.box.x,
        nail.box.y + nail.box.h,
      );
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.45, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(nail.box.x, nail.box.y, nail.box.w, nail.box.h * 0.6);
      ctx.restore();
    }
  }
  return nails.length;
}
