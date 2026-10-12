import { previewPathPrefix } from "@/lib/preview-path-prefix";

export type Point = { x: number; y: number };

export type PersonAnalysis = {
  image: HTMLCanvasElement;
  cutout: HTMLCanvasElement;
  hairMask: HTMLCanvasElement;
  landmarks: Point[] | null;
  skin: string;
  hair: string;
  mode: "multiclass" | "person" | "fallback";
};

type Fileset = Awaited<ReturnType<(typeof import("@mediapipe/tasks-vision"))["FilesetResolver"]["forVisionTasks"]>>;

function asset(path: string) {
  const prefix =
    typeof window === "undefined"
      ? ""
      : (previewPathPrefix(window.location.hostname, window.location.pathname) ?? "");
  return `${prefix}/vision/${path}`;
}

let filesetPromise: Promise<Fileset> | null = null;

async function fileset() {
  if (!filesetPromise) {
    filesetPromise = (async () => {
      const { FilesetResolver } = await import("@mediapipe/tasks-vision");
      return FilesetResolver.forVisionTasks(asset("wasm"));
    })().catch((error) => {
      filesetPromise = null;
      throw error;
    });
  }
  return filesetPromise;
}

type Segmenter = {
  segment: (image: HTMLCanvasElement) => { categoryMask?: { width: number; height: number; getAsUint8Array: () => Uint8Array; close: () => void } };
  getLabels: () => string[];
};

let segmenterPromise: Promise<{ segmenter: Segmenter; mode: "multiclass" | "person" } | null> | null = null;

async function segmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const wasm = await fileset();
      const { ImageSegmenter } = await import("@mediapipe/tasks-vision");
      try {
        const created = await ImageSegmenter.createFromOptions(wasm, {
          baseOptions: { modelAssetPath: asset("selfie_multiclass.tflite"), delegate: "CPU" },
          runningMode: "IMAGE",
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        });
        return { segmenter: created as unknown as Segmenter, mode: "multiclass" as const };
      } catch {
        const created = await ImageSegmenter.createFromOptions(wasm, {
          baseOptions: { modelAssetPath: asset("selfie_segmenter.tflite"), delegate: "CPU" },
          runningMode: "IMAGE",
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        });
        return { segmenter: created as unknown as Segmenter, mode: "person" as const };
      }
    })().catch(() => null);
  }
  return segmenterPromise;
}

let facePromise: Promise<{ detect: (image: HTMLCanvasElement) => { faceLandmarks: { x: number; y: number }[][] } } | null> | null = null;

