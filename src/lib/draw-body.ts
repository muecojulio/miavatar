import { drawCover } from "@/lib/images";
import type { PersonKind, Zone } from "@/lib/types";
import type { Point } from "@/lib/vision";

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

type Metrics = {
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
};

function metrics(kind: PersonKind, heightCm: number, weightKg: number): Metrics {
  const child = kind === "nino" || kind === "nina";
  const female = kind === "mujer" || kind === "nina";
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  const girth = Math.max(0.82, Math.min(1.38, 0.92 + (bmi - 21) / 32));
  const W = STAGE_W;
  const H = STAGE_H;
  const cx = W / 2;
  const headRy = H * (child ? 0.098 : 0.074);
  const headRx = headRy * 0.82;
  const headY = H * (child ? 0.16 : 0.132);
  const shoulderY = headY + headRy + H * 0.034;
  const shoulderHalf = W * (child ? 0.15 : 0.18) * girth * (female ? 0.94 : 1.04);
  const hipY = H * (child ? 0.52 : 0.49);
  const waistY = shoulderY + (hipY - shoulderY) * 0.58;
  const waistHalf = shoulderHalf * (female ? 0.74 : 0.82);
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
    kneeY: H * (child ? 0.72 : 0.7),
    ankleY: H * 0.9,
    ankleHalf: W * 0.03 * Math.min(girth, 1.15),
    wristY: H * (child ? 0.58 : 0.56),
    gap: W * 0.012,
  };
}

function torsoPath(m: Metrics) {
  const p = new Path2D();
  const { cx, shoulderY, shoulderHalf, waistY, waistHalf, hipY, hipHalf } = m;
  p.moveTo(cx - shoulderHalf, shoulderY);
  p.quadraticCurveTo(cx, shoulderY - 18, cx + shoulderHalf, shoulderY);
  p.lineTo(cx + waistHalf, waistY);
  p.quadraticCurveTo(cx + hipHalf, (waistY + hipY) / 2, cx + hipHalf, hipY);
  p.lineTo(cx - hipHalf, hipY);
  p.quadraticCurveTo(cx - hipHalf, (waistY + hipY) / 2, cx - waistHalf, waistY);
  p.closePath();
  return p;
}

function legPath(m: Metrics, side: number) {
  const p = new Path2D();
  const innerHip = m.cx + side * (m.gap + m.hipHalf * 0.08);
  const outerHip = m.cx + side * m.hipHalf * 0.92;
  const outerKnee = m.cx + side * (m.gap + m.hipHalf * 0.55);
  const innerKnee = m.cx + side * (m.gap * 2.2);
  const outerAnkle = m.cx + side * (m.gap * 2 + m.ankleHalf);
  const innerAnkle = m.cx + side * m.gap * 2.4;
  p.moveTo(innerHip, m.hipY);
  p.lineTo(outerHip, m.hipY);
  p.quadraticCurveTo(outerKnee, m.kneeY, outerAnkle, m.ankleY);
  p.lineTo(innerAnkle, m.ankleY);
  p.quadraticCurveTo(innerKnee, m.kneeY, innerHip, m.hipY);
  p.closePath();
  return p;
}

function armPath(m: Metrics, side: number) {
  const p = new Path2D();
  const sx = m.cx + side * m.shoulderHalf * 0.86;
  const sy = m.shoulderY + 8;
  const ex = m.cx + side * m.shoulderHalf * 1.18;
  const ey = m.wristY;
  const w = m.shoulderHalf * 0.2;
  p.moveTo(sx - side * 6, sy);
  p.quadraticCurveTo(m.cx + side * m.shoulderHalf * 1.34, (sy + ey) / 2, ex + side * w * 0.15, ey);
  p.lineTo(ex - side * w * 0.85, ey);
  p.quadraticCurveTo(m.cx + side * m.shoulderHalf * 0.95, (sy + ey) / 2, sx - side * m.shoulderHalf * 0.18, sy + 36);
  p.closePath();
  return p;
}

function fill(ctx: CanvasRenderingContext2D, path: Path2D, color: string) {
  ctx.fillStyle = color;
  ctx.fill(path);
}

