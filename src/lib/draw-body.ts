import { dominantColor } from "./cutout.ts";
import { drawCover } from "./images.ts";
import type { PersonKind, Zone } from "./types.ts";
import type { Point } from "./vision.ts";

export const STAGE_W = 720;
export const STAGE_H = 1120;

export type GarmentLayer = {
  image: CanvasImageSource & { width: number; height: number };
  zone: Zone;
};

export type BodyInput = {
  kind: PersonKind;
  heightCm: number;
  weightKg: number;
  eyeHex: string;
  studio: boolean;
  measures: boolean;
  skin: string;
  hair: string;
  cutout: HTMLCanvasElement | null;
  landmarks: Point[] | null;
  garments: GarmentLayer[];
};

export type Metrics = {
  cx: number;
  headY: number;
  headRx: number;
  headRy: number;
  shoulderY: number;
  shoulderHalf: number;
  waistY: number;
  waistHalf: number;
  hipY: number;
  hipHalf: number;
  kneeY: number;
  ankleY: number;
  ankleHalf: number;
  wristY: number;
  gap: number;
  girth: number;
  vertical: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Everything about the figure that weight and height move: `girth` widens the
 * torso and `vertical` stretches the legs, so the same photo reads differently
 * at 1.55 m / 90 kg than at 1.92 m / 62 kg.
 */
export function bodyMetrics(kind: PersonKind, heightCm: number, weightKg: number): Metrics {
  const child = kind === "nino" || kind === "nina";
  const female = kind === "mujer" || kind === "nina";
  const meters = Math.max(0.8, heightCm / 100);
  const bmi = weightKg / (meters * meters);
  const girth = clamp(0.94 + (bmi - 21) / 30, 0.84, 1.4);
  const W = STAGE_W;
  const H = STAGE_H;
  const cx = W / 2;
  const headRy = H * (child ? 0.098 : 0.074);
  const headRx = headRy * 0.82;
  const headY = H * (child ? 0.16 : 0.132);
  const shoulderY = headY + headRy + H * 0.034;
  const shoulderHalf = W * (child ? 0.15 : 0.18) * girth * (female ? 0.94 : 1.04);
  const vertical = clamp((heightCm / (child ? 128 : 168)) ** 0.55, 0.9, 1.06);
  const stretch = (base: number) => shoulderY + (base - shoulderY) * vertical;
  const hipY = stretch(H * (child ? 0.52 : 0.49));
  const waistY = shoulderY + (hipY - shoulderY) * 0.58;
  const waistHalf = shoulderHalf * (female ? 0.76 : 0.84);
  const hipHalf = shoulderHalf * (female ? 1.06 : 0.92);
  return {
    cx,
    headY,
    headRx,
    headRy,
    shoulderY,
    shoulderHalf,
    waistY,
    waistHalf,
    hipY,
    hipHalf,
    kneeY: stretch(H * (child ? 0.72 : 0.7)),
    ankleY: stretch(H * 0.9),
    ankleHalf: W * 0.03 * Math.min(girth, 1.15),
    wristY: stretch(H * (child ? 0.58 : 0.56)),
    gap: W * 0.012,
    girth,
    vertical,
  };
}

function torsoPath(m: Metrics) {
  const p = new Path2D();
  const { cx, shoulderY, shoulderHalf, waistY, waistHalf, hipY, hipHalf } = m;
  p.moveTo(cx - shoulderHalf, shoulderY);
  p.quadraticCurveTo(cx, shoulderY + 4, cx + shoulderHalf, shoulderY);
  p.lineTo(cx + waistHalf, waistY);
  p.quadraticCurveTo(cx + hipHalf, (waistY + hipY) / 2, cx + hipHalf, hipY);
  p.lineTo(cx - hipHalf, hipY);
  p.quadraticCurveTo(cx - hipHalf, (waistY + hipY) / 2, cx - waistHalf, waistY);
  p.closePath();
  return p;
}

function legPath(m: Metrics, side: number) {
  const p = new Path2D();
  const innerHip = m.cx + side * (m.gap * 1.1 + m.hipHalf * 0.03);
  const outerHip = m.cx + side * m.hipHalf * 0.95;
  const outerKnee = m.cx + side * (m.gap * 1.3 + m.hipHalf * 0.42);
  const innerKnee = m.cx + side * (m.gap * 1.5);
  const outerAnkle = m.cx + side * (m.gap * 1.3 + m.hipHalf * 0.2);
  const innerAnkle = m.cx + side * (m.gap * 1.5 + m.ankleHalf * 0.2);
  p.moveTo(innerHip, m.hipY);
  p.lineTo(outerHip, m.hipY);
  p.quadraticCurveTo(outerKnee, m.kneeY, outerAnkle, m.ankleY);
  p.lineTo(innerAnkle, m.ankleY);
  p.quadraticCurveTo(innerKnee, m.kneeY, innerHip, m.hipY);
  p.closePath();
  return p;
}

function armPath(m: Metrics, side: number, toY = m.wristY) {
  const p = new Path2D();
  const sx = m.cx + side * m.shoulderHalf * 0.86;
  const sy = m.shoulderY + 14;
  const ex = m.cx + side * m.shoulderHalf * (1.06 + 0.12 * m.girth);
  const w = m.shoulderHalf * 0.2 * m.girth;
  p.moveTo(sx - side * 6, sy);
  p.quadraticCurveTo(m.cx + side * m.shoulderHalf * 1.3, (sy + toY) / 2, ex + side * w * 0.15, toY);
  p.lineTo(ex - side * w * 0.85, toY);
  p.quadraticCurveTo(
    m.cx + side * m.shoulderHalf * 0.95,
    (sy + toY) / 2,
    sx - side * m.shoulderHalf * 0.18,
    sy + 36,
  );
  p.closePath();
  return p;
}

function armSleeve(m: Metrics, side: number) {
  const p = new Path2D();
  const sx = m.cx + side * m.shoulderHalf * 0.86;
  const sy = m.shoulderY + 14;
  const midY = sy + (m.wristY - sy) * 0.36;
  const w = m.shoulderHalf * 0.2 * m.girth;
  const ex = m.cx + side * m.shoulderHalf * (1.08 + 0.12 * m.girth);
  p.moveTo(sx - side * 6, sy);
  p.quadraticCurveTo(
    m.cx + side * m.shoulderHalf * 1.3,
    (sy + midY) / 2,
    ex + side * w * 0.05,
    midY,
  );
  p.lineTo(ex - side * w * 0.9, midY);
  p.quadraticCurveTo(
    m.cx + side * m.shoulderHalf * 0.95,
    (sy + midY) / 2,
    sx - side * m.shoulderHalf * 0.18,
    sy + 36,
  );
  p.closePath();
  return p;
}

/** Horizontal light-to-shadow gradient that makes a flat shape read as a body. */
function volume(ctx: CanvasRenderingContext2D, path: Path2D, m: Metrics, strength = 1) {
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(
    m.cx - m.shoulderHalf * 1.2,
    0,
    m.cx + m.shoulderHalf * 1.2,
    0,
  );
  g.addColorStop(0, `rgba(0,0,0,${0.26 * strength})`);
  g.addColorStop(0.3, `rgba(255,255,255,${0.1 * strength})`);
  g.addColorStop(0.62, "rgba(0,0,0,0.02)");
  g.addColorStop(1, `rgba(0,0,0,${0.3 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.restore();
}

function skinFill(ctx: CanvasRenderingContext2D, path: Path2D, m: Metrics, tone: string) {
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(
    m.cx - m.shoulderHalf * 1.4,
    m.shoulderY,
    m.cx + m.shoulderHalf * 1.4,
    m.ankleY,
  );
  g.addColorStop(0, mix(tone, 0.16));
  g.addColorStop(0.45, tone);
  g.addColorStop(1, mix(tone, -0.2));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.restore();
}

/** Lighten (positive) or darken (negative) a `#rrggbb` / `rgb()` colour. */
export function mix(color: string, amount: number) {
  const parsed = parseColor(color);
  const target = amount >= 0 ? 255 : 0;
  const k = Math.abs(amount);
  const channel = (value: number) => Math.round(value + (target - value) * k);
  return `rgb(${channel(parsed[0])}, ${channel(parsed[1])}, ${channel(parsed[2])})`;
}

/** `rgba()` string from a colour the app produced (`rgb()` or `#rrggbb`). */
export function rgba(color: string, alpha: number) {
  const [r, g, b] = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseColor(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const value = hex[1];
    const full =
      value.length === 3
        ? value
            .split("")
            .map((part) => part + part)
            .join("")
        : value;
    const n = Number.parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return [201, 149, 108];
}

function faceCrop(cutout: HTMLCanvasElement, landmarks: Point[] | null, m: Metrics) {
  const iw = cutout.width;
  const ih = cutout.height;
  let cropCx = iw / 2;
  let cropCy = ih * 0.42;
  // Height of the face (hairline to chin) inside the photo, in pixels. It is
  // what decides the zoom: a real head is ~2.7 face-heights from the top of the
  // skull to the chin, and the cheek-to-cheek width is ~0.75 of the head width.
  let faceLen = Math.min(ih, iw) * 0.55;
  if (landmarks && landmarks.length > 454) {
    const left = landmarks[234];
    const right = landmarks[454];
    const top = landmarks[10];
    const chin = landmarks[152];
    if (left && right && top && chin) {
      const x0 = Math.min(left.x, right.x) * iw;
      const x1 = Math.max(left.x, right.x) * iw;
      const faceW = x1 - x0;
      if (faceW > iw * 0.12 && faceW < iw * 0.98) {
        const topY = top.y * ih;
        const botY = chin.y * ih;
        const len = botY - topY;
        if (len > faceW * 0.6) faceLen = len;
        cropCx = (x0 + x1) / 2;
        // Sit the photo on the head: forehead a little above the crown of the
        // drawn skull, chin just below the jaw line.
        cropCy = topY + len * 0.52;
      }
    }
  }
  const scale = (m.headRy * 2.55) / Math.max(faceLen, 1);
  return { iw, ih, cropCx, cropCy, scale };
}

/**
 * The photo is trimmed with a soft ellipse so the chin and the hair melt into
 * the neck instead of showing a hard sticker edge.
 */
function softHead(input: BodyInput, m: Metrics, crop: ReturnType<typeof faceCrop>) {
  const rx = m.headRx * 1.2;
  const ry = m.headRy * 1.36;
  const width = Math.ceil(rx * 2);
  const height = Math.ceil(ry * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || !input.cutout) return null;
  ctx.drawImage(
    input.cutout,
    width / 2 - crop.cropCx * crop.scale,
    height / 2 - crop.cropCy * crop.scale,
    crop.iw * crop.scale,
    crop.ih * crop.scale,
  );
  const cx = width / 2;
  const cy = height / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.7, "rgba(0,0,0,1)");
  gradient.addColorStop(0.88, "rgba(0,0,0,0.6)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  const x = m.cx - cx;
  const y = m.headY + m.headRy * 0.02 - cy;
  return {
    canvas,
    x,
    y,
    /** Photo coordinates (0..1) → stage coordinates. */
    map: (px: number, py: number) => ({
      x: x + cx + (px * crop.iw - crop.cropCx) * crop.scale,
      y: y + cy + (py * crop.ih - crop.cropCy) * crop.scale,
    }),
  };
}

function tintEyes(
  ctx: CanvasRenderingContext2D,
  input: BodyInput,
  m: Metrics,
  crop: ReturnType<typeof faceCrop>,
  head: { map: (px: number, py: number) => { x: number; y: number } },
) {
  if (!input.landmarks || input.landmarks.length < 474) return;
  for (const index of [468, 473]) {
    const point = input.landmarks[index];
    if (!point) continue;
    const { x, y } = head.map(point.x, point.y);
    const mate = input.landmarks[index === 468 ? 133 : 362];
    const radius = mate
      ? Math.hypot(point.x - mate.x, point.y - mate.y) * crop.iw * crop.scale * 0.5
      : m.headRx * 0.08;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(2, radius), Math.max(1.6, radius * 0.68), 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = "color";
    ctx.fillStyle = input.eyeHex;
    ctx.fillRect(x - radius * 2, y - radius * 2, radius * 4, radius * 4);
    ctx.restore();
  }
}

/** Simple, believable face for when there is no photo yet: the eye colour shows. */
function paintedFace(ctx: CanvasRenderingContext2D, m: Metrics, eye: string, hair: string) {
  const eyeY = m.headY + m.headRy * 0.06;
  const eyeDx = m.headRx * 0.4;
  const rx = m.headRx * 0.19;
  const ry = m.headRy * 0.075;
  ctx.save();
  // Hair cap down to the hairline, so a face without a photo still has a cut.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY, m.headRx, m.headRy, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY - m.headRy * 0.34, m.headRx * 1.1, m.headRy * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#f7f3ec";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(m.cx + side * eyeDx, eyeY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const side of [-1, 1]) {
    const x = m.cx + side * eyeDx;
    ctx.beginPath();
    ctx.fillStyle = eye;
    ctx.ellipse(x, eyeY, rx * 0.66, ry * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "rgba(12,10,9,0.9)";
    ctx.ellipse(x, eyeY, rx * 0.3, ry * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.ellipse(x - rx * 0.16, eyeY - ry * 0.2, rx * 0.12, ry * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(60,40,28,0.65)";
  ctx.lineWidth = Math.max(1.6, m.headRx * 0.035);
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const x = m.cx + side * eyeDx;
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.9, eyeY - m.headRy * 0.19);
    ctx.quadraticCurveTo(x, eyeY - m.headRy * 0.27, x + rx * 0.9, eyeY - m.headRy * 0.16);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(140,90,66,0.28)";
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY + m.headRy * 0.16, m.headRx * 0.1, m.headRy * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(158,86,80,0.72)";
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY + m.headRy * 0.52, m.headRx * 0.28, m.headRy * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shoes(ctx: CanvasRenderingContext2D, m: Metrics) {
  ctx.save();
  for (const side of [-1, 1]) {
    const x = m.cx + side * m.gap * 3;
    const w = m.ankleHalf * 2.1;
    const g = ctx.createLinearGradient(x - w, m.ankleY, x + w, m.ankleY + 26);
    g.addColorStop(0, "#3c3129");
    g.addColorStop(1, "#1e1813");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, m.ankleY + 8, w, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(x, m.ankleY + 3, w * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintGarment(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  garment: GarmentLayer,
  torso: Path2D,
  legs: Path2D,
  arms: Path2D,
) {
  const clip = new Path2D();
  if (garment.zone === "inferior") clip.addPath(legs);
  else if (garment.zone === "completo") {
    clip.addPath(torso);
    clip.addPath(legs);
    clip.addPath(arms);
  } else {
    // A top covers the body; the sleeves take the fabric colour of the photo so
    // no seam shows where the photo ends and the arm begins.
    clip.addPath(torso);
  }
  const box = garmentBox(garment.zone, m);
  ctx.save();
  ctx.clip(clip);
  // Anchor the top of the photo on the shoulders (or the waistband on the hips)
  // so the collar and the waist land where they belong.
  drawCover(ctx, garment.image, box.x, box.y, box.w, box.h, 0);
  if (garment.zone !== "inferior") {
    // Soften the seam where the photo's top edge crosses the chest, so it reads
    // as a shoulder instead of a straight cut. Painted in the garment's own
    // fabric tone, darkened.
    const fabric = dominantColor(garment.image);
    const seam = ctx.createLinearGradient(0, box.y - 4, 0, box.y + box.h * 0.09);
    seam.addColorStop(0, rgba(mix(fabric, -0.35), 0.85));
    seam.addColorStop(0.45, rgba(mix(fabric, -0.2), 0.3));
    seam.addColorStop(1, rgba(fabric, 0));
    ctx.fillStyle = seam;
    ctx.fillRect(box.x, box.y - 4, box.w, box.h * 0.09 + 4);
  }
  ctx.restore();
  volume(ctx, clip, m, 0.85);
  if (garment.zone === "superior") {
    const fabric = dominantColor(garment.image);
    for (const side of [-1, 1]) {
      const sleeve = ctx.createLinearGradient(
        m.cx,
        m.shoulderY,
        m.cx + side * m.shoulderHalf * 1.4,
        m.wristY * 0.7,
      );
      sleeve.addColorStop(0, fabric);
      sleeve.addColorStop(1, mix(fabric, -0.22));
      ctx.save();
      ctx.clip(arms);
      ctx.fillStyle = sleeve;
      ctx.fill(armSleeve(m, side));
      ctx.restore();
    }
  }
}

/** Where a garment photo is laid on the figure, per zone. */
export function garmentBox(zone: Zone, m: Metrics) {
  if (zone === "inferior") {
    return {
      x: m.cx - m.hipHalf * 1.16,
      y: m.hipY - 16,
      w: m.hipHalf * 2.32,
      h: m.ankleY - m.hipY + 20,
    };
  }
  if (zone === "completo") {
    return {
      x: m.cx - m.shoulderHalf * 1.2,
      y: m.shoulderY - 14,
      w: m.shoulderHalf * 2.4,
      h: m.ankleY - m.shoulderY + 16,
    };
  }
  return {
    x: m.cx - m.shoulderHalf * 1.06,
    y: m.shoulderY - 12,
    w: m.shoulderHalf * 2.12,
    h: m.hipY - m.shoulderY + 44,
  };
}

export function drawBody(ctx: CanvasRenderingContext2D, input: BodyInput) {
  const m = bodyMetrics(input.kind, input.heightCm, input.weightKg);
  const skin = input.skin || "#c9956c";
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);
  if (input.studio) {
    const g = ctx.createLinearGradient(0, 0, 0, STAGE_H);
    g.addColorStop(0, "#f6f2ea");
    g.addColorStop(0.72, "#e8dece");
    g.addColorStop(1, "#d5c6b2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    const halo = ctx.createRadialGradient(m.cx, m.shoulderY, 40, m.cx, m.shoulderY, STAGE_H * 0.72);
    halo.addColorStop(0, "rgba(255,255,255,0.5)");
    halo.addColorStop(1, "rgba(120,96,70,0.16)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, STAGE_H);
    g.addColorStop(0, "#241f1b");
    g.addColorStop(1, "#100d0b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }

  // Contact shadow on the floor.
  const shadow = ctx.createRadialGradient(
    m.cx,
    m.ankleY + 14,
    4,
    m.cx,
    m.ankleY + 14,
    m.hipHalf * 1.7,
  );
  shadow.addColorStop(0, input.studio ? "rgba(60,42,28,0.34)" : "rgba(0,0,0,0.5)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(m.cx, m.ankleY + 14, m.hipHalf * 1.7, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (trousers) and shoes.
  const legs = new Path2D();
  legs.addPath(legPath(m, -1));
  legs.addPath(legPath(m, 1));
  ctx.fillStyle = "#332e29";
  ctx.fill(legs);
  ctx.save();
  ctx.clip(legs);
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const x = m.cx + side * (m.gap * 1.6 + m.hipHalf * 0.34);
    ctx.beginPath();
    ctx.moveTo(x, m.hipY - 20);
    ctx.lineTo(m.cx + side * (m.gap * 4 + m.hipHalf * 0.2), m.ankleY);
    ctx.stroke();
  }
  ctx.restore();
  volume(ctx, legs, m, 0.8);
  shoes(ctx, m);

  // Torso (base t-shirt) + sleeves.
  const torso = torsoPath(m);
  const shirt = ctx.createLinearGradient(0, m.shoulderY, 0, m.hipY);
  shirt.addColorStop(0, "#45403a");
  shirt.addColorStop(1, "#332e29");
  ctx.fillStyle = shirt;
  ctx.fill(torso);
  const arms = new Path2D();
  arms.addPath(armPath(m, -1));
  arms.addPath(armPath(m, 1));
  ctx.fillStyle = "#3c3731";
  ctx.fill(armSleeve(m, -1));
  ctx.fill(armSleeve(m, 1));
  skinFill(ctx, arms, m, skin);
  volume(ctx, arms, m, 0.9);
  ctx.fillStyle = shirt;
  ctx.fill(armSleeve(m, -1));
  ctx.fill(armSleeve(m, 1));
  volume(ctx, torso, m, 1);

  // Hands.
  for (const side of [-1, 1]) {
    const hx = m.cx + side * m.shoulderHalf * (1.14 + 0.12 * m.girth);
    ctx.fillStyle = mix(skin, -0.05);
    ctx.beginPath();
    ctx.ellipse(hx, m.wristY + 16, 12 * m.girth, 20 * m.girth, side * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck + shoulders skin.
  ctx.fillStyle = mix(skin, -0.12);
  ctx.beginPath();
  ctx.moveTo(m.cx - m.headRx * 0.4, m.headY + m.headRy * 0.7);
  ctx.lineTo(m.cx + m.headRx * 0.4, m.headY + m.headRy * 0.7);
  ctx.lineTo(m.cx + m.headRx * 0.34, m.shoulderY + 10);
  ctx.lineTo(m.cx - m.headRx * 0.34, m.shoulderY + 10);
  ctx.closePath();
  ctx.fill();

  // Hair mass behind the head.
  ctx.fillStyle = mix(input.hair, -0.08);
  ctx.beginPath();
  ctx.ellipse(
    m.cx,
    m.headY - m.headRy * 0.14,
    m.headRx * 1.16,
    m.headRy * 1.16,
    0,
    Math.PI,
    0,
    true,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY + m.headRy * 0.1, m.headRx * 1.1, m.headRy * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head: skin base, then the photo (soft edged) or a painted face.
  skinFill(
    ctx,
    (() => {
      const p = new Path2D();
      p.ellipse(m.cx, m.headY, m.headRx, m.headRy, 0, 0, Math.PI * 2);
      return p;
    })(),
    m,
    skin,
  );

  if (input.cutout) {
    const crop = faceCrop(input.cutout, input.landmarks, m);
    const head = softHead(input, m, crop);
    if (head) {
      ctx.drawImage(head.canvas, head.x, head.y);
      tintEyes(ctx, input, m, crop, head);
    }
  } else {
    paintedFace(ctx, m, input.eyeHex, input.hair);
  }

  for (const garment of input.garments) paintGarment(ctx, m, garment, torso, legs, arms);

  if (input.measures) {
    const ink = input.studio ? "rgba(28,22,18,0.72)" : "rgba(244,239,230,0.8)";
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, m.headY - m.headRy);
    ctx.lineTo(48, m.ankleY);
    ctx.stroke();
    ctx.font = "500 22px Outfit, sans-serif";
    ctx.fillText(`${input.heightCm} cm`, 60, (m.headY + m.ankleY) / 2);
    ctx.fillText(`${input.weightKg} kg`, 60, (m.headY + m.ankleY) / 2 + 28);
  }
}