async function landmarker() {
  if (!facePromise) {
    facePromise = (async () => {
      const wasm = await fileset();
      const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
      return FaceLandmarker.createFromOptions(wasm, {
        baseOptions: { modelAssetPath: asset("face_landmarker.task"), delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })().catch(() => null);
  }
  return facePromise;
}

let handPromise: Promise<{ detect: (image: HTMLCanvasElement) => { landmarks: { x: number; y: number }[][] } } | null> | null = null;

async function hands() {
  if (!handPromise) {
    handPromise = (async () => {
      const wasm = await fileset();
      const { HandLandmarker } = await import("@mediapipe/tasks-vision");
      return HandLandmarker.createFromOptions(wasm, {
        baseOptions: { modelAssetPath: asset("hand_landmarker.task"), delegate: "CPU" },
        runningMode: "IMAGE",
        numHands: 2,
      });
    })().catch(() => null);
  }
  return handPromise;
}

function toCanvas(source: CanvasImageSource & { width: number; height: number }) {
  const width = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
  if (source instanceof HTMLCanvasElement && source.width === width && source.height === height) return source;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(source, 0, 0, width, height);
  return canvas;
}

function maskCanvas(
  cats: Uint8Array,
  mw: number,
  mh: number,
  w: number,
  h: number,
  accept: (value: number) => boolean,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    const my = Math.min(mh - 1, Math.floor((y * mh) / h));
    for (let x = 0; x < w; x += 1) {
      const mx = Math.min(mw - 1, Math.floor((x * mw) / w));
      const on = accept(cats[my * mw + mx] ?? 0);
      const i = (y * w + x) * 4;
      image.data[i] = 255;
      image.data[i + 1] = 255;
      image.data[i + 2] = 255;
      image.data[i + 3] = on ? 255 : 0;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function ellipseMask(w: number, h: number, landmarks: Point[] | null) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  if (landmarks && landmarks.length > 454) {
    const left = landmarks[234];
    const right = landmarks[454];
    const top = landmarks[10];
    const chin = landmarks[152];
    if (left && right && top && chin) {
      const cx = ((left.x + right.x) / 2) * w;
      const faceW = Math.abs(right.x - left.x) * w;
      const topY = top.y * h - faceW * 0.95;
      const botY = chin.y * h + faceW * 0.2;
      ctx.ellipse(cx, (topY + botY) / 2, faceW * 0.85, (botY - topY) / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    }
  }
  ctx.ellipse(w / 2, h * 0.4, w * 0.28, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function hairFallback(w: number, h: number, landmarks: Point[] | null) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#fff";
  if (landmarks && landmarks.length > 454) {
    const left = landmarks[234];
    const right = landmarks[454];
    const top = landmarks[10];
    if (left && right && top) {
      const cx = ((left.x + right.x) / 2) * w;
      const faceW = Math.abs(right.x - left.x) * w;
      const y = top.y * h;
      ctx.beginPath();
      ctx.ellipse(cx, y - faceW * 0.15, faceW * 0.95, faceW * 0.85, 0, Math.PI, 0, true);
      ctx.fill();
      return canvas;
    }
  }
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.22, w * 0.34, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function sample(image: HTMLCanvasElement, x: number, y: number) {
  const ctx = image.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const px = Math.min(image.width - 1, Math.max(0, Math.round(x)));
  const py = Math.min(image.height - 1, Math.max(0, Math.round(y)));
  const data = ctx.getImageData(px, py, 1, 1).data;
  if (data[3] < 20) return null;
  return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
}

function applyMask(image: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0, image.width, image.height);
  return canvas;
}

export async function analyzePerson(
  source: CanvasImageSource & { width: number; height: number },
): Promise<PersonAnalysis> {
  const image = toCanvas(source);
  const w = image.width;
  const h = image.height;
  let landmarks: Point[] | null = null;
  try {
    const face = await landmarker();
    const found = face?.detect(image).faceLandmarks[0];
    if (found && found.length > 10) landmarks = found.map((point) => ({ x: point.x, y: point.y }));
  } catch {
    landmarks = null;
  }

  let mode: PersonAnalysis["mode"] = "fallback";
  let personMask = ellipseMask(w, h, landmarks);
  let hairMask = hairFallback(w, h, landmarks);
  try {
    const ready = await segmenter();
    if (ready) {
      const result = ready.segmenter.segment(image);
      const mask = result.categoryMask;
      if (mask) {
        const cats = mask.getAsUint8Array();
        if (ready.mode === "multiclass") {
          personMask = maskCanvas(cats, mask.width, mask.height, w, h, (value) => value === 1 || value === 2 || value === 3);
          hairMask = maskCanvas(cats, mask.width, mask.height, w, h, (value) => value === 1);
          mode = "multiclass";
        } else {
          personMask = maskCanvas(cats, mask.width, mask.height, w, h, (value) => value === 1);
          mode = "person";
        }
        mask.close();
      }
    }
  } catch {
    mode = "fallback";
  }

  const cutout = applyMask(image, personMask);
  const skin =
    (landmarks && landmarks[50]
      ? sample(image, landmarks[50].x * w, landmarks[50].y * h)
      : null) ?? "#c9956c";
  const hairPoint = landmarks?.[10];
  const hair =
    (hairPoint ? sample(image, hairPoint.x * w, Math.max(0, hairPoint.y * h - w * 0.08)) : null) ??
    "#3a2a24";

  return { image, cutout, hairMask, landmarks, skin, hair, mode };
}

export async function detectHands(source: HTMLCanvasElement): Promise<Point[][]> {
  try {
    const marker = await hands();
    const result = marker?.detect(source);
    if (!result) return [];
    return result.landmarks.map((hand) => hand.map((point) => ({ x: point.x, y: point.y })));
  } catch {
    return [];
  }
}

export async function hairCutout(source: CanvasImageSource & { width: number; height: number }) {
  const image = toCanvas(source);
  try {
    const ready = await segmenter();
    if (ready?.mode === "multiclass") {
      const result = ready.segmenter.segment(image);
      const mask = result.categoryMask;
      if (mask) {
        const cats = mask.getAsUint8Array();
        const hair = maskCanvas(cats, mask.width, mask.height, image.width, image.height, (value) => value === 1);
        mask.close();
        return applyMask(image, hair);
      }
    }
  } catch {
    return null;
  }
  return null;
}