function shade(ctx: CanvasRenderingContext2D, path: Path2D, m: Metrics) {
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(m.cx - m.shoulderHalf, 0, m.cx + m.shoulderHalf, 0);
  g.addColorStop(0, "rgba(0,0,0,0.22)");
  g.addColorStop(0.45, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.restore();
}

function placeCutout(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  cutout: HTMLCanvasElement,
  landmarks: Point[] | null,
  eye: string,
) {
  const iw = cutout.width;
  const ih = cutout.height;
  let cropCx = iw / 2;
  let cropCy = ih * 0.38;
  let cropW = iw * 0.72;
  if (landmarks && landmarks.length > 454) {
    const left = landmarks[234];
    const right = landmarks[454];
    const top = landmarks[10];
    const chin = landmarks[152];
    if (left && right && top && chin) {
      const x0 = Math.min(left.x, right.x) * iw;
      const x1 = Math.max(left.x, right.x) * iw;
      const faceW = x1 - x0;
      if (faceW > iw * 0.12 && faceW < iw * 0.92) {
        const topY = top.y * ih - faceW * 1.15;
        const botY = chin.y * ih + faceW * 0.28;
        cropCx = (x0 + x1) / 2;
        cropCy = (topY + botY) / 2;
        cropW = Math.max(faceW * 2.1, iw * 0.46);
      }
    }
  }
  const scale = (m.headRx * 2.25) / Math.max(cropW, 1);
  const destCy = m.headY + m.headRy * 0.02;
  const drawX = m.cx - cropCx * scale;
  const drawY = destCy - cropCy * scale;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY - m.headRy * 0.05, m.headRx * 1.12, m.headRy * 1.25, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(cutout, drawX, drawY, iw * scale, ih * scale);
  if (landmarks && landmarks.length > 473) {
    for (const index of [468, 473]) {
      const point = landmarks[index];
      if (!point) continue;
      const x = drawX + point.x * iw * scale;
      const y = drawY + point.y * ih * scale;
      const mate = landmarks[index === 468 ? 133 : 362];
      const radius = mate ? Math.hypot(point.x - mate.x, point.y - mate.y) * iw * scale * 0.55 : m.headRx * 0.08;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(2, radius), Math.max(1.6, radius * 0.72), 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = "color";
      ctx.fillStyle = eye;
      ctx.fillRect(x - radius * 2, y - radius * 2, radius * 4, radius * 4);
      ctx.restore();
    }
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
    clip.addPath(torso);
    clip.addPath(arms);
  }
  const box =
    garment.zone === "inferior"
      ? { x: m.cx - m.hipHalf * 1.2, y: m.hipY - 12, w: m.hipHalf * 2.4, h: m.ankleY - m.hipY + 16 }
      : garment.zone === "completo"
        ? { x: m.cx - m.shoulderHalf * 1.45, y: m.shoulderY - 16, w: m.shoulderHalf * 2.9, h: m.ankleY - m.shoulderY }
        : { x: m.cx - m.shoulderHalf * 1.45, y: m.shoulderY - 20, w: m.shoulderHalf * 2.9, h: m.hipY - m.shoulderY + 36 };
  ctx.save();
  ctx.clip(clip);
  drawCover(ctx, garment.image, box.x, box.y, box.w, box.h);
  ctx.restore();
  shade(ctx, clip, m);
}

export function drawBody(ctx: CanvasRenderingContext2D, input: BodyInput) {
  const m = metrics(input.kind, input.heightCm, input.weightKg);
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);
  if (input.studio) {
    const g = ctx.createLinearGradient(0, 0, 0, STAGE_H);
    g.addColorStop(0, "#f4efe6");
    g.addColorStop(0.78, "#e7dccb");
    g.addColorStop(1, "#d9cbb8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  } else {
    ctx.fillStyle = "#1a1714";
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }

  ctx.fillStyle = input.studio ? "rgba(60, 42, 28, 0.16)" : "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(m.cx, m.ankleY + 18, m.hipHalf * 1.3, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  const legs = new Path2D();
  const leftLeg = legPath(m, -1);
  const rightLeg = legPath(m, 1);
  legs.addPath(leftLeg);
  legs.addPath(rightLeg);
  fill(ctx, legs, "#2a2622");
  shade(ctx, legs, m);

  ctx.fillStyle = "#171512";
  ctx.beginPath();
  ctx.ellipse(m.cx - m.gap * 3, m.ankleY + 6, m.ankleHalf * 1.5, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(m.cx + m.gap * 3, m.ankleY + 6, m.ankleHalf * 1.5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const torso = torsoPath(m);
  fill(ctx, torso, "#34302c");
  shade(ctx, torso, m);

  const arms = new Path2D();
  const leftArm = armPath(m, -1);
  const rightArm = armPath(m, 1);
  arms.addPath(leftArm);
  arms.addPath(rightArm);
  fill(ctx, arms, input.skin);
  ctx.fillStyle = "#34302c";
  ctx.fill(armSleeve(m, -1));
  ctx.fill(armSleeve(m, 1));

  ctx.fillStyle = input.skin;
  ctx.beginPath();
  ctx.ellipse(m.cx - m.shoulderHalf * 1.16, m.wristY, 11, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(m.cx + m.shoulderHalf * 1.16, m.wristY, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = input.skin;
  ctx.beginPath();
  ctx.moveTo(m.cx - m.headRx * 0.38, m.headY + m.headRy * 0.82);
  ctx.lineTo(m.cx + m.headRx * 0.38, m.headY + m.headRy * 0.82);
  ctx.lineTo(m.cx + m.headRx * 0.28, m.shoulderY + 8);
  ctx.lineTo(m.cx - m.headRx * 0.28, m.shoulderY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = input.hair;
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY - m.headRy * 0.18, m.headRx * 1.05, m.headRy * 1.05, 0, Math.PI, 0, true);
  ctx.fill();

  ctx.fillStyle = input.skin;
  ctx.beginPath();
  ctx.ellipse(m.cx, m.headY, m.headRx, m.headRy, 0, 0, Math.PI * 2);
  ctx.fill();

  if (input.cutout) placeCutout(ctx, m, input.cutout, input.landmarks, input.eyeHex);

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

function armSleeve(m: Metrics, side: number) {
  const p = new Path2D();
  const sx = m.cx + side * m.shoulderHalf * 0.86;
  const sy = m.shoulderY + 8;
  const midY = sy + (m.wristY - sy) * 0.48;
  const w = m.shoulderHalf * 0.2;
  const ex = m.cx + side * m.shoulderHalf * 1.22;
  p.moveTo(sx - side * 6, sy);
  p.quadraticCurveTo(m.cx + side * m.shoulderHalf * 1.3, (sy + midY) / 2, ex + side * w * 0.05, midY);
  p.lineTo(ex - side * w * 0.9, midY);
  p.quadraticCurveTo(m.cx + side * m.shoulderHalf * 0.95, (sy + midY) / 2, sx - side * m.shoulderHalf * 0.18, sy + 36);
  p.closePath();
  return p;
}
